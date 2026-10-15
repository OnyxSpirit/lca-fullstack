import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const sourceRoot = join(process.cwd(), 'src');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(?:js|jsx|ts|tsx)$/.test(entry) ? [path] : [];
  });
}

test('le frontend ne contient plus de dialogue natif bloquant', () => {
  const violations = sourceFiles(sourceRoot).flatMap((path) => {
    const source = readFileSync(path, 'utf8');
    return [...source.matchAll(/\b(?:window|globalThis)\s*\.\s*(?:alert|confirm|prompt)\s*\(/g)]
      .map((match) => `${path.slice(sourceRoot.length + 1)}:${source.slice(0, match.index).split('\n').length}`);
  });
  assert.deepEqual(violations, []);
});

test('le gestionnaire de dialogues métier est monté et conserve les trois comportements', () => {
  const app = readFileSync(join(sourceRoot, 'App.tsx'), 'utf8');
  const dialog = readFileSync(join(sourceRoot, 'components/ui/BusinessDialog.tsx'), 'utf8');
  assert.match(app, /<BusinessDialogHost\s*\/>/);
  assert.match(dialog, /export const confirmAction/);
  assert.match(dialog, /export const promptAction/);
  assert.match(dialog, /export const choiceAction/);
  assert.match(dialog, /data-autofocus/);
  assert.match(dialog, /inputType\?\?"text"/);
});

test('les mots de passe ne sont jamais rendus dans un champ texte standard', () => {
  const header = readFileSync(join(sourceRoot, 'components/layout/Header.tsx'), 'utf8');
  assert.equal((header.match(/inputType:'password'/g) ?? []).length, 2);
});
