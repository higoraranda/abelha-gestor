const headers = $json.headers || {};
const signature = headers['x-hub-signature-256'];
const event = headers['x-github-event'];
const delivery = headers['x-github-delivery'];
if (typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(signature)) throw new Error('Formato de assinatura GitHub inválido');
if (!['ping', 'push', 'pull_request', 'workflow_run'].includes(event) || typeof delivery !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(delivery)) throw new Error('Evento GitHub inválido');
const binary = $input.item.binary;
if (!binary?.data || Number(headers['content-length'] || 0) > 2097152) throw new Error('Corpo GitHub original ausente ou acima de 2 MiB');
// Sem parse/JSON.stringify: assinatura é validada criptograficamente pelo backend.
return {json: {signature, event, delivery}, binary: {data: {...binary.data, mimeType: 'application/json'}}};
