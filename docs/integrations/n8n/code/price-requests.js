// CONFIGURAR no nó antes do teste. Nenhuma URL recebida escolhe o host da API.
const PROVIDER_URL = 'https://configure-authorized-price-api.invalid/quote';
const PRODUCT_HOSTS = [];
function host(value) {
  if (typeof value !== 'string' || /[\\\s]/.test(value)) throw new Error('URL HTTPS inválida');
  const match = value.match(/^https:\/\/([a-z0-9.-]+)(?:\/[^#]*)?$/i);
  if (!match) throw new Error('URL HTTPS inválida');
  return match[1].toLowerCase();
}
if (host(PROVIDER_URL).endsWith('.invalid') || !PRODUCT_HOSTS.length) throw new Error('CONFIGURAR API autorizada e PRODUCT_HOSTS antes de executar');
return $input.all().flatMap((item, index) => {
  const watch = item.json;
  if (typeof watch.id !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(watch.id)) throw new Error('Monitor inválido');
  // Desejos sem link continuam aguardando configuração; não inventar consulta.
  if (watch.product_url === null || watch.product_url === '') return [];
  if (!PRODUCT_HOSTS.includes(host(watch.product_url))) throw new Error('Produto fora da allowlist autorizada');
  return [{json: {watch_id: watch.id, product_url: watch.product_url, provider_url: PROVIDER_URL}, pairedItem: {item: index}}];
});
