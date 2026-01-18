import { query } from "../config/database";

export interface Attachment {
  id?: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  email_id?: number;
  campaign_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

export async function createAttachment(
  attachment: Omit<Attachment, "id" | "created_at" | "updated_at">,
): Promise<Attachment> {
  const result = await query<Attachment>(
    "INSERT INTO attachments (filename, filepath, mimetype, size, email_id, campaign_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [
      attachment.filename,
      attachment.filepath,
      attachment.mimetype,
      attachment.size,
      attachment.email_id || null,
      attachment.campaign_id || null,
    ],
  );
  return result[0];
}

export async function getAttachmentsByEmailId(
  emailId: number,
): Promise<Attachment[]> {
  return await query<Attachment>(
    "SELECT * FROM attachments WHERE email_id = $1",
    [emailId],
  );
}

export async function getAttachmentsByCampaignId(
  campaignId: number,
): Promise<Attachment[]> {
  return await query<Attachment>(
    "SELECT * FROM attachments WHERE campaign_id = $1",
    [campaignId],
  );
}

export async function deleteAttachment(id: number): Promise<void> {
  await query("DELETE FROM attachments WHERE id = $1", [id]);
}

export async function linkAttachmentToEmail(
  attachmentId: number,
  emailId: number,
): Promise<void> {
  await query("UPDATE attachments SET email_id = $1 WHERE id = $2", [
    emailId,
    attachmentId,
  ]);
}
