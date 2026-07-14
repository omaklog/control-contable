# Contract: packages/types

**Package**: `@control-contable/types`
**Type**: Runtime + Type-only exports
**Purpose**: Tipos TypeScript compartidos entre todas las apps y paquetes del monorepo

---

## Punto de Entrada Público

```typescript
// packages/types/src/index.ts
export * from './database' // Tipos generados por Supabase CLI
export * from './domain' // Tipos de dominio del negocio
```

---

## Módulo: `database`

**Fuente**: Generado automáticamente por Supabase CLI

**Comando de generación**:

```bash
supabase gen types typescript --local > packages/types/src/database.ts
```

**Estructura generada** (referencia — el contenido real lo genera Supabase):

```typescript
export type Database = {
  public: {
    Tables: {/* tablas de la BD */}
    Views: {/* vistas */}
    Functions: {/* funciones */}
    Enums: {/* tipos enum */}
  }
}

// Helpers de conveniencia
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
```

**Nota**: En la feature de infraestructura base, el archivo `database.ts` existirá pero estará vacío o con estructura mínima. Se poblará al definir las migraciones de cada módulo de negocio.

---

## Módulo: `domain`

**Propósito**: Tipos de dominio del negocio que no dependen directamente del esquema de BD

**Estado en esta feature**: Estructura vacía, listo para recibir tipos en features de módulos

```typescript
// packages/types/src/domain/index.ts
// Vacío en infraestructura base
// Se poblará en: 002-module-clients, 003-module-billing, etc.
export {}
```

**Estructura prevista** (referencia para futuras features):

```typescript
// Ejemplo de tipos de dominio que se definirán más adelante:
// export type UserRole = 'admin' | 'contador' | 'auxiliar'
// export type ClientStatus = 'active' | 'inactive' | 'suspended'
// export type PaymentStatus = 'paid' | 'pending' | 'overdue'
```

---

## Cómo Consumir

```typescript
// En apps o paquetes que necesiten los tipos:
import type { Database, Tables } from '@control-contable/types'

// Tipo de una fila de una tabla
type Client = Tables<'clients'>

// Tipo completo de la base de datos (para el cliente de Supabase)
import { createClient } from '@supabase/supabase-js'
const supabase = createClient<Database>(url, key)
```

---

## Reglas de Contrato

1. `packages/types` **no** importa de ningún otro paquete interno del monorepo
2. Los tipos de BD se regeneran automáticamente al ejecutar `pnpm run generate:types` (script en raíz)
3. Los tipos generados **no** se editan manualmente — cualquier cambio se hace vía migración de BD
4. Los tipos de dominio son tipos de TypeScript puros — sin lógica, sin imports de librerías externas
5. Los tipos **siempre** se exportan nombrados (no default exports) para facilitar el tree-shaking y la búsqueda en IDE
