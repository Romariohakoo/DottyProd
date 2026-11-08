"use client";

import { useEffect, useId, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Icon, type IconName } from "@shared/ui";

import {
  type FoundLocality,
  type LocalityKind,
  searchLocalities,
} from "../api/search-localities";

interface LocalityInputProps {
  kind: LocalityKind;
  label: string;
  value: string;
  placeholder: string;
  icon: IconName;
  autoFocus?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
  onPick?: (locality: FoundLocality) => void;
}

export function LocalityInput({
  kind,
  label,
  value,
  placeholder,
  icon,
  autoFocus,
  invalid,
  onChange,
  onPick,
}: LocalityInputProps) {
  const listId = useId();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(value.trim()), 250);
    return () => clearTimeout(timer);
  }, [value]);

  const search = useQuery({
    queryKey: ["localities", kind, query],
    queryFn: () => searchLocalities(query, kind),
    enabled: open && query.length >= 2,
    staleTime: 5 * 60_000,
  });
  const options = open && query.length >= 2 ? (search.data ?? []) : [];

  const choose = (item: FoundLocality) => {
    onChange(item.name);
    onPick?.(item);
    setOpen(false);
  };

  return (
    <div className="m3-locality" data-invalid={invalid || undefined}>
      <label htmlFor={inputId} className="m3-locality-field">
        <Icon name={icon} size={18} className="text-on-surface-variant" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="m3-locality-label">{label}</span>
          <input
            id={inputId}
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            autoFocus={autoFocus}
            value={value}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (!options.length) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, options.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                choose(options[active]);
              } else if (event.key === "Escape") {
                event.stopPropagation();
                setOpen(false);
              }
            }}
            className="m3-locality-input"
          />
        </span>
        {search.isFetching ? (
          <span className="m3-spinner m3-spinner--sm" aria-label="Ищем" />
        ) : null}
      </label>
      {options.length ? (
        <ul id={listId} role="listbox" className="m3-locality-list">
          {options.map((item, index) => (
            <li
              key={item.key}
              role="option"
              aria-selected={index === active}
              onPointerDown={(event) => event.preventDefault()}
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(item)}
            >
              <span className="m3-locality-icon">
                <Icon
                  name={item.kind === "country" ? "globe" : "pin"}
                  size={15}
                />
              </span>
              <span className="min-w-0 flex-1">
                <b>{item.name}</b>
                <small>
                  {[item.region, item.kind === "country" ? "" : item.country]
                    .filter(Boolean)
                    .join(", ")}
                </small>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
