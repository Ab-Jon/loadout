import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return env;
}

const env = loadEnv(join(root, ".env.local"));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing Supabase URL or service role key in .env.local");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function runSql(sql) {
  const attempts = [
    [`${url}/pg/query`, { query: sql }],
    [`${url}/pg/query`, sql],
    [`https://api.supabase.com/v1/projects/${new URL(url).hostname.split(".")[0]}/database/query`, { query: sql }],
  ];

  const failures = [];
  for (const [endpoint, body] of attempts) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await response.text();
    if (response.ok) {
      console.log(`SQL applied via ${new URL(endpoint).pathname}`);
      return;
    }
    failures.push(`${response.status} ${new URL(endpoint).pathname}: ${text.slice(0, 180)}`);
  }

  throw new Error(failures.join("\n"));
}

async function seed() {
  const catalog = JSON.parse(readFileSync(join(root, "scripts", "catalog.json"), "utf8"));
  const response = await fetch(`${url}/rest/v1/products?on_conflict=slug`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(catalog),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Seed failed ${response.status}: ${text.slice(0, 300)}`);
  }
  const rows = JSON.parse(text);
  console.log(`Catalog ready: ${rows.length} products`);
}

const sql = readFileSync(join(root, "supabase", "setup.sql"), "utf8");

try {
  await runSql(sql);
  await seed();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
