import type { Router } from 'express'
import type { Database } from '../services/platform-db'
import { endpoint, scope, notice, type Scope } from './personal'
import { InputError, uuid, text, money, integer, publicUrl, priceAlert } from '../services/personal'

export function registerPersonalPrices(router:Router,sql:Database) {
  router.get('/prices',endpoint(async(_req,res)=>{
    const {org,user}=scope(res)
    const watches=await sql.query('SELECT * FROM personal_price_watches WHERE organization_id=$1 AND user_id=$2 ORDER BY active DESC,name,id LIMIT 200',[org,user])
    const observations=await sql.query('SELECT * FROM personal_price_observations WHERE organization_id=$1 AND user_id=$2 ORDER BY observed_at DESC LIMIT 500',[org,user])
    res.json({watches,observations,provider_configured:false,message:'As consultas automáticas dependem de uma fonte autorizada conectada. O recebimento de preços não comprova que um agendamento está ativo.'})
  }))
  router.post('/prices',endpoint(async(req,res)=>{
    const {org,user}=scope(res);const b=req.body
    const [row]=await sql.query('INSERT INTO personal_price_watches(organization_id,user_id,name,product_url,stores,target,interval_minutes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[org,user,text(b.name),publicUrl(b.product_url,true),text(b.stores||'',2000,true),b.target===''||b.target===null||b.target===undefined?null:money(b.target),integer(b.interval_minutes??60,15,10080)]);res.status(201).json(row)
  }))
  router.patch('/prices/:id',endpoint(async(req,res)=>{
    const {org,user}=scope(res);if(typeof req.body.active!=='boolean')throw new InputError('Situação inválida.')
    const [row]=await sql.query('UPDATE personal_price_watches SET active=$4 WHERE organization_id=$1 AND user_id=$2 AND id=$3 RETURNING *',[org,user,uuid(req.params.id),req.body.active]);if(!row)throw new InputError('Monitor não encontrado.',404);res.json(row)
  }))
}
export async function receivePrice(sql:Database,owner:Scope,watchId:string,body:any) {
  const url=publicUrl(body.product_url)!
  const allowed=(process.env.PRICE_ALLOWED_HOSTS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean)
  if(!allowed.includes(new URL(url).hostname))throw new InputError('Esta loja ainda não foi autorizada no provedor de preços.',503)
  const eventKey=text(body.event_id,160),store=text(body.store),price=money(body.price)
  if(price<=0)throw new InputError('O preço observado deve ser positivo.')
  const observed=new Date(body.observed_at)
  if(typeof body.observed_at!=='string'||!Number.isFinite(observed.valueOf())||observed.valueOf()>Date.now()+60000||observed.valueOf()<Date.now()-7*86400000)throw new InputError('Informe a data real de uma consulta recente.')
  return sql.transaction(async tx=>{
    const {org,user}=owner
    const [watch]=await tx.query('SELECT * FROM personal_price_watches WHERE organization_id=$1 AND user_id=$2 AND id=$3 FOR UPDATE',[org,user,watchId]);if(!watch)throw new InputError('Monitor não encontrado.',404)
    const [existing]=await tx.query('SELECT * FROM personal_price_observations WHERE organization_id=$1 AND user_id=$2 AND watch_id=$3 AND event_key=$4',[org,user,watchId,eventKey])
    if(existing){if(Number(existing.price)!==price||existing.product_url!==url||existing.store!==store||new Date(existing.observed_at).toISOString()!==observed.toISOString())throw new InputError('Evento já utilizado com outro conteúdo.',409);return existing}
    if(!watch.active)throw new InputError('O monitor está pausado.',409)
    const [previous]=await tx.query('SELECT * FROM personal_price_observations WHERE organization_id=$1 AND user_id=$2 AND watch_id=$3 AND store=$4 AND product_url=$5 ORDER BY observed_at DESC LIMIT 1',[org,user,watchId,store,url])
    if(previous&&new Date(previous.observed_at).valueOf()>=observed.valueOf())throw new InputError('A consulta é anterior ao último preço registrado.',409)
    const [row]=await tx.query('INSERT INTO personal_price_observations(organization_id,user_id,watch_id,event_key,store,product_url,price,observed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[org,user,watchId,eventKey,store,url,price,observed.toISOString()])
    await tx.query("UPDATE personal_price_watches SET last_checked_at=GREATEST(last_checked_at,$4::timestamptz),provider='authorized-feed' WHERE organization_id=$1 AND user_id=$2 AND id=$3",[org,user,watchId,observed.toISOString()])
    const alert=priceAlert(previous?Number(previous.price):null,price,watch.target===null?null:Number(watch.target))
    if(alert.notify)await notice(tx,owner,'price:'+row.id,'Preço acompanhado: '+watch.name,`${store}: ${previous?'de R$ '+Number(previous.price).toFixed(2)+' para ':''}R$ ${price.toFixed(2)}${alert.reduction?' · queda de '+alert.reduction+'%':''}. Confira o histórico e o link da loja.`,'/?space=personal&view=personal-prices&record='+watchId)
    return row
  })
}
