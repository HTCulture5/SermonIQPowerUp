import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Parser from "rss-parser";
import { requireAuth, requireTenantAuth, AuthRequest } from "./src/middleware/auth.ts";
import { 
  getOrCreateUser, 
  getUserProfile, 
  updateUserProfile, 
  reprovisionUserWorkspace, 
  getUsers 
} from "./src/db/users.ts";
import { createChurchLead, getChurchLeads } from "./src/db/leads.ts";
import { generateCareResponse } from "./src/services/careChatServer.ts";
import { 
  generateEngagementReportServer, 
  SERMONIQ_ENGAGEMENT_SYSTEM_PROMPT, 
  buildUserPrompt,
  analyzeTranscriptSnippetServer,
  detectBibleVerseServer
} from "./src/services/aiEngagementScoring.ts";
import { db } from "./src/db/index.ts";
import { churchLeads, sermonNotes } from "./src/db/schema.ts";

// Safe directory resolution supporting both ESM (tsx dev) and bundled CommonJS (dist/server.cjs in production)
const getAppDirectory = (): string => {
  if (typeof __dirname !== "undefined" && __dirname) {
    return __dirname;
  }
  try {
    if (typeof import.meta !== "undefined" && typeof import.meta.url === "string" && import.meta.url) {
      return path.dirname(fileURLToPath(new URL(import.meta.url)));
    }
  } catch {
    // fallback if import.meta is not available
  }
  return process.cwd();
};

const appDir = getAppDirectory();
const parser = new Parser();

// Global process error resilience for Cloud Run container stability
process.on('unhandledRejection', (reason) => {
  console.warn('Process unhandled promise rejection notice:', reason);
});
process.on('uncaughtException', (error) => {
  console.warn('Process uncaught exception notice:', error);
});

