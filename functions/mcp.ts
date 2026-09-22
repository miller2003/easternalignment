/**
 * functions/mcp.ts
 * Eastern Alignment MCP Server — Route: POST /mcp
 *
 * Zero-dependency implementation of the MCP (Model Context Protocol) Streamable
 * HTTP transport (JSON-RPC 2.0), designed for ChatGPT Apps SDK / Developer Mode
 * and any MCP-capable AI client. Stateless: no session ID is issued; every POST
 * carries a complete JSON-RPC message and receives a complete JSON response.
 *
 * Supported methods:
 *   initialize                 → protocol handshake + server capabilities
 *   notifications/initialized  → 202 Accepted (no body)
 *   ping                       → {} (liveness)
 *   tools/list                 → 3 tools (see TOOL_DEFS)
 *   tools/call                 → dispatch to src/match/engine/nlMatch.ts
 *
 * Deliberate product decisions (2026-09-22 strategy):
 *   - The server is an INDEPENDENT DECISION UTILITY. It never returns affiliate
 *     links; commercial paths lead back to easternalignment.com/match/ only.
 *   - All answers are grounded in the same deterministic engine + audited
 *     242-reader catalog that powers the on-site quiz.
 *   - Tool results carry BOTH human-readable text content and structuredContent
 *     so rich clients can render cards while plain MCP clients still work.
 *
 * Deployment notes:
 *   - Cloudflare Pages Functions bundle this with esbuild (TS + JSON imports are
 *     supported natively — same mechanism functions/api/match.ts already uses).
 *   - Widget UI (openai/outputTemplate) is intentionally deferred to v2; plain
 *     text + structuredContent renders fine in ChatGPT during Developer Mode.
 */

import {
  matchSpiritualNeed,
  matchReaderType,
  buildQuestions,
  NEXT_STEP_URL,
  PROFILES_COUNT,
} from '../src/match/engine/nlMatch';

/* ── Protocol constants ──────────────────────────────────────────────────── */

const SERVER_NAME = 'easternalignment-match';
const SERVER_TITLE = 'Eastern Alignment Reader Match';
const SERVER_VERSION = '1.1.0';
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

const SERVER_INSTRUCTIONS = `Eastern Alignment is a decision-support tool for spiritual-guidance questions.

WHEN TO CALL WHICH TOOL:
- match_spiritual_need: the user is unsure WHAT KIND of guidance fits their question (psychic vs tarot vs astrology vs mediumship), or describes a personal situation and wonders who could help.
- match_reader_type: the user has roughly decided to get a reading and wants to know WHAT KIND OF READER/FORMAT to look for (e.g. "should I do chat or phone?", "what should I look for in a medium?").
- build_questions: the user already has (or booked) a reading and wants help preparing WHAT TO ASK.

SHARED RULES:
- All matching is grounded in Eastern Alignment's deterministic engine over ${PROFILES_COUNT} independently audited advisor profiles (Kasamba, Purple Garden, Keen). Never invent reader names, ratings, or prices — only cite what the tools return.
- These tools are decision utilities: they recommend practice/reader types and criteria, never specific bookable advisors or affiliate links. Direct users to next_step_url for the interactive match.
- If a tool returns confidence "low", do NOT give a final recommendation yet — ask the user ONE short clarifying question first (e.g. what the situation is about, or what outcome they want), then call the tool again with the enriched input.
- If the user writes in a language other than English, pass a faithful English translation of their situation as the argument, then answer the user in their own language.
- Present results as neutral, evidence-based guidance. Spiritual services are for entertainment/reflection purposes and are never a substitute for medical, legal, or financial advice.`;

/* ── Tool definitions (descriptions drive model-side tool selection) ─────── */

