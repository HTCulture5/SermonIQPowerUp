import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { SavedServiceReport, SavedCarePrayer, SavedDonation, ChurchLead, UserProfile } from '../types';

// ========================================================
// 0. USER PROFILES (Zero-Trust Isolated Identities)
// ========================================================

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.userId}`;
  try {
    const docRef = doc(db, 'users', profile.userId);
    await setDoc(docRef, {
      ...profile,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export function subscribeUserProfile(
  userId: string,
  onProfile: (profile: UserProfile | null) => void
): () => void {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onProfile(snap.data() as UserProfile);
        } else {
          onProfile(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
}

// ========================================================
// 1. SERVICE REPORTS (Pastoral Intelligence Archives)
// ========================================================

export async function saveServiceReport(
  reportData: Omit<SavedServiceReport, 'id' | 'authorId' | 'createdAt'>
): Promise<string> {
  const path = 'service_reports';
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error('Must be signed in to save intelligence reports to Firebase.');
  }

  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullDoc: SavedServiceReport = {
    ...reportData,
    id: reportId,
    authorId: currentUser.uid,
    authorEmail: currentUser.email || undefined,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, path, reportId);
    await setDoc(docRef, fullDoc);
    return reportId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function fetchServiceReports(): Promise<SavedServiceReport[]> {
  const path = 'service_reports';
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return [];
  }

  try {
    const q = query(
      collection(db, path),
      where('authorId', '==', currentUser.uid)
    );
    const snap = await getDocs(q);
    const list: SavedServiceReport[] = [];
    snap.forEach((d) => {
      list.push(d.data() as SavedServiceReport);
    });
    // Sort descending by createdAt
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export function subscribeServiceReports(
  onReports: (reports: SavedServiceReport[]) => void
): () => void {
  const path = 'service_reports';
  const currentUser = auth.currentUser;

  if (!currentUser) {
    onReports([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, path),
      where('authorId', '==', currentUser.uid)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: SavedServiceReport[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as SavedServiceReport);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onReports(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function deleteServiceReport(reportId: string): Promise<void> {
  const path = `service_reports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'service_reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ========================================================
// 2. CARE PRAYERS (Pastoral Prayer Requests)
// ========================================================

export async function submitCarePrayer(
  prayer: Omit<SavedCarePrayer, 'id' | 'prayerCount' | 'createdAt'>
): Promise<string> {
  const path = 'care_prayers';
  const currentUser = auth.currentUser;
  const prayerId = `pray_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const fullDoc: SavedCarePrayer = {
    ...prayer,
    id: prayerId,
    authorId: currentUser ? currentUser.uid : undefined,
    prayerCount: 1,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, path, prayerId), fullDoc);
    return prayerId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export function subscribeCarePrayers(
  onPrayers: (prayers: SavedCarePrayer[]) => void
): () => void {
  const path = 'care_prayers';
  try {
    const q = collection(db, path);
    return onSnapshot(
      q,
      (snapshot) => {
        const list: SavedCarePrayer[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as SavedCarePrayer);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onPrayers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

// ========================================================
// 3. DONATIONS (Generosity Logs)
// ========================================================

export async function recordDonation(
  donation: Omit<SavedDonation, 'id' | 'createdAt'>
): Promise<string> {
  const path = 'donations';
  const currentUser = auth.currentUser;
  const donationId = `don_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const fullDoc: SavedDonation = {
    ...donation,
    id: donationId,
    donorId: currentUser ? currentUser.uid : undefined,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, path, donationId), fullDoc);
    return donationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

// ========================================================
// 4. CHURCH SIGNUP LEADS
// ========================================================

export async function submitChurchLead(
  lead: Omit<ChurchLead, 'id' | 'createdAt'>
): Promise<string> {
  const path = 'church_leads';
  const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const fullDoc: ChurchLead = {
    ...lead,
    id: leadId,
    status: lead.status || 'new',
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, path, leadId), fullDoc);
    return leadId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw error;
  }
}

export async function fetchChurchLeads(): Promise<ChurchLead[]> {
  const path = 'church_leads';
  try {
    const q = collection(db, path);
    const snap = await getDocs(q);
    const list: ChurchLead[] = [];
    snap.forEach((d) => {
      list.push(d.data() as ChurchLead);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

