"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGetMe } from "@entities/user";
import { LoginForm } from "@features/user/login";

const LoginPage = () => {
  const router = useRouter();
  const { data: user, isPending } = useGetMe();

  useEffect(() => {
    if (user) router.replace("/");
  }, [router, user]);

  if (isPending || user) {
    return (
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center px-4">
        <p role="status" className="text-sm text-foreground/70">
          Проверяем сессию…
        </p>
      </main>
    );
  }

  return (
    <main className="grid min-h-[calc(100dvh-4rem)] place-items-center px-4 py-12">
      <section
        aria-labelledby="login-heading"
        className="w-full max-w-md rounded-xl border border-muted/60 bg-muted/15 p-6 shadow-2xl sm:p-8"
      >
        <h1 id="login-heading" className="mb-6 text-2xl font-semibold">
          Вход
        </h1>
        <LoginForm />
      </section>
    </main>
  );
};

export default LoginPage;
