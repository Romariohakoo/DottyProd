"use client";

import Link from "next/link";

import { useGetMe } from "@entities/user";
import { LogoutButton } from "@features/user/logout";
import { ProfileSettings } from "@features/user/profile";
import { FormError, Icon } from "@shared/ui";

export function ProfilePage() {
  const me = useGetMe();

  return (
    <main id="main-content" className="m3-dash">
      <header className="m3-dash-head">
        <div className="min-w-0">
          <Link href="/trips" className="m3-back-link">
            <Icon name="back" size={16} />
            Поездки
          </Link>
          <h1 className="m3-dash-title">
            Личный <span className="m3-accent">кабинет</span>
          </h1>
        </div>
        <LogoutButton />
      </header>
      {me.isPending ? (
        <div
          className="m3-settings"
          role="status"
          aria-label="Загружаем профиль"
        >
          <div className="m3-skeleton h-44 rounded-xlarge" />
          <div className="m3-skeleton h-56 rounded-xlarge" />
        </div>
      ) : me.isError || !me.data ? (
        <FormError>Не удалось загрузить профиль. Войдите заново.</FormError>
      ) : (
        <ProfileSettings key={me.data.id} user={me.data} />
      )}
    </main>
  );
}
