/** Pure assembly rules. Every vehicle starts with all removable pieces detached. */
export function createGame(parts = []) {
  return {ids: new Set(parts.map(p => typeof p === 'string' ? p : p.id)), installed: new Set(), selected: null, won: false};
}
export function selectPart(state, id) { if (!state.ids.has(id)) return false; state.selected = id; return true; }
export function installPart(state, id) { if (!state.ids.has(id) || state.installed.has(id)) return false; state.installed.add(id); state.selected = null; return true; }
export function removePart(state, id) { if (!state.installed.delete(id)) return false; state.selected = null; state.won = false; return true; }
export function disassembleAll(state) { state.installed.clear(); state.selected = null; state.won = false; }
export function isComplete(state) { return state.ids.size > 0 && state.installed.size === state.ids.size; }
export function isNearTarget(x, y, targetX, targetY, radius = 80) { return Math.hypot(x - targetX, y - targetY) <= radius; }
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
