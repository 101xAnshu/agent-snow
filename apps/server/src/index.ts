import { serve } from "bun";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";

const port = Number.parseInt(process.env.SERVER_PORT ?? "3000", 10);
serve({ fetch: createApp().fetch, port });
logger.info(`Server listening on http://localhost:${port}`);
