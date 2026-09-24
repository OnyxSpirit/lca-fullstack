import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true });
Object.defineProperty(globalThis, 'Event', { value: dom.window.Event, configurable: true });

const { queryClient } = await import('../src/queryClient.js');
const { useAuthStore } = await import('../src/stores/authStore.js');
const { useUiStore } = await import('../src/stores/uiStore.js');
const { apiRequest } = await import('../src/services/apiClient.js');

const profile = (id: string, salary = false) => ({
  id,
  firstName: `User ${id}`,
  lastName: 'Test',
  email: `${id}@test.local`,
  agencyId: id === 'A' ? 'agency-wide' : 'agency-limited',
  agencyName: `Agency ${id}`,
  agencyCode: id,
  avatar: null,
  roles: ['EMPLOYEE'],
  role: { id: id, code: 'EMPLOYEE', isSystemSuperAdmin: false },
  permissions: salary
    ? [{ code: 'hr.salary.view', scope: 'GLOBAL' as const }]
    : [{ code: 'dashboard.view', scope: 'OWN' as const }],
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

function installSession(id: string, salary = false) {
  const p = profile(id, salary);
  localStorage.setItem('lca-access-token', `access-${id}`);
  localStorage.setItem('lca-refresh-token', `refresh-${id}`);
  useAuthStore.setState({
    currentUser: {
      id: p.id, name: `${p.firstName} ${p.lastName}`, email: p.email, role: 'EMPLOYEE', roles: ['EMPLOYEE'], primaryRole: 'EMPLOYEE',
      roleCode: 'EMPLOYEE', roleTitle: 'EMPLOYEE', avatar: '', agencyId: p.agencyId, agencyName: p.agencyName, department: '', phone: '',
      status: 'active', isSystemSuperAdmin: false, permissions: Object.fromEntries(p.permissions.map(({ code, scope }) => [code, scope])),
    },
    currentAgency: { id: p.agencyId, name: p.agencyName, code: id, city: '', address: '', phone: '', email: '', isMain: true, isActive: true },
    allUsers: [], allAgencies: [], isAuthenticated: true,
  });
}

function seedSensitiveA() {
  queryClient.setQueryData(['hr', 'employees'], [{ id: 'A_ONLY', salary: 9_999_999 }]);
  queryClient.setQueryData(['invoices'], [{ id: 'A_ONLY' }]);
  useUiStore.setState({ activeQuickActionModal: 'sale', quickActionContext: { customerId: 'A_ONLY' }, toasts: [{ id: 'a', type: 'info', title: 'A_ONLY' }] });
}

function assertAIsGone() {
  assert.equal(queryClient.getQueryData(['hr', 'employees']), undefined);
  assert.equal(queryClient.getQueryData(['invoices']), undefined);
  assert.equal(useUiStore.getState().quickActionContext, null);
  assert.deepEqual(useUiStore.getState().toasts, []);
}

test.beforeEach(() => {
  queryClient.clear();
  localStorage.clear();
  useUiStore.setState({ activeQuickActionModal: null, quickActionContext: null, toasts: [] });
  useAuthStore.setState({ currentUser: null, currentAgency: null, allUsers: [], allAgencies: [], isAuthenticated: false });
  globalThis.fetch = async () => new Response(null, { status: 204 });
});

test('T1/T2/T9/T10 logout purge toutes les données A avant une session B moins privilégiée', () => {
  installSession('A', true);
  seedSensitiveA();
  useAuthStore.getState().logout();
  assertAIsGone();
  assert.equal(useAuthStore.getState().currentUser, null);
  assert.deepEqual(useAuthStore.getState().allUsers, []);

  installSession('B');
  assertAIsGone();
  assert.equal(useAuthStore.getState().can('hr.salary.view'), false);
});

test('T3 une requête B en échec ne restaure jamais les données A', async () => {
  installSession('A', true);
  seedSensitiveA();
  useAuthStore.getState().logout();
  installSession('B');
  globalThis.fetch = async () => json({ message: 'Interdit' }, 403);
  await assert.rejects(apiRequest('/hr/employees'));
  assertAIsGone();
});

test('T4/T6 un refresh impossible termine la session et purge avant la notification', async () => {
  installSession('A', true);
  seedSensitiveA();
  let cacheWasEmptyWhenNotified = false;
  window.addEventListener('lca:session-expired', () => {
    cacheWasEmptyWhenNotified = queryClient.getQueryData(['hr', 'employees']) === undefined;
    useAuthStore.getState().logout();
  }, { once: true });
  globalThis.fetch = async (input) => String(input).endsWith('/auth/refresh') ? json({ message: 'Expiré' }, 401) : json({ message: 'Expiré' }, 401);
  await assert.rejects(apiRequest('/customers'));
  assert.equal(cacheWasEmptyWhenNotified, true);
  assertAIsGone();
  assert.equal(useAuthStore.getState().isAuthenticated, false);
});

test('T5 un refresh normal de la même identité conserve le cache', async () => {
  installSession('A');
  queryClient.setQueryData(['dashboard'], { marker: 'KEEP' });
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return json({ message: 'Expired' }, 401);
    if (calls === 2) return json({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    return json({ ok: true });
  };
  assert.deepEqual(await apiRequest('/dashboard'), { ok: true });
  assert.deepEqual(queryClient.getQueryData(['dashboard']), { marker: 'KEEP' });
});

test('T7 current-user refusé conduit à la terminaison et à la purge', async () => {
  installSession('A', true);
  seedSensitiveA();
  globalThis.fetch = async () => json({ message: 'Utilisateur désactivé' }, 403);
  await assert.rejects(useAuthStore.getState().refreshPermissions());
  useAuthStore.getState().logout();
  assertAIsGone();
});

test('T8 une reconnexion du même utilisateur repart avec un cache vide', async () => {
  installSession('A');
  seedSensitiveA();
  useAuthStore.getState().logout();
  globalThis.fetch = async () => json({ accessToken: 'fresh', refreshToken: 'fresh-r', user: profile('A') });
  assert.equal((await useAuthStore.getState().login('A@test.local', 'password')).success, true);
  assertAIsGone();
  assert.equal(useAuthStore.getState().currentUser?.id, 'A');
});

test('un changement d’agence du même utilisateur purge le contexte de scope', () => {
  installSession('A');
  seedSensitiveA();
  useAuthStore.getState().setCurrentAgency({ id: 'other-agency', name: 'Other', code: 'O', city: '', address: '', phone: '', email: '', isMain: false, isActive: true });
  assertAIsGone();
});

test('plusieurs terminaisons simultanées restent idempotentes', () => {
  installSession('A');
  seedSensitiveA();
  assert.doesNotThrow(() => {
    useAuthStore.getState().logout();
    useAuthStore.getState().logout();
    window.dispatchEvent(new Event('lca:session-expired'));
  });
  assertAIsGone();
});

test('une réponse A encore en vol est rejetée après ouverture de la session B', async () => {
  installSession('A');
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  globalThis.fetch = async () => {
    await pending;
    return json([{ id: 'A_ONLY' }]);
  };
  const request = apiRequest('/customers');
  localStorage.removeItem('lca-refresh-token');
  useAuthStore.getState().logout();
  installSession('B');
  release();
  await assert.rejects(request, /session a changé/i);
  assert.equal(queryClient.getQueryData(['customers']), undefined);
});
