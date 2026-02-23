# Запуск фронта локально (без Docker)

Если в Docker изменения не видны, запусти фронт на хосте — тогда точно подхватится код из папки.

1. Останови только контейнер фронта:
   ```powershell
   docker compose stop frontend
   ```

2. Запусти бэкенд (если ещё не запущен):
   ```powershell
   docker compose up -d postgres minio minio_init backend
   ```

3. Перейди в папку фронта и запусти (команды по одной, не склеивая):
   ```powershell
   cd c:\Users\sactr\OneDrive\Desktop\hipaa-saas\hipaa-saas\frontend
   npm install
   npm run dev
   ```
   Важно: сначала `cd` в папку frontend, только потом `npm install` и `npm run dev`.

4. Открой в браузере: **http://localhost:5173**

   Запросы к API пойдут на backend в Docker (порт 8000) через прокси Vite.
