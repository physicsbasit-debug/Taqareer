(() => {
  "use strict";

  const VERSION = "0.9.5";
  const CACHE_NAMESPACE = `taqareer.fast-pipeline.${VERSION}`;
  const INDEX_KEY = `${CACHE_NAMESPACE}.index`;
  const MAX_ENTRIES = 8;
  const MAX_VALUE_CHARS = 500_000;
  const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function stableStringify(value) {
    const seen = new WeakSet();
    const walk = input => {
      if (input === null || typeof input !== "object") return input;
      if (seen.has(input)) return "[Circular]";
      seen.add(input);
      if (Array.isArray(input)) return input.map(walk);
      return Object.keys(input).sort().reduce((output, key) => {
        const current = input[key];
        if (current !== undefined && typeof current !== "function") output[key] = walk(current);
        return output;
      }, {});
    };
    return JSON.stringify(walk(value));
  }

  async function sha256Hex(value) {
    const text = typeof value === "string" ? value : stableStringify(value);
    if (globalThis.crypto?.subtle) {
      const bytes = new TextEncoder().encode(text);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
    }
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fallback-${(hash >>> 0).toString(16)}`;
  }

  async function makeKey(kind, payload) {
    return `${CACHE_NAMESPACE}.${kind}.${await sha256Hex(payload)}`;
  }

  function readIndex() {
    try {
      const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeIndex(index) {
    try { localStorage.setItem(INDEX_KEY, JSON.stringify(index.slice(0, MAX_ENTRIES))); } catch { /* best effort */ }
  }

  function removeKey(key) {
    try { localStorage.removeItem(key); } catch { /* best effort */ }
  }

  function pruneIndex(index) {
    const now = Date.now();
    const kept = [];
    index.forEach(item => {
      if (!item?.key || Number(item.expiresAt || 0) <= now) removeKey(item?.key);
      else kept.push(item);
    });
    kept.slice(MAX_ENTRIES).forEach(item => removeKey(item.key));
    return kept.slice(0, MAX_ENTRIES);
  }

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (!entry || Number(entry.expiresAt || 0) <= Date.now()) {
        removeKey(key);
        return null;
      }
      const index = pruneIndex(readIndex()).filter(item => item.key !== key);
      index.unshift({ key, expiresAt: entry.expiresAt, touchedAt: Date.now() });
      writeIndex(index);
      return entry.value ?? null;
    } catch {
      return null;
    }
  }

  function cacheSet(key, value, ttlMs = DEFAULT_TTL_MS) {
    try {
      const expiresAt = Date.now() + Math.max(60_000, Number(ttlMs) || DEFAULT_TTL_MS);
      const raw = JSON.stringify({ version: VERSION, expiresAt, value });
      if (raw.length > MAX_VALUE_CHARS) return false;
      localStorage.setItem(key, raw);
      const index = pruneIndex(readIndex()).filter(item => item.key !== key);
      index.unshift({ key, expiresAt, touchedAt: Date.now() });
      const trimmed = index.slice(0, MAX_ENTRIES);
      index.slice(MAX_ENTRIES).forEach(item => removeKey(item.key));
      writeIndex(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  function cacheDelete(key) {
    removeKey(key);
    writeIndex(readIndex().filter(item => item.key !== key));
  }

  function clearCache() {
    readIndex().forEach(item => removeKey(item.key));
    try { localStorage.removeItem(INDEX_KEY); } catch { /* best effort */ }
  }

  function now() { return globalThis.performance?.now?.() ?? Date.now(); }
  function startSpan(name) { return { name, startedAt: now() }; }
  function endSpan(span, extra = {}) {
    return { name: span.name, durationMs: Math.max(0, now() - span.startedAt), ...extra };
  }
  function formatDuration(ms) {
    const value = Number(ms) || 0;
    if (value < 1000) return `${Math.round(value)} مللي ثانية`;
    return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)} ثانية`;
  }

  window.TaqareerPerformance = {
    VERSION,
    stableStringify,
    sha256Hex,
    makeKey,
    cacheGet,
    cacheSet,
    cacheDelete,
    clearCache,
    startSpan,
    endSpan,
    formatDuration
  };
})();
