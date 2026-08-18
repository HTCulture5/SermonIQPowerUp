import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Users, 
  Activity, 
  Shield, 
  ArrowRight, 
  Zap, 
  Globe, 
  Database, 
  Menu, 
  X, 
  Sparkles, 
  Lock, 
  MessageCircleOff, 
  DollarSign, 
  Mail,
  Church,
  User,
  Rss,
  LogIn,
  LogOut,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DemoRequestModal } from './DemoRequestModal';
import { PaymentModal } from './PaymentModal';
import { ChurchSignupModal } from './ChurchSignupModal';
import { SermonIQLogo } from './SermonIQLogo';
import { auth, googleSignIn, logout, hasCreatedProfile, setCreatedProfile } from '../services/authService';

interface LandingPageProps {
  onStart: () => void;
  onOpenChat: () => void;
  onOpenDonation: () => void;
  onOpenGmail: () => void;
  onOpenChurchSignup?: () => void;
  onOpenProfile?: () => void;
  onOpenRssFeed?: () => void;
}

export function LandingPage({ onStart, onOpenChat, onOpenDonation, onOpenGmail, onOpenChurchSignup, onOpenProfile, onOpenRssFeed }: LandingPageProps) {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isChurchSignupOpen, setIsChurchSignupOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(auth.currentUser);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  // Checkout Modal State
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<any>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Sync auth and profile creation status
  useEffect(() => {
    const updateAuthState = (currentUser: any) => {
      setUser(currentUser);
      const profileCreated = hasCreatedProfile() || Boolean(currentUser);
      setHasProfile(profileCreated);
      if (currentUser && !hasCreatedProfile()) {
        setCreatedProfile(true);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(updateAuthState);

    const handleCustomAuthChange = () => {
      setUser(auth.currentUser);
      setHasProfile(hasCreatedProfile() || Boolean(auth.currentUser));
    };

    window.addEventListener('sermoniq-auth-change', handleCustomAuthChange);
    window.addEventListener('storage', handleCustomAuthChange);

    // Initial check
    updateAuthState(auth.currentUser);

    return () => {
      unsubscribe();
      window.removeEventListener('sermoniq-auth-change', handleCustomAuthChange);
      window.removeEventListener('storage', handleCustomAuthChange);
    };
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setCreatedProfile(true);
        setHasProfile(true);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const features = [
    {
      icon: <Activity className="w-6 h-6 text-[#D4AF37]" />,
      title: "Real-time Engagement",
      description: "Monitor sanctuary energy levels with proprietary audio intelligence algorithms."
    },
    {
      icon: <Database className="w-6 h-6 text-[#D4AF37]" />,
      title: "Scripture Detection",
      description: "Auto-detect Bible verses from live speech and display them instantly."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-[#D4AF37]" />,
      title: "AI Analysis",
      description: "Deep content intelligence identifying themes, tones, and spiritual momentum."
    },
    {
      icon: <Shield className="w-6 h-6 text-[#D4AF37]" />,
      title: "Privacy First",
      description: "All audio processing happens locally. Only selected metrics reach our cloud."
    },
    {
      icon: <Users className="w-6 h-6 text-[#D4AF37]" />,
      title: "Congregation Insights",
      description: "Understand response patterns and engagement climaxes across your service."
    },
    {
      icon: <Zap className="w-6 h-6 text-[#D4AF37]" />,
      title: "Instant Reports",
      description: "Generate pastoral-grade intelligence reports with one click at service end."
    }
  ];

  const pricingPlans = [
    { 
      name: "Seed Tier", 
      price: "$49", 
      period: "/mo",
      tagline: "Essential intelligence for church plants & chapel congregations",
      features: [
        "Up to 150 active members", 
        "Live Sanctuary Audio Monitoring", 
        "Real-Time Scripture & Bible Verse Detection", 
        "Instant Post-Service Executive Reports",
        "Local Zero-Trust Audio Processing",
        "1 Pastoral Lead Seat"
      ] 
    },
    { 
      name: "Growth Tier", 
      price: "$149", 
      period: "/mo",
      tagline: "Most popular for established, vibrant & growing ministries",
      features: [
        "Up to 600 active members", 
        "Everything in Seed Tier",
        "AI Pastoral Care & Counseling Assistant", 
        "Automated Gmail Dossier & Bulletin Dispatch", 
        "Google Sheets Real-Time Sync & Ledger",
        "Cloud SQL + Firestore Telemetry Archive",
        "5 Pastoral & Staff Accounts"
      ], 
      popular: true 
    },
    { 
      name: "Revival Tier", 
      price: "$299", 
      period: "/mo",
      tagline: "High-throughput intelligence for large & multi-sanctuary churches",
      features: [
        "Up to 2,500 active members", 
        "Everything in Growth Tier",
        "Multi-Campus Sanctuary Routing", 
        "Emotional Resonance & Momentum Tracking",
        "Priority High-Speed AI Inference Cluster",
        "Custom Doctrinal & Theological Directives",
        "Unlimited Staff & Pastoral Seats"
      ] 
    },
    { 
      name: "Cathedral Tier", 
      price: "Custom", 
      period: "pricing",
      tagline: "Tailored enterprise solutions for mega-churches & global networks",
      features: [
        "Unlimited Congregants & Campuses", 
        "Dedicated Pastoral Success Manager & SRE",
        "Private VPC & Dedicated Cloud SQL Cluster",
        "White-Glove Sanctuary Audio Calibration",
        "Custom Sanctuary Analytics API & Webhooks",
        "99.99% Enterprise Uptime SLA Guarantee"
      ],
      isCustom: true
    }
  ];

  const handleSelectPlan = (plan: any) => {
    setSelectedCheckoutPlan(plan);
    setIsPaymentOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0E2A] text-white selection:bg-[#D4AF37] selection:text-[#0A0E2A] relative">
      
      {/* LANDING NAVIGATION BAR */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0E2A]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          
          {/* Brand logo details */}
          <SermonIQLogo id="landing-nav-logo" size="md" theme="dark" variant="full" />

          {/* Desktop Right Side Nav */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            
            {/* Conditional Auth Navigation: Signed In vs Signed Up vs New Visitor */}
            {user ? (
              /* Signed In: Show ONLY Profile Picture, Settings, and Sign Out (Sign Up and Sign In removed) */
              <div className="flex items-center gap-2 mr-1">
                {/* Profile Picture */}
                <div 
                  id="landing-user-avatar"
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 px-2 py-1 bg-white/5 border border-[#D4AF37]/30 rounded-full cursor-pointer hover:border-[#D4AF37] transition-all group"
                  title={user.displayName || user.email || 'Pastor Leader'}
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Pastor'} 
                      className="w-7 h-7 rounded-full border border-[#D4AF37] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] font-bold text-xs flex items-center justify-center">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'P')}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-white/90 max-w-[100px] truncate pr-1 hidden lg:inline group-hover:text-[#D4AF37] transition-colors">
                    {user.displayName?.split(' ')[0] || 'Leader'}
                  </span>
                </div>

                {/* Settings Button */}
                {onOpenProfile && (
                  <button
                    id="landing-nav-settings-btn"
                    onClick={onOpenProfile}
                    className="px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:text-white bg-white/5 hover:bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-[#D4AF37]" /> Settings
                  </button>
                )}

                {/* Sign Out Button */}
                <button
                  id="landing-nav-signout-btn"
                  onClick={handleSignOut}
                  className="px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" /> Sign Out
                </button>
              </div>
            ) : hasProfile ? (
              /* Signed Up / Profile Created, but currently signed out: Show ONLY Sign In (Sign Up removed) */
              <button
                id="landing-nav-signin-btn"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-[#0A0E2A] bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] hover:shadow-[0_0_18px_rgba(212,175,55,0.4)] flex items-center gap-1.5 transition-all cursor-pointer mr-1 active:scale-95 disabled:opacity-50"
              >
                {isSigningIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5 text-[#0A0E2A]" />}
                <span>Sign In</span>
              </button>
            ) : (
              /* New Visitor: Show Sign Up & Sign In */
              <div className="flex items-center gap-2 mr-1">
                <button
                  id="landing-nav-church-signup-btn"
                  onClick={() => setIsChurchSignupOpen(true)}
                  className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-[#0A0E2A] bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] hover:shadow-[0_0_18px_rgba(212,175,55,0.4)] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <Church className="w-3.5 h-3.5 text-[#0A0E2A]" /> Church Sign Up
                </button>
                <button
                  id="landing-nav-signin-btn"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:text-white bg-white/5 hover:bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSigningIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5 text-[#D4AF37]" />}
                  <span>Sign In</span>
                </button>
              </div>
            )}

            {/* Link to Live Ministry RSS Feeds Hub */}
            {onOpenRssFeed && (
              <button
                id="landing-nav-rss-btn"
                onClick={onOpenRssFeed}
                className="px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-amber-300/90 hover:text-white flex items-center gap-1.5 hover:bg-white/5 border border-transparent hover:border-amber-500/20 transition-all cursor-pointer"
              >
                <Rss className="w-3.5 h-3.5 text-amber-400" /> RSS Feeds
              </button>
            )}

            {/* Link to Gmail Ministry Communications Hub */}
            <button
              id="landing-nav-gmail-btn"
              onClick={onOpenGmail}
              className="px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-[#D4AF37]/90 hover:text-white flex items-center gap-1.5 hover:bg-white/5 border border-transparent hover:border-[#D4AF37]/10 transition-all cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-[#D4AF37]" /> Gmail Hub
            </button>

            {/* Added Link to Anonymous Care Portal explicitly */}
            <button
              onClick={onOpenChat}
              className="px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-[#D4AF37]/90 hover:text-white flex items-center gap-1.5 hover:bg-white/5 border border-transparent hover:border-[#D4AF37]/10 transition-all cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-[#D4AF37]" /> Care Chat
            </button>

            {/* Added Link to Donation single page explicitly */}
            <button
              onClick={onOpenDonation}
              className="px-3.5 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-[#D4AF37]/90 hover:text-white flex items-center gap-1.5 hover:bg-white/5 border border-transparent hover:border-[#D4AF37]/10 transition-all cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-[#D4AF37]" /> Donation
            </button>

            <button
               onClick={() => setIsDemoOpen(true)}
              className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              Demo
            </button>
            <button
              onClick={onStart}
              className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer border border-white/15"
            >
              Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Right Side Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-white/5 border border-white/10 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-b border-white/5 bg-[#0A0E2A] overflow-hidden"
            >
              <div className="px-4 py-6 space-y-3 flex flex-col">
                {/* Mobile Auth Actions */}
                {user ? (
                  /* Signed In Mobile: Show Profile Info, Settings, and Sign Out */
                  <div className="space-y-2 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-[#D4AF37]/20">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'Pastor'} 
                          className="w-10 h-10 rounded-full border border-[#D4AF37] object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] font-bold text-sm flex items-center justify-center">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'P'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{user.displayName || 'Pastor Leader'}</p>
                        <p className="text-[10px] text-white/50 truncate font-mono">{user.email}</p>
                      </div>
                    </div>
                    {onOpenProfile && (
                      <button
                        id="mobile-nav-settings-btn"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onOpenProfile();
                        }}
                        className="w-full text-center py-3 bg-white/5 border border-[#D4AF37]/25 rounded-xl text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:bg-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <User className="w-4 h-4 text-[#D4AF37]" /> Settings & Profile
                      </button>
                    )}
                    <button
                      id="mobile-nav-signout-btn"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full text-center py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs font-bold uppercase tracking-widest text-red-300 hover:bg-red-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <LogOut className="w-4 h-4 text-red-400" /> Sign Out
                    </button>
                  </div>
                ) : hasProfile ? (
                  /* Signed Up / Has Profile, Signed Out: Show ONLY Sign In */
                  <button
                    id="mobile-nav-signin-btn"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignIn();
                    }}
                    disabled={isSigningIn}
                    className="w-full text-center py-3 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50"
                  >
                    {isSigningIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 text-[#0A0E2A]" />}
                    <span>Sign In to Sanctuary</span>
                  </button>
                ) : (
                  /* New Visitor: Show Sign Up and Sign In */
                  <div className="space-y-2 pb-2 border-b border-white/10">
                    <button
                      id="mobile-nav-church-signup-btn"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsChurchSignupOpen(true);
                      }}
                      className="w-full text-center py-3 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
                    >
                      <Church className="w-4 h-4 text-[#0A0E2A]" /> Church Sign Up
                    </button>
                    <button
                      id="mobile-nav-signin-btn"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleSignIn();
                      }}
                      disabled={isSigningIn}
                      className="w-full text-center py-3 bg-white/5 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isSigningIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 text-[#D4AF37]" />}
                      <span>Sign In</span>
                    </button>
                  </div>
                )}
                {onOpenRssFeed && (
                  <button
                    id="mobile-nav-rss-btn"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenRssFeed();
                    }}
                    className="w-full text-center py-3 bg-white/5 border border-amber-500/30 rounded-xl text-xs font-bold uppercase tracking-widest text-amber-300 hover:bg-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Rss className="w-4 h-4 text-amber-400" /> Ministry RSS Feeds
                  </button>
                )}
                <button
                  id="mobile-nav-gmail-btn"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenGmail();
                  }}
                  className="w-full text-center py-3 bg-white/5 border border-[#D4AF37]/25 rounded-xl text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:bg-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Mail className="w-4 h-4 text-[#D4AF37]" /> Gmail Ministry Hub
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenDonation();
                  }}
                  className="w-full text-center py-3 bg-white/5 border border-[#D4AF37]/25 rounded-xl text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:bg-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <DollarSign className="w-4 h-4 text-[#D4AF37]" /> Donation
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenChat();
                  }}
                  className="w-full text-center py-3 bg-white/5 border border-[#D4AF37]/25 rounded-xl text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:bg-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Heart className="w-4 h-4 text-[#D4AF37]" /> Anonymous Care Chat
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsDemoOpen(true);
                  }}
                  className="w-full text-center py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  Request Demo
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onStart();
                  }}
                  className="w-full text-center py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0A0E2A] rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer font-extrabold"
                >
                  Launch Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-36 pb-16 px-4 sm:px-6 overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[450px] bg-gradient-to-b from-[#D4AF37]/10 to-transparent blur-[120px] rounded-full -z-10 animate-pulse duration-10000" />
        
        <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#D4AF37] text-[10px] sm:text-xs font-bold uppercase tracking-widest"
          >
            <Zap className="w-3 h-3 fill-current" /> Next-Gen Church Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] text-white"
          >
            Spiritual Insights. <br className="hidden sm:inline" />
            <span className="text-[#D4AF37]">Powered by Intelligence.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed px-2"
          >
            SermonIQ bridges the gap between the sanctuary and the digital age, 
            providing live engagement monitoring, scripture intelligence, and 
            pastoral analytics for the modern church.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 max-w-xs sm:max-w-2xl mx-auto"
          >
            {/* Conditional Hero CTA */}
            {user ? (
              <>
                <button 
                  onClick={onStart}
                  className="w-full sm:w-auto px-8 sm:px-9 py-3.5 sm:py-4 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] rounded-full font-black text-base hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  Enter Sanctuary Dashboard <ArrowRight className="w-5 h-5" />
                </button>
                {onOpenProfile && (
                  <button
                    onClick={onOpenProfile}
                    className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-base border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-[#D4AF37]" /> Settings & Profile
                  </button>
                )}
                <button
                  onClick={onOpenChat}
                  className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-[#D4AF37]/35 rounded-full font-bold text-base hover:bg-[#D4AF37]/10 transition-all cursor-pointer text-[#D4AF37] flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                >
                  <Heart className="w-4 h-4 fill-current" /> Care Chat
                </button>
              </>
            ) : hasProfile ? (
              <>
                <button 
                  id="hero-signin-btn"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="w-full sm:w-auto px-8 sm:px-9 py-3.5 sm:py-4 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] rounded-full font-black text-base hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5 text-[#0A0E2A]" />}
                  <span>Sign In to Sanctuary</span>
                </button>
                <button 
                  onClick={onStart}
                  className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-base border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Launch Dashboard <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenChat}
                  className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-[#D4AF37]/35 rounded-full font-bold text-base hover:bg-[#D4AF37]/10 transition-all cursor-pointer text-[#D4AF37] flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                >
                  <Heart className="w-4 h-4 fill-current" /> Care Chat
                </button>
              </>
            ) : (
              <>
                <button 
                  id="hero-church-signup-btn"
                  onClick={() => setIsChurchSignupOpen(true)}
                  className="w-full sm:w-auto px-8 sm:px-9 py-3.5 sm:py-4 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] rounded-full font-black text-base hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Church className="w-5 h-5 text-[#0A0E2A]" /> Sign Up Your Church
                </button>
                <button 
                  onClick={onStart}
                  className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-base border border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Launch Dashboard <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenChat}
                  className="w-full sm:w-auto px-7 sm:px-8 py-3.5 sm:py-4 bg-white/5 border border-[#D4AF37]/35 rounded-full font-bold text-base hover:bg-[#D4AF37]/10 transition-all cursor-pointer text-[#D4AF37] flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                >
                  <Heart className="w-4 h-4 fill-current" /> Care Chat
                </button>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37] block mb-1">Sanctuary Framework</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Full-Suite Sanctuary Utilities</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-[#D4AF37]/30 transition-all group"
            >
              <div className="w-11 h-11 bg-white/5 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">{feature.title}</h3>
              <p className="text-white/50 leading-relaxed text-xs sm:text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ANONYMOUS CARE CHAT EXPLANATION & PORTAL LINK */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden border-t border-white/5 bg-gradient-to-r from-[#0C1236] to-[#0A0E2A]">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/5 blur-[80px] rounded-full -z-10" />
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
          
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-[10px] sm:text-xs font-black uppercase tracking-widest">
              <MessageCircleOff className="w-3.5 h-3.5" /> 100% Cryptographically Anonymous
            </div>
            
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Anonymous Care & <br />
              <span className="text-[#D4AF37]">Connection Sanctuary</span>
            </h2>
            
            {/* Added Description for the Anonymous Chat */}
            <p className="text-white/70 text-sm sm:text-base leading-relaxed font-sans">
              We believe a sanctuary should be a beautiful place for vulnerable, private prayer and real dialogue without digital baggage or structural monitoring. 
              Our **Anonymous Care Chat Portal** provides a safe, completely unlinked avenue for members to communicate their heaviest griefs, spiritual questions, physical health updates, and financial stress directly with a caring pastoral response team. 
              By utilizing a choice of simple spiritual icons, believers share what weighs on their hearts without ever releasing a name, registration credentials, email addresses, or phone logs.
            </p>
            
            <p className="text-white/50 text-xs sm:text-sm leading-relaxed border-l-2 border-[#D4AF37]/40 pl-4 py-1">
              Your stories are sacred. With SermonIQ, your prayer requests are handled inside high-security local contexts—shielded from traditional tracking, surveillance databases, or identity tagging.
            </p>

            <div className="pt-4">
              <button
                onClick={onOpenChat}
                className="px-8 py-4 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0A0E2A] hover:shadow-[0_0_25px_rgba(212,175,55,0.35)] rounded-full text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 font-mono active:scale-95"
              >
                <Heart className="w-4 h-4 fill-current animate-pulse text-[#0A0E2A]" /> Launch Anonymous Care Chat
              </button>
            </div>
          </div>

          <div className="md:col-span-5 bg-[#0D1236]/80 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Care & Prayer Line</h4>
                  <p className="text-[9px] text-[#D4AF37] font-semibold flex items-center gap-1">🔒 SECURE EXCLUSIVE GATEWAY</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                 <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
                 <span className="text-[8px] font-bold text-white/30 uppercase">Pastor Online</span>
              </div>
            </div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none max-w-[85%] text-xs text-white/70">
                Welcome to Anonymous Care. Select an emoji that represents your heart posture and share what's on your mind.
              </div>
              <div className="bg-[#D4AF37] text-[#0A0E2A] p-3 rounded-2xl rounded-tr-none max-w-[85%] ml-auto text-xs font-semibold">
                Struggling with family health issues today. Just need a word of encouragement. 🏥
              </div>
              <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none max-w-[85%] text-xs text-white/70 italic font-serif leading-relaxed">
                "Cast all your anxiety on Him because He cares for you." Our pastoral team is standing with you in intercession right now.
              </div>
            </div>
            <div className="border-t border-white/5 mt-4 pt-4 flex gap-2">
              <div className="flex-1 bg-[#0A0E2A] border border-white/10 rounded-lg p-2 text-white/20 select-none text-xs">
                Write a prayer request...
              </div>
              <div className="p-2 bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-xs flex items-center justify-center">
                🕊️
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* PRICING SECTION - Updated with Seed ($49), Growth ($149), Revival ($299), Cathedral (Custom), and Pilot Program ($29/mo 90-day rate) */}
      <section className="bg-white/2 py-20 sm:py-24 px-4 sm:px-6 border-y border-white/5 relative overflow-hidden" id="pricing-section">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#D4AF37]/5 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto text-center mb-10 sm:mb-12 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ministry Subscription Tiers & Monthly Pricing</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-3 text-white">Affordable for every sanctuary.</h2>
          <p className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto">
            From grassroots church plants to multi-campus cathedral networks, choose the plan tailored to your sanctuary.
          </p>
        </div>

        {/* PILOT PROGRAM DISCOUNT HERO CARD */}
        <div className="max-w-5xl mx-auto mb-12 relative z-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#121A4B] via-[#1A225E] to-[#12173F] border-2 border-[#D4AF37]/60 p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest bg-[#D4AF37] text-[#0A0E2A] px-3 py-1 rounded-full shadow-sm">
                  Limited Pilot Program Offer
                </span>
                <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                  First 90 Days Special
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Pilot Program Discount: <span className="text-[#D4AF37]">$29/month</span> for the first 90 days
              </h3>
              <p className="text-xs sm:text-sm text-white/70 max-w-2xl leading-relaxed">
                Applies to initial pilot churches before converting to full pricing upon renewal. Experience full AI sermon intelligence, live Bible verse projection, and Care Chat risk-free.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col items-center gap-3 shrink-0 w-full md:w-auto">
              <button
                onClick={() => handleSelectPlan({
                  name: "Pilot Program Special",
                  price: "$29",
                  features: [
                    "Full Access to AI Sermon Intelligence",
                    "Live Sanctuary Speech & Verse Detection",
                    "Gmail Executive Dossier Dispatch",
                    "Zero-Trust Audio Isolation Guard",
                    "Rate locked at $29/mo for first 90 days"
                  ]
                })}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0E2A] font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="claim-pilot-discount-btn"
              >
                <Sparkles className="w-4 h-4 text-[#0A0E2A]" />
                <span>Claim Pilot Rate ($29/mo)</span>
              </button>
              <span className="text-[10px] text-white/40 text-center">Converts to standard rate upon 90-day renewal</span>
            </div>
          </div>
        </div>

        {/* 4 CORE PRICING TIERS GRID */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {pricingPlans.map((tier, i) => (
            <div 
              key={i} 
              className={cn(
                "p-6 rounded-2xl border transition-all flex flex-col justify-between relative",
                tier.popular 
                  ? "bg-[#0D1236]/95 border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-[0_0_40px_rgba(212,175,55,0.1)]" 
                  : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
              )}
              id={`landing-tier-card-${tier.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-[#0A0E2A] font-black text-[10px] uppercase tracking-widest px-3 py-0.5 rounded-full shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold mb-1 text-white">{tier.name}</h3>
                <p className="text-[11px] text-white/50 mb-4 min-h-[32px] leading-snug">{tier.tagline}</p>
                
                <div className="mb-6 flex items-baseline gap-1 pb-4 border-b border-white/10">
                  <span className="text-3xl sm:text-4xl font-black text-[#D4AF37]">{tier.price}</span>
                  <span className="text-white/40 text-xs font-semibold">{tier.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((f, j) => (
                    <li key={j} className="text-xs text-white/70 flex items-start gap-2.5">
                      <span className="text-[#D4AF37] mt-0.5 font-bold">✔</span> 
                      <span className="leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Plan Action CTA */}
              <button 
                onClick={() => {
                  if (tier.isCustom) {
                    setIsDemoOpen(true);
                  } else {
                    handleSelectPlan(tier);
                  }
                }}
                className={cn(
                  "w-full py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2",
                  tier.popular 
                    ? "bg-[#D4AF37] text-[#0A0E2A] hover:bg-[#D4AF37]/90 hover:scale-[1.01] shadow-lg shadow-[#D4AF37]/20" 
                    : tier.isCustom
                      ? "bg-white/15 hover:bg-white/25 text-white border border-white/20"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                )}
                id={`btn-subscribe-${tier.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                {tier.isCustom ? (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Contact Pastoral Sales</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Subscribe For {tier.price}/mo</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
        <p className="text-xs text-white/70 text-center md:text-left">© 2026 SermonIQ Intelligence Systems. All rights reserved.</p>
        <div className="flex gap-6 sm:gap-8 text-xs text-white/70 text-center">
          <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
          <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
          <span className="hover:text-white transition-colors cursor-pointer">Security Safeguards</span>
        </div>
      </footer>

      {/* DEMO REQUEST FORM MODAL */}
      <DemoRequestModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />

      {/* CHURCH LEADS SIGNUP MODAL */}
      <ChurchSignupModal 
        isOpen={isChurchSignupOpen}
        onClose={() => setIsChurchSignupOpen(false)}
        onEnterDashboard={onStart}
        onOpenProfile={onOpenProfile}
        onSelectSubscriptionPlan={handleSelectPlan}
      />

      {/* PAYMENT SECURE WORKFLOW MODAL */}
      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
        selectedPlan={selectedCheckoutPlan} 
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
