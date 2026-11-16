import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'

const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const uri=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64')
const timeout=uri(compile(await readFile(new URL('./requestTimeout.ts',import.meta.url),'utf8')))
const origin=uri('export const API_BASE_URL=""')
const api=uri(compile(await readFile(new URL('./api.ts',import.meta.url),'utf8')).replace(/(['"])@\/lib\/apiBase\1/,JSON.stringify(origin)).replace(/(['"])\.\/requestTimeout\1/,JSON.stringify(timeout)))
const source=compile(await readFile(new URL('./projectDeletion.ts',import.meta.url),'utf8')).replace(/(['"])@\/lib\/api\1/,JSON.stringify(api))
const {deleteConfirmedProject,hasProjectDeletionConfirmation}=await import(uri(source))
const project={id:'30000000-0000-4000-8000-000000000001',name:'Projeto sintético'}
function observeUpdates(t){const before=Object.getOwnPropertyDescriptor(globalThis,'window'),events=[];Object.defineProperty(globalThis,'window',{configurable:true,value:{dispatchEvent:event=>events.push(event.type)}});t.after(()=>{if(before)Object.defineProperty(globalThis,'window',before);else delete globalThis.window});return events}

test('project deletion cannot send a request without the exact nonempty name',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(null,{status:204})})
 for(const name of ['',project.name+' ',project.name.toLowerCase()])await assert.rejects(deleteConfirmedProject(project,name),/Digite exatamente/)
 assert.equal(hasProjectDeletionConfirmation('',''),false);assert.equal(calls,0)
})

test('confirmed deletion sends the guarded JSON DELETE and refreshes only after204',async t=>{
 const events=observeUpdates(t)
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,'/api/v1/personal/projects/'+project.id);assert.equal(options.method,'DELETE');assert.equal(options.credentials,'include');assert.equal(options.cache,'no-store');assert.equal(options.headers['X-Abelha-Client'],'web');assert.deepEqual(JSON.parse(options.body),{confirmation_name:project.name});return new Response(null,{status:204})})
 await deleteConfirmedProject(project,project.name);assert.deepEqual(events,['abelha:updated'])
})

test('a failed deletion preserves the server error and emits no success event',async t=>{
 const events=observeUpdates(t);t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Projeto não encontrado.'},{status:404}))
 await assert.rejects(deleteConfirmedProject(project,project.name),/Projeto não encontrado/);assert.deepEqual(events,[])
})
