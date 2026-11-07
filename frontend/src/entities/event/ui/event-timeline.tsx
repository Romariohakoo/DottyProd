"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button, DateTimeText, Dialog, FormField } from "@shared/ui";

import type { Event } from "../model";

interface EventTimelineProps {
  events: Event[];
  startDate: string;
  endDate: string;
  isPopupOpen: boolean;
  onSelect?: (eventId: number) => void;
}

const LABEL_WIDTH = 160;
const LABEL_HEIGHT = 48;
const LABEL_GAP = 16;
const TARGET_SIZE = 48;
const PADDING = 96;
const DAY_WIDTH = 240;
const DAY_MS = 86_400_000;
const subscribe = () => () => {};

export function EventTimeline({
  events,
  startDate,
  endDate,
  isPopupOpen,
  onSelect,
}: EventTimelineProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scaleParam = searchParams?.get("timeline-scale");
  const scaleValue = Number(scaleParam);
  const zoom =
    scaleParam &&
    Number.isInteger(scaleValue) &&
    scaleValue >= 50 &&
    scaleValue <= 300 &&
    scaleValue % 25 === 0
      ? scaleValue
      : 100;
  const headingId = useId();
  const scrollId = useId();
  const zoomId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const zoomScrollRef = useRef<number | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    scrollLeft: number;
    dragged: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [scrollable, setScrollable] = useState({ left: false, right: false });
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedEvent = events.find((event) => event.id === selectedId);
  const sortedEvents = [...events].sort(
    (left, right) =>
      new Date(left.startAt).getTime() - new Date(right.startAt).getTime() ||
      left.id - right.id,
  );
  // Match DateTimeText's UTC server snapshot before using local calendar days.
  const firstDay = new Date(`${startDate}T00:00:00${isClient ? "" : "Z"}`);
  const dayCount =
    Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS) + 1;
  const days = Array.from({ length: dayCount + 1 }, (_, index) => {
    const day = new Date(firstDay);
    if (isClient) day.setDate(day.getDate() + index);
    else day.setUTCDate(day.getUTCDate() + index);
    return day;
  });
  const firstTime = firstDay.getTime();
  const scale = (DAY_WIDTH * zoom) / 100 / DAY_MS;
  const width = PADDING * 2 + (days[dayCount].getTime() - firstTime) * scale;
  const hourStep =
    [1, 2, 3, 6, 12].find(
      (hours) => ((hours * DAY_MS) / 24) * scale >= TARGET_SIZE,
    ) ?? 24;
  const tickStep = hourStep >= 6 ? hourStep / 2 : 1;
  const timeTicks = days.slice(0, dayCount).flatMap((day) =>
    Array.from({ length: 24 / tickStep }, (_, index) => {
      const hour = index * tickStep;
      const time = new Date(day);
      if (isClient) time.setHours(hour);
      else time.setUTCHours(hour);
      return { time, hour };
    }).filter(
      ({ time, hour }) =>
        (isClient ? time.getHours() : time.getUTCHours()) === hour &&
        (isClient ? time.getMinutes() : time.getUTCMinutes()) === 0,
    ),
  );
  timeTicks.push({ time: days[dayCount], hour: 0 });

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (zoomScrollRef.current !== null) {
      container.scrollLeft = zoomScrollRef.current;
      zoomScrollRef.current = null;
    }
    const updateScroll = () => {
      const left = container.scrollLeft > 1;
      const right =
        container.scrollLeft + container.clientWidth <
        container.scrollWidth - 1;
      setScrollable((previous) =>
        previous.left === left && previous.right === right
          ? previous
          : { left, right },
      );
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;
      const multiplier =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? container.clientWidth
            : 1;
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (
        !delta ||
        (delta < 0 && container.scrollLeft <= 0) ||
        (delta > 0 && container.scrollLeft >= maxScroll - 1)
      )
        return;
      event.preventDefault();
      container.scrollLeft += delta * multiplier;
    };
    const frame = requestAnimationFrame(updateScroll);
    const observer = new ResizeObserver(updateScroll);
    observer.observe(container);
    container.addEventListener("scroll", updateScroll);
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("scroll", updateScroll);
      container.removeEventListener("wheel", onWheel);
    };
  }, [width]);
  const rowEnds: number[] = [];
  const items = sortedEvents.map((event) => {
    const x = PADDING + (new Date(event.startAt).getTime() - firstTime) * scale;
    const endX = event.endAt
      ? PADDING + (new Date(event.endAt).getTime() - firstTime) * scale
      : x;
    const labelX = (x + endX) / 2;
    const left = labelX - LABEL_WIDTH / 2;
    let row = rowEnds.findIndex((right) => left >= right + LABEL_GAP);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = left + LABEL_WIDTH;
    return { event, x, endX, labelX, row };
  });
  const axisY =
    Math.max(1, rowEnds.length) * (LABEL_HEIGHT + LABEL_GAP) + TARGET_SIZE / 2;
  const height = axisY + TARGET_SIZE / 2;
  let previousTimeLabelX = Number.NEGATIVE_INFINITY;

  return (
    <section className="min-w-0 space-y-3" aria-label="Таймлайн событий">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <h3 className="m3-title">Таймлайн</h3>
          <ul
            aria-label="Обозначения"
            className="flex flex-wrap gap-4 text-xs font-bold text-on-surface-variant"
          >
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-7 rounded-full bg-primary" />
              Длится
            </li>
            <li className="flex items-center gap-2">
              <span className="size-3 rounded-full border-[3px] border-primary bg-surface-bright" />
              Момент
            </li>
            <li className="flex items-center gap-2">
              <span className="h-0 w-7 border-t-2 border-dashed border-on-surface-variant" />
              Дорога
            </li>
          </ul>
        </div>
        <div className="flex w-full min-w-0 items-end gap-3 sm:w-auto">
          <div className="min-w-0 flex-1 sm:w-48">
            <FormField
              id={zoomId}
              label="Масштаб"
              type="range"
              min={50}
              max={300}
              step={25}
              value={zoom}
              aria-controls={scrollId}
              aria-valuetext={`${zoom}%`}
              className="h-12 min-h-12 cursor-pointer rounded-full border-0 bg-transparent p-0 accent-primary"
              onChange={(event) => {
                const nextZoom = event.currentTarget.valueAsNumber;
                const container = scrollRef.current;
                if (container) {
                  const center =
                    container.scrollWidth <= container.clientWidth
                      ? width / 2
                      : container.scrollLeft + container.clientWidth / 2;
                  zoomScrollRef.current =
                    PADDING +
                    ((center - PADDING) * nextZoom) / zoom -
                    container.clientWidth / 2;
                }
                const params = new URLSearchParams(searchParams?.toString());
                params.set("timeline-scale", String(nextZoom));
                router.replace(`${pathname}?${params}`, { scroll: false });
              }}
            />
          </div>
          <output
            htmlFor={zoomId}
            className="m3-label w-12 shrink-0 pb-3 text-right tabular-nums"
          >
            {zoom}%
          </output>
          <div className="flex gap-1">
            <Button
              variant="text"
              className="shrink-0 px-3"
              aria-label="Прокрутить таймлайн влево"
              aria-controls={scrollId}
              disabled={!scrollable.left}
              onClick={() =>
                scrollRef.current?.scrollBy({
                  left: -DAY_WIDTH * 1.5,
                  behavior: "smooth",
                })
              }
            >
              <span aria-hidden="true">‹</span>
            </Button>
            <Button
              variant="text"
              className="shrink-0 px-3"
              aria-label="Прокрутить таймлайн вправо"
              aria-controls={scrollId}
              disabled={!scrollable.right}
              onClick={() =>
                scrollRef.current?.scrollBy({
                  left: DAY_WIDTH * 1.5,
                  behavior: "smooth",
                })
              }
            >
              <span aria-hidden="true">›</span>
            </Button>
          </div>
        </div>
      </div>
      <div
        id={scrollId}
        ref={scrollRef}
        role="region"
        aria-label="Временная шкала событий, горизонтальная прокрутка"
        tabIndex={0}
        className="max-w-full cursor-grab overflow-x-auto overscroll-x-contain rounded-large border border-outline-variant bg-surface-bright p-3 select-none active:cursor-grabbing"
        onPointerDown={(event) => {
          suppressClick.current = false;
          if (
            event.pointerType === "touch" ||
            event.button !== 0 ||
            !event.isPrimary
          )
            return;
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            scrollLeft: event.currentTarget.scrollLeft,
            dragged: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          const delta = event.clientX - drag.startX;
          if (!drag.dragged && Math.abs(delta) < 6) return;
          if (!drag.dragged) {
            drag.dragged = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          event.preventDefault();
          event.currentTarget.scrollLeft = drag.scrollLeft - delta;
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          suppressClick.current = drag.dragged;
          dragRef.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          suppressClick.current = false;
        }}
        onPointerLeave={() => {
          if (!dragRef.current?.dragged) dragRef.current = null;
        }}
        onLostPointerCapture={() => {
          dragRef.current = null;
        }}
        onClickCapture={(event) => {
          if (suppressClick.current && event.detail > 0) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
      >
        <div className="mx-auto w-max">
          <svg
            width={width}
            height={height}
            role="list"
            aria-label="События по времени начала"
            className="block max-w-none"
          >
            {days.map((day) => {
              const x = PADDING + (day.getTime() - firstTime) * scale;
              return (
                <line
                  key={day.toISOString()}
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={height}
                  aria-hidden="true"
                  className="stroke-outline-variant"
                />
              );
            })}
            <line
              x1={PADDING}
              x2={width - PADDING}
              y1={axisY}
              y2={axisY}
              aria-hidden="true"
              className="stroke-outline-variant stroke-2"
            />
            {items.map(({ event, x, endX, labelX, row }) => {
              const labelY = row * (LABEL_HEIGHT + LABEL_GAP);
              const itemWidth = Math.max(LABEL_WIDTH, endX - x + TARGET_SIZE);
              const markerX = (itemWidth - (endX - x)) / 2;
              const arrowStart = endX > x ? markerX : markerX - TARGET_SIZE / 4;
              const arrowEnd =
                endX > x ? markerX + endX - x : markerX + TARGET_SIZE / 4;
              const arrowHead = Math.min(8, arrowEnd - arrowStart);
              const arrowY = (TARGET_SIZE * 3) / 2;
              const arrowRise = Math.min(
                (TARGET_SIZE * 3) / 4,
                (arrowEnd - arrowStart) / 4,
              );
              const arrowAngle =
                (Math.atan2(arrowRise * 2, (arrowEnd - arrowStart) / 2) * 180) /
                Math.PI;
              return (
                <g key={event.id} role="listitem">
                  {event.type === "activity" ? (
                    <line
                      x1={labelX}
                      x2={labelX}
                      y1={labelY + LABEL_HEIGHT}
                      y2={axisY}
                      aria-hidden="true"
                      strokeDasharray={event.endAt === null ? "3 4" : undefined}
                      className={
                        event.endAt === null
                          ? "stroke-primary stroke-2"
                          : "stroke-outline-variant"
                      }
                    />
                  ) : null}
                  <foreignObject
                    x={labelX - itemWidth / 2}
                    y={labelY}
                    width={itemWidth}
                    height={height - labelY}
                    className="pointer-events-none"
                  >
                    <button
                      type="button"
                      aria-label={
                        event.type === "movement"
                          ? `Перемещение: ${event.title}`
                          : event.title
                      }
                      aria-haspopup="dialog"
                      onClick={() => setSelectedId(event.id)}
                      onFocus={(event) => {
                        if (!event.currentTarget.matches(":focus-visible"))
                          return;
                        event.currentTarget
                          .querySelector("span")
                          ?.scrollIntoView({
                            block: "nearest",
                            inline: "nearest",
                          });
                      }}
                      className="group pointer-events-none relative block h-full w-full cursor-pointer text-left focus-visible:outline-none"
                    >
                      <span
                        className={`pointer-events-auto absolute top-1 left-1/2 block w-40 -translate-x-1/2 truncate rounded-small px-3 py-2 text-sm font-bold transition-colors group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-primary ${
                          event.type === "movement"
                            ? "bg-surface-container text-on-surface group-hover:bg-surface-container-high"
                            : event.endAt === null
                              ? "bg-surface-bright text-on-primary-container ring-2 ring-primary ring-inset group-hover:bg-primary-container"
                              : "bg-primary text-on-primary group-hover:bg-on-primary-container"
                        }`}
                      >
                        {event.title}
                      </span>
                      <svg
                        width={itemWidth}
                        height={
                          event.type === "movement"
                            ? TARGET_SIZE * 2
                            : TARGET_SIZE
                        }
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-0 left-0"
                      >
                        <rect
                          x={markerX - TARGET_SIZE / 2}
                          y={event.type === "movement" ? TARGET_SIZE : 0}
                          width={Math.max(TARGET_SIZE, endX - x + TARGET_SIZE)}
                          height={TARGET_SIZE}
                          className="pointer-events-auto fill-transparent"
                        />
                        {event.type === "movement" ? (
                          <g
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="5 6"
                            className="pointer-events-auto stroke-on-surface-variant stroke-2"
                          >
                            <path
                              d={`M ${arrowStart} ${arrowY} Q ${(arrowStart + arrowEnd) / 2} ${arrowY - arrowRise * 2} ${arrowEnd} ${arrowY}`}
                            />
                            <path
                              d={`M ${-arrowHead} ${-arrowHead / 2} L 0 0 L ${-arrowHead} ${arrowHead / 2}`}
                              transform={`translate(${arrowEnd} ${arrowY}) rotate(${arrowAngle})`}
                            />
                          </g>
                        ) : event.endAt !== null ? (
                          <line
                            x1={markerX}
                            x2={markerX + endX - x}
                            y1={TARGET_SIZE / 2}
                            y2={TARGET_SIZE / 2}
                            strokeLinecap="round"
                            className="pointer-events-auto stroke-primary stroke-[10]"
                          />
                        ) : (
                          <circle
                            cx={markerX}
                            cy={TARGET_SIZE / 2}
                            r={7}
                            strokeWidth={3}
                            className="pointer-events-auto fill-surface-bright stroke-primary"
                          />
                        )}
                      </svg>
                    </button>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
          <svg
            width={width}
            height={LABEL_HEIGHT * 2}
            role="group"
            aria-label="Время и даты поездки"
            className="block max-w-none"
          >
            <line
              x1={PADDING}
              x2={width - PADDING}
              y1={0}
              y2={0}
              aria-hidden="true"
              className="stroke-outline-variant"
            />
            {timeTicks.map(({ time, hour }) => {
              const x = PADDING + (time.getTime() - firstTime) * scale;
              const labelled =
                hour % hourStep === 0 && x - previousTimeLabelX >= TARGET_SIZE;
              if (labelled) previousTimeLabelX = x;
              return (
                <g key={time.toISOString()}>
                  <line
                    x1={x}
                    x2={x}
                    y1={0}
                    y2={labelled ? 8 : 4}
                    aria-hidden="true"
                    className="stroke-outline-variant"
                  />
                  {labelled ? (
                    <foreignObject
                      x={x - TARGET_SIZE / 2}
                      y={12}
                      width={TARGET_SIZE}
                      height={LABEL_HEIGHT - 12}
                    >
                      <div className="text-center text-xs text-on-surface-variant tabular-nums">
                        <time dateTime={time.toISOString()}>
                          {String(hour).padStart(2, "0")}:00
                        </time>
                      </div>
                    </foreignObject>
                  ) : null}
                </g>
              );
            })}
            {days.slice(0, dayCount).map((day, index) => {
              const dayWidth =
                (days[index + 1].getTime() - day.getTime()) * scale;
              const dateWidth = Math.min(LABEL_WIDTH, dayWidth);
              return (
                <foreignObject
                  key={day.toISOString()}
                  x={
                    PADDING +
                    ((day.getTime() + days[index + 1].getTime()) / 2 -
                      firstTime) *
                      scale -
                    dateWidth / 2
                  }
                  y={LABEL_HEIGHT}
                  width={dateWidth}
                  height={LABEL_HEIGHT}
                >
                  <div className="py-2 text-center text-sm text-on-surface-variant">
                    <DateTimeText value={day.toISOString()} dateOnly />
                  </div>
                </foreignObject>
              );
            })}
          </svg>
        </div>
      </div>
      {selectedEvent && !isPopupOpen ? (
        <Dialog
          size="compact"
          labelledBy={headingId}
          onClose={() => setSelectedId(null)}
        >
          <section className="m3-dialog-content">
            <div className="m3-dialog-heading">
              <h2 id={headingId} className="m3-title min-w-0 flex-1">
                {selectedEvent.title}
              </h2>
              <Button variant="text" onClick={() => setSelectedId(null)}>
                Закрыть
              </Button>
            </div>
            <dl className="m3-details">
              <div className="space-y-1 py-2">
                <dt>Начало</dt>
                <dd>
                  <DateTimeText value={selectedEvent.startAt} />
                </dd>
              </div>
              {selectedEvent.endAt !== null ? (
                <div className="space-y-1 py-2">
                  <dt>Окончание</dt>
                  <dd>
                    <DateTimeText value={selectedEvent.endAt} />
                  </dd>
                </div>
              ) : null}
            </dl>
            {onSelect ? (
              <Button
                className="w-full"
                onClick={() => {
                  setSelectedId(null);
                  onSelect(selectedEvent.id);
                }}
              >
                Изменить событие
              </Button>
            ) : null}
          </section>
        </Dialog>
      ) : null}
    </section>
  );
}
