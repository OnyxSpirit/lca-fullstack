import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { env } from '../src/config/env.js';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/database.js';
import { RbacTestSessionFixture } from './support/rbac-test-session.js';

const fixture = new RbacTestSessionFixture();
fixture.addAgency({ id: '11', concessionId: '1' });
fixture.addAgency({ id: '12', concessionId: '1' });
fixture.addAgency({ id: '21', concessionId: '2' });
fixture.addResource({ id: '1', agencyId: '11', ownerId: '101' });
fixture.addResource({ id: '2', agencyId: '12', ownerId: '102' });
fixture.addResource({ id: '3', agencyId: '21', ownerId: '201' });

let restorePool: () => void;
before(() => { restorePool = fixture.installPoolMock(pool); });
after(() => restorePool());
const api = supertest(createApp());
const get = (token: string, id = '1') => api.get(`/api/showroom/${id}`).set('Authorization', `Bearer ${token}`);

test('session valide + permission atteint la route, permission absente est un 403 RBAC et non un 401', async () => {
  const allowed = fixture.createRbacTestSession({ user: { id: '101', agencyId: '11' }, roleCode: 'ROLE_SHOWROOM_AGENCY', permissions: [{ code: 'showroom.view', scope: 'AGENCY' }] });
  assert.equal((await get(allowed.accessToken)).status, 200);

  const denied = fixture.createRbacTestSession({ user: { id: '102', agencyId: '11' }, roleCode: 'ROLE_SHOWROOM_NONE' });
  const response = await get(denied.accessToken);
  assert.equal(response.status, 403);
  assert.match(response.body.message, /showroom\.view/);
});

test('AGENCY autorise la ressource de la même agence et masque une agence sœur', async () => {
  const session = fixture.createRbacTestSession({ user: { id: '103', agencyId: '11' }, roleCode: 'ROLE_SHOWROOM_AGENCY_2', permissions: [{ code: 'showroom.view', scope: 'AGENCY' }] });
  assert.equal((await get(session.accessToken, '1')).status, 200);
  assert.equal((await get(session.accessToken, '2')).status, 404);
});

test('JWT sans sid, sid inconnu et session révoquée restent refusés par AUTH', async () => {
  const user = { id: '104', agencyId: '11' };
  assert.equal((await get(fixture.createTokenWithoutSid(user))).status, 401);
  const unknown = jwt.sign({ sub: user.id, email: '104@rbac.test', roles: [], agencyId: '11', sid: 'unknown-session' }, env.jwt.accessSecret, { algorithm: 'HS256', expiresIn: '5m' });
  assert.equal((await get(unknown)).status, 401);
  const revoked = fixture.createRbacTestSession({ user, permissions: [{ code: 'showroom.view', scope: 'AGENCY' }] });
  fixture.revoke(revoked.sid);
  assert.equal((await get(revoked.accessToken)).status, 401);
});
