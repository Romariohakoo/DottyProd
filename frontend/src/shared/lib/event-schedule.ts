import type { EventDto, TripDto } from "@shared/api";

export function getEventScheduleError(
  startAt: string,
  endAt: string,
  trip: Pick<TripDto, "startDate" | "endDate">,
  events: EventDto[],
  excludedEventId?: number,
): string | undefined {
  if (!startAt) return;
  const start = Date.parse(startAt);
  const end = endAt ? Date.parse(endAt) : start;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return "Укажите корректные дату и время события.";
  }
  if (end < start) return "Окончание не может быть раньше начала.";
  const tripStart = Date.parse(`${trip.startDate}T00:00:00`);
  const tripEnd = new Date(`${trip.endDate}T00:00:00`);
  tripEnd.setDate(tripEnd.getDate() + 1);
  if (
    start < tripStart ||
    start >= tripEnd.getTime() ||
    end >= tripEnd.getTime()
  ) {
    return "Событие должно целиком находиться в датах поездки.";
  }
  for (const event of events) {
    if (event.id === excludedEventId) continue;
    const otherStart = Date.parse(event.startAt);
    const otherEnd = event.endAt ? Date.parse(event.endAt) : otherStart;
    // Intervals are half-open; events without duration occupy one instant.
    const overlaps =
      start === end
        ? otherStart === otherEnd
          ? start === otherStart
          : otherStart <= start && start < otherEnd
        : otherStart === otherEnd
          ? start <= otherStart && otherStart < end
          : start < otherEnd && otherStart < end;
    if (overlaps)
      return `Время пересекается с событием «${event.title}». Выберите другой промежуток.`;
  }
}
