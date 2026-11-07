import type { TripDetail } from "../model";

interface TripDetailsProps {
  detail: TripDetail;
}

export function TripDetails({ detail }: TripDetailsProps) {
  const { trip, role } = detail;
  return (
    <dl className="grid gap-2 break-words text-sm">
      <dt className="text-foreground/70">ID</dt>
      <dd>{trip.id}</dd>
      <dt className="text-foreground/70">Название</dt>
      <dd>{trip.title}</dd>
      <dt className="text-foreground/70">Страна</dt>
      <dd>{trip.country}</dd>
      <dt className="text-foreground/70">Начало</dt>
      <dd>{trip.startDate}</dd>
      <dt className="text-foreground/70">Окончание</dt>
      <dd>{trip.endDate}</dd>
      <dt className="text-foreground/70">Описание</dt>
      <dd>{trip.description ?? "Не указано"}</dd>
      <dt className="text-foreground/70">Обложка</dt>
      <dd>{trip.coverUrl ?? "Не указана"}</dd>
      <dt className="text-foreground/70">Роль</dt>
      <dd>{role}</dd>
      <dt className="text-foreground/70">Создана</dt>
      <dd>{trip.createdAt}</dd>
      <dt className="text-foreground/70">Изменена</dt>
      <dd>{trip.updatedAt}</dd>
    </dl>
  );
}
