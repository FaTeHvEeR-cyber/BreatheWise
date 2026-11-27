import type { ClarifyingQuestion, ClarifyingQuestionsResponse } from '../types';

export interface SseEvent {
  event: string;
  data: string;
}

export function parseSseChunk(
  carry: string,
  chunk: string,
): { events: SseEvent[]; carry: string } {
  const normalized = (carry + chunk).replace(/\r\n/g, '\n');
  const blocks = normalized.split('\n\n');
  const nextCarry = blocks.pop() ?? '';
  const events: SseEvent[] = [];

  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length > 0) {
      events.push({ event, data: dataLines.join('\n') });
    }
  }

  return { events, carry: nextCarry };
}

function decodePartialJsonString(src: string, startAfterOpenQuote: number): string {
  let out = '';
  let i = startAfterOpenQuote;

  while (i < src.length) {
    const ch = src[i];
    if (ch === '"') break;
    if (ch === '\\') {
      if (i + 1 >= src.length) break;
      const esc = src[i + 1];
      if (esc === 'u') {
        if (i + 5 >= src.length) break;
        const hex = src.slice(i + 2, i + 6);
        const code = Number.parseInt(hex, 16);
        if (!Number.isNaN(code)) out += String.fromCharCode(code);
        i += 6;
        continue;
      }
      const map: Record<string, string> = {
        '"': '"',
        '\\': '\\',
        '/': '/',
        b: '\b',
        f: '\f',
        n: '\n',
        r: '\r',
        t: '\t',
      };
      out += map[esc] ?? esc;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }

  return out;
}

function findKeyValueStart(src: string, key: string): number {
  const needle = `"${key}"`;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      if (src.startsWith(needle, i)) {
        let j = i + needle.length;
        while (j < src.length && /\s/.test(src[j])) j += 1;
        if (src[j] === ':') {
          j += 1;
          while (j < src.length && /\s/.test(src[j])) j += 1;
          return j;
        }
      }
      inString = true;
    }
  }
  return -1;
}

function normalizeQuestion(raw: unknown, idx: number): ClarifyingQuestion | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const question = typeof rec.question === 'string' ? rec.question.trim() : '';
  if (!question) return null;
  const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `q${idx + 1}`;
  const reason = typeof rec.reason === 'string' ? rec.reason.trim() : '';
  const quickOptions = Array.isArray(rec.quickOptions)
    ? rec.quickOptions.filter((opt): opt is string => typeof opt === 'string' && opt.trim().length > 0)
    : [];
  if (quickOptions.length === 0) return null;
  return { id, question, reason, quickOptions };
}

function extractCompletedQuestions(src: string): ClarifyingQuestion[] {
  const valStart = findKeyValueStart(src, 'questions');
  if (valStart === -1 || src[valStart] !== '[') return [];

  const questions: ClarifyingQuestion[] = [];
  let inString = false;
  let escaped = false;
  let objDepth = 0;
  let objStart = -1;

  for (let i = valStart + 1; i < src.length; i += 1) {
    const ch = src[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (objDepth === 0) objStart = i;
      objDepth += 1;
    } else if (ch === '}') {
      objDepth -= 1;
      if (objDepth === 0 && objStart !== -1) {
        const candidate = src.slice(objStart, i + 1);
        objStart = -1;
        try {
          const parsed = JSON.parse(candidate) as unknown;
          const normalized = normalizeQuestion(parsed, questions.length);
          if (normalized) questions.push(normalized);
        } catch {
          // Ignore malformed chunk
        }
      }
    } else if (ch === ']' && objDepth === 0) {
      break;
    }
  }

  return questions;
}

export function parsePartialClarifyingQuestions(
  rawBuffer: string,
): ClarifyingQuestionsResponse | null {
  const trimmed = rawBuffer.trim();
  if (!trimmed) return null;

  try {
    const full = JSON.parse(trimmed) as {
      airContextNote?: unknown;
      questions?: unknown;
    };
    if (full && typeof full === 'object') {
      const airContextNote = typeof full.airContextNote === 'string' ? full.airContextNote.trim() : '';
      const rawList = Array.isArray(full.questions) ? full.questions : [];
      const questions = rawList
        .map((item, idx) => normalizeQuestion(item, idx))
        .filter((item): item is ClarifyingQuestion => item !== null);
      if (airContextNote || questions.length > 0) {
        return { airContextNote, questions, sourceMode: 'gemini' };
      }
    }
  } catch {
    // Still streaming incomplete JSON; fall through to incremental extraction
  }

  const noteStart = findKeyValueStart(trimmed, 'airContextNote');
  const airContextNote =
    noteStart !== -1 && trimmed[noteStart] === '"'
      ? decodePartialJsonString(trimmed, noteStart + 1)
      : '';

  const questions = extractCompletedQuestions(trimmed);

  if (!airContextNote && questions.length === 0) {
    return null;
  }

  return {
    airContextNote,
    questions,
    sourceMode: 'gemini',
  };
}
