# TRABAJO DE FIN DE MÁSTER / PROYECTO DE FIN DE GRADO

**Título del Proyecto:** Desarrollo de una Aplicación Web Interactiva para Auditorías Higiénico-Sanitarias y Control del Sistema APPCC en la Industria Alimentaria.  
**Plataforma de Producción:** **BioAudit Pro** — Next.js 15 (App Router) · OpenNext Cloudflare Workers · Clean Architecture · Domain-Driven Design (DDD) · Supabase PostgreSQL & Storage · Vitest Testing Suite.

---

## RESUMEN EJECUTIVO
El presente proyecto describe el diseño, desarrollo e implementación de una solución web de grado industrial, orientada a dispositivos móviles y tablets, destinada a la ejecución de auditorías higiénico-sanitarias in situ bajo el marco normativo del **Reglamento (CE) Nº 852/2004**, **Codex Alimentarius** e **ISO 22000**.

La solución ha sido completamente estructurada bajo **Clean Architecture** y **Domain-Driven Design (DDD)**, separando de forma estricta los flujos de Frontend (PWA Offline-First con IndexedDB, Canvas API para firmas y cámara en tiempo real) y Backend (Route Handlers Edge, Casos de Uso aislados, Repositorios con Supabase y políticas RLS), preparada para despliegue distribuido de alto rendimiento en **Cloudflare Workers** mediante **OpenNext** (`@opennextjs/cloudflare`).

---

## 1. MARCO NORMATIVO Y TEÓRICO
El sistema modela fielmente los principios de inocuidad y control oficial de alimentos:
* **Reglamento (CE) Nº 178/2002:** Principios generales de la legislación alimentaria y trazabilidad bidireccional (Artículos 17 y 18).
* **Reglamento (CE) Nº 852/2004:** Higiene de los productos alimenticios y aplicación de los 7 principios del sistema APPCC.
* **Norma ISO 22000:2018:** Sistemas de gestión de inocuidad alimentaria y control de Puntos de Control Crítico (PCC/CCP) y Programas de Prerrequisitos (PPR).
* **Rúbrica de 30 Puntos de Control:** Dividida en tres categorías con detección automática de vetos sanitarios ante no conformidades críticas:
  1. *Infraestructura y Equipos* (Puntos 1.1 a 1.10) — Punto crítico 1.7 (Agua potable).
  2. *Higiene y Manipulación del Personal* (Puntos 2.1 a 2.10) — Punto crítico 2.5 (Exclusión por sintomatología infecciosa).
  3. *APPCC, Cadena de Frío y Procesos* (Puntos 3.1 a 3.10) — Punto crítico 3.1 (Monitorización de temperaturas críticas de frío).

---

## 2. ARQUITECTURA DE SOFTWARE & PILA TECNOLÓGICA

```
src/
├── domain/                                  # CAPA DE DOMINIO (Independiente de librerías externas)
│   ├── entities/                            # Audit (Aggregate Root), Company, Auditor, ControlPoint
│   ├── value-objects/                       # Cif, Score, Signature, EvidencePhoto
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
│   ├── database/supabase/                   # SupabaseClient SSR, Migraciones SQL, SupabaseAuditRepository, SupabaseCompanyRepository
│   ├── storage/                             # SupabaseStorageRepository (Evidencias y Firmas)
│   └── offline/                             # Dexie.js (IndexedDB) para operación de campo sin internet
│
└── presentation/                            # CAPA DE PRESENTACIÓN (Next.js & Frontend)
    ├── app/                                 # Next.js App Router (Páginas y Route Handlers Edge)
    │   ├── api/audits/                      # API Endpoints (POST /api/audits, GET, evaluate, finalize)
    │   ├── (auth)/login/                    # Portal oficial de inspectores
    │   └── (dashboard)/auditorias/          # Rúbrica de campo (/rubrica), Laudo oficial (/relatorio), Solicitud (/nova)
    └── components/                          # Design System "Clinical Assurance" (Header, ProgressTracker, RubricControlCard, SignatureModal, ReportView)
```

