import type { Database } from './platform-db'
import { InputError, text, publicUrl } from './personal'

export function publicLeadInput(lead:any) {
  const key=text(lead.source_key,160)
  if(!/^(node|way|relation)\/\d+$/.test(key))throw new InputError('Referência OpenStreetMap inválida.')
  const name=text(lead.name),niche=text(lead.niche,160)
  return {key,data:{name,niche,address:text(lead.address||'',2000,true),phone:text(lead.phone||'',100,true),website:publicUrl(lead.website,true),source_url:'https://www.openstreetmap.org/'+key,queried_at:text(lead.queried_at,100),summary:name+' · '+niche,classification:niche,evidence_reference:'https://www.openstreetmap.org/'+key}}
}
export async function stagePublicLead(sql:Database,org:string,lead:any) {
  const {key,data}=publicLeadInput(lead)
  const [created]=await sql.query("INSERT INTO crm_lead_candidates(organization_id,source,source_key,data) VALUES($1,'OpenStreetMap',$2,$3::text::jsonb) ON CONFLICT(organization_id,source,source_key) DO NOTHING RETURNING id",[org,key,JSON.stringify(data)])
  const [candidate]=await sql.query("SELECT * FROM crm_lead_candidates WHERE organization_id=$1 AND source='OpenStreetMap' AND source_key=$2",[org,key])
  return {candidate,reused:!created}
}
