// Presenta la página provisional mientras se definen las vistas de padmin.
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section
        className="w-full max-w-xl rounded-3xl border border-brand/15 bg-white p-8 shadow-sm"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">
          Panamá Viajero
        </p>
        <h1 className="mt-4 text-5xl font-bold text-brand">padmin</h1>
        <p className="mt-5 leading-7 text-slate-600">
          El espacio para gestionar Panamá Viajero está en preparación.
        </p>
      </section>
    </main>
  );
}
