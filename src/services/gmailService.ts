export interface GmailMessageHeader {
  name: string;
  value: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  labelIds?: string[];
  isUnread?: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyText?: string;
  bodyHtml?: string;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  isHtml?: boolean;
}

// Encode email in base64url format for Gmail API
function encodeRFC822(to: string, subject: string, body: string, cc?: string, isHtml = false): string {
  const boundary = 'boundary_' + Date.now();
  const headers = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '',
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    isHtml
      ? `Content-Type: text/html; charset=UTF-8`
      : `Content-Type: text/plain; charset=UTF-8`,
    'Content-Transfer-Encoding: 7bit',
    '',
    body
  ].filter(Boolean).join('\r\n');

  // Convert string to UTF-8 Base64URL
  const utf8Bytes = new TextEncoder().encode(headers);
  let binary = '';
  utf8Bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function fetchUserProfile(token: string): Promise<GmailProfile> {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Gmail profile: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function fetchMessages(
  token: string,
  query = '',
  maxResults = 15,
  labelIds: string[] = []
): Promise<{ messages: GmailMessageSummary[]; nextPageToken?: string; resultSizeEstimate: number }> {
  const params = new URLSearchParams({
    maxResults: maxResults.toString()
  });

  if (query) {
    params.set('q', query);
  }
  if (labelIds.length > 0) {
    labelIds.forEach(id => params.append('labelIds', id));
  }

  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list messages: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (!data.messages || data.messages.length === 0) {
    return { messages: [], resultSizeEstimate: 0 };
  }

  // Fetch batch details for each message to get headers (Subject, From, Date)
  const summaries = await Promise.all(
    data.messages.map(async (msg: { id: string; threadId: string }) => {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!msgRes.ok) return { id: msg.id, threadId: msg.threadId, snippet: '', internalDate: '' };
        const detail = await msgRes.json();
        
        const headers: Record<string, string> = {};
        (detail.payload?.headers || []).forEach((h: { name: string; value: string }) => {
          headers[h.name.toLowerCase()] = h.value;
        });

        return {
          id: detail.id,
          threadId: detail.threadId,
          snippet: detail.snippet || '',
          internalDate: detail.internalDate || '',
          from: headers['from'] || 'Unknown Sender',
          to: headers['to'] || '',
          subject: headers['subject'] || '(No Subject)',
          date: headers['date'] || '',
          labelIds: detail.labelIds || [],
          isUnread: (detail.labelIds || []).includes('UNREAD')
        } as GmailMessageSummary;
      } catch {
        return { id: msg.id, threadId: msg.threadId, snippet: '', internalDate: '' };
      }
    })
  );

  return {
    messages: summaries,
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate || summaries.length
  };
}

export async function fetchMessageDetail(token: string, messageId: string): Promise<GmailMessageDetail> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch message detail: ${response.status}`);
  }

  const data = await response.json();
  const headers: Record<string, string> = {};
  (data.payload?.headers || []).forEach((h: { name: string; value: string }) => {
    headers[h.name.toLowerCase()] = h.value;
  });

  // Extract body content
  let bodyText = '';
  let bodyHtml = '';

  const extractBody = (part: any) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText += decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml += decodeBase64Url(part.body.data);
    }

    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractBody);
    }
  };

  if (data.payload) {
    if (data.payload.body?.data) {
      if (data.payload.mimeType === 'text/html') {
        bodyHtml = decodeBase64Url(data.payload.body.data);
      } else {
        bodyText = decodeBase64Url(data.payload.body.data);
      }
    }
    if (data.payload.parts) {
      data.payload.parts.forEach(extractBody);
    }
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    internalDate: data.internalDate || '',
    from: headers['from'] || 'Unknown Sender',
    to: headers['to'] || '',
    subject: headers['subject'] || '(No Subject)',
    date: headers['date'] || '',
    labelIds: data.labelIds || [],
    isUnread: (data.labelIds || []).includes('UNREAD'),
    bodyText: bodyText || data.snippet,
    bodyHtml
  };
}

export async function sendGmailMessage(token: string, payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  const raw = encodeRFC822(payload.to, payload.subject, payload.body, payload.cc, payload.isHtml);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function createGmailDraft(token: string, payload: SendEmailPayload): Promise<{ id: string }> {
  const raw = encodeRFC822(payload.to, payload.subject, payload.body, payload.cc, payload.isHtml);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: { raw } })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create draft: ${response.status} ${errorText}`);
  }

  return response.json();
}

export async function deleteGmailMessage(token: string, messageId: string): Promise<void> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to move message to trash: ${response.status} ${errorText}`);
  }
}

function decodeBase64Url(base64Url: string): string {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (err) {
    console.error('Base64 decode error', err);
    return '';
  }
}
