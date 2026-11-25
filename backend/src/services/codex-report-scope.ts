import { timingSafeEqual } from 'node:crypto'
import { githubRepo, InputError } from './personal'
import type { Database } from './platform-db'

const idPattern=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
type ProjectScope={id:string;repository:string|null}
type Access={configured:boolean;grants:ProjectScope[]|null;legacy:boolean}

export function codexReportAccess(header:string,config:NodeJS.ProcessEnv):Access {
  const dedicated=config.ABELHA_CODEX_REPORT_TOKEN ?? ''
  const actual=Buffer.from(header.replace(/^Bearer /,''))
  const expected=Buffer.from(dedicated)
  const invalid={configured:false,grants:null,legacy:false}
  if(expected.length<32||dedicated===config.ABELHA_INTEGRATION_TOKEN)return invalid
  const legacy=!config.ABELHA_CODEX_PROJECTS_JSON
  let projects:ProjectScope[]
  try {
    if(legacy) {
      const id=config.ABELHA_CODEX_PROJECT_ID??''
      if(!idPattern.test(id))return invalid
      projects=[{id:id.toLowerCase(),repository:null}]
    }else{
      const raw:unknown=JSON.parse(config.ABELHA_CODEX_PROJECTS_JSON!)
      if(!Array.isArray(raw)||!raw.length||raw.length>30)return invalid
      projects=raw.map(value=>{
        if(!value||typeof value.id!=='string'||!idPattern.test(value.id))throw Error()
        return {id:value.id.toLowerCase(),repository:githubRepo(value.repository)}
      })
      if(new Set(projects.map(row=>row.id)).size!==projects.length)return invalid
    }
  }catch{return invalid}
  const authorized=header.startsWith('Bearer ')&&actual.length===expected.length&&timingSafeEqual(actual,expected)
  return {configured:true,grants:authorized?projects:null,legacy}
}

// Compatibility for the single-project receipt contract.
export function codexReportScope(header:string,config:NodeJS.ProcessEnv) {
  const access=codexReportAccess(header,config)
  return {configured:access.configured,project:access.legacy?(access.grants?.[0]?.id??null):null}
}

type Owner={org:string;user:string}
export async function allowedCodexProjects(db:Database,owner:Owner,grants:ProjectScope[]) {
  const rows=await db.query<{id:string;repository:string;status:string}>(`
    SELECT id,repository,status FROM personal_projects
    WHERE organization_id=$1 AND user_id=$2 AND repository IS NOT NULL
      AND id IN (SELECT value::uuid FROM jsonb_array_elements_text($3::text::jsonb))
    ORDER BY id
  `,[owner.org,owner.user,JSON.stringify(grants.map(g=>g.id))])
  return rows.flatMap(row=>{
    const grant=grants.find(item=>item.id===row.id)
    if(!grant)return []
    try{
      const repository=githubRepo(row.repository)
      return !grant.repository||grant.repository===repository ? [{id:row.id,repository,status:row.status}] : []
    }catch{return []}
  })
}

export function selectCodexProject(rows:{id:string;repository:string}[],selector:unknown,legacy:boolean) {
  if(selector===undefined&&legacy&&rows.length===1)return rows[0].id
  if(!selector||typeof selector!=='object'||Array.isArray(selector))throw new InputError('Informe um projeto autorizado.',400)
  const {id,repository}=selector as Record<string,unknown>
  if(id!==undefined&&(typeof id!=='string'||!idPattern.test(id)))throw new InputError('Identificador de projeto inválido.',400)
  if(!id&&!repository)throw new InputError('Informe o identificador ou repositório canônico.',400)
  const canonical=repository===undefined?undefined:githubRepo(repository)
  const matches=rows.filter(row=>(!id||row.id===String(id).toLowerCase())&&(!canonical||row.repository===canonical))
  if(matches.length>1)throw new InputError('Mais de um projeto autorizado usa esse repositório. Informe o identificador.',409)
  if(!matches.length)throw new InputError('Projeto autorizado não encontrado.',404)
  return matches[0].id
}
