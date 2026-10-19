// Generador de contraseñas temporales con aleatoriedad criptográfica.
// Se excluyen caracteres que se confunden al dictarlos (0, O, 1, l, I).
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*-_=+?";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

// Devuelve un índice aleatorio entre 0 y max - 1.
function randomIndex(max: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] % max;
}

// Elige un carácter de la lista indicada.
function pick(chars: string): string {
  return chars.charAt(randomIndex(chars.length));
}

// Genera una contraseña con mayúscula, minúscula, número y símbolo garantizados.
export function generateTemporaryPassword(length = 14): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: length - required.length }, () => pick(ALL));
  const chars = [...required, ...rest];

  // Mezcla Fisher-Yates para que los caracteres obligatorios no queden siempre al inicio.
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join("");
}
