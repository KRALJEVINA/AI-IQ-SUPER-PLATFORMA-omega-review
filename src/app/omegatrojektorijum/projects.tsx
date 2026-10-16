import { federationEvidence, githubProjectUrl, integrationLabels, omegaProjects, projectsCheckedAt } from '@/lib/omegatrojektorijum-projects';

export default function OmegaProjects() {
  return (
    <section id="povezani-projekti" aria-labelledby="projects-title" className="space-y-5">
      <h2 id="projects-title" className="text-2xl font-bold">Stvarni GitHub projekti</h2>
      <p className="text-slate-300">Provereno <time dateTime={projectsCheckedAt}>{projectsCheckedAt}</time>. Ovo je pregled izvornog koda i dokumentacije, bez provere produkcione dostupnosti. GitHub veza nije dokaz aktivnog servisa.</p>
      <p className="text-slate-300">Funkcionalna integracija zahteva proverljiv ugovor i uspešan test razmene. Trenutno nijedna međurepozitorijumska funkcionalna integracija nije potvrđena. Dokumentacione veze opisuju koordinaciju, a budući planovi čekaju implementaciju i proveru.</p>
      <a className="inline-block text-cyan-300 underline focus-visible:outline-2" href={federationEvidence}>Izvor: registar povezivanja SPAJA ekosistema</a>
      <ul className="grid gap-4 sm:grid-cols-2">
        {omegaProjects.map(project => (
          <li key={project.repository} className="min-w-0 space-y-3 rounded-xl border border-slate-600 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <p className="text-sm text-cyan-200">{integrationLabels[project.status]} · {project.relationship}</p>
            <p>{project.purpose}</p>
            <p className="text-sm text-slate-300">{project.boundary}</p>
            <p className="text-sm text-slate-300">Sledeći korak: {project.nextStep}</p>
            <a className="block break-all text-cyan-300 underline focus-visible:outline-2" href={githubProjectUrl(project.repository)}>{project.repository}{project.access === 'private' ? ' (privatan — potreban pristup)' : ''}</a>
            <a className="inline-block text-cyan-300 underline focus-visible:outline-2" href={project.evidence}>Dokaz i dokumentacija: {project.name}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
