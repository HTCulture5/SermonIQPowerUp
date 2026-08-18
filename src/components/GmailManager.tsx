import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  Send, 
  Inbox, 
  Trash2, 
  Search, 
  RefreshCw, 
  Plus, 
  FileEdit, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User as UserIcon, 
  LogOut, 
  ExternalLink,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  Shield,
  Tag,
  Paperclip,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { 
  fetchMessages, 
  fetchMessageDetail, 
  sendGmailMessage, 
  createGmailDraft, 
  deleteGmailMessage, 
  fetchUserProfile,
  GmailMessageSummary, 
  GmailMessageDetail, 
  GmailProfile 
} from '../services/gmailService';
import { googleSignIn, logout, getAccessToken, initAuth } from '../services/authService';
import { SermonIQLogo } from './SermonIQLogo';

interface GmailManagerProps {
  initialReportText?: string;
  onClose?: () => void;
}

export function GmailManager({ initialReportText, onClose }: GmailManagerProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<GmailProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Mail List State
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [currentFolder, setCurrentFolder] = useState<'INBOX' | 'SENT' | 'DRAFT' | 'SPAM'>('INBOX');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');

  // Composer State
  const [isComposing, setIsComposing] = useState<boolean>(!!initialReportText);
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeCc, setComposeCc] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>(
    initialReportText ? 'SermonIQ Sanctuary Intelligence Dossier' : ''
  );
  const [composeBody, setComposeBody] = useState<string>(
    initialReportText || ''
  );
  const [isSending, setIsSending] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Confirmation Modals (MANDATORY per Workspace Skill for mutating/destructive actions)
  const [confirmSendModal, setConfirmSendModal] = useState<boolean>(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ id: string; subject: string } | null>(null);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, cachedToken) => {
        setIsAuthenticated(true);
        setToken(cachedToken);
        setUserEmail(user.email || '');
        setIsLoadingAuth(false);
      },
      () => {
        setIsAuthenticated(false);
        setToken(null);
        setUserProfile(null);
        setIsLoadingAuth(false);
      }
    );

    // Initial check
    getAccessToken().then(cached => {
      if (cached) {
        setToken(cached);
        setIsAuthenticated(true);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Profile & Messages when token changes
  const loadMessages = useCallback(async (activeToken: string, folder = currentFolder, query = searchQuery) => {
    setIsLoadingMessages(true);
    try {
      const labels = folder === 'INBOX' ? ['INBOX'] : folder === 'SENT' ? ['SENT'] : folder === 'DRAFT' ? ['DRAFT'] : [];
      const res = await fetchMessages(activeToken, query, 20, labels);
      setMessages(res.messages);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setNotification({ message: `Failed to load emails: ${err.message}`, type: 'error' });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentFolder, searchQuery]);

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchUserProfile(token)
        .then(profile => {
          setUserProfile(profile);
          setUserEmail(profile.emailAddress);
        })
        .catch(err => console.error('Failed to load profile:', err));

      loadMessages(token, currentFolder, searchQuery);
    }
  }, [token, isAuthenticated, currentFolder, searchQuery, loadMessages]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setToken(res.accessToken);
        setUserEmail(res.user.email || '');
        setIsAuthenticated(true);
        setNotification({ message: 'Connected to Gmail successfully!', type: 'success' });
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      setAuthError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setIsAuthenticated(false);
    setToken(null);
    setUserProfile(null);
    setMessages([]);
    setSelectedMessage(null);
    setNotification({ message: 'Signed out of Gmail', type: 'success' });
  };

  const handleSelectMessage = async (msgSummary: GmailMessageSummary) => {
    if (!token) return;
    setIsLoadingDetail(true);
    try {
      const detail = await fetchMessageDetail(token, msgSummary.id);
      setSelectedMessage(detail);
    } catch (err: any) {
      console.error('Error fetching detail:', err);
      setNotification({ message: 'Failed to load email details', type: 'error' });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  // Pre-load templates into composer
  const applyTemplate = (templateType: 'dossier' | 'devotional' | 'prayer' | 'bulletin') => {
    if (templateType === 'dossier') {
      setComposeSubject('SermonIQ Service Intelligence Dossier & Analytics');
      setComposeBody(`Dear Pastoral & Leadership Team,\n\nPlease find attached our latest SermonIQ Sanctuary Intelligence Report.\n\nSummary of Key Ministry Metrics:\n- Real-Time Scriptural Grounding: Scripture references matched\n- Congregation Telemetry: Attentiveness & acoustic engagement tracked\n- Theological Core: Christocentric fidelity validated\n\nBlessings,\nSermonIQ Ministry Systems`);
    } else if (templateType === 'devotional') {
      setComposeSubject('Weekly Pastoral Reflection & Scripture Meditation');
      setComposeBody(`Dear Church Family,\n\nMay grace and peace be multiplied to you in the knowledge of God and of Jesus our Lord.\n\n"For the word of God is alive and active. Sharper than any double-edged sword..." - Hebrews 4:12\n\nReflection for the week ahead:\nTake time today to meditate on God's unwavering faithfulness. Let this passage anchor your thoughts and decisions.\n\nIn Christ's love,\nPastoral Ministry`);
    } else if (templateType === 'prayer') {
      setComposeSubject('Pastoral Care: We Are Praying For You');
      setComposeBody(`Dear Friend,\n\nOur pastoral care team received your prayer request and we wanted you to know that our ministry team is lifting you and your family up before the Lord.\n\n"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God." - Philippians 4:6\n\nIf you need someone to talk with, our pastoral team is here for you.\n\nIn His Grace,\nPastoral Care Team`);
    } else if (templateType === 'bulletin') {
      setComposeSubject('Sanctuary Volunteer & Ministry Team Bulletin');
      setComposeBody(`Dear Ministry Team,\n\nThank you for your faithful service to our congregation this week!\n\nKey reminders for upcoming services:\n1. Audio & Sanctuary Setup: 30 minutes before worship\n2. Greeters & Hospitality: Stationed at main sanctuary entrances\n3. Prayer Team: Available at the altar post-sermon\n\nThank you for serving with excellence!\n\nMinistry Operations`);
    }
  };

  // Perform email sending after confirmation
  const handleExecuteSend = async () => {
    if (!token) return;
    if (!composeTo.trim()) {
      setNotification({ message: 'Recipient email address is required', type: 'error' });
      setConfirmSendModal(false);
      return;
    }

    setIsSending(true);
    try {
      await sendGmailMessage(token, {
        to: composeTo,
        cc: composeCc || undefined,
        subject: composeSubject || '(No Subject)',
        body: composeBody
      });
      setNotification({ message: `Email successfully sent to ${composeTo}!`, type: 'success' });
      setConfirmSendModal(false);
      setIsComposing(false);
      setComposeTo('');
      setComposeCc('');
      setComposeSubject('');
      setComposeBody('');
      // Reload sent folder or inbox
      loadMessages(token, currentFolder, searchQuery);
    } catch (err: any) {
      console.error('Send error:', err);
      setNotification({ message: `Failed to send email: ${err.message}`, type: 'error' });
      setConfirmSendModal(false);
    } finally {
      setIsSending(false);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!token) return;
    setIsSending(true);
    try {
      await createGmailDraft(token, {
        to: composeTo,
        cc: composeCc || undefined,
        subject: composeSubject || '(Draft)',
        body: composeBody
      });
      setNotification({ message: 'Draft saved to Gmail!', type: 'success' });
      setIsComposing(false);
      loadMessages(token, 'DRAFT');
    } catch (err: any) {
      console.error('Draft error:', err);
      setNotification({ message: `Failed to save draft: ${err.message}`, type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  // Perform delete after confirmation
  const handleExecuteDelete = async () => {
    if (!token || !confirmDeleteModal) return;
    try {
      await deleteGmailMessage(token, confirmDeleteModal.id);
      setNotification({ message: 'Email moved to trash.', type: 'success' });
      setSelectedMessage(null);
      setConfirmDeleteModal(null);
      loadMessages(token, currentFolder, searchQuery);
    } catch (err: any) {
      console.error('Delete error:', err);
      setNotification({ message: `Failed to delete: ${err.message}`, type: 'error' });
      setConfirmDeleteModal(null);
    }
  };

  return (
    <div id="gmail-manager-root" className="w-full h-full flex flex-col bg-[#0A0E2A] text-white overflow-hidden">
      
      {/* Top Bar */}
      <header id="gmail-header" className="h-16 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between bg-[#080B21] shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              id="gmail-back-btn"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Return to Dashboard"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <SermonIQLogo id="gmail-top-logo" size="sm" theme="dark" variant="compact" />
          <div className="h-4 w-px bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#D4AF37] uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5" />
            <span>Ministry Communications</span>
          </div>
        </div>

        {/* User profile / Auth button */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-medium text-white">{userEmail}</span>
                <span className="text-[10px] font-mono text-emerald-400">Connected to Gmail</span>
              </div>
              <button
                id="gmail-signout-btn"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 border border-white/10 text-xs transition-colors cursor-pointer"
                title="Sign out of Gmail"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            </div>
          ) : (
            <span className="text-xs text-white/40 hidden sm:inline">Secure Google Workspace Integration</span>
          )}
        </div>
      </header>

      {/* Notifications banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`px-4 py-2 text-xs flex items-center justify-between ${
              notification.type === 'success' ? 'bg-emerald-950/80 border-b border-emerald-500/30 text-emerald-300' : 'bg-red-950/80 border-b border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="hover:opacity-75 text-xs font-bold cursor-pointer">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unauthenticated View: Official Sign In with Google */}
      {!isAuthenticated && !isLoadingAuth && (
        <div id="gmail-auth-gate" className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#10163A] border border-[#D4AF37]/20 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-[#BD8825]/15 border border-[#BD8825]/40 rounded-2xl flex items-center justify-center mx-auto text-[#D4AF37]">
              <Mail className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-serif font-bold text-white">Gmail Ministry Center</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                Connect your Google Workspace or Gmail account to send sermon intelligence dossiers, prayer updates, and congregation devotionals directly from SermonIQ.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs text-left">
                {authError}
              </div>
            )}

            {/* Official Google Sign-In Button */}
            <div className="pt-2 flex justify-center">
              <button
                id="gsi-signin-button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="gsi-material-button flex items-center justify-center gap-3 w-full max-w-xs py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 font-medium text-sm rounded-xl shadow-lg transition-all transform active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isSigningIn ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-gray-600" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                )}
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-white/40 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Zero-knowledge client-side authentication</span>
            </div>
          </div>
        </div>
      )}

      {/* Authenticated Application Workspace */}
      {isAuthenticated && (
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Navigation Sidebar */}
          <aside className="w-56 bg-[#090D25] border-r border-white/10 flex flex-col p-3 gap-2 shrink-0 hidden md:flex">
            <button
              id="compose-email-btn"
              onClick={() => {
                setIsComposing(true);
                setSelectedMessage(null);
              }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#BD8825] to-[#D4AF37] text-[#0A0E2A] font-bold text-xs tracking-wide shadow-lg hover:brightness-110 transition-all cursor-pointer mb-2"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Email</span>
            </button>

            <nav className="flex flex-col gap-1 text-xs">
              <button
                onClick={() => {
                  setCurrentFolder('INBOX');
                  setSearchQuery('');
                  setSelectedMessage(null);
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentFolder === 'INBOX' && !searchQuery ? 'bg-white/10 text-[#D4AF37] font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setCurrentFolder('SENT');
                  setSearchQuery('');
                  setSelectedMessage(null);
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentFolder === 'SENT' && !searchQuery ? 'bg-white/10 text-[#D4AF37] font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="w-4 h-4" />
                  <span>Sent</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setCurrentFolder('DRAFT');
                  setSearchQuery('');
                  setSelectedMessage(null);
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                  currentFolder === 'DRAFT' && !searchQuery ? 'bg-white/10 text-[#D4AF37] font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileEdit className="w-4 h-4" />
                  <span>Drafts</span>
                </div>
              </button>
            </nav>

            <div className="mt-auto border-t border-white/10 pt-3">
              <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 px-3 mb-2">
                Ministry Templates
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setIsComposing(true);
                    setSelectedMessage(null);
                    applyTemplate('dossier');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-md text-[11px] text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  <span>Service Dossier</span>
                </button>
                <button
                  onClick={() => {
                    setIsComposing(true);
                    setSelectedMessage(null);
                    applyTemplate('devotional');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-md text-[11px] text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  <span>Pastoral Devotional</span>
                </button>
                <button
                  onClick={() => {
                    setIsComposing(true);
                    setSelectedMessage(null);
                    applyTemplate('prayer');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-md text-[11px] text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  <span>Prayer Follow-up</span>
                </button>
                <button
                  onClick={() => {
                    setIsComposing(true);
                    setSelectedMessage(null);
                    applyTemplate('bulletin');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-md text-[11px] text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  <span>Team Bulletin</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Center Column: Messages List or Composer */}
          <section className="flex-1 flex flex-col min-w-0 bg-[#0C1133]">
            
            {/* Search & Action Bar */}
            <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between gap-3 bg-[#0B0F2D] shrink-0">
              <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search emails (e.g. from:pastor subject:service)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-base text-white placeholder-white/40 focus:outline-none focus:border-[#D4AF37]"
                />
              </form>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (token) loadMessages(token, currentFolder, searchQuery);
                  }}
                  disabled={isLoadingMessages}
                  className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh messages"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={() => {
                    setIsComposing(true);
                    setSelectedMessage(null);
                  }}
                  className="md:hidden p-2 bg-[#BD8825] text-black rounded-lg text-xs font-bold cursor-pointer"
                  title="Compose"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Message List */}
              <div className={`${selectedMessage || isComposing ? 'hidden lg:block w-80 xl:w-96' : 'w-full'} border-r border-white/10 overflow-y-auto flex flex-col divide-y divide-white/5`}>
                {isLoadingMessages && messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-white/40 gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37]" />
                    <span className="text-xs">Fetching Gmail messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-white/40 text-center gap-2">
                    <Inbox className="w-8 h-8 opacity-40" />
                    <span className="text-xs">No messages found</span>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => {
                        setIsComposing(false);
                        handleSelectMessage(msg);
                      }}
                      className={`p-3.5 hover:bg-white/5 cursor-pointer transition-colors text-left flex flex-col gap-1.5 ${
                        selectedMessage?.id === msg.id ? 'bg-[#151D4A] border-l-2 border-[#D4AF37]' : ''
                      } ${msg.isUnread ? 'bg-white/[0.02]' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${msg.isUnread ? 'font-bold text-white' : 'font-medium text-white/80'}`}>
                          {msg.from?.replace(/<.*>/, '').trim() || msg.from}
                        </span>
                        <span className="text-[10px] font-mono text-white/40 shrink-0">
                          {msg.date ? format(new Date(msg.date), 'MMM d') : ''}
                        </span>
                      </div>

                      <div className={`text-xs truncate ${msg.isUnread ? 'font-semibold text-[#D4AF37]' : 'text-white/90'}`}>
                        {msg.subject}
                      </div>

                      <div className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                        {msg.snippet}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Reading View or Composer */}
              <div className="flex-1 flex flex-col bg-[#0A0E2A] overflow-y-auto">
                
                {/* 1. Composer View */}
                {isComposing ? (
                  <div id="email-composer" className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 max-w-3xl mx-auto w-full">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4 text-[#D4AF37]" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Compose Ministry Message</h3>
                      </div>
                      <button
                        onClick={() => setIsComposing(false)}
                        className="text-xs text-white/40 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono text-white/60 mb-1">To (Recipient)</label>
                        <input
                          type="email"
                          placeholder="pastor@church.org, team@ministry.com"
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-white/60 mb-1">CC (Optional)</label>
                        <input
                          type="email"
                          placeholder="elders@church.org"
                          value={composeCc}
                          onChange={(e) => setComposeCc(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-white/60 mb-1">Subject</label>
                        <input
                          type="text"
                          placeholder="Subject"
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-white/60 mb-1">Message Body</label>
                        <textarea
                          rows={12}
                          placeholder="Type your ministry communication here..."
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] font-mono leading-relaxed resize-y"
                        />
                      </div>
                    </div>

                    {/* Composer Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <button
                        onClick={handleSaveDraft}
                        disabled={isSending}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Save as Draft
                      </button>

                      <button
                        onClick={() => setConfirmSendModal(true)}
                        disabled={isSending || !composeTo.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#BD8825] to-[#D4AF37] text-[#0A0E2A] font-bold text-xs tracking-wide shadow-lg hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSending ? 'Sending...' : 'Send Message'}</span>
                      </button>
                    </div>
                  </div>
                ) : selectedMessage ? (
                  
                  /* 2. Message Detail View */
                  <div id="email-detail-view" className="flex-1 flex flex-col p-4 sm:p-6 space-y-4">
                    {isLoadingDetail ? (
                      <div className="flex-1 flex items-center justify-center text-white/40">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37]" />
                      </div>
                    ) : (
                      <>
                        {/* Header actions */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                          <button
                            onClick={() => setSelectedMessage(null)}
                            className="lg:hidden flex items-center gap-1 text-xs text-[#D4AF37] cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" /> Back to list
                          </button>

                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={() => {
                                setComposeTo(selectedMessage.from?.match(/<([^>]+)>/)?.[1] || selectedMessage.from || '');
                                setComposeSubject(`Re: ${selectedMessage.subject.replace(/^Re:\s*/i, '')}`);
                                setComposeBody(`\n\n--- On ${selectedMessage.date}, ${selectedMessage.from} wrote ---\n> ${selectedMessage.bodyText?.slice(0, 300)}...`);
                                setIsComposing(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs border border-white/10 transition-colors cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Reply</span>
                            </button>

                            <button
                              onClick={() => setConfirmDeleteModal({ id: selectedMessage.id, subject: selectedMessage.subject })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs border border-red-500/20 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Metadata card */}
                        <div className="bg-[#10163A] border border-white/10 rounded-xl p-4 space-y-2">
                          <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                            {selectedMessage.subject}
                          </h2>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-white/60 gap-1">
                            <div>
                              <span className="font-semibold text-white">From: </span>
                              <span>{selectedMessage.from}</span>
                            </div>
                            <div className="font-mono text-[11px] text-white/40">
                              {selectedMessage.date}
                            </div>
                          </div>
                          {selectedMessage.to && (
                            <div className="text-xs text-white/60">
                              <span className="font-semibold text-white">To: </span>
                              <span>{selectedMessage.to}</span>
                            </div>
                          )}
                        </div>

                        {/* Email Body */}
                        <div className="bg-white text-[#0A0E2A] rounded-xl p-6 shadow-md overflow-x-auto min-h-[250px]">
                          {selectedMessage.bodyHtml ? (
                            <div 
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                            />
                          ) : (
                            <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                              {selectedMessage.bodyText}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  
                  /* 3. Empty state */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40 space-y-3">
                    <Mail className="w-12 h-12 opacity-20" />
                    <div>
                      <h4 className="text-sm font-semibold text-white/60">Select an email to read</h4>
                      <p className="text-xs text-white/40 mt-1 max-w-xs">
                        Or click Compose to send a sermon intelligence summary, devotional, or pastoral response.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* MANDATORY CONFIRMATION MODAL: SEND EMAIL */}
      <AnimatePresence>
        {confirmSendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-[#10163A] border border-[#D4AF37]/30 rounded-2xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-[#D4AF37]">
                <Send className="w-6 h-6" />
                <h3 className="text-base font-bold text-white">Confirm Email Dispatch</h3>
              </div>

              <div className="text-xs text-white/80 space-y-2 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/10">
                <p>Are you sure you want to send this email via your connected Gmail account?</p>
                <div><strong>Recipient:</strong> {composeTo}</div>
                {composeCc && <div><strong>CC:</strong> {composeCc}</div>}
                <div><strong>Subject:</strong> {composeSubject}</div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmSendModal(false)}
                  disabled={isSending}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteSend}
                  disabled={isSending}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#BD8825] to-[#D4AF37] text-[#0A0E2A] text-xs font-bold shadow-lg hover:brightness-110 transition-all cursor-pointer"
                >
                  {isSending ? 'Sending...' : 'Confirm & Send'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANDATORY CONFIRMATION MODAL: DELETE EMAIL */}
      <AnimatePresence>
        {confirmDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-[#10163A] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-red-400">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-base font-bold text-white">Delete Email from Gmail?</h3>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">
                This will move the message <span className="font-semibold text-white">"{confirmDeleteModal.subject}"</span> to your Gmail Trash folder.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmDeleteModal(null)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteDelete}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
                >
                  Delete Message
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
