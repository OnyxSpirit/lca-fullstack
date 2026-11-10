import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const sourceRoot = new URL('../src/modules/', import.meta.url).pathname;
const output = new URL('../../docs/RBAC-FINAL-INVENTAIRE-ENDPOINTS.md', import.meta.url).pathname;
const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
const files = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.routes.ts')) files.push(path);
  }
}

function literals(text, expression) {
  const matches = [...text.matchAll(expression)].map((match) => match[1]);
  return [...new Set(matches)].join(', ') || '—';
}

function classify(path, text, fileText, inheritedGuard = '') {
  const guardedText = `${inheritedGuard} ${text}`;
  if (/requireCentralAgencyPermission/.test(guardedText)) return ['Administration centrale', 'Migré'];
  if (/require(?:Any)?Agency(?:Business(?:OrCentral)?|Any)?Permission/.test(guardedText)) return ['Métier déjà migré', 'Migré'];
  if (/requirePermission/.test(guardedText) && (/(?:require(?:CentralAgency|Agency(?:Business)?)Permission\s+as\s+requirePermission)/.test(fileText)||/const requirePermission=require(?:Central|Agency)/.test(fileText))) return ['Métier déjà migré', 'Migré'];
  if (/requireAnyPermission/.test(guardedText)&&/requireAnyAgency(?:Business)?Permission\s+as\s+requireAnyPermission/.test(fileText))return['Métier déjà migré','Migré'];
  if (/requireAnyPermission/.test(guardedText)&&/const requireAnyPermission=requireAnyAgency(?:Business)?Permission/.test(fileText))return['Métier déjà migré','Migré'];
  if (/\bauthorize\s*\(/.test(text) && /resolveRequestAgencyContext|withCurrentAgencyAuthorization/.test(fileText)) return ['Métier déjà migré', 'Migré'];
  const middlewareNames=[...text.matchAll(/,\s*([A-Za-z_$][\w$]*)\s*,/g)].map(match=>match[1]);
  if(middlewareNames.some(name=>new RegExp(`(?:const|function)\\s+${name}[^\\n]*(?:require(?:Any)?Agency|requireCentralAgency)Permission`).test(fileText)))return['Métier déjà migré','Migré'];
  if(middlewareNames.some(name=>new RegExp(`const\\s+${name}=requireAnyPermission`).test(fileText))&&/requireAnyAgencyPermission\s+as\s+requireAnyPermission/.test(fileText))return['Métier déjà migré','Migré'];
  if (/withCurrentAgencyAuthorization/.test(fileText)&&/assertPermission|\brbac\(/.test(fileText))return['Métier sous adaptateur restrictif et fraîcheur transactionnelle','Migré'];
  if(['/auth/2fa/security-center/overview','/agencies','/users/directory'].includes(path))return['Contrôle effectif dans le service','Migré'];
  if (/^\/(login|refresh|2fa\/(verify|recovery|challenge))/.test(path)) return ['Publique ou pré-authentification', 'Hors scope métier'];
  if (/\/(me|logout)(\/|$)|devices\/me|\/2fa\/step-up$/.test(path)) return ['Fonction personnelle', 'Conservé'];
  if (/^\/rbac\//.test(path)) return ['Fonction technique', 'Socle validé'];
  return ['Métier à migrer', 'À auditer'];
}

walk(sourceRoot);
const endpoints = [];

for (const file of files.sort()) {
  const sourceText = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const moduleName = relative(sourceRoot, file).split('/')[0];
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const receiver = node.expression.expression.getText(source);
      const pathNode = node.arguments[0];
      if (methods.has(method) && /router$/i.test(receiver) && pathNode &&
          (ts.isStringLiteral(pathNode) || ts.isNoSubstitutionTemplateLiteral(pathNode))) {
        const route = pathNode.text;
        const text = node.getText(source);
        const inheritedGuard = [...sourceText.matchAll(new RegExp(`${receiver.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.use\\(\\s*['\"]([^'\"]+)['\"]\\s*,\\s*([^\\n;]+)`, 'g'))]
          .filter((match) => route.startsWith(match[1])).map((match) => match[2]).join(' ');
        const [category, status] = classify(route, text, sourceText, inheritedGuard);
        endpoints.push({
          moduleName,
          method: method.toUpperCase(),
          route,
          file: relative(join(sourceRoot, '..', '..'), file),
          line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          permissions: literals(`${inheritedGuard} ${text}`, /(?:requirePermission|requireAgencyPermission|requireAgencyBusinessPermission|requireAnyAgencyPermission|requireCentralAgencyPermission)\(\s*['"]([^'"]+)['"]/g),
          category,
          status,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

endpoints.push({moduleName:'technique',method:'GET',route:'/api/health',file:'app.ts',line:68,permissions:'—',category:'Santé technique publique',status:'Hors scope métier'});

const counts = new Map();
for (const endpoint of endpoints) counts.set(endpoint.status, (counts.get(endpoint.status) ?? 0) + 1);
const summary = [...counts.entries()].sort().map(([status, count]) => `| ${status} | ${count} |`).join('\n');
const rows = endpoints.map((endpoint, index) =>
  `| ${index + 1} | ${endpoint.method} | \`${endpoint.route.replaceAll('|', '\\|')}\` | ${endpoint.moduleName} | \`${endpoint.permissions}\` | ${endpoint.category} | ${endpoint.status} | [source](../backend-node/${endpoint.file}#L${endpoint.line}) |`
).join('\n');

writeFileSync(output, `# Inventaire final des endpoints RBAC\n\n` +
`Généré le 10 novembre 2026 depuis l'AST TypeScript des fichiers \`*.routes.ts\`. Cette référence compte les appels HTTP portés par un routeur Express ; elle exclut les appels homonymes \`.get()\` sur les maps de permissions qui avaient gonflé le comptage historique à 727.\n\n` +
`## Synthèse initiale\n\n- Déclarations HTTP réelles : **${endpoints.length}**.\n- Fichiers de routes : **${files.length}**.\n- Les statuts automatiques sont volontairement conservateurs. Seul « Migré » correspond à un garde métier/central du nouveau socle ; la validation finale exige encore l'audit du service, du SQL, des transactions, de Socket.IO et des tests.\n- Les colonnes ressource, agence réelle, propriétaire, transaction, événements et tests sont renseignées dans la matrice d'autorisations au fur et à mesure de la validation des groupes ; elles ne sont jamais déduites du seul nom de route.\n\n` +
`| Statut initial | Nombre |\n|---|---:|\n${summary}\n\n` +
`## Inventaire route par route\n\n` +
`| # | Méthode | Route | Module | Permission visible | Classe initiale | Statut | Déclaration |\n|---:|---|---|---|---|---|---|---|\n${rows}\n`);

console.log(JSON.stringify({ endpoints: endpoints.length, routeFiles: files.length, statuses: Object.fromEntries(counts) }, null, 2));
