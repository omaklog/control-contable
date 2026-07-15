import type { AppRole } from '@control-contable/auth'

/**
 * Determina, de forma pura (sin acceso a datos), si un cambio de rol/estado
 * dejaría al sistema sin ningún Administrador activo. Es el mismo chequeo que
 * hace el trigger de base de datos (FR-011); aquí solo se usa para dar un
 * mensaje de error amigable ANTES de intentar el UPDATE — el trigger sigue
 * siendo la autoridad final e innegociable (ver research.md #6).
 *
 * Vive en un módulo separado de `actions.ts` porque un archivo `'use server'`
 * exige que TODAS sus exportaciones sean funciones async (Server Actions);
 * esta es una función pura y síncrona.
 */
export function wouldRemoveLastActiveAdministrador(
  activeAdminCount: number,
  isTargetCurrentlyActiveAdministrador: boolean,
  newRole: AppRole,
  newIsActive: boolean,
): boolean {
  if (!isTargetCurrentlyActiveAdministrador) {
    return false
  }

  const staysActiveAdministrador = newRole === 'administrador' && newIsActive
  if (staysActiveAdministrador) {
    return false
  }

  return activeAdminCount <= 1
}
