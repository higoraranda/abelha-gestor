export interface Database {
  query<T extends Record<string,any> = Record<string,any>>(query:string,params?:any[]):Promise<T[]>
  transaction<T>(fn:(tx:Database)=>Promise<T>):Promise<T>
}
export function postgresDatabase(sql:any):Database {
  return {query:async(query,params=[])=>Array.from(await sql.unsafe(query,params)) as any,transaction:fn=>sql.begin((tx:any)=>fn(postgresDatabase(tx)))}
}
