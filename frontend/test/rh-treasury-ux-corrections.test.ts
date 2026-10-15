import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read=(p:string)=>readFileSync(new URL(`../${p}`,import.meta.url),"utf8");

test("DEP-01/02/05 dépenses automatiques et paginées",()=>{const page=read("src/modules/hr/HrAdministrationPage.tsx");assert.match(page,/useAllExpensesQuery/);assert.match(page,/Liste accessible sans sélectionner/);for(const size of [10,25,50])assert.match(page,new RegExp(String(size)));assert.match(page,/Précédent/);assert.match(page,/Suivant/)});
test("REM-04 agences chargées depuis une source territoriale stable",()=>{const page=read("src/modules/hr/RemunerationsAdministration.tsx");assert.match(page,/remunerations\/agencies\/options/);assert.match(page,/agencyOptions\.data/);assert.doesNotMatch(page,/new Map\(\(rows\.data/)});
test("UI-01 les mutations attendent les invalidations RH et Treasury",()=>{const page=read("src/modules/hr/RemunerationsAdministration.tsx"),hooks=read("src/api/hrHooks.ts");assert.match(page,/onSuccess:\(\)=>Promise\.all/);assert.match(page,/invalidateQueries\(\{queryKey:\['hr'\]\}\)/);assert.match(page,/invalidateQueries\(\{queryKey:\['treasury'\]\}\)/);assert.doesNotMatch(hooks,/void qc\.invalidateQueries\(\{ queryKey: keys\.root \}\)/)});
