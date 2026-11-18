import type { ClaudeModel } from '../types';
import { itemsFromClaudeJSON, type ParsedMeal } from './nutrition';

const API_URL = 'https://api.anthropic.com/v1';
const API_VERSION = '2026-10-21';

export const MODELS: { id: ClaudeModel; label: string; note: string }[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Most accurate' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Fast and accurate' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Fastest, lowest cost' },
];

const FOOD_SCHEMA = {
  type: 'object',
  properties: {
    meal_name: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          portion: { type: 'string' },
          grams: { type: 'number' },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          group: { type: 'string', enum: ['veg', 'fruit', 'protein', 'grain', 'dairy', 'fats', 'other'] },
        },
        required: ['name', 'portion', 'grams', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'group'],
        additionalProperties: false,
      },
    },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    notes: { type: 'string' },
  },
  required: ['meal_name', 'items', 'confidence', 'notes'],
  additionalProperties: false,
};

const SYSTEM = `You help a person keep a balanced, supportive food journal inside a fitness app.
From the photo, identify each distinct food or drink, estimate a realistic portion, and estimate its energy and macronutrients.
Use typical home or restaurant portions when unsure and note uncertainty in "confidence".
Keep "notes" to one short, neutral, encouraging sentence. Never judge the meal, never suggest eating less, never mention weight loss.
If the image contains no food, return an empty items array and explain briefly in notes.`;

export class ClaudeError extends Error {}

function headers(apiKey: string, beta?: string): HeadersInit {
  const h: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': apiKey.trim(),
    'anthropic-version': API_VERSION,
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (beta) h['anthropic-beta'] = beta;
  return h;
}

async function friendlyError(res: Response): Promise<ClaudeError> {
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message ?? '';
  } catch {
    /* ignore */
  }
  switch (res.status) {
    case 401:
      return new ClaudeError('Your API key was not accepted. Check it in Settings.');
    case 403:
      return new ClaudeError(`This API key doesn't have access to that model. ${detail}`.trim());
    case 429:
      return new ClaudeError('Rate limit reached or out of credits. Wait a moment, or check your balance at platform.claude.com.');
    case 529:
    case 503:
      return new ClaudeError('Claude is busy right now. Try again in a minute.');
    default:
      return new ClaudeError(detail || `Request failed (${res.status}).`);
  }
}

async function post(path: string, apiKey: string, body: unknown, beta?: string, timeoutMs = 120000) {
  if (!navigator.onLine) throw new ClaudeError("You're offline. Photo analysis needs an internet connection.");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: headers(apiKey, beta), body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) throw await friendlyError(res);
    return await res.json();
  } catch (e) {
    if (e instanceof ClaudeError) throw e;
    if ((e as Error)?.name === 'AbortError') throw new ClaudeError('Claude took too long to respond. Try again.');
    throw new ClaudeError('Could not reach Claude. Check your connection and try again.');
  } finally {
    clearTimeout(t);
  }
}

export async function analyzeMealPhoto(opts: { apiKey: string; model: ClaudeModel; base64: string; hint?: string }): Promise<ParsedMeal> {
  const { apiKey, model, base64, hint } = opts;
  if (!apiKey) throw new ClaudeError('Add your Claude API key in Settings to use photo analysis.');
  // Opus 5.5 and Sonnet 5.5 can hand a declined request to a fallback model automatically.
  const withFallback = model === 'claude-opus-5-5' || model === 'claude-sonnet-5-5';
  const body: Record<string, unknown> = {
    model,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: FOOD_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: hint?.trim() ? `Estimate this meal. Extra details from me: ${hint.trim()}` : 'Estimate this meal.' },
        ],
      },
    ],
  };
  if (withFallback) body.fallbacks = 'default';
  const res = await post('/messages', apiKey, body, withFallback ? 'server-side-fallback-2026-07-01' : undefined);
  if (res.stop_reason === 'refusal') throw new ClaudeError("Claude couldn't analyse this photo. Try another photo or add the meal manually.");
  if (res.stop_reason === 'max_tokens') throw new ClaudeError('The analysis was cut short. Please try again.');
  const text = (res.content as { type: string; text?: string }[] | undefined)?.find((b) => b.type === 'text')?.text;
  if (!text) throw new ClaudeError('Claude returned an empty answer. Please try again.');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ClaudeError('Claude returned an unexpected answer. Please try again.');
  }
  const obj = data as { items?: unknown[]; notes?: string };
  if (!obj.items?.length) throw new ClaudeError(obj.notes || 'No food was found in this photo.');
  return itemsFromClaudeJSON(data);
}

/** Checks the key without spending tokens by listing models. */
export async function testApiKey(apiKey: string): Promise<void> {
  if (!navigator.onLine) throw new ClaudeError("You're offline.");
  let res: Response;
  try {
    res = await fetch(`${API_URL}/models?limit=1`, { headers: headers(apiKey) });
  } catch {
    throw new ClaudeError('Could not reach Claude. Check your connection.');
  }
  if (!res.ok) throw await friendlyError(res);
}
