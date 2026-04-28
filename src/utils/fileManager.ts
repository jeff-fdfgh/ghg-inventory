/**
 * fileManager.ts — v1.7 資料夾選取版
 *
 * 使用 File System Access API (showDirectoryPicker) 讓使用者選取本機資料夾，
 * 將資料夾名稱記錄到 localStorage，顯示於畫面上。
 * 
 * 點擊資料夾名稱時，重新開啟 showDirectoryPicker 讓使用者快速定位。
 */

const STORAGE_KEY = 'ghg_evidence_folders';

export interface FolderRecord {
    name: string;          // 資料夾名稱
    selectedAt: string;    // 選取時間 ISO
}

/** 從 localStorage 讀取所有資料夾記錄 */
const loadFolders = (): Record<string, FolderRecord> => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
};

/** 寫入 localStorage */
const saveFolders = (data: Record<string, FolderRecord>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

/**
 * 讓使用者選擇一個本機資料夾。
 * 回傳資料夾名稱，或 null（使用者取消）。
 */
export const pickFolder = async (sourceKey: string): Promise<string | null> => {
    // showDirectoryPicker 是現代瀏覽器 API (Chrome 86+, Edge 86+)
    if (!('showDirectoryPicker' in window)) {
        alert('您的瀏覽器不支援資料夾選取功能。\n請使用 Chrome 或 Edge 瀏覽器。');
        return null;
    }

    try {
        const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
        const folderName: string = handle.name;

        // 記錄到 localStorage
        const folders = loadFolders();
        folders[sourceKey] = {
            name: folderName,
            selectedAt: new Date().toISOString(),
        };
        saveFolders(folders);

        return folderName;
    } catch {
        // 使用者按取消
        return null;
    }
};

/** 取得某排放源已關聯的資料夾名稱 */
export const getFolder = (sourceKey: string): string | null => {
    const folders = loadFolders();
    return folders[sourceKey]?.name || null;
};

/** 清除某排放源的資料夾關聯 */
export const clearFolder = (sourceKey: string): void => {
    const folders = loadFolders();
    delete folders[sourceKey];
    saveFolders(folders);
};

/**
 * 「開啟資料夾」— 因瀏覽器安全限制，無法直接開啟本機路徑。
 * 改為重新呼叫 showDirectoryPicker，讓使用者再次定位該資料夾。
 */
export const reopenFolder = async (): Promise<void> => {
    if (!('showDirectoryPicker' in window)) {
        alert('您的瀏覽器不支援資料夾選取功能。');
        return;
    }
    try {
        await (window as any).showDirectoryPicker({ mode: 'read' });
    } catch {
        // 使用者取消，不做任何事
    }
};

/** 取得所有已關聯的資料夾記錄（方便匯出等功能） */
export const getAllFolders = (): Record<string, FolderRecord> => {
    return loadFolders();
};
