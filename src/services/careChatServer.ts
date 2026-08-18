import { GoogleGenAI } from '@google/genai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CareChatRequest {
  message: string;
  category?: string;
  history?: Array<{ sender: 'user' | 'pastor'; text: string }>;
  imageUrl?: string;
  videoUrl?: string;
  hasAttachment?: boolean;
}

const PASTORAL_SYSTEM_PROMPT = `You are a compassionate, spiritually grounding, and theologically sound Christian pastoral care companion in SermonIQ.
Your role is to offer authentic biblical encouragement, gentle prayer, compassionate listening, and faith-filled hope.
Rules:
1. Speak with genuine warmth, grace, humility, and biblical wisdom.
2. Provide at least one relevant and uplifting scripture reference (book, chapter, verse) when comforting, praying, or answering questions.
3. Keep responses conversational, caring, concise (2-4 thoughtful sentences), and prayerful.
4. If a picture or video was shared, acknowledge the blessing or circumstance with warmth and include it in your pastoral prayer.
5. Never be judgmental, harsh, or clinical. If the person expresses deep crisis, offer gentle comfort, reassure them of God's unconditional love, and remind them that they are not alone.`;

const BIBLICAL_COMFORTS = [
  `"The Lord is near to the brokenhearted and saves the crushed in spirit." (Psalm 34:18). We are lifting you up in prayer today. May God's peace that surpasses all understanding guard your heart and mind in Christ Jesus.`,
  `"Cast all your anxiety on Him, because He cares for you." (1 Peter 5:7). Know that your burden is seen, known, and loved by our Heavenly Father. We stand with you in faith and pray for breakthrough in your life.`,
  `"Do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand." (Isaiah 41:10). Praying for supernatural comfort and renewed energy over you right now.`,
  `"Come to me, all you who are weary and burdened, and I will give you rest." (Matthew 11:28). You are never walking through this season alone. We believe with you for God's divine provision, healing, and peace.`,
  `"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future." (Jeremiah 29:11). May the Holy Spirit fill your spirit with renewed hope and assurance today.`
];

export async function generateCareResponse(req: CareChatRequest) {
  const userMessage = req.message || '';
  const category = req.category || 'general';
  const apiKey = process.env.GEMINI_API_KEY;

  let attachmentContext = '';
  if (req.imageUrl) {
    attachmentContext += ' [User attached a photo/image with this prayer request]';
  }
  if (req.videoUrl) {
    attachmentContext += ` [User shared a video link or clip: ${req.videoUrl}]`;
  }

  // 1. If Gemini API Key is present, use Google GenAI
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      let conversationHistory = '';
      if (req.history && req.history.length > 0) {
        conversationHistory = req.history.slice(-4).map(h => `${h.sender === 'user' ? 'Member' : 'Pastor'}: ${h.text}`).join('\n');
      }

      const prompt = `${PASTORAL_SYSTEM_PROMPT}

Pastoral Category: ${category}
${conversationHistory ? `Recent Conversation:\n${conversationHistory}\n` : ''}
Member: ${userMessage}${attachmentContext}
Pastoral Response:`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response.text && response.text.trim().length > 0) {
        return {
          response: response.text.trim(),
          provider: 'sermoniq-gemini-pastoral-ai',
          model: 'gemini-2.5-flash'
        };
      }
    } catch (err) {
      console.warn('[SermonIQ Care Chat] Gemini API error, using biblical comfort fallback:', err);
    }
  }

  // 2. Fallback to curated scripture-grounded pastoral response
  const selectedComfort = BIBLICAL_COMFORTS[Math.floor(Math.random() * BIBLICAL_COMFORTS.length)];
  return {
    response: selectedComfort,
    provider: 'sermoniq-pastoral-core',
    model: 'biblical-pastoral-engine'
  };
}
