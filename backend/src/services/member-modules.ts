import { randomUUID } from 'node:crypto'
import type { Database } from './platform-db'
import { InputError } from './personal'

type Actor={userId:string;organizationId:string}
const flags={projects:true,calculator:true,finance:false,subscriptions:false,prices:false} as const
export type MemberModule=keyof typeof flags
export type MemberModules=Record<MemberModule,boolean>
export type MemberWorkspace=MemberModules&{hidden:MemberModule[]}
type ListedMember=MemberModules&{id:string;email:string;active:boolean;created_at:string|null;last_sign_in_at:string|null;status_changed_at:string|null}

function fields(alias:string){
  // Preserve the legacy two-module grant before the additive migration. Every
  // new capability is deny-by-default and no flag reaches owner-only routes.
  return Object.entries(flags).map(([key,defaultValue])=>
    `COALESCE((to_jsonb(${alias})->>'member_${key}_enabled')::boolean,${defaultValue}) AS ${key}`).join(',')
}
const inactive="to_jsonb(m)->>'account_disabled_at' IS NULL"
const hidden="COALESCE(to_jsonb(m)->'member_hidden_modules','[]'::jsonb)"
const issuer="issuer.id=$1 AND issuer.organization_id=$2 AND issuer.account_role='owner'"
const link="(CASE WHEN to_jsonb(i) ? 'redeemed_user_id' THEN (to_jsonb(i)->>'redeemed_user_id')::uuid=m.id ELSE lower(btrim(m.email))=i.email END)"
const memberScope=`i.redeemed_at IS NOT NULL AND i.issued_by=issuer.id AND ${issuer} AND m.account_role='member' AND ${link}`
const adminFields=`m.id,i.email,${fields('m')},(${inactive}) AS active,
  i.redeemed_at AS created_at,to_jsonb(m)->>'member_last_sign_in_at' AS last_sign_in_at,
  to_jsonb(m)->>'account_status_changed_at' AS status_changed_at`

export async function memberModules(db:Database,actor:Actor):Promise<MemberWorkspace>{
  const [entry]=await db.query<MemberWorkspace>(`SELECT ${fields('m')},${hidden} AS hidden FROM users m WHERE m.id=$1 AND m.organization_id=$2 AND m.account_role='member' AND ${inactive}`,[actor.userId,actor.organizationId])
  if(!entry)throw new InputError('A conta convidada não está disponível.',403)
  return entry
}

export async function memberModuleAllowed(db:Database,actor:Actor,module:MemberModule){
  return (await memberModules(db,actor))[module]===true
}

export function moduleForMemberRoute(method:string,path:string,body:unknown):MemberModule|null {
  if(path==='/projects'&&(method==='GET'||(method==='POST'&&body&&typeof body==='object'&&Object.keys(body).every(key=>key==='name'||key==='next_step'))))return 'projects'
  if((method==='GET'&&path==='/finance')||(method==='POST'&&['/finance/cycles','/finance/entries','/finance/plans'].includes(path)))return 'finance'
  if(((method==='GET'||method==='POST')&&path==='/subscriptions')||
    (method==='PATCH'&&/^\/subscriptions\/[^/]+$/.test(path))||
    (method==='POST'&&/^\/subscriptions\/[^/]+\/payments$/.test(path)))return 'subscriptions'
  if(((method==='GET'||method==='POST')&&path==='/prices')||(method==='PATCH'&&/^\/prices\/[^/]+$/.test(path)))return 'prices'
  return null
}

export async function updateModulePreferences(db:Database,actor:Actor,value:unknown){
  const allowed=await memberModules(db,actor)
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!('hidden' in value)||!Array.isArray(value.hidden))
    throw new InputError('Informe somente a lista de módulos ocultos.')
  const values=value.hidden as unknown[]
  if(values.length>Object.keys(flags).length||values.some(key=>typeof key!=='string'||!Object.hasOwn(flags,key)))
    throw new InputError('Preferência de módulo inválida.')
  const next=[...new Set(values as MemberModule[])].filter(key=>allowed[key])
  const [row]=await db.query(`UPDATE users m SET member_hidden_modules=$3::text::jsonb WHERE m.id=$1 AND m.organization_id=$2 AND m.account_role='member' AND ${inactive} RETURNING member_hidden_modules AS hidden`,[actor.userId,actor.organizationId,JSON.stringify(next)])
  if(!row)throw new InputError('A conta convidada não está disponível.',403)
  return {hidden:row.hidden}
}

export async function listManagedMembers(db:Database,actor:Actor):Promise<ListedMember[]>{
  return db.query<ListedMember>(`SELECT ${adminFields} FROM account_invites i,users m,users issuer
    WHERE ${memberScope} ORDER BY i.redeemed_at DESC,m.id LIMIT 100`,[actor.userId,actor.organizationId])
}

export async function updateManagedMember(db:Database,actor:Actor,memberId:string,value:unknown):Promise<ListedMember>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new InputError('Informe pelo menos um módulo.')
  const input=value as Record<string,unknown>
  const entries=Object.entries(input)
  if(!entries.length||entries.some(([key,flag])=>!Object.hasOwn(flags,key)||typeof flag!=='boolean'))throw new InputError('Informe somente módulos que podem ser habilitados para convidados.')
  const keys=Object.keys(flags)
  const updates=keys.map((key,index)=>`member_${key}_enabled=COALESCE($${index+4},m.member_${key}_enabled)`).join(',')
  const [entry]=await db.query<ListedMember>(`UPDATE users m SET ${updates} FROM account_invites i,users issuer
    WHERE m.id=$3 AND ${memberScope} RETURNING ${adminFields}`,[actor.userId,actor.organizationId,memberId,...keys.map(key=>input[key]??null)])
  if(!entry)throw new InputError('Conta convidada não encontrada entre os seus convites utilizados.',404)
  return entry
}

export async function setManagedMemberStatus(db:Database,actor:Actor,memberId:string,value:unknown):Promise<ListedMember>{
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!('active' in value)||typeof value.active!=='boolean')
    throw new InputError('Informe somente se a conta deve estar ativa.')
  const [entry]=await db.query<ListedMember>(`UPDATE users m SET
    account_status_changed_at=CASE WHEN $4::boolean=(m.account_disabled_at IS NULL) THEN m.account_status_changed_at ELSE now() END,
    account_access_version=CASE WHEN $4::boolean=(m.account_disabled_at IS NULL) THEN m.account_access_version ELSE $5::uuid END,
    account_disabled_at=CASE WHEN $4::boolean THEN NULL ELSE COALESCE(m.account_disabled_at,now()) END
    FROM account_invites i,users issuer WHERE m.id=$3 AND ${memberScope} RETURNING ${adminFields}`,
    [actor.userId,actor.organizationId,memberId,value.active,randomUUID()])
  if(!entry)throw new InputError('Conta convidada não encontrada entre os seus convites utilizados.',404)
  return entry
}
