const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'.abelha-homologacao'),docs=path.join(root,'docs');
const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name))),hash=b=>createHash('sha256').update(b).digest('hex');
const main=read('integrated-031-result.json'),supplement=read('supplement-031-result.json'),provider=read('provider-contracts-031-result.json'),cross=read('cross-resource-031-result.json');
for(const r of [main,supplement,provider,cross])assert.equal(r.cleanup?.equal,true,'Limpeza não comprovada.');
assert.ok(!supplement.failure&&!provider.failure&&!cross.failure&&!supplement.closeError&&!cross.closeError);assert.ok(!main.failure||main.failure.message.startsWith('page.reload: net::ERR_INTERNET_DISCONNECTED'),'Revisar a interrupção antes de consolidar.');
for(const r of [main,supplement,provider,cross])assert.ok(r.execution?.backendSourceSha256&&r.execution?.frontendBuildSha256,'Recibo sem vínculo ao código executado.');
for(const r of [supplement,provider,cross])assert.deepEqual(r.execution,main.execution,'Candidato ou harness diferentes entre rodadas.');
assert.ok([...main.checks,...provider.checks,...cross.checks].every(c=>c.pass));
const {inventory,sourceFingerprint}=require('./map-access.cjs'),rows=inventory();assert.equal(main.sourceDigest,sourceFingerprint());
const checks=[...main.checks,...provider.checks],simulated=new Set(provider.checks.map(c=>c.endpoint));
const routes=rows.map(row=>({endpoint:row.endpoint,positive:checks.filter(c=>c.endpoint===row.endpoint&&c.verdict==='positive'),negative:checks.filter(c=>c.endpoint===row.endpoint&&c.verdict==='negative'),provider:simulated.has(row.endpoint)?'simulado':'não exigido ou contrato de entrada sintético'}));
assert.equal(routes.filter(r=>r.positive.length).length,123);assert.equal(routes.filter(r=>r.negative.length).length,121);
const times=main.timings.filter(t=>t.status<300).map(t=>t.ms).sort((a,b)=>a-b);
const evidence={version:1,date:'2026-11-25',originalCandidate:'working-tree-sha256:2bbfdc06251aa323807213fa512481899de12c2bb5a33d9bfdae07547aaf75c1',gitBase:main.candidateBase,sourceDigest:main.sourceDigest,
 environment:{runtime:'frontend/backend compilados em loopback',project:'curly-river-94350351',branch:'br-hidden-night-ace956m0',endpoint:main.endpoint,database:main.identity.database,role:main.identity.role,postgres:main.identity.version,mail:'simulado',remotePreviewDeployed:false},
 summary:{routes:123,positive:123,negative:121,positiveWithoutSimulatedOutboundProvider:119,positiveWithSimulatedProvider:4,routeAssertions:checks.length,additionalCrossResourceAssertions:cross.checks.length},
 execution:main.execution,routes,crossResource:cross.checks,crossResourceUnchanged:cross.unchanged,scenarios:[...main.scenarios,...supplement.scenarios],
 browser:{healthyConsoleErrors:0,healthyJavaScriptErrors:0,viewports:[1440,390],offlinePath:'/'},
 harnessCorrections:[{case:'Offline em /login',observed:main.failure?.message??'Interrupção histórica preservada em recibo privado anterior; rodada final completa aprovada.',disposition:'SW oferece somente a raiz / offline; gate corrigido para o caminho suportado.'},{case:'Limpeza inicial',disposition:'Convites antes dos usuários; organizações preexistentes recusadas; limitador restrito às chaves do namespace da rodada. Fingerprints iguais.'},{case:'Amostragem temporal do voo com execução concorrente',disposition:'Falha inicial de continuidade; execução isolada completa passou nos 9 grupos, sem alterar limiares ou código de animação.'}],
 latency:{scope:'backend local → Neon HML, respostas 2xx da API/Auth.js, incluindo aquecimento; sem carga/cold start Render',samples:times.length,p50Ms:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],maximumMs:times.at(-1)},
 cleanups:[main,supplement,provider,cross].map(r=>({tag:r.tag,...r.cleanup})),
 provenance:['integrated-031-result.json','supplement-031-result.json','provider-contracts-031-result.json','cross-resource-031-result.json'].map(file=>({file,sha256:hash(fs.readFileSync(path.join(dir,file)))})),
 verificationScripts:main.execution.scripts.map(row=>({file:'backend/scripts/'+row.file,sha256:row.sha256})),
};
fs.writeFileSync(path.join(docs,'ABELHA-EVIDENCIA-HML-031.json'),JSON.stringify(evidence,null,2)+'\n');
const marker='<!-- HML031-BEGIN -->',end='<!-- HML031-END -->',file=path.join(docs,'ABELHA-MATRIZ-DE-ACESSO.md');let matrix=fs.readFileSync(file,'utf8');
if(matrix.includes(marker))matrix=matrix.slice(0,matrix.indexOf(marker))+matrix.slice(matrix.indexOf(end)+end.length);
matrix=matrix.replace(/\n## Evidência local anterior \(PGlite\)\n/g,'\n');
const block=marker+'\n## Homologação integrada — 25/11/2026\n\n**123/123 rotas com positiva, 121 com negativa; 785 asserções da matriz, mais 23 verificações complementares por recurso.** Auth.js/backend/PostgreSQL HML reais; 119 positivas sem provedor de saída simulado e quatro com Overpass/Evolution simulados. Não comprova operação externa desses provedores. [Recibo HML](ABELHA-EVIDENCIA-HML-031.json) e [relatório](ABELHA-HOMOLOGACAO-INTEGRADA-031.md). Nenhuma migration repetida ou alteração em produção.\n\n403 por papel permanece identificado como restrição de papel. Isolamento por recurso usa titulares igualmente autorizados, inclusive na mesma organização, 404/ausência nas listas e checagem SQL de ausência de mutações. As negativas não são prova genérica de RLS.\n\n| Endpoint | Positivas HML | Negativas HML | Provedor de saída | Gate do contrato |\n|---|---:|---:|---|---|\n'+routes.map(r=>'| '+r.endpoint+' | '+r.positive.length+' | '+r.negative.length+' | '+r.provider+' | PASS |').join('\n')+'\n\n'+end+'\n';
matrix=matrix.replace('Produção e HML não foram usadas.','Na fixture local descrita nesta seção, produção e HML não foram usadas; a rodada real de HML está na seção própria.');
matrix=matrix.replace('# Abelha | Inventário de autorização por rota\n','# Abelha | Inventário de autorização por rota\n\n'+block+'\n## Evidência local anterior (PGlite)\n');
fs.writeFileSync(file,matrix);console.log(JSON.stringify(evidence.summary));
