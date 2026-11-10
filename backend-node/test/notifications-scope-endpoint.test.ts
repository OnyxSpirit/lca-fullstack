import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const routes=readFileSync(new URL('../src/modules/notifications/notification.routes.ts',import.meta.url),'utf8');

test('badge, compteur non lu et liste partagent identité et agence active',()=>{
  assert.match(routes,/n\.user_id=\? AND \(n\.operation_agency_id IS NULL OR n\.operation_agency_id=\?\)/);
  assert.match(routes,/get\('\/notifications\/unread-count'[\s\S]*?\[context\.userId,context\.activeAgencyId\]/);
  assert.match(routes,/patch\('\/notifications\/read-all'[\s\S]*?\[context\.userId,context\.activeAgencyId\]/);
  assert.match(routes,/if\(requested==='agency'\)\{if\(scope!=='AGENCY'\)throw new HttpError\(403/);
  assert.match(routes,/if\(value==='concession'\|\|value==='global'\)throw new HttpError\(403/);
});
