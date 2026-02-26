# Next Layer — AI Evidence Validation & Client Concierge (сводка ТЗ)

Краткая выжимка спецификации из папки **docs/next layer/** (полные документы — .docx в той же папке).

---

## Цель модуля

- **AI Evidence Validation & Client Concierge Layer**: переход от «клиент загрузил файл → система считает, что evidence есть» к «загрузил → AI проверил пригодность → при необходимости запросил исправление → результат влияет на оценку».
- **Два AI-слоя:** Claude (Analyst) — анализ evidence; ChatGPT (Concierge) — общение с клиентом, объяснения, задачи. Claude = источник истины по анализу, ChatGPT только коммуникация.
- **Результат:** статусы evidence (validated / weak / mismatch / unreadable), клиентские задачи (ClientTask), цикл Upload → Validate → Explain → Fix → Re-evaluate.

---

## Scope (входит)

- AI-валидация evidence (Claude): извлечение текста, классификация типа документа, релевантность/полнота/актуальность, EvidenceAssessmentResult в БД.
- Каталог ожиданий по контролям (Control Expectation Spec).
- Агрегация по контролю (ControlEvidenceAggregate).
- Client Concierge (ChatGPT): объяснения, задачи, диалог в контексте задачи/вопроса, next best actions.
- Task-based feedback loop: ClientTask (open / client_replied / resolved / dismissed), привязка к assessment/control/evidence, повторный анализ после исправлений.
- Минимальные UI: статус AI в Evidence Vault, Ask Assistant, список задач, чат в контексте задачи.
- API: extract, analyze, evidence-results, recompute-aggregates, evidence-aggregates, tasks CRUD, assistant/chat.

---

## Out of Scope (не входит)

Юридические вердикты; автономная remediation/SOAR; runtime monitoring; полноценный BPMN; глубокая OCR; автоизменение ответов анкеты; замена deterministic compliance engine (модуль его дополняет).

---

## Ключевые контракты данных

| Контракт | Назначение |
|----------|------------|
| ControlExpectationSpec | Ожидания по контролю (типы evidence, required_elements, scoring_thresholds). |
| EvidenceExtraction | Результат извлечения текста/структуры из файла. |
| EvidenceAssessmentResult | Результат Claude: control_fit (status, scores), findings, recommended_next_step. |
| ControlEvidenceAggregate | Агрегат по assessment+control (status, score, evidence_count). |
| ClientTask | Задача клиенту: task_type, status, message_to_client, action_steps. |
| AssistantConversationContext | Контекст для ChatGPT (tenant, task/control, response_policy). |

---

## State machines

- **Evidence Processing:** uploaded → extract_pending → extracting → extracted / extract_failed → analysis_pending → analyzing → analyzed / analysis_failed; stale при смене файла/спека/промпта.
- **ClientTask:** open ↔ client_replied ↔ resolved / dismissed; client_user может только client_replied; resolved только после reanalysis или ручного review.

---

## План реализации (MVP)

1. **Phase 0** — заморозка контрактов и enum.
2. **Phase 1** — Backend: модели, state machines, extraction, Claude adapter, aggregate, Task Orchestrator, API.
3. **Phase 2** — UI: Evidence status badge, Task list/detail, Assistant chat; Internal AI panel и task queue.
4. **Phase 3** — Стабилизация, QA, degraded mode при сбое Claude/ChatGPT.

Полная декомпозиция backlog (BE-01…BE-13, FE-C-01…, FE-I-01…, AI-01…, INF, QA) — в документе **9. Implementation Plan (MVP → Phase 2) + backlog decomposition.docx** в папке **docs/next layer/**.

---

## Где лежит полная спецификация

- **docs/next layer/** — все разделы ТЗ в .docx:
  - 1. Цель.docx
  - 2. Scope Out of Scope.docx
  - 3. Архитектура компонентов (Component Architecture).docx
  - 4. Data Contracts (Claude ↔ System ↔ ChatGPT).docx
  - 5. API Endpoints.docx
  - 6. State Machines (Evidence Task).docx
  - 7. UI Changes (Client Internal).docx
  - 8. Acceptance Criteria.docx
  - 9. Implementation Plan (MVP → Phase 2) + backlog decomposition.docx
  - Technical Specification skeleton (ToR).docx
  - Заполненная версия разделов 0–4 (ToR).docx

Реализация модуля в коде: backend (models, API, services) и frontend — по мере выполнения Phase 1–3.
