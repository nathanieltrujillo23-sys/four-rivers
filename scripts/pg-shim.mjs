import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The small parts of Supabase the schema relies on, so the migrations run on a plain Postgres (PGlite). */
export const SUPABASE_SHIM = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  aud text,
  role text,
  raw_user_meta_data jsonb,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);
create function auth.uid() returns uuid language sql stable as
  $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
create function auth.role() returns text language sql stable as
  $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role' $$;
create function public.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
create publication supabase_realtime;
grant usage on schema public, auth, extensions to anon, authenticated, service_role;
grant select on auth.users to service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

/** Every migration file in order, with the extension lines removed (uuid_generate_v4() comes from the shim). */
export function migrationFiles() {
  const dir = join(fileURLToPath(new URL("..", import.meta.url)), "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ name: f, sql: readFileSync(join(dir, f), "utf8").replace(/create extension[^;]*;/gi, "") }));
}
