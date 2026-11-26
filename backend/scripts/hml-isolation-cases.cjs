const assert=require('node:assert/strict');
module.exports=async c=>{
 const {h,owner,actor,signIn,call,model,scenarios}=c,sql=h.sql;
 // Same organization: tests user filters independently of organization filters.
 const actors=[];
 for(const name of ['same-org-a','same-org-b']){
   const address=h.email(name);await sql`insert into users(organization_id,name,email,password_hash,account_role,member_finance_enabled,member_subscriptions_enabled,member_prices_enabled) values(${h.owner.organization_id},${name},${address},${await require('bcryptjs').hash(h.password,4)},'member',true,true,true)`;
   const a=actor(name);await signIn(a,address);actors.push(a);
 }
 const [a,b]=actors;
 const project=await call(a,'POST /api/v1/personal/projects',{name:h.tag+' same-org privado'},{},201);
 const calc=await call(a,'POST /api/v1/quote-models',{model},{},201);
 const cycle=await call(a,'POST /api/v1/personal/finance/cycles',{name:h.tag,starts_on:'2020-01-01',closes_on:'2020-01-31'},{},201);
 const sub=await call(a,'POST /api/v1/personal/subscriptions',{name:h.tag,amount:15,frequency:'monthly',scope:'personal',due_on:'2020-01-03'},{},201);
 const watch=await call(a,'POST /api/v1/personal/prices',{name:h.tag,product_url:'https://store.example.invalid/item'},{},201);
 for(const peer of [b,owner]){
   assert.ok(!(await call(peer,'GET /api/v1/personal/projects')).some(x=>x.id===project.id));
   assert.ok(!(await call(peer,'GET /api/v1/quote-models')).some(x=>x.id===calc.id));
   assert.ok(!(await call(peer,'GET /api/v1/personal/finance')).cycles.some(x=>x.id===cycle.id));
   assert.ok(!(await call(peer,'GET /api/v1/personal/subscriptions')).subscriptions.some(x=>x.id===sub.id));
   assert.ok(!(await call(peer,'GET /api/v1/personal/prices')).watches.some(x=>x.id===watch.id));
   for(const [ep,body,params] of [
     ['PATCH /api/v1/quote-models/:id',{model,revision:1},{id:calc.id}],
     ['POST /api/v1/personal/finance/entries',{cycle_id:cycle.id,recorded_on:'2020-01-02',amount:900},{id:cycle.id}],
     ['PATCH /api/v1/personal/subscriptions/:id',{amount:900},{id:sub.id}],
     ['POST /api/v1/personal/subscriptions/:id/payments',{due_on:'2020-01-03',paid_on:'2020-01-02'},{id:sub.id}],
     ['PATCH /api/v1/personal/prices/:id',{active:false},{id:watch.id}],
   ])await call(peer,ep,body,params,404,'mesma organização, titular diferente e módulo permitido','negative');
 }
 // Role does not imply ownership: owner cannot edit a member's project in the same org.
 for(const ep of ['GET /api/v1/personal/projects/:id','PATCH /api/v1/personal/projects/:id','DELETE /api/v1/personal/projects/:id'])await call(owner,ep,ep.startsWith('PATCH')?{status:'active'}:{confirmation_name:project.name},{id:project.id},404,'mesma organização: proprietário não herda recurso do membro','negative');
 const [persisted]=await sql`select (select revision from quote_models where id=${calc.id}) as revision,(select amount::text from personal_subscriptions where id=${sub.id}) as amount,(select active from personal_price_watches where id=${watch.id}) as active,(select count(*)::int from personal_invoice_entries where cycle_id=${cycle.id}) as entries,(select count(*)::int from personal_projects where id=${project.id}) as projects`;
 assert.equal(persisted.revision,1);assert.equal(Number(persisted.amount),15);assert.equal(persisted.active,true);assert.equal(persisted.entries,0);assert.equal(persisted.projects,1);
 // A member must not see the owner's resources either, despite matching org_id.
 const ownerModel=await call(owner,'POST /api/v1/quote-models',{model},{},201);
 for(const peer of [a,b]){assert.ok(!(await call(peer,'GET /api/v1/quote-models')).some(x=>x.id===ownerModel.id));await call(peer,'PATCH /api/v1/quote-models/:id',{model,revision:1},{id:ownerModel.id},404,'membro não acessa modelo privado do proprietário na mesma organização','negative');}
 scenarios.push({name:'mesma organização: A/B autorizados e proprietário isolados por user_id nos cinco módulos; IDs e persistência inalterada',status:'PASS'});
};
