# Quickstart de validación: Layout Principal del Portal

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Valida las tres historias de usuario contra un Supabase local (CLI: `supabase start`) con al menos una cuenta de personal por cada rol ya creada (ver `specs/003-supabase-auth-roles/quickstart.md` para sembrar cuentas si hace falta). No sustituye `tasks.md`.

## Prerrequisitos

- `supabase start` corriendo y saludable.
- Al menos una cuenta activa por cada rol de personal (Administrador, Contador, Auxiliar) — reutilizables de la feature `003-supabase-auth-roles`.
- `apps/portal` corriendo (`pnpm dev`) con `.env.local` apuntando al Supabase usado en esta validación.

## Historia 1 — Navegación y perfil visibles en todo el portal

1. Iniciar sesión en `apps/portal` con cualquiera de las 3 cuentas de personal.
   - **Esperado**: se ve el menú de navegación y el avatar de perfil (nombre y rol) en un lugar consistente de la pantalla (Acceptance Scenario 1).
2. Navegar entre las páginas disponibles del portal (las que ya existan dentro del route group `(app)`).
   - **Esperado**: el menú y el avatar permanecen visibles e idénticos en cada una (SC-001).
3. Con una cuenta cuyo `full_name` sea `NULL` en `profiles`, iniciar sesión.
   - **Esperado**: el avatar muestra un valor de reemplazo razonable (inicial del correo), no un espacio vacío o roto (Acceptance Scenario 2).
4. Cargar el portal en una ventana angosta (o con las herramientas de desarrollo del navegador en modo móvil).
   - **Esperado**: el menú colapsa a un patrón utilizable (drawer temporal/hamburguesa), sin overflow horizontal (Acceptance Scenario 3, FR-009).
5. Navegar a una página cuyo módulo tenga entrada en el menú (p. ej. "Clientes") y observar esa entrada.
   - **Esperado**: se distingue visualmente del resto (acento de color + borde lateral o fondo con tinte, no solo el color de texto) — Acceptance Scenario 5, FR-011.
6. Con el mismo estado, inspeccionar la entrada activa con las herramientas de accesibilidad del navegador (o un lector de pantalla) y navegar el menú con Tab.
   - **Esperado**: la entrada activa expone `aria-current="page"`; cada entrada interactiva muestra un anillo de foco visible de 2px al recibir el foco por teclado (Acceptance Scenario 5, FR-012).

**Objetivo de tiempo**: identificar con qué cuenta se inició sesión (nombre/rol visibles) debe tomar menos de 5 segundos desde que carga la página (SC-002).

## Historia 2 — Cerrar sesión desde cualquier página

1. Con una sesión activa en cualquier página del portal, usar el control de cierre de sesión del layout (menú del avatar).
   - **Esperado**: la sesión termina de inmediato y el usuario es redirigido a `/login` (Acceptance Scenario 1) — cronometrar desde el primer clic hasta ver la pantalla de login (SC-003, ≤ 2 interacciones).
2. Con la sesión ya cerrada, usar el botón "atrás" del navegador para intentar volver a una página protegida del portal.
   - **Esperado**: el sistema redirige de nuevo a `/login`, sin mostrar contenido protegido (Acceptance Scenario 2, SC-004).

## Historia 3 — El menú refleja lo que el usuario puede usar

1. Iniciar sesión con una cuenta Administrador y con una cuenta Contador/Auxiliar, y comparar las entradas de menú visibles para cada una.
   - **Esperado**: "Clientes" (`capability: 'manage_clients'`) y, tras los ajustes pendientes de FR-007, "Cobranza" (`view_billing`) y "Documentos Fiscales" (`view_documents`) se ocultan para cualquier rol que no tenga esa capacidad efectiva; "Obligaciones Fiscales" (sin `capability` todavía) y "Inicio" se ven igual para los 3 roles (Acceptance Scenario 1, FR-006/FR-007).
2. Intentar hacer clic en una entrada de menú marcada "próximamente".
   - **Esperado**: no navega a ninguna parte ni produce un error (edge case de `spec.md`).

## Referencias

- Extensión de `CurrentProfile`: [contracts/package-api.md](./contracts/package-api.md)
- Contrato del menú de navegación: [contracts/navigation.md](./contracts/navigation.md)
- Entidades y estructuras: [data-model.md](./data-model.md)
- Decisiones técnicas: [research.md](./research.md)
