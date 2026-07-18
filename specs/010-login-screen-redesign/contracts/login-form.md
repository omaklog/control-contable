# Contract: `LoginForm` (`packages/ui/src/LoginForm.tsx`)

Contrato del componente compartido, consumido sin cambios por `apps/admin/src/app/login/page.tsx` y `apps/portal/src/app/login/page.tsx`.

## Props (sin cambios respecto a la versión actual)

| Prop        | Tipo                                                   | Contrato                                                                                                                                       |
| ----------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`     | `string`                                               | Texto mostrado en el panel de formulario (ya existente, distinto por app)                                                                      |
| `onSubmit`  | `(values: LoginFormValues) => Promise<string \| null>` | Debe devolver un mensaje de error genérico o `null` en éxito (FR-010, `003-supabase-auth-roles` FR-012) — sin cambios de firma ni de semántica |
| `onSuccess` | `() => void`                                           | Se invoca tras un `onSubmit` exitoso — sin cambios                                                                                             |

**Garantía**: ninguna página consumidora necesita cambios de código para adoptar el rediseño — mismo import, mismas props, mismo comportamiento de envío/errores/redirección.

## Estructura visual (nuevo, interno al componente)

- **Panel de formulario**: logo, `title`, alertas de error (`Alert severity="error"`, sin cambios), campo de correo con icono, campo de contraseña con icono + control de mostrar/ocultar ya existente, botón de envío con icono.
- **Panel de marca/valor**: visible solo en pantallas ≥ `sm` (mismo breakpoint que `MainLayoutClient`, research.md #4); logo + mensaje de valor institucional estático (research.md #2); construido exclusivamente con `theme.palette`/`theme.typography`/`theme.shape` — cero valores de color/tipografía/radio locales (FR-002).
- En pantallas < `sm`, el panel de marca/valor no se renderiza (o se apila sin recortar el formulario) — el formulario ocupa el ancho completo (FR-004).

## Contrato de `Logo` (`packages/ui/src/Logo.tsx`)

| Prop   | Tipo                | Contrato    |
| ------ | ------------------- | ----------- |
| `size` | `number` (opcional) | Sin cambios |

**Cambio de contrato interno**: el color de fondo del logo (`fill` del `<rect>`) deja de ser el literal `#1565c0` y pasa a leer `theme.palette.primary.main` en tiempo de render (research.md #3). No cambia la firma de props ni el marcado SVG externo (`viewBox`, `role`, `aria-label`).

## No-objetivos de este contrato

- No define un contrato de red/API — no hay endpoints ni payloads nuevos involucrados.
- No cambia el contrato de `supabase.auth.signInWithPassword` ni de la consulta a `profiles.is_active` ya usada en `apps/portal/src/app/login/page.tsx`.
