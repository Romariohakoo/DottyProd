"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGetMe } from "@entities/user";
import { RegisterForm } from "@features/user/register";
import { StatusMessage } from "@shared/ui";

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
          <div className="flex min-w-0 flex-col gap-6">
            <p className="m3-eyebrow">НОВАЯ ИСТОРИЯ</p>
            <h2 id="register-intro" className="m3-headline">
              Путешествие начинается здесь.
            </h2>
            <p className="max-w-md text-lg">
              Создайте аккаунт и собирайте свои поездки в одном месте.
            </p>
          </div>
          <div className="m3-auth-art hidden lg:grid" aria-hidden="true">
            ↗
          </div>
          <p className="m3-label">Больше места для впечатлений.</p>
        </section>
        <section aria-labelledby="register-heading" className="m3-auth-panel">
          <div className="mb-8 flex flex-col gap-3">
            <p className="m3-eyebrow">TRAVELHUB / АККАУНТ</p>
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