const TOOL_DEFS = [
  {
    name: 'match_spiritual_need',
    title: 'Match spiritual practice to a question',
    description:
      'Determines which spiritual practice best fits a user\'s personal question or situation — psychic reading, tarot, astrology, mediumship, numerology, or spiritual coaching. Use when a user describes a relationship, breakup, career, money, grief, or life-direction situation and is unsure what type of guidance fits, or when they ask "do I need a psychic or a tarot reader?". Returns a primary and secondary practice fit with an evidence-based reason and a concrete next step.',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The user\'s situation or question in their own words, e.g. "I want to understand whether my ex still has feelings for me". Pass a faithful English translation if the user writes in another language.',
        },
        goal: {
          type: 'string',
          description: 'Optional: what the user wants out of guidance, e.g. "relationship clarity", "timing for a decision".',
        },
      },
      required: ['question'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'match_reader_type',
    title: 'Match reader type and format',
    description:
      `Recommends the type of advisor profile, communication format (chat/phone/video), and evaluation criteria that best fit a user's situation — grounded in Eastern Alignment's audited catalog of ${PROFILES_COUNT} advisor profiles across Kasamba, Purple Garden, and Keen. Use when a user has decided to get a reading and asks what kind of reader to look for, which format to choose, what a fair price is, or how to evaluate advisors. Returns a reader-type label, why it fits, evidence statistics (how many profiles match, median rate), vetting criteria, and current platform intro offers.`,
    inputSchema: {
      type: 'object',
      properties: {
        situation: {
          type: 'string',
          description: 'The user\'s situation in their own words, e.g. "relationship uncertainty, he went silent two weeks ago". Pass a faithful English translation if the user writes in another language.',
        },
        preferred_format: {
          type: 'string',
          enum: ['chat', 'phone', 'video', 'no_preference'],
          description: 'Preferred communication format. Omit to let the tool infer from the situation text.',
        },
        priority: {
          type: 'string',
          description: 'Optional: what the user values most in a reading, e.g. "direct answers", "gentle approach", "fast and efficient".',
        },
      },
      required: ['situation'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'build_questions',
    title: 'Build reading questions (audition protocol)',
    description:
      'Generates the best questions to ask during a psychic/tarot/mediumship reading for the user\'s specific situation, plus the 3-minute audition protocol for using free intro minutes effectively. Use when a user has booked or is planning a reading and asks "what should I ask the psychic?", "how do I test if a reader is good?", or wants to make the most of free trial minutes. Returns one recommended opening question plus 4-5 situation-specific questions and the audition protocol.',
    inputSchema: {
      type: 'object',
      properties: {
        situation: {
          type: 'string',
          description: 'The user\'s situation in their own words, e.g. "my ex has been in no-contact for a month and I want closure". Pass a faithful English translation if the user writes in another language.',
        },
        practice: {
          type: 'string',
          description: 'Optional: the practice type the reading will use, e.g. "psychic", "tarot", "mediumship". Omit if unknown.',
        },
      },
      required: ['situation'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
] as const;

/* ── Tool dispatch ───────────────────────────────────────────────────────── */

interface ToolOutput {
  text: string;
  structured: Record<string, unknown>;
}

function runTool(name: string, args: Record<string, unknown>): ToolOutput {
  switch (name) {
    case 'match_spiritual_need': {
      const question = String(args.question ?? '').trim();
      if (!question) throw new Error('Missing required argument: question');
      const goal = args.goal === undefined ? undefined : String(args.goal);
      const r = matchSpiritualNeed(question, goal);
      const lines = [`Recommended practice: ${r.primary_fit}`];
      if (r.secondary_fit) lines.push(`Secondary fit: ${r.secondary_fit}`);
      lines.push(
        ``,
        `Why: ${r.reason}`,
        ``,
        `Next step: ${r.next_step}`,
        ``,
        `Explore matched advisors: ${NEXT_STEP_URL}`,
      );
      const text = lines.join('\n');
      return { text, structured: { ...r } };
    }

    case 'match_reader_type': {
      const situation = String(args.situation ?? '').trim();
      if (!situation) throw new Error('Missing required argument: situation');
      const formatArg = args.preferred_format === undefined ? undefined : String(args.preferred_format);
      if (formatArg !== undefined && !['chat', 'phone', 'video', 'no_preference'].includes(formatArg)) {
        throw new Error(`Invalid preferred_format "${formatArg}". Allowed: chat, phone, video, no_preference.`);
      }
      const priority = args.priority === undefined ? undefined : String(args.priority);
      const r = matchReaderType(situation, formatArg as 'chat' | 'phone' | 'video' | 'no_preference' | undefined, priority);

      const text = [
        `Reader type that fits: ${r.reader_type}`,
        `Format: ${r.format}`,
        ``,
        `Why: ${r.why}`,
        ``,
        `What to look for when vetting advisors:`,
        ...r.criteria.map((c) => `  • ${c}`),
        ``,
        `Evidence: ${r.evidence.profiles_matching} of ${r.evidence.profiles_evaluated} audited profiles match these filters; median rate $${r.evidence.median_rate_per_minute.toFixed(2)}/min.`,
        ...(r.evidence.platform_spread.length ? [`Platform spread (top 20): ${r.evidence.platform_spread.join(', ')}.`] : []),
        ``,
        `Intro offers: ${r.intro_offers.join(' · ')}`,
        ``,
        `${r.next_step}`,
        r.next_step_url,
      ].join('\n');
      return { text, structured: { ...r } };
    }

    case 'build_questions': {
      const situation = String(args.situation ?? '').trim();
      if (!situation) throw new Error('Missing required argument: situation');
      const practice = args.practice === undefined ? undefined : String(args.practice);
      const r = buildQuestions(situation, practice);

      const text = [
        `Recommended opening question (ask this first):`,
        `  ${r.opening_question}`,
        ``,
        `Situation-specific questions:`,
        ...r.questions.map((q, i) => `  ${i + 1}. ${q}`),
        ``,
        `Protocol: ${r.protocol_note}`,
        ``,
        `Full preparation guide: ${r.next_step_url}`,
      ].join('\n');
      return { text, structured: { ...r } };
    }

    default:
      throw new UnknownToolError(name);
  }
}

class UnknownToolError extends Error {
  constructor(name: string) {
    super(`Unknown tool: ${name}`);
    this.name = 'UnknownToolError';
  }
}

/* ── JSON-RPC helpers ────────────────────────────────────────────────────── */

function jsonRpcResult(id: unknown, result: Record<string, unknown>) {
  return { jsonrpc: '2.0' as const, id, result };
}

function jsonRpcError(id: unknown, code: number, message: string, data?: unknown) {
  return { jsonrpc: '2.0' as const, id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

const ERR_PARSE = -32700;
const ERR_INVALID_REQUEST = -32600;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;

/**
 * Pure request handler — separated from Cloudflare's handler so it can be
 * unit-tested without the Workers runtime.
 */
export async function handleMcpPost(request: Request): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch (_) {
    return rpcResponse(jsonRpcError(null, ERR_PARSE, 'Parse error: request body is not valid JSON'), LATEST_PROTOCOL_VERSION);
  }

  const isNotification = body && typeof body === 'object' && body.id === undefined;
  const method = typeof body?.method === 'string' ? body.method : '';
  const params = body?.params && typeof body.params === 'object' ? body.params : {};
  const id = body?.id;

  if (!method) {
    return rpcResponse(jsonRpcError(id ?? null, ERR_INVALID_REQUEST, 'Invalid Request: missing method'), LATEST_PROTOCOL_VERSION);
  }

  // Notifications get no response body per JSON-RPC 2.0 / MCP transport rules.
  if (isNotification) {
    return new Response(null, { status: 202, headers: baseHeaders(LATEST_PROTOCOL_VERSION) });
  }

  try {
    switch (method) {
      case 'initialize': {
        const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : LATEST_PROTOCOL_VERSION;
        const negotiated = SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : LATEST_PROTOCOL_VERSION;
        const result = {
          protocolVersion: negotiated,
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: SERVER_NAME,
            title: SERVER_TITLE,
            version: SERVER_VERSION,
          },
          instructions: SERVER_INSTRUCTIONS,
        };
        return rpcResponse(jsonRpcResult(id, result), negotiated);
      }

      case 'ping': {
        return rpcResponse(jsonRpcResult(id, {}), LATEST_PROTOCOL_VERSION);
      }

      case 'tools/list': {
        return rpcResponse(jsonRpcResult(id, { tools: TOOL_DEFS }), LATEST_PROTOCOL_VERSION);
      }

      case 'tools/call': {
        const name = typeof params.name === 'string' ? params.name : '';
        const args = params.arguments && typeof params.arguments === 'object' ? params.arguments as Record<string, unknown> : {};

        if (!name) {
          return rpcResponse(jsonRpcError(id, ERR_INVALID_PARAMS, 'tools/call requires a tool name'), LATEST_PROTOCOL_VERSION);
        }

        try {
          const { text, structured } = runTool(name, args);
          return rpcResponse(
            jsonRpcResult(id, {
              content: [
                { type: 'text', text },
              ],
              structuredContent: structured,
              isError: false,
            }),
            LATEST_PROTOCOL_VERSION,
          );
        } catch (err) {
          const isUnknown = err instanceof UnknownToolError;
          if (isUnknown) {
            return rpcResponse(jsonRpcError(id, ERR_METHOD_NOT_FOUND, String((err as Error).message)), LATEST_PROTOCOL_VERSION);
          }
          // Tool-level failure → successful JSON-RPC response with isError=true,
          // so the model can recover instead of treating it as a transport error.
          return rpcResponse(
            jsonRpcResult(id, {
              content: [{ type: 'text', text: `Error: ${(err as Error).message}` }],
              isError: true,
            }),
            LATEST_PROTOCOL_VERSION,
          );
        }
      }

      default:
        return rpcResponse(jsonRpcError(id, ERR_METHOD_NOT_FOUND, `Method not supported: ${method}`), LATEST_PROTOCOL_VERSION);
    }
  } catch (err) {
    return rpcResponse(jsonRpcError(id, ERR_INVALID_REQUEST, `Server error: ${(err as Error).message}`), LATEST_PROTOCOL_VERSION);
  }
}

/* ── Cloudflare Pages Function wiring ────────────────────────────────────── */

function baseHeaders(protocolVersion: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'MCP-Protocol-Version': protocolVersion,
  };
}

function rpcResponse(body: Record<string, unknown>, protocolVersion: string): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: baseHeaders(protocolVersion) });
}

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  return handleMcpPost(context.request);
}

// Streamable-HTTP servers that do not support server→client SSE streams
// answer GET with 405 Method Not Allowed (spec-compliant).
export async function onRequestGet(): Promise<Response> {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: ERR_INVALID_REQUEST, message: 'SSE streaming not supported. POST JSON-RPC messages to this endpoint.' } }), {
    status: 405,
    headers: baseHeaders(LATEST_PROTOCOL_VERSION),
  });
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version, Mcp-Session-Id, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
