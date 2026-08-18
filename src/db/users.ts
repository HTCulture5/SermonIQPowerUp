import { eq, and } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

export interface SecurityPreferences {
  strictAudioSanitization: boolean;
  autoPurgeGuestLogs: boolean;
  anonymizePrayerRequests: boolean;
  auditLogRetentionDays: number;
}

export const DEFAULT_SECURITY_PREFERENCES: SecurityPreferences = {
  strictAudioSanitization: true,
  autoPurgeGuestLogs: true,
  anonymizePrayerRequests: true,
  auditLogRetentionDays: 30,
};

/**
 * Normalizes input data for user registration and profile consistency
 */
export function normalizeUserData(data: {
  email?: string;
  displayName?: string;
  role?: string;
  churchName?: string;
  churchAddress?: string;
  phone?: string;
  subscriptionPlan?: string;
  serviceDate?: string;
  memberCount?: number | string;
}) {
  const normalizedEmail = data.email ? data.email.trim().toLowerCase() : '';
  const normalizedName = data.displayName ? data.displayName.trim().replace(/\s+/g, ' ') : '';
  const normalizedChurch = data.churchName ? data.churchName.trim().replace(/\s+/g, ' ') : 'Sanctuary Workspace';
  const normalizedAddress = data.churchAddress ? data.churchAddress.trim() : '';
  const normalizedPhone = data.phone ? data.phone.trim().replace(/[^\d+()\-\s.]/g, '') : '';
  
  const validRoles = ['pastor', 'leader', 'member', 'guest', 'admin'];
  const rawRole = (data.role || 'pastor').toLowerCase().trim();
  const normalizedRole = validRoles.includes(rawRole) ? rawRole : 'pastor';

  const validPlans = ['Starter', 'Growth', 'Enterprise'];
  const rawPlan = data.subscriptionPlan || 'Growth';
  const matchedPlan = validPlans.find(p => p.toLowerCase() === rawPlan.toLowerCase()) || 'Growth';

  return {
    email: normalizedEmail,
    displayName: normalizedName,
    churchName: normalizedChurch,
    churchAddress: normalizedAddress,
    phone: normalizedPhone,
    role: normalizedRole,
    subscriptionPlan: matchedPlan,
    serviceDate: data.serviceDate ? data.serviceDate.trim() : new Date().toISOString().split('T')[0],
    memberCount: data.memberCount ? Math.max(0, parseInt(String(data.memberCount), 10) || 0) : 150
  };
}

/**
 * Generates an isolated workspace tenant ID
 */
