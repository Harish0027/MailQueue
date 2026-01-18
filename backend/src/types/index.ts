export interface EmailJobData {
  idempotency_key: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduled_time: string;
}

export interface EmailRecord {
  id: number;
  idempotency_key: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduled_time: Date;
  sent_time: Date | null;
  status: "scheduled" | "sent" | "failed";
  error_message: string | null;
  job_id: string | null;
  campaign_id?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Attachment {
  filename: string;
  filepath: string;
}
