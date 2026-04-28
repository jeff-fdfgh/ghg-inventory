/**
 * fileManager.ts — v1.7.1 資料夾直接開啟版
 *
 * 使用 File System Access API 搭配 IndexedDB：
 *  - showDirectoryPicker() 取得 FileSystemDirectoryHandle
 *  - IndexedDB 儲存 handle（handle 不能序列化到 localStorage）
 *  - localStorage 儲存資料夾名稱（給 UI 顯示用）
 *
 * 點擊資料夾名稱時：
 *  1. 從 IndexedDB 取出 handle
 *  2. requestPermission() — 使用者只需點「允許」（不用重選資料夾）
 *  3. 列出資料夾內檔案清單
 */

// ═══════════════════════════════════════════
// IndexedDB — 儲存 FileSystemDirectoryHandle
// ═══════════════════════════════════════════

const IDB_NAME = 'ghg_evidence_handles';
const IDB_STORE = 'handles';
const IDB_VERSION = 1;

const openIDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

const saveHandle = async (key: string, handle: FileSystemDirectoryHandle): Promise<void> => {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(handle, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const loadHandle = async (key: string): Promise<FileSystemDirectoryHandle | null> => {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
    });
};

const deleteHandle = async (key: string): Promise<void> => {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

// ═══════════════════════════════════════════
// localStorage — 儲存資料夾名稱（輕量 metadata）
// ═══════════════════════════════════════════

const STORAGE_KEY = 'ghg_evidence_folders';

export interface FolderRecord {
    name: string;          // 資料夾名稱
    selectedAt: string;    // 選取時間 ISO
}

const loadFolders = (): Record<string, FolderRecord> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
};

const saveFolders = (data: Record<string, FolderRecord>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// ═══════════════════════════════════════════
// 公開 API
// ═══════════════════════════════════════════

/** 檔案資訊 */
export interface FileEntry {
    name: string;
    kind: 'file' | 'directory';
    size?: number;          // bytes（僅 file 有）
    lastModified?: number;  // timestamp（僅 file 有）
}

/**
 * 讓使用者選擇一個本機資料夾。
 * 同時儲存 handle (IndexedDB) + 名稱 (localStorage)。
 */
export const pickFolder = async (sourceKey: string): Promise<string | null> => {
    if (!('showDirectoryPicker' in window)) {
        alert('您的瀏覽器不支援資料夾選取功能。\n請使用 Chrome 或 Edge 瀏覽器。');
        return null;
    }

    try {
        const handle: FileSystemDirectoryHandle =
            await (window as any).showDirectoryPicker({ mode: 'read' });

        // 儲存 handle 到 IndexedDB
        await saveHandle(sourceKey, handle);

        // 儲存名稱到 localStorage
        const folders = loadFolders();
        folders[sourceKey] = {
            name: handle.name,
            selectedAt: new Date().toISOString(),
        };
        saveFolders(folders);

        return handle.name;
    } catch {
        return null; // 使用者取消
    }
};

/** 取得某排放源已關聯的資料夾名稱（從 localStorage） */
export const getFolder = (sourceKey: string): string | null => {
    const folders = loadFolders();
    return folders[sourceKey]?.name || null;
};

/** 清除某排放源的資料夾關聯（同時清 IndexedDB + localStorage） */
export const clearFolder = async (sourceKey: string): Promise<void> => {
    // 清 IndexedDB handle
    await deleteHandle(sourceKey).catch(() => {});
    // 清 localStorage
    const folders = loadFolders();
    delete folders[sourceKey];
    saveFolders(folders);
};

/**
 * 開啟已關聯的資料夾，列出其中的檔案。
 *
 * 流程：
 *  1. 從 IndexedDB 取出之前存的 handle
 *  2. requestPermission() — 使用者只需點「允許」（不是重選資料夾）
 *  3. 遍歷 handle 列出檔案
 *
 * 回傳：檔案清單，或 null（handle 不存在/權限被拒）
 */
export const openLinkedFolder = async (sourceKey: string): Promise<FileEntry[] | null> => {
    const handle = await loadHandle(sourceKey);
    if (!handle) {
        return null; // handle 不存在（可能是舊資料，需要重新選擇）
    }

    // 請求讀取權限 — 只是一個簡單的「允許存取」提示
    try {
        const perm = await (handle as any).requestPermission({ mode: 'read' });
        if (perm !== 'granted') {
            return null;
        }
    } catch {
        return null;
    }

    // 列出資料夾內容
    const entries: FileEntry[] = [];
    try {
        for await (const entry of (handle as any).values()) {
            const item: FileEntry = {
                name: entry.name,
                kind: entry.kind,
            };
            // 如果是檔案，嘗試取得大小和修改時間
            if (entry.kind === 'file') {
                try {
                    const file: File = await entry.getFile();
                    item.size = file.size;
                    item.lastModified = file.lastModified;
                } catch { /* 讀不到也沒關係 */ }
            }
            entries.push(item);
        }
    } catch {
        return null;
    }

    // 排序：資料夾在前，檔案在後，各自按名稱排
    entries.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    return entries;
};

/** 取得所有已關聯的資料夾記錄 */
export const getAllFolders = (): Record<string, FolderRecord> => {
    return loadFolders();
};