### Pila Tecnológica
* **Framework:** Next.js 15.5+ (App Router, Server Components y Edge Route Handlers).
* **Adaptador Cloudflare:** `@opennextjs/cloudflare` + `wrangler` (`.open-next/worker.js`).
* **Base de Datos & Auth:** Supabase (PostgreSQL 15+, Row Level Security - RLS, Supabase Storage).
* **Diseño & UI:** Tailwind CSS v3 con tokens del Design System *Clinical Assurance* (paleta esmeralda `#059669`, pizarra `#1E293B`, tipografía Inter, iconos Material Symbols).
* **Modo Offline:** Dexie.js (IndexedDB local replica).
* **Firmas & Evidencias:** HTML5 Canvas API táctil + captura de cámara en tiempo real.
* **Generación de Laudo:** Estilizado `@media print` A4 para impresión o exportación instantánea a PDF nativo sin librerías pesadas en el cliente.
* **Testing:** Vitest + React Testing Library (100% testabilidad en dominio y casos de uso con repositorios en memoria).

---

## 3. INSTALACIÓN Y EJECUCIÓN

### Requisitos Previos
* Node.js v20+ o v22 LTS instalado.
* NPM v10+.

### 1. Instalación de Dependencias
```bash
npm install
```

### 2. Ejecución de la Suíte de Testes Unitários
```bash
npm test
```
*Executa 19 testes automatizados cobrindo entidades, value objects, cálculo de APPCC e casos de uso isolados.*

### 3. Modo Desenvolvimento
```bash
npm run dev
```
Acessar `http://localhost:3000`.

### 4. Compilação de Produção Next.js & Cloudflare Worker (OpenNext)
```bash
# Build do Next.js
npm run build

# Build e empacotamento do Cloudflare Worker com OpenNext
npm run build:worker
```
O pacote compilado do worker será gerado em `.open-next/worker.js`.

### 5. Pré-visualização com Wrangler
```bash
npm run preview
```

---

## 4. MAPEAMENTO DE TELAS E ROTAS

| Tela do Sistema | Rota Next.js | Referência em `@temp` | Funcionalidade Principal |
| :--- | :--- | :--- | :--- |
| **Login do Inspetor** | `/login` | `temp/iniciar_sesi_n_bioaudit_pro` | Autenticação NIF/NIE, status PWA offline, seleção de perfil oficial. |
| **Solicitação de Auditoria** | `/auditorias/nova` | `temp/solicitud_y_propuesta_de_auditor_a` | Stepper em 3 passos: normativa, escopo da planta e abertura da auditoria. |
| **Rúbrica de Inspeção** | `/auditorias/[id]/rubrica` | `temp/r_brica_de_inspecci_n_sanitaria` | 30 pontos de controle com avaliação (0/1/2), fotos com pré-visualização, medidor circular SVG dinâmico e filtro por categorias. |
| **Laudo Técnico Oficial** | `/auditorias/[id]/relatorio` | `index.html` (Relatório A4) | Laudo técnico formatado para impressão A4 (`window.print()`), exibição de assinaturas ratificadas e tabela de não-conformidades. |
| **Controle de Licença** | `/suscripcion` | `temp/control_de_suscripci_n` / `control_de_acceso` | Gestão de planos profissionais, conformidade regulatória e bloqueio de acesso. |

---

## 5. CONCLUSÕES DO TRABALHO DE FIM DE MÁSTER (TFM)
A modernização da solução para **Next.js com OpenNext no Cloudflare**, aliada à **Clean Architecture** e **DDD**, resolveu os desafios de escalabilidade e confiabilidade do protótipo inicial:
1. **Separação Rígida de Responsabilidades:** O núcleo de regras de segurança alimentar (cálculos de conformidade, classificação de CCPs e validações) encontra-se totalmente desacoplado da tecnologia de persistência e da interface visual.
2. **Resiliência de Campo:** A combinação de PWA com IndexedDB garante que inspetores atuem com total fluidez em áreas sem cobertura de rede (câmaras frigoríficas, porões e áreas rurais), sincronizando dados com o Supabase quando a conexão for reestabelecida.
3. **Desempenho Global na Borda:** A compilação em Cloudflare Workers elimina custos de servidores virtuais e reduz a latência de carregamento a milissegundos em qualquer localidade.
4. **Auditabilidade e Segurança:** O banco de dados PostgreSQL estruturado com políticas RLS garante isolamento criptográfico entre inspetores e empresas auditadas, em conformidade com o RGPD e as exigências sanitárias europeias.

---
*Documento gerado em cumprimento aos requisitos de apresentação técnica, teórica e normativa do Trabalho de Fim de Máster (TFM).*
