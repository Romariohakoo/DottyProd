import { Suspense } from "react";

import { TripsPage } from "@pages/trips";
import { StatusMessage } from "@shared/ui";

export default function Trips() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="m3-page">
          <StatusMessage loading>Загружаем поездки…</StatusMessage>
        </main>
      }
    >
      <TripsPage />
    </Suspense>
  );
}
