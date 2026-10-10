import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('les types GED métier complètent les types manuels',()=>{const policy=source('src/modules/documents/documentPolicy.ts');for(const type of ['Devis','Bon de commande','Facture client','Reçu de paiement','Facture fournisseur','PV livraison'])assert.match(policy,new RegExp(type))});
test('le contrat frontend expose la provenance documentaire',()=>{const types=source('src/types/documents.ts');assert.match(types,/origin:'manual'\|'generated'/);assert.match(types,/sourceKey:string\|null/)});
