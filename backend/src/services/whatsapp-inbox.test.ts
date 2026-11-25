import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { ingestIncomingText } from './webhookProcessor'
import { connectionState, pairingQr } from './evolutionApi'
import { publicIPv4, requirePublicDns, type ProviderTransport } from './evolution-https'
import type { Database } from './platform-db'

test('inbox accepts supported messages, deduplicates and keeps organization history separate', async ()=>{
  const pg=new PGlite()
  const orgA='11111111-1111-4111-8111-111111111111', orgB='22222222-2222-4222-8222-222222222222'
  const db:Database={query:async<T extends Record<string,unknown>>(q:string,v:unknown[]=[]) => (await pg.query<T>(q,v)).rows,transaction: async callback=>pg.transaction(tx=>callback({...db,query:async<T extends Record<string,unknown>>(q:string,v:unknown[]=[]) => (await tx.query<T>(q,v)).rows}))}
  try {
    await pg.exec(`
      CREATE TABLE organizations(id uuid PRIMARY KEY);
      CREATE TABLE evolution_instances(organization_id uuid, instance_name text UNIQUE);
      CREATE TABLE clients(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, organization_id uuid, whatsapp text, name text);
      CREATE INDEX clients_number_idx ON clients(organization_id,whatsapp);
      CREATE TABLE conversations(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,organization_id uuid,client_id uuid,whatsapp_chat_id text,last_message_at timestamptz,unread_count integer DEFAULT 0,UNIQUE(organization_id,whatsapp_chat_id));
      CREATE TABLE messages(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, organization_id uuid,conversation_id uuid,whatsapp_message_id text,direction text,content text,created_at timestamptz DEFAULT now());
      CREATE UNIQUE INDEX messages_key_idx ON messages(organization_id,whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;
    `)
    await db.query('INSERT INTO organizations VALUES ($1),($2)',[orgA,orgB])
    await db.query("INSERT INTO evolution_instances VALUES ($1,'synthetic-a'),($2,'synthetic-b')",[orgA,orgB])
    const data={key:{remoteJid:'5500000000000@s.whatsapp.net',id:'synthetic-message',fromMe:false},message:{conversation:'Olá, caixa sintética'},pushName:'Cliente sintético'}
    const a=await ingestIncomingText(db,{instance:'synthetic-a',data})
    assert.equal(a?.organizationId,orgA)
    assert.equal(a?.content,'Olá, caixa sintética')
    assert.equal(await ingestIncomingText(db,{instance:'synthetic-a',data}),null)
    assert.equal(await ingestIncomingText(db,{instance:'unknown',data}),null)
    assert.equal(await ingestIncomingText(db,{instance:'synthetic-b',data:{...data,key:{...data.key,fromMe:true}}}),null)
    const b=await ingestIncomingText(db,{instance:'synthetic-b',data})
    assert.equal(b?.organizationId,orgB)
    assert.notEqual(a?.conversationId,b?.conversationId)
    const totals=await db.query('SELECT organization_id,unread_count FROM conversations ORDER BY organization_id')
    assert.deepEqual(totals,[{organization_id:orgA,unread_count:1},{organization_id:orgB,unread_count:1}])
    assert.equal((await db.query('SELECT id FROM clients')).length,2)
  } finally { await pg.close() }
})

test('Evolution adapter returns only safe connection state and a PNG, not provider metadata',async t=>{
  const previous=process.env.EVOLUTION_ALLOWED_ORIGINS
  process.env.EVOLUTION_ALLOWED_ORIGINS='https://evolution.example'
  t.after(()=>{if(previous===undefined)delete process.env.EVOLUTION_ALLOWED_ORIGINS;else process.env.EVOLUTION_ALLOWED_ORIGINS=previous})
  const tenant = {api_url:'https://evolution.example',instance_name:'synthetic',api_key:'synthetic-test-key'}
  const qr='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9tAAAAAASUVORK5CYII='
  let calls=0
  const mock:ProviderTransport=async(input,init)=>{
    calls++
    assert.equal(input.origin,'https://evolution.example')
    assert.equal(new Headers(init.headers).get('apikey'),'synthetic-test-key')
    assert.ok(init.signal)
    return input.pathname.includes('connectionState')
      ? Response.json({instance:{instanceName:'synthetic',state:'open'},key:'ignored'})
      : Response.json({base64:qr,code:'ignored',instance:'ignored'})
  }
  assert.equal(await connectionState(tenant,mock),'connected')
  assert.equal(await pairingQr(tenant,mock),qr)
  await assert.rejects(connectionState({...tenant,api_url:'http://evolution.example'}))
  await assert.rejects(connectionState({...tenant,api_url:'https://unapproved.example'}),/não autorizada/)
  await assert.rejects(connectionState({...tenant,api_url:'https://127.0.0.1'}),/não autorizada/)
  assert.equal(calls,2)
})

test('Evolution DNS requires public IPv4 and rejects a mixed private answer without connecting',()=>{
  for(const ip of ['127.0.0.1','10.1.1.1','172.31.0.2','192.168.1.1','169.254.169.254','100.64.2.1','::1','198.51.100.1','224.1.1.1']) assert.equal(publicIPv4(ip),false)
  assert.equal(requirePublicDns([{address:'8.8.8.8',family:4}]),'8.8.8.8')
  assert.throws(()=>requirePublicDns([{address:'8.8.8.8',family:4},{address:'192.168.1.1',family:4}]),/público/)
})
