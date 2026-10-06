// Optional /api function entry. The Express preset serves src/app.ts instead;
// this re-exports that same app so both entries share one cold-start migrate().
import app from "../src/vercel.js";

export default app;
