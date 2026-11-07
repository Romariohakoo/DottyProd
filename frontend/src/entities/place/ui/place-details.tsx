import type { Place } from "../model";

interface PlaceDetailsProps {
  place: Place;
}

export function PlaceDetails({ place }: PlaceDetailsProps) {
  return (
    <section className="m3-form" aria-label="Детали места">
      <div className="m3-surface bg-secondary-container text-on-secondary-container">
        <p className="m3-label">Место</p>
        <h3 className="m3-title mt-3">{place.name}</h3>
      </div>
      <dl className="m3-details">
        <div className="m3-detail-row">
          <dt>Название</dt>
          <dd>{place.name}</dd>
        </div>
        <div className="m3-detail-row">
          <dt>Адрес</dt>
          <dd>{place.address ?? "Не указан"}</dd>
        </div>
        <div className="m3-detail-row">
          <dt>Широта</dt>
          <dd>{place.latitude}</dd>
        </div>
        <div className="m3-detail-row">
          <dt>Долгота</dt>
          <dd>{place.longitude}</dd>
        </div>
      </dl>
    </section>
  );
}
