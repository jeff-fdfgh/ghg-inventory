import { useState, useEffect } from 'react';
import { FolderOpen, ChevronDown, ChevronRight, Trash2, CheckCircle, FileText, Folder, Loader2 } from 'lucide-react';
import { useAppContext, CATEGORY_LABELS, CATEGORY_COLORS, getGWP } from '../AppContext';
import { calcEmission, sortCategories } from '../utils/calculations';
import { pickFolder, getFolder, clearFolder, openLinkedFolder } from '../utils/fileManager';
import type { FileEntry } from '../utils/fileManager';

/** 格式化檔案大小 */
const formatSize = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const P3_ActivityData = () => {
    const { sources, setSources, gwpVersion, setGwpVersion } = useAppContext();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    // 紀錄每個排放源已關聯的資料夾名稱 (sourceId → folderName)
    const [folderMap, setFolderMap] = useState<Record<string, string>>({});
    // 紀錄每個排放源的資料夾檔案列表 (sourceId → FileEntry[])
    const [fileListMap, setFileListMap] = useState<Record<string, FileEntry[]>>({});
    // 正在載入檔案列表的 sourceId
    const [loadingFolder, setLoadingFolder] = useState<string | null>(null);
    // 展開檔案列表的 sourceId set
    const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

    const currentGWP = getGWP(gwpVersion);
    const enabled = sources.filter(s => s.enabled);
    const catKeys = sortCategories([...new Set(enabled.map(s => s.category))]);

    // 頁面載入時，從 localStorage 讀取所有已關聯的資料夾
    useEffect(() => {
        const map: Record<string, string> = {};
        enabled.forEach(s => {
            const folder = getFolder(s.id);
            if (folder) map[s.id] = folder;
        });
        setFolderMap(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sources]);

    const updateSource = (id: string, field: string, value: unknown) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    /** 選擇本機資料夾並關聯到排放源 */
    const handlePickFolder = async (sourceId: string) => {
        const folderName = await pickFolder(sourceId);
        if (folderName) {
            setFolderMap(prev => ({ ...prev, [sourceId]: folderName }));
            // 自動展開檔案列表
            await handleOpenFolder(sourceId);
            showToast(`📁 已關聯資料夾「${folderName}」`);
        }
    };

    /** 開啟資料夾 — 從 IndexedDB 取出 handle，列出檔案 */
    const handleOpenFolder = async (sourceId: string) => {
        // 如果已經展開，就收合
        if (openFolders.has(sourceId) && fileListMap[sourceId]) {
            setOpenFolders(prev => {
                const next = new Set(prev);
                next.delete(sourceId);
                return next;
            });
            return;
        }

        setLoadingFolder(sourceId);
        const entries = await openLinkedFolder(sourceId);
        setLoadingFolder(null);

        if (entries === null) {
            // handle 不存在或權限被拒 — 提示重新選擇
            showToast('⚠️ 需要重新選擇資料夾（權限已過期或 handle 遺失）');
            const folderName = await pickFolder(sourceId);
            if (folderName) {
                setFolderMap(prev => ({ ...prev, [sourceId]: folderName }));
                // 重新讀取
                const retryEntries = await openLinkedFolder(sourceId);
                if (retryEntries) {
                    setFileListMap(prev => ({ ...prev, [sourceId]: retryEntries }));
                    setOpenFolders(prev => new Set(prev).add(sourceId));
                }
            }
            return;
        }

        setFileListMap(prev => ({ ...prev, [sourceId]: entries }));
        setOpenFolders(prev => new Set(prev).add(sourceId));
    };

    /** 移除資料夾關聯 */
    const handleClearFolder = async (sourceId: string, folderName: string) => {
        await clearFolder(sourceId);
        setFolderMap(prev => {
            const next = { ...prev };
            delete next[sourceId];
            return next;
        });
        setFileListMap(prev => {
            const next = { ...prev };
            delete next[sourceId];
            return next;
        });
        setOpenFolders(prev => {
            const next = new Set(prev);
            next.delete(sourceId);
            return next;
        });
        showToast(`🗑 已移除「${folderName}」的關聯`);
    };

    return (
        <div>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
                    background: 'var(--card)', border: '1px solid var(--primary)',
                    borderRadius: '10px', padding: '0.75rem 1.25rem',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <CheckCircle size={16} color="var(--primary)" /> {toast}
                </div>
            )}

            <div className="card">
                <h2>表四：活動數據填報</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    填入各排放源全年度使用量及排放係數。可關聯本機資料夾作為佐證資料存放位置。
                </p>

                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>系統預設 GWP 版本：</label>
                    <select value={gwpVersion} onChange={e => setGwpVersion(e.target.value as 'AR5' | 'AR6')}
                        style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem', background: 'var(--card)', color: 'var(--text)' }}>
                        <option value="AR5">IPCC AR5 (第五次評估報告) — 官方指引要求</option>
                        <option value="AR6">IPCC AR6 (第六次評估報告)</option>
                    </select>
                </div>
            </div>
            {catKeys.map(cat => {
                const items = enabled.filter(s => s.category === cat);
                return (
                    <div key={cat} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span className="badge" style={{ background: CATEGORY_COLORS[cat] }}>{cat}</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{CATEGORY_LABELS[cat]}</span>
                        </div>
                        {items.map(source => {
                            const isOpen = expandedId === source.id;
                            const emission = calcEmission(source);
                            const gasKeys = Object.keys(source.gases).filter(g => source.gases[g]);
                            const linkedFolder = folderMap[source.id] || null;
                            const isFileListOpen = openFolders.has(source.id);
                            const fileList = fileListMap[source.id] || [];
                            const isLoading = loadingFolder === source.id;

                            return (
                                <div key={source.id} className="accordion">
                                    <div className="accordion-header" onClick={() => setExpandedId(isOpen ? null : source.id)}>
                                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <span style={{ flex: 1 }}>{source.equipmentName}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{source.fuelName}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--primary)', marginLeft: '1rem' }}>
                                            {source.totalAmount > 0 ? `${source.totalAmount.toLocaleString()} ${source.unit}` : '—'}
                                        </span>
                                        {emission > 0 && <span style={{ fontWeight: 700, color: '#059669', marginLeft: '0.5rem' }}>{emission.toFixed(4)} t</span>}
                                        {linkedFolder && <span style={{ fontSize: '0.75rem', color: '#059669', marginLeft: '0.5rem' }} title={`佐證：${linkedFolder}`}>📁</span>}
                                    </div>
                                    {isOpen && (
                                        <div className="accordion-body">
                                            <div className="grid-3" style={{ gap: '0.75rem' }}>
                                                <div className="field">
                                                    <label>全年度使用量 ({source.unit})</label>
                                                    <input type="number" value={source.totalAmount || ''} onChange={e => updateSource(source.id, 'totalAmount', Number(e.target.value))} />
                                                </div>
                                                {gasKeys.map(gas => (
                                                    <div key={gas} className="field">
                                                        <label>{gas} 排放係數 (kg/{source.unit})</label>
                                                        <input type="number" step="any" value={source.factors[gas] || ''}
                                                            onChange={e => updateSource(source.id, 'factors', { ...source.factors, [gas]: Number(e.target.value) })}
                                                        />
                                                    </div>
                                                ))}
                                                <div className="field">
                                                    <label>係數引用來源</label>
                                                    <input type="text" value={source.factorSource} onChange={e => updateSource(source.id, 'factorSource', e.target.value)} />
                                                </div>
                                            </div>
                                            {/* GWP */}
                                            <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>GWP 溫暖化潛勢 (目前全域: IPCC {gwpVersion})</label>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>☑：鎖定套用全域版本；☐：手動覆寫獨立數值</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                    {gasKeys.map(gas => {
                                                        const isSynced = source.gwpValues[gas] === undefined;
                                                        return (
                                                            <div key={gas} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', background: isSynced ? 'transparent' : 'rgba(239,68,68,0.05)', padding: '0.3rem 0.5rem', borderRadius: '6px', border: isSynced ? '1px solid transparent' : '1px solid rgba(239,68,68,0.2)', transition: 'all 0.2s' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSynced}
                                                                    id={`sync_${source.id}_${gas}`}
                                                                    style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                                                                    onChange={e => {
                                                                        const newGwp = { ...source.gwpValues };
                                                                        if (e.target.checked) {
                                                                            delete newGwp[gas];
                                                                        } else {
                                                                            newGwp[gas] = currentGWP[gas] ?? 1;
                                                                        }
                                                                        updateSource(source.id, 'gwpValues', newGwp);
                                                                    }}
                                                                />
                                                                <label htmlFor={`sync_${source.id}_${gas}`} style={{ fontWeight: 600, cursor: 'pointer', color: isSynced ? 'var(--text)' : '#ef4444' }}>
                                                                    {gas}:
                                                                </label>
                                                                <input type="number"
                                                                    disabled={isSynced}
                                                                    style={{
                                                                        width: '80px', padding: '0.2rem 0.4rem', border: '1px solid var(--border)', borderRadius: '4px',
                                                                        background: isSynced ? 'rgba(0,0,0,0.03)' : 'var(--card)',
                                                                        color: isSynced ? 'var(--text-muted)' : 'var(--text)',
                                                                        cursor: isSynced ? 'not-allowed' : 'text'
                                                                    }}
                                                                    value={source.gwpValues[gas] ?? currentGWP[gas] ?? 1}
                                                                    onChange={e => updateSource(source.id, 'gwpValues', { ...source.gwpValues, [gas]: Number(e.target.value) })}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            {/* Emission calc */}
                                            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(5,150,105,0.06)', borderRadius: '8px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>排放量試算 (tCO2e)</span>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                                                    {emission > 0 ? emission.toFixed(4) : '—'}
                                                </div>
                                            </div>

                                            {/* ── 佐證資料夾區塊 ── */}
                                            <div style={{ marginTop: '0.75rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => handlePickFolder(source.id)}>
                                                        <FolderOpen size={14} /> {linkedFolder ? '重新選擇資料夾' : '選擇佐證資料夾'}
                                                    </button>
                                                </div>

                                                {/* 已關聯的資料夾 — 點擊直接展開檔案列表 */}
                                                {linkedFolder && (
                                                    <div style={{ marginTop: '0.5rem' }}>
                                                        <div
                                                            onClick={() => handleOpenFolder(source.id)}
                                                            style={{
                                                                padding: '0.6rem 0.9rem',
                                                                background: isFileListOpen ? 'rgba(5,150,105,0.1)' : 'rgba(5,150,105,0.04)',
                                                                border: `1px solid rgba(5,150,105,${isFileListOpen ? '0.3' : '0.15'})`,
                                                                borderRadius: isFileListOpen ? '8px 8px 0 0' : '8px',
                                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                                cursor: 'pointer', transition: 'all 0.2s',
                                                                userSelect: 'none'
                                                            }}
                                                        >
                                                            {isLoading ? (
                                                                <Loader2 size={16} color="#059669" style={{ animation: 'spin 1s linear infinite' }} />
                                                            ) : isFileListOpen ? (
                                                                <ChevronDown size={16} color="#059669" />
                                                            ) : (
                                                                <ChevronRight size={16} color="#059669" />
                                                            )}
                                                            <FolderOpen size={16} color="#059669" />
                                                            <span style={{
                                                                flex: 1, fontWeight: 600, color: '#059669',
                                                                fontSize: '0.9rem'
                                                            }}>
                                                                {linkedFolder}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                {isLoading ? '讀取中…' : isFileListOpen ? '點擊收合' : '點擊查看檔案'}
                                                            </span>
                                                            <button
                                                                className="btn btn-sm"
                                                                style={{ background: 'transparent', color: '#ef4444', border: 'none', padding: '0.2rem' }}
                                                                onClick={(e) => { e.stopPropagation(); handleClearFolder(source.id, linkedFolder); }}
                                                                title="移除資料夾關聯"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>

                                                        {/* 檔案列表 */}
                                                        {isFileListOpen && (
                                                            <div style={{
                                                                border: '1px solid rgba(5,150,105,0.15)',
                                                                borderTop: 'none',
                                                                borderRadius: '0 0 8px 8px',
                                                                background: 'var(--card)',
                                                                maxHeight: '300px',
                                                                overflowY: 'auto'
                                                            }}>
                                                                {fileList.length === 0 ? (
                                                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                                        📭 此資料夾為空
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div style={{
                                                                            padding: '0.4rem 0.9rem',
                                                                            fontSize: '0.75rem', color: 'var(--text-muted)',
                                                                            borderBottom: '1px solid var(--border)',
                                                                            display: 'flex', justifyContent: 'space-between'
                                                                        }}>
                                                                            <span>共 {fileList.length} 個項目</span>
                                                                            <span>
                                                                                {fileList.filter(f => f.kind === 'file').length} 檔案
                                                                                {fileList.filter(f => f.kind === 'directory').length > 0 &&
                                                                                    `・${fileList.filter(f => f.kind === 'directory').length} 資料夾`
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        {fileList.map((entry, i) => (
                                                                            <div key={i} style={{
                                                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                                                padding: '0.45rem 0.9rem',
                                                                                borderBottom: i < fileList.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                                                                                fontSize: '0.85rem',
                                                                                transition: 'background 0.15s'
                                                                            }}
                                                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(5,150,105,0.04)')}
                                                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                                            >
                                                                                {entry.kind === 'directory' ? (
                                                                                    <Folder size={14} color="#f59e0b" />
                                                                                ) : (
                                                                                    <FileText size={14} color="var(--text-muted)" />
                                                                                )}
                                                                                <span style={{
                                                                                    flex: 1, color: 'var(--text)',
                                                                                    fontWeight: entry.kind === 'directory' ? 600 : 400
                                                                                }}>
                                                                                    {entry.name}
                                                                                </span>
                                                                                {entry.kind === 'file' && entry.size !== undefined && (
                                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                                                        {formatSize(entry.size)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {/* Spinner animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
