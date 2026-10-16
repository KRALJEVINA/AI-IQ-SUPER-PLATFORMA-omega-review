import catalog from './catalog.json';

export const omegaItems = catalog.items;
export const omegaTemplates = catalog.templates;
export type OmegaItem = (typeof omegaItems)[number];

export function expandOmegaItem(item: OmegaItem) {
  return {
    ...item,
    concepts: omegaTemplates.map((template, index) => ({
      id: `${item.id}-K${String(index + 1).padStart(2, '0')}`,
      group: template.group,
      title: template.title,
      proposal: `${template.description} Primena: ${item.domain} / ${item.title}; cilj: ${item.goal}.`,
    })),
  };
}

export function findOmegaItems(query: string, domain: string) {
  const q = query.trim().toLocaleLowerCase('sr');
  const templateMatch = q && omegaTemplates.some(t => `${t.group} ${t.title} ${t.description}`.toLocaleLowerCase('sr').includes(q));
  const conceptId = /^omega-(\d{4})-k(\d{2})$/.exec(q);
  const conceptItemId = conceptId && Number(conceptId[2]) >= 1 && Number(conceptId[2]) <= omegaTemplates.length
    ? `OMEGA-${conceptId[1]}` : null;
  return omegaItems.filter(item => (!domain || item.domain === domain) && (!q || templateMatch
    || `${item.id} ${item.domain} ${item.title} ${item.goal}`.toLocaleLowerCase('sr').includes(q)
    || item.id === conceptItemId));
}
