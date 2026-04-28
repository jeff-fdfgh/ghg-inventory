import { useState } from 'react';
import { Upload, ChevronDown, ChevronRight, FolderOpen, FileText } from 'lucide-react';
import { useAppContext, CATEGORY_LABELS, CATEGORY_COLORS, getGWP } from '../AppContext';
import { calcEmission, sortCategories } from '../utils/calculations';
import { uploadFile, listFiles, openFolder } from '../utils/fileManager';

export const P3_ActivityData = () => {
    const { sources, setSources, gwpVersion, setGwpVersion } = useAppContext();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const currentGWP = getGWP(gwpVersion);

    const enabled = sources.filter(s => s.enabled);
    const catKeys = sortCategories([...new Set(enabled.map(s => s.category))]);

    const updateSource = (id: string, field: string, value: unknown) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleUpload = async (sourceId: string, facilityName: string) => {
        const input = document.createElement('input');
        input.type = 'file'; input.multiple = true;
        input.onchange = async () => {
            if (!input.files) return;
            for (const file of Array.from(input.files)) {
                await uploadFile(facilityName, file);
            }
            // §2.4.5: 上傳後立即從 API 取得最新清單，寫入 Context
            const files = await listFiles(facilityName);
            setSources(prev => prev.map(s => s.id === sourceId ? { ...s, evidenceFiles: files } : s));
        };
        input.click();
    };

    return (
        <div>
            <div className="card">
                <h2>表四：活動數據填報</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    填入各排放源全年度使用量及排放係數。上傳的佐證資料會永久保存於本機。
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
                            const files = source.evidenceFiles || [];

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
                                            {/* File upload */}
                                            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => handleUpload(source.id, source.equipmentName)}>
                                                    <Upload size={14} /> 上傳佐證
                                                </button>
                                                {files.length > 0 && (
                                                    <button className="btn btn-secondary btn-sm" onClick={() => openFolder(source.equipmentName)}>
                                                        <FolderOpen size={14} /> 開啟資料夾
                                                    </button>
                                                )}
                                            </div>
                                            {files.length > 0 && (
                                                <div className="file-list">
                                                    {files.map((f, i) => (
                                                        <div key={i} className="file-item">
                                                            <FileText size={14} />
                                                            <span className="name" onClick={() => openFolder(source.equipmentName)}>{f}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};
