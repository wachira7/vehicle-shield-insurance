// Masks secrets that libraries print inside URLs and errors: RPC API keys in paths
// (Alchemy /v2/<key>, Infura /v3/<key>), key-like query parameters, database passwords and
// bearer tokens. Used by run-redacted.mjs for every hosted service's output.

const PATTERNS = [
  // https://eth-sepolia.g.alchemy.com/v2/<key>, https://sepolia.infura.io/v3/<key>
  [/(\/v[23]\/)[A-Za-z0-9_-]{8,}/g, "$1***"],
  // ?apikey=…, &key=…, ?token=…
  [/([?&](?:api[_-]?key|apikey|key|token|access[_-]?token)=)[^&\s"'<>]+/gi, "$1***"],
  // postgresql://user:password@host
  [/(postgres(?:ql)?:\/\/[^:/\s"']+:)[^@\s"']+@/gi, "$1***@"],
  // Authorization: Bearer <token>
  [/(Bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/g, "$1***"],
];

export function redact(text) {
  return PATTERNS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text);
}
