// Same default the Express preset loads from src/app.ts.
// api/index.ts re-exports it so /api still reaches that handler.
export { default } from "./app.js";
