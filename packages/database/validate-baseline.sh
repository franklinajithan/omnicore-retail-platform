#!/bin/bash
# Validate baseline migration against schema.prisma
# This script compares the baseline migration with the Prisma schema

set -e

echo "=== Baseline Migration Validation ==="
echo ""

cd "$(dirname "$0")"

BASELINE="prisma/migrations/00000000000000_baseline/migration.sql"
SCHEMA="prisma/schema.prisma"

if [ ! -f "$BASELINE" ]; then
  echo "ERROR: Baseline migration not found at $BASELINE"
  exit 1
fi

if [ ! -f "$SCHEMA" ]; then
  echo "ERROR: Schema not found at $SCHEMA"
  exit 1
fi

echo "1. Checking schema models..."
MODELS=$(grep "^model " "$SCHEMA" | awk '{print $2}' | sort)
MODEL_COUNT=$(echo "$MODELS" | wc -l)
echo "   Found $MODEL_COUNT models in schema.prisma"

echo ""
echo "2. Checking baseline tables..."
TABLES=$(grep "^CREATE TABLE" "$BASELINE" | sed 's/CREATE TABLE "//' | sed 's/".*//' | sort)
TABLE_COUNT=$(echo "$TABLES" | wc -l)
echo "   Found $TABLE_COUNT tables in baseline migration"

echo ""
echo "3. Comparing models to tables..."
if [ "$MODEL_COUNT" -eq "$TABLE_COUNT" ]; then
  echo "   ✓ Count matches: $MODEL_COUNT models = $TABLE_COUNT tables"
else
  echo "   ✗ Count mismatch: $MODEL_COUNT models ≠ $TABLE_COUNT tables"
  exit 1
fi

echo ""
echo "4. Checking each model has corresponding table..."
MISSING=""
for model in $MODELS; do
  if ! echo "$TABLES" | grep -q "^$model$"; then
    echo "   ✗ Model '$model' missing from baseline"
    MISSING="$MISSING $model"
  fi
done

if [ -z "$MISSING" ]; then
  echo "   ✓ All models present in baseline"
else
  echo "   ✗ Missing models:$MISSING"
  exit 1
fi

echo ""
echo "5. Checking enums..."
SCHEMA_ENUMS=$(grep "^enum " "$SCHEMA" | awk '{print $2}' | sort)
ENUM_COUNT=$(echo "$SCHEMA_ENUMS" | wc -l)
BASELINE_ENUMS=$(grep "^CREATE TYPE" "$BASELINE" | sed 's/CREATE TYPE "//' | sed 's/".*//' | sort)
BASELINE_ENUM_COUNT=$(echo "$BASELINE_ENUMS" | wc -l)

echo "   Schema enums: $ENUM_COUNT"
echo "   Baseline enums: $BASELINE_ENUM_COUNT"

if [ "$ENUM_COUNT" -eq "$BASELINE_ENUM_COUNT" ]; then
  echo "   ✓ Enum count matches"
else
  echo "   ✗ Enum count mismatch"
  exit 1
fi

echo ""
echo "6. Checking critical fields in Product table..."
if grep -q '"version" INTEGER NOT NULL DEFAULT 1' "$BASELINE"; then
  echo "   ✓ Product.version field present"
else
  echo "   ✗ Product.version field missing"
  exit 1
fi

if grep -q '"imageUrl" TEXT' "$BASELINE"; then
  echo "   ✓ Product.imageUrl field present"
else
  echo "   ✗ Product.imageUrl field missing"
  exit 1
fi

echo ""
echo "7. Checking ProductPrice table exists..."
if grep -q 'CREATE TABLE "ProductPrice"' "$BASELINE"; then
  echo "   ✓ ProductPrice table present"
else
  echo "   ✗ ProductPrice table missing"
  exit 1
fi

echo ""
echo "8. Checking ProductAlias table exists..."
if grep -q 'CREATE TABLE "ProductAlias"' "$BASELINE"; then
  echo "   ✓ ProductAlias table present"
else
  echo "   ✗ ProductAlias table missing"
  exit 1
fi

echo ""
echo "9. Checking ProductAudit table exists..."
if grep -q 'CREATE TABLE "ProductAudit"' "$BASELINE"; then
  echo "   ✓ ProductAudit table present"
else
  echo "   ✗ ProductAudit table missing"
  exit 1
fi

echo ""
echo "10. Checking foreign key constraints..."
FK_COUNT=$(grep -c "ADD CONSTRAINT.*FOREIGN KEY" "$BASELINE" || true)
echo "   Found $FK_COUNT foreign key constraints"
if [ "$FK_COUNT" -gt 30 ]; then
  echo "   ✓ Reasonable number of foreign keys"
else
  echo "   ⚠ Warning: Only $FK_COUNT foreign keys (expected more)"
fi

echo ""
echo "11. Checking indexes..."
INDEX_COUNT=$(grep -c "^CREATE INDEX" "$BASELINE" || true)
echo "   Found $INDEX_COUNT indexes"
if [ "$INDEX_COUNT" -gt 5 ]; then
  echo "   ✓ Indexes present"
else
  echo "   ⚠ Warning: Only $INDEX_COUNT indexes"
fi

echo ""
echo "12. Checking UUID extension..."
if grep -q 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"' "$BASELINE"; then
  echo "   ✓ UUID extension enabled"
else
  echo "   ✗ UUID extension missing"
  exit 1
fi

echo ""
echo "=== Validation Summary ==="
echo "✓ All critical checks passed"
echo "✓ Baseline migration appears complete"
echo "✓ Ready for deployment to empty database"
echo ""
echo "Models in schema: $MODEL_COUNT"
echo "Tables in baseline: $TABLE_COUNT"
echo "Enums: $ENUM_COUNT"
echo "Foreign keys: $FK_COUNT"
echo "Indexes: $INDEX_COUNT"
echo ""
