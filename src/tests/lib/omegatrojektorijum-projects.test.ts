import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import OmegaPage from '../../app/omegatrojektorijum/page';
import { federationEvidence, githubProjectUrl, integrationLabels, omegaProjects, projectsCheckedAt } from '../../lib/omegatrojektorijum-projects';

const expected = [
  ['AI-IQ-SUPER-PLATFORMA', 'local', 'runtime-integrated'],
  ['IO-OPENUI-AO', 'documented', 'summary-synced'],
  ['Ai-Iq-World-Bank', 'documented', 'policy-linked'],
  ['Ai-Iq-Menja-nica', 'documented', 'policy-linked'],
  ['Kompanija-SPAJA', 'documented', 'policy-linked'],
  ['SVETSKA-ORGANIZACIJA', 'documented', 'policy-linked'],
  ['SpajaNikOpenEvolution', 'planned', 'narrative-only'],
];
assert.deepEqual(omegaProjects.map(p => [p.repository.slice(8), p.status, p.relationship]), expected);
assert.equal(new Set(omegaProjects.map(p => p.repository)).size, expected.length);
assert.equal(omegaProjects.filter(p => p.status === 'functional').length, 0);
assert.match(projectsCheckedAt, /^\d{4}-\d{2}-\d{2}$/);
const federation = readFileSync('docs/MULTI-REPO-LINKS.md', 'utf8');
const html = renderToStaticMarkup(createElement(OmegaPage));
assert.match(html, /href="#povezani-projekti"/);
assert.match(html, /id="povezani-projekti" aria-labelledby="projects-title"/);
assert.match(html, /id="projects-title"/);
assert.match(html, /nijedna međurepozitorijumska funkcionalna integracija nije potvrđena/);
for (const project of omegaProjects) {
  const url = new URL(githubProjectUrl(project.repository));
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, `/${project.repository}`);
  assert.match(html, new RegExp(`href="${url.href}"`));
  assert(html.includes(integrationLabels[project.status]));
  assert(html.includes(project.purpose));
  assert(html.includes(project.boundary));
  assert(html.includes(project.nextStep));
  assert(html.includes(`href="${project.evidence}"`));
  assert(federation.includes(project.repository), `Registry mapping missing: ${project.repository}`);
  assert.equal(new URL(project.evidence).hostname, 'github.com');
}
const company = omegaProjects.find(p => p.repository === 'spaja86/Kompanija-SPAJA')!;
assert.equal(company.access, 'private');
assert.equal(company.evidence, federationEvidence);
assert.match(html, /privatan — potreban pristup/);
for (const href of ['/bank-prototype', '/login?redirect=%2Fomegatrojektorijum', '/omegatrojektorijum/studio']) {
  assert(html.includes(`href="${href}"`), `Navigation lost: ${href}`);
  assert(existsSync(`src/app${href.split('?')[0]}/page.tsx`));
}
assert.match(html, /Katalog proširenja/);
assert.match(html, /1.325 stavki/);
assert.match(html, /Prisustvo u katalogu ne znači da je funkcija izrađena/);
assert(!html.includes('api.github.com'), 'No runtime GitHub API dependency');
console.log('PASS: 7 verified repo mappings, conservative statuses, public evidence, rendered project navigation and catalog/workspace regression');
