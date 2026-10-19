import type { DeployPlatformEntry } from './deploy-registry';

/**
 * Reviewed route aliases only. Logical IDs stay unique; physical projects may
 * be shared by these exact pairs. This is validation metadata, never a hook,
 * authorization, history or production-gate redirect.
 */
export const allowedDeployProjectAliases = [
  {
    platformId: 'mekartor',
    targetPlatformId: 'ai-iq-super-platforma',
    vercelProjectId: 'ai-iq-super-platforma',
  },
] as const;

/** Pure integrity check used by the registry suite; does not trigger deployment. */
export function validateDeployRegistryIdentity(entries: readonly DeployPlatformEntry[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, DeployPlatformEntry>();
  for (const entry of entries) {
    if (byId.has(entry.id)) errors.push(`Duplicate platformId: ${entry.id}`);
    byId.set(entry.id, entry);
  }

  // Validate every declared edge even if the project no longer has duplicates.
  // No dangling aliases, project drift, chains or cycles are permitted.
  for (const alias of allowedDeployProjectAliases) {
    const source = byId.get(alias.platformId);
    const target = byId.get(alias.targetPlatformId);
    if (!source || !target
      || source.vercelProjectId !== alias.vercelProjectId
      || target.vercelProjectId !== alias.vercelProjectId) {
      errors.push(`Invalid project alias: ${alias.platformId} -> ${alias.targetPlatformId}`);
    }
  }

  const projects = new Map<string, DeployPlatformEntry[]>();
  for (const entry of entries) {
    const group = projects.get(entry.vercelProjectId) ?? [];
    group.push(entry);
    projects.set(entry.vercelProjectId, group);
  }
  for (const [projectId, group] of projects) {
    if (group.length < 2) continue;
    const owners = group.filter((entry) => !allowedDeployProjectAliases.some(
      (alias) => alias.platformId === entry.id,
    ));
    if (owners.length !== 1 || group.some((entry) => entry !== owners[0]
      && !allowedDeployProjectAliases.some((alias) => alias.platformId === entry.id
        && alias.targetPlatformId === owners[0]?.id
        && alias.vercelProjectId === projectId))) {
      errors.push(`Unapproved shared vercelProjectId: ${projectId}`);
    }
  }
  return errors;
}
