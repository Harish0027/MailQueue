import { query } from "../config/database";
import { EmailRecord } from "../types";

/**
 * Insert a new email record
 */
export async function createEmail(
  email: Omit<EmailRecord, "id" | "created_at" | "updated_at">,
): Promise<EmailRecord> {
  const result = await query<EmailRecord>(
    `INSERT INTO emails (
      idempotency_key, sender, recipient, subject, body,
      scheduled_time, status, job_id, campaign_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      email.idempotency_key,
      email.sender,
      email.recipient,
      email.subject,
      email.body,
      email.scheduled_time,
      email.status,
      email.job_id,
      email.campaign_id,
    ],
  );
  return result[0];
}

/**
 * Batch insert multiple email records
 */
export async function createEmailsBatch(
  emails: Array<Omit<EmailRecord, "id" | "created_at" | "updated_at">>,
): Promise<EmailRecord[]> {
  if (emails.length === 0) return [];

  const values: any[] = [];
  const placeholders: string[] = [];

  emails.forEach((email, index) => {
    const offset = index * 9;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`,
    );
    values.push(
      email.idempotency_key,
      email.sender,
      email.recipient,
      email.subject,
      email.body,
      email.scheduled_time,
      email.status,
      email.job_id,
      email.campaign_id,
    );
  });

  const sql = `
    INSERT INTO emails (
      idempotency_key, sender, recipient, subject, body,
      scheduled_time, status, job_id, campaign_id
    ) VALUES ${placeholders.join(", ")}
    RETURNING *
  `;

  return await query<EmailRecord>(sql, values);
}

/**
 * Find email by idempotency key
 */
export async function findEmailByIdempotencyKey(
  key: string,
): Promise<EmailRecord | null> {
  const result = await query<EmailRecord>(
    "SELECT * FROM emails WHERE idempotency_key = $1",
    [key],
  );
  return result[0] || null;
}

/**
 * Find email by ID
 */
export async function findEmailById(id: number): Promise<EmailRecord | null> {
  const result = await query<EmailRecord>(
    "SELECT * FROM emails WHERE id = $1",
    [id],
  );
  return result[0] || null;
}

/**
 * Find emails by status
 */
export async function findEmailsByStatus(
  status: "scheduled" | "sent" | "failed",
  limit: number = 100,
  offset: number = 0,
): Promise<{ emails: EmailRecord[]; total: number }> {
  const emails = await query<EmailRecord>(
    "SELECT * FROM emails WHERE status = $1 ORDER BY scheduled_time DESC LIMIT $2 OFFSET $3",
    [status, limit, offset],
  );

  const countResult = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM emails WHERE status = $1",
    [status],
  );

  return {
    emails,
    total: parseInt(countResult[0].count, 10),
  };
}

/**
 * Find sent or failed emails
 */
export async function findSentEmails(
  limit: number = 100,
  offset: number = 0,
): Promise<{ emails: EmailRecord[]; total: number }> {
  const emails = await query<EmailRecord>(
    `SELECT * FROM emails 
     WHERE status IN ('sent', 'failed') 
     ORDER BY COALESCE(sent_time, updated_at) DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM emails WHERE status IN ('sent', 'failed')`,
  );

  return {
    emails,
    total: parseInt(countResult[0].count, 10),
  };
}

/**
 * Update email status to sent
 */
export async function markEmailAsSent(
  idempotencyKey: string,
  sentTime: Date,
): Promise<void> {
  await query(
    "UPDATE emails SET status = $1, sent_time = $2 WHERE idempotency_key = $3",
    ["sent", sentTime, idempotencyKey],
  );
}

/**
 * Update email status to failed
 */
export async function markEmailAsFailed(
  idempotencyKey: string,
  errorMessage: string,
): Promise<void> {
  await query(
    "UPDATE emails SET status = $1, error_message = $2 WHERE idempotency_key = $3",
    ["failed", errorMessage, idempotencyKey],
  );
}
