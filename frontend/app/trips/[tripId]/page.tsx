import { Suspense } from "react";

import { TripPage } from "@pages/trips";

async function TripContent({ params }: PageProps<"/trips/[tripId]">) {
  const { tripId } = await params;
  return <TripPage tripId={Number(tripId)} />;
}

export default function Trip(props: PageProps<"/trips/[tripId]">) {
  return (
    <Suspense fallback={<p role="status">Загружаем поездку…</p>}>
      <TripContent {...props} />
    </Suspense>
  );
}
