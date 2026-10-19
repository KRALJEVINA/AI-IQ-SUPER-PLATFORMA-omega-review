import type { ExtrimliDokDikDakDukConsistencyHealth } from './types';

const DEFERRED_REFLECTION_FIELDS = [
  'technicalReadinessProfile', 'audioVisualKontrabasPackage', 'universityLifecycle',
  'universityRolloutPhases', 'kraljevskiEkonomskiUneverzitet', 'kraljevskiProgramskiUneverzitet',
  'inspektori', 'kraljevskiDrustveniPoredak', 'kraljevskiBastaUneverzite', 'aiPlateOffer',
  'aiIdentityFinanceGovernance', 'currentImplementationStage', 'implementationPackage',
] as const;

type Reflection = ExtrimliDokDikDakDukConsistencyHealth['developerAndCreateRepoWideReflection'];
type DeferredField = typeof DEFERRED_REFLECTION_FIELDS[number];

/** The report constructs these fields after deriving their prerequisite signals. */
export type InitialConsistencyHealth = Omit<ExtrimliDokDikDakDukConsistencyHealth, 'developerAndCreateRepoWideReflection'> & {
  developerAndCreateRepoWideReflection: Omit<Reflection, DeferredField> & Partial<Pick<Reflection, DeferredField>>;
};

/** Narrow only after every deferred, already typed field has been assigned. */
export function assertReflectionInitialized(health: InitialConsistencyHealth): asserts health is ExtrimliDokDikDakDukConsistencyHealth {
  for (const field of DEFERRED_REFLECTION_FIELDS) {
    if (health.developerAndCreateRepoWideReflection[field] === undefined) {
      throw new Error(`Incomplete Developer/Create reflection: ${field}`);
    }
  }
}
