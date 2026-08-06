import Fastify from "fastify";
import { config } from "../config.js";
import { parseHealthAutoExport } from "../watch/parseHealthAutoExport.js";
import { storeWatchMetrics, getSingleUserId } from "../watch/storeWatchMetrics.js";

export function buildServer() {
  const app = Fastify({ logger: true });

  // Health Auto Export posts here on its configured schedule. Auth is a shared secret
  // (query param, since the app's webhook config UI doesn't support custom headers) —
  // acceptable for a single-user MVP receiving non-financial data (TRD §7).
  app.post("/webhook/health-auto-export", async (request, reply) => {
    if (request.query && (request.query as Record<string, string>).secret !== config.healthWebhookSecret) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const userId = await getSingleUserId();
    if (!userId) {
      return reply.code(200).send({ stored: 0, note: "no onboarded user yet" });
    }

    const rows = parseHealthAutoExport(request.body);
    await storeWatchMetrics(userId, rows);

    return reply.code(200).send({ stored: rows.length });
  });

  app.get("/health", async () => ({ ok: true }));

  return app;
}
