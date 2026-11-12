// TEST ONLY: explicitly authorized Neon endpoint and temporary role/schemas.
import {readFileSync} from 'node:fs'
import postgres from 'postgres'
import type {PGlite} from '@electric-sql/pglite'

export async function homologationFixture(kind:'api'|'migration') {
  const file=process.env.ABELHA_HOMOLOGATION_SESSION_FILE
  if(!file)return null
  const session=JSON.parse(readFileSync(file,'utf8'))
  const url=new URL(session.connection)
  const schema=session.schemas?.[kind]
  if(session.branch_id!=='br-hidden-night-ace956m0'||url.hostname!=='ep-crimson-snow-acmuhqgp.sa-east-1.aws.neon.tech'||!/^abelha_hml_[a-f0-9]{16}$/.test(decodeURIComponent(url.username))||typeof schema!=='string'||!new RegExp('^abelha_hml_'+kind+'_[a-f0-9]{16}$').test(schema))throw new Error('Sessão de homologação recusada: endpoint/role/schema não autorizado')
  url.searchParams.set('sslmode','require');url.searchParams.set('options','-c search_path='+schema)
  const sql=postgres(url.toString(),{ssl:'require',max:1,prepare:false,onnotice:()=>{}})
  try {
    const [identity]=await sql`SELECT current_schema() AS schema,has_table_privilege(current_user,'public.clients','INSERT') AS public_write`
    if(identity.schema!==schema||identity.public_write)throw new Error('Isolamento da credencial temporária não comprovado')
    const [existing]=await sql`SELECT count(*)::int AS total FROM pg_tables WHERE schemaname=${schema}`
    if(existing.total!==0)throw new Error('O schema de homologação deve iniciar vazio')
    let closed=false
    const fixture={
      exec:async(query:string)=>{await sql.unsafe(query)},
      query:async(query:string,params:any[]=[])=>({rows:Array.from(await sql.unsafe(query,params))}),
      close:async()=>{if(!closed){closed=true;await sql.end({timeout:3})}},
    } as unknown as PGlite
    return {fixture,sql,schema}
  }catch(error){await sql.end({timeout:3});throw error}
}
