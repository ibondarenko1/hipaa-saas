# Claude (Anthropic API) — включение и проверка

**Claude не «запускается» отдельно** — это вызовы API Anthropic из backend. Если ключ не задан, backend не вызывает Claude: запросы документов идут через fallback (по списку контролов без доказательств), AI-нарратив в отчёте — шаблонный.

## Настройка

1. **Ключ Anthropic:** https://console.anthropic.com/ → API Keys → Create Key. Скопируй ключ (начинается с `sk-ant-`).

2. **Файл `.env`** в корне проекта (рядом с `docker-compose.yml`). Если его нет: `cp .env.example .env`. Добавь или раскомментируй:
   ```env
   ANTHROPIC_API_KEY=sk-ant-твой_ключ
   CLAUDE_ANALYST_ENABLED=true
   ```
   Сохрани файл.

3. **Перезапуск backend**, чтобы подхватить переменные:
   ```powershell
   docker compose up -d --force-recreate backend
   ```

4. **Проверка, что Claude реально работает:**
   - Быстро: `Invoke-RestMethod -Uri "http://localhost:8000/health"` → `claude_configured: True` значит ключ задан.
   - **Полная проверка (тест API):** залогинься в портал, затем в браузере или через API с токеном вызови `GET /api/v1/claude/check`. В ответе: `claude_usable: True` — API отвечает; если `claude_usable: False` — смотри `claude_error` и `claude_error_message` (например, **insufficient_credits** — пополни счёт в console.anthropic.com → Plans & Billing; **invalid_api_key** — неверный ключ). Так сразу видно биллинг/ключ, без ожидания генерации отчёта.

   Либо скрипт:
   ```powershell
   .\docs\check-claude.ps1
   ```
   Должно быть: `anthropic_key_set: True`, `claude_analyst_enabled: True`.

## Как использовать (API)

1. Загрузи файл доказательства в Evidence по контролю (через портал или API).
2. **POST** `/api/v1/evidence/{evidence_file_id}/extract` с телом `{"assessment_id": "...", "force_reextract": false}` — извлечение текста из PDF/DOCX/XLSX.
3. **POST** `/api/v1/evidence/{evidence_file_id}/analyze` с телом `{"assessment_id": "...", "control_id": "..."}` — запуск анализа Claude, результат сохраняется в `evidence_assessment_results`.
4. **GET** `/api/v1/assessments/{assessment_id}/controls/{control_id}/evidence-results` — список результатов анализа по контролю.

В портале: в Evidence по контролю можно добавить кнопку «Request analysis» (extract + analyze) и показывать статус/результат (validated / weak / mismatch / unreadable).
