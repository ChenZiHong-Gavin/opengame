import { existsSync } from 'node:fs';

export const modernMcpVersion = '2026-07-28';
const protocolVersionKey = 'io.modelcontextprotocol/protocolVersion';

function requestMeta(message: unknown): Record<string, unknown> | undefined {
  if (!message || typeof message !== 'object' || !('params' in message)) return;
  const params = message.params;
  if (!params || typeof params !== 'object' || !('_meta' in params)) return;
  const meta = params._meta;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) return meta as Record<string, unknown>;
}

export function hasMcpEnvelope(message: unknown): boolean {
  const meta = requestMeta(message);
  return Boolean(meta && Object.hasOwn(meta, protocolVersionKey));
}

export function mcpEnvelopeVersion(message: unknown): unknown {
  return requestMeta(message)?.[protocolVersionKey];
}

// A discovery probe can precede the client's choice of protocol envelope.
export function withMcpDiscoveryEnvelope(message: unknown): unknown {
  if (!message || typeof message !== 'object' || !('method' in message) || message.method !== 'server/discover'
    || !('id' in message) || hasMcpEnvelope(message)) return message;
  const params = 'params' in message && message.params !== undefined ? message.params : {};
  if (!params || typeof params !== 'object' || Array.isArray(params)) return message;
  const meta = requestMeta(message);
  if ('_meta' in params && !meta) return message;
  return { ...message, params: { ...params, _meta: {
    'io.modelcontextprotocol/clientCapabilities': {},
    ...meta,
    [protocolVersionKey]: modernMcpVersion,
  } } };
}

export type ModernMcpSdk = typeof import('./mcp-modern-sdk.ts');
const bundle = new URL('./mcp-modern-sdk.cjs', import.meta.url);
let sdk: Promise<ModernMcpSdk> | undefined;

export function loadModernMcpSdk(): Promise<ModernMcpSdk> {
  return sdk ??= existsSync(bundle)
    ? import(bundle.href).then(module => module.default)
    : import('./mcp-modern-sdk.ts');
}
