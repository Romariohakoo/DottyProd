import { Suspense } from "react";

import { TripPage } from "@pages/trips";
import { StatusMessage } from "@shared/ui";

async function TripContent({ params }: PageProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  return <TripPage tripId={Number(tripId)} />;
}

export default function Trip(props: PageProps<"/trips/[tripId]">) {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="m3-page">
          <StatusMessage loading>Загружаем поездку…</StatusMessage>
        </main>
      }
    >
      <TripContent {...props} />
    </Suspense>
  );
}
