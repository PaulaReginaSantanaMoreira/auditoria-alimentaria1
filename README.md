# BioAudit Pro — Enterprise Food Safety Auditing & HACCP Platform

**Plataforma de Producción:** Next.js 15 (App Router) · OpenNext Cloudflare Workers · Clean Architecture · Domain-Driven Design (DDD) · Supabase PostgreSQL 15+ (RLS Multi-Tenant) · Dexie.js (Offline-First PWA) · Vitest Testing Suite.

---

## RESUMEN EJECUTIVO
**BioAudit Pro** es una plataforma SaaS multi-tenant de grado industrial, orientada a dispositivos móviles e inspecciones in-situ, destinada a la ejecución, cálculo normativo y firma digital de auditorías higiénico-sanitarias bajo el marco regulatorio del **Reglamento (CE) Nº 852/2004**, **Codex Alimentarius** e **ISO 22000:2018**.

Diseñada para entidades de certificación, consultoras de inocuidad y cadenas de la industria agroalimentaria, la plataforma cuenta con soporte para **subscripciones por empresa (tenants)**, gestión de **asientos de usuarios (RBAC)**, rúbrica de campo **PWA 100% offline**, captura de evidencias fotográficas, firmas biométricas en pantalla táctil y emisión instantânea de actas oficiales A4.

---

## 1. MARCO NORMATIVO Y REGULATORIO
El sistema modela fielmente los principios de inocuidad y control oficial de alimentos:
* **Reglamento (CE) Nº 178/2002:** Principios generales de la legislación alimentaria y trazabilidad bidireccional (Artículos 17 y 18).
* **Reglamento (CE) Nº 852/2004:** Higiene de los productos alimenticios y aplicación de los 7 principios del sistema APPCC.
* **Norma ISO 22000:2018:** Sistemas de gestión de inocuidad alimentaria y control de Puntos de Control Crítico (PCC/CCP) y Programas de Prerrequisitos (PPR).
* **Rúbrica de 30 Puntos de Control Oficial:** Con detección y veto sanitario automático ante no conformidades críticas:
  1. *Infraestructura y Equipos* (Puntos 1.1 a 1.10) — Punto crítico 1.7 (Agua potable y lavamanos no manuales).
  2. *Higiene y Manipulación del Personal* (Puntos 2.1 a 2.10) — Punto crítico 2.5 (Exclusión por sintomatología infecciosa).
  3. *APPCC, Cadena de Frío y Procesos* (Puntos 3.1 a 3.10) — Punto crítico 3.1 (Monitorización de temperaturas críticas de refrigeración).

---

## 2. ARQUITECTURA DE SOFTWARE & PILA TECNOLÓGICA

```
src/
├── domain/                                  # CAPA DE DOMINIO (Independiente de frameworks)
│   ├── entities/                            # Audit (Aggregate Root), Company, Auditor, ControlPoint, Tenant, Subscription
│   ├── value-objects/                       # Cif, Score, Signature, EvidencePhoto
│   ├── security/                            # roles-and-permissions.ts (RBAC, Scopes: TENANT, CONFIDENTIAL, PRIVATE)
│   ├── services/                            # ComplianceCalculatorService, NormativeCatalogService
│   ├── repositories/                        # IAuditRepository, ICompanyRepository, IStorageRepository
│   ├── constants/                           # default-control-points.ts (30 puntos normativos)
│   └── errors/                              # DomainError, InvalidCifError, IncompleteAuditError
│
├── application/                             # CAPA DE APLICACIÓN (Casos de Uso & DTOs)
│   ├── dtos/                                # CreateAuditDTO, EvaluatePointDTO, FinalizeAuditDTO (Zod)
│   └── use-cases/                           # CreateAuditUseCase, EvaluatePointUseCase, FinalizeAndSignAuditUseCase, GetAuditReportUseCase
│
├── infrastructure/                          # CAPA DE INFRAESTRUCTURA (Adaptadores Secundarios)
│   ├── database/                            # Repositorios genéricos (AuditRepository, CompanyRepository)
│   │   └── supabase/                        # Cliente SSR, migraciones SQL, RLS multi-tenant
│   ├── storage/                             # SupabaseStorageRepository (Evidencias públicas y Firmas privadas)
│   ├── offline/                             # Dexie.js (IndexedDB local con Outbox Pattern)
│   └── security/                            # jwt-service.ts (HS256 com segredo estrito), session-resolver.ts
│
└── presentation/                            # CAPA DE PRESENTACIÓN (Next.js & Frontend)
    ├── app/                                 # Next.js App Router (Páginas e Route Handlers Edge)
    │   ├── api/audits/                      # API Endpoints (POST /api/audits, evaluate, finalize)
    │   ├── (auth)/login/                    # Portal oficial de inspectores y administradores
    │   └── (dashboard)/auditorias/          # Rúbrica de campo (/rubrica), Laudo oficial (/relatorio), Solicitud (/nova)
    ├── components/                          # Design System "Clinical Assurance" (Tailwind CSS, Canvas)
    └── utils/                               # Helper cn() para merge de classes Tailwind
```

