import { execFileSync, spawnSync } from 'node:child_process'

import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real (CLI: `supabase start`,
 * o `infra/supabase/`) — verifica que las políticas RLS de `profiles`
 * realmente aíslan el acceso por rol (SC-002), no solo que `hasPermission()`
 * lo decida a nivel de aplicación. Ver contracts/db-functions-rls.md y
 * quickstart.md "Historia 1"/"Historia 2".
 *
 * Se omite automáticamente si no hay un Supabase local accesible (por
 * ejemplo, en un entorno de CI sin Docker disponible).
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const PASSWORD = 'Integration-Test-Pass1!'

async function isSupabaseReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

const reachable = await isSupabaseReachable()

describe.skipIf(!reachable)('RLS de profiles (integración)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let administradorId: string
  let auxiliarId: string
  const administradorEmail = `integration-admin-${Date.now()}@example.com`
  const auxiliarEmail = `integration-auxiliar-${Date.now()}@example.com`

  beforeAll(async () => {
    const { data: adminUser, error: adminErr } = await admin.auth.admin.createUser({
      email: administradorEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (adminErr || !adminUser.user)
      throw adminErr ?? new Error('No se pudo crear administrador de prueba')
    administradorId = adminUser.user.id

    const { data: auxUser, error: auxErr } = await admin.auth.admin.createUser({
      email: auxiliarEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (auxErr || !auxUser.user) throw auxErr ?? new Error('No se pudo crear auxiliar de prueba')
    auxiliarId = auxUser.user.id

    const { error: insertErr } = await admin.from('profiles').insert([
      { id: administradorId, role: 'administrador', is_active: true },
      { id: auxiliarId, role: 'auxiliar', is_active: true },
    ])
    if (insertErr) throw insertErr
  })

  afterAll(async () => {
    if (administradorId) await admin.auth.admin.deleteUser(administradorId)
    if (auxiliarId) await admin.auth.admin.deleteUser(auxiliarId)
  })

  it('un Auxiliar solo ve su propia fila en profiles, no la de otros (Historia 1/2, SC-002)', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInErr } = await client.auth.signInWithPassword({
      email: auxiliarEmail,
      password: PASSWORD,
    })
    expect(signInErr).toBeNull()

    const { data, error } = await client.from('profiles').select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0]?.id).toBe(auxiliarId)
  })

  it('un Administrador ve todas las filas de profiles (incluida la de otros)', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInErr } = await client.auth.signInWithPassword({
      email: administradorEmail,
      password: PASSWORD,
    })
    expect(signInErr).toBeNull()

    const { data, error } = await client.from('profiles').select('id')
    expect(error).toBeNull()
    const ids = (data ?? []).map((row) => row.id)
    expect(ids).toContain(administradorId)
    expect(ids).toContain(auxiliarId)
  })

  it('un Auxiliar no puede actualizar filas de profiles (ni la propia) — solo Administrador puede', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

    const { data, error } = await client
      .from('profiles')
      .update({ full_name: 'Intento no autorizado' })
      .eq('id', auxiliarId)
      .select()

    // RLS bloquea el UPDATE: no hay error explícito (PostgREST no distingue
    // "prohibido" de "0 filas coincidentes" bajo RLS), pero tampoco se
    // actualiza ninguna fila.
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})

const DB_CONTAINER = process.env.SUPABASE_DB_CONTAINER ?? 'supabase_db_control-contable'

