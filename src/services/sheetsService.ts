/**
 * Google Sheets Service for SermonIQ Ministry Signups & User Registrations
 * Utilizes Google Sheets API v4 and Google Drive API v3
 */

export interface SignupRowData {
  timestamp?: string;
  firstName: string;
  lastName: string;
  churchName: string;
  email: string;
  phone?: string;
  address?: string;
  serviceDate?: string;
  numberOfMembers?: number | string;
  memberCount?: number | string;
  selectedSubscription?: string;
  subscriptionPlan?: string;
  status?: string;
  tenantId?: string;
}

export const SPREADSHEET_TITLE = 'SermonIQ Ministry Signups & Leads';
export const SHEET_NAME = 'Sanctuary Signups';

export const SHEET_HEADERS = [
  'Timestamp (UTC)',
  'First Name',
  'Last Name',
  'Church / Ministry Name',
  'Email Address',
  'Phone Number',
  'Sanctuary Address',
  'Service Date',
  'Congregation Members',
  'Subscription Tier',
  'Status',
  'Tenant Isolation Key'
];

let cachedSpreadsheetId: string | null = null;

export function getCachedSpreadsheetId(): string | null {
  if (cachedSpreadsheetId) return cachedSpreadsheetId;
  return localStorage.getItem('sermoniq_connected_sheet_id');
}

export function setCachedSpreadsheetId(id: string): void {
  cachedSpreadsheetId = id;
  localStorage.setItem('sermoniq_connected_sheet_id', id);
}

/**
 * Searches user's Google Drive for an existing SermonIQ signup sheet or creates a new one
 */
export async function findOrCreateSignupsSpreadsheet(accessToken: string): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  isNew: boolean;
}> {
  const existingId = getCachedSpreadsheetId();
  
  if (existingId) {
    try {
      // Verify spreadsheet exists and is accessible
      const verifyRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${existingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (verifyRes.ok) {
        return {
          spreadsheetId: existingId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${existingId}/edit`,
          isNew: false
        };
      }
    } catch {
      // If verification fails, fall through to search/create
    }
  }

  // 1. Search Google Drive for existing sheet
  try {
    const query = encodeURIComponent(`name = '${SPREADSHEET_TITLE}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (driveRes.ok) {
      const driveData = await driveRes.json();
      if (driveData.files && driveData.files.length > 0) {
        const found = driveData.files[0];
        setCachedSpreadsheetId(found.id);
        return {
          spreadsheetId: found.id,
          spreadsheetUrl: found.webViewLink || `https://docs.google.com/spreadsheets/d/${found.id}/edit`,
          isNew: false
        };
      }
    }
  } catch (err) {
    console.warn('Drive search fallback to creation:', err);
  }

  // 2. Create new Google Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: SPREADSHEET_TITLE
      },
      sheets: [
        {
          properties: {
            title: SHEET_NAME,
            gridProperties: {
              frozenRowCount: 1,
              columnCount: SHEET_HEADERS.length + 2
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errorBody}`);
  }

  const createdSheet = await createRes.json();
  const newSheetId = createdSheet.spreadsheetId;
  setCachedSpreadsheetId(newSheetId);

  // 3. Populate Header Row with formatting
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}/values/'${SHEET_NAME}'!A1:L1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: `'${SHEET_NAME}'!A1:L1`,
      majorDimension: 'ROWS',
      values: [SHEET_HEADERS]
    })
  });

  return {
    spreadsheetId: newSheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${newSheetId}/edit`,
    isNew: true
  };
}

/**
 * Appends a signup lead directly to the Google Sheet
 */
export async function appendSignupToGoogleSheet(
  lead: SignupRowData,
  accessToken: string,
  customSpreadsheetId?: string
): Promise<{ success: boolean; spreadsheetId: string; spreadsheetUrl: string }> {
  let sheetId = customSpreadsheetId || getCachedSpreadsheetId();

  if (!sheetId) {
    const created = await findOrCreateSignupsSpreadsheet(accessToken);
    sheetId = created.spreadsheetId;
  }

  const timestamp = lead.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const members = lead.numberOfMembers ?? lead.memberCount ?? 0;
  const plan = lead.selectedSubscription ?? lead.subscriptionPlan ?? 'Growth';
  const status = lead.status || 'Active Signup';
  const tenantKey = lead.tenantId || `tenant_ws_${Math.random().toString(36).substring(2, 8)}`;

  const rowValues = [
    timestamp,
    lead.firstName || '',
    lead.lastName || '',
    lead.churchName || '',
    lead.email || '',
    lead.phone || 'N/A',
    lead.address || 'N/A',
    lead.serviceDate || new Date().toISOString().split('T')[0],
    Number(members),
    plan,
    status,
    tenantKey
  ];

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${SHEET_NAME}'!A:L:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `'${SHEET_NAME}'!A:L`,
        majorDimension: 'ROWS',
        values: [rowValues]
      })
    }
  );

  if (!appendRes.ok) {
    // If the sheet name was different or missing, try generic A:L range append
    const fallbackRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:L:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'A:L',
          majorDimension: 'ROWS',
          values: [rowValues]
        })
      }
    );

    if (!fallbackRes.ok) {
      const errText = await fallbackRes.text();
      throw new Error(`Failed to append signup row to Google Sheet: ${errText}`);
    }
  }

  return {
    success: true,
    spreadsheetId: sheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
  };
}

