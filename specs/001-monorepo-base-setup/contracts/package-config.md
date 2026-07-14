# Contract: packages/config

**Package**: `@control-contable/config`
**Type**: DevDependency only — no runtime exports
**Purpose**: Configuraciones compartidas de ESLint, Prettier y TypeScript para todo el monorepo

---

## ESLint Config

### Archivo: `packages/config/eslint/index.js`

**Tipo**: ESLint 9 Flat Config

**Exporta**: Array de configuraciones ESLint aplicables a TypeScript y TypeScript+React

**Reglas base incluidas**:

| Regla                                              | Configuración | Razón                      |
| -------------------------------------------------- | ------------- | -------------------------- |
| `@typescript-eslint/no-explicit-any`               | `error`       | Prohibido por Constitución |
| `@typescript-eslint/explicit-function-return-type` | `warn`        | Mejora legibilidad         |
| `no-console`                                       | `warn`        | Evitar logs en producción  |
| `prefer-const`                                     | `error`       | Inmutabilidad por defecto  |
| `@typescript-eslint/no-unused-vars`                | `error`       | Sin variables muertas      |

**Cómo consumir en una app**:

```js
// apps/portal/eslint.config.js
import baseConfig from '@control-contable/config/eslint'
import nextPlugin from '@next/eslint-plugin-next'
export default [...baseConfig, { plugins: { '@next/next': nextPlugin } }]
```

**Cómo consumir en un package**:

```js
// packages/ui/eslint.config.js
import baseConfig from '@control-contable/config/eslint'
export default [...baseConfig]
```

---

## Prettier Config

### Archivo: `packages/config/prettier/index.js`

**Tipo**: Prettier Config Object

**Exporta**: Objeto de configuración Prettier

**Configuración base**:

| Opción          | Valor      | Razón                              |
| --------------- | ---------- | ---------------------------------- |
| `semi`          | `false`    | Consistencia (sin punto y coma)    |
| `singleQuote`   | `true`     | Consistencia con ecosistema React  |
| `printWidth`    | `100`      | Legible sin ser restrictivo        |
| `tabWidth`      | `2`        | Estándar del ecosistema JavaScript |
| `trailingComma` | `"all"`    | Minimiza diffs en git              |
| `arrowParens`   | `"always"` | Consistencia con TypeScript        |

**Cómo consumir**:

```js
// .prettierrc.js en raíz o en cualquier app/package
export { default } from '@control-contable/config/prettier'
```

---

## TypeScript Configs

### Archivo: `packages/config/typescript/base.json`

**Tipo**: `tsconfig.json` base (no se usa directamente, solo se extiende)

**Opciones críticas**:

| Opción                       | Valor       | Razón                               |
| ---------------------------- | ----------- | ----------------------------------- |
| `strict`                     | `true`      | Mandatado por Constitución          |
| `noUncheckedIndexedAccess`   | `true`      | Previene errores de acceso a arrays |
| `exactOptionalPropertyTypes` | `true`      | Tipos opcionales precisos           |
| `noImplicitOverride`         | `true`      | Claridad en herencia                |
| `moduleResolution`           | `"bundler"` | Óptimo para Next.js y Vite          |
| `module`                     | `"ESNext"`  | Módulos modernos                    |
| `target`                     | `"ES2022"`  | Target compatible con Node 20       |

### Archivo: `packages/config/typescript/nextjs.json`

**Extiende**: `./base.json`

**Opciones adicionales**:

| Opción    | Valor                               | Razón                                |
| --------- | ----------------------------------- | ------------------------------------ |
| `lib`     | `["dom", "dom.iterable", "esnext"]` | APIs de navegador para Next.js       |
| `jsx`     | `"preserve"`                        | Next.js maneja la transformación     |
| `plugins` | `[{ "name": "next" }]`              | Plugin de Next.js para type-checking |

**Cómo consumir**:

```json
// apps/portal/tsconfig.json
{
  "extends": "@control-contable/config/typescript/nextjs.json",
  "include": ["src/**/*", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

### Archivo: `packages/config/typescript/library.json`

**Extiende**: `./base.json`

**Para**: Paquetes compartidos sin acceso al DOM (packages/types, packages/utils)

| Opción           | Valor        | Razón                            |
| ---------------- | ------------ | -------------------------------- |
| `lib`            | `["esnext"]` | Sin APIs de DOM                  |
| `declaration`    | `true`       | Genera `.d.ts` para consumidores |
| `declarationMap` | `true`       | Source maps para tipos           |

**Cómo consumir**:

```json
// packages/utils/tsconfig.json
{
  "extends": "@control-contable/config/typescript/library.json",
  "include": ["src/**/*"]
}
```

---

## Reglas de Uso

1. **Nunca** copiar/duplicar configuraciones entre apps o paquetes — siempre extender desde `@control-contable/config`
2. **Siempre** agregar overrides de reglas locales en el archivo de configuración del consumidor, no en la config base
3. La config base representa el mínimo; los consumidores pueden añadir reglas más estrictas, nunca más permisivas sin justificación
