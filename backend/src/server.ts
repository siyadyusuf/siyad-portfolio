import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool, migrate } from "./db.js";

const cfg = loadConfig();
const db = createPool();
await migrate(db);
const port = Number(process.env.PORT ?? 3001);
createApp({ cfg, db }).listen(port, () => console.log(`API listening on http://localhost:${port}`));
