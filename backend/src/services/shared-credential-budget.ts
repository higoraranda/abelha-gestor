import {createHmac} from 'node:crypto'
import type {Database} from './platform-db'

type Scope='login'|'reset'
const config={login:{global:90,identity:12},reset:{global:30,identity:4}}
export function createSharedCredentialBudget(db:Database,secret:string,scope:Scope) {
  if(Buffer.byteLength(secret,'utf8')<32)throw new Error('Configuração do limitador compartilhado inválida.')
  const global=scope+':global'
  const identity=(email:string)=>scope+':'+createHmac('sha256',secret).update(scope+'\u0000'+email).digest('hex')
  return {
    async reserve(email:string){
      const [slot]=await db.query(`
        WITH tick AS (SELECT floor(extract(epoch FROM statement_timestamp()))::bigint sec),
        capacity AS (
          INSERT INTO auth_rate_buckets(bucket_key,window_id,attempt_count,expires_at)
          SELECT $1,sec/60,1,to_timestamp((sec/60+1)*60) FROM tick
          ON CONFLICT(bucket_key) DO UPDATE SET
            attempt_count=CASE WHEN auth_rate_buckets.window_id=EXCLUDED.window_id THEN auth_rate_buckets.attempt_count+1 ELSE 1 END,
            window_id=EXCLUDED.window_id,expires_at=EXCLUDED.expires_at
          WHERE auth_rate_buckets.window_id<EXCLUDED.window_id OR
            (auth_rate_buckets.window_id=EXCLUDED.window_id AND auth_rate_buckets.attempt_count<$3)
          RETURNING attempt_count
        ), scoped AS (
          INSERT INTO auth_rate_buckets(bucket_key,window_id,attempt_count,expires_at)
          SELECT $2,sec/600,1,to_timestamp((sec/600+1)*600) FROM tick,capacity
          ON CONFLICT(bucket_key) DO UPDATE SET
            attempt_count=CASE WHEN auth_rate_buckets.window_id=EXCLUDED.window_id THEN auth_rate_buckets.attempt_count+1 ELSE 1 END,
            window_id=EXCLUDED.window_id,expires_at=EXCLUDED.expires_at
          WHERE auth_rate_buckets.window_id<EXCLUDED.window_id OR
            (auth_rate_buckets.window_id=EXCLUDED.window_id AND auth_rate_buckets.attempt_count<$4)
          RETURNING 1
        ), prune AS (
          DELETE FROM auth_rate_buckets WHERE expires_at<statement_timestamp() AND left(bucket_key,length($5))=$5
            AND bucket_key NOT IN($1,$2) AND EXISTS(SELECT 1 FROM capacity WHERE attempt_count=1)
        )
        SELECT 1 AS granted FROM scoped
      `,[global,identity(email),config[scope].global,config[scope].identity,scope+':'])
      return !!slot
    },
    async success(email:string){await db.query('DELETE FROM auth_rate_buckets WHERE bucket_key=$1',[identity(email)])},
  }
}

export function configuredSharedBudget(db:Database,scope:Scope,env=process.env) {
  return env.ABELHA_AUTH_SHARED_BUDGET==='true'
    ? createSharedCredentialBudget(db,env.ABELHA_AUTH_RATE_SECRET??'',scope)
    : null
}
