const b = $json.body || $json;
if (typeof b.project_id !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(b.project_id)) throw new Error('project_id deve ser UUID');
if (!b.report || typeof b.report !== 'object' || Array.isArray(b.report) || b.report.schema_version !== 1) throw new Error('Relatório v1 obrigatório');
// O backend verifica SHA, evidências do repositório e critérios; nunca conclui o marco.
return {json: {project_id: b.project_id.toLowerCase(), report: b.report}};