/**
 * Fetches existing rows from the Google Sheet for preview and telemetry
 */
export async function fetchGoogleSheetSignups(
  accessToken: string,
  customSpreadsheetId?: string
): Promise<{ headers: string[]; rows: string[][]; spreadsheetUrl: string; spreadsheetId: string }> {
  const { spreadsheetId, spreadsheetUrl } = await findOrCreateSignupsSpreadsheet(accessToken);

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z100`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    throw new Error('Failed to read Google Sheet rows');
  }

  const data = await res.json();
  const allValues = data.values || [];
  const headers = allValues.length > 0 ? allValues[0] : SHEET_HEADERS;
  const rows = allValues.length > 1 ? allValues.slice(1) : [];

  return {
    headers,
    rows,
    spreadsheetId,
    spreadsheetUrl
  };
}

/**
 * Bulk syncs all Cloud SQL leads to the connected Google Spreadsheet
 */
export async function bulkSyncLeadsToGoogleSheet(
  leads: SignupRowData[],
  accessToken: string
): Promise<{ syncedCount: number; spreadsheetId: string; spreadsheetUrl: string }> {
  const { spreadsheetId, spreadsheetUrl } = await findOrCreateSignupsSpreadsheet(accessToken);

  if (!leads || leads.length === 0) {
    return { syncedCount: 0, spreadsheetId, spreadsheetUrl };
  }

  const rows = leads.map(lead => {
    const timestamp = lead.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const members = lead.numberOfMembers ?? lead.memberCount ?? 0;
    const plan = lead.selectedSubscription ?? lead.subscriptionPlan ?? 'Growth';
    const status = lead.status || 'Active Signup';
    const tenantKey = lead.tenantId || 'tenant_ws_synced';

    return [
      timestamp,
      lead.firstName || '',
      lead.lastName || '',
      lead.churchName || '',
      lead.email || '',
      lead.phone || 'N/A',
      lead.address || 'N/A',
      lead.serviceDate || new Date().toISOString().split('T')[0],
      Number(members),
      plan,
      status,
      tenantKey
    ];
  });

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${SHEET_NAME}'!A:L:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `'${SHEET_NAME}'!A:L`,
        majorDimension: 'ROWS',
        values: rows
      })
    }
  );

  if (!appendRes.ok) {
    // Try fallback without explicit sheet name
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:L:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'A:L',
          majorDimension: 'ROWS',
          values: rows
        })
      }
    );
  }

  return {
    syncedCount: rows.length,
    spreadsheetId,
    spreadsheetUrl
  };
}
