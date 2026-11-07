"use client";

import { useSyncExternalStore } from "react";

import { formatDateTime } from "@shared/lib";

interface DateTimeTextProps {
  value: string;
  dateOnly?: boolean;
}

const subscribe = () => () => {};

export function DateTimeText({ value, dateOnly = false }: DateTimeTextProps) {
  const text = useSyncExternalStore(
    subscribe,
    () => formatDateTime(value, undefined, dateOnly),
    () => formatDateTime(value, "UTC", dateOnly),
  );
  return <time dateTime={value}>{text}</time>;
}
