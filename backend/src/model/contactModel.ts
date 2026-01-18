import { query } from "../config/database";
import { Contact, ContactList } from "../types/contacts";

// Lists
export async function createContactList(
  list: Omit<ContactList, "id" | "created_at" | "updated_at">,
): Promise<ContactList> {
  const result = await query<ContactList>(
    "INSERT INTO contact_lists (name, description) VALUES ($1, $2) RETURNING *",
    [list.name, list.description],
  );
  return result[0];
}

export async function getAllContactLists(): Promise<ContactList[]> {
  return await query<ContactList>(
    "SELECT * FROM contact_lists ORDER BY created_at DESC",
  );
}

export async function getContactListById(
  id: number,
): Promise<ContactList | null> {
  const result = await query<ContactList>(
    "SELECT * FROM contact_lists WHERE id = $1",
    [id],
  );
  return result[0] || null;
}

// Contacts
export async function createContact(
  contact: Omit<Contact, "id" | "created_at" | "updated_at">,
): Promise<Contact> {
  const result = await query<Contact>(
    `INSERT INTO contacts (list_id, email, name, metadata) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (list_id, email) DO UPDATE SET name = EXCLUDED.name, metadata = contacts.metadata || EXCLUDED.metadata
     RETURNING *`,
    [
      contact.list_id,
      contact.email,
      contact.name,
      JSON.stringify(contact.metadata || {}),
    ],
  );
  return result[0];
}

export async function createContactsBatch(
  contacts: Array<Omit<Contact, "id" | "created_at" | "updated_at">>,
): Promise<void> {
  if (contacts.length === 0) return;

  const values: any[] = [];
  const placeholders: string[] = [];

  contacts.forEach((c, i) => {
    const offset = i * 4;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`,
    );
    values.push(c.list_id, c.email, c.name, JSON.stringify(c.metadata || {}));
  });

  const sql = `
    INSERT INTO contacts (list_id, email, name, metadata)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (list_id, email) DO UPDATE SET 
      name = EXCLUDED.name, 
      metadata = contacts.metadata || EXCLUDED.metadata
  `;

  await query(sql, values);
}

export async function getContactsByListId(
  listId: number,
  limit = 100,
  offset = 0,
): Promise<{ contacts: Contact[]; total: number }> {
  const contacts = await query<Contact>(
    "SELECT * FROM contacts WHERE list_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    [listId, limit, offset],
  );
  const countResult = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM contacts WHERE list_id = $1",
    [listId],
  );
  return {
    contacts,
    total: parseInt(countResult[0].count, 10),
  };
}
