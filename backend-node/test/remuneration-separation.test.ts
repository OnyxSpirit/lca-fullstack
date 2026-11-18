import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const employee=readFileSync(new URL("../src/modules/hr/hr-remuneration.routes.ts",import.meta.url),"utf8");
const provider=readFileSync(new URL("../src/modules/hr/hr-provider-remuneration.routes.ts",import.meta.url),"utf8");

test("REM-VAL-01 la décision salarié reste soumise à la permission et au verrou",()=>{assert.match(employee,/hr\.remuneration\.validate/);assert.match(employee,/FOR UPDATE/);assert.doesNotMatch(employee,/Auto-validation interdite|DecisionSeparation/i)});
test("REM-VAL-02 la décision prestataire autorise le préparateur habilité",()=>{assert.match(provider,/hr\.provider\.remuneration\.validate/);assert.match(provider,/FOR UPDATE/);assert.doesNotMatch(provider,/validateur doit être distinct|Auto-validation interdite/i)});
test("REM-VAL-03 une décision sans permission reste refusée par le middleware",()=>{assert.match(employee,/remunerations\/:id\/validate',requirePermission\('hr\.remuneration\.validate'\)/);assert.match(provider,/provider-remunerations\/:id\/validate',requirePermission\('hr\.provider\.remuneration\.validate'\)/)});
