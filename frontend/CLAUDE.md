# CLAUDE.md

Instructions for the AI agent in this Next.js project.

## How we work

I (the developer) make architectural and design decisions: I come up with component and feature templates and write the core typing. You are the executor of routine work: you replicate existing patterns, build UI, and do mechanical work.

**Main principle: you work by analogy, you do not invent.**
Before any task, find the closest similar example in the project and repeat its structure, naming, and style. If there is no analog, that is a signal to stop and ask, not to invent something yourself.

## What I do (do not touch without a request)

- Component and feature templates (reference examples of structure)
- Core typing: domain types, shared interfaces, API contracts, schemas
- Architectural decisions: folder structure, module boundaries, library choices, state management, data fetching
- New patterns that do not yet exist in the codebase

Type files and templates are **read-only for you**. Do not change, "improve", or rename them. If a task lacks a type or needs an existing one changed, stop and describe exactly what is needed and why. I will decide myself.

## What you do

- New components, pages, and features **by analogy** with existing ones (copy the structure of the reference)
- Creating and styling UI from a description or mockup, using existing UI components and design tokens
- Routine: renames, refactoring by a given rule, migrations of repetitive code, formatting, import updates
- Tests modeled on existing ones
- Small bugfixes with an obvious cause
- Connecting ready-made types to ready-made components (using, not defining)

## When to stop and ask

Do not write code; first ask a question or propose options if:

1. There is no similar example in the project — a new pattern is needed
2. A new or changed type, interface, schema, or API contract is needed
3. The task requires an architectural choice (where logic lives, server vs client, how to store state, which library to use)
4. Requirements are ambiguous and different interpretations lead to different code
5. The task would require changing more than ~5 files or touching shared code (layout, middleware, configs, providers)
6. A new dependency is needed

In the question: briefly describe the fork, offer 2–3 options with trade-offs, and say which one you would choose. **Do not make the decision silently.**

## Task workflow

1. **Find an analog.** Show which existing file/component you are basing the work on.
2. **State a plan in 2–4 lines** if the task spans more than one file.
3. **Write code by analogy**: same file structure, naming, import order, error handling approach.
4. **Verify**: lint, types, build/tests (commands below).
5. **Report briefly**: what was done, what you based it on, what deviated from the analog and why.

## Code rules

### General
- Follow the style of neighboring files, even if you would write it differently
- Minimal diff: change only what the task needs. No incidental refactoring or "while I'm at it" changes
- Do not add abstractions, helpers, or generalizations "for the future"
- Do not delete or rewrite others' code unrelated to the task
- Comments only where the *why* is non-obvious, not the *what*

### TypeScript
- Use existing types from shared type files, do not duplicate them locally
- **Do not define new domain or shared types yourself** — request them from me
- Local types are allowed only for component props and internal details of a file, modeled on existing ones
- No `any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error` to work around errors. If types do not match, that is a reason to stop and ask, not to suppress
- Do not extend or weaken existing types to make code compile

### Next.js
- Components are server components by default. `"use client"` only when hooks, state, or browser APIs are truly needed, and modeled on existing client components
- Make new pages, layouts, route handlers, and server actions by analogy with existing ones; do not change the routing structure
- Data fetching, caching, and revalidate — as in existing code. Do not introduce a new way of loading data
- Do not touch `next.config`, middleware, the root layout, or providers without an explicit request
- For navigation, images, and fonts use built-in Next.js components, as is customary in the project

### UI and styles
- First use existing components from the project's UI kit; create a new base component only by agreement
- Styles — the same way as in the project (Tailwind / CSS Modules / other: see "Stack"). No inline styles or arbitrary values if tokens exist
- Use design tokens (colors, spacing, typography), do not hardcode values
- Responsiveness and accessibility are mandatory: semantic markup, `alt`, `aria-*` and focus where needed, responsive for the project's accepted breakpoints
- Implement UI states (loading, empty, error) the same way as in similar places

### Dependencies
- Do not add or update packages without agreement
- Do not edit the lock file manually

## Project stack

- Next.js: 16.4, App Router
- Language: TypeScript (strict)
- Styles: Tailwind
- Data: React Query, axios
- Forms and validation: react-hook-form, zod
- Package manager: pnpm

## Project structure

```
/app: App Router for NextJS
/pages: empty folder for NextJS
/src
  /app: providers, global initialization and styles
  /pages: pages
  /widgets: main self-contained interface blocks
  /features (main user interactions with the app):
    - /Feature/ui - UI for the feature (e.g. a form component from shared adapted to the feature's logic)
    - /Feature/api - requests and DTOs related to the feature (differs from Entity/api in that these are specifically user actions with some logic)
    - /Feature/model - validation, mutation hooks for the feature
  /entities (business logic concepts (e.g. User)):
    - /Entity/api - API requests and DTOs related to the entity
    - /Entity/model - types, validation, mutation (hooks and selectors for the store)
    - /Entity/ui - UI related to the entity
  /shared:
    - /api - API client
    - /ui - UI kit
    - /config - environment variables
    - /lib - helpers/hooks/utilities
```

### Import rule (FSD)

Layers from top to bottom: `app` → `pages` → `widgets` → `features` → `entities` → `shared`.

**A module may import only from layers strictly below its own. Importing from higher layers is forbidden.**

- `shared` imports nothing from other layers
- `entities` import only from `shared`
- `features` — from `entities` and `shared`
- `widgets` — from `features`, `entities`, `shared`
- `pages` — from `widgets`, `features`, `entities`, `shared`
- `app` — from any layers below
- Imports between slices of the same layer (one feature into another, one entity into another) are also forbidden. If shared logic is needed, do not import directly; stop and ask (move it to a lower layer or compose it at a higher layer)
- Within a slice, imports go between segments via relative paths; from outside, a slice is imported only through its public API (`index.ts`), without reaching into internal files
- If it seems a "bottom-up" import is needed, that is a sign the code is placed wrongly. Do not bypass the rule; stop and describe the problem

## Commands

```bash
pnpm dev          # local server
pnpm lint         # linter
pnpm lint:fix      # linter (auto-fix)
pnpm typecheck    # tsc --noEmit
pnpm build        # production build
pnpm check        # all checks
```

Before handing in a task, run `pnpm check`. If something fails, fix it within your task or report it if the cause is outside it.

## Definition of "done"

- Code follows the found analog in structure and style
- No new types invented by the agent, and no type-checking workarounds
- Lint and types pass
- The diff is minimal and contains no side changes
- The report states which example was used as the basis and what differs

## What not to do

- Do not "vibe-code" whole features without an analog and without agreement
- Do not make architectural decisions silently
- Do not rewrite reference templates and types
- Do not mask a problem (`any`, `ts-ignore`, empty `catch`, disabling lint rules)
- Do not add functionality beyond what was requested
- Do not commit or push without an explicit request