function dockerPsqlAvailable(): boolean {
  try {
    execFileSync('docker', ['exec', DB_CONTAINER, 'true'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const dockerAvailable = reachable && dockerPsqlAvailable()

describe.skipIf(!dockerAvailable)('Trigger "último Administrador activo" (FR-011, T008)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let testAdminId: string
  const testAdminEmail = `integration-lastadmin-${Date.now()}@example.com`

  beforeAll(async () => {
    const { data: user, error } = await admin.auth.admin.createUser({
      email: testAdminEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error || !user.user) throw error ?? new Error('No se pudo crear el administrador de prueba')
    testAdminId = user.user.id
    await admin.from('profiles').insert({ id: testAdminId, role: 'administrador', is_active: true })
  })

  afterAll(async () => {
    if (testAdminId) await admin.auth.admin.deleteUser(testAdminId)
  })

  it('el trigger de BD rechaza desactivar al último Administrador activo, invocado directamente (no vía Server Action)', () => {
    // Todo corre dentro de una única transacción con ROLLBACK al final: se
    // desactivan temporalmente los demás Administradores reales para dejar
    // únicamente al de prueba como "último activo", se intenta desactivarlo
    // (debe fallar) y se revierte todo — no queda ningún efecto persistente.
    const beforeCount = countActiveAdministradoresViaSql()

    const sql = `
      BEGIN;
      UPDATE public.profiles SET is_active = false WHERE role = 'administrador' AND id <> '${testAdminId}';
      UPDATE public.profiles SET is_active = false WHERE id = '${testAdminId}';
      ROLLBACK;
    `
    const result = spawnSync(
      'docker',
      ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres'],
      {
        input: sql,
        encoding: 'utf-8',
      },
    )
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`

    expect(output).toContain('No puede quedar el sistema sin ningún Administrador activo')

    // El ROLLBACK garantiza que no quedó ningún efecto persistente.
    const afterCount = countActiveAdministradoresViaSql()
    expect(afterCount).toBe(beforeCount)
  })

  function countActiveAdministradoresViaSql(): number {
    const output = execFileSync(
      'docker',
      [
        'exec',
        DB_CONTAINER,
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-t',
        '-c',
        "select count(*) from public.profiles where role = 'administrador' and is_active = true;",
      ],
      { encoding: 'utf-8' },
    )
    return parseInt(output.trim(), 10)
  }
})

describe.skipIf(!reachable)('permission_overrides (FR-014, research.md #13)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userAId: string
  let userBId: string
  const userAEmail = `integration-permoverride-a-${Date.now()}@example.com`
  const userBEmail = `integration-permoverride-b-${Date.now()}@example.com`

  beforeAll(async () => {
    const { data: userA, error: errA } = await admin.auth.admin.createUser({
      email: userAEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errA || !userA.user) throw errA ?? new Error('No se pudo crear el usuario A de prueba')
    userAId = userA.user.id

    const { data: userB, error: errB } = await admin.auth.admin.createUser({
      email: userBEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errB || !userB.user) throw errB ?? new Error('No se pudo crear el usuario B de prueba')
    userBId = userB.user.id

    const { error: insertErr } = await admin.from('profiles').insert([
      { id: userAId, role: 'auxiliar', is_active: true },
      { id: userBId, role: 'auxiliar', is_active: true },
    ])
    if (insertErr) throw insertErr
  })

  afterAll(async () => {
    if (userAId) await admin.auth.admin.deleteUser(userAId)
    if (userBId) await admin.auth.admin.deleteUser(userBId)
  })

  it('un ajuste de permiso para el usuario A no afecta al usuario B (mismo rol)', async () => {
    const { error: overrideErr } = await admin
      .from('permission_overrides')
      .insert({ profile_id: userAId, capability: 'view_auth_audit_log', granted: true })
    expect(overrideErr).toBeNull()

    const { data: overridesForB } = await admin
      .from('permission_overrides')
      .select('capability')
      .eq('profile_id', userBId)
    expect(overridesForB).toHaveLength(0)
  })

  it('al cambiar el rol del usuario A, el trigger elimina sus permission_overrides', async () => {
    const { error: updateErr } = await admin
      .from('profiles')
      .update({ role: 'contador' })
      .eq('id', userAId)
    expect(updateErr).toBeNull()

    const { data: overridesForA } = await admin
      .from('permission_overrides')
      .select('capability')
      .eq('profile_id', userAId)
    expect(overridesForA).toHaveLength(0)
  })
})

describe.skipIf(!reachable)(
  'createAccount (alta manual sin invitación, FR-010, research.md #11)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let createdId: string
    const createdEmail = `integration-createaccount-${Date.now()}@example.com`

    afterAll(async () => {
      if (createdId) await admin.auth.admin.deleteUser(createdId)
    })

    it('simula createAccount vía service_role: la cuenta queda activa de inmediato con must_change_password=true, sin invitación', async () => {
      const { data: userData, error: userError } = await admin.auth.admin.createUser({
        email: createdEmail,
        password: 'Temporal-Generada-Pass1!',
        email_confirm: true,
      })
      expect(userError).toBeNull()
      if (!userData?.user) throw new Error('No se pudo crear el usuario de prueba')
      createdId = userData.user.id

      const { error: profileError } = await admin.from('profiles').insert({
        id: createdId,
        role: 'auxiliar',
        is_active: true,
        must_change_password: true,
      })
      expect(profileError).toBeNull()

      const { data: profile } = await admin
        .from('profiles')
        .select('is_active, must_change_password')
        .eq('id', createdId)
        .single()
      expect(profile?.is_active).toBe(true)
      expect(profile?.must_change_password).toBe(true)
    })
  },
)

describe.skipIf(!reachable)('clear_must_change_password() (FR-013, research.md #10)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let targetId: string
  let otherId: string
  const targetEmail = `integration-mustchange-target-${Date.now()}@example.com`
  const otherEmail = `integration-mustchange-other-${Date.now()}@example.com`

  beforeAll(async () => {
    const { data: targetUser, error: targetErr } = await admin.auth.admin.createUser({
      email: targetEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (targetErr || !targetUser.user)
      throw targetErr ?? new Error('No se pudo crear el usuario objetivo de prueba')
    targetId = targetUser.user.id

    const { data: otherUser, error: otherErr } = await admin.auth.admin.createUser({
      email: otherEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (otherErr || !otherUser.user)
      throw otherErr ?? new Error('No se pudo crear el segundo usuario de prueba')
    otherId = otherUser.user.id

    const { error: insertErr } = await admin.from('profiles').insert([
      { id: targetId, role: 'auxiliar', is_active: true },
      { id: otherId, role: 'auxiliar', is_active: true },
    ])
    if (insertErr) throw insertErr
  })

  afterAll(async () => {
    if (targetId) await admin.auth.admin.deleteUser(targetId)
    if (otherId) await admin.auth.admin.deleteUser(otherId)
  })

  it('un Administrador (vía service_role, simulando assignTemporaryPassword) asigna must_change_password=true', async () => {
    const { error } = await admin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', targetId)
    expect(error).toBeNull()

    const { data } = await admin
      .from('profiles')
      .select('must_change_password')
      .eq('id', targetId)
      .single()
    expect(data?.must_change_password).toBe(true)
  })

  it('clear_must_change_password() invocado por otro usuario autenticado no afecta la fila ajena', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({ email: otherEmail, password: PASSWORD })

    const { error } = await client.rpc('clear_must_change_password')
    expect(error).toBeNull()

    const { data } = await admin
      .from('profiles')
      .select('must_change_password')
      .eq('id', targetId)
      .single()
    expect(data?.must_change_password).toBe(true)
  })

  it('clear_must_change_password() invocado por el propio usuario limpia el flag', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({ email: targetEmail, password: PASSWORD })

    const { error } = await client.rpc('clear_must_change_password')
    expect(error).toBeNull()

    const { data } = await admin
      .from('profiles')
      .select('must_change_password')
      .eq('id', targetId)
      .single()
    expect(data?.must_change_password).toBe(false)
  })
})
