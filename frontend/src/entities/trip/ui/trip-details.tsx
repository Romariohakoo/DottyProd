import { formatDate } from "@shared/lib";

import type { TripDetail } from "../model";

interface TripDetailsProps {
  detail: TripDetail;
}

export function TripDetails({ detail }: TripDetailsProps) {
  const { trip } = detail;
  return (
    <div className="grid min-w-0 gap-4">
      <section className="m3-surface">
        <h2 className="m3-title">О поездке</h2>
        <dl className="m3-details mt-4">
          <div className="m3-detail-row">
            <dt>Название</dt>
            <dd>{trip.title}</dd>
          </div>
          <div className="m3-detail-row">
            <dt>Страна</dt>
            <dd>{trip.country}</dd>
          </div>
          <div className="m3-detail-row">
            <dt>Начало</dt>
            <dd>
              <time dateTime={trip.startDate}>
                {formatDate(trip.startDate)}
              </time>
            </dd>
          </div>
          <div className="m3-detail-row">
            <dt>Окончание</dt>
            <dd>
              <time dateTime={trip.endDate}>{formatDate(trip.endDate)}</time>
            </dd>
          </div>
          <div className="m3-detail-row">
            <dt>Описание</dt>
            <dd className="whitespace-pre-wrap">
              {trip.description ?? "Не указано"}
            </dd>
          </div>
          <div className="m3-detail-row">
            <dt>Обложка</dt>
            <dd>{trip.coverUrl ?? "Не указана"}</dd>
          </div>
        </dl>
      </section>
      <section className="m3-surface">
        <h2 className="m3-title">Информация о поездке</h2>
        <dl className="m3-details mt-4">
          <div className="m3-detail-row">
            <dt>Изменена</dt>
            <dd>
              <time dateTime={trip.updatedAt}>
                {formatDate(trip.updatedAt)}
              </time>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
