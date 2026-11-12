if (!Number.isInteger($json.statusCode) || $json.statusCode < 200 || $json.statusCode >= 300 || !$json.body || typeof $json.body !== 'object' || Array.isArray($json.body)) throw new Error('API não retornou um objeto de cotação válido');
const quote = $json.body;
const monitor = $('Preparar consultas autorizadas').item.json;
if (quote.currency !== 'BRL' || typeof quote.price !== 'number' || !Number.isFinite(quote.price) || quote.price <= 0 || quote.price > 999999999.99 || Math.abs(quote.price * 100 - Math.round(quote.price * 100)) > 0.00001) throw new Error('Cotação deve conter preço real em BRL com duas casas decimais');
if (quote.product_url !== monitor.product_url) throw new Error('Cotação de outro produto/variação');
if (typeof quote.event_id !== 'string' || !quote.event_id.trim() || quote.event_id.length > 160 || typeof quote.store !== 'string' || !quote.store.trim() || quote.store.length > 240) throw new Error('Cotação sem identificador estável ou loja');
const observed = Date.parse(quote.observed_at);
if (typeof quote.observed_at !== 'string' || !Number.isFinite(observed) || observed > Date.now() + 60000 || observed < Date.now() - 7 * 86400000) throw new Error('Data real da cotação ausente ou inválida');
return {json: {watch_id: monitor.watch_id, event_id: quote.event_id.trim(), store: quote.store.trim(), product_url: quote.product_url, price: quote.price, observed_at: quote.observed_at}};
