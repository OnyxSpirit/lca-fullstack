#!/bin/sh
set -eu

proof_root="${QUALIFICATION_PROOF_ROOT:?QUALIFICATION_PROOF_ROOT requis}"
mkdir -p "$proof_root/journaux" "$proof_root/runtime/ged" "$proof_root/runtime/uploads" "$proof_root/resultats"

node_major="$(node -p 'process.versions.node.split(`.`)[0]')"
test "$node_major" = "22" || { echo "Node.js 22 requis, version détectée: $(node --version)" >&2; exit 2; }
test "${DB_NAME:-}" != "" || { echo "DB_NAME requis" >&2; exit 2; }
echo "$DB_NAME" | grep -Eq 'test|isolated|isolee|integrations' || { echo "Base isolée de test requise" >&2; exit 2; }

inventory_count="$(node --import tsx scripts/inventory-conditional-integrations.ts | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(String(JSON.parse(s).count)))')"
test "$inventory_count" = "107" || { echo "107 intégrations attendues, inventaire=$inventory_count" >&2; exit 3; }

export NODE_ENV=test DATABASE_ROOT="$PWD/database"
export GED_STORAGE_DIR="$proof_root/runtime/ged" UPLOAD_DIR="$proof_root/runtime/uploads"
export ERP17_PDF_DIR="$proof_root/runtime/erp17" RECETTE_PDF_DIR="$proof_root/runtime/recette-pdf"
mkdir -p "$ERP17_PDF_DIR" "$RECETTE_PDF_DIR"

export ADMIN_AGENCY_MYSQL_TEST=1 AGENCY_RBAC_MYSQL_TEST=1 AGENCY_REALTIME_MYSQL_TEST=1
if [ "${QUALIFICATION_INCLUDE_ADMIN:-0}" = "1" ]; then export SEED_ADMIN_MYSQL_TEST=1; else unset SEED_ADMIN_MYSQL_TEST; fi
export LCA_REFUND_DB_TEST=1 RUN_BILLING_MYSQL=1 BUDGET_TREASURY_MYSQL_TEST=1 CORR_ERP_02D_MYSQL=1 CORR_ERP_02E_MYSQL=1
export MIGRATION_MYSQL_TEST=1 CRM_AGENCY_MYSQL_TEST=1 CLOSURE_MYSQL_TEST=1 CUSTOMER_IDENTITY_MYSQL_TEST=1
export DELIVERY_CHECKLIST_CONCURRENCY_MYSQL_TEST=1 DELIVERY_FINANCIAL_CONCURRENCY_MYSQL_TEST=1 DELIVERY_SERVICE_CONCURRENCY_MYSQL_TEST=1
export LCA_B321_MARKS_TEST=1 LOT13_MYSQL_TEST=1 LCA_LABOR_RATES_DB_TEST=1 EVOLUTION_LCA_MYSQL_TEST=1
export FIN01_MYSQL_TEST=1 FIN02_MYSQL_TEST=1 FIN03_MYSQL_TEST=1 FIN04_MYSQL_TEST=1 FIN05_MYSQL_TEST=1 FIN06_MYSQL_TEST=1 FIN07_MYSQL_TEST=1 FIN09_MYSQL_TEST=1
export FISCAL_MYSQL_TEST=1 LCA_GED_DB_TEST=1 LCA_HR_BUDGET_AGENCY_DB_TEST=1 LCA_HR_BUDGET_CATEGORIES_DB_TEST=1
export LCA_HR_BUDGET_FUNDS_DB_TEST=1 LCA_HR_REPORTING_DB_TEST=1 LCA_HR_SALARY_SCOPE_DB_TEST=1 LCA_HR_STOCK_GOVERNANCE_DB_TEST=1
export LOT14C2_MYSQL_TEST=1 LCA_14C5B_DB_TEST=1 RUN_LOT3_MYSQL=1 RUN_LOT4_MYSQL=1
export MIGRATION_054_MYSQL_TEST=1 MIGRATION_080_MYSQL_TEST=1 MIGRATION_085_MYSQL_TEST=1 MIGRATION_093_MYSQL_TEST=1 MIGRATION_094_MYSQL_TEST=1 MIGRATION_097_MYSQL_TEST=1 MIGRATION_101_MYSQL_TEST=1
export NOTIFICATIONS_AGENCY_MYSQL_TEST=1 LCA_OPS_UX01_FINAL_DB_TEST=1 LCA_OPS_UX01_DB_TEST=1 LCA_PDF_SESSION_DB_TEST=1
export PROVIDER_LOT3_MYSQL_TEST=1 LCA_PR02_SAV03_DB_TEST=1 LCA_PR03_DB_TEST=1 LCA_PR04_DB_TEST=1 LCA_PR06_DB_TEST=1
export LCA_PREPROD_DB_TEST=1 PROVIDER_LOT2_MYSQL_TEST=1 LCA_RESERVES_TEST=1 RBAC_ROLES_MYSQL_TEST=1 LCA_REPORT_DB_TEST=1
export LCA_SALE_CANCEL_DB_TEST=1 LCA_SAV_ABANDON_DB_TEST=1 LCA_SAV_OR_UX03_DB_TEST=1 LCA_SAV0409_DB_TEST=1
export LCA_SAV1618_DB_TEST=1 LCA_SAV19_DB_TEST=1 LCA_SAV20_DB_TEST=1 LCA_SAV21_DB_TEST=1 LCA_TARGETED_DB_TEST=1
export SAV_TRANSIT_MYSQL_TEST=1 LCA_WARRANTY_VALIDATION=1 SHOWROOM_INTEGRITY_MYSQL_TEST=1
export TREASURY_CLOSURE_MYSQL_TEST=1 TREASURY_FLOW_MYSQL_TEST=1 TREASURY_MANUAL_MYSQL_TEST=1 VALID_ERP_02_MYSQL=1 VEHICLE_RETURN_MYSQL_TEST=1

export SEED_DB_HOST="$DB_HOST" SEED_DB_PORT="$DB_PORT" SEED_DB_USER="$DB_USER" SEED_DB_PASSWORD="$DB_PASSWORD" SEED_DB_NAME="$DB_NAME"
export MIGRATION_DB_HOST="$DB_HOST" MIGRATION_DB_PORT="$DB_PORT" MIGRATION_DB_USER="$DB_USER" MIGRATION_DB_PASSWORD="$DB_PASSWORD"

node --import tsx src/scripts/database-bootstrap.ts > "$proof_root/journaux/bootstrap-integrations.log" 2>&1
node --import tsx src/scripts/seed-admin.ts > "$proof_root/journaux/seed-admin-integrations.log" 2>&1

set +e
conditional_files="$(node --import tsx scripts/inventory-conditional-integrations.ts | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>console.log([...new Set(JSON.parse(s).rows.map(r=>r.file))].join("\n")))')"
# L’expansion est volontaire : l’inventaire AST ne produit que des chemins internes sans espaces.
# QUALIFICATION_ALL_BACKEND=1 reste disponible pour exécuter également tous les tests unitaires.
if [ "${QUALIFICATION_ALL_BACKEND:-0}" = "1" ]; then
  node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 'test/**/*.test.ts' > "$proof_root/journaux/integrations-sans-wss.log" 2>&1
else
  # shellcheck disable=SC2086
  node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 $conditional_files > "$proof_root/journaux/integrations-sans-wss.log" 2>&1
fi
status=$?
set -e
printf '%s\n' "$status" > "$proof_root/resultats/code-sortie-integrations-sans-wss.txt"
exit "$status"
