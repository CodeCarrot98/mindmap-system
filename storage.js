/**
 * storage.js
 * IndexedDB-based local storage for mind map state
 */

const DB_NAME = "mindmap_system_db";
const DB_VERSION = 1;
const STORE_NAME = "mindmaps";
const STATE_KEY = "current";

/* ---------- IndexedDB helpers ---------- */

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, callback) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = callback(store);

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------- Public API ---------- */

async function loadMindMap() {
  return withStore("readonly", (store) => {
    return new Promise((resolve) => {
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  });
}

async function saveMindMap(state) {
  state.updatedAt = new Date().toISOString();
  return withStore("readwrite", (store) => {
    store.put(state, STATE_KEY);
  });
}

async function clearMindMap() {
  return withStore("readwrite", (store) => {
    store.delete(STATE_KEY);
  });
}

/* ---------- Export / Import ---------- */

function exportMindMap(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "mindmap.json";
  a.click();

  URL.revokeObjectURL(url);
}

function importMindMap(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        resolve(data);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/* ---------- Autosave (debounced) ---------- */

let autosaveTimer = null;

function scheduleAutosave(state, delay = 500) {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveMindMap(state);
  }, delay);
}
