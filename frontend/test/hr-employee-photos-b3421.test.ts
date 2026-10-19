import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const read=(file:string)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const field=read('src/modules/hr/EmployeePhotoField.tsx'),drop=read('src/modules/documents/DocumentFileDropField.tsx'),page=read('src/modules/hr/HrAdministrationPage.tsx'),record=read('src/modules/hr/EmployeeRecordModal.tsx'),hooks=read('src/api/hrHooks.ts');

test('B3421 réutilise la zone GED avec dépôt, sélection, aperçu, remplacement et retrait',()=>{assert.match(field,/DocumentFileDropField/);for(const token of['onDragOver','onDrop','type="file"','Remplacer','Retirer'])assert.match(drop,new RegExp(token));assert.match(field,/Prévisualisation/);assert.match(field,/Retirer la photographie/);assert.match(field,/JPEG, PNG ou WebP/);assert.match(field,/3 Mo maximum/)});
test('B3421 création facultative et modification pilotent les mutations photo',()=>{assert.match(page,/createEmployee[\s\S]*uploadEmployeePhoto/);assert.match(page,/updateEmployee[\s\S]*removeEmployeePhoto/);assert.match(field,/Photo de l’employé/);assert.match(hooks,/FormData/);assert.match(hooks,/\/hr\/employees\/\$\{id\}\/photo/)});
test('B3421 employé ERP reste en lecture seule et employé RH utilise la route privée',()=>{assert.match(page,/selectedEmployee\?\.user_id[\s\S]*gérée depuis son profil utilisateur/);assert.match(record,/if\(employee\.user_id\)\{setSource\(assetUrl\(employee\.avatar_path\)\)/);assert.match(record,/apiDownload\(`\/hr\/employees\/\$\{employee\.id\}\/photo`\)/)});
test('B3421 avatar de remplacement et révocation des URL de prévisualisation',()=>{assert.match(record,/UserRound/);assert.match(record,/URL\.revokeObjectURL/);assert.match(field,/URL\.revokeObjectURL/)});
