// Texto de la vigencia de una promoción, en español. Ej.: "Del 3 al 5 de noviembre de 2026".
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function parts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day, monthName: MONTHS[month - 1] };
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatRange(startsOn: string, endsOn: string) {
  const a = parts(startsOn);
  const b = parts(endsOn);
  if (startsOn === endsOn) return `El ${a.day} de ${a.monthName} de ${a.year}`;
  if (a.year !== b.year) {
    return `Del ${a.day} de ${a.monthName} de ${a.year} al ${b.day} de ${b.monthName} de ${b.year}`;
  }
  if (a.month !== b.month) {
    return `Del ${a.day} de ${a.monthName} al ${b.day} de ${b.monthName} de ${a.year}`;
  }
  return `Del ${a.day} al ${b.day} de ${a.monthName} de ${a.year}`;
}

function formatWeekdays(weekdays: number[]) {
  const days = WEEK_ORDER.filter((day) => weekdays.includes(day));
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) {
    return "De lunes a viernes";
  }
  const names = days.map((day) => DAYS[day]);
  if (names.length <= 1) return capitalize(names[0] ?? "");
  return capitalize(`${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`);
}

export function formatPromotionSchedule(row: {
  schedule_mode: string;
  starts_on: string | null;
  ends_on: string | null;
  weekdays: number[];
}): string {
  if (row.schedule_mode === "range") {
    return row.starts_on && row.ends_on ? formatRange(row.starts_on, row.ends_on) : "";
  }
  return formatWeekdays(row.weekdays);
}
