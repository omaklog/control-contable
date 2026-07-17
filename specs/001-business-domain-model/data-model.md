# Data Model: Modelo de Dominios de Negocio — Seguimiento de Ajustes Pendientes

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Este plan no introduce ni modifica ninguna entidad de datos — `001-business-domain-model` es un documento conceptual (FR-014) y este seguimiento sólo toca un archivo de gobernanza (`.specify/memory/constitution.md`), no el esquema de Supabase. La tabla siguiente resume, únicamente a modo de referencia, el estado de cada dominio frente a lo ya implementado — no reemplaza ni al spec ni al research.md de esta feature.

## Estado de los dominios frente a la implementación existente

| Dominio                                            | Entidades ya implementadas                                                   | Ajuste pendiente registrado                                              | Acción de este plan                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Clientes                                           | `clientes`, `contactos`, `regimenes_fiscales` (`005`, `008`)                 | Ninguno                                                                  | Ninguna                                                          |
| Servicios                                          | Ninguna                                                                      | #1 — sin catálogo detrás de `cargos_cobranza.concepto`                   | Diferida a su propio spec (research.md Decisión 2)               |
| Cobranza                                           | `cargos_cobranza`, `pagos`, `cargo_pagos`, `metodos_pago`, `recibos` (`005`) | Ninguno propio (recibe el ajuste #1 cuando exista Servicios)             | Ninguna                                                          |
| Gestión Fiscal                                     | Ninguna                                                                      | #2 (parcial) — no existen `obligaciones_fiscales` ni `periodos_fiscales` | Diferida a su propio spec (research.md Decisión 2)               |
| Gestión Documental Fiscal                          | `documentos`, `categorias_documento` (`005`)                                 | #2 (parcial) — sin relación a un futuro periodo fiscal                   | Diferida a su propio spec (research.md Decisión 2)               |
| Notificaciones                                     | Ninguna                                                                      | Ninguno (dominio nuevo, sin conflicto)                                   | Ninguna                                                          |
| Auditoría                                          | `business_audit_log` (`005`)                                                 | Ninguno                                                                  | Ninguna                                                          |
| Reportes y Analítica                               | Ninguna                                                                      | Ninguno                                                                  | Ninguna                                                          |
| _(gobernanza)_ Lista de módulos de la Constitución | N/A                                                                          | #3 — lista desactualizada frente a estos 8 dominios                      | Accionable ahora, sujeta a confirmación (research.md Decisión 1) |

No se agregan columnas, tablas, tipos ni índices como parte de este plan.
