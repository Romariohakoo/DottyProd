"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useGetMe } from "@entities/user";
import { StatusMessage } from "@shared/ui";

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
        <div className="m3-hero-copy">
          <p className="m3-eyebrow">DOTTY · ВАШИ ПУТЕШЕСТВИЯ</p>
          <h1 id="home-heading" className="m3-display">
            Больше мест.
            <br />
            Больше историй.
          </h1>
          <p className="max-w-lg text-lg">
            Поездки, любимые места и события — соберите всё путешествие в одном
            месте.
          </p>
          <Link href="/trips" className="m3-button m3-button--filled">
            Открыть поездки <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="m3-hero-aside">
          <span className="m3-label">Место для ваших планов</span>
          <div className="m3-auth-art" aria-hidden="true">
            ↗
          </div>
          <p className="m3-title">Следующая история начинается с поездки.</p>
        </div>
      </section>
      <section
        aria-label="Всё для путешествия"
        className="grid gap-4 sm:grid-cols-3"
      >
        <div className="m3-surface flex flex-col gap-4">
          <span className="m3-eyebrow">01 / ПОЕЗДКИ</span>
          <h2 className="m3-title">Планы обретают форму</h2>
          <p className="text-on-surface-variant">
            Название, направление и даты — основа вашего путешествия.
          </p>
        </div>
        <div className="m3-surface flex flex-col gap-4">
          <span className="m3-eyebrow">02 / МЕСТА</span>
          <h2 className="m3-title">Свои точки на карте</h2>
          <p className="text-on-surface-variant">
            Адреса и координаты мест, которые хочется сохранить.
          </p>
        </div>
        <div className="m3-surface flex flex-col gap-4">
          <span className="m3-eyebrow">03 / СОБЫТИЯ</span>
          <h2 className="m3-title">Каждый день — история</h2>
          <p className="text-on-surface-variant">
            Активности и перемещения в расписании поездки.
          </p>
        </div>
      </section>
    </main>
  );
}
