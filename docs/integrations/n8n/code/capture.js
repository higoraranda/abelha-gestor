// Classificação determinística; não é uma classificação por IA.
const b = $json.body || $json;
function text(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error('Entrada inválida: ' + label);
  return value.trim();
}
const event_id = text(b.event_id || b.message_id, 160, 'event_id estável obrigatório');
const name = text(b.name, 240, 'name');
const summary = text(b.summary || b.message || b.text, 10000, 'summary/message/text').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const source = b.source || 'form';
if (!['email', 'form'].includes(source)) throw new Error('Fonte inválida: use email ou form');
const detectedEmail = summary.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
const email = b.email || detectedEmail;
if (typeof email !== 'string' || email.length > 255 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Email inválido');
const detectedPhone = summary.match(/(?:whatsapp|telefone|celular|tel)\s*[:=-]?\s*(\+?\d[\d\s().-]{7,24}\d)/i)?.[1] || '';
const rawPhone = b.phone || detectedPhone;
if (typeof rawPhone !== 'string' || rawPhone.length > 100) throw new Error('Telefone inválido');
const phone = rawPhone.replace(/\D/g, '');
if (phone && (phone.length < 8 || phone.length > 15)) throw new Error('Telefone inválido');
const normalized = summary.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const rules = [['landing', 'Landing page'], ['site institucional', 'Site institucional'], ['site', 'Site'], ['crm', 'CRM'], ['automacao', 'Automação'], ['whatsapp', 'WhatsApp']];
const classification = 'Regra local: ' + (rules.find(([word]) => normalized.includes(word))?.[1] || 'Revisar');
const evidence_reference = text(b.evidence_reference || source + '/' + event_id, 500, 'evidence_reference');
return {json: {event_id, source, name, summary, phone, email: email.toLowerCase(), classification, evidence_reference}};
