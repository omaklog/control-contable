# Contract: Theme compartido (`packages/ui/src/theme`)

Este documento define el contrato que ambas aplicaciones (`apps/admin`, `apps/portal`) y cualquier componente de `packages/ui` deben poder asumir al consumir el Theme. No es una API HTTP — es el contrato de un módulo interno del monorepo, en el mismo espíritu que "command schemas" para una CLI.

## Exports requeridos de `packages/ui/src/theme/index.ts`

| Export              | Tipo             | Contrato                                                                                                                                                                                    |
| ------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lightTheme`        | `Theme` (MUI)    | Theme completo en modo claro, construido a partir de los tokens de `colors.ts`/`typography.ts`/`spacing.ts`/`radius.ts`/`shadows.ts`                                                        |
| `darkTheme`         | `Theme` (MUI)    | Theme completo en modo oscuro; MISMOS valores de `shape.borderRadius`, `typography`, `spacing` que `lightTheme` — solo difiere `palette` y `shadows` (FR-007)                               |
| `ColorModeProvider` | Componente React | Envuelve `children`; decide el modo inicial (SO por defecto, `'light'` como respaldo), expone el modo activo y una función para alternarlo, persiste el override manual (ver data-model.md) |
| `useColorMode`      | Hook             | `{ mode: 'light' \| 'dark', toggleMode: () => void }` — consumido por cualquier control de alternancia de tema en cualquiera de las dos apps                                                |

## Reglas de consumo (obligatorias para ambas apps)

1. `ThemeRegistry.tsx` de cada app DEBE envolver `children` en `ColorModeProvider` → `ThemeProvider` (con `lightTheme`/`darkTheme` según `useColorMode().mode`) → `CssBaseline`, sin definir ni importar ningún otro objeto `Theme` local.
2. Ningún archivo de aplicación (`apps/admin/**`, `apps/portal/**`) puede llamar a `createTheme()` directamente ni definir valores de color/tipografía/espaciado/radio propios — toda esa definición vive exclusivamente en `packages/ui/src/theme`.
3. Cualquier componente compartido nuevo o existente en `packages/ui` DEBE leer sus valores visuales exclusivamente vía `theme.palette`/`theme.typography`/`theme.spacing`/`theme.shape` (heredados automáticamente del `ThemeProvider` activo) — nunca mediante colores/tamaños hardcodeados en `sx`/`styled` (FR-011).

## Contrato de `StatusChip` (componente compartido, `packages/ui`)

| Prop               | Tipo                                                                                            | Contrato                                                                                                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`           | string (valor de `estado` ya existente del dominio, ej. `'activo'`, `'inactivo'`, `'obsoleto'`) | Determina el color semántico (azul=positivo, rojo=negativo, gris=neutro) y la etiqueta mostrada — el mapeo status→color→etiqueta es la única lógica nueva que introduce este componente; no valida ni transiciona el estado (eso sigue viviendo en la capa de casos de uso ya existente) |
| `label` (opcional) | string                                                                                          | Override del texto mostrado, para casos donde la etiqueta visible difiere del valor crudo de `estado`                                                                                                                                                                                    |

**Garantía**: por construcción, dos pantallas que muestran el mismo `status` con `StatusChip` son visualmente idénticas (SC-003) — no es posible que diverjan sin modificar el componente compartido.

## Contrato de acciones por fila (patrón, no necesariamente un componente único)

- Cada acción se renderiza como `IconButton` envuelto en `Tooltip` (texto de ayuda = `aria-label`), siempre visible (sin hide/reveal por hover).
- La fila usa el prop `hover` nativo de MUI (`TableRow hover`) como señal de fila activa.
- Este contrato ya está implementado y validado en `UsuariosClient.tsx` — las pantallas migradas (`ClientesClient`, `ClienteDetalleClient`, listado de Contactos) deben igualarlo, no reinterpretarlo.

## No-objetivos de este contrato

- No define un contrato de red/API — no hay endpoints ni payloads involucrados en esta feature.
- No cambia el contrato de ninguna Server Action ni función RPC de Supabase ya existente (FR-014).
