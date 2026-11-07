import { Suspense } from "react";

import { TripsPage } from "@pages/trips";

export default function Trips() {
  return (
    <Suspense fallback={<p role="status">Загружаем поездки…</p>}>
      <TripsPage />
    </Suspense>
  );
}
