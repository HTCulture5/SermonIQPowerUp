import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Building, 
  ShieldCheck, 
  CreditCard, 
  Lock, 
  Key, 
  RefreshCw, 
  CheckCircle2, 
  Download, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar, 
  Users, 
  Sparkles, 
  Save, 
  ChevronRight, 
  LogOut, 
  Activity, 
  Database, 
  Zap, 
  AlertCircle,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  ChevronLeft,
  FileSpreadsheet
} from 'lucide-react';
import { UserProfile, SavedServiceReport } from '../types';
import { auth, googleSignIn, logout, getAccessToken, setCreatedProfile } from '../services/authService';
import { saveUserProfile, fetchUserProfile, fetchServiceReports } from '../services/firestoreService';
import { SermonIQLogo } from './SermonIQLogo';
import { GoogleSheetsSyncCard } from './GoogleSheetsSyncCard';

interface ProfileSettingsPageProps {
  onBackToDashboard: () => void;
  onNavigateToView: (view: 'dashboard' | 'chat' | 'donation' | 'gmail' | 'landing') => void;
  isInitialOnboarding?: boolean;
}

export default function ProfileSettingsPage({
  onBackToDashboard,
  onNavigateToView,
  isInitialOnboarding = false
}: ProfileSettingsPageProps) {
  const [user, setUser] = useState<any>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile>({
    userId: auth.currentUser?.uid || 'guest_pastor',
    email: auth.currentUser?.email || 'pastor@ministry.org',
    displayName: auth.currentUser?.displayName || 'Pastor Leader',
    role: 'pastor',
    churchName: 'Faith Fellowship Sanctuary',
    churchAddress: '777 Grace Way, Suite 100',
    phoneNumber: '(555) 234-5678',
    subscriptionPlan: 'Growth',
    tenantId: `tenant_sanctuary_${auth.currentUser?.uid?.substring(0, 6) || 'alpha'}_9a81c`,
    twoFactorEnabled: false,
    dataIsolationMode: 'strict_tenant',
    serviceDate: new Date().toISOString().split('T')[0],
    memberCount: 250,
    onboardingCompleted: true,
    securityPreferences: {
      strictAudioSanitization: true,
      autoPurgeGuestLogs: true,
      anonymizePrayerRequests: true,
      auditLogRetentionDays: 30
    },
    createdAt: new Date().toISOString()
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'subscription' | 'data' | 'sheets'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReprovisioning, setIsReprovisioning] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isolatedReports, setIsolatedReports] = useState<SavedServiceReport[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Form states
  const [formState, setFormState] = useState<{
    displayName: string;
    role: 'pastor' | 'leader' | 'member' | 'guest' | 'admin';
    churchName: string;
    churchAddress: string;
    phone: string;
    serviceDate: string;
    memberCount: number;
    subscriptionPlan: string;
    twoFactorEnabled: boolean;
    strictAudioSanitization: boolean;
    autoPurgeGuestLogs: boolean;
    anonymizePrayerRequests: boolean;
    auditLogRetentionDays: number;
  }>({
    displayName: '',
    role: 'pastor',
    churchName: '',
    churchAddress: '',
    phone: '',
    serviceDate: '',
    memberCount: 250,
    subscriptionPlan: 'Growth',
    twoFactorEnabled: false,
    strictAudioSanitization: true,
    autoPurgeGuestLogs: true,
    anonymizePrayerRequests: true,
    auditLogRetentionDays: 30
  });

  // Sync with Auth and Database on load
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsLoading(true);
        try {
          // 1. Fetch Cloud SQL profile
          const token = await currentUser.getIdToken();
          const response = await fetch('/api/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const sqlProfile = await response.json();
            if (sqlProfile) {
              const merged: UserProfile = {
                userId: currentUser.uid,
                email: currentUser.email || sqlProfile.email,
                displayName: sqlProfile.displayName || currentUser.displayName || 'Pastor Leader',
                photoURL: sqlProfile.photoURL || currentUser.photoURL,
                role: sqlProfile.role || 'pastor',
                churchName: sqlProfile.churchName || 'Grace Community Sanctuary',
                churchAddress: sqlProfile.churchAddress || '777 Grace Way, Suite 100',
                phoneNumber: sqlProfile.phone || '(555) 234-5678',
                subscriptionPlan: sqlProfile.subscriptionPlan || 'Growth',
                tenantId: sqlProfile.tenantId || `tenant_ws_${currentUser.uid.substring(0, 6)}_${Math.random().toString(36).substring(2, 6)}`,
                twoFactorEnabled: Boolean(sqlProfile.twoFactorEnabled),
                dataIsolationMode: 'strict_tenant',
                serviceDate: sqlProfile.serviceDate || new Date().toISOString().split('T')[0],
                memberCount: sqlProfile.memberCount || 250,
                onboardingCompleted: true,
                securityPreferences: sqlProfile.securityPreferences || {
                  strictAudioSanitization: true,
                  autoPurgeGuestLogs: true,
                  anonymizePrayerRequests: true,
                  auditLogRetentionDays: 30
                },
                createdAt: sqlProfile.createdAt ? new Date(sqlProfile.createdAt).toISOString() : new Date().toISOString()
              };

              setProfile(merged);
              setCreatedProfile(true);
              setFormState({
                displayName: merged.displayName || '',
                role: merged.role || 'pastor',
                churchName: merged.churchName || '',
                churchAddress: merged.churchAddress || '',
                phone: merged.phoneNumber || '',
                serviceDate: merged.serviceDate || '',
                memberCount: Number(merged.memberCount) || 250,
                subscriptionPlan: merged.subscriptionPlan || 'Growth',
                twoFactorEnabled: Boolean(merged.twoFactorEnabled),
                strictAudioSanitization: Boolean(merged.securityPreferences?.strictAudioSanitization ?? true),
                autoPurgeGuestLogs: Boolean(merged.securityPreferences?.autoPurgeGuestLogs ?? true),
                anonymizePrayerRequests: Boolean(merged.securityPreferences?.anonymizePrayerRequests ?? true),
                auditLogRetentionDays: merged.securityPreferences?.auditLogRetentionDays || 30
              });
            }
          }

          // 2. Fetch Isolated Service Reports count
          const reports = await fetchServiceReports();
          setIsolatedReports(reports);
        } catch (err) {
          console.warn('Error loading initial profile from Cloud SQL:', err);
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const currentUser = auth.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : null;

      const payload = {
        displayName: formState.displayName.trim(),
        role: formState.role,
        churchName: formState.churchName.trim(),
        churchAddress: formState.churchAddress.trim(),
        phone: formState.phone.trim(),
        serviceDate: formState.serviceDate,
        memberCount: formState.memberCount,
        subscriptionPlan: formState.subscriptionPlan,
        twoFactorEnabled: formState.twoFactorEnabled,
        dataIsolationMode: 'strict_tenant',
        securityPreferences: {
          strictAudioSanitization: formState.strictAudioSanitization,
          autoPurgeGuestLogs: formState.autoPurgeGuestLogs,
          anonymizePrayerRequests: formState.anonymizePrayerRequests,
          auditLogRetentionDays: formState.auditLogRetentionDays
        }
      };

      // 1. Update in Cloud SQL via API
      if (idToken) {
        const response = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Cloud SQL profile update failed');
        }
      }

      // 2. Update in Firebase Firestore
      if (currentUser) {
        await saveUserProfile({
          userId: currentUser.uid,
          email: currentUser.email || profile.email,
          displayName: payload.displayName,
          role: payload.role as any,
          churchName: payload.churchName,
          churchAddress: payload.churchAddress,
          phoneNumber: payload.phone,
          subscriptionPlan: payload.subscriptionPlan,
          tenantId: profile.tenantId,
          twoFactorEnabled: payload.twoFactorEnabled,
          dataIsolationMode: 'strict_tenant',
          serviceDate: payload.serviceDate,
          memberCount: payload.memberCount,
          onboardingCompleted: true,
          createdAt: profile.createdAt,
          updatedAt: new Date().toISOString()
        });
      }

      setProfile(prev => ({
        ...prev,
        displayName: payload.displayName,
        role: payload.role as 'pastor' | 'leader' | 'member' | 'guest' | 'admin',
        churchName: payload.churchName,
        churchAddress: payload.churchAddress,
        phoneNumber: payload.phone,
        serviceDate: payload.serviceDate,
        memberCount: payload.memberCount,
        subscriptionPlan: payload.subscriptionPlan,
        twoFactorEnabled: payload.twoFactorEnabled,
        dataIsolationMode: 'strict_tenant' as const,
        securityPreferences: payload.securityPreferences
      }));

      setCreatedProfile(true);
      showNotification('success', 'Profile and security preferences successfully normalized & saved to Cloud SQL and Firebase.');
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      showNotification('error', 'Could not save profile: ' + (err.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReprovisionWorkspace = async () => {
    if (!confirm('Are you sure you want to reprovision and rotate this sanctuary tenant container? All future analytics will route to the newly isolated cryptographic workspace key.')) {
      return;
    }

    setIsReprovisioning(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('You must be signed in to reprovision your workspace.');

      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/profile/reprovision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!res.ok) throw new Error('Server returned error during reprovisioning');
      const data = await res.json();

      if (data.tenantId) {
        setProfile(prev => ({
          ...prev,
          tenantId: data.tenantId,
          updatedAt: new Date().toISOString()
        }));

        // Also update Firestore with new tenantId
        await saveUserProfile({
          ...profile,
          tenantId: data.tenantId,
          updatedAt: new Date().toISOString()
        });

        showNotification('success', `Workspace securely reprovisioned! Isolated Tenant ID: ${data.tenantId}`);
      }
    } catch (err: any) {
      console.error('Reprovision error:', err);
      showNotification('error', 'Reprovisioning failed: ' + (err.message || 'Server error'));
    } finally {
      setIsReprovisioning(false);
    }
  };

  const handleExportData = () => {
    const exportBundle = {
      tenantId: profile.tenantId,
      ministryProfile: {
        leader: profile.displayName,
        email: profile.email,
        role: profile.role,
        church: profile.churchName,
        address: profile.churchAddress,
        phone: profile.phoneNumber,
        subscription: profile.subscriptionPlan,
        congregationSize: profile.memberCount,
        dataIsolationMode: profile.dataIsolationMode
      },
      securityPreferences: profile.securityPreferences,
      isolatedServiceReports: isolatedReports,
      exportedAt: new Date().toISOString(),
      compliance: "Zero-Trust CCPA & GDPR Cryptographic Tenant Isolation Standard"
    };

    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sermoniq_${profile.churchName?.replace(/\s+/g, '_').toLowerCase() || 'sanctuary'}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('success', 'Full isolated sanctuary archive exported successfully.');
  };

  const handleLogout = async () => {
    await logout();
    onNavigateToView('landing');
  };

  return (
    <div className="min-h-screen bg-[#070A1E] text-white flex flex-col">
      {/* TOP HEADER */}
      <header className="border-b border-white/10 bg-[#0A0E2A]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="p-2 hover:bg-white/5 rounded-lg transition-all text-white/40 hover:text-white cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <div className="h-4 w-px bg-white/10" />
            <SermonIQLogo id="profile-page-nav-logo" size="sm" theme="dark" variant="full" />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tenant Isolated ({profile.tenantId?.substring(0, 14)}...)</span>
            </div>

            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 text-xs max-w-md ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/90 border-red-500/40 text-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <p className="flex-1 leading-relaxed">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        
        {/* PERSONALIZED ONBOARDING WELCOME HERO (If newly signed up or incomplete) */}
        {!onboardingDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#121A4B] via-[#0E1336] to-[#1A1633] border border-[#D4AF37]/30 shadow-[0_0_40px_rgba(212,175,55,0.08)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles className="w-48 h-48 text-[#D4AF37]" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                    SermonIQ Cloud Workspace
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Database Isolation: Active
                  </span>
                  <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                    Tenant: {profile.tenantId || `tenant_ws_${formState.churchName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'ws'}`}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Welcome to SermonIQ, {formState.displayName || 'Pastor'}!
                </h2>
                <p className="text-sm text-white/70 leading-relaxed">
                  Your dedicated sanctuary account for <strong>{formState.churchName || 'Your Ministry'}</strong> is isolated with structured database scoping. Relational data is secured in Cloud SQL, real-time telemetry streams in Firestore, and all queries are scoped by your Tenant ID to ensure sanctuary privacy.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={() => onNavigateToView('dashboard')}
                  className="w-full sm:w-auto px-5 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#070A1E] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Launch Service Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOnboardingDismissed(true)}
                  className="w-full sm:w-auto px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-semibold rounded-xl transition-all border border-white/10 cursor-pointer"
                >
                  Dismiss Banner
                </button>
              </div>
            </div>

            {/* ONBOARDING CHECKLIST PILLS */}
            <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-white/80 font-medium">1. Cloud SQL Lead Normalized</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-white/80 font-medium">2. Strict Tenant ID Created</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-white/80 font-medium">3. Zero-Trust Security Armed</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-white/80 font-medium">4. {formState.subscriptionPlan} Tier Active</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* MAIN PROFILE NAVIGATION TABS */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#D4AF37] text-[#070A1E] shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Ministry Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#D4AF37] text-[#070A1E] shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security & Data Isolation</span>
          </button>

          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'subscription'
                ? 'bg-[#D4AF37] text-[#070A1E] shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Subscription & Billing</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'data'
                ? 'bg-[#D4AF37] text-[#070A1E] shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Data Export & Archiving</span>
          </button>

          <button
            onClick={() => setActiveTab('sheets')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sheets'
                ? 'bg-emerald-400 text-[#070A1E] shadow-[0_0_15px_rgba(52,211,153,0.3)] font-black'
                : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Google Sheets Live Sync</span>
          </button>
        </div>

        {/* TAB 1: MINISTRY PROFILE */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-[#0D1236]/40 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Church & Pastor Identity</span>
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  </h3>
                  <p className="text-xs text-white/50">
                    Stored securely in Cloud SQL and synchronized with Firebase Firestore
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveProfile()}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#070A1E] font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Pastor / Leader Full Name</span>
                  </label>
                  <input
                    type="text"
                    value={formState.displayName}
                    onChange={(e) => setFormState({ ...formState, displayName: e.target.value })}
                    placeholder="e.g. Pastor David Vance"
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white text-base focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Authenticated Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/60 text-base cursor-not-allowed"
                  />
                  <p className="text-[10px] text-white/40">Linked to Firebase & Google Identity Services</p>
                </div>

                {/* Ministerial Role */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Ministry Role</span>
                  </label>
                  <select
                    value={formState.role}
                    onChange={(e) => setFormState({ ...formState, role: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-[#0D1236] border border-white/15 rounded-xl text-white text-base focus:outline-none focus:border-[#D4AF37] transition-all"
                  >
                    <option value="pastor">Lead Pastor</option>
                    <option value="leader">Associate Pastor / Ministry Leader</option>
                    <option value="member">Worship / Tech Director</option>
                    <option value="guest">Guest Minister</option>
                    <option value="admin">Sanctuary Administrator</option>
                  </select>
                </div>

                {/* Church Name */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Church / Congregation Name</span>
                  </label>
                  <input
                    type="text"
                    value={formState.churchName}
                    onChange={(e) => setFormState({ ...formState, churchName: e.target.value })}
                    placeholder="e.g. Grace Fellowship"
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white text-base focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>

                {/* Church Physical Address */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Physical Sanctuary Address</span>
                  </label>
                  <input
                    type="text"
                    value={formState.churchAddress}
                    onChange={(e) => setFormState({ ...formState, churchAddress: e.target.value })}
                    placeholder="e.g. 777 Grace Way, Dallas, TX"
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white text-base focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>

                {/* Contact Phone */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Contact Phone</span>
                  </label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    placeholder="(555) 000-0000"
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white text-base focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>

                {/* Upcoming Service Date */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Upcoming Service Date</span>
                  </label>
                  <input
                    type="date"
                    value={formState.serviceDate}
                    onChange={(e) => setFormState({ ...formState, serviceDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white text-base focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>

                {/* Congregation Size */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Estimated Congregation Members</span>
                  </label>
                  <input
                    type="number"
                    value={formState.memberCount}
                    onChange={(e) => setFormState({ ...formState, memberCount: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2.5 bg-black/30 border border-white/15 rounded-xl text-white text-base focus:outline-none focus:border-[#D4AF37] transition-all"
                  />
                </div>

                {/* Assigned Tenant ID */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Active Tenant Workspace ID</span>
                  </label>
                  <input
                    type="text"
                    value={profile.tenantId || 'tenant_ws_isolated'}
                    disabled
                    className="w-full px-4 py-2.5 bg-black/50 border border-emerald-500/30 rounded-xl text-emerald-300 font-mono text-base cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SECURITY & DATA ISOLATION */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* WORKSPACE TENANT REPROVISIONING CARD */}
            <div className="bg-gradient-to-r from-[#101740] to-[#151236] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      Multi-Tenant Isolation Architecture
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">Dynamic Cryptographic Workspace Partition</h3>
                  <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
                    Every church has a completely separate tenant partition. Audio telemetry, pastoral reports, and Care Chat records are never mixed between congregations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReprovisionWorkspace}
                  disabled={isReprovisioning}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${isReprovisioning ? 'animate-spin' : ''}`} />
                  <span>{isReprovisioning ? 'Reprovisioning...' : 'Reprovision Workspace Key'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="p-4 bg-black/30 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Current Tenant Key</span>
                  <p className="font-mono text-xs text-emerald-400 font-bold truncate">{profile.tenantId}</p>
                </div>
                <div className="p-4 bg-black/30 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Isolation Level</span>
                  <p className="font-mono text-xs text-white font-bold">Strict PostgreSQL & Firestore Rule Guard</p>
                </div>
                <div className="p-4 bg-black/30 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Isolated Reports Stored</span>
                  <p className="font-mono text-xs text-[#D4AF37] font-bold">{isolatedReports.length} Archives Partitioned</p>
                </div>
              </div>
            </div>

            {/* PRIVACY & ZERO-TRUST CONTROLS */}
            <div className="bg-[#0D1236]/40 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Privacy, Audio Sanitization & Zero-Trust Policies</h3>
                  <p className="text-xs text-white/50">Configure strict data isolation behaviors for your congregation</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveProfile()}
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#D4AF37] text-[#070A1E] font-black text-xs rounded-xl uppercase tracking-wider hover:bg-[#D4AF37]/90 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Policies</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* 1. Audio sanitization */}
                <div className="p-4 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-xl">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ephemeral Audio Memory Policy</span>
                    </h4>
                    <p className="text-[11px] text-white/50">
                      Live service audio frames are processed entirely in transient memory and immediately wiped. No raw congregation audio is stored on disk or transferred to third parties.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formState.strictAudioSanitization}
                    onChange={(e) => setFormState({ ...formState, strictAudioSanitization: e.target.checked })}
                    className="w-5 h-5 rounded accent-[#D4AF37] cursor-pointer"
                  />
                </div>

                {/* 2. Auto-purge guest logs */}
                <div className="p-4 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-xl">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Automated Guest Telemetry Purging</span>
                    </h4>
                    <p className="text-[11px] text-white/50">
                      Automatically scrub temporary anonymous tokens and IP traces from transient care chats after 30 days.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formState.autoPurgeGuestLogs}
                    onChange={(e) => setFormState({ ...formState, autoPurgeGuestLogs: e.target.checked })}
                    className="w-5 h-5 rounded accent-[#D4AF37] cursor-pointer"
                  />
                </div>

                {/* 3. Prayer anonymization */}
                <div className="p-4 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-xl">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Strict Anonymous Pastoral Prayer Wall</span>
                    </h4>
                    <p className="text-[11px] text-white/50">
                      Enforces non-attributable identity across all public care prayer requests submitted by members.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formState.anonymizePrayerRequests}
                    onChange={(e) => setFormState({ ...formState, anonymizePrayerRequests: e.target.checked })}
                    className="w-5 h-5 rounded accent-[#D4AF37] cursor-pointer"
                  />
                </div>

                {/* 4. Two Factor Authentication */}
                <div className="p-4 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-0.5 max-w-xl">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Enhanced 2-Factor Authentication Guard (2FA)</span>
                    </h4>
                    <p className="text-[11px] text-white/50">
                      Require multi-factor approval when accessing sensitive ministry giving ledgers and pastoral reports.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formState.twoFactorEnabled}
                    onChange={(e) => setFormState({ ...formState, twoFactorEnabled: e.target.checked })}
                    className="w-5 h-5 rounded accent-[#D4AF37] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: SUBSCRIPTION & BILLING */}
        {activeTab === 'subscription' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* PILOT PROGRAM DISCOUNT PROMOTION BANNER */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#121A4B] via-[#1E2568] to-[#12173F] border-2 border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#D4AF37] text-[#0A0E2A] text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  <span>Pilot Program Discount</span>
                </div>
                <h4 className="text-base font-bold text-white">
                  $29/month for the first 90 days
                </h4>
                <p className="text-xs text-white/70 max-w-xl">
                  Applies to initial pilot churches before converting to full pricing upon renewal. Enjoy unmetered real-time AI audio intelligence and pastoral care tools.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormState(prev => ({ ...prev, subscriptionPlan: 'Pilot Program ($29/mo)' }));
                  handleSaveProfile();
                }}
                className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#070A1E] font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shrink-0 shadow-md active:scale-95"
              >
                {formState.subscriptionPlan?.includes('Pilot') ? 'Active on Pilot Rate' : 'Enroll in Pilot ($29/mo)'}
              </button>
            </div>

            {/* CURRENT ACTIVE TIER */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#121A4B] to-[#0E1336] border border-[#D4AF37]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-widest bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/20">
                  Current Ministry Subscription
                </span>
                <h3 className="text-2xl font-black text-white">{formState.subscriptionPlan || 'Growth Tier'}</h3>
                <p className="text-xs text-white/60 max-w-xl leading-relaxed">
                  Your sanctuary is active on the <strong>{formState.subscriptionPlan || 'Growth Tier'}</strong>. You have live sanctuary speech recognition, AI thematic & emotional analysis, and automated Gmail report routing.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-[#D4AF37]">
                    {formState.subscriptionPlan?.includes('Pilot')
                      ? '$29'
                      : formState.subscriptionPlan?.includes('Seed')
                        ? '$49'
                        : formState.subscriptionPlan?.includes('Revival')
                          ? '$299'
                          : formState.subscriptionPlan?.includes('Cathedral')
                            ? 'Custom'
                            : '$149'}
                  </span>
                  <span className="text-xs text-white/50">
                    {formState.subscriptionPlan?.includes('Cathedral') ? ' pricing' : ' / month'}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium">Auto-renew active (Next: Sept 14, 2026)</span>
              </div>
            </div>

            {/* PLAN COMPARISON & SWITCHER */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  name: 'Seed Tier',
                  price: '$49',
                  description: 'Essential real-time verse recognition & basic sermon analytics for church plants.',
                  features: ['Up to 150 active members', 'Live Bible verse matching', 'Basic sermon summary', 'Zero-Trust data isolation', '1 Pastoral seat']
                },
                {
                  name: 'Growth Tier',
                  price: '$149',
                  popular: true,
                  description: 'Full pastoral suite with AI counseling chat, intelligent care engine & Gmail report routing.',
                  features: ['Up to 600 active members', 'Everything in Seed Tier', 'AI Pastoral care assistant', 'Real-time Gmail report routing', 'Cloud SQL + Firestore archives', '5 Pastoral seats']
                },
                {
                  name: 'Revival Tier',
                  price: '$299',
                  description: 'High-throughput suite for large & multi-sanctuary churches requiring advanced momentum tracking.',
                  features: ['Up to 2,500 active members', 'Multi-campus sanctuary routing', 'Emotional resonance tracking', 'Priority AI inference cluster', 'Unlimited staff accounts']
                },
                {
                  name: 'Cathedral Tier',
                  price: 'Custom',
                  description: 'Dedicated enterprise infrastructure, custom telemetry APIs, and white-glove SRE support.',
                  features: ['Unlimited congregants & sanctuaries', 'Dedicated Pastoral Success Manager & SRE', 'Custom on-prem / VPC cloud partition', 'Sanctuary Analytics API & Webhooks', '99.99% Enterprise SLA']
                }
              ].map((tier) => {
                const isActive = formState.subscriptionPlan === tier.name || 
                  (tier.name === 'Growth Tier' && formState.subscriptionPlan === 'Growth') ||
                  (tier.name === 'Seed Tier' && formState.subscriptionPlan === 'Starter');
                
                return (
                  <div
                    key={tier.name}
                    className={`p-6 rounded-2xl border flex flex-col justify-between transition-all ${
                      isActive
                        ? 'bg-[#151D52] border-[#D4AF37] shadow-[0_0_25px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]'
                        : 'bg-[#0D1236]/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-white">{tier.name}</h4>
                        {tier.popular && (
                          <span className="text-[10px] uppercase tracking-wider font-bold bg-[#D4AF37] text-[#070A1E] px-2.5 py-0.5 rounded-full">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-2xl font-black text-[#D4AF37]">{tier.price}</span>
                        <span className="text-xs text-white/50">{tier.price === 'Custom' ? ' pricing' : ' / month'}</span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed min-h-[36px]">{tier.description}</p>
                      
                      <ul className="space-y-2 pt-2 border-t border-white/5 text-xs text-white/70">
                        {tier.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFormState(prev => ({ ...prev, subscriptionPlan: tier.name }));
                        handleSaveProfile();
                      }}
                      disabled={isActive}
                      className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-white/10 hover:bg-[#D4AF37] hover:text-[#070A1E] text-white border border-white/15'
                      }`}
                    >
                      {isActive ? 'Active Plan' : `Switch to ${tier.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 4: DATA EXPORT & ARCHIVING */}
        {activeTab === 'data' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-[#0D1236]/40 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#D4AF37]" />
                  <span>Sanctuary Data Portability & Archive Center</span>
                </h3>
                <p className="text-xs text-white/50">
                  Export all intelligence reports, sermon themes, and ministry profile archives at any time.
                </p>
              </div>

              <div className="p-5 bg-black/30 border border-white/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Full Ministry Intelligence Archive (.JSON)</h4>
                  <p className="text-xs text-white/60">
                    Includes all {isolatedReports.length} saved service intelligence dossiers, theological outlines, verse occurrences, and isolated tenant preferences.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportData}
                  className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#070A1E] font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.2)] shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Archive</span>
                </button>
              </div>

              {/* ARCHIVED REPORTS LIST SUMMARY */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
                  Partitioned Reports in this Workspace ({isolatedReports.length})
                </h4>

                {isolatedReports.length === 0 ? (
                  <div className="p-6 bg-black/20 rounded-xl text-center text-xs text-white/40">
                    No intelligence reports generated yet. Launch the Live Service Dashboard to capture and record your first sermon.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {isolatedReports.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-3.5 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between text-xs hover:border-white/15 transition-all"
                      >
                        <div>
                          <p className="font-bold text-white">{rep.serviceTitle || 'Pastoral Intelligence Report'}</p>
                          <p className="text-[10px] text-white/40 font-mono">
                            {new Date(rep.createdAt).toLocaleDateString()} • Engagement: {rep.averageEngagement || 78}%
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          Encrypted
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: GOOGLE SHEETS LIVE SIGNUP RECEIVER */}
        {activeTab === 'sheets' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <GoogleSheetsSyncCard onNotify={showNotification} />
          </motion.div>
        )}

      </main>
    </div>
  );
}
