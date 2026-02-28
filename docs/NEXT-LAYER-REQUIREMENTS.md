# Что требуется для реализации Next Layer (два AI-слоя)

Чек-лист ресурсов и работ для реализации модуля **AI Evidence Validation & Client Concierge** (Claude Analyst + ChatGPT Concierge).

---

## 1. Внешние зависимости (API, ключи)

| Требование | Назначение |
|------------|------------|
| **Anthropic API key** | Claude (Analyst): анализ evidence, извлечение смысла, оценка по контролю. Уже есть в конфиге: `ANTHROPIC_API_KEY`, `LLM_MODEL` (claude-opus-4-6). |
| **OpenAI API key** | ChatGPT (Concierge): диалог с клиентом, объяснения, next best actions в контексте задачи. Нужно добавить в конфиг: `OPENAI_API_KEY`, при необходимости `OPENAI_MODEL`. |
| **Доступ к файлам evidence** | Для extraction и анализа: чтение загруженных файлов из MinIO (уже есть через storage service). |

---

## 2. Backend — что реализовать

Уже есть: модели БД (миграция 008), схемы Pydantic, заглушки API в `backend/app/api/routes/ai_evidence.py`.

### 2.1 Extraction (извлечение текста из файла)

- Сервис/воркер: скачать файл из MinIO → извлечь текст (PDF: PyMuPDF/pdfplumber; DOCX/XLSX: python-docx/openpyxl; изображения: опционально OCR, например Tesseract).
- Запись в `evidence_extractions` (status: extract_pending → extracting → extracted / extract_failed).
- Реализовать логику POST `/evidence/{id}/extract`, GET `/evidence/{id}/extraction` (вместо заглушек).

### 2.2 Claude Adapter (Analyst)

- Вызов Anthropic API: промпт + извлечённый текст + контекст контроля (и при необходимости Control Expectation Spec).
- Парсинг ответа в структуру EvidenceAssessmentResult (status, overall_strength, confidence, findings, recommended_next_step).
- Запись в `evidence_assessment_results`; обновление статусов в state machine (analysis_pending → analyzing → analyzed / analysis_failed).
- Реализовать POST `/evidence/{id}/analyze`, GET evidence-results (вместо заглушек).

### 2.3 Control Expectation Spec

- Модель/таблица или JSON-каталог: по каждому контролю (control_id) — ожидаемые типы документов, required_elements, scoring_thresholds.
- Нужен seed или миграция с начальным каталогом (можно начать с подмножества контролов).

### 2.4 Aggregates (агрегаты по контролю)

- Сервис пересчёта: по assessment_id собрать все EvidenceAssessmentResult по контролам → записать/обновить `control_evidence_aggregates` (status, score, evidence_count).
- Реализовать POST `recompute-evidence-aggregates`, GET `evidence-aggregates` с реальными данными из БД.

### 2.5 Task Orchestrator

- Создание/обновление ClientTask на основе результатов Claude (например, при weak/mismatch/unreadable — создать задачу клиенту).
- Переходы по state machine задачи: open ↔ client_replied ↔ resolved / dismissed; правила, кто может менять статус (client_user только client_replied; resolved — после reanalysis или ручного review).
- Реализовать GET/PATCH `/tasks`, GET `/tasks/{id}` с реальной логикой и проверкой membership.

### 2.6 ChatGPT Adapter (Concierge)

- Формирование контекста для чата: tenant, assessment, задача (если есть), агрегаты по контролю, response_policy (чтобы ответы не выходили за рамки).
- Вызов OpenAI API (Chat Completions); сохранение сообщений в `assistant_message_logs`.
- Реализовать POST `/assistant/chat`: подстановка контекста, вызов модели, возврат assistant_message, при необходимости actionable_guidance и task_suggestion.

### 2.7 Конфиг и degraded mode

- Добавить в `core/config`: `OPENAI_API_KEY`, `OPENAI_MODEL` (например gpt-4o), флаги `CLAUDE_ANALYST_ENABLED`, `CHATGPT_CONCIERGE_ENABLED`.
- При отсутствии ключа или ошибке API: не падать, возвращать понятный статус (например «AI temporarily unavailable») и по возможности работать без AI (только ручной ввод задач).

---

## 3. Frontend — что реализовать

- **Evidence Vault / Evidence по контролю:** бейдж статуса AI (validated / weak / mismatch / unreadable), кнопка «Request analysis» (вызов extract + analyze).
- **Список задач (Client):** список ClientTask по тенанту/оценке, фильтр по статусу, переход в детальную задачу.
- **Детальная задача:** текст задачи, шаги действий, кнопка «Reply» / «Mark resolved» где допустимо.
- **Assistant chat:** виджет «Ask Assistant»; контекст (текущая задача или выбранный контроль); отправка сообщения, отображение ответа и (optionally) suggested next action.
- **Internal (опционально):** панель очереди задач, ручное создание/закрытие задач, просмотр логов assistant.

---

## 4. Порядок работ (кратко)

1. **Конфиг:** добавить OPENAI_API_KEY, OPENAI_MODEL, флаги включения AI.
2. **Extraction:** сервис извлечения текста + эндпоинты extract/extraction.
3. **Control Expectation Spec:** модель/seed данных.
4. **Claude adapter:** вызов API, запись EvidenceAssessmentResult, эндпоинты analyze и evidence-results.
5. **Aggregates:** пересчёт и эндпоинты recompute-aggregates, evidence-aggregates.
6. **Task Orchestrator:** создание/обновление задач, CRUD tasks.
7. **ChatGPT adapter:** контекст + вызов API, assistant/chat, логирование.
8. **UI:** статус AI в Evidence, список/детали задач, чат ассистента.
9. **Стабилизация:** обработка ошибок, degraded mode, тесты.

---

## 5. Итого

- **Нужно извне:** Anthropic API key (уже учтён), OpenAI API key (добавить).
- **Нужно в коде:** реализация сервисов и адаптеров (extraction, Claude, aggregates, Task Orchestrator, ChatGPT), замена заглушек API на реальную логику, UI-компоненты и degraded mode.

Полная декомпозиция задач (BE-01…BE-13, FE-…, AI-01…) — в **docs/next layer/9. Implementation Plan (MVP → Phase 2) + backlog decomposition.docx**.
