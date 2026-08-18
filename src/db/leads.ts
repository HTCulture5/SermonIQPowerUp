import { db } from './index.ts';
import { churchLeads } from './schema.ts';
import { desc } from 'drizzle-orm';

export interface CreateChurchLeadInput {
  firstName: string;
  lastName: string;
  churchName: string;
  email: string;
  address: string;
  phone: string;
  serviceDate: string;
  memberCount: number;
  subscriptionPlan?: string;
}

export async function createChurchLead(data: CreateChurchLeadInput) {
  try {
    const result = await db.insert(churchLeads)
      .values({
        firstName: data.firstName,
        lastName: data.lastName,
        churchName: data.churchName,
        email: data.email,
        address: data.address,
        phone: data.phone,
        serviceDate: data.serviceDate,
        memberCount: Number(data.memberCount) || 0,
        subscriptionPlan: data.subscriptionPlan || 'starter',
        createdAt: new Date(),
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database lead insert failed:", error);
    throw new Error("Failed to store lead in SQL database.", { cause: error });
  }
}

export async function getChurchLeads(limit = 50) {
  try {
    return await db.select().from(churchLeads).orderBy(desc(churchLeads.createdAt)).limit(limit);
  } catch (error) {
    console.error("Database query failed for church leads:", error);
    throw new Error("Failed to query church leads.", { cause: error });
  }
}
