# Quickstart: Validación de la Infraestructura Base

**Feature**: 000-monorepo-base-setup | **Date**: 2026-07-13

Esta guía describe cómo validar que la infraestructura base del monorepo funciona correctamente end-to-end, sin documentar la implementación en detalle.

---

## Prerrequisitos

Antes de validar, asegúrate de tener instalado:

- Node.js 20 LTS (`node --version` → `v20.x.x`)
- pnpm 9.x (`pnpm --version` → `9.x.x`)
- Docker Desktop corriendo (`docker info` sin errores)
- Supabase CLI (`supabase --version` → `2.x.x`)
- Git configurado con usuario y email

---

## Escenario 1: Instalación Inicial (FR-001, SC-001)

**Objetivo**: Verificar que un desarrollador nuevo puede configurar el entorno desde cero en <15 minutos.

**Pasos**:

```bash
# 1. Clonar el repositorio
git clone <repository-url> control-contable
cd control-contable

# 2. Instalar dependencias (debe completar sin errores)
pnpm install

# 3. Configurar variables de entorno
cp apps/portal/.env.local.example apps/portal/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
# Editar los archivos .env.local con las credenciales locales de Supabase
```

**Resultado esperado**:

- `pnpm install` completa sin errores
- Todos los paquetes internos (`@control-contable/*`) se resuelven correctamente
- Los archivos `.env.local.example` existen y están documentados
- El proceso total toma menos de 5 minutos en una conexión de internet estándar

---

## Escenario 2: Inicio del Entorno Local (FR-006, SC-001)

**Objetivo**: Verificar que el stack local completo arranca con un solo conjunto de comandos.

**Pasos**:

```bash
# 1. Iniciar Supabase local
supabase start
# Esperar a que muestre las URLs y keys locales

# 2. Copiar las keys generadas a los archivos .env.local de ambas apps
# supabase status muestra las keys si se necesitan de nuevo

# 3. Iniciar las aplicaciones
pnpm dev
```

**Resultado esperado**:

- Supabase muestra URLs y API keys locales sin errores Docker
- El portal está disponible en `http://localhost:3000` (o el puerto configurado)
- El panel admin está disponible en `http://localhost:3001` (o el puerto configurado)
- Ambas apps muestran su página inicial sin errores en consola relacionados a conexión de BD

**Verificación adicional**:

```bash
supabase status
# Debe mostrar: API URL, anon key, service_role key, DB URL
```

---

## Escenario 3: Cambios en Paquetes Compartidos (FR-009, SC-003)

**Objetivo**: Verificar que los cambios en un paquete compartido se reflejan automáticamente en ambas apps en <5 segundos.

**Pasos** (con `pnpm dev` corriendo):

```bash
# 1. Editar un archivo en packages/types/src/index.ts
# Agregar un comentario o un tipo de ejemplo

# 2. Observar la consola de pnpm dev
# Ambas apps deben mostrar hot reload
```

**Resultado esperado**:

- El hot reload se activa en ambas apps en menos de 5 segundos
- No se requiere reiniciar `pnpm dev` manualmente
- No hay errores de compilación en la consola

---

## Escenario 4: Verificaciones de Calidad en Commit (FR-004, SC-002)

**Objetivo**: Verificar que los hooks de git bloquean commits con código inválido.

**Pasos — prueba de bloqueo**:

```bash
# 1. Crear un archivo con error de formato intencional
echo "const x = 1" > packages/utils/src/test-temp.ts  # Sin punto y coma (según config)

# 2. Intentar commitear
git add packages/utils/src/test-temp.ts
git commit -m "test: archivo con formato incorrecto"
```

**Resultado esperado (bloqueo)**:

- El commit es rechazado
- El mensaje de error identifica el archivo y el problema
- El archivo queda en staging listo para corrección

**Pasos — prueba de éxito**:

```bash
# 1. Corregir y eliminar el archivo temporal
git restore --staged packages/utils/src/test-temp.ts
rm packages/utils/src/test-temp.ts
git add -A
```

---

## Escenario 5: Protección de Variables de Entorno (FR-005, SC-005)

**Objetivo**: Verificar que no es posible commitear archivos de credenciales.

**Pasos**:

```bash
# 1. Intentar agregar un archivo .env.local al staging
git add apps/portal/.env.local 2>&1

# 2. Verificar que el .gitignore lo excluye
git status
```

**Resultado esperado**:

- `git add apps/portal/.env.local` no agrega el archivo (el .gitignore lo excluye)
- `git status` no muestra el archivo `.env.local` como tracked

**Verificación adicional**:

```bash
# Confirmar que .env.local.example SÍ está en el repositorio
git show HEAD:apps/portal/.env.local.example  # Debe mostrar contenido
```

---

## Escenario 6: Verificación de Tipos (FR-010, SC-006)

**Objetivo**: Verificar que los errores de tipos se detectan antes de integrar cambios.

**Pasos**:

```bash
# Ejecutar verificación de tipos en todo el monorepo
pnpm type-check
```

**Resultado esperado**:

- Comando completa sin errores en el código de infraestructura base
- Si hay errores, se muestran con archivo, línea y descripción del problema

---

## Escenario 7: Pipeline de CI (FR-007, SC-004)

**Objetivo**: Verificar que el pipeline de CI ejecuta correctamente.

**Pasos**:

```bash
# Simular localmente lo que ejecuta el CI
pnpm install --frozen-lockfile
pnpm lint
pnpm type-check
pnpm build
```

**Resultado esperado**:

- Todos los comandos completan sin errores
- El tiempo total de ejecución local es indicativo del tiempo de CI (CI típicamente toma 2-3x más por overhead de setup)
- El build de ambas apps genera los artefactos en sus carpetas `.next/`

---

## Escenario 8: Extensibilidad del Monorepo (FR-011, SC-007)

**Objetivo**: Verificar que agregar un nuevo paquete no requiere cambios en la configuración global.

**Pasos de verificación** (conceptual — no requiere crear el paquete):

1. Verificar que `pnpm-workspace.yaml` incluye `packages/*` (detecta nuevos paquetes automáticamente)
2. Verificar que `turbo.json` define tareas genéricas que aplican a cualquier paquete
3. Verificar que la config de ESLint y TypeScript se puede extender desde cualquier nuevo paquete

**Resultado esperado**:

- Un nuevo directorio en `packages/new-package` con el `package.json` correcto es detectado automáticamente por pnpm workspaces
- No se requiere modificar `turbo.json`, `pnpm-workspace.yaml`, ni `package.json` raíz

---

## Referencias

- Grafo de dependencias entre paquetes: [data-model.md](./data-model.md)
- APIs de cada paquete: [contracts/](./contracts/)
- Decisiones técnicas: [research.md](./research.md)
- Plan de implementación completo: [plan.md](./plan.md)
