"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGetMe } from "@entities/user";
import { LoginForm } from "@features/user/login";
import { Icon, StatusMessage } from "@shared/ui";

const LoginPage = () => {
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
        <section className="m3-auth-intro" aria-labelledby="login-intro">
          <div className="m3-decor" aria-hidden="true">
            <span className="m3-decor-label top-5 right-6">
              55.79° N · 49.12° E
            </span>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-6">
            <span className="m3-pill-badge">
              <Icon name="sparkle" size={14} />
              Снова в путь
            </span>
            <h2 id="login-intro" className="m3-display">
              С <span className="m3-accent">возвращением</span>
            </h2>
            <p className="max-w-md text-lg text-white/75">
              Ваши поездки, места и события уже ждут вас.
            </p>
          </div>
          <p className="m3-meta text-white/60">Все планы — под рукой.</p>
        </section>
        <section aria-labelledby="login-heading" className="m3-auth-panel">
          <div className="mb-8 flex flex-col gap-3">
            <p className="m3-eyebrow">Dotty · аккаунт</p>
            <h1 id="login-heading" className="m3-headline">
              Вход
            </h1>
          </div>
          <LoginForm />
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
