import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Database, 
  ArrowRight, 
  LogIn, 
  Table, 
  ShieldCheck, 
  Plus, 
  Send,
  Layers,
  FileCheck
} from 'lucide-react';
import { 
  findOrCreateSignupsSpreadsheet, 
  fetchGoogleSheetSignups, 
  appendSignupToGoogleSheet, 
  bulkSyncLeadsToGoogleSheet,
  getCachedSpreadsheetId,
  SHEET_HEADERS
} from '../services/sheetsService';
import { auth, googleSignIn, getAccessToken } from '../services/authService';

interface GoogleSheetsSyncCardProps {
  onNotify?: (type: 'success' | 'error', message: string) => void;
}

export function GoogleSheetsSyncCard({ onNotify }: GoogleSheetsSyncCardProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAppendingTest, setIsAppendingTest] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getCachedSpreadsheetId());
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [sheetRows, setSheetRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>(SHEET_HEADERS);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize or check OAuth token
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await getAccessToken();
        if (token) {
          setAccessToken(token);
          loadSheetData(token);
        }
      } catch (err) {
        console.warn('Google Sheets token check:', err);
      }
    };
    checkToken();
  }, []);

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        await loadSheetData(res.accessToken);
        if (onNotify) onNotify('success', 'Google Sheets & Drive account connected successfully!');
      }
    } catch (err: any) {
      console.error('Google Sign-in failed for Sheets:', err);
      setError(err.message || 'Failed to authorize Google Sheets permissions');
      if (onNotify) onNotify('error', 'Google authorization failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSheetData = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchGoogleSheetSignups(token);
      setSpreadsheetId(data.spreadsheetId);
      setSpreadsheetUrl(data.spreadsheetUrl);
      setHeaders(data.headers && data.headers.length > 0 ? data.headers : SHEET_HEADERS);
      setSheetRows(data.rows || []);
    } catch (err: any) {
      console.error('Failed to load Google Sheet data:', err);
      setError(err.message || 'Could not fetch Google Sheets data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAllSQLToSheets = async () => {
    if (!accessToken) {
      await handleConnectGoogle();
      return;
    }

    setIsSyncing(true);
    setError(null);
    try {
      // 1. Fetch leads from Cloud SQL backend
      const res = await fetch('/api/leads');
      const data = await res.json();
      const sqlLeads = data.leads || [];

      // 2. Push to Google Sheets
      const syncRes = await bulkSyncLeadsToGoogleSheet(sqlLeads, accessToken);
      setSpreadsheetId(syncRes.spreadsheetId);
      setSpreadsheetUrl(syncRes.spreadsheetUrl);

      // 3. Reload rows
      await loadSheetData(accessToken);

      const msg = `Synced ${syncRes.syncedCount} signup records from Cloud SQL to Google Sheets!`;
      setSuccessMessage(msg);
      if (onNotify) onNotify('success', msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Bulk sync failed:', err);
      setError(err.message || 'Failed to sync signups to Google Sheets');
      if (onNotify) onNotify('error', 'Sync to Google Sheets failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAppendTestRow = async () => {
    if (!accessToken) {
      await handleConnectGoogle();
      return;
    }

    setIsAppendingTest(true);
    setError(null);
    try {
      const testLead = {
        firstName: 'Marcus',
        lastName: 'Vance',
        churchName: 'Bethel Apostolic Sanctuary',
        email: `pastor.marcus.${Math.random().toString(36).substring(2, 6)}@bethelgrace.org`,
        phone: '(555) 789-0123',
        address: '450 Kingdom Way, Austin TX',
        serviceDate: new Date().toISOString().split('T')[0],
        numberOfMembers: '250 - 500',
        selectedSubscription: 'Enterprise ($45)',
        status: 'Active Signup',
        tenantId: `tenant_bethel_${Date.now().toString(36)}`
      };

      const appendRes = await appendSignupToGoogleSheet(testLead, accessToken);
      setSpreadsheetUrl(appendRes.spreadsheetUrl);
      setSpreadsheetId(appendRes.spreadsheetId);

      await loadSheetData(accessToken);

      const msg = 'Test signup row appended to Google Sheet in real-time!';
      setSuccessMessage(msg);
      if (onNotify) onNotify('success', msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to append test row:', err);
      setError(err.message || 'Failed to append test row to Google Sheet');
      if (onNotify) onNotify('error', 'Append test row failed');
    } finally {
      setIsAppendingTest(false);
    }
  };

  return (
    <div className="bg-[#0D1236]/40 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Google Sheets Back-end Signup Receiver</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold tracking-widest uppercase border border-emerald-500/30">
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-white/50">
                Automatically receives and appends all user signup inputs to a designated Google Sheet in real-time
              </p>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!accessToken ? (
            <button
              onClick={handleConnectGoogle}
              disabled={isLoading}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#070A1E] font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              <span>Connect Google Sheets Account</span>
            </button>
          ) : (
            <>
              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Live Google Sheet</span>
                </a>
              )}

              <button
                onClick={() => accessToken && loadSheetData(accessToken)}
                disabled={isLoading}
                className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Refresh rows"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={handleSyncAllSQLToSheets}
                disabled={isSyncing}
                className="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#070A1E] font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>Sync All SQL Signups</span>
              </button>

              <button
                onClick={handleAppendTestRow}
                disabled={isAppendingTest}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 border border-white/10"
              >
                {isAppendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />}
                <span>Append Test Row</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* FEEDBACK MESSAGES */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* INTEGRATION STATUS BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-1.5">
          <span className="text-[11px] text-white/50 uppercase font-mono tracking-wider">Spreadsheet Title</span>
          <p className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>SermonIQ Ministry Signups & Leads</span>
          </p>
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-1.5">
          <span className="text-[11px] text-white/50 uppercase font-mono tracking-wider">Spreadsheet ID</span>
          <p className="text-xs font-mono text-emerald-400 truncate">
            {spreadsheetId ? `${spreadsheetId.substring(0, 16)}...` : 'Auto-provisioned upon first signup'}
          </p>
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-xl space-y-1.5">
          <span className="text-[11px] text-white/50 uppercase font-mono tracking-wider">Recorded Signups</span>
          <p className="text-sm font-bold text-white flex items-center gap-1.5">
            <span className="text-emerald-400">{sheetRows.length}</span>
            <span className="text-xs text-white/60">rows synchronized</span>
          </p>
        </div>
      </div>

      {/* SPREADSHEET TABLE PREVIEW */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
            <Table className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Live Google Sheet Synchronized Data</span>
          </h4>
          <span className="text-[11px] text-white/40 font-mono">
            {sheetRows.length} total rows
          </span>
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden bg-[#070A1E]/80">
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 sticky top-0 backdrop-blur-md">
                <tr>
                  {headers.map((hdr, idx) => (
                    <th key={idx} className="p-3 font-mono text-[11px] text-[#D4AF37] whitespace-nowrap">
                      {hdr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {sheetRows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="p-8 text-center text-white/40">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>Streaming Google Sheets data...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>No rows recorded in Google Sheet yet.</p>
                          <p className="text-[11px] text-white/30">Submit a signup in the modal or click "Append Test Row" to populate.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  sheetRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-3 text-white/80 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ARCHITECTURAL INFO BOX */}
      <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-start gap-3 text-xs text-white/70">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Tri-Layer Synchronization Architecture Active</p>
          <p className="text-white/60 leading-relaxed">
            When church leaders complete sign-up, their payload is simultaneously normalized in <strong>Cloud SQL (PostgreSQL)</strong>, cached in <strong>Firebase Firestore</strong>, and streamed to this <strong>Google Sheet</strong> in your Google Drive. Notifications are also dispatched to <code>htculture5@gmail.com</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
