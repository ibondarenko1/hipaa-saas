# HIPAA: изоляция контекста ИИ по tenant (multi-tenant SaaS)

Обязательное требование: Claude/OpenAI получают данные **строго одного** tenant. Никогда — данные нескольких клиентов в одном контексте или «память» о другом клиенте.

---

## Ответы на три вопроса (текущее состояние после правок)

### 1. ai_evidence.py — проверка принадлежности evidence_file_id тенанту перед analyze

**Есть.** Перед вызовом Claude используется `_require_evidence_and_assessment_membership()`:

- Загружается assessment по `body.assessment_id`.
- Проверяется, что пользователь — участник этого тенанта: `TenantMember.tenant_id == assessment.tenant_id`, `user_id == current_user.id`.
- Проверяется, что файл принадлежит тенанту assessment:  
  `EvidenceFile.id == evidence_file_id` **и** `EvidenceFile.tenant_id == assessment.tenant_id`.

Если файл из другого тенанта — 404 ("Evidence file not found or not in this tenant"). В Claude уходит только контент, уже привязанный к этому tenant через assessment.

---

### 2. Assistant/chat (OpenAI Concierge) — системный промпт и tenant_id

**Было:** в системный промпт попадали только `context_type`, `context_id`, `assessment_id`, `control_id`. Явного `tenant_id` и инструкции «только этот клиент» не было.

**Сделано:** в `get_assistant_reply()` добавлен параметр `tenant_id`; в системный промпт добавлена строка:

- `Tenant scope: tenant_id=<id>. Answer ONLY about this client's data. Do not reference or infer other tenants.`

В `assistant_chat` (ai_evidence.py) перед вызовом `get_assistant_reply` проверяется членство в тенанте (`TenantMember`); в вызов передаётся `tenant_id=str(tenant_id) if tenant_id else None`. Таким образом, контекст чата явно привязан к одному tenant.

---

### 3. Общее состояние между запросами (кэш промптов, история)

**Нет.** Проверено:

- **concierge_chat:** при каждом запросе создаётся новый `OpenAI(api_key=...)`, в `messages` передаются только текущие `system` и `user`. Истории между запросами нет.
- **report_generator (generate_ai_narrative):** при каждом вызове создаётся `anthropic.Anthropic(...)` и один `client.messages.create(...)`. Общего состояния между запросами нет.
- **claude_analyst (analyze):** клиент создаётся внутри вызова, без переиспользования между запросами.

Сессия/память между разными клиентами не используется.

---

## Три уровня изоляции (что сделано)

| Уровень | Описание | Статус |
|--------|----------|--------|
| **1. Данные в промпте** | В контекст Claude попадают только данные одного tenant. | В `build_full_report_context()` добавлен **assert**: `assessment.tenant_id == tenant_id`. Все выборки уже по `assessment_id` / `tenant_id`. |
| **2. Concierge (чат)** | В системный промпт явно вшит tenant_id и инструкция «только этот клиент». | В `get_assistant_reply()` добавлен параметр `tenant_id` и строка в system prompt. В роуте передаётся `tenant_id` после проверки членства. |
| **3. API до вызова ИИ** | Перед вызовом ИИ проверяется, что пользователь имеет доступ к запрашиваемому tenant. | **analyze:** `_require_evidence_and_assessment_membership` (assessment + membership + evidence.tenant_id). **chat:** проверка `TenantMember`; без членства — 403. **report:** генерация вызывается из роута reports с `tenant_id` из path; проверка membership через `get_membership`. |

---

## Файлы изменений

- `backend/app/services/report_context_builder.py` — assertion после загрузки assessment.
- `backend/app/services/concierge_chat.py` — параметр `tenant_id`, строка в системном промпте.
- `backend/app/api/routes/ai_evidence.py` — вызов `get_assistant_reply(..., tenant_id=...)`.

Отдельная SESSION_8 не нужна: барьеры добавлены патчем к текущей реализации.