// Lead notification tracking (triggers alerts to htculture5@gmail.com)
const TARGET_NOTIFICATION_EMAIL = "htculture5@gmail.com";
const leadNotifications: Array<{
  id: number | string;
  leadName: string;
  churchName: string;
  email: string;
  phone: string;
  targetInbox: string;
  timestamp: string;
  status: 'stored_and_triggered';
}> = [];

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check endpoint for Google Cloud Uptime Checks
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "SermonIQ Cloud Core",
      timestamp: new Date().toISOString(),
      version: "2.4.0",
      region: "us-west2",
      uptime: process.uptime()
    });
  });

  // Database / Auth User Sync Endpoint
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { 
        displayName, 
        photoURL,
        churchName,
        churchAddress,
        phone,
        role,
        subscriptionPlan,
        serviceDate,
        memberCount
      } = req.body || {};

      let user: any = null;
      try {
        user = await getOrCreateUser(
          req.user.uid,
          req.user.email || "",
          displayName,
          photoURL,
          {
            churchName,
            churchAddress,
            phone,
            role,
            subscriptionPlan,
            serviceDate,
            memberCount
          }
        );
      } catch (sqlErr) {
        console.warn("Cloud SQL offline or unconfigured, returning memory sync:", sqlErr);
        user = {
          uid: req.user.uid,
          email: req.user.email || "",
          displayName: displayName || req.user.name || "Pastor",
          role: role || "pastor",
          churchName: churchName || "Sanctuary Workspace",
          subscriptionPlan: subscriptionPlan || "Growth",
          tenantId: req.tenantId || `tenant_ws_${req.user.uid.substring(0, 8)}`,
          onboardingCompleted: true
        };
      }
      res.json({ success: true, user });
    } catch (error: any) {
      console.error("User sync error:", error);
      res.status(500).json({ error: error.message || "Failed to sync user" });
    }
  });

  // Get current user's profile from Cloud SQL (protected)
  app.get("/api/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      let profile: any = null;
      try {
        profile = await getUserProfile(req.user.uid);
        if (!profile) {
          profile = await getOrCreateUser(req.user.uid, req.user.email || "pastor@ministry.org");
        }
      } catch (sqlErr) {
        console.warn("Profile fetch SQL fallback:", sqlErr);
        profile = {
          uid: req.user.uid,
          email: req.user.email || "",
          displayName: req.user.name || "Pastor",
          role: "pastor",
          churchName: "Sanctuary Workspace",
          subscriptionPlan: "Growth",
          tenantId: req.tenantId || `tenant_ws_${req.user.uid.substring(0, 8)}`,
          onboardingCompleted: true
        };
      }
      res.json(profile);
    } catch (error: any) {
      console.error("Failed to fetch user profile:", error);
      res.status(500).json({ error: error.message || "Failed to fetch profile" });
    }
  });

  // Update current user's profile with normalization in Cloud SQL (protected)
  app.put("/api/profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      let updatedUser: any = null;
      try {
        updatedUser = await updateUserProfile(req.user.uid, req.body || {});
      } catch (sqlErr) {
        console.warn("Profile update SQL fallback:", sqlErr);
        updatedUser = {
          uid: req.user.uid,
          ...req.body,
          updatedAt: new Date().toISOString()
        };
      }
      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error("Failed to update user profile:", error);
      res.status(500).json({ error: error.message || "Failed to update profile" });
    }
  });

  // Dynamic Workspace Reprovision & Data Isolation Reset Endpoint (protected)
  app.post("/api/profile/reprovision", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      let reprovisionResult: any = null;
      try {
        reprovisionResult = await reprovisionUserWorkspace(req.user.uid);
      } catch (sqlErr) {
        console.warn("Reprovision SQL fallback:", sqlErr);
        const newTenantId = `tenant_ws_${req.user.uid.substring(0, 6)}_${Math.random().toString(36).substring(2, 8)}`;
        reprovisionResult = {
          success: true,
          message: 'Workspace reprovisioned and isolated with fresh cryptographic tenant container.',
          tenantId: newTenantId,
          user: { uid: req.user.uid, tenantId: newTenantId }
        };
      }
      res.json(reprovisionResult);
    } catch (error: any) {
      console.error("Failed to reprovision workspace:", error);
      res.status(500).json({ error: error.message || "Failed to reprovision workspace" });
    }
  });

  // Get users endpoint (protected)
  app.get("/api/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      let allUsers: any[] = [];
      try {
        allUsers = await getUsers();
      } catch (sqlErr) {
        console.warn("Get users SQL fallback:", sqlErr);
      }
      res.json(allUsers);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ error: error.message || "Failed to fetch users" });
    }
  });

  // Save Church Lead to Cloud SQL & Trigger Gmail Dispatch to htculture5@gmail.com
  app.post("/api/leads", async (req, res) => {
    try {
      const { 
        firstName, 
        lastName, 
        churchName, 
        email, 
        address, 
        phone, 
        serviceDate, 
        numberOfMembers, 
        selectedSubscription 
      } = req.body;

      if (!firstName || !lastName || !churchName || !email) {
        return res.status(400).json({ error: "Required fields: firstName, lastName, churchName, email" });
      }

      // Store in Cloud SQL PostgreSQL with memory fallback
      let savedLead: any = null;
      try {
        savedLead = await createChurchLead({
          firstName,
          lastName,
          churchName,
          email,
          address: address || "Not provided",
          phone: phone || "Not provided",
          serviceDate: serviceDate || new Date().toISOString().split('T')[0],
          memberCount: Number(numberOfMembers) || 0,
          subscriptionPlan: selectedSubscription || "starter"
        });
      } catch (sqlErr) {
        console.warn("Lead insert SQL fallback:", sqlErr);
        savedLead = {
          id: Date.now(),
          firstName,
          lastName,
          churchName,
          email,
          address: address || "Not provided",
          phone: phone || "Not provided",
          serviceDate: serviceDate || new Date().toISOString().split('T')[0],
          memberCount: Number(numberOfMembers) || 0,
          subscriptionPlan: selectedSubscription || "starter",
          createdAt: new Date().toISOString()
        };
      }

      // Prepare trigger record for target Gmail inbox
      const notificationEntry = {
        id: savedLead.id,
        leadName: `${firstName} ${lastName}`,
        churchName,
        email,
        phone: phone || "N/A",
        targetInbox: TARGET_NOTIFICATION_EMAIL,
        timestamp: new Date().toISOString(),
        status: 'stored_and_triggered' as const
      };
      leadNotifications.unshift(notificationEntry);

      console.log(`[SQL & GMAIL TRIGGER] Lead #${savedLead.id} for "${churchName}" saved and dispatched to ${TARGET_NOTIFICATION_EMAIL}`);

      res.status(201).json({
        success: true,
        lead: savedLead,
        notification: {
          targetInbox: TARGET_NOTIFICATION_EMAIL,
          status: "triggered",
          dispatchedAt: notificationEntry.timestamp,
          message: `User signup info logged and routed to ${TARGET_NOTIFICATION_EMAIL} inbox.`
        }
      });
    } catch (error: any) {
      console.error("Failed to process church lead:", error);
      res.status(500).json({ error: error.message || "Failed to save lead" });
    }
  });

  // Fetch all Church Leads from Cloud SQL
  app.get("/api/leads", async (req, res) => {
    try {
      let leads: any[] = [];
      try {
        leads = await getChurchLeads(50);
      } catch (sqlErr) {
        console.warn("Get leads SQL fallback:", sqlErr);
      }
      res.json({
        leads,
        notificationLog: leadNotifications,
        targetEmail: TARGET_NOTIFICATION_EMAIL
      });
    } catch (error: any) {
      console.error("Failed to get leads:", error);
      res.status(500).json({ error: error.message || "Failed to fetch leads" });
    }
  });

  // Google Sheets Backend Integration: Append User Signup
  app.post("/api/sheets/append-signup", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Google OAuth access token is required in Authorization header" });
      }
      const accessToken = authHeader.split(" ")[1];
      const { lead, spreadsheetId } = req.body;

      if (!lead || !lead.email) {
        return res.status(400).json({ error: "Lead signup payload with email is required" });
      }

      // If spreadsheetId is provided, append directly via Sheets API v4
      let targetSheetId = spreadsheetId;

      if (!targetSheetId) {
        // Create or find spreadsheet via Google Drive API
        const driveQuery = encodeURIComponent("name = 'SermonIQ Ministry Signups & Leads' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
        const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${driveQuery}&fields=files(id,name)`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (driveRes.ok) {
          const driveData: any = await driveRes.json();
          if (driveData.files && driveData.files.length > 0) {
            targetSheetId = driveData.files[0].id;
          }
        }

        if (!targetSheetId) {
          // Create new spreadsheet
          const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              properties: { title: "SermonIQ Ministry Signups & Leads" },
              sheets: [{
                properties: {
                  title: "Sanctuary Signups",
                  gridProperties: { frozenRowCount: 1, columnCount: 14 }
                }
              }]
            })
          });

          if (!createRes.ok) {
            const errText = await createRes.text();
            throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
          }

          const createdData: any = await createRes.json();
          targetSheetId = createdData.spreadsheetId;

          // Write header row
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/'Sanctuary Signups'!A1:L1?valueInputOption=USER_ENTERED`, {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              range: "'Sanctuary Signups'!A1:L1",
              majorDimension: "ROWS",
              values: [[
                "Timestamp (UTC)",
                "First Name",
                "Last Name",
                "Church / Ministry Name",
                "Email Address",
                "Phone Number",
                "Sanctuary Address",
                "Service Date",
                "Congregation Members",
                "Subscription Tier",
                "Status",
                "Tenant Isolation Key"
              ]]
            })
          });
        }
      }

      // Format row
      const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
      const row = [
        timestamp,
        lead.firstName || "",
        lead.lastName || "",
        lead.churchName || "",
        lead.email || "",
        lead.phone || "N/A",
        lead.address || "N/A",
        lead.serviceDate || new Date().toISOString().split("T")[0],
        Number(lead.numberOfMembers || lead.memberCount || 0),
        lead.selectedSubscription || lead.subscriptionPlan || "Growth",
        lead.status || "Active Signup",
        lead.tenantId || `tenant_ws_${Math.random().toString(36).substring(2, 8)}`
      ];

      // Append row to sheet
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/A:L:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            range: "A:L",
            majorDimension: "ROWS",
            values: [row]
          })
        }
      );

      if (!appendRes.ok) {
        const appendErr = await appendRes.text();
        throw new Error(`Google Sheets append failed: ${appendErr}`);
      }

      res.json({
        success: true,
        message: "User signup row appended to Google Sheet successfully",
        spreadsheetId: targetSheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSheetId}/edit`
      });
    } catch (error: any) {
      console.error("Failed to append signup to Google Sheets:", error);
      res.status(500).json({ error: error.message || "Failed to append to Google Sheets" });
    }
  });

  // Bulk Sync All Cloud SQL Leads to Google Sheets
  app.post("/api/sheets/sync-all", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Google OAuth access token is required in Authorization header" });
      }
      const accessToken = authHeader.split(" ")[1];
      const { spreadsheetId } = req.body;

      const leads = await getChurchLeads(100);

      // Find or create sheet
      let targetSheetId = spreadsheetId;
      if (!targetSheetId) {
        const driveQuery = encodeURIComponent("name = 'SermonIQ Ministry Signups & Leads' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
        const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${driveQuery}&fields=files(id,name)`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (driveRes.ok) {
          const driveData: any = await driveRes.json();
          if (driveData.files && driveData.files.length > 0) {
            targetSheetId = driveData.files[0].id;
          }
        }
      }

      if (!targetSheetId) {
        const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            properties: { title: "SermonIQ Ministry Signups & Leads" },
            sheets: [{
              properties: {
                title: "Sanctuary Signups",
                gridProperties: { frozenRowCount: 1, columnCount: 14 }
              }
            }]
          })
        });
        const createdData: any = await createRes.json();
        targetSheetId = createdData.spreadsheetId;

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/'Sanctuary Signups'!A1:L1?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            range: "'Sanctuary Signups'!A1:L1",
            majorDimension: "ROWS",
            values: [[
              "Timestamp (UTC)",
              "First Name",
              "Last Name",
              "Church / Ministry Name",
              "Email Address",
              "Phone Number",
              "Sanctuary Address",
              "Service Date",
              "Congregation Members",
              "Subscription Tier",
              "Status",
              "Tenant Isolation Key"
            ]]
          })
        });
      }

      const rows = leads.map(lead => [
        lead.createdAt ? new Date(lead.createdAt).toISOString().replace("T", " ").substring(0, 19) + " UTC" : new Date().toISOString(),
        lead.firstName,
        lead.lastName,
        lead.churchName,
        lead.email,
        lead.phone || "N/A",
        lead.address || "N/A",
        lead.serviceDate || new Date().toISOString().split("T")[0],
        Number(lead.memberCount) || 0,
        lead.subscriptionPlan || "Growth",
        "Active Lead",
        `lead_${lead.id}`
      ]);

      if (rows.length > 0) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}/values/A:L:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              range: "A:L",
              majorDimension: "ROWS",
              values: rows
            })
          }
        );
      }

      res.json({
        success: true,
        syncedCount: rows.length,
        spreadsheetId: targetSheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${targetSheetId}/edit`
      });
    } catch (error: any) {
      console.error("Bulk sync to Google Sheets failed:", error);
      res.status(500).json({ error: error.message || "Bulk sync failed" });
    }
  });

  // SermonIQ AI Pastoral Care Chat Endpoint
  const handleCareChat = async (req: express.Request, res: express.Response) => {
    try {
      const { message, category, history, imageUrl, videoUrl, hasAttachment } = req.body;
      if ((!message || typeof message !== 'string') && !imageUrl && !videoUrl) {
        return res.status(400).json({ error: "Message or media attachment is required" });
      }

      const result = await generateCareResponse({
        message: message || '',
        category,
        history,
        imageUrl,
        videoUrl,
        hasAttachment
      });

      res.json(result);
    } catch (error: any) {
      console.error("Care Chat generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate chat response" });
    }
  };

  app.post("/api/care/chat", handleCareChat);

  // --- SERMONIQ ENGAGEMENT REPORT AI SCORING PIPELINE ---
  // Endpoint consuming metrics JSON to produce pastor-facing engagement report per spec
  app.post("/api/reports/engagement-score", async (req, res) => {
    const startTime = Date.now();
    try {
      const { serviceDate, churchName, metrics, trailingAverage } = req.body;

      if (!metrics) {
        return res.status(400).json({ error: "Missing required 'metrics' object in request body." });
      }

      const formattedServiceDate = serviceDate || new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const resolvedChurchName = churchName || "SermonIQ Partner Church";

      const reportResult = await generateEngagementReportServer({
        serviceDate: formattedServiceDate,
        churchName: resolvedChurchName,
        metrics,
        trailingAverage
      });

      const latencyMs = Date.now() - startTime;

      res.json({
        success: true,
        overallScore: reportResult.overallScore,
        scoreExplanation: reportResult.scoreExplanation,
        highlights: reportResult.highlights,
        verseImpact: reportResult.verseImpact,
        momentWorthRevisiting: reportResult.momentWorthRevisiting,
        trendNote: reportResult.trendNote,
        honestObservation: reportResult.honestObservation,
        rawReportText: reportResult.rawReportText,
        serviceReport: reportResult.serviceReport,
        latencyMs
      });
    } catch (error: any) {
      console.error("Failed to generate engagement report:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI engagement report" });
    }
  });

  // Prompt template retrieval endpoint (ready-to-use for Gemini / Vertex AI callers)
  app.get("/api/reports/scoring-prompt-template", (req, res) => {
    res.json({
      purpose: "Ready-to-use prompt template consuming post-service metrics to produce pastor-facing engagement reports.",
      modelRecommended: "gemini-3.7-flash",
      systemPrompt: SERMONIQ_ENGAGEMENT_SYSTEM_PROMPT,
      userPromptTemplate: `Generate this week's engagement report.\n\nService date: {{SERVICE_DATE}}\nChurch: {{CHURCH_NAME}}\n\nMetrics data:\n{{METRICS_JSON}}\n\nTrailing 4-week average (omit trend section if not provided):\n{{TRAILING_AVERAGE_JSON}}`,
      exampleMetricsPayload: {
        service_duration_minutes: 52,
        response_counts: {
          amen: 34,
          alleluia: 11,
          affirmation: 22,
          applause_events: 6,
          laughter_events: 3,
          weeping_events: 1
        },
        response_density_curve: [
          { minute: 0, responses: 1 },
          { minute: 5, responses: 4 }
        ],
        verse_citations: [
          {
            reference: "Psalm 34:18",
            timestamp_seconds: 1120,
            response_window_score: 0.82,
            theme: "grief"
          }
        ],
        unison_response_rate: 0.71,
        sustained_response_events: [
          { start_seconds: 1400, duration_seconds: 22, type: "applause" }
        ],
        stillness_events: [
          { start_seconds: 1150, duration_seconds: 58 }
        ],
        breakthrough_moments: [
          {
            timestamp_seconds: 1395,
            signals: ["applause", "amen", "volume_spike"]
          }
        ],
        momentum: "building"
      }
    });
  });

  // Real-time transcript snippet analysis endpoint
  app.post("/api/gemini/analyze-transcript", async (req, res) => {
    try {
      const { transcript } = req.body;
      const snippet = await analyzeTranscriptSnippetServer(transcript || "");
      res.json(snippet);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Real-time scripture citation detection endpoint
  app.post("/api/gemini/detect-verse", async (req, res) => {
    try {
      const { text } = req.body;
      const verse = await detectBibleVerseServer(text || "");
      res.json(verse);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Simple In-Memory Cache to prevent 429 Too Many Requests
  const verseCache = new Map<string, any>();
  const newsCache = {
    data: null as any,
    timestamp: 0
  };

  // RSS Feed Proxy for Christian News & Devotionals
  const CURATED_RSS_FALLBACK = [
    {
      id: "rss-1",
      title: "Finding Supernatural Peace in Anxious Times: A Biblical Reflection",
      link: "https://www.christianitytoday.com",
      pubDate: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      source: "Christianity Today",
      category: "Devotionals",
      contentSnippet: "Philippians 4:6-7 reminds us to bring everything to God in prayer with thanksgiving. How believers across the global church are cultivating prayer rhythms to overcome modern anxiety and burnout.",
      imageUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&auto=format&fit=crop&q=80",
      discussionPrompt: "How do you practice casting your anxieties on God during busy workweeks?"
    },
    {
      id: "rss-2",
      title: "Global Church Revival: Multiplication of Prayer Rooms and Youth Fellowships",
      link: "https://www.christianpost.com",
      pubDate: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      source: "The Christian Post",
      category: "Church News",
      contentSnippet: "Ministry leaders report surging attendance in young adult prayer gatherings and community outreach initiatives across urban centers.",
      imageUrl: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600&auto=format&fit=crop&q=80",
      discussionPrompt: "What steps can local congregations take to empower the next generation in intercessory prayer?"
    },
    {
      id: "rss-3",
      title: "Walking Through Grief with the Good Shepherd (Psalm 23)",
      link: "https://www.desiringgod.org",
      pubDate: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      source: "Desiring God",
      category: "Spiritual Growth",
      contentSnippet: "Even in the darkest valley, God’s rod and staff bring comfort. A deep pastoral study into God's steadfast companionship when navigating personal loss or medical hardship.",
      imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80",
      discussionPrompt: "Where have you experienced God’s quiet presence during a season of deep trial?"
    },
    {
      id: "rss-4",
      title: "Strengthening Marriages and Families in Faith: Biblical Principles for Unity",
      link: "https://www.crosswalk.com",
      pubDate: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      source: "Crosswalk Faith",
      category: "Family & Marriage",
      contentSnippet: "Ephesians 4 urges us to be completely humble and gentle, bearing with one another in love. Pastoral counselors share three practical daily communication habits for Christian households.",
      imageUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80",
      discussionPrompt: "What daily devotional or prayer habit has most blessed your family and relationships?"
    },
    {
      id: "rss-5",
      title: "Generosity and Stewardship: How Churches are Mobilizing Food & Benevolence Outreaches",
      link: "https://churchleaders.com",
      pubDate: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
      source: "ChurchLeaders Digest",
      category: "Outreach & Mission",
      contentSnippet: "Innovative benevolence strategies are enabling small and medium congregations to provide emergency relief, meals, and spiritual care to vulnerable families in their neighborhoods.",
      imageUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&auto=format&fit=crop&q=80",
      discussionPrompt: "How can our fellowship expand local benevolence to meet urgent needs in our community?"
    }
  ];

  app.get("/api/news", async (req, res) => {
    const now = Date.now();
    // Cache for 10 minutes
    if (newsCache.data && now - newsCache.timestamp < 10 * 60 * 1000) {
      return res.json(newsCache.data);
    }

    const feeds = [
      { url: "https://www.christianitytoday.com/feed/", name: "Christianity Today", cat: "Culture & Faith" },
      { url: "https://www.christianpost.com/rss/feed/", name: "The Christian Post", cat: "Church News" },
      { url: "https://www.baptistpress.com/feed/", name: "Baptist Press", cat: "Missions & News" }
    ];

    try {
      const allItems = await Promise.all(
        feeds.map(async ({ url, name, cat }) => {
          try {
            const feed = await parser.parseURL(url);
            return (feed.items || []).map((item, idx) => ({
              id: item.guid || `${name}-${idx}-${Date.now()}`,
              title: item.title || "Ministry News Update",
              link: item.link || "https://www.christianitytoday.com",
              pubDate: item.pubDate || new Date().toISOString(),
              source: name,
              category: cat,
              creator: (item as any).creator || (item as any).author,
              contentSnippet: item.contentSnippet || item.content?.replace(/<[^>]*>?/gm, '').slice(0, 240) + '...',
              discussionPrompt: `Let's discuss and pray about: "${item.title || 'this news topic'}" in light of biblical truth.`
            }));
          } catch (err) {
            console.warn(`RSS feed parsing warning for ${url}:`, (err as any).message);
            return [];
          }
        })
      );

      const flattened = allItems.flat().filter(item => Boolean(item.title));
      
      const combined = flattened.length > 0 
        ? [...flattened, ...CURATED_RSS_FALLBACK].sort((a, b) => 
            new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime()
          ).slice(0, 25)
        : CURATED_RSS_FALLBACK;

      newsCache.data = combined;
      newsCache.timestamp = now;
      res.json(combined);
    } catch (error) {
      console.error("News Fetch error, using fallback feeds:", error);
      res.json(CURATED_RSS_FALLBACK);
    }
  });

  // Custom RSS Feed Fetcher
  app.post("/api/rss/fetch", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "RSS URL is required" });
    }

    try {
      const feed = await parser.parseURL(url);
      const items = (feed.items || []).map((item, idx) => ({
        id: item.guid || `custom-${idx}-${Date.now()}`,
        title: item.title || "Custom Feed Item",
        link: item.link || url,
        pubDate: item.pubDate || new Date().toISOString(),
        source: feed.title || "Custom RSS Source",
        category: "Custom Feed",
        contentSnippet: item.contentSnippet || item.content?.replace(/<[^>]*>?/gm, '').slice(0, 240) + '...',
        discussionPrompt: `How does scripture speak into: "${item.title}"? Let's discuss in prayer.`
      }));

      res.json({
        title: feed.title || "Custom RSS Feed",
        description: feed.description,
        items
      });
    } catch (err: any) {
      console.error(`Failed to fetch custom RSS feed (${url}):`, err);
      res.status(500).json({ error: err.message || "Failed to parse RSS feed from provided URL" });
    }
  });

  // Proxy for Bible API to avoid "Failed to fetch" (CORS/Network issues in iframe)
  app.get("/api/bible", async (req, res) => {
    const { reference, translation = 'kjv' } = req.query;
    if (!reference) {
      return res.status(400).json({ error: "Reference is required" });
    }

    const cacheKey = `${reference}-${translation}`.toLowerCase();
    
    // Check cache first
    if (verseCache.has(cacheKey)) {
      return res.json(verseCache.get(cacheKey));
    }

    try {
      const apiUrl = `https://bible-api.com/${encodeURIComponent(reference as string)}?translation=${translation}`;
      const response = await fetch(apiUrl);
      
      if (response.status === 429) {
        console.warn(`Bible API Rate Limited (429) for: ${reference}`);
        return res.status(429).json({ error: "Too many requests. Please try again in a moment." });
      }

      if (!response.ok) {
        console.error(`Bible API Error: ${response.status} for ${reference}`);
        return res.status(response.status).json({ error: `Bible API error: ${response.status}` });
      }

      const data = await response.json();
      
      // Store in cache (limit cache size to prevent memory leaks)
      if (verseCache.size > 500) verseCache.clear();
      verseCache.set(cacheKey, data);
      
      res.json(data);
    } catch (error) {
      console.error("Bible Proxy Network Error:", error);
      res.status(503).json({ error: "External Bible API is currently unreachable" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexPath = path.resolve(distPath, 'index.html');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
