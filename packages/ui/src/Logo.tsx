/**
 * Marcador de posición para el logotipo real del despacho (FR-017,
 * specs/003-supabase-auth-roles). Un SVG simple renderizado directamente —
 * sin depender de un archivo de imagen externo — para no mostrar un ícono de
 * imagen rota mientras no exista el logotipo definitivo. Sustituirlo por el
 * logotipo real no debería requerir cambios en quienes lo consumen
 * (LoginForm, MainLayoutClient de apps/portal), solo el contenido de este
 * componente.
 */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Logotipo del despacho"
    >
      <rect width="40" height="40" rx="8" fill="#1565c0" />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="sans-serif"
      >
        CC
      </text>
    </svg>
  )
}
