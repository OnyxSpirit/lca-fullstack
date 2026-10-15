import assert from "node:assert/strict";
import test from "node:test";
import { assertRemunerationDecisionSeparation } from "../src/modules/hr/remuneration-separation.js";

test("REM-VAL-01 utilisateur distinct",()=>assert.doesNotThrow(()=>assertRemunerationDecisionSeparation("2","1","1")));
test("REM-VAL-02 préparateur refusé",()=>assert.throws(()=>assertRemunerationDecisionSeparation("1","1","2"),/Auto-validation interdite/));
test("REM-VAL-02 soumetteur refusé",()=>assert.throws(()=>assertRemunerationDecisionSeparation("2","1","2"),/Auto-validation interdite/));
