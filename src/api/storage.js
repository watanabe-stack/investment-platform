/**
 * 永続化レイヤー
 * Phase 1: localStorage / Phase 2: Supabase等のDB
 */
export async function loadData(key, fallback) {
  try {
    const raw = await window.storage?.get(key);
    return raw ? JSON.parse(raw.value) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveData(key, value) {
  try {
    await window.storage?.set(key, JSON.stringify(value));
  } catch {
    // Phase 2でエラーハンドリング改善予定
  }
}
