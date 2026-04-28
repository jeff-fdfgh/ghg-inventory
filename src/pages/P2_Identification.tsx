import { useState } from 'react';
import { ChevronDown, ChevronRight, PlusCircle, Trash2 } from 'lucide-react';
import { useAppContext, makeSource, CATEGORY_LABELS, CATEGORY_COLORS, ALL_GHG_TYPES, EMISSION_TYPES, type EmissionSource } from '../AppContext';
import { sortCategories } from '../utils/calculations';

export const P2_Identification = () => {
    const { sources, setSources } = useAppContext();
    const [expandedCat, setExpandedCat] = useState<string | null>(null);

    const catKeys = sortCategories(Object.keys(CATEGORY_LABELS));
    const grouped = catKeys.reduce((acc, cat) => {
        acc[cat] = sources.filter(s => s.category === cat);
        return acc;
    }, {} as Record<string, EmissionSource[]>);

    const toggleSource = (id: string) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    };

    const updateSource = (id: string, field: string, value: unknown) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const addSource = (cat: string) => {
        const newId = `custom_${Date.now()}`;
        const newSource = makeSource({ id: newId, category: cat });
        setSources(prev => [...prev, newSource]);
    };

    const deleteSource = (id: string, name: string) => {
        if (window.confirm(`確定要刪除排放源「${name}」嗎？\n此操作無法復原。`)) {
            setSources(prev => prev.filter(s => s.id !== id));
        }
    };

    return (
        <div>
            <div className="card">
                <h2>表三：排放源鑑別</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    依 ISO 14064-1 六大範疇鑑別所有排放源。勾選 ✓ 表示納入盤查。
                </p>
            </div>
            {catKeys.map(cat => {
                const items = grouped[cat] || [];
                const isOpen = expandedCat === cat;
                return (
                    <div key={cat} className="card" style={{ padding: '0' }}>
                        <div
                            className="accordion-header"
                            onClick={() => setExpandedCat(isOpen ? null : cat)}
                        >
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <span className="badge" style={{ background: CATEGORY_COLORS[cat] || '#888' }}>{cat}</span>
                            <span style={{ flex: 1 }}>{CATEGORY_LABELS[cat]}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {items.filter(s => s.enabled).length}/{items.length} 項啟用
                            </span>
                        </div>
                        {isOpen && (
                            <div className="accordion-body">
                                {items.length === 0 && (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>尚未新增排放源</p>
                                )}
                                {items.map(s => (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                        <input type="checkbox" checked={s.enabled} onChange={() => toggleSource(s.id)} style={{ marginTop: '0.3rem' }} />
                                        <div style={{ flex: 1 }}>
                                            <div className="grid-3" style={{ gap: '0.5rem' }}>
                                                <div className="field"><label>製程名稱</label><input type="text" value={s.processName} onChange={e => updateSource(s.id, 'processName', e.target.value)} /></div>
                                                <div className="field"><label>設備名稱</label><input type="text" value={s.equipmentName} onChange={e => updateSource(s.id, 'equipmentName', e.target.value)} /></div>
                                                <div className="field"><label>原燃物料名稱</label><input type="text" value={s.fuelName} onChange={e => updateSource(s.id, 'fuelName', e.target.value)} /></div>
                                                <div className="field"><label>排放型式</label>
                                                    <select value={s.emissionType} onChange={e => updateSource(s.id, 'emissionType', e.target.value)}>
                                                        {EMISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                                <div className="field"><label>直接/間接</label>
                                                    <select value={s.directIndirect} onChange={e => updateSource(s.id, 'directIndirect', e.target.value)}>
                                                        <option value="直接">直接</option><option value="間接">間接</option>
                                                    </select>
                                                </div>
                                                <div className="field"><label>單位</label>
                                                    <select value={s.unit} onChange={e => updateSource(s.id, 'unit', e.target.value)}>
                                                        <option value="">請選擇</option>
                                                        <optgroup label="體積 (液體/氣體)">
                                                            <option value="L">公升 (L)</option>
                                                            <option value="kL">千公升 (kL)</option>
                                                            <option value="m³">立方公尺 (m³)</option>
                                                            <option value="萬m³">萬立方公尺 (萬m³)</option>
                                                        </optgroup>
                                                        <optgroup label="重量 (固體)">
                                                            <option value="kg">公斤 (kg)</option>
                                                            <option value="公噸">公噸 (t)</option>
                                                        </optgroup>
                                                        <optgroup label="電能">
                                                            <option value="度">度 (kWh)</option>
                                                            <option value="千度">千度 (MWh)</option>
                                                        </optgroup>
                                                        <optgroup label="距離/運輸">
                                                            <option value="km">公里 (km)</option>
                                                            <option value="延人公里">延人公里 (p-km)</option>
                                                            <option value="延噸公里">延噸公里 (t-km)</option>
                                                        </optgroup>
                                                        <optgroup label="其他/計數">
                                                            <option value="張">張</option>
                                                            <option value="包">包</option>
                                                            <option value="個">個</option>
                                                            <option value="台">台</option>
                                                            <option value="次">次</option>
                                                            <option value="元">元</option>
                                                            <option value="千元">千元</option>
                                                        </optgroup>
                                                    </select>
                                                </div>
                                            </div>
                                            <div style={{ marginTop: '0.5rem' }}>
                                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>產生溫室氣體</label>
                                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                                    {ALL_GHG_TYPES.map(g => (
                                                        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" checked={!!s.gases[g]}
                                                                onChange={e => updateSource(s.id, 'gases', { ...s.gases, [g]: e.target.checked })}
                                                            /> {g}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteSource(s.id, s.equipmentName || s.fuelName || s.processName || '未命名')}
                                            title="刪除此排放源"
                                            style={{
                                                background: 'none', border: '1px solid #fca5a5', borderRadius: '6px',
                                                color: '#ef4444', cursor: 'pointer', padding: '4px 8px', marginTop: '0.3rem',
                                                display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseOver={e => { (e.target as HTMLElement).style.background = '#fef2f2'; }}
                                            onMouseOut={e => { (e.target as HTMLElement).style.background = 'none'; }}
                                        >
                                            <Trash2 size={13} /> 刪除
                                        </button>
                                    </div>
                                ))}
                                <button className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}
                                    onClick={() => addSource(cat)}>
                                    <PlusCircle size={14} /> 新增排放源
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
