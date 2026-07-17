# Contract: packages/utils

**Package**: `@control-contable/utils`
**Type**: Runtime — Pure utility functions
**Purpose**: Funciones puras reutilizables sin dependencia del DOM o frameworks de UI

---

## Estado en Esta Feature

En la feature de infraestructura base, `packages/utils` establece la estructura del paquete pero **no define utilidades de negocio**. Las utilidades se agregarán según las necesidades de cada módulo.

```typescript
// packages/utils/src/index.ts (infraestructura base)
export {}
```

---

## Estructura Prevista (referencia para features posteriores)

```text
packages/utils/src/
├── date/
│   ├── format.ts          # Formateo de fechas para el mercado mexicano
│   └── index.ts
├── format/
│   ├── currency.ts        # Formateo de moneda (MXN)
│   ├── rfc.ts             # Formateo y validación de RFC
│   └── index.ts
├── validation/
│   ├── rfc.ts             # Validación de RFC
│   ├── curp.ts            # Validación de CURP
│   └── index.ts
└── index.ts               # Re-exporta todo
```

---

## Reglas de Funciones en packages/utils

### Funciones puras

Todas las utilidades deben ser funciones puras (sin efectos secundarios):

```typescript
// ✅ Correcto — función pura
export function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount)
}

// ❌ Incorrecto — tiene efecto secundario
export function formatAndSaveAmount(amount: number): string {
  localStorage.setItem('lastAmount', String(amount)) // No permitido
  return String(amount)
}
```

### Sin dependencias de DOM o frameworks

```typescript
// ✅ Correcto
import type { SomeType } from '@control-contable/types'

// ❌ Incorrecto
import { useState } from 'react' // No permitido en utils
import { Button } from '@mui/material' // No permitido en utils
```

---

## Configuración del Paquete

### `packages/utils/package.json`

```json
{
  "name": "@control-contable/utils",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@control-contable/types": "workspace:*"
  },
  "devDependencies": {
    "@control-contable/config": "workspace:*",
    "typescript": "^5"
  }
}
```

---

## Cómo Consumir

```typescript
// En apps, packages/ui, o cualquier otra parte del monorepo
import { formatCurrency, validateRFC } from '@control-contable/utils'

const display = formatCurrency(1500.5) // "$1,500.50"
const isValid = validateRFC('VECJ880326XXX') // true
```

---

## Reglas de Contrato

1. `packages/utils` **no** importa de `packages/ui` ni de las apps
2. Solo puede depender de `packages/types` (para tipos) y de la librería estándar de JavaScript
3. Todas las funciones son **exportadas con nombre** (sin default exports)
4. Las funciones son **testeables de forma unitaria** sin necesidad de contexto de browser o servidor
5. Las funciones deben tener **tipos explícitos** en parámetros y valor de retorno (TypeScript strict)
6. Las funciones **no** lanzan excepciones por inputs inválidos — retornan `null` o `undefined` tipado en su lugar, o usan el patrón `Result<T, E>` para errores esperados
