import { config } from "dotenv";
import { resolve } from "node:path";
import { createAdminClient } from "../lib/supabase/admin";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

/** Local-only defaults when both DEV_TEST_* vars are omitted. */
const DEFAULT_DEV_EMAIL = "dev@localhost.test";
const DEFAULT_DEV_PASSWORD = "DevLocalOnly123!";

function resolveCredentials(): { email: string; password: string } {
  const rawEmail = process.env.DEV_TEST_USER_EMAIL?.trim() ?? "";
  const rawPassword = process.env.DEV_TEST_USER_PASSWORD ?? "";

  if (rawEmail === "" && rawPassword === "") {
    console.warn(
      `[seed:dev-user] DEV_TEST_USER_EMAIL and DEV_TEST_USER_PASSWORD not set; using defaults:\n` +
        `  email:    ${DEFAULT_DEV_EMAIL}\n` +
        `  password: ${DEFAULT_DEV_PASSWORD}\n` +
        `  (Set both in .env.local to override. Only use on a local / throwaway Supabase project.)`
    );
    return { email: DEFAULT_DEV_EMAIL, password: DEFAULT_DEV_PASSWORD };
  }

  if (!rawEmail || !rawPassword) {
    throw new Error(
      "Set both DEV_TEST_USER_EMAIL and DEV_TEST_USER_PASSWORD in .env.local, or remove both to use built-in local defaults."
    );
  }

  if (rawPassword.length < 8) {
    throw new Error("DEV_TEST_USER_PASSWORD must be at least 8 characters.");
  }

  return { email: rawEmail, password: rawPassword };
}

async function main() {
  const { email, password } = resolveCredentials();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (required for admin API).");
  }

  const supabase = createAdminClient();

  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const normalized = email.toLowerCase();
  const existing = list.users.find((u) => u.email?.toLowerCase() === normalized);

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateError) throw updateError;
    console.log(`Updated dev user (password + confirmed email): ${email}`);
    return;
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) throw createError;
  console.log(`Created dev user: ${email}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
