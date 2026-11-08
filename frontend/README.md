# NextJS template

Шаблон для проектов на Next.js с архитектурой Feature-Sliced Design (FSD).

**Стек:** Next.js 16.4 (App Router), React 19, TypeScript, Tailwind 4, React Query, axios, react-hook-form, zod, pnpm.

## Запуск

Нужны Node.js 24 и pnpm (версия зафиксирована в `packageManager`).

```bash
corepack enable
pnpm install
pnpm dev
```

## Скрипты

- `pnpm dev`: dev-сервер на http://localhost:3000
- `pnpm build`: production-сборка
- `pnpm lint` / `pnpm lint:fix`: ESLint
- `pnpm typecheck`: генерация типов роутов и `tsc --noEmit`
- `pnpm check`: typecheck и lint без изменения файлов; production build запускается отдельно через `pnpm build`

## Структура

```
app/       роутинг Next.js
pages/     пустая, не удалять (иначе Next примет src/pages за Pages Router)
src/
  app/       провайдеры, инициализация
  pages/     страницы
  widgets/   крупные блоки интерфейса
  features/  пользовательские действия
  entities/  бизнес-сущности
  shared/    API-клиент, UI-кит, конфиг, утилиты
```

Слой импортирует только из слоёв ниже себя. Срезы одного слоя друг друга не импортируют. Снаружи срез подключается только через его `index.ts`. Эти правила проверяет ESLint (`eslint-plugin-boundaries`). Алиасы: `@app/*`, `@pages/*`, `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*`, `@src/*`.

## Docker

```bash
docker compose up --build
```
