import { Router, Request, Response, RequestHandler } from 'express'
import { db } from '../db/index'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenant'
import { insertContract } from '../services/contract-store'
import { transitionTask, probability, weightedValue, businessDay, notificationItems, EXPORT_FIELDS, exportBusinessRows, csvCell } from '../services/crm'

class HttpError extends Error { constructor(public status:number,message:string) { super(message) } }
function id(value:unknown):string { const result=String(value || ''); if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(result)) throw new HttpError(400,'Identificador inválido'); return result }
function text(value:unknown,max=240):string { const result=String(value ?? '').trim(); if (!result || result.length>max) throw new HttpError(400,'Preencha um texto válido (até '+max+' caracteres)'); return result }
function date(value:unknown,optional=false):string|null { if (!value && optional) return null; const result=String(value || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result+'T00:00:00Z')) || new Date(result+'T00:00:00Z').toISOString().slice(0,10)!==result) throw new HttpError(400,'Data inválida'); return result }
function amount(value:unknown):number { const result=Number(value); if (!Number.isFinite(result) || result<=0 || result>9999999999.99) throw new HttpError(400,'Informe um valor positivo válido'); return Math.round(result*100)/100 }
function pagination(req:Request) { return {limit:Math.min(100,Math.max(1,Number(req.query.limit)||50)),offset:(Math.max(1,Number(req.query.page)||1)-1)*Math.min(100,Math.max(1,Number(req.query.limit)||50))} }
export function createCrmRouter(sql:any=db,middleware:RequestHandler[]=[authMiddleware,tenantMiddleware]) {
  const router=Router(); router.use(...middleware)
  const endpoint=(handler:(req:Request,res:Response)=>Promise<unknown>):RequestHandler => (req,res)=> { void handler(req,res).catch((error:any)=>{
    if (error instanceof HttpError) { res.status(error.status).json({error:error.message}); return }
    if (['42P01','42703'].includes(error.code)) { res.status(503).json({error:'A atualização do banco ainda não foi aplicada. Os registros existentes foram preservados.'}); return }
    if (error.code==='23503') { res.status(404).json({error:'O registro relacionado não está disponível nesta carteira.'}); return }
    if (error.code==='23505') { res.status(409).json({error:'Já existe um registro para esta operação.'}); return }
    if (error instanceof Error && !(error as any).code) { res.status(400).json({error:error.message}); return }
    res.status(503).json({error:'Não foi possível acessar o banco de dados. Tente novamente.'})
  }) }
  async function clientExists(tx:any,org:string,clientId:string) { const [row]=await tx`SELECT id FROM clients WHERE id=${clientId} AND organization_id=${org}`; if (!row) throw new HttpError(404,'Cliente não encontrado'); return row }

  router.get('/contracts',endpoint(async(req,res)=>{ const rows=await sql`SELECT cc.id,cc.client_id,cc.service_name,cc.status,cl.name AS client_name FROM client_contracts cc JOIN clients cl ON cl.id=cc.client_id AND cl.organization_id=cc.organization_id WHERE cc.organization_id=${req.organizationId!} ORDER BY cc.created_at DESC`; res.json(rows) }))
  router.get('/overview',endpoint(async(req,res)=>{
    const org=req.organizationId!; const today=businessDay(); const month=today.slice(0,7)+'-01'
    const [row]=await sql`SELECT (SELECT count(*) FROM clients WHERE organization_id=${org})::int AS clients_count,(SELECT count(*) FROM clients WHERE organization_id=${org} AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date>=${month}::date)::int AS new_clients,(SELECT count(*) FROM reminders WHERE organization_id=${org} AND NOT completed)::int AS pending,(SELECT COALESCE(sum(amount),0) FROM receivables WHERE organization_id=${org} AND status='paid' AND paid_at>=${month}::date AND paid_at<(${month}::date+interval '1 month')) AS received_month`
    res.json({...row,received_month:Number(row.received_month)})
  }))
  router.get('/tasks',endpoint(async(req,res)=>{
    const org=req.organizationId!; const p=pagination(req); const contract=req.query.contractId ? id(req.query.contractId) : null; const search=String(req.query.search||'').trim()
    const rows=await sql`SELECT t.*,cc.service_name,cc.client_id,cl.name AS client_name,count(*) OVER()::int AS total_count FROM delivery_tasks t JOIN client_contracts cc ON cc.id=t.contract_id AND cc.organization_id=t.organization_id JOIN clients cl ON cl.id=cc.client_id AND cl.organization_id=t.organization_id WHERE t.organization_id=${org} ${contract?sql`AND t.contract_id=${contract}`:sql``} ${req.query.taskId?sql`AND t.id=${id(req.query.taskId)}`:sql``} ${search?sql`AND (t.title ILIKE ${'%'+search+'%'} OR cl.name ILIKE ${'%'+search+'%'})`:sql``} ORDER BY t.created_at DESC,t.id LIMIT ${p.limit} OFFSET ${p.offset}`
    res.json({items:rows,total:rows[0]?.total_count||0})
  }))
  router.post('/tasks',endpoint(async(req,res)=>{
    const org=req.organizationId!; const contract=id(req.body.contract_id); const title=text(req.body.title); const due=date(req.body.due_date,true)
    const [parent]=await sql`SELECT id FROM client_contracts WHERE id=${contract} AND organization_id=${org} AND status<>'cancelled'`; if (!parent) throw new HttpError(404,'Contrato não encontrado ou cancelado')
    const [task]=await sql`INSERT INTO delivery_tasks(organization_id,contract_id,title,description,due_date) VALUES(${org},${contract},${title},${String(req.body.description||'').slice(0,10000)},${due}) RETURNING *`; res.status(201).json(task)
  }))
  router.patch('/tasks/:id',endpoint(async(req,res)=>{
    const org=req.organizationId!; const taskId=id(req.params.id)
    const result=await sql.begin(async(tx:any)=>{
      const [current]=await tx`SELECT * FROM delivery_tasks WHERE id=${taskId} AND organization_id=${org} FOR UPDATE`; if (!current) throw new HttpError(404,'Tarefa não encontrada')
      const next=req.body.status ? transitionTask(current,req.body.status) : {status:current.status,previous_status:current.previous_status}
      const [saved]=await tx`UPDATE delivery_tasks SET title=${req.body.title===undefined?current.title:text(req.body.title)},description=${req.body.description===undefined?current.description:String(req.body.description).slice(0,10000)},due_date=${req.body.due_date===undefined?current.due_date:date(req.body.due_date,true)},status=${next.status},previous_status=${next.previous_status},updated_at=NOW() WHERE id=${taskId} AND organization_id=${org} RETURNING *`; return saved
    }); res.json(result)
  }))
  router.delete('/tasks/:id',endpoint(async(req,res)=>{ const rows=await sql`DELETE FROM delivery_tasks WHERE id=${id(req.params.id)} AND organization_id=${req.organizationId!} RETURNING id`; if (!rows.length) throw new HttpError(404,'Tarefa não encontrada'); res.status(204).send() }))

  router.get('/opportunities',endpoint(async(req,res)=>{
    const org=req.organizationId!; const p=pagination(req); const search=String(req.query.search||'').trim(); const stage=req.query.stage ? String(req.query.stage) : null; if (stage) probability(stage)
    const where=sql`o.organization_id=${org} ${req.query.opportunityId?sql`AND o.id=${id(req.query.opportunityId)}`:sql``} ${search?sql`AND (o.title ILIKE ${'%'+search+'%'} OR cl.name ILIKE ${'%'+search+'%'})`:sql``} ${stage?sql`AND o.stage=${stage}`:sql``}`
    const rows=await sql`SELECT o.*,cl.name AS client_name,count(*) OVER()::int AS total_count FROM opportunities o JOIN clients cl ON cl.id=o.client_id AND cl.organization_id=o.organization_id WHERE ${where} ORDER BY o.created_at DESC,o.id LIMIT ${p.limit} OFFSET ${p.offset}`
    const [summary]=await sql`SELECT count(*) FILTER(WHERE o.stage NOT IN ('won','lost'))::int AS open_count,COALESCE(sum(o.amount) FILTER(WHERE o.stage NOT IN ('won','lost')),0) AS open_value,COALESCE(sum(round(o.amount * CASE o.stage WHEN 'qualification' THEN .2 WHEN 'proposal' THEN .4 WHEN 'negotiation' THEN .7 WHEN 'closing' THEN .9 ELSE 0 END,2)),0) AS weighted_value FROM opportunities o JOIN clients cl ON cl.id=o.client_id AND cl.organization_id=o.organization_id WHERE ${where}`
    res.json({items:rows.map((r:any)=>({...r,amount:Number(r.amount),probability:probability(r.stage),weighted_value:weightedValue(Number(r.amount),r.stage)})),total:rows[0]?.total_count||0,summary:{open_count:summary.open_count,open_value:Number(summary.open_value),weighted_value:Number(summary.weighted_value)}})
  }))
  router.post('/opportunities',endpoint(async(req,res)=>{
    const org=req.organizationId!; const clientId=id(req.body.client_id); await clientExists(sql,org,clientId); const stage=req.body.stage||'qualification'; probability(stage); if (['won','lost'].includes(stage)) throw new HttpError(400,'Cadastre a oportunidade em uma etapa aberta')
    const [row]=await sql`INSERT INTO opportunities(organization_id,client_id,title,description,amount,expected_close,stage) VALUES(${org},${clientId},${text(req.body.title)},${String(req.body.description||'').slice(0,10000)},${amount(req.body.amount)},${date(req.body.expected_close)},${stage}) RETURNING *`; res.status(201).json(row)
  }))
  router.patch('/opportunities/:id',endpoint(async(req,res)=>{
    const org=req.organizationId!; const opportunityId=id(req.params.id)
    const row=await sql.begin(async(tx:any)=>{
      const [current]=await tx`SELECT * FROM opportunities WHERE id=${opportunityId} AND organization_id=${org} FOR UPDATE`; if (!current) throw new HttpError(404,'Oportunidade não encontrada')
      if (current.contract_id || current.stage==='won') throw new HttpError(409,'Oportunidade já convertida em contrato')
      const stage=req.body.stage||current.stage; probability(stage); if (stage==='won') throw new HttpError(400,'Confirme o contrato no assistente para concluir como ganho')
      const [updated]=await tx`UPDATE opportunities SET title=${req.body.title===undefined?current.title:text(req.body.title)},description=${req.body.description===undefined?current.description:String(req.body.description).slice(0,10000)},amount=${req.body.amount===undefined?current.amount:amount(req.body.amount)},expected_close=${req.body.expected_close===undefined?current.expected_close:date(req.body.expected_close)},stage=${stage},closed_at=${stage==='lost'?new Date():null},updated_at=NOW() WHERE id=${opportunityId} AND organization_id=${org} RETURNING *`; return updated
    }); res.json(row)
  }))
  router.post('/opportunities/:id/convert',endpoint(async(req,res)=>{
    const org=req.organizationId!; const opportunityId=id(req.params.id)
    const result=await sql.begin(async(tx:any)=>{
      const [opportunity]=await tx`SELECT * FROM opportunities WHERE id=${opportunityId} AND organization_id=${org} FOR UPDATE`; if (!opportunity) throw new HttpError(404,'Oportunidade não encontrada')
      if (opportunity.contract_id) return {contractId:opportunity.contract_id,alreadyConverted:true}
      if (opportunity.stage==='lost') throw new HttpError(409,'Reabra a oportunidade antes de converter')
      if (opportunity.stage==='won') throw new HttpError(409,'Oportunidade ganha sem contrato vinculado; revise o registro')
      const contract=await insertContract(tx,org,opportunity.client_id,req.body)
      await tx`UPDATE opportunities SET stage='won',contract_id=${contract.id},closed_at=NOW(),updated_at=NOW() WHERE id=${opportunityId} AND organization_id=${org}`
      return {contractId:contract.id,alreadyConverted:false}
    }); res.json(result)
  }))

  router.get('/relationships/:clientId',endpoint(async(req,res)=>{ const org=req.organizationId!; const clientId=id(req.params.clientId); await clientExists(sql,org,clientId); const notes=await sql`SELECT id,body,created_at FROM client_notes WHERE organization_id=${org} AND client_id=${clientId} ORDER BY created_at DESC`; const [nextAction]=await sql`SELECT id,title,due_at,completed FROM reminders WHERE organization_id=${org} AND linked_id=${clientId} AND linked_type='client' AND is_next_action`; res.json({notes,nextAction:nextAction||null}) }))
  router.post('/relationships/:clientId/notes',endpoint(async(req,res)=>{ const org=req.organizationId!; const clientId=id(req.params.clientId); await clientExists(sql,org,clientId); const [row]=await sql`INSERT INTO client_notes(organization_id,client_id,body) VALUES(${org},${clientId},${text(req.body.body,10000)}) RETURNING id,body,created_at`; res.status(201).json(row) }))
  router.post('/relationships/:clientId/next-action',endpoint(async(req,res)=>{
    const org=req.organizationId!; const clientId=id(req.params.clientId); await clientExists(sql,org,clientId); const title=text(req.body.title); const due=new Date(req.body.due_at); if (!Number.isFinite(due.getTime())) throw new HttpError(400,'Data e horário inválidos')
    const [row]=await sql`INSERT INTO reminders(organization_id,linked_type,linked_id,title,due_at,is_next_action) VALUES(${org},'client',${clientId},${title},${due},TRUE) ON CONFLICT(organization_id,linked_id) WHERE is_next_action AND linked_type='client' DO UPDATE SET title=EXCLUDED.title,due_at=EXCLUDED.due_at,completed=FALSE RETURNING *`; res.json(row)
  }))

  router.get('/search',endpoint(async(req,res)=>{
    const org=req.organizationId!; const query=String(req.query.q||'').trim().slice(0,120); if (query.length<2) {res.json([]);return}; const term='%'+query+'%'
    const rows=await sql`SELECT id,name AS title,'Cliente' AS kind,'clients' AS target,id AS target_id FROM clients WHERE organization_id=${org} AND (name ILIKE ${term} OR email ILIKE ${term} OR whatsapp ILIKE ${term}) UNION ALL SELECT id,title,'Oportunidade','pipeline',id FROM opportunities WHERE organization_id=${org} AND title ILIKE ${term} UNION ALL SELECT id,title,'Tarefa','deliveries',id FROM delivery_tasks WHERE organization_id=${org} AND title ILIKE ${term} LIMIT 30`; res.json(rows)
  }))
  async function notices(org:string) {
    const today=businessDay(); const [reminders,tasks,receivables,states]=await Promise.all([
      sql`SELECT id,title,due_at,completed,linked_id,is_next_action FROM reminders WHERE organization_id=${org} AND NOT completed AND due_at < ((${today}::date+interval '1 day') AT TIME ZONE 'America/Sao_Paulo')`,
      sql`SELECT id,title,due_date,status FROM delivery_tasks WHERE organization_id=${org} AND status<>'done' AND due_date<${today}::date`,
      sql`SELECT r.id,r.description,r.due_date,r.status,r.client_id,cl.name AS client_name FROM receivables r JOIN clients cl ON cl.id=r.client_id AND cl.organization_id=r.organization_id WHERE r.organization_id=${org} AND r.status='open' AND r.due_date<${today}::date`,
      sql`SELECT notification_key,read_at,dismissed FROM notification_states WHERE organization_id=${org}`,
    ]); return notificationItems({reminders,tasks,receivables},new Date(),states)
  }
  router.get('/notifications',endpoint(async(req,res)=>res.json(await notices(req.organizationId!))))
  router.patch('/notifications',endpoint(async(req,res)=>{
    const org=req.organizationId!; const key=text(req.body.key,240); if (typeof req.body.read!=='boolean' && typeof req.body.dismissed!=='boolean') throw new HttpError(400,'Informe leitura ou descarte')
    if (!(await notices(org)).some(n=>n.key===key)) throw new HttpError(404,'Aviso não encontrado')
    const [row]=await sql`INSERT INTO notification_states(organization_id,notification_key,read_at,dismissed) VALUES(${org},${key},${req.body.read?new Date():null},${req.body.dismissed===true}) ON CONFLICT(organization_id,notification_key) DO UPDATE SET read_at=CASE WHEN ${typeof req.body.read==='boolean'} THEN EXCLUDED.read_at ELSE notification_states.read_at END,dismissed=CASE WHEN ${typeof req.body.dismissed==='boolean'} THEN EXCLUDED.dismissed ELSE notification_states.dismissed END RETURNING *`; res.json(row)
  }))
  router.get('/reports',endpoint(async(req,res)=>{
    const org=req.organizationId!; const today=businessDay(); const from=date(req.query.from || today.slice(0,7)+'-01')!; const to=date(req.query.to || today)!; if (from>to || (Date.parse(to)-Date.parse(from))/86400000>3660) throw new HttpError(400,'Escolha um período válido de até dez anos')
    const [financial]=await sql`SELECT COALESCE(sum(amount),0) AS received FROM receivables WHERE organization_id=${org} AND status='paid' AND paid_at BETWEEN ${from}::date AND ${to}::date`
    const [pipeline]=await sql`SELECT count(*) FILTER(WHERE stage NOT IN ('won','lost'))::int AS open_count,COALESCE(sum(amount) FILTER(WHERE stage NOT IN ('won','lost')),0) AS open_value,COALESCE(sum(round(amount*CASE stage WHEN 'qualification' THEN .2 WHEN 'proposal' THEN .4 WHEN 'negotiation' THEN .7 WHEN 'closing' THEN .9 ELSE 0 END,2)),0) AS weighted_value FROM opportunities WHERE organization_id=${org} AND expected_close BETWEEN ${from}::date AND ${to}::date`
    const monthly=await sql`SELECT to_char(paid_at,'YYYY-MM') AS month,sum(amount) AS received FROM receivables WHERE organization_id=${org} AND status='paid' AND paid_at BETWEEN ${from}::date AND ${to}::date GROUP BY 1 ORDER BY 1`
    res.json({from,to,received:Number(financial.received),open_count:pipeline.open_count,open_value:Number(pipeline.open_value),weighted_value:Number(pipeline.weighted_value),monthly:monthly.map((r:any)=>({...r,received:Number(r.received)}))})
  }))
  router.get('/export',endpoint(async(req,res)=>{
    const org=req.organizationId!; const format=String(req.query.format||'json'); const table=String(req.query.table||'clients'); if (!['json','csv'].includes(format) || !EXPORT_FIELDS[table]) throw new HttpError(400,'Formato de exportação inválido')
    const collections=await sql.begin('isolation level repeatable read read only',async(tx:any)=>{
      const data:Record<string,unknown>={}; for (const name of format==='csv'?[table]:Object.keys(EXPORT_FIELDS)) { const fields=EXPORT_FIELDS[name]; const rows=await tx`SELECT ${tx(fields)} FROM ${tx(name)} WHERE organization_id=${org}`; data[name]=exportBusinessRows(name,rows,org) }; return data
    })
    const filename='abelha-'+businessDay()+(format==='csv'?'-'+table+'.csv':'.json'); res.attachment(filename)
    if (format==='json') {res.json({version:1,application:'abelha',organization_id:org,exported_at:new Date().toISOString(),timezone:'America/Sao_Paulo',data:collections});return}
    const fields=EXPORT_FIELDS[table]; const rows=collections[table] as Record<string,unknown>[]; res.type('text/csv; charset=utf-8').send('\uFEFF'+[fields.map(csvCell).join(','),...rows.map(row=>fields.map(field=>csvCell(row[field])).join(','))].join('\r\n'))
  }))
  return router
}
export default createCrmRouter()
