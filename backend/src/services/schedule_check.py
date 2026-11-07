from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from src.schemas.travel import EventOverlap, ScheduleGap, ScheduleIssues, TripOverlap, TripScheduleIssues

GAP_LIMIT = timedelta(hours=1, minutes=30)


@dataclass(frozen=True, slots=True)
class TripInterval:
    id: int
    start_date: date
    end_date: date


@dataclass(frozen=True, slots=True)
class EventInterval:
    id: int
    start_at: datetime
    end_at: datetime | None


def find_schedule_issues(
    trips: Sequence[TripInterval],
    events_by_trip: Mapping[int, Sequence[EventInterval]],
) -> ScheduleIssues:
    ordered = sorted(trips, key=lambda trip: trip.id)
    trip_overlaps = _trip_overlaps(ordered)
    trip_issues = []
    for trip in ordered:
        overlaps, gaps = _event_issues(events_by_trip.get(trip.id, ()))
        if overlaps or gaps:
            trip_issues.append(
                TripScheduleIssues(trip_id=trip.id, event_overlaps=overlaps, gaps=gaps)
            )
    return ScheduleIssues(trip_overlaps=trip_overlaps, trips=trip_issues)


def _trip_overlaps(trips: Sequence[TripInterval]) -> list[TripOverlap]:
    overlaps = []
    for index, left in enumerate(trips):
        for right in trips[index + 1 :]:
            if left.start_date <= right.end_date and right.start_date <= left.end_date:
                overlaps.append(TripOverlap(left_trip_id=left.id, right_trip_id=right.id))
    return overlaps


def _event_issues(
    events: Sequence[EventInterval],
) -> tuple[list[EventOverlap], list[ScheduleGap]]:
    ordered = sorted(events, key=lambda event: (event.start_at, event.id))
    overlaps = []
    for index, left in enumerate(ordered):
        for right in ordered[index + 1 :]:
            if _overlaps(left, right):
                first, second = sorted((left.id, right.id))
                overlaps.append(EventOverlap(left_event_id=first, right_event_id=second))

    gaps: list[ScheduleGap] = []
    if not ordered:
        return overlaps, gaps
    coverage_end = _end(ordered[0])
    coverage_event_id = ordered[0].id
    for event in ordered[1:]:
        event_end = _end(event)
        if event.start_at > coverage_end:
            gap = event.start_at - coverage_end
            if gap > GAP_LIMIT:
                gaps.append(
                    ScheduleGap(
                        after_event_id=coverage_event_id,
                        before_event_id=event.id,
                        gap_seconds=int(gap.total_seconds()),
                    )
                )
            coverage_end = event_end
            coverage_event_id = event.id
        elif event_end > coverage_end:
            coverage_end = event_end
            coverage_event_id = event.id
    return overlaps, gaps


def _end(event: EventInterval) -> datetime:
    if event.end_at is None:
        return event.start_at
    return event.end_at


def _overlaps(left: EventInterval, right: EventInterval) -> bool:
    left_end = _end(left)
    right_end = _end(right)
    left_point = left_end == left.start_at
    right_point = right_end == right.start_at
    if left_point and right_point:
        return left.start_at == right.start_at
    if left_point:
        return right.start_at <= left.start_at < right_end
    if right_point:
        return left.start_at <= right.start_at < left_end
    return left.start_at < right_end and right.start_at < left_end
