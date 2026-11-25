import { db } from "../db/index"
import { emit } from "./sseManager"
import { postgresDatabase, type Database } from './platform-db'

function object(value:unknown):Record<string,unknown> {
  return value && typeof value==='object' && !Array.isArray(value) ? value as Record<string,unknown> : {}
}

export async function ingestIncomingText(sql:Database,payload:unknown) {
  const event=object(payload), data=object(event.data), key=object(data.key), message=object(data.message)
  const text=message.conversation ?? object(message.extendedTextMessage).text
  const directJid=(v:unknown)=>typeof v==='string' && /^\d{7,15}@(s\.whatsapp\.net|c\.us)$/.test(v) ? v : null
  const jid=directJid(key.remoteJid) ?? directJid(key.remoteJidAlt)
  if (key.fromMe!==false || !jid || typeof event.instance!=='string' || event.instance.length>255 ||
      typeof key.id!=='string' || !key.id || key.id.length>255 ||
      typeof text!=='string' || !text.trim() || text.length>16000) return null
  const name=typeof data.pushName==='string' ? data.pushName.trim().slice(0,255)||null : null

  return sql.transaction(async tx=>{
    // Serialize webhook writes for this organization without imposing a new global identity on existing clients.
    const [scope]=await tx.query(`
      SELECT o.id FROM organizations o JOIN evolution_instances i ON i.organization_id=o.id
      WHERE i.instance_name=$1 FOR UPDATE OF o
    `,[event.instance])
    if(!scope) return null
    const org=scope.id as string
    const [prior]=await tx.query('SELECT id FROM messages WHERE organization_id=$1 AND whatsapp_message_id=$2',[org,key.id])
    if(prior) return null
    const phone=jid.split('@')[0]
    const matches=await tx.query('SELECT id FROM clients WHERE organization_id=$1 AND whatsapp=$2 LIMIT 2',[org,phone])
    let clientId=matches.length===1 ? matches[0].id : null
    if(!matches.length){
      const [created]=await tx.query('INSERT INTO clients (organization_id,whatsapp,name) VALUES ($1,$2,$3) RETURNING id',[org,phone,name])
      clientId=created.id
    } else if(clientId && name) {
      await tx.query('UPDATE clients SET name=COALESCE(name,$3) WHERE organization_id=$1 AND id=$2',[org,clientId,name])
    }
    const [thread]=await tx.query(`
      INSERT INTO conversations(organization_id,client_id,whatsapp_chat_id)
      VALUES($1,$2,$3) ON CONFLICT(organization_id,whatsapp_chat_id)
      DO UPDATE SET client_id=COALESCE(conversations.client_id,EXCLUDED.client_id) RETURNING id
    `,[org,clientId,jid])
    const [received]=await tx.query(`
      INSERT INTO messages(organization_id,conversation_id,whatsapp_message_id,direction,content)
      VALUES($1,$2,$3,'in',$4) RETURNING id,created_at
    `,[org,thread.id,key.id,text])
    await tx.query('UPDATE conversations SET last_message_at=now(),unread_count=COALESCE(unread_count,0)+1 WHERE organization_id=$1 AND id=$2',[org,thread.id])
    return {id:received.id,organizationId:org,conversationId:thread.id,whatsappMessageId:key.id,direction:'in',content:text,createdAt:received.created_at}
  })
}

export async function processIncomingMessage(payload: unknown): Promise<void> {
  const message=await ingestIncomingText(postgresDatabase(db),payload)
  if(!message)return
  emit(message.organizationId,'new_message',{conversation_id:message.conversationId,message})
  emit(message.organizationId,'conversation_updated',{conversation_id:message.conversationId})
}
