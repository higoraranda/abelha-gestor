import webpush from 'web-push'
import type { Database } from './platform-db'
import { notice, type Scope } from '../routes/personal'
import { subscriptionInput, invoiceSummary } from './personal'
import { businessDay } from './crm'
import { scheduledOccurrence } from './scheduling'

export async function weeklyReview(sql:Database,owner:Scope,now=new Date(),finalize=false) {
  const today=businessDay(now);const start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));const week=start.toISOString().slice(0,10)
  const {org,user}=owner
  return sql.transaction(async tx=>{
    // Serialize generation for a user, including first run before a review exists.
    await tx.query('SELECT id FROM users WHERE organization_id=$1 AND id=$2 FOR UPDATE',[org,user])
    const [existing]=await tx.query('SELECT * FROM personal_weekly_reviews WHERE organization_id=$1 AND user_id=$2 AND week_of=$3',[org,user,week]);if(existing&&(!finalize||existing.finalized))return existing
    const projects=await tx.query("SELECT id,name,status,next_step,blockers,updated_at,updated_at>=($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AS updated_in_period,updated_at<($4::date::timestamp AT TIME ZONE 'America/Sao_Paulo')-interval '7 days' AS stale FROM personal_projects WHERE organization_id=$1 AND user_id=$2 AND (updated_at>=($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo') OR status IN('active','paused') OR blockers<>'') ORDER BY updated_at DESC LIMIT 100",[org,user,week,today])
    const completed=await tx.query("SELECT project_id,title,completed_at FROM personal_milestones WHERE organization_id=$1 AND user_id=$2 AND completed_at>=($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND completed_at<(($4::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')",[org,user,week,today])
    const cycles=await tx.query('SELECT id,name,closes_on::text FROM personal_invoice_cycles WHERE organization_id=$1 AND user_id=$2 AND closes_on>=$3::date',[org,user,week])
    const invoices=[]
    for(const cycle of cycles){const entries=await tx.query('SELECT recorded_on::text,amount FROM personal_invoice_entries WHERE organization_id=$1 AND user_id=$2 AND cycle_id=$3 AND recorded_on<=$4::date ORDER BY recorded_on',[org,user,cycle.id,today]);const summary=invoiceSummary(entries as any,cycle.closes_on);invoices.push({name:cycle.name,current:summary.current,variations:summary.history.filter(row=>row.recorded_on>=week)})}
    const subscriptions=await tx.query("SELECT name,amount,frequency,due_on::text,scope FROM personal_subscriptions WHERE organization_id=$1 AND user_id=$2 AND active AND due_on<($3::date+interval '8 days') ORDER BY due_on LIMIT 100",[org,user,today])
    const goals=await tx.query('SELECT month::text,income,budget,savings_goal,saved FROM personal_monthly_plans WHERE organization_id=$1 AND user_id=$2 AND month=$3',[org,user,today.slice(0,7)+'-01'])
    const prices=await tx.query("SELECT title,detail,created_at FROM personal_notifications WHERE organization_id=$1 AND user_id=$2 AND event_key LIKE 'price:%' AND created_at>=($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo') ORDER BY created_at DESC LIMIT 100",[org,user,week])
    const commitments=await tx.query("SELECT title,due_at,completed FROM reminders WHERE organization_id=$1 AND due_at>=($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND due_at<(($3::date+8)::timestamp AT TIME ZONE 'America/Sao_Paulo') ORDER BY due_at LIMIT 100",[org,week,today])
    const data={period:{from:week,to:today},projects,completed,invoices,subscriptions,goals,commitments,price_alerts:prices,generated_from:'recorded_data',notes:'Variações de fatura não são uma classificação de despesas. Valores guardados são informados manualmente. Relatórios recebidos não equivalem a etapas concluídas.'}
    const [row]=await tx.query('INSERT INTO personal_weekly_reviews(organization_id,user_id,week_of,data,finalized) VALUES($1,$2,$3,$4::text::jsonb,$5) ON CONFLICT(organization_id,user_id,week_of) DO UPDATE SET data=excluded.data,finalized=excluded.finalized RETURNING *',[org,user,week,JSON.stringify(data),finalize])
    await notice(tx,owner,(finalize?'weekly-final:':'weekly:')+week,'Sua revisão semanal está pronta','Veja o que avançou e o que precisa de atenção.','/?space=personal&view=personal-review');return row
  })
}
export async function automationTick(sql:Database,owner:Scope,now=new Date()) {
  const today=businessDay(now)
  const {org,user}=owner
  const [preferences]=await sql.query('SELECT * FROM personal_preferences WHERE organization_id=$1 AND user_id=$2',[org,user])
  const morning=preferences?.morning_time?scheduledOccurrence(now,String(preferences.morning_time),'daily'):null
  if(morning)await notice(sql,owner,'invoice-reminder:'+businessDay(morning),'Como está sua fatura hoje?','Registre o valor atual para acompanhar a variação entre registros.','/?space=personal&view=personal-finance')
  const subscriptions=await sql.query("SELECT id,name,due_on::text FROM personal_subscriptions WHERE organization_id=$1 AND user_id=$2 AND active AND due_on<=$3::date+reminder_days*interval '1 day' ORDER BY due_on LIMIT 200",[org,user,today])
  for(const subscription of subscriptions)await notice(sql,owner,'subscription:'+subscription.id+':'+subscription.due_on,'Uma conta precisa de atenção',subscription.name+' · vencimento '+subscription.due_on+'. Confirme o pagamento somente depois de realizá-lo.','/?space=personal&view=personal-subscriptions')
  const weekly=preferences?.weekly_time?scheduledOccurrence(now,String(preferences.weekly_time),'weekly'):null
  if(weekly)await weeklyReview(sql,owner,weekly,true)
  return {processed_on:today,push:await sendPendingPush(sql,owner)}
}
export async function sendPendingPush(sql:Database,owner:Scope,transport:(subscription:any,payload:string,options:any)=>Promise<unknown>=(subscription,payload,options)=>webpush.sendNotification(subscription,payload,options)) {
  if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY||!process.env.VAPID_SUBJECT)return {configured:false,sent:0}
  webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY)
  const {org,user}=owner
  // Each device has its own pending batch. One unavailable device cannot keep
  // later notifications from reaching healthy devices on subsequent ticks.
  return sql.transaction(async tx=>{
    await tx.query('SELECT id FROM users WHERE organization_id=$1 AND id=$2 FOR UPDATE',[org,user])
    const subscriptions=await tx.query('SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE organization_id=$1 AND user_id=$2',[org,user])
    let sent=0,expired=0
    for(const subscription of subscriptions) {
      const notifications=await tx.query('SELECT n.id,n.event_key,n.url FROM personal_notifications n WHERE n.organization_id=$1 AND n.user_id=$2 AND n.push_sent_at IS NULL AND NOT n.dismissed AND n.read_at IS NULL AND NOT EXISTS(SELECT 1 FROM personal_push_deliveries d WHERE d.organization_id=n.organization_id AND d.user_id=n.user_id AND d.notification_id=n.id AND d.subscription_id=$3) ORDER BY n.created_at,n.id LIMIT 10 FOR UPDATE OF n SKIP LOCKED',[org,user,subscription.id])
      for(const notification of notifications) {
        try {
          const input=subscriptionInput({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}})
          await transport(input,JSON.stringify({key:notification.event_key,url:notification.url}),{TTL:3600,timeout:8000,topic:notification.id.replace(/-/g,'').slice(0,32)})
        } catch(error:any) {
          if([404,410].includes(error.statusCode)){await tx.query('DELETE FROM push_subscriptions WHERE organization_id=$1 AND user_id=$2 AND id=$3',[org,user,subscription.id]);expired++}
          break
        }
        await tx.query('INSERT INTO personal_push_deliveries(organization_id,user_id,notification_id,subscription_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[org,user,notification.id,subscription.id]);sent++
      }
    }
    await tx.query('UPDATE personal_notifications n SET push_sent_at=now() WHERE n.organization_id=$1 AND n.user_id=$2 AND n.push_sent_at IS NULL AND EXISTS(SELECT 1 FROM personal_push_deliveries d WHERE d.organization_id=n.organization_id AND d.user_id=n.user_id AND d.notification_id=n.id) AND NOT EXISTS(SELECT 1 FROM push_subscriptions s WHERE s.organization_id=n.organization_id AND s.user_id=n.user_id AND NOT EXISTS(SELECT 1 FROM personal_push_deliveries d WHERE d.organization_id=n.organization_id AND d.user_id=n.user_id AND d.notification_id=n.id AND d.subscription_id=s.id))',[org,user])
    return {configured:true,sent,expired}
  })
}
