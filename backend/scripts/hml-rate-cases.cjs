const assert=require('node:assert/strict');
module.exports=async({h,scenarios})=>{
 const {postgresDatabase}=require('../dist/services/platform-db');
 const {configuredSharedBudget}=require('../dist/services/shared-credential-budget');
 const config={ABELHA_AUTH_SHARED_BUDGET:'true',ABELHA_AUTH_RATE_SECRET:require('node:crypto').randomBytes(32).toString('hex')};
 // Both pools share a run-specific namespace; SQL/pruning cannot touch other jobs.
 function scoped(connection){const db=postgresDatabase(connection);return {...db,query(query,values=[]){const params=values.map(value=>typeof value==='string'&&/^(login|reset):/.test(value)?h.tag+':'+value:value);for(const value of params.slice(0,2))if(typeof value==='string'&&value.startsWith(h.tag+':')&&!value.endsWith(':'))h.rateKeys.add(value);return db.query(query,params);}};}
 const second=require('postgres')(process.env.DATABASE_URL,{ssl:'require',max:1});
 try{
   const one=configuredSharedBudget(scoped(h.sql),'login',config),two=configuredSharedBudget(scoped(second),'login',config);
   const email=h.email('rate');
   const results=await Promise.all(Array.from({length:16},(_,i)=>(i%2?one:two).reserve(email)));
   assert.equal(results.filter(Boolean).length,12);await two.success(email);assert.equal(await one.reserve(email),true);
   const reset1=configuredSharedBudget(scoped(h.sql),'reset',config),reset2=configuredSharedBudget(scoped(second),'reset',config);
   const resets=await Promise.all(Array.from({length:6},(_,i)=>(i%2?reset1:reset2).reserve(email)));assert.equal(resets.filter(Boolean).length,4);
   scenarios.push({name:'limitador SQL compartilhado entre dois pools, concorrência 12/16 login e 4/6 reset, reabertura após sucesso',status:'PASS'});
 }finally{await second.end({timeout:3});}
};
