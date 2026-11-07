"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGetMe } from "@entities/user";
import { LoginForm } from "@features/user/login";
import { StatusMessage } from "@shared/ui";

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
          <div className="flex min-w-0 flex-col gap-6">
            <p className="m3-eyebrow">СНОВА В ПУТЬ</p>
            <h2 id="login-intro" className="m3-headline">
              С возвращением.
            </h2>
            <p className="max-w-md text-lg">
              Ваши поездки, места и события уже ждут вас.
            </p>
          </div>
          <div className="m3-auth-art hidden lg:grid" aria-hidden="true">
            ↗
          </div>
          <p className="m3-label">Все планы — под рукой.</p>
        </section>
        <section aria-labelledby="login-heading" className="m3-auth-panel">
          <div className="mb-8 flex flex-col gap-3">
            <p className="m3-eyebrow">TRAVELHUB / АККАУНТ</p>
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
