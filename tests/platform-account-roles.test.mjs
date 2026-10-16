import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "../.validation/node_modules/@electric-sql/pglite/dist/index.js";

const ownerId = "30000000-0000-0000-0000-000000000001";
const adminId = "30000000-0000-0000-0000-000000000002";
const collaboratorId = "30000000-0000-0000-0000-000000000003";
const newUserId = "30000000-0000-0000-0000-000000000004";

test("Los roles internos protegen la cuenta principal", async () => {
  const db = new PGlite();

  try {
    // Prepara el esquema mínimo que requiere la migración de roles.
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid
        LANGUAGE sql STABLE AS $$
          SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;
      CREATE TABLE public.platform_admins (
        user_id uuid PRIMARY KEY,
        granted_by uuid,
        granted_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.business_members (
        business_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role text NOT NULL,
        PRIMARY KEY (business_id, user_id)
      );
      ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT, UPDATE, DELETE
        ON public.platform_admins, public.business_members TO authenticated;
    `);

    const migration = await readFile(
      new URL(
        "../supabase/migrations/202610150004_platform_account_roles.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.query(
      `INSERT INTO public.platform_admins (user_id, platform_role)
       VALUES ($1, 'owner'), ($2, 'admin'), ($3, 'collaborator')`,
      [ownerId, adminId, collaboratorId],
    );

    // El propietario puede crear admins y colaboradores, pero no otro owner.
    await db.query(
      "SELECT set_config('request.jwt.claim.sub', $1, false)",
      [ownerId],
    );
    await db.exec("SET ROLE authenticated");
    await db.query(
      `INSERT INTO public.platform_admins (user_id, platform_role)
       VALUES ($1, 'admin')`,
      [newUserId],
    );
    await assert.rejects(
      db.query(
        `INSERT INTO public.platform_admins (user_id, platform_role)
         VALUES ($1, 'owner')`,
        ["30000000-0000-0000-0000-000000000005"],
      ),
      /new row violates row-level security policy/,
    );
    const ownerDelete = await db.query(
      "DELETE FROM public.platform_admins WHERE user_id = $1",
      [ownerId],
    );
    assert.equal(ownerDelete.rowCount, 0);
    await db.exec("RESET ROLE");

    // El admin no puede crear ni eliminar otra cuenta admin.
    await db.query(
      "SELECT set_config('request.jwt.claim.sub', $1, false)",
      [adminId],
    );
    await db.exec("SET ROLE authenticated");
    await db.query(
      `INSERT INTO public.platform_admins (user_id, platform_role)
       VALUES ($1, 'collaborator')`,
      ["30000000-0000-0000-0000-000000000006"],
    );
    await assert.rejects(
      db.query(
        `INSERT INTO public.platform_admins (user_id, platform_role)
         VALUES ($1, 'admin')`,
        ["30000000-0000-0000-0000-000000000007"],
      ),
      /new row violates row-level security policy/,
    );
    const adminDelete = await db.query(
      "DELETE FROM public.platform_admins WHERE user_id = $1",
      [ownerId],
    );
    assert.equal(adminDelete.rowCount, 0);
    await db.exec("RESET ROLE");

    // La restricción única impide crear un segundo propietario principal.
    await assert.rejects(
      db.query(
        `INSERT INTO public.platform_admins (user_id, platform_role)
         VALUES ($1, 'owner')`,
        ["30000000-0000-0000-0000-000000000008"],
      ),
      /platform_admins_single_owner_idx/,
    );
  } finally {
    await db.close();
  }
});
