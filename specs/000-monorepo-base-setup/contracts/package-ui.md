# Contract: packages/ui

**Package**: `@control-contable/ui`
**Type**: Runtime — React components
**Purpose**: Componentes de interfaz compartidos basados en Material UI, consumibles por ambas apps

---

## Estado en Esta Feature

En la feature de infraestructura base, `packages/ui` establece la **estructura y configuraciones** del paquete pero **no define componentes de negocio**. Los componentes se agregarán en features de módulos de negocio.

```typescript
// packages/ui/src/index.ts (infraestructura base)
// Vacío — listo para recibir componentes
export {}
```

---

## Punto de Entrada Público

```typescript
// packages/ui/src/index.ts (estructura esperada en features posteriores)
export * from './components/Button'
export * from './components/DataTable'
export * from './components/Form'
export * from './components/Layout'
// ... más componentes según se definan
```

---

## Convenciones de Componentes

### Estructura de un componente

```text
packages/ui/src/components/[ComponentName]/
├── [ComponentName].tsx          # Implementación del componente
├── [ComponentName].types.ts     # Props y tipos del componente
└── index.ts                     # Re-exporta el componente y sus tipos
```

### Convenciones de Props

```typescript
// Patrón esperado para todos los componentes de packages/ui
interface ComponentNameProps {
  // Props requeridas primero
  children?: React.ReactNode
  // Props de estilo opcionales al final
  className?: string
  sx?: SxProps<Theme> // Material UI sx prop para personalización
}
```

### Reglas de Componentes

1. Cada componente es un **export nombrado** — sin default exports
2. Los componentes **no** importan de las apps (`apps/*`)
3. Los componentes **pueden** importar de `@control-contable/types` y `@control-contable/utils`
4. Los componentes **no** contienen lógica de negocio — solo presentación
5. Los componentes son **accesibles**: atributos ARIA cuando aplica
6. Los componentes son **responsive**: funcionales en pantallas desde 320px
7. **Confirmaciones**: los componentes para operaciones destructivas incluyen diálogos de confirmación

---

## Configuración del Paquete

### `packages/ui/package.json`

```json
{
  "name": "@control-contable/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "react": "^19",
    "react-dom": "^19",
    "@mui/material": "^6",
    "@emotion/react": "^11",
    "@emotion/styled": "^11"
  },
  "devDependencies": {
    "@control-contable/config": "workspace:*",
    "@control-contable/types": "workspace:*",
    "typescript": "^5"
  }
}
```

**Nota sobre `main` y `types`**: En el monorepo con Turborepo, los paquetes se consumen directamente desde `src/` (sin build previo) gracias a la resolución por workspace. Next.js transpila los paquetes internos mediante `transpilePackages` en `next.config.ts`.

### `apps/portal/next.config.ts` (referencia)

```typescript
const nextConfig = {
  transpilePackages: ['@control-contable/ui', '@control-contable/utils'],
}
export default nextConfig
```

---

## Cómo Consumir

```typescript
// En apps/portal o apps/admin
import { Button, DataTable } from '@control-contable/ui'
```

---

## Reglas de Contrato

1. `packages/ui` solo puede tener `react`, `react-dom`, y `@mui/*` como `peerDependencies`
2. Los paquetes de MUI se marcan como `peerDependencies` para evitar múltiples instancias en bundle
3. Un componente de `packages/ui` **nunca** hace llamadas a la BD o APIs externas
4. Los componentes no manejan estado de servidor — son componentes de cliente React puros
5. La personalización se hace mediante MUI `sx` prop o el sistema de temas, no con CSS personalizado ad-hoc
