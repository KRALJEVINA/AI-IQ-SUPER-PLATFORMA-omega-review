import { parseSpajaUltra, type ASTNode } from './parser';
import { resolveRuntimeCall, transpile } from './transpiler';
import type { RuntimeContext, SpajaRuntime } from './runtime';

/** Executes typed calls only; generated JavaScript is a review artifact, never eval'd. */
export async function executeAst(ast: ASTNode[], runtime: SpajaRuntime, ctx: RuntimeContext): Promise<void> {
  for (const node of ast) {
    const { runtimeMethod, runtimeArg } = resolveRuntimeCall(node.name, node.args.join(' '));
    await runtime[runtimeMethod](runtimeArg, ctx);
  }
}

export async function executeSpajaUltra(source: string, runtime: SpajaRuntime, ctx: RuntimeContext): Promise<ASTNode[]> {
  const ast = parseSpajaUltra(source);
  transpile(ast); // Validate the complete command mapping before any execution.
  await executeAst(ast, runtime, ctx);
  return ast;
}
