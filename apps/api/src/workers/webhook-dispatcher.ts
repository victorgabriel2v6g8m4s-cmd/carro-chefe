import { prisma } from "@carro-chefe/database";
import { dispatchNextWebhookEvent } from "../modules/webhooks/dispatch-service";
import { holdWorkerPort } from "./singleton";

const workerLock = await holdWorkerPort(4175, "Dispatcher de webhooks");
if (!workerLock) process.exit(0);
let stopping = false;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

console.log("Dispatcher de webhooks conectado à outbox. Ctrl+C para encerrar.");
while (!stopping) {
  if (!await dispatchNextWebhookEvent()) await new Promise((resolve) => setTimeout(resolve, 2500));
}
workerLock.close();
await prisma.$disconnect();
