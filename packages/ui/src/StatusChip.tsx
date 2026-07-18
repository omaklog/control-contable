'use client'

import Chip from '@mui/material/Chip'
import { alpha, useTheme } from '@mui/material/styles'

export type StatusChipVariant = 'positivo' | 'negativo' | 'neutro'

const STATUS_VARIANT_BY_VALUE: Record<string, StatusChipVariant> = {
  activo: 'positivo',
  inactivo: 'neutro',
  obsoleto: 'neutro',
  vencido: 'negativo',
}

const DEFAULT_LABEL_BY_VALUE: Record<string, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  obsoleto: 'Obsoleto',
  vencido: 'Vencido',
}

export interface StatusChipProps {
  /** Valor de `estado` ya existente del dominio (ej. `'activo'`, `'inactivo'`, `'obsoleto'`). */
  status: string
  /** Override del texto mostrado; por defecto se deriva de `status`. */
  label?: string
  /** Override explícito del color semántico; por defecto se deriva de `status`. */
  variant?: StatusChipVariant
}

/**
 * Chip semántico único para columnas "Estado" (design-system.md §4, §7; FR-012).
 * Azul = positivo/activo, rojo = negativo/vencido, gris = neutro/inactivo —
 * nunca verde. Dos pantallas que muestran el mismo `status` con este componente
 * son visualmente idénticas por construcción (SC-003).
 */
export function StatusChip({ status, label, variant }: StatusChipProps) {
  const theme = useTheme()
  const resolvedVariant = variant ?? STATUS_VARIANT_BY_VALUE[status] ?? 'neutro'
  const color =
    resolvedVariant === 'positivo'
      ? theme.custom.statusColors.positive
      : resolvedVariant === 'negativo'
        ? theme.custom.statusColors.negative
        : theme.custom.statusColors.neutral

  return (
    <Chip
      label={label ?? DEFAULT_LABEL_BY_VALUE[status] ?? status}
      size="small"
      sx={{
        bgcolor: alpha(color, 0.1),
        color,
        fontWeight: 600,
      }}
    />
  )
}

export function resolveStatusChipVariant(status: string): StatusChipVariant {
  return STATUS_VARIANT_BY_VALUE[status] ?? 'neutro'
}
