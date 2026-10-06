// Vercel serves this file at /api. Importing the handler evaluates src/vercel.ts,
// which opens the pool and starts migrate() once per cold start.
import handler from "../src/vercel.js";

export default handler;
