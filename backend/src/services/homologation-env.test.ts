import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtempSync,writeFileSync,rmSync,rmdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'

test('homologation runner drops ambient secrets and preloads dotenv isolation',()=>{
  const probe=`const child=require('node:child_process');child.spawnSync=(_node,args,options)=>{console.log(JSON.stringify({args,hasAmbient:'SYNTHETIC_PRODUCTION_SECRET' in options.env,database:options.env.DATABASE_URL}));return{status:0}};process.argv[2]=require.resolve('./package.json');require('./scripts/test-homologation.cjs')`
  const child=spawnSync(process.execPath,['-e',probe],{encoding:'utf8',windowsHide:true,env:{...process.env,SYNTHETIC_PRODUCTION_SECRET:'must-not-reach-test'}})
  assert.equal(child.status,0,child.stderr)
  const result=JSON.parse(child.stdout.trim())
  assert.equal(result.hasAmbient,false)
  assert.equal(result.args[0],'--require')
  assert.ok(result.args[1].endsWith('isolated-test-env.cjs'))
  assert.match(result.database,/127\.0\.0\.1:1\/never_connect$/)
})

test('homologation preload prevents dotenv from reading even an explicitly selected secret file',()=>{
  const directory=mkdtempSync(join(tmpdir(),'abelha-env-test-'))
  try {
    const file=join(directory,'.env');writeFileSync(file,'SYNTHETIC_DOTENV_SECRET=must-not-load\n')
    const probe="require('dotenv').config({path:process.argv[1]});if(process.env.SYNTHETIC_DOTENV_SECRET)process.exit(5)"
    const child=spawnSync(process.execPath,['--require',resolve('scripts/isolated-test-env.cjs'),'-e',probe,file],{encoding:'utf8',windowsHide:true,env:{...process.env,SYNTHETIC_DOTENV_SECRET:''}})
    assert.equal(child.status,0,child.stderr)
  }finally{rmSync(join(directory,'.env'),{force:true});rmdirSync(directory)}
})
