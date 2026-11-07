export function formatDate(value: string): string {
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date.replaceAll("-", ".")
    : "Дата не указана";
}

export function formatDateTime(
  value: string,
  timeZone?: string,
  dateOnly = false,
): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Дата не указана";
  if (dateOnly) {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      timeZone,
    }).format(date);
  }
  const parts = new Intl.DateTimeFormat("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}.${part("month")}.${part("day")} ${part("hour")}:${part("minute")}`;
}
