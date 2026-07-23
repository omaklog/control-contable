# Phase 1 Data Model: Gestión de Pagos

## Pago (extiende `pagos`, 017)

| Campo                   | Tipo                      | Notas                                                                                         |
| ----------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| id                      | uuid, PK                  | (ya existente)                                                                                |
| cobranza_id             | uuid, FK → cobranzas      | (ya existente, not null)                                                                      |
| monto                   | numeric(12,2)             | (ya existente, > 0)                                                                           |
| fecha_pago              | timestamptz               | (ya existente) — fecha real del pago, puede ser anterior a `created_at`                       |
| metodo_pago_id          | uuid, FK → metodos_pago   | (ya existente)                                                                                |
| comentario              | text, nullable            | (ya existente, antes `referencia`)                                                            |
| **estado**              | **pago_estado, not null** | **nuevo** — `activo` (default) \| `revertido` \| `eliminado`                                  |
| **motivo_reversion**    | **text, nullable**        | **nuevo** — obligatorio cuando `estado = 'revertido'` (constraint `check`)                    |
| created_at / updated_at | timestamptz               | (ya existente)                                                                                |
| created_by / updated_by | uuid → auth.users         | (ya existente) — `updated_by` refleja quién hizo la última modificación/reversión/eliminación |

**Reglas de transición de `estado`** (trigger `BEFORE UPDATE`, ver contracts/db-functions-rls.md):

```text
activo ──(eliminar)──► eliminado   [estado final]
activo ──(revertir, motivo obligatorio)──► revertido   [estado final]
eliminado / revertido ──► (cualquier transición)   RECHAZADO
```

**Regla de saldo** (FR-002/FR-004): al insertar un pago, o al modificar el `monto` de un pago `activo`, la suma de montos de todos los pagos `activo` de la cobranza (excluyendo, en el caso de modificación, el monto anterior de este mismo pago) no MUST exceder el total de conceptos de la cobranza.

**Regla de cálculo de saldo** (FR-016): `total_pagado` y `saldo` de una cobranza (vista `cobranzas_resumen`, 017) se calculan considerando únicamente pagos en `estado = 'activo'`.

## Comprobante de Pago (`comprobantes_pago`, nueva)

| Campo               | Tipo              | Notas                                                      |
| ------------------- | ----------------- | ---------------------------------------------------------- |
| id                  | uuid, PK          |                                                            |
| pago_id             | uuid, FK → pagos  | not null                                                   |
| nombre_original     | text              | not null — nombre del archivo tal como lo subió el usuario |
| tipo_archivo        | text              | not null — MIME type                                       |
| tamano_bytes        | bigint            | not null                                                   |
| ruta_almacenamiento | text              | not null — path dentro del bucket `comprobantes-pago`      |
| created_at          | timestamptz       | not null, default now() — fecha de carga                   |
| created_by          | uuid → auth.users | usuario que realizó la carga                               |

Sin columna `updated_at`/`updated_by`: la fila es inmutable — nunca se modifica, solo se inserta o se elimina físicamente (Decisión 7, research.md). Sin política de `UPDATE`.

## Diagrama de relación

```text
Cliente
   │
   ▼
Cobranza
   │
   ├── Conceptos de Cobranza (017, sin cambios)
   │
   └── Pagos (017 + estado nuevo)
         ├── Pago 1 (activo)
         │     └── Comprobantes (0..N, nuevo)
         ├── Pago 2 (revertido, con motivo)
         │     └── Comprobantes (0..N)
         └── Pago N (eliminado)
               └── Comprobantes (0..N, no se eliminan en cascada — FR-011/edge case)
```

## Notas de integridad

- Un `comprobante_pago` sobrevive a la eliminación lógica o reversión de su `pago` — solo se elimina mediante su propia acción explícita (FR-011, edge case).
- Un `recibo` (017) generado a partir de un `pago` no se sincroniza cuando ese pago se modifica, revierte o elimina posteriormente — conserva su monto/concepto originales como constancia histórica (Decisión 11, research.md).
- El método de pago (`metodos_pago`) permanece sin cambios de estructura; un pago conserva el `metodo_pago_id` histórico aunque el método se desactive después (FR-017, ya garantizado por 017 al no tener ON DELETE CASCADE ni ocultar métodos inactivos en registros existentes).
