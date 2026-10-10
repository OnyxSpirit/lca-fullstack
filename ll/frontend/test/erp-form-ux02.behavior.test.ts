import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { numberOrUndefined } from '../src/lib/numericInput';

const source = (path: string) => fs.readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('Pièces: les cinq nouvelles saisies numériques sont vides, contextualisées et converties à la soumission', () => {
  const page = source('modules/parts/SparePartsPage.tsx');
  assert.match(page, /initialQuantity:'',minStock:'',maxStock:'',purchasePrice:'',salePrice:''/);
  for (const placeholder of [
    'Saisir la quantité initiale',
    'Saisir le stock minimum',
    'Saisir le stock maximum',
    "Saisir le prix d'achat HT",
    'Saisir le prix de vente HT',
  ]) assert.match(page, new RegExp(placeholder));
  assert.match(page, /onChange=\{e=>onChange\(e\.target\.value\)\}/);
  assert.match(page, /initialQuantity=numberOrUndefined\(form\.initialQuantity\)/);
  assert.equal(numberOrUndefined(''), undefined);
  assert.equal(numberOrUndefined('0'), 0);
  assert.equal(numberOrUndefined('2.5'), 2.5);
});

test('SAV: les nouvelles durées sont vides avec labels, unités et placeholders explicites', () => {
  const page = source('modules/service/RepairOrderDetailPage.tsx');
  assert.match(page, /estimatedHours:''/);
  assert.match(page, /quantity:'',laborRateId:''/);
  assert.match(page, /plannedHours:''/);
  for (const label of [
    'Temps estimé du diagnostic (heures)',
    'Temps estimé de main-d’œuvre (heures)',
    'Durée planifiée (heures)',
    'Heures à facturer',
  ]) assert.ok(page.includes(label));
  for (const placeholder of [
    'Saisir le temps estimé',
    'Saisir la durée planifiée',
    'Saisir les heures à facturer',
  ]) assert.match(page, new RegExp(placeholder));
  assert.match(page, /estimatedHours:requiredNumber\(diagnostic\.estimatedHours\)/);
  assert.match(page, /plannedHours:requiredNumber\(intervention\.plannedHours\)/);
  assert.match(page, /quantity:requiredNumber\(labor\.quantity\)/);
  assert.match(page, /d\.estimatedHours\} h/);
  assert.match(page, /i\.plannedHours\} h · réel \{i\.actualHours\} h/);
});

test('SAV: l’ordre des blocs et les transitions métier restent inchangés', () => {
  const page = source('modules/service/RepairOrderDetailPage.tsx');
  const blocks = [
    'Réception véhicule', 'Diagnostic', 'Préparation et chiffrage', 'Validation client',
    'Affectation atelier', 'Interventions / pointage', 'Pièces et main-d’œuvre',
    'Réel facturable', 'Contrôle qualité', 'Récapitulatif final', 'Facturation', 'Remise / clôture',
  ];
  let cursor = -1;
  for (const block of blocks) {
    const next = page.indexOf(block, cursor + 1);
    assert.ok(next > cursor, `${block} doit rester dans l’ordre métier`);
    cursor = next;
  }
  assert.match(page, /PLANIFIE:\['RECEPTIONNE'\],RECEPTIONNE:\['DIAGNOSTIC'\],DIAGNOSTIC:\['ATTENTE_VALIDATION'\]/);
});

test('Agences: création et modification partagent les labels, placeholders et contraintes', () => {
  const page = source('modules/settings/SettingsPage.tsx');
  const fields = [
    ['name', 'Nom de l’agence', 'Saisir le nom de l’agence', 'true'],
    ['code', 'Code agence', 'Saisir le code de l’agence', 'true'],
    ['address', 'Adresse', 'Saisir l’adresse de l’agence', 'false'],
    ['city', 'Ville', 'Saisir la ville', 'false'],
    ['phone', 'Téléphone', 'Saisir le numéro de téléphone', 'false'],
    ['email', 'Adresse e-mail', 'Saisir l’adresse e-mail', 'false'],
  ];
  for (const [key, label, placeholder, required] of fields) {
    assert.match(page, new RegExp(`key: '${key}', label: ['\"]${label}`));
    assert.match(page, new RegExp(`placeholder: ['\"]${placeholder}`));
    assert.match(page, new RegExp(`required: ${required}`));
  }
  assert.match(page, /agencyFields\.map\(/g);
  assert.match(page, /htmlFor=\{`create-agency-\$\{key\}`\}/);
  assert.match(page, /htmlFor=\{`edit-agency-\$\{key\}`\}/);
  assert.match(page, /value=\{String\(editedAgency\[key\] \?\? ''\)\}/);
});
