if (!Array.isArray($json.items) || $json.items.length > 50) throw new Error('Resposta OpenStreetMap inválida');
return $json.items.map((lead, index) => {
  if (lead.source !== 'OpenStreetMap' || !/^(node|way|relation)\/\d+$/.test(lead.source_key || '') || typeof lead.name !== 'string' || !lead.name.trim() || typeof lead.niche !== 'string' || typeof lead.queried_at !== 'string') throw new Error('Referência OpenStreetMap inválida');
  return {json: {source_key: lead.source_key, name: lead.name, niche: lead.niche, address: lead.address || '', phone: lead.phone || '', website: lead.website || null, queried_at: lead.queried_at}, pairedItem: {item: 0}};
});
