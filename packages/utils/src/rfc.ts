const RFC_PERSONA_MORAL = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/
const RFC_PERSONA_FISICA = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/

export function esRfcValido(rfc: string): boolean {
  const normalizado = rfc.trim().toUpperCase()
  return RFC_PERSONA_MORAL.test(normalizado) || RFC_PERSONA_FISICA.test(normalizado)
}