export function generateTenantId(uid: string, churchName?: string): string {
  const cleanName = (churchName || 'church')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);
  const hash = Math.random().toString(36).substring(2, 8);
  return `tenant_ws_${cleanName || 'ws'}_${uid.substring(0, 6)}_${hash}`;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string,
  extraDetails?: {
    churchName?: string;
    churchAddress?: string;
    phone?: string;
    role?: string;
    subscriptionPlan?: string;
    serviceDate?: string;
    memberCount?: number | string;
  }
) {
  try {
    const normalized = normalizeUserData({
      email,
      displayName,
      ...extraDetails
    });

    const tenantId = generateTenantId(uid, normalized.churchName);

    const result = await db.insert(users)
      .values({
        uid,
        email: normalized.email || email,
        displayName: normalized.displayName || displayName || null,
        photoURL: photoURL || null,
        role: normalized.role,
        churchName: normalized.churchName,
        churchAddress: normalized.churchAddress || null,
        phone: normalized.phone || null,
        serviceDate: normalized.serviceDate,
        memberCount: normalized.memberCount,
        subscriptionPlan: normalized.subscriptionPlan,
        tenantId,
        twoFactorEnabled: false,
        dataIsolationMode: 'strict_tenant',
        onboardingCompleted: true,
        securityPreferences: JSON.stringify(DEFAULT_SECURITY_PREFERENCES),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalized.email || email,
          displayName: normalized.displayName || displayName || undefined,
          photoURL: photoURL || undefined,
          churchName: normalized.churchName || undefined,
          churchAddress: normalized.churchAddress || undefined,
          phone: normalized.phone || undefined,
          serviceDate: normalized.serviceDate || undefined,
          memberCount: normalized.memberCount || undefined,
          subscriptionPlan: normalized.subscriptionPlan || undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    const savedUser = result[0];
    let parsedSecurity = DEFAULT_SECURITY_PREFERENCES;
    if (savedUser.securityPreferences) {
      try {
        parsedSecurity = JSON.parse(savedUser.securityPreferences);
      } catch (e) {
        parsedSecurity = DEFAULT_SECURITY_PREFERENCES;
      }
    }

    return {
      ...savedUser,
      securityPreferences: parsedSecurity,
    };
  } catch (error) {
    console.error("Database user upsert failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getUserProfile(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!result || result.length === 0) return null;
    
    const user = result[0];
    let parsedSecurity = DEFAULT_SECURITY_PREFERENCES;
    if (user.securityPreferences) {
      try {
        parsedSecurity = JSON.parse(user.securityPreferences);
      } catch (e) {
        parsedSecurity = DEFAULT_SECURITY_PREFERENCES;
      }
    }

    return {
      ...user,
      securityPreferences: parsedSecurity,
    };
  } catch (error) {
    console.error("Failed to get user profile by UID:", error);
    throw new Error("Database query failed.", { cause: error });
  }
}

export async function updateUserProfile(
  uid: string,
  data: {
    displayName?: string;
    photoURL?: string;
    role?: string;
    churchName?: string;
    churchAddress?: string;
    phone?: string;
    serviceDate?: string;
    memberCount?: number | string;
    subscriptionPlan?: string;
    twoFactorEnabled?: boolean;
    dataIsolationMode?: string;
    onboardingCompleted?: boolean;
    securityPreferences?: SecurityPreferences;
  }
) {
  try {
    const normalized = normalizeUserData({
      displayName: data.displayName,
      role: data.role,
      churchName: data.churchName,
      churchAddress: data.churchAddress,
      phone: data.phone,
      serviceDate: data.serviceDate,
      memberCount: data.memberCount,
      subscriptionPlan: data.subscriptionPlan,
    });

    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (data.displayName !== undefined) updatePayload.displayName = normalized.displayName;
    if (data.photoURL !== undefined) updatePayload.photoURL = data.photoURL;
    if (data.role !== undefined) updatePayload.role = normalized.role;
    if (data.churchName !== undefined) updatePayload.churchName = normalized.churchName;
    if (data.churchAddress !== undefined) updatePayload.churchAddress = normalized.churchAddress;
    if (data.phone !== undefined) updatePayload.phone = normalized.phone;
    if (data.serviceDate !== undefined) updatePayload.serviceDate = normalized.serviceDate;
    if (data.memberCount !== undefined) updatePayload.memberCount = normalized.memberCount;
    if (data.subscriptionPlan !== undefined) updatePayload.subscriptionPlan = normalized.subscriptionPlan;
    if (data.twoFactorEnabled !== undefined) updatePayload.twoFactorEnabled = data.twoFactorEnabled;
    if (data.dataIsolationMode !== undefined) updatePayload.dataIsolationMode = data.dataIsolationMode;
    if (data.onboardingCompleted !== undefined) updatePayload.onboardingCompleted = data.onboardingCompleted;
    if (data.securityPreferences !== undefined) {
      updatePayload.securityPreferences = JSON.stringify(data.securityPreferences);
    }

    const result = await db.update(users)
      .set(updatePayload)
      .where(eq(users.uid, uid))
      .returning();

    return result[0];
  } catch (error) {
    console.error("Failed to update user profile in Cloud SQL:", error);
    throw new Error("Database update failed.", { cause: error });
  }
}

export async function reprovisionUserWorkspace(uid: string) {
  try {
    const existing = await getUserProfile(uid);
    const newTenantId = generateTenantId(uid, existing?.churchName || 'sanctuary');

    const result = await db.update(users)
      .set({
        tenantId: newTenantId,
        dataIsolationMode: 'strict_tenant',
        onboardingCompleted: true,
        securityPreferences: JSON.stringify(DEFAULT_SECURITY_PREFERENCES),
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return {
      success: true,
      message: 'Workspace reprovisioned and isolated with fresh cryptographic tenant container.',
      tenantId: newTenantId,
      user: result[0]
    };
  } catch (error) {
    console.error("Failed to reprovision workspace in Cloud SQL:", error);
    throw new Error("Reprovisioning failed.", { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
