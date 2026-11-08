// Vitest stand-in for the "server-only" marker. Next.js handles that import itself (no package
// installed, see AGENTS.md), but plain Vitest can't resolve it, so tests map it to this empty module.
export {};
