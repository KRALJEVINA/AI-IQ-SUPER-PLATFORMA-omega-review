import { createRuntime } from '../spaja-ultra-core/runtime';
import { parseSuocVrhCall } from '../spaja-ultra-core/vrh';
import type { PilotStore } from './store';

/** Only allowlisted numerical VRH operations. No shell, arbitrary JS, network or file operations. */
export async function tick(store: PilotStore): Promise<boolean> {
  const claimed = store.claim();
  if (!claimed) return false;
  const { run, step } = claimed;
  const runtime = createRuntime();
  let error: string | undefined;
  try {
    const request = structuredClone(step.request);
    if (step.startFrom) request.input.start = run.steps.find(item => item.id === step.startFrom)!.result!.output;
    const argument = JSON.stringify(request);
    parseSuocVrhCall(argument); // Revalidate after binding dependency output.
    await runtime.aktiviraj('jezgro', {});
    await runtime.vrh(argument, {});
  } catch (e) { error = e instanceof Error ? e.message : 'Izvršavanje nije uspelo.'; }
  store.finish(run.id, step.id, runtime.getLastVrhResult(), error);
  return true;
}
