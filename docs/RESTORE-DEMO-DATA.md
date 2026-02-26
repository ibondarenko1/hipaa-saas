# Восстановление тестовых (демо) данных

**Сначала:** если у вас есть бэкап БД — восстанавливайте из него (`.\restore-db.ps1 -BackupFile "backups\hipaa-backup-....sql"`). Так вернутся все клиенты и данные. См. [DATA-SAFETY.md](DATA-SAFETY.md).

Если бэкапа нет: ниже — как вернуть хотя бы демо-клиента и как в дальнейшем не терять данные.

---

Миграции (006, 007, 008) **не удаляют** таблицу `tenants` и не чистят данные. Данные обычно пропадают, когда:

- пересоздали БД (например, `docker-compose down -v` удалил том Postgres);
- backend подключается к другой базе (другой `DATABASE_URL` или новый контейнер);
- после чистой БД выполнили только миграции и не запускали сид.

---

## Как вернуть демо-клиента

Сид создаёт **одного** демо-клиента: **Valley Creek Family Practice** (логин: `client@valleycreek.example.com` / пароль: `Client2024!`). Второй клиент, если вы его создавали вручную через портал, в сиде не заложен — его нужно создавать заново или восстанавливать из бэкапа.

### Вариант 1: через Docker (рекомендуется)

Из корня репозитория:

```bash
docker compose exec backend python scripts/seed.py
```

Если контейнер backend называется иначе (например, `hipaa_backend`):

```bash
docker exec hipaa_backend python scripts/seed.py
```

Сид создаёт фреймворк HIPAA, внутренний тенант, тренинг-модули и демо-клиента Valley Creek. Если фреймворк уже есть, скрипт не будет дублировать его; демо-клиент будет создан или обновлён.

### Вариант 2: через API (от имени internal user)

Залогиньтесь как внутренний пользователь (например, `admin@summitrange.com`) и выполните:

```http
POST /api/v1/internal/seed-demo-client
Authorization: Bearer <ваш_токен>
```

Создастся или обновится тот же демо-клиент Valley Creek.

### Вариант 3: локально (без Docker)

Из папки `backend`, с настроенным `DATABASE_URL`:

```bash
cd backend
python scripts/seed.py
```

---

## Сохранение данных между перезапусками

- **Не удаляйте том** `postgres_data`: не используйте `docker compose down -v`, если нужны данные.
- **Регулярный бэкап:** из корня репозитория запускайте `.\backup-db.ps1`. Файлы сохраняются в `backups/`. Восстановление: `.\restore-db.ps1 -BackupFile "backups\hipaa-backup-<дата>.sql"`.
- Подробно: [DATA-SAFETY.md](DATA-SAFETY.md).

---

## Учётные данные после сида

- **Internal (админ):** `admin@summitrange.com` — пароль задаётся через `scripts/reset_admin_password.py` (по умолчанию в docker-compose он вызывается после seed).
- **Демо-клиент:** `client@valleycreek.example.com` / `Client2024!` (см. `backend/app/services/seed_demo.py`).
