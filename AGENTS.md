# BioAudit Pro

<!-- AGENTS.md — Workspace instructions and context file loaded automatically by Antigravity. -->

## Project Overview

BioAudit Pro is an industrial-grade, offline-first Progressive Web Application (PWA) designed for food safety auditors and inspectors. It standardizes in-situ sanitary inspections and Hazard Analysis Critical Control Points (HACCP / APPCC) verification compliant with **Regulation (EC) No 852/2004**, **Codex Alimentarius**, and **ISO 22000**. The application features an offline replica engine, digital signatures via HTML5 Canvas, real-time photographic evidence capture, instant A4 printable official reports, and high-performance edge deployment on Cloudflare Workers.

## Architecture

The project strictly follows **Clean Architecture** and **Domain-Driven Design (DDD)** principles, separating enterprise business rules, application use cases, technical infrastructure, and the presentation layer:

```
src/
├── domain/                  # Enterprise Business Rules & Entities (zero external dependencies)
│   ├── entities/            # Audit (Aggregate Root), Company, Auditor, ControlPoint
│   ├── value-objects/       # Cif, Score, Signature, EvidencePhoto
│   ├── services/            # ComplianceCalculatorService, NormativeCatalogService
│   ├── repositories/        # IAuditRepository, ICompanyRepository, IStorageRepository
│   ├── constants/           # default-control-points.ts (30 regulatory inspection points)
│   └── errors/              # DomainError, InvalidCifError, IncompleteAuditError
├── application/             # Application Business Rules (Use Cases & DTOs)
│   ├── dtos/                # CreateAuditDTO, EvaluatePointDTO, FinalizeAuditDTO (Zod schemas)
│   └── use-cases/           # CreateAuditUseCase, EvaluatePointUseCase, FinalizeAndSignAuditUseCase, GetAuditReportUseCase
├── infrastructure/          # Interface Adapters & External Implementations
│   ├── database/supabase/   # Supabase SSR client, migrations, SupabaseAuditRepository, SupabaseCompanyRepository
│   ├── storage/             # SupabaseStorageRepository (Evidences & Signatures)
│   └── offline/             # Dexie.js (IndexedDB local replica for offline field operation)
└── presentation/            # User Interface & Edge Endpoints
    ├── app/                 # Next.js 15 App Router (Pages, Route Handlers, Edge Runtime)
    │   ├── api/audits/      # REST API endpoints (POST /api/audits, evaluate, finalize)
    │   ├── (auth)/          # Inspector authentication flows
    │   └── (dashboard)/     # Field rubric (/rubrica), Official report (/relatorio), New audit (/nova)
    └── components/          # "Clinical Assurance" Design System components (Tailwind CSS, Canvas)
```

| Directory | Layer | Purpose | Dependency Rule |
|---|---|---|---|
| `src/domain` | Domain | Core entities, value objects, domain services, repository interfaces | Independent of all frameworks and libraries |
| `src/application` | Application | Application orchestrations, use cases, DTOs with Zod validation | Depends only on Domain |
| `src/infrastructure` | Infrastructure | Supabase client, Dexie.js (IndexedDB), cloud storage adapters | Implements Domain interfaces |
| `src/presentation` | Presentation | Next.js App Router, React 19 UI components, Edge handlers | Consumes Application use cases & DTOs |

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| Framework | Next.js 15.5+ (App Router) | Server Components & Edge Route Handlers |
| UI Library | React 19 + Tailwind CSS v3 | Design System "Clinical Assurance" |
| Edge Runtime | OpenNext (`@opennextjs/cloudflare`) | Deployed via Cloudflare Workers & Wrangler |
| Persistence & Auth | Supabase PostgreSQL 15+ & Storage | Row Level Security (RLS) multi-tenant policies |
| Offline Storage | Dexie.js | IndexedDB local client replica |
| Validation | Zod 3.24+ | DTO and boundary request validations |
| State Management | Zustand 5.0+ | Reactive client state and rubric synchronizer |
| Testing | Vitest 4.1+ & React Testing Library | In-memory repositories for 100% testable domain logic |

## Commands

| Task | Command | Description |
|---|---|---|
| Install | `npm install` | Installs dependencies and restores Antigravity skills |
| Dev (Local) | `npm run dev` | Starts Next.js dev server on localhost:3000 |
| Dev (Develop Env) | `npm run dev:develop` | Starts Next.js dev server using `.env.develop` |
| Test | `npm test` | Runs Vitest unit and integration test suite |
| Test Watch | `npm run test:watch` | Runs Vitest in interactive watch mode |
| Test Coverage | `npm run test:coverage` | Generates Vitest code coverage report |
| Lint | `npm run lint` | Runs Next.js ESLint verification |
| Build (Next.js) | `npm run build` | Compiles Next.js production build |
| Build (Worker) | `npm run build:worker` | Packages Cloudflare Worker bundle with OpenNext |
| Preview (Worker) | `npm run preview` | Builds with OpenNext and runs Cloudflare Wrangler locally |
| Deploy (Worker) | `npm run deploy` | Deploys OpenNext bundle to Cloudflare Workers |

## Critical Domain Conventions

1. **Clean Architecture Isolation:** Never import infrastructure packages (`@supabase/*`, `dexie`, `next/*`) inside `src/domain/` or `src/application/`. Keep business logic purely functional and object-oriented.
2. **Critical Food Safety Vetoes (APPCC):** Non-compliance on points 1.7 (Potable Water), 2.5 (Infectious Symptom Exclusion), or 3.1 (Cold Chain Critical Temperature) automatically triggers an immediate sanitary veto in `ComplianceCalculatorService`.
3. **Offline-First Synchronization:** The field inspector rubric operates primarily against Dexie.js in IndexedDB. Remote synchronizations to Supabase must be idempotent and handle conflict resolution without losing evidence photos or signatures.
4. **Evidence & Signature Integrity:** Digital signatures captured via Canvas must be encoded in base64 / PNG and validated before committing to Supabase Storage.
5. **No Direct Secret Leaks:** Never commit `.env` or production credentials. Use Cloudflare Worker environment variables and Supabase RLS for data isolation.
