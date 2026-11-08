"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGetMe } from "@entities/user";
import { RegisterForm } from "@features/user/register";
import { Icon, StatusMessage } from "@shared/ui";

const Register = () => {
  const router = useRouter();
  const { data: user, isPending } = useGetMe();

  useEffect(() => {
    if (user) router.replace("/");
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
      <div className="m3-auth">
        <section className="m3-auth-intro" aria-labelledby="register-intro">
          <div className="m3-decor" aria-hidden="true">
            <span className="m3-decor-label top-5 right-6">
              {"{ маршруты · даты · места }"}
            </span>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-6">
            <span className="m3-pill-badge">
              <Icon name="sparkle" size={14} />
              Новая история
            </span>
            <h2 id="register-intro" className="m3-display">
              Путешествие начинается <span className="m3-accent">здесь</span>
            </h2>
            <p className="max-w-md text-lg text-white/75">
              Создайте аккаунт и собирайте поездки в одном месте.
            </p>
          </div>
          <p className="m3-meta text-white/60">Больше места для впечатлений.</p>
        </section>
        <section aria-labelledby="register-heading" className="m3-auth-panel">
          <div className="mb-8 flex flex-col gap-3">
            <p className="m3-eyebrow">Dotty · аккаунт</p>
            <h1 id="register-heading" className="m3-headline">
              Регистрация
            </h1>
          </div>
          <RegisterForm />
        </section>
      </div>
    </main>
  );
};

export default Register;
