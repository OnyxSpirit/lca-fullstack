import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source=readFileSync(new URL("../src/modules/hr/hr.routes.ts",import.meta.url),"utf8");
test("DEP-05/07 liste paginée et filtrée",()=>{assert.match(source,/hrRouter\.get\("\/hr\/expenses"/);for(const token of ["budgetId","status","from","to","search","pageSize","offset"])assert.ok(source.includes(token),token)});
test("DEP-08 liste protégée et scoped",()=>{assert.match(source,/\/hr\/expenses",requirePermission\("hr\.expense\.view"\)/);assert.match(source,/budgetPredicate\(r,scope\)/)});
