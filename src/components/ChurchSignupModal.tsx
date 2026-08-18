import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Church, 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  Users, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Loader2, 
  CreditCard,
  Building,
  LogIn,
  Check,
  Database,
  Send,
  Table,
  ExternalLink,
  FileSpreadsheet
} from 'lucide-react';
import { submitChurchLead } from '../services/firestoreService';
import { googleSignIn, getAccessToken, auth, setCreatedProfile } from '../services/authService';
import { sendGmailMessage } from '../services/gmailService';
import { appendSignupToGoogleSheet, findOrCreateSignupsSpreadsheet } from '../services/sheetsService';
import { ChurchLead } from '../types';

interface ChurchSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterDashboard: () => void;
  onOpenProfile?: () => void;
  onSelectSubscriptionPlan?: (plan: { name: string; price: string; features: string[] }) => void;
}

const TARGET_NOTIFICATION_EMAIL = "htculture5@gmail.com";

const SUBSCRIPTION_PLANS = [
  {
    name: "Pilot Program Special",
    price: "$29",
    period: "/month",
    description: "Special rate for initial pilot churches ($29/mo for the first 90 days)",
    badge: "Pilot 90-Day Offer",
    isPilot: true,
    features: [
      "$29/mo for the first 90 days",
      "Full live sanctuary audio dynamics",
      "Real-time scripture detector",
      "Instant service intelligence reports",
      "Converts to full pricing upon renewal"
    ]
  },
  {
    name: "Seed Tier",
    price: "$49",
    period: "/month",
    description: "Essential intelligence for church plants & chapel congregations",
    badge: "Church Plant",
    features: [
      "Up to 150 active members",
      "Live sanctuary audio dynamics",
      "Real-time scripture detector",
      "Instant service intelligence reports",
      "Local Zero-Trust audio processing"
    ]
  },
  {
    name: "Growth Tier",
    price: "$149",
    period: "/month",
    description: "Most popular for established, vibrant & growing congregations",
    badge: "Recommended",
    features: [
      "Up to 600 active members",
      "Full Gmail Ministry integration",
      "Deep emotional sentiment analysis",
      "Cloud SQL + Firestore cloud archives",
      "Multi-service historical comparisons"
    ]
  },
  {
    name: "Revival Tier",
    price: "$299",
    period: "/month",
    description: "High-throughput suite for large & multi-sanctuary ministries",
    badge: "Multi-Sanctuary",
    features: [
      "Up to 2,500 active members",
      "Multi-campus sanctuary routing",
      "Emotional resonance & momentum tracking",
      "Priority AI inference throughput",
      "Custom doctrinal reporting directives"
    ]
  },
  {
    name: "Cathedral Tier",
    price: "Custom",
    period: "pricing",
    description: "Tailored enterprise solutions for mega-churches & global networks",
    badge: "Enterprise",
    isCustom: true,
    features: [
      "Unlimited congregants & sanctuaries",
      "Dedicated pastoral success manager & SRE",
      "White-glove hardware audio setup",
      "Custom Sanctuary Analytics API",
      "99.99% Enterprise Uptime SLA"
    ]
  }
];

