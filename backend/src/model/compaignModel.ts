import { query } from "../config/database";
import { Campaign, CampaignStatus } from "../types/campaigns";

export async function createCampaign(
  campaign: Omit<Campaign, "id" | "created_at" | "updated_at">,
): Promise<Campaign> {
  const result = await query<Campaign>(
    `INSERT INTO campaigns (name, subject, body, status, scheduled_at) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [
      campaign.name,
      campaign.subject,
      campaign.body,
      campaign.status,
      campaign.scheduled_at,
    ],
  );
  return result[0];
}

export async function updateCampaignStatus(
  id: number,
  status: CampaignStatus,
): Promise<void> {
  await query("UPDATE campaigns SET status = $1 WHERE id = $2", [status, id]);
}

export async function getCampaigns(
  limit = 10,
  offset = 0,
): Promise<{ campaigns: Campaign[]; total: number }> {
  const campaigns = await query<Campaign>(
    "SELECT * FROM campaigns ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [limit, offset],
  );
  const countResult = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM campaigns",
  );
  return {
    campaigns,
    total: parseInt(countResult[0].count, 10),
  };
}

export async function getCampaignById(id: number): Promise<Campaign | null> {
  const result = await query<Campaign>(
    "SELECT * FROM campaigns WHERE id = $1",
    [id],
  );
  return result[0] || null;
}

export async function linkListToCampaign(
  campaignId: number,
  listId: number,
): Promise<void> {
  await query(
    "INSERT INTO campaign_lists (campaign_id, list_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [campaignId, listId],
  );
}

export async function getListsForCampaign(
  campaignId: number,
): Promise<number[]> {
  const results = await query<{ list_id: number }>(
    "SELECT list_id FROM campaign_lists WHERE campaign_id = $1",
    [campaignId],
  );
  return results.map((r) => r.list_id);
}
