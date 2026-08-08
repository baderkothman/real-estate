#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const migrationFile = "neon/migrations/0001_initial_schema.sql";

const expectedTables = [
  "audit_log",
  "commission_configs",
  "conversation_participants",
  "conversations",
  "disputes",
  "document_signers",
  "documents",
  "events",
  "hidden_listings",
  "inquiries",
  "ledger_entries",
  "listing_history",
  "listings",
  "messages",
  "notifications",
  "offer_revisions",
  "offers",
  "party_roles",
  "payment_intents",
  "payments",
  "payouts",
  "profiles",
  "properties",
  "property_notes",
  "refunds",
  "regional_rules",
  "rental_applications",
  "saved_properties",
  "saved_searches",
  "search_alerts",
  "transaction_tasks",
  "transactions",
  "transfers",
  "viewings",
];

const expectedTypes = [
  "document_envelope_status",
  "listing_lifecycle_status",
  "listing_moderation_status",
  "listing_type",
  "offer_status",
  "party_role_type",
  "property_status",
  "rental_application_status",
  "transaction_status",
  "user_plan",
  "user_role",
  "viewing_status",
];

function loadEnvValue(name) {
  if (process.env[name]) {
    return process.env[name];
  }

  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) {
      continue;
    }

    const line = readFileSync(file, "utf8")
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${name}=`));

    if (!line) {
      continue;
    }

    let value = line.slice(line.indexOf("=") + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }

  return undefined;
}

function sqlArray(values) {
  return `array[${values.map((value) => `'${value}'`).join(",")}]`;
}

function runPsql(args, options = {}) {
  return spawnSync("psql", [databaseUrl, ...args], {
    encoding: "utf8",
    ...options,
  });
}

const databaseUrl = loadEnvValue("DATABASE_URL");

if (!databaseUrl) {
  console.error(
    "DATABASE_URL is required. Set it in the environment or in .env.local.",
  );
  process.exit(1);
}

const stateQuery = `
select json_build_object(
  'tables',
  (
    select coalesce(array_agg(table_name order by table_name), '{}'::text[])
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any(${sqlArray(expectedTables)})
  ),
  'types',
  (
    select coalesce(array_agg(t.typname order by t.typname), '{}'::text[])
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = any(${sqlArray(expectedTypes)})
  )
)::text;
`;

const stateResult = runPsql([
  "-X",
  "-v",
  "ON_ERROR_STOP=1",
  "-Atc",
  stateQuery,
]);

if (stateResult.status !== 0) {
  process.stderr.write(stateResult.stderr);
  process.exit(stateResult.status ?? 1);
}

const state = JSON.parse(stateResult.stdout.trim());
const presentTables = new Set(state.tables);
const presentTypes = new Set(state.types);
const missingTables = expectedTables.filter((table) => !presentTables.has(table));
const missingTypes = expectedTypes.filter((type) => !presentTypes.has(type));
const presentObjectCount = presentTables.size + presentTypes.size;
const expectedObjectCount = expectedTables.length + expectedTypes.length;

if (presentObjectCount === expectedObjectCount) {
  console.log("Neon schema already exists; skipping bootstrap migration.");
  process.exit(0);
}

if (presentObjectCount > 0) {
  console.error("Database appears partially initialized; refusing to continue.");
  console.error(`Present app objects: ${presentObjectCount}/${expectedObjectCount}`);
  if (missingTables.length > 0) {
    console.error(`Missing tables: ${missingTables.join(", ")}`);
  }
  if (missingTypes.length > 0) {
    console.error(`Missing types: ${missingTypes.join(", ")}`);
  }
  console.error(
    "Use a fresh Neon branch/database for this bootstrap, or reset the partial schema intentionally before rerunning.",
  );
  process.exit(1);
}

const migrateResult = runPsql(
  [
    "-v",
    "ON_ERROR_STOP=1",
    "--single-transaction",
    "-f",
    migrationFile,
  ],
  { stdio: "inherit" },
);

process.exit(migrateResult.status ?? 1);
