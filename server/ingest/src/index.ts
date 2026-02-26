import express from "express";
import { buildRouter } from "./routes.js";

const app = express();
app.use(buildRouter());

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`Ingest service listening on :${port}`);
});
