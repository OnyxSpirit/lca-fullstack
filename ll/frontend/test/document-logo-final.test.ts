import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {canManageDocumentLogo} from '../src/modules/settings/documentLogoAccess.js';

const page=readFileSync(new URL('../src/modules/settings/SettingsPage.tsx',import.meta.url),'utf8');

test('DOCUMENT-LOGO-RBAC seuls CONCESSION et GLOBAL peuvent modifier',()=>{
  assert.equal(canManageDocumentLogo('OWN'),false);
  assert.equal(canManageDocumentLogo('AGENCY'),false);
  assert.equal(canManageDocumentLogo('CONCESSION'),true);
  assert.equal(canManageDocumentLogo('GLOBAL'),true);
  assert.equal(canManageDocumentLogo(null),false);
  assert.equal(canManageDocumentLogo(undefined),false);
});

test('DOCUMENT-LOGO-UX rend import, remplacement, contraintes et suppression explicites',()=>{
  assert.match(page,/Importer un logo/);
  assert.match(page,/Remplacer le logo actuel/);
  assert.match(page,/Sélectionner une image/);
  assert.match(page,/PNG ou JPEG, 2 Mio maximum/);
  assert.match(page,/accept="image\/png,image\/jpeg"/);
  assert.match(page,/2\*1024\*1024/);
  assert.match(page,/Supprimer le logo/);
  assert.match(page,/object-contain/);
  assert.match(page,/canEditDocumentLogo&&/);
  assert.doesNotMatch(page,/isSystemSuperAdmin|SUPER_ADMIN/);
});
