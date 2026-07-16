import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { portalService } from "./services/portal.service.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`UniBridge backend listening on port ${env.PORT}`);
  console.log("Sample HOD token: HOD:fac_001");
  console.log("Sample super-admin token: SUPER_ADMIN:super_admin_001");
});

// Scheduled-notes publisher. ponytail: 30s in-process poll; swap for pg_cron/a queue if sub-minute precision is needed.
setInterval(() => {
  portalService.publishDueNotes().catch((e) => console.error("publishDueNotes failed:", e));
}, 30_000);
