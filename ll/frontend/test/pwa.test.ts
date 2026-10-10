import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('le manifest décrit une application LCA standalone avec ses deux icônes', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8')) as {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: string;
    icons: Array<{ sizes: string }>;
  };

  assert.equal(manifest.name, 'LCA ERP');
  assert.equal(manifest.short_name, 'LCA');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.icons.map(({ sizes }) => sizes), ['192x192', '512x512']);
});

test('le service worker ne met en cache et n’intercepte aucune requête métier', () => {
  const serviceWorker = readFileSync(new URL('../public/service-worker.js', import.meta.url), 'utf8');

  assert.doesNotMatch(serviceWorker, /addEventListener\(['"]fetch/);
  assert.doesNotMatch(serviceWorker, /caches\./);
  assert.match(serviceWorker, /addEventListener\('install'/);
  assert.match(serviceWorker, /addEventListener\('activate'/);
});

test('le bouton repose sur le prompt natif et reste conditionnel', () => {
  const hook = readFileSync(new URL('../src/hooks/usePwaInstall.ts', import.meta.url), 'utf8');
  const header = readFileSync(new URL('../src/components/layout/Header.tsx', import.meta.url), 'utf8');

  assert.match(hook, /beforeinstallprompt/);
  assert.match(hook, /appinstalled/);
  assert.match(hook, /display-mode: standalone/);
  assert.match(hook, /deferredPrompt\.prompt\(\)/);
  assert.match(header, /{canInstall && \(/);
  assert.match(header, /Installer l’application LCA/);
});
