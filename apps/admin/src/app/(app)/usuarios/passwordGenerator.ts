import { randomInt } from 'node:crypto'

/**
 * Genera una contraseña temporal criptográficamente aleatoria (FR-008): un
 * Administrador nunca la escribe, solo la entrega ya generada. Incluye al
 * menos un carácter de cada clase para pasar cualquier política de fuerza
 * mínima, sin depender de un proveedor de correo electrónico (research.md
 * #10). Vive fuera de `actions.ts` porque un archivo `'use server'` exige que
 * todas sus exportaciones sean funciones async — esta es pura y síncrona.
 */
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%^&*-_+='
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS
const PASSWORD_LENGTH = 16

function pickRandomChar(charset: string): string {
  return charset[randomInt(charset.length)] as string
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j] as string, chars[i] as string]
  }
  return chars
}

export function generateTemporaryPassword(): string {
  const required = [
    pickRandomChar(LOWERCASE),
    pickRandomChar(UPPERCASE),
    pickRandomChar(DIGITS),
    pickRandomChar(SYMBOLS),
  ]
  const rest = Array.from({ length: PASSWORD_LENGTH - required.length }, () =>
    pickRandomChar(ALL_CHARS),
  )
  return shuffle([...required, ...rest]).join('')
}
