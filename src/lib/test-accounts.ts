// Credenciales públicas del recorrido local; no representan usuarios de Supabase.
export const testAccounts = [
  { label: "Admin", email: "admin@ejemplo.com", password: "AdminPrueba123!", role: "admin" },
  {
    label: "Propietario",
    email: "propietario@ejemplo.com",
    password: "PropietarioPrueba123!",
    role: "propietario",
  },
] as const;

// Exige el correo y la contraseña de la misma cuenta antes de deducir su rol.
export function findTestAccount(email: string, password: string) {
  return testAccounts.find(
    (account) => account.email === email.trim().toLowerCase() && account.password === password,
  );
}