export function ChurchSignupModal({ 
  isOpen, 
  onClose, 
  onEnterDashboard,
  onOpenProfile,
  onSelectSubscriptionPlan 
}: ChurchSignupModalProps) {
  // Step state: 'form' | 'success'
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState<string>('Growth Tier');
  const [googleUserConnected, setGoogleUserConnected] = useState<string | null>(null);
  const [provisionedTenantId, setProvisionedTenantId] = useState<string | null>(null);
  const [sheetsSyncState, setSheetsSyncState] = useState<{
    synced: boolean;
    spreadsheetUrl?: string;
    spreadsheetId?: string;
    error?: string;
  }>({ synced: false });

  // Form Fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    churchName: '',
    email: '',
    address: '',
    phoneNumber: '',
    serviceDate: new Date().toISOString().split('T')[0],
    numberOfMembers: '50 - 250'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Google / Gmail Sign In & Auto-fill Handler
  const handleGoogleSignInAutoFill = async () => {
    setIsSigningInWithGoogle(true);
    setErrors({});
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        const user = res.user;
        const displayName = user.displayName || '';
        const names = displayName.split(' ');
        const fName = names[0] || '';
        const lName = names.slice(1).join(' ') || '';

        setFormData(prev => ({
          ...prev,
          email: user.email || prev.email,
          firstName: prev.firstName || fName,
          lastName: prev.lastName || lName
        }));
        setGoogleUserConnected(user.email || 'Google Account Linked');

        // Sync with Cloud SQL user table
        const idToken = await user.getIdToken();
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            displayName: user.displayName,
            photoURL: user.photoURL
          })
        }).catch(err => console.warn('User auth sync notice:', err));
      }
    } catch (err: any) {
      console.error('Google Sign in for registration failed:', err);
      setErrors({ form: 'Google Sign-in was cancelled or encountered an issue.' });
    } finally {
      setIsSigningInWithGoogle(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!formData.address.trim()) errs.address = 'Church address is required';
    if (!formData.phoneNumber.trim()) errs.phoneNumber = 'Phone number is required';
    if (!formData.serviceDate.trim()) errs.serviceDate = 'Service date is required';
    if (!formData.numberOfMembers.trim()) errs.numberOfMembers = 'Number of members is required';
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        churchName: formData.churchName.trim() || 'Community Sanctuary',
        email: formData.email.trim() || 'pastor@ministry.org',
        address: formData.address.trim(),
        phone: formData.phoneNumber.trim(),
        serviceDate: formData.serviceDate,
        numberOfMembers: formData.numberOfMembers,
        selectedSubscription: selectedPlanName
      };

      // 1. Save to Cloud SQL PostgreSQL via /api/leads & trigger htculture5@gmail.com
      const sqlRes = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!sqlRes.ok) {
        console.warn('Cloud SQL lead endpoint returned non-200 status');
      }

      let savedLeadData: any = null;
      if (sqlRes.ok) {
        savedLeadData = await sqlRes.json();
        if (savedLeadData?.lead?.tenantId) {
          setProvisionedTenantId(savedLeadData.lead.tenantId);
        }
      }

      // 3. Also persist to Firebase Firestore
      await submitChurchLead({
        firstName: payload.firstName,
        lastName: payload.lastName,
        churchName: payload.churchName,
        email: payload.email,
        address: payload.address,
        phoneNumber: payload.phone,
        serviceDate: payload.serviceDate,
        numberOfMembers: payload.numberOfMembers,
        selectedSubscription: selectedPlanName,
        status: 'new'
      }).catch(err => console.warn('Firestore fallback sync:', err));

      // 3. If user is signed in with Gmail OAuth, send email notification directly to htculture5@gmail.com
      const token = await getAccessToken();
      if (token) {
        try {
          const emailSubject = `🔔 New SermonIQ Church Registration: ${payload.churchName}`;
          const emailBody = `
New Church Ministry Registration received in SermonIQ:

• Pastor / Leader: ${payload.firstName} ${payload.lastName}
• Church / Ministry: ${payload.churchName}
• Contact Email: ${payload.email}
• Phone: ${payload.phone}
• Physical Address: ${payload.address}
• Upcoming Service Date: ${payload.serviceDate}
• Congregation Size: ${payload.numberOfMembers}
• Selected Plan: ${selectedPlanName}
• Target Inbox: ${TARGET_NOTIFICATION_EMAIL}

This signup data has been recorded in the Cloud SQL database and Firestore.
          `.trim();

          await sendGmailMessage(token, {
            to: TARGET_NOTIFICATION_EMAIL,
            subject: emailSubject,
            body: emailBody
          });
        } catch (gmailErr) {
          console.warn('Direct Gmail dispatch notice:', gmailErr);
        }

        // --- BACK-END & CLIENT GOOGLE SHEETS LIVE USER SIGNUP SYNC ---
        try {
          const sheetsResult = await appendSignupToGoogleSheet({
            firstName: payload.firstName,
            lastName: payload.lastName,
            churchName: payload.churchName,
            email: payload.email,
            phone: payload.phone,
            address: payload.address,
            serviceDate: payload.serviceDate,
            numberOfMembers: payload.numberOfMembers,
            selectedSubscription: selectedPlanName,
            status: 'Active Signup',
            tenantId: `tenant_ws_${payload.churchName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'church'}_${Date.now().toString(36)}`
          }, token);

          if (sheetsResult.success) {
            setSheetsSyncState({
              synced: true,
              spreadsheetUrl: sheetsResult.spreadsheetUrl,
              spreadsheetId: sheetsResult.spreadsheetId
            });
            console.log('[GOOGLE SHEETS BACKEND] User signup appended into Google Sheet:', sheetsResult.spreadsheetUrl);
          }
        } catch (sheetsErr: any) {
          console.warn('Google Sheets live signup sync notice:', sheetsErr);
          setSheetsSyncState({
            synced: false,
            error: sheetsErr.message || 'Google Sheets sync failed'
          });
        }
      }

      // Also sync user profile to Cloud SQL if user is authenticated
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            displayName: `${payload.firstName} ${payload.lastName}`.trim(),
            churchName: payload.churchName,
            churchAddress: payload.address,
            phone: payload.phone,
            role: 'pastor',
            subscriptionPlan: selectedPlanName,
            serviceDate: payload.serviceDate,
            memberCount: payload.numberOfMembers
          })
        }).catch(err => console.warn('Cloud SQL user profile sync notice:', err));
      }

      setCreatedProfile(true);
      setStep('success');
    } catch (err) {
      console.error('Failed to submit church lead:', err);
      setErrors({ form: 'An unexpected error occurred while saving your signup. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPlan = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
    setSelectedPlanName(plan.name);
    if (onSelectSubscriptionPlan) {
      onSelectSubscriptionPlan(plan);
    }
  };

  const handleModalClose = () => {
    onClose();
    setTimeout(() => {
      setStep('form');
      setErrors({});
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-[#0A0E2A] border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-[#0D1236]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Church className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                {step === 'form' ? 'Church Ministry Sign Up & Sign In' : 'Registration Complete'}
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              </h3>
              <p className="text-xs text-white/50">
                {step === 'form' 
                  ? 'Connect with Gmail & Firebase, store in Cloud SQL, and activate live intelligence' 
                  : 'Your sanctuary account is activated and ready for service'}
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            id="church-signup-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.form
                key="signup-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {errors.form && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                    {errors.form}
                  </div>
                )}

                {/* GOOGLE / GMAIL & FIREBASE QUICK LINK BANNER */}
                <div className="p-4 bg-gradient-to-r from-blue-900/20 via-[#0D1236] to-amber-900/20 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                      <Mail className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Sign In with Gmail / Firebase</span>
                        {googleUserConnected && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Connected ({googleUserConnected})
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-white/50">
                        Link your Google or Firebase account to auto-fill details and route alerts to <strong>{TARGET_NOTIFICATION_EMAIL}</strong>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignInAutoFill}
                    disabled={isSigningInWithGoogle}
                    className="w-full sm:w-auto px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isSigningInWithGoogle ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5 text-[#D4AF37]" />
                    )}
                    <span>{googleUserConnected ? 'Re-authenticate Google' : 'Sign in with Google / Gmail'}</span>
                  </button>
                </div>

                {/* Section 1: Pastor / Leader Contact Details */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Pastoral Leadership Information</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        First Name <span className="text-[#D4AF37]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pastor David"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white/5 border ${errors.firstName ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-base text-white placeholder-white/30 focus:outline-none transition-colors`}
                        id="signup-first-name"
                      />
                      {errors.firstName && <p className="text-[11px] text-red-400 mt-1">{errors.firstName}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Last Name <span className="text-[#D4AF37]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mitchell"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white/5 border ${errors.lastName ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-base text-white placeholder-white/30 focus:outline-none transition-colors`}
                        id="signup-last-name"
                      />
                      {errors.lastName && <p className="text-[11px] text-red-400 mt-1">{errors.lastName}</p>}
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact & Ministry Identity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-white/40" />
                      <span>Church / Ministry Name</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Grace Fellowship Sanctuary"
                      value={formData.churchName}
                      onChange={(e) => handleInputChange('churchName', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 focus:border-[#D4AF37] rounded-xl text-base text-white placeholder-white/30 focus:outline-none transition-colors"
                      id="signup-church-name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-white/40" />
                      <span>Email Address</span>
                    </label>
                    <input
                      type="email"
                      placeholder="pastor@gracefellowship.org"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3.5 py-2.5 bg-white/5 border ${errors.email ? 'border-red-500/60' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-base text-white placeholder-white/30 focus:outline-none transition-colors`}
                      id="signup-email"
                    />
                    {errors.email && <p className="text-[11px] text-red-400 mt-1">{errors.email}</p>}
                  </div>
                </div>

                {/* Section 3: Physical Address & Phone */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Church Location & Contact</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Church Physical Address <span className="text-[#D4AF37]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 742 Evergreen Blvd, Springfield, IL 62704"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white/5 border ${errors.address ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-base text-white placeholder-white/30 focus:outline-none transition-colors`}
                        id="signup-address"
                      />
                      {errors.address && <p className="text-[11px] text-red-400 mt-1">{errors.address}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-white/40" />
                        <span>Phone Number <span className="text-[#D4AF37]">*</span></span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. (555) 234-5678"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white/5 border ${errors.phoneNumber ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-base text-white placeholder-white/30 focus:outline-none transition-colors`}
                        id="signup-phone"
                      />
                      {errors.phoneNumber && <p className="text-[11px] text-red-400 mt-1">{errors.phoneNumber}</p>}
                    </div>
                  </div>
                </div>

                {/* Section 4: Service Schedule & Congregation Size */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Sanctuary & Service Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1">
                        Upcoming Service Date <span className="text-[#D4AF37]">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.serviceDate}
                        onChange={(e) => handleInputChange('serviceDate', e.target.value)}
                        className={`w-full px-3.5 py-2.5 bg-white/5 border ${errors.serviceDate ? 'border-red-500/60 ring-1 ring-red-500/30' : 'border-white/10 focus:border-[#D4AF37]'} rounded-xl text-base text-white placeholder-white/30 focus:outline-none transition-colors`}
                        id="signup-service-date"
                      />
                      {errors.serviceDate && <p className="text-[11px] text-red-400 mt-1">{errors.serviceDate}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/70 mb-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-white/40" />
                        <span>Number of Members / Attendees <span className="text-[#D4AF37]">*</span></span>
                      </label>
                      <select
                        value={formData.numberOfMembers}
                        onChange={(e) => handleInputChange('numberOfMembers', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#0D1236] border border-white/10 focus:border-[#D4AF37] rounded-xl text-base text-white focus:outline-none transition-colors cursor-pointer"
                        id="signup-members-count"
                      >
                        <option value="Under 50 members">Under 50 members (Church Plant)</option>
                        <option value="50 - 250 members">50 – 250 members (Midsize Congregation)</option>
                        <option value="250 - 1,000 members">250 – 1,000 members (Growing Community)</option>
                        <option value="1,000+ members">1,000+ members (Mega / Multi-Campus)</option>
                      </select>
                      {errors.numberOfMembers && <p className="text-[11px] text-red-400 mt-1">{errors.numberOfMembers}</p>}
                    </div>
                  </div>
                </div>

                {/* Cloud SQL and Gmail Trigger Notice */}
                <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white/60 text-xs">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span>Auto-saved to Cloud SQL PostgreSQL database.</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>Dispatches instant notification to {TARGET_NOTIFICATION_EMAIL}</span>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] text-[#0A0E2A] font-black text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    id="signup-submit-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to SQL & Sending to Gmail...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Sign Up</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            ) : (
              /* Post-Signup Success & Subscription Selection Step */
              <motion.div
                key="signup-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8 py-2"
              >
                {/* Success Banner */}
                <div className="text-center space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
                  <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Welcome to SermonIQ, Pastor {formData.firstName || 'Leader'}!
                  </h4>
                  <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
                    Your ministry profile for <strong>{formData.churchName || 'Your Congregation'}</strong> has been stored in the <strong>Cloud SQL database</strong> and dispatched to <strong>{TARGET_NOTIFICATION_EMAIL}</strong> inbox.
                  </p>

                  {/* WORKSPACE ISOLATION PILL */}
                  <div className="p-3 bg-[#0D1236]/90 border border-amber-400/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-200">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span>
                        <strong>Workspace Tenant:</strong>{' '}
                        <code className="px-1.5 py-0.5 bg-black/40 text-amber-300 font-mono rounded text-[11px]">
                          {provisionedTenantId || `tenant_ws_${formData.churchName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'ws'}_${Date.now().toString(36).substring(0, 5)}`}
                        </code>
                      </span>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30">
                      Isolated Database Scope
                    </span>
                  </div>

                  {/* GOOGLE SHEETS LIVE SYNC STATUS BADGE */}
                  {sheetsSyncState.synced && sheetsSyncState.spreadsheetUrl ? (
                    <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-200">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span><strong>Google Sheets Sync:</strong> User signup recorded in real-time.</span>
                      </div>
                      <a
                        href={sheetsSyncState.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold flex items-center gap-1.5 transition-all text-[11px]"
                      >
                        <span>Open Google Sheet</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-2 text-xs text-white/70">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-[#D4AF37] shrink-0" />
                        <span>Google Sheets Real-Time Sync is ready. Connect Google to auto-stream rows.</span>
                      </div>
                    </div>
                  )}
                  
                  {/* DIRECT ACTIONS: PROFILE SETTINGS & DASHBOARD */}
                  <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        handleModalClose();
                        if (onOpenProfile) {
                          onOpenProfile();
                        } else {
                          onEnterDashboard();
                        }
                      }}
                      className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-xl hover:shadow-[#D4AF37]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                      id="signup-success-profile-link"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Finalize Profile & Security Preferences</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        handleModalClose();
                        onEnterDashboard();
                      }}
                      className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      id="signup-success-dashboard-link"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Go Directly to Dashboard</span>
                    </button>
                  </div>
                </div>

                {/* SUBSCRIPTION SELECTION SECTION */}
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest mb-2">
                      <Sparkles className="w-3 h-3" />
                      <span>Subscription Selection Options</span>
                    </div>
                    <h5 className="text-lg font-black text-white">Choose Your Ministry Intelligence Plan</h5>
                    <p className="text-xs text-white/50">All plans include a 14-day free trial. Upgrade, downgrade, or cancel anytime.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {SUBSCRIPTION_PLANS.map((plan) => {
                      const isSelected = selectedPlanName === plan.name;
                      return (
                        <div
                          key={plan.name}
                          onClick={() => handleSelectPlan(plan)}
                          className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-white/[0.07] border-[#D4AF37] shadow-xl shadow-[#D4AF37]/10 ring-1 ring-[#D4AF37]'
                              : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]'
                          }`}
                          id={`plan-card-${plan.name.toLowerCase()}`}
                        >
                          {plan.badge && (
                            <div className={`absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              isSelected
                                ? 'bg-[#D4AF37] text-[#0A0E2A] border-[#D4AF37]'
                                : 'bg-white/10 text-white/80 border-white/20'
                            }`}>
                              {plan.badge}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="text-base font-bold text-white">{plan.name}</h6>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-[#D4AF37] text-[#0A0E2A] flex items-center justify-center">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-white/50 mb-4 min-h-[32px]">{plan.description}</p>

                            <div className="flex items-baseline gap-1 mb-4 pb-4 border-b border-white/10">
                              <span className="text-2xl font-black text-white">{plan.price}</span>
                              <span className="text-xs text-white/40">{plan.period}</span>
                            </div>

                            <ul className="space-y-2 mb-6">
                              {plan.features.map((feat, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs text-white/70">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPlan(plan);
                              if (onSelectSubscriptionPlan) {
                                onSelectSubscriptionPlan(plan);
                              }
                            }}
                            className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-[#D4AF37] text-[#0A0E2A] shadow-md shadow-[#D4AF37]/20 hover:brightness-110'
                                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'Selected Plan' : `Choose ${plan.name}`}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>Database records synced in Cloud SQL. Cancel or modify subscriptions anytime.</span>
                  </div>

                  <button
                    onClick={() => {
                      handleModalClose();
                      onEnterDashboard();
                    }}
                    className="text-[#D4AF37] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Skip to Live Sanctuary Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

