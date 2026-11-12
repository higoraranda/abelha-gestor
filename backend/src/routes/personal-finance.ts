import type { Router } from 'express'
import type { Database } from '../services/platform-db'
import { endpoint, scope, notice } from './personal'
import { InputError, date, uuid, text, money, integer, invoiceSummary, nextRecurringDate } from '../services/personal'
import { businessDay, civilKey } from '../services/crm'

export function registerPersonalFinance(router:Router,sql:Database) {
  router.get('/finance',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const cycles=await sql.query('SELECT * FROM personal_invoice_cycles WHERE organization_id=$1 AND user_id=$2 ORDER BY closes_on DESC,id LIMIT 100',[org,user])
    const selected=req.query.cycle?cycles.find(c=>c.id===uuid(req.query.cycle)):cycles[0]
    const entries=selected?await sql.query('SELECT id,recorded_on::text,amount FROM personal_invoice_entries WHERE organization_id=$1 AND user_id=$2 AND cycle_id=$3 ORDER BY recorded_on',[org,user,selected.id]):[]
    const plans=await sql.query('SELECT month::text,income,budget,savings_goal,saved FROM personal_monthly_plans WHERE organization_id=$1 AND user_id=$2 ORDER BY month DESC LIMIT 24',[org,user])
    const monthly=await sql.query("SELECT to_char(c.closes_on,'YYYY-MM') AS month,sum(e.amount) AS total,count(e.id)::int AS cycles FROM personal_invoice_cycles c JOIN LATERAL(SELECT id,amount FROM personal_invoice_entries WHERE organization_id=c.organization_id AND user_id=c.user_id AND cycle_id=c.id ORDER BY recorded_on DESC LIMIT 1)e ON true WHERE c.organization_id=$1 AND c.user_id=$2 GROUP BY to_char(c.closes_on,'YYYY-MM') ORDER BY month DESC LIMIT 12",[org,user])
    res.json({cycles,selected_cycle:selected?.id||null,summary:invoiceSummary(entries as any,selected?civilKey(selected.closes_on):businessDay()),plans,monthly})
  }))
  router.post('/finance/cycles',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const starts=date(req.body.starts_on),closes=date(req.body.closes_on)
    if(closes<starts)throw new InputError('O fechamento precisa ocorrer após o início do ciclo.')
    const [row]=await sql.query('INSERT INTO personal_invoice_cycles(organization_id,user_id,name,starts_on,closes_on) VALUES($1,$2,$3,$4,$5) RETURNING *',[org,user,text(req.body.name,160),starts,closes]);res.status(201).json(row)
  }))
  router.post('/finance/entries',endpoint(async(req,res)=>{
    const owner=scope(res);const {org,user}=owner;const cycle=uuid(req.body.cycle_id),day=date(req.body.recorded_on),amount=money(req.body.amount)
    if(day>businessDay())throw new InputError('Não registre uma fatura futura.')
    const row=await sql.transaction(async tx=>{
      const [parent]=await tx.query('SELECT * FROM personal_invoice_cycles WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[org,user,cycle]);if(!parent)throw new InputError('Ciclo não encontrado.',404)
      const start=civilKey(parent.starts_on),end=civilKey(parent.closes_on)
      if(day<start||day>end)throw new InputError('A data precisa estar dentro deste ciclo.')
      const [row]=await tx.query('INSERT INTO personal_invoice_entries(organization_id,user_id,cycle_id,recorded_on,amount) VALUES($1,$2,$3,$4,$5) ON CONFLICT(organization_id,user_id,cycle_id,recorded_on) DO UPDATE SET amount=excluded.amount RETURNING *',[org,user,cycle,day,amount])
      const [plan]=await tx.query('SELECT budget FROM personal_monthly_plans WHERE organization_id=$1 AND user_id=$2 AND month=$3',[org,user,day.slice(0,7)+'-01'])
      if(plan&&amount>Number(plan.budget))await notice(tx,owner,'budget:'+cycle+':'+day.slice(0,7),'Fatura acima do orçamento','Confira a variação e sua meta mensal.','/?space=personal&view=personal-finance')
      return row
    });res.status(201).json(row)
  }))
  router.post('/finance/plans',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const month=date(req.body.month);if(!month.endsWith('-01'))throw new InputError('Use o primeiro dia do mês.')
    const [row]=await sql.query('INSERT INTO personal_monthly_plans(organization_id,user_id,month,income,budget,savings_goal,saved) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(organization_id,user_id,month) DO UPDATE SET income=excluded.income,budget=excluded.budget,savings_goal=excluded.savings_goal,saved=excluded.saved RETURNING *',[org,user,month,money(req.body.income),money(req.body.budget),money(req.body.savings_goal),money(req.body.saved)]);res.json(row)
  }))
  router.get('/subscriptions',endpoint(async(_req,res)=>{
    const {org,user}=scope(res);const subscriptions=await sql.query('SELECT * FROM personal_subscriptions WHERE organization_id=$1 AND user_id=$2 ORDER BY active DESC,due_on,id LIMIT 200',[org,user])
    const payments=await sql.query('SELECT * FROM personal_subscription_payments WHERE organization_id=$1 AND user_id=$2 ORDER BY paid_on DESC,id LIMIT 200',[org,user])
    const changes=await sql.query('SELECT * FROM personal_subscription_changes WHERE organization_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 200',[org,user])
    const annual=subscriptions.filter(s=>s.active).reduce((sum,s)=>sum+Number(s.amount)*(s.frequency==='monthly'?12:1),0)
    res.json({subscriptions,payments,changes,monthly:Math.round(annual/12*100)/100,annual:Math.round(annual*100)/100})
  }))
  router.post('/subscriptions',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const b=req.body
    if(!['monthly','yearly'].includes(b.frequency)||!['personal','professional'].includes(b.scope))throw new InputError('Frequência ou categoria de uso inválida.')
    const [row]=await sql.query('INSERT INTO personal_subscriptions(organization_id,user_id,name,category,amount,frequency,due_on,billing_day,payment_method,scope,reminder_days,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',[org,user,text(b.name),text(b.category||'',160,true),money(b.amount),b.frequency,date(b.due_on),Number(date(b.due_on).slice(8,10)),text(b.payment_method||'',160,true),b.scope,integer(b.reminder_days??3,0,30),text(b.notes||'',5000,true)]);res.status(201).json(row)
  }))
  router.patch('/subscriptions/:id',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const id=uuid(req.params.id)
    const row=await sql.transaction(async tx=>{
      const [current]=await tx.query('SELECT * FROM personal_subscriptions WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[org,user,id]);if(!current)throw new InputError('Conta não encontrada.',404)
      const amount=req.body.amount===undefined?Number(current.amount):money(req.body.amount)
      const active=req.body.active===undefined?current.active:req.body.active
      if(typeof active!=='boolean')throw new InputError('Situação inválida.')
      if(amount!==Number(current.amount))await tx.query('INSERT INTO personal_subscription_changes(organization_id,user_id,subscription_id,previous_amount,new_amount) VALUES($1,$2,$3,$4,$5)',[org,user,id,current.amount,amount])
      const due=req.body.due_on?date(req.body.due_on):civilKey(current.due_on)
      const [row]=await tx.query('UPDATE personal_subscriptions SET amount=$4,active=$5,due_on=$6,billing_day=$7 WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING *',[org,user,id,amount,active,due,due===civilKey(current.due_on)?current.billing_day:Number(due.slice(8,10))]);return row
    });res.json(row)
  }))
  router.post('/subscriptions/:id/payments',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const id=uuid(req.params.id);const due=date(req.body.due_on),paid=date(req.body.paid_on)
    if(paid>businessDay())throw new InputError('Pagamento não pode ter data futura.')
    const row=await sql.transaction(async tx=>{
      const [subscription]=await tx.query('SELECT * FROM personal_subscriptions WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[org,user,id]);if(!subscription)throw new InputError('Conta não encontrada.',404)
      const [existing]=await tx.query('SELECT * FROM personal_subscription_payments WHERE organization_id=$1 AND user_id=$2 AND subscription_id=$3 AND due_on=$4',[org,user,id,due]);if(existing)return existing
      if(due!==civilKey(subscription.due_on))throw new InputError('O vencimento foi alterado. Atualize a tela antes de confirmar.',409)
      const [payment]=await tx.query('INSERT INTO personal_subscription_payments(organization_id,user_id,subscription_id,due_on,amount,paid_on) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[org,user,id,due,subscription.amount,paid])
      await tx.query('UPDATE personal_subscriptions SET due_on=$4 WHERE organization_id=$1 AND user_id=$2 AND id=$3',[org,user,id,nextRecurringDate(due,subscription.frequency,subscription.billing_day)]);return payment
    });res.status(201).json(row)
  }))
}
