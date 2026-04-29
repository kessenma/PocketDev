// Hermes rejects `const Infinity = ...` (shadows a global). This shim exports
// a null component via CJS so the lucide barrel re-export doesn't crash.
// Nobody in this codebase renders <Infinity />, so null is safe.
module.exports = { Infinity: null };
