const API = 'http://localhost:3001';

export const uploadFile = async (facilityName: string, file: File): Promise<string> => {
    const safeName = facilityName.replace(/[/\\]/g, '_');
    const fd = new FormData();
    // §2.4.4 R-01: facility 必須在 file 之前，否則 multer destination 讀不到
    fd.append('facility', safeName);
    fd.append('file', file);
    const res = await fetch(`${API}/upload`, { method: 'POST', body: fd });
    if (!res.ok) {
        const err = await res.text().catch(() => 'Upload failed');
        throw new Error(err);
    }
    const data = await res.json();
    return data.filename || file.name;
};

export const listFiles = async (facilityName: string): Promise<string[]> => {
    const safeName = facilityName.replace(/[/\\]/g, '_');
    try {
        const res = await fetch(`${API}/files/${encodeURIComponent(safeName)}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.files || [];
    } catch { return []; }
};

export const openFolder = async (facilityName: string): Promise<void> => {
    const safeName = facilityName.replace(/[/\\]/g, '_');
    await fetch(`${API}/open-folder/${encodeURIComponent(safeName)}`);
};
