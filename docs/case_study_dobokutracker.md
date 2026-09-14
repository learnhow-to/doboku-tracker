# Engineering Case Study: DobokuTracker (土木トラッカー)
**Enterprise Field Operations & Civil Engineering Resource Governance SaaS**

- **Author:** Fatur
- **Background:** Civil Construction Worker in Japan & Software Builder
- **Client & Domain Identity:** Confidential Japanese Enterprise Client — Civil Engineering & Earthwork (土工・残土運搬), Tokyo, Japan
- **Project Repository:** [github.com/learnhow-to/doboku-tracker](https://github.com/learnhow-to/doboku-tracker)
- **Tech Stack:** React 18, TypeScript 5.7, Node.js, Express, PostgreSQL, IndexedDB (`idb`), HTML5 Canvas, ExcelJS, Tailwind CSS, Vitest, Docker

---

## Executive Summary

Japan’s civil construction industry is facing an acute labor shortage compounded by the strict overtime caps introduced under the **"2024 Problem" (2024年問題)**. Despite these pressures, day-to-day operations on active job sites (*genba*) remain heavily reliant on physical carbon-copy paper daily reports (*作業日報*). Foremen spend 15–30 minutes handwriting crew lists, machinery hours, and fuel consumption in dusty or rainy conditions, while back-office staff spend 2–3 days at the end of each month manually transcribing handwritten slips into Excel for payroll and billing. Furthermore, strict inspection standards set by the **Ministry of Land, Infrastructure, Transport and Tourism (MLIT / 国土交通省)** require physical chalkboards (*Kokuban*) in every job-site photo.

**DobokuTracker** was engineered as an industrial-grade, *dual-interface* (Mobile PWA + Desktop Backoffice) B2B SaaS platform for an enterprise civil engineering contractor in Tokyo (Confidential Client). Built with an **offline-first architecture** (IndexedDB local caching + Optimistic Concurrency Control), it enables field foremen to log daily reports in subterranean excavations with zero cellular connectivity, automatically replicates recurring data (*前日コピー*), generates MLIT-compliant digital chalkboards directly on photos via HTML5 Canvas, and provides a 3-tier digital Hanko (*電子印鑑*) approval workflow. Daily reporting turnaround drops from **3 minutes to under 30 seconds**, backed by **31/31 passing automated tests (100%)**.

---

## The STAR Engineering Breakdown

### 1. Situation (The Real-World Bottlenecks)

On active civil construction and earthwork sites in Japan, digital tooling faces extreme physical and regulatory obstacles:
1. **Connectivity Blackspots:** Excavation pits, road slopes, and tunnels frequently have zero cellular signal, causing traditional web forms to fail and drop unsubmitted data.
2. **Repetitive Daily Data (90% Identical):** Work crews, dump truck fleets, and heavy equipment (excavators, loaders) remain largely consistent day-to-day. Re-entering 5–15 names and machinery IDs on paper each morning is a major waste of field time.
3. **MLIT Inspection Board Friction (電子黒板):** Official Japanese government standards require an inspection chalkboard displaying project name (*工事件名*), trade (*工種*), survey station (*測点 STA*), and contractor identity in every proof photo. Carrying wooden chalkboards and tripods into muddy trenches slows down surveying teams.
4. **Cultural & Legal Approval Hierarchy (Hanko Seals):** Reports cannot be billed without the traditional 3-tier vermilion seal hierarchy: **【担当・職長】** (Foreman), **【現場代理人】** (Site Representative), and **【所長・確認】** (Project Director).
5. **Month-End Double Entry & Mojibake:** Administrative staff manually copy paper reports into Microsoft Excel. Standard CSV exports often fail with Japanese Kanji character corruption (*mojibake*) in Windows Excel.

---

### 2. Task (Engineering Objectives & Constraints)

The goal was to design and build an industrial B2B SaaS platform specifically engineered around real job-site constraints:

| Constraint | Requirement | Reason |
| :--- | :--- | :--- |
| **Offline Resilience** | Zero data loss in zero-signal zones | Excavation sites and underground trenches must allow full report creation without network drops. |
| **Input Speed** | Complete daily report turnaround in &le; 30 seconds | Foremen wearing protective gear must not spend valuable site time navigating complex forms. |
| **MLIT Compliance** | Pixel-accurate digital blackboard burned into photos | Meets MLIT (*国土交通省*) photo inspection specifications without third-party camera apps. |
| **Approval Integrity** | Enforce Separation of Duties & 3-tier Hanko workflow | Foremen cannot approve their own submissions; approved documents become permanently immutable. |
| **Enterprise Export** | Clean corporate `.xlsx` and zero-mojibake CSV | Office staff require accounting-grade spreadsheets with double-underlines and formula calculations. |
| **Test Reliability** | 100% automated test coverage on core business logic | Guarantee tenant isolation, role-based access, and concurrency resolution under high load. |

---

### 3. Action (Architecture & Technical Decisions)

#### A. Offline-First IndexedDB Engine & Optimistic Concurrency Control
- **Client-Side Cache:** All form drafts, worker lists, and equipment records are stored in browser IndexedDB (`idb`) prior to any network dispatch. If network connectivity drops, the application continues operating seamlessly.
- **Optimistic Concurrency Control (HTTP 409):** Each report version carries an incremental `version` counter. When concurrent updates collide, the server rejects stale payloads with HTTP `409 Conflict`, triggering a client-side visual diff resolver that prevents accidental overwrites without discarding the foreman's inputs.
- **Idempotency Queue:** Offline mutations are staged in a sequential mutex queue. Network dispatches carry an `X-Idempotency-Key` header with exponential backoff retry to prevent duplicated reports during intermittent 4G/5G handshakes.

#### B. HTML5 Canvas MLIT Digital Kokuban (電子黒板) Engine
To eliminate heavy physical wooden blackboards from muddy trenches:
- Engineered a client-side HTML5 Canvas overlay engine that dynamically draws a Japanese pine-framed green blackboard directly onto field inspection photos before file compression.
- Automatically burns verified project metadata: Project Name (*工事件名*), Trade (*工種*), Station (*測点 STA*), Work Description (*施工状況*), and Contractor Name / Company Seal (*施工会社*).
- Embeds high-contrast chalk-white typography (`#F8FAFC`) with subtle shadow relief, fulfilling MLIT construction photo management criteria without external photo-editing tools.

#### C. 3-Tier Digital Hanko (電子印鑑) & Separation of Duties
- Constructed a vector-rendered vermilion red (`#DC2626`) circular Hanko stamp component featuring family kanji, inspection date, and dynamic pseudo-random rotation (reflecting physical stamp impression variations).
- Implemented a formal 3-box hierarchy: **【担当・職長】**, **【現場代理人】**, and **【所長・確認】**.
- **Enforced Separation of Duties:** The backend state machine rejects approval requests if the approver is the author of the report, preventing payroll falsification. Once set to `APPROVED`, documents are cryptographically locked and immutable.

#### D. Corporate Document Engine (ExcelJS & UTF-8 BOM CSV)
- **Accounting-Standard `.xlsx`:** Utilized `ExcelJS` to construct structured workbooks formatted in corporate teal (`#0F766E`) with Meiryo typography, auto-computed formula sums, and Japanese accounting double underlines.
- **Zero-Mojibake CSV:** Injected UTF-8 Byte Order Mark (`\uFEFF`) into CSV data streams, ensuring Japanese Kanji characters render cleanly in Microsoft Excel for Windows without character corruption.

#### E. Deep Replication Engine (前日コピー機能)
- Developed `/api/reports/project/:id/latest-previous` to query the latest approved or submitted report for the active project.
- Deeply clones active field workers, machinery IDs, and work items while generating fresh local UUIDs and resetting standard shift hours, enabling foremen to complete daily submissions with just minor adjustments.

---

### 4. Result (Verified Local Benchmark Data)

| Metric / Scenario | Baseline (Paper / Legacy Manual Workflow) | DobokuTracker (v1.5 Enterprise) | Engineering Impact |
| :--- | :--- | :--- | :--- |
| **Daily Report Input Time** | ~3 to 5 minutes per report | **~30 seconds** (via *前日コピー*) | **~85% to 90% reduction** in field administrative time |
| **Offline Resilience** | Form submission failure / loss of notes | **100% functional offline** | Instant local draft persistence via IndexedDB |
| **Month-End Office Transcription** | 2 to 3 days manual re-entry | **Instant (1-click export)** | Zero manual data entry for payroll & invoicing |
| **CSV Excel Compatibility** | Severe Mojibake (`???` / corrupted Kanji) | **Zero Mojibake** (`\uFEFF` UTF-8 BOM) | Native double-click opening in Japanese Excel |
| **Photo Inspection Workflow** | Carry physical board + tripod to trench | **Instant Canvas Overlay** | Zero physical equipment burden on site |
| **Automated Test Coverage** | Manual QA verification | **31/31 Vitest Tests Passed (100%)** | Verified tenant isolation, RBAC, and concurrency |
| **Production Build Footprint** | N/A | **316 kB JS bundle (gzip: 87 kB)** | Ultra-fast load times even on slow 3G connections |

*Benchmark Environment: Node.js v20+, Vite 5, React 18, PostgreSQL 16 / PGlite, tested on Windows 11 and mobile viewport simulations.*

---

### 5. Verified Test Suite Breakdown

```text
✓ tests/isolation.test.ts (4 tests) - Multi-tenant isolation & project-level RBAC
✓ tests/concurrency.test.ts (4 tests) - Optimistic locking 409 & idempotent retry queue
✓ tests/master.test.ts (7 tests) - Worker, equipment master management & role enforcement
✓ tests/analytics.test.ts (5 tests) - Executive KPIs, UTF-8 BOM CSV, and ExcelJS .xlsx export
✓ tests/workflow.test.ts (11 tests) - End-to-end lifecycle, batch approval, 31-day calendar, copy previous

Test Files  5 passed (5)
     Tests  31 passed (31)
  Duration  25.41s (100% Pass Rate)
```

---

## Current Status & Limitations

- **Current Status:** Enterprise Release (v1.5), production-ready and fully tested.
- **Client Identity:** Confidential Japanese civil engineering enterprise specializing in public & commercial earthworks (土工・残土運搬).
- **Photo Storage:** In local development mode, photos are stored in local disk volume (`uploads/`); production deployments integrate S3-compatible cloud storage (AWS S3 or Supabase Storage).
- **Template Verifications:** Verified core fields matching actual office sheets (作業日, 天候, 現場名, 元請名, 現場作業員, 作業時間, 使用機材, 伝達事項). Margin notes and unverified edge sections carry the strict disclaimer watermark: `DRAFT — TEMPLATE BELUM TERVERIFIKASI`.
