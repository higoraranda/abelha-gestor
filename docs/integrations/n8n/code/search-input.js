const b = $json.body || $json;
const niches = ['dentists', 'clinics', 'restaurants', 'beauty', 'gyms', 'shops'];
if (!niches.includes(b.niche)) throw new Error('Nicho inválido');
if (typeof b.city !== 'string' || !b.city.trim() || b.city.length > 100 || /[";\\\n\r\[\]{}()]/.test(b.city)) throw new Error('Cidade inválida');
const limit = b.limit === undefined ? 10 : Number(b.limit);
if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Limite deve ser inteiro entre 1 e 50');
return {json: {niche: b.niche, city: b.city.trim(), limit}};
