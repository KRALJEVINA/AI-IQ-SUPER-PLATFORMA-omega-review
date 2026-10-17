// Only proposes reviews. Never executes branch code, merges, pushes, or deletes refs.
async function proposeSync({ github, context, core, direction }) {
  if (context.ref !== 'refs/heads/main' || !['schedule', 'workflow_dispatch'].includes(context.eventName)) {
    throw new Error('Omega sync requires a trusted main schedule/manual invocation');
  }
  if (!['into-main', 'from-main'].includes(direction)) throw new Error('Invalid sync direction');
  const { owner, repo } = context.repo;
  const skip = new Set(['main', 'master', 'develop', 'staging', 'production']);
  const branches = await github.paginate(github.rest.repos.listBranches, { owner, repo, per_page: 100 });
  core.summary.addHeading(`Omega review proposals: ${direction}`);
  for (const branch of branches) {
    if (skip.has(branch.name)) continue;
    if (direction === 'from-main' && !branch.name.startsWith('copilot/')) continue;
    const base = direction === 'into-main' ? 'main' : branch.name;
    const head = direction === 'into-main' ? branch.name : 'main';
    const comparison = await github.rest.repos.compareCommits({ owner, repo, base, head });
    if (comparison.data.ahead_by === 0) continue;
    const existing = await github.rest.pulls.list({ owner, repo, state: 'open', base, head: `${owner}:${head}`, per_page: 1 });
    let pr = existing.data[0];
    if (!pr) {
      const result = await github.rest.pulls.create({
        owner, repo, base, head, draft: true,
        title: `Omega sync: ${head} → ${base}`.slice(0, 240),
        body: 'Synchronization proposal only. A maintainer must inspect the diff, mark ready for review, obtain human approval, and verify all required CI checks on the current revision before manually merging. No automatic merge or branch deletion. See docs/OMEGA-SYNC-SAFETY.md.',
      });
      pr = result.data;
    }
    core.summary.addRaw(`\n- Review: ${pr.html_url}\n`);
  }
  core.summary.addRaw('\nNo branches were modified. Human review and successful required checks are prerequisites for manual merge.\n');
  await core.summary.write();
}
module.exports = { proposeSync };
