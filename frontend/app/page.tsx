"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useGetMe } from "@entities/user";
import { Icon, type IconName, StatusMessage } from "@shared/ui";

const HERO_STEPS: { label: string; icon: IconName; tone: string }[] = [
  { label: "Перелёт в Казань", icon: "plane", tone: "lavender" },
  { label: "Кремль и Кул-Шариф", icon: "museum", tone: "violet" },
  { label: "Ужин в Старо-Татарской слободе", icon: "food", tone: "peach" },
];

export default function Home() {
  const router = useRouter();
  const { data: user, isPending } = useGetMe();

  useEffect(() => {
    if (user) router.replace("/trips");
  }, [router, user]);

  if (isPending || user) {
    return (
      <main id="main-content" className="m3-page">
        <StatusMessage loading>Проверяем сессию…</StatusMessage>
      </main>
    );
  }

  return (
    <main id="main-content" className="m3-page">
      <section className="m3-hero" aria-labelledby="home-heading">
        <div className="m3-decor" aria-hidden="true">
          <span className="m3-decor-label top-5 right-6">
            55.79° N · 49.12° E
          </span>
        </div>
        <div className="m3-hero-copy">
          <span className="m3-pill-badge">
            <Icon name="sparkle" size={14} />
            Dotty · ваши путешествия
          </span>
          <h1 id="home-heading" className="m3-display">
            Больше мест.
            <br />
            Больше <span className="m3-accent">историй.</span>
          </h1>
          <p className="max-w-lg text-lg text-on-surface-variant">
            Поездки, любимые места и события — соберите всё путешествие в одном
            месте.
          </p>
          <Link href="/trips" className="m3-button m3-button--filled">
            Открыть поездки <Icon name="next" size={18} />
          </Link>
        </div>
        <div className="m3-hero-aside">
          <span className="m3-eyebrow text-white/60">План по дням</span>
          <ol className="flex flex-col gap-2">
            {HERO_STEPS.map((step) => (
              <li
                key={step.label}
                className="flex items-center gap-3 rounded-medium bg-white/8 p-2.5"
              >
                <span data-tone={step.tone} className="m3-tone-tile size-9">
                  <Icon name={step.icon} size={17} />
                </span>
                <span className="text-sm font-bold">{step.label}</span>
              </li>
            ))}
          </ol>
          <p className="m3-title">Следующая история начинается с поездки.</p>
        </div>
      </section>
      <section
        aria-label="Всё для путешествия"
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="m3-surface flex flex-col gap-4">
          <span className="m3-eyebrow text-primary">01 · Поездки</span>
          <h2 className="m3-title">Планы обретают форму</h2>
          <p className="text-on-surface-variant">
            Название, направление и даты — основа вашего путешествия.
          </p>
        </div>
        <div className="m3-surface flex flex-col gap-4">
          <span className="m3-eyebrow text-primary">02 · Места</span>
          <h2 className="m3-title">Свои точки на карте</h2>
          <p className="text-on-surface-variant">
            Адреса и координаты мест, которые хочется сохранить.
          </p>
        </div>
        <div className="m3-surface flex flex-col gap-4">
          <span className="m3-eyebrow text-primary">03 · События</span>
          <h2 className="m3-title">Каждый день — история</h2>
          <p className="text-on-surface-variant">
            Активности и перемещения в расписании поездки.
          </p>
        </div>
      </section>
    </main>
  );
}
