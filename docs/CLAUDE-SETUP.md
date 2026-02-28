# Claude Analyst (слой анализа доказательств)

Claude используется для оценки загруженных доказательств по HIPAA-контролям (extract текста → analyze).

## Настройка

1. **Ключ Anthropic:** https://console.anthropic.com/ → API Keys → Create Key. Скопируй ключ (начинается с `sk-ant-`).

2. **Добавь в `.env`** в корне проекта (рядом с `docker-compose.yml`):
   ```env
   ANTHROPIC_API_KEY=sk-ant-твой_ключ
   CLAUDE_ANALYST_ENABLED=true
   ```
   Сохрани файл. В `.env` уже могут быть `OPENAI_API_KEY` и `CHATGPT_CONCIERGE_ENABLED` — оставь их.

3. **Пересоздай backend**, чтобы подхватить переменные:
   ```powershell
   docker compose up -d --force-recreate backend
   ```

4. **Проверка:**
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
