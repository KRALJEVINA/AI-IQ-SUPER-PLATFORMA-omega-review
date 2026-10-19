import { parseSpajaUltra, type ASTNode } from './parser';
import { transpile } from './transpiler';

export interface BuildArtifact {
  name: string;
  source: string;
  javascript: string;
  commandCount: number;
}

export function validateProgramName(name: string): void {
  if (!/^[\p{L}_][\p{L}\p{N}_-]{0,63}$/u.test(name)) {
    throw new Error('Nevalidno ime programa: koristite 1–64 slova, broja, _ ili -, počev od slova ili _.');
  }
}

export function compileProgram(name: string, source: string): { artifact: BuildArtifact; ast: ASTNode[] } {
  if (source.length > 16384) throw new Error('Program prelazi 16384 UTF-16 jedinice.');
  const ast = parseSpajaUltra(source);
  if (ast.length === 0 || ast.length > 256) throw new Error('Program mora imati 1–256 naredbi.');
  let waitBudget = 0;
  for (const node of ast) {
    if (['AKTIVIRAJ', 'IZGRADI', 'POKRENI'].includes(node.name)) {
      throw new Error('Program ne podržava ugnježdene AKTIVIRAJ/IZGRADI/POKRENI naredbe.');
    }
    if (node.name === 'WAIT') {
      const ms = Number(node.args.join(' '));
      if (!Number.isFinite(ms) || ms < 0) throw new Error('WAIT očekuje nenegativan konačan broj.');
      waitBudget += Math.round(ms);
      if (waitBudget > 5000) throw new Error('WAIT budžet programa prelazi 5000 ms.');
    }
  }
  return { artifact: { name, source, javascript: transpile(ast), commandCount: ast.length }, ast };
}
