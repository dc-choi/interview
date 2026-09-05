import { createHash } from 'node:crypto';

export class ContextError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = 'ContextError';
    this.code = code;
  }
}

export const STRUCTURAL_PREDICATES = Object.freeze(['contains', 'links_to']);
export const ASSERTION_PREDICATES = Object.freeze(['mentions', 'supported_by', 'contradicted_by',
  'calls', 'publishes', 'consumes', 'reads_from', 'writes_to', 'constrained_by', 'verified_by']);

export const sha256 = (data) => createHash('sha256').update(data).digest('hex');

export function stableJson(value) {
  function sorted(item) {
    if (Array.isArray(item)) return item.map(sorted);
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.keys(item).sort().map((key) => [key, sorted(item[key])]));
    }
    return item;
  }
  return JSON.stringify(sorted(value));
}

export function normalizeScopes(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0 || scopes.length > 20) {
    throw new ContextError('invalid_scope', 'scope must contain 1 to 20 repository-relative prefixes');
  }
  return [...new Set(scopes.map((scope) => {
    if (typeof scope !== 'string' || !scope || Buffer.byteLength(scope) > 512
      || /[\\\x00-\x1f\x7f*?\[\]]/.test(scope) || scope.startsWith('/') || /^[A-Za-z]:/.test(scope)) {
      throw new ContextError('invalid_scope', 'scope must be a relative path without wildcards');
    }
    const parts = scope.split('/').filter((part) => part !== '' && part !== '.');
    if (parts.includes('..')) throw new ContextError('invalid_scope', 'parent traversal is not allowed');
    return parts.join('/') || '.';
  }))].sort();
}

export function inScope(file, scopes) {
  return scopes.some((scope) => scope === '.' || file === scope || file.startsWith(`${scope}/`));
}
