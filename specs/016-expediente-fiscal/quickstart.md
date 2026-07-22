# Quickstart: Expediente Fiscal

Prerrequisitos: Supabase local corriendo (`supabase start`), migraciones aplicadas, al menos un cliente activo, una obligación fiscal de catálogo, y un cumplimiento fiscal generado (015) para ese cliente.

## Escenario 1 (US1) — Consultar y cargar documentos en el expediente del cliente

1. Como Administrador o Contador, abre el detalle de un cliente en `apps/portal`.
2. En la sección "Expediente Fiscal", sube un PDF sin seleccionar cumplimiento ni tipo.
3. **Esperado**: el documento aparece en "Documentos Generales", clasificado como "Sin clasificar".
4. Sube un segundo PDF asociándolo a un cumplimiento existente.
5. **Esperado**: aparece agrupado bajo el año/periodo de ese cumplimiento, en "Documentos por Periodo".
6. Intenta subir un archivo `.png`.
7. **Esperado**: la carga se rechaza antes de llegar a almacenamiento, con un mensaje claro.
8. Abre el primer documento cargado.
9. **Esperado**: se genera un acceso temporal (URL firmada) y el PDF se visualiza/descarga correctamente.

## Escenario 2 (US2) — Documentos Esperados de un cumplimiento

1. Como Administrador, configura dos Documentos Esperados para la obligación del cumplimiento usado arriba (Escenario 4).
2. Genera o usa un cumplimiento ya generado de esa obligación.
3. Abre el detalle del cumplimiento en `apps/portal/obligaciones-fiscales/[cumplimientoId]`.
4. **Esperado**: se listan los dos esperados; ambos "faltante" si no se ha subido ningún documento con esos tipos aún.
5. Sube un documento clasificado con el Tipo de Documento del primer esperado, asociado a este cumplimiento.
6. **Esperado**: ese esperado cambia a "disponible"; el otro sigue "faltante".
7. Cambia el estado del cumplimiento a "Presentada".
8. **Esperado**: el cambio se guarda sin ninguna advertencia bloqueante, pese al esperado faltante.
9. Sube un tercer documento sin relación con ningún esperado configurado.
10. **Esperado**: aparece en una sección de "Documentos Adicionales" de ese cumplimiento.

## Escenario 3 (US3) — Vista global de Expedientes

1. Repite el Escenario 1 para un segundo cliente.
2. Abre "Documentos Fiscales" en el menú del portal (antes "Próximamente", ahora activo).
3. Filtra por Tipo de Documento usado en ambos clientes.
4. **Esperado**: aparecen documentos de ambos clientes.
5. Selecciona un resultado.
6. **Esperado**: se navega al expediente del cliente correspondiente.
7. Repite la búsqueda como un usuario Auxiliar sin autorización sobre uno de los clientes (si el modelo de permisos por cliente aplica).
8. **Esperado**: los documentos de ese cliente no aparecen.

## Escenario 4 (US5) — Definir Documentos Esperados para una obligación

1. Como Administrador, abre `apps/admin/catalogos/obligaciones-fiscales`, selecciona una obligación.
2. Agrega dos Documentos Esperados (Tipos de Documento del catálogo).
3. **Esperado**: quedan disponibles para futuros cumplimientos de esa obligación.
4. Genera un cumplimiento de esa obligación (015) y confirma que aparece con esos dos esperados (Escenario 2, paso 4).
5. Modifica la configuración: elimina uno de los dos esperados y agrega uno nuevo.
6. **Esperado**: el cumplimiento ya generado en el paso 4 conserva la lista original (los dos primeros), no la nueva.
7. Genera un nuevo cumplimiento de la misma obligación.
8. **Esperado**: el nuevo cumplimiento usa la configuración actualizada (el esperado nuevo, sin el eliminado).

## Escenario 5 (US4) — Eliminación lógica por antigüedad y rol

1. Sube un documento (fecha de alta = hoy).
2. Como Auxiliar, elimínalo.
3. **Esperado**: se elimina; deja de aparecer en el expediente y en la vista global, pero el evento queda en auditoría.
4. Usando `psql` o el service role, adelanta la `fecha_carga` de otro documento a hace 4 meses (solo para esta prueba manual).
5. Como Contador, intenta eliminarlo.
6. **Esperado**: rechazado, con mensaje indicando que se requiere un Administrador.
7. Como Administrador, elimina ese mismo documento.
8. **Esperado**: se elimina sin restricción de antigüedad.

**Nota de validación manual**: igual que en 015, la ejecución real de estos 5 escenarios en el navegador queda pendiente para el usuario (sin Playwright/chromium disponible en este entorno).
