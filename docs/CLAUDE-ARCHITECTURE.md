# Claude в архитектуре: данные, взаимодействие, артефакты

## Что есть сейчас

Claude (Anthropic API) используется в **двух независимых местах** с одним ключом `ANTHROPIC_API_KEY` и моделью `LLM_MODEL` (например `claude-opus-4-6`).

---

## 1. Claude Analyst (анализ доказательств)

**Назначение:** оценка одного файла доказательства по одному контролю HIPAA.

### Входные данные

| Источник | Что передаётся в Claude |
|----------|-------------------------|
| **EvidenceExtraction** | `extraction_result.extracted_text` — текст из файла (PDF/DOCX/XLSX), до 12 000 символов |
| **Control** | `hipaa_control_id` или `id`, `title` |
| **ControlExpectationSpec** (опционально) | `guidance_text` — ожидания по контролю |

Текст для извлечения берётся из **EvidenceFile** (MinIO): файл скачивается, из него локально извлекается текст (pypdf, python-docx, openpyxl). Изображения (PNG/JPEG) без OCR — пустой текст → статус `unreadable`.

### Цепочка данных

```
EvidenceFile (storage) 
  → run_extraction() → EvidenceExtraction (status, extraction_result JSON)
  → request_analyze() → Claude API
  → EvidenceAssessmentResult (запись в БД)
```

### Что создаётся

**Таблица `evidence_assessment_results`** (модель `EvidenceAssessmentResult`):

| Поле | Описание |
|------|----------|
| `id` | UUID |
| `tenant_id`, `assessment_id`, `control_id`, `evidence_file_id` | Связи с контекстом |
| `extraction_id` | Ссылка на EvidenceExtraction |
| `provider` | `"anthropic"` |
| `model`, `prompt_version` | Версия модели и промпта |
| `status` | Один из: `validated` \| `weak` \| `mismatch` \| `unreadable` |
| `overall_strength` | 0.0–1.0 |
| `confidence` | 0.0–1.0 |
| `result_payload` | Полный ответ Claude (JSON): status, overall_strength, confidence, findings[], recommended_next_step, document_type_detected |

### API

- **POST** `/api/v1/evidence/{evidence_file_id}/extract` — сначала извлечь текст (если ещё не сделано), затем можно вызывать analyze.
- **POST** `/api/v1/evidence/{evidence_file_id}/analyze` — body: `assessment_id`, `control_id`, опционально `force_reanalyze`. Требует успешный extraction по этому файлу и assessment.
- **GET** `/api/v1/assessments/{assessment_id}/controls/{control_id}/evidence-results` — список результатов анализа по контролю (все evidence_files для этого control).

### Контракт ответа Claude (Analyst)

В промпте запрашивается один JSON-объект с ключами:

- `status` — validated | weak | mismatch | unreadable  
- `overall_strength` — число 0–1  
- `confidence` — число 0–1  
- `findings` — массив строк  
- `recommended_next_step` — строка  
- `document_type_detected` — строка или null (policy, procedure, screenshot, log и т.д.)

Парсинг: из ответа ищется JSON-блок (```json ... ``` или первый `{ ... }`), иначе возвращается fallback `unreadable`.

---

## 2. Report narrative (Executive Summary)

**Назначение:** генерация текста нарратива для отчёта (Executive Compliance Summary).

### Входные данные

Источник — **только движок оценки (engine)**, не Evidence Assessment Results:

| Источник | Что передаётся в Claude |
|----------|-------------------------|
| **Tenant** | `name` |
| **Assessment** | `submitted_at` |
| **Stats** (агрегаты по ControlResult) | total, pass, fail, partial, unknown, gaps |
| **Top gaps** (таблица Gap) | до 8 гэпов: severity, description |

То есть Claude для отчёта **не видит** ни файлов доказательств, ни `EvidenceAssessmentResult` — только результаты ответов на вопросы (ControlResult → Gap).

### Что создаётся

- **Никакой новой записи в БД.** Текст нарратива возвращается из `generate_ai_narrative()` и сразу вставляется в PDF (Executive Summary). При отсутствии ключа или ошибке используется шаблонный текст `_template_narrative()`.

### Где вызывается

- В `report_generator`: при сборке пакета отчёта вызывается `generate_ai_narrative(tenant, assessment, stats, top_gaps, ai_tone)`. Данные для `stats` и `top_gaps` берутся из БД (ControlResult, Gap).

---

## Сводка

| Аспект | Claude Analyst (evidence) | Report narrative |
|--------|---------------------------|------------------|
| **Вход** | Текст из файла доказательства + контроль + опционально guidance | Тенант, оценка, stats по ControlResult, список гэпов (Gap) |
| **Что создаёт** | Запись в `evidence_assessment_results` | Только текст в PDF, в БД не сохраняется |
| **API** | extract → analyze; GET evidence-results | Нет отдельного API; вызов из генератора отчётов |
| **Конфиг** | `CLAUDE_ANALYST_ENABLED`, `ANTHROPIC_API_KEY`, `LLM_MODEL` | `LLM_ENABLED`, `ANTHROPIC_API_KEY`, `LLM_MODEL` |

---

## Что не связано с Claude (пока)

- **ControlEvidenceAggregate** — таблица есть, но эндпоинт `POST .../recompute-evidence-aggregates` — заглушка (рекомендованная «полная реализация BE-06»). Агрегаты по контролю из `EvidenceAssessmentResult` нигде не заполняются и не используются в отчётах.
- **Отчёты (Gap Register, Risk Register, Roadmap, Evidence Checklist)** строятся по данным engine (ControlResult, Gap, Risk, RemediationAction, EvidenceLink и т.д.), а не по `evidence_assessment_results`. То есть результаты анализа доказательств Claude не попадают в текущие артефакты отчёта.

Итого: Claude Analyst пишет в `evidence_assessment_results`; эти данные доступны через API и могут использоваться Concierge/UI, но пока не участвуют в агрегатах и в генерации отчётов.
