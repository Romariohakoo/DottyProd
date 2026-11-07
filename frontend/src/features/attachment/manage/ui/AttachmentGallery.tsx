"use client";

import { useId, useRef, useState } from "react";

import type { EventDto } from "@shared/api";
import { Icon } from "@shared/ui";

import { attachmentUrl } from "../api";
import {
  useDeleteAttachmentMutation,
  useUploadAttachmentMutation,
} from "../model";

interface AttachmentGalleryProps {
  tripId: number;
  event: EventDto;
  canEdit: boolean;
}

const ACCEPTED = ["image/jpeg", "image/png"];

export function AttachmentGallery({
  tripId,
  event,
  canEdit,
}: AttachmentGalleryProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAttachmentMutation(tripId);
  const remove = useDeleteAttachmentMutation(tripId);
  const [failed, setFailed] = useState<File | null>(null);
  const [typeError, setTypeError] = useState(false);

  const send = (file: File) => {
    setFailed(null);
    upload.mutate(
      { eventId: event.id, file },
      { onError: () => setFailed(file) },
    );
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setTypeError(true);
      return;
    }
    setTypeError(false);
    send(file);
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Фото и билеты">
      <div className="flex items-center justify-between">
        <h3 className="m3-eyebrow text-on-surface-variant">
          Вложения · {event.attachments.length}
        </h3>
        <span className="text-xs text-on-surface-variant">JPEG, PNG</span>
      </div>
      {event.attachments.length || upload.isPending || failed ? (
        <ul className="grid grid-cols-3 gap-1.5">
          {event.attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="relative aspect-square overflow-hidden rounded-medium bg-surface-container"
            >
              <a
                href={attachmentUrl(attachment.id, "original")}
                target="_blank"
                rel="noreferrer"
                aria-label={`Открыть ${attachment.fileName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachmentUrl(attachment.id, "thumbnail")}
                  alt={attachment.fileName}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </a>
              {canEdit ? (
                <button
                  type="button"
                  aria-label={`Удалить ${attachment.fileName}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(attachment.id)}
                  className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-small bg-scrim/60 text-on-primary hover:bg-scrim/80"
                >
                  <Icon name="trash" size={14} />
                </button>
              ) : null}
            </li>
          ))}
          {upload.isPending ? (
            <li className="flex aspect-square flex-col justify-end gap-1 rounded-medium bg-surface-container p-2">
              <span className="text-xs font-bold text-on-surface-variant">
                Загрузка…
              </span>
              <span className="h-1 overflow-hidden rounded-full bg-surface-container-highest">
                <span className="block h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </span>
            </li>
          ) : null}
          {failed ? (
            <li>
              <button
                type="button"
                onClick={() => send(failed)}
                className="flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-medium bg-error-container text-center text-xs font-bold text-on-error-container"
              >
                Не загрузилось
                <span className="underline">Повторить</span>
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
      {canEdit ? (
        <>
          <label
            htmlFor={inputId}
            className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-medium border-[1.5px] border-dashed border-outline font-bold text-primary hover:bg-primary-container"
          >
            <Icon name="upload" size={18} />
            Добавить фото или билет
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED.join(",")}
            className="sr-only"
            onChange={(changeEvent) => {
              onFiles(changeEvent.currentTarget.files);
              changeEvent.currentTarget.value = "";
            }}
          />
          {typeError ? (
            <p role="alert" className="m3-support m3-field-error">
              Подходят только JPEG и PNG.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
