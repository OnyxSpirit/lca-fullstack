const base = process.env.RECETTE_API_URL ?? 'http://127.0.0.1:3004/api';
const shared = process.env.RECETTE_USER_PASSWORD;
if (!shared) throw new Error('RECETTE_USER_PASSWORD absent');

const profiles = [
  ['DIRECTION', 'recette.direction@lca-test.cg'],
  ['RESPONSABLE_COMMERCIAL', 'recette.responsable_commercial@lca-test.cg'],
  ['COMMERCIAL', 'recette.commercial@lca-test.cg'],
  ['RECEPTIONNISTE', 'recette.receptionniste@lca-test.cg'],
  ['COMPTABLE', 'recette.comptable@lca-test.cg'],
  ['RESPONSABLE_LIVRAISON', 'recette.responsable_livraison@lca-test.cg'],
  ['CONSEILLER_SAV', 'recette.conseiller_sav@lca-test.cg'],
  ['RESPONSABLE_SAV', 'recette.responsable_sav@lca-test.cg'],
  ['CHEF_ATELIER', 'recette.chef_atelier@lca-test.cg'],
  ['TECHNICIEN', 'recette.technicien@lca-test.cg'],
  ['MAGASINIER', 'recette.magasinier@lca-test.cg'],
  ['RESPONSABLE_PIECES', 'recette.responsable_pieces@lca-test.cg'],
];

async function request(path, token, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  let data = null;
  try { data = await response.json(); } catch {}
  return { status: response.status, data };
}

const unauthenticated = await request('/parts?agencyId=1');
console.log(JSON.stringify({ scenario: 'API-UNAUTH-PARTS', status: unauthenticated.status }));

for (const [profile, email] of profiles) {
  const login = await request('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password: shared }),
  });
  if (login.status !== 200 || !login.data?.accessToken) {
    console.log(JSON.stringify({ profile, email, login: login.status, error: 'login-failed' }));
    continue;
  }
  const token = login.data.accessToken;
  const me = await request('/auth/me', token);
  const agencyId = String(me.data?.user?.agencyId ?? me.data?.agencyId ?? 1);
  const permissions = me.data?.permissions ?? me.data?.user?.permissions ?? [];
  const codes = Array.isArray(permissions)
    ? permissions.map((entry) => typeof entry === 'string' ? entry : entry.code).filter(Boolean)
    : Object.keys(permissions ?? {});
  const checks = {};
  for (const [name, path] of [
    ['parts', `/parts?agencyId=${agencyId}`],
    ['locations', `/part-locations?targetAgency=${agencyId}`],
    ['orders', `/purchase-orders?agencyId=${agencyId}&page=1&pageSize=1`],
    ['suppliers', '/suppliers?search='],
    ['users', '/users'],
  ]) checks[name] = (await request(path, token)).status;

  // Invalid identifiers guarantee that an authorized request cannot mutate data.
  checks.reserveInvalid = (await request('/repair-orders/999999/parts/reserve', token, {
    method: 'POST', body: JSON.stringify({ partId: '999999', partStockId: '999999', quantity: 1 }),
  })).status;
  checks.consumeInvalid = (await request('/repair-orders/999999/parts/reservations/999999', token, {
    method: 'PATCH', body: JSON.stringify({ status: 'consumed', quantity: 1 }),
  })).status;
  console.log(JSON.stringify({ profile, email, login: login.status, me: me.status, agencyId, permissionCount: codes.length, partsPermissions: codes.filter((code) => code.startsWith('parts.')).sort(), checks }));
}
