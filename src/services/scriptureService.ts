import { BibleVerse } from '../types';
import { fallbackVerseFetch } from './geminiService';

export const VERSE_REGEX = /\b(genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalm|psalms|proverbs|ecclesiastes|song\s+of\s+solomon|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation|rev|gen|exo|lev|num|deut|josh|judg|psa|prov|ecc|isa|jer|lam|eze|dan|hos|zeph|hag|zech|mal|mat|rom|cor|gal|eph|phil|col|thess|tim|heb|jas|jn|mt|mk|lk)\s*\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?/gi;

const BOOK_MAP: Record<string, string> = {
  gen: 'Genesis',
  exo: 'Exodus',
  lev: 'Leviticus',
  num: 'Numbers',
  deut: 'Deuteronomy',
  josh: 'Joshua',
  judg: 'Judges',
  psa: 'Psalms',
  psalms: 'Psalms',
  prov: 'Proverbs',
  ecc: 'Ecclesiastes',
  isa: 'Isaiah',
  jer: 'Jeremiah',
  lam: 'Lamentations',
  eze: 'Ezekiel',
  dan: 'Daniel',
  hos: 'Hosea',
  zeph: 'Zephaniah',
  hag: 'Haggai',
  zech: 'Zechariah',
  mal: 'Malachi',
  mat: 'Matthew',
  mt: 'Matthew',
  mk: 'Mark',
  lk: 'Luke',
  jn: 'John',
  rom: 'Romans',
  cor: 'Corinthians',
  gal: 'Galatians',
  eph: 'Ephesians',
  phil: 'Philippians',
  col: 'Colossians',
  thess: 'Thessalonians',
  tim: 'Timothy',
  heb: 'Hebrews',
  jas: 'James',
  rev: 'Revelation',
  samuel: '1 Samuel', // Simplification
  kings: '1 Kings',
  chronicles: '1 Chronicles'
};

export function normaliseReference(raw: string): string {
  const parts = raw.split(/\s+/);
  if (parts.length < 2) return raw;
  
  const bookKey = parts[0].toLowerCase();
  const rest = parts.slice(1).join(' ');
  
  if (BOOK_MAP[bookKey]) {
    return `${BOOK_MAP[bookKey]} ${rest}`;
  }
  return raw;
}

export async function fetchVerse(query: string, source: BibleVerse['source'] = '🔍 Manual'): Promise<BibleVerse | null> {
  const normalised = normaliseReference(query);
  
  // Try 3 formats for bible-api.com
  const formats = [
    `https://bible-api.com/${encodeURIComponent(normalised)}?translation=kjv`,
    `https://bible-api.com/${normalised.replace(/ /g, '+')}?translation=kjv`,
    `https://bible-api.com/${normalised.toLowerCase().replace(/ /g, '+')}?translation=kjv`,
  ];

  for (const url of formats) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.verses && data.verses.length > 0) {
          return {
            reference: data.reference,
            text: data.text.trim(),
            context: 'Biblical scripture citation.',
            timestamp: Date.now(),
            source,
            translation: 'KJV'
          };
        }
      }
    } catch (e) {
      console.warn(`Fetch error for ${url}:`, e);
    }
  }

  // Fallback to AI
  const aiData = await fallbackVerseFetch(query);
  if (aiData) {
    return {
      reference: aiData.reference || query,
      text: aiData.text || '',
      context: aiData.context || 'AI-retrieved biblical context.',
      timestamp: Date.now(),
      source: '🤖 AI',
      translation: 'KJV'
    };
  }

  return null;
}

const fetchedRefs = new Set<string>();

export async function scanForVerses(text: string, onDetected: (v: BibleVerse) => void) {
  const matches = text.match(VERSE_REGEX);
  if (!matches) return;

  for (const match of matches) {
    const normalised = normaliseReference(match).toLowerCase();
    if (!fetchedRefs.has(normalised)) {
      fetchedRefs.add(normalised);
      const verse = await fetchVerse(match, '🎤 Detected');
      if (verse) {
        onDetected(verse);
      }
    }
  }
}

export function clearFetchedRefs() {
  fetchedRefs.clear();
}