### Pila Tecnológica
* **Framework:** Next.js 15.5+ (App Router, Server Components y Edge Route Handlers).
* **Adaptador Cloudflare:** `@opennextjs/cloudflare` + `wrangler` (`.open-next/worker.js`).
* **Base de Datos & Auth:** Supabase (PostgreSQL 15+, Row Level Security - RLS, Supabase Storage).
* **Diseño & UI:** Tailwind CSS v3 con tokens del Design System *Clinical Assurance* (paleta esmeralda `#059669`, pizarra `#1E293B`, tipografía Inter, iconos Material Symbols).
* **Modo Offline:** Dexie.js (IndexedDB local replica com Outbox Mutation Pattern).
* **Firmas & Evidencias:** HTML5 Canvas API táctil calibrado para Retina/High-DPI + captura de cámara en tiempo real.
* **Generación de Laudo:** Estilizado `@media print` A4 para impresión o exportación instantánea a PDF nativo sin librerías pesadas en el cliente.
* **Testing:** Vitest + React Testing Library (100% testabilidad en dominio, casos de uso e componentes de UI com Triple AAA).

---

## 3. REGISTROS DE DECISIÓN ARQUITECTURAL (ADRs)
Las decisiones técnicas fundamentales del proyecto están documentadas formalmente en `docs/adr/`:
- [ADR-001: Cloudflare Workers & OpenNext Edge Computing](docs/adr/ADR-001-cloudflare-workers-opennext.md)
- [ADR-002: PWA Offline-First com Dexie.js e Outbox Pattern](docs/adr/ADR-002-pwa-offline-dexie-outbox.md)
- [ADR-003: Nomenclatura Limpa e Abstração de Repositórios](docs/adr/ADR-003-repository-naming-and-database-abstraction.md)
- [ADR-004: Segurança Criptográfica JWT e Armazenamento Privado de Firmas](docs/adr/ADR-004-jwt-security-and-private-signature-storage.md)
- [ADR-005: Padrão de Engenharia de Testes (Triple AAA e Sem Tautologia)](docs/adr/ADR-005-testing-standards-and-quality-gate.md)

---

## 4. INSTALACIÓN Y EJECUCIÓN

### Requisitos Previos
* Node.js v20+ o v22 LTS instalado.
* NPM v10+.

### 1. Instalación de Dependencias & Skills de IA
```bash
npm install
```

### 2. Ejecución de la Suíte de Testes Automatizados
```bash
npm test
```
*Executa 38 testes automatizados cobrindo entidades, value objects, cálculo de APPCC, use cases e componentes de UI.*

### 3. Modo Desenvolvimento
```bash
# Modo com conexão ao Supabase Develop
npm run dev:develop

# Modo local padrão
npm run dev
```
Acessar `http://localhost:3000`.

### 4. Compilação de Produção Next.js & Cloudflare Worker (OpenNext)
```bash
# Build do Next.js
npm run build

# Build e empacotamento do Cloudflare Worker com OpenNext
npm run build:worker

# Pré-visualização local com Cloudflare Wrangler
npm run preview

# Deploy em produção nos Cloudflare Workers
npm run deploy
```
