import { Worker } from "bullmq";
import { redis } from "./config/redis";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { processEmailJob } from "./processor";
import { EmailJobData } from "./types";

logger.info("Starting BullMQ worker...");
logger.info("Worker configuration", {
  concurrency: env.WORKER_CONCURRENCY,
  maxEmailsPerHour: env.MAX_EMAILS_PER_HOUR,
  minDelayBetweenEmailsMs: env.MIN_DELAY_BETWEEN_EMAILS_MS,
  smtpHost: env.SMTP_HOST,
});

// Create BullMQ worker
const worker = new Worker<EmailJobData>(
  "email-queue",
  async (job) => {
    await processEmailJob(job);
  },
  {
    connection: redis as any,
    concurrency: env.WORKER_CONCURRENCY,
    limiter: {
      max: env.WORKER_CONCURRENCY,
      duration: 1000, // Process at most concurrency jobs per second
    },
  },
);

// Event listeners
worker.on("completed", (job) => {
  logger.info("Job completed", {
    jobId: job.id,
    idempotency_key: job.data.idempotency_key,
  });
});

worker.on("failed", (job, err) => {
  logger.error("Job failed", {
    jobId: job?.id,
    idempotency_key: job?.data.idempotency_key,
    error: err.message,
    attemptsMade: job?.attemptsMade,
    attemptsMax: job?.opts.attempts,
  });
});

worker.on("error", (err) => {
  logger.error("Worker error", { error: err.message, stack: err.stack });
});

worker.on("stalled", (jobId) => {
  logger.warn("Job stalled", { jobId });
});

logger.info("Worker started successfully");
logger.info("Listening for email jobs...");

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down worker...");

  await worker.close();

  const { closeRedis } = await import("./config/redis");
  const { closePool } = await import("./config/database");

  await closeRedis();
  await closePool();

  logger.info("Worker shut down complete");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  shutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled rejection", { reason, promise });
  shutdown();
});
