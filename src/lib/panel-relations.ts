// PostgREST devuelve una relación de muchos a uno como objeto, pero el tipado puede
// presentarla como arreglo. Este helper acepta ambas formas y devuelve un solo registro.
export function related<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
