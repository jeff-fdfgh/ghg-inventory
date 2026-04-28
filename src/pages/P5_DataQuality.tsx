import { useAppContext, DQ_A1_OPTIONS, DQ_A2_OPTIONS, DQ_A3_OPTIONS, computeA1, computeA2, computeA3, getDQScoreRange, CATEGORY_COLORS } from '../AppContext';

export const P5_DataQuality = () => {
    const { sources, setSources } = useAppContext();
    const enabled = sources.filter(s => s.enabled);
    const sorted = [...enabled].sort((a, b) => a.category.localeCompare(b.category, undefined, { numeric: true }));

    const totalEmission = sorted.reduce((sum, s) => {
        const gases = Object.keys(s.gases).filter(g => s.gases[g]);
        return sum + gases.reduce((gs, g) => gs + (s.totalAmount * (s.factors[g] || 0) * (s.gwpValues[g] || 1)) / 1000, 0);
    }, 0);

    const updateSource = (id: string, field: string, value: string | number) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const getSourceEmission = (s: typeof sorted[0]) => {
        const gases = Object.keys(s.gases).filter(g => s.gases[g]);
        return gases.reduce((sum, g) => sum + (s.totalAmount * (s.factors[g] || 0) * (s.gwpValues[g] || 1)) / 1000, 0);
    };

    const selectStyle = { padding: '0.25rem 0.3rem', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', width: '100%', background: 'var(--card)', color: 'var(--text)' };

    // Calculate overall quality level
    const weightedSum = sorted.reduce((sum, s) => {
        const a1Text = s.dataQuality || '定期(間歇)量測/財務單據(非推估)';
        const a2Text = s.dqCredibility || '(2)有進行內部校正或經過會計簽證等証明者';
        const a3Text = s.dqEfType || '5國家排放係數';
        const a1 = computeA1(a1Text);
        const a2 = computeA2(a2Text);
        const a3 = computeA3(a3Text);
        const errorLevel = a1 * a2 * a3;
        const pct = totalEmission > 0 ? getSourceEmission(s) / totalEmission : 0;
        return sum + getDQScoreRange(errorLevel) * pct;
    }, 0);
    const overallLevel = weightedSum < 1.5 ? '第一級' : weightedSum < 2.5 ? '第二級' : '第三級';

    return (
        <div>
            <div className="card">
                <h2>表六：數據品質管理</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    ODS 19 欄完整對應。公式：單一排放源數據誤差等級 = A1 × A2 × A3
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <span className="badge" style={{ background: 'var(--primary)', padding: '0.4rem 0.8rem' }}>
                        清冊級別: {overallLevel} (加權平均: {weightedSum.toFixed(2)})
                    </span>
                </div>
            </div>
            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '0.75rem' }}>
                    <thead>
                        <tr>
                            <th>類別</th>
                            <th>設備名稱</th>
                            <th>原燃物料</th>
                            <th>活動數據取得方式</th>
                            <th>A1</th>
                            <th>數據可信度</th>
                            <th>A2</th>
                            <th>排放係數種類</th>
                            <th>A3</th>
                            <th>誤差等級 (A1×A2×A3)</th>
                            <th>占比(%)</th>
                            <th>評分區間</th>
                            <th>加權平均</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(s => {
                            const a1Text = s.dataQuality || '定期(間歇)量測/財務單據(非推估)';
                            const a2Text = s.dqCredibility || '(2)有進行內部校正或經過會計簽證等証明者';
                            const a3Text = s.dqEfType || '5國家排放係數';

                            const a1 = computeA1(a1Text);
                            const a2 = computeA2(a2Text);
                            const a3 = computeA3(a3Text);

                            const errorLevel = a1 * a2 * a3;
                            const pct = totalEmission > 0 ? (getSourceEmission(s) / totalEmission) * 100 : 0;
                            const scoreRange = getDQScoreRange(errorLevel);
                            const weighted = scoreRange * (pct / 100);
                            return (
                                <tr key={s.id}>
                                    <td><span className="badge" style={{ background: CATEGORY_COLORS[s.category] || 'var(--primary)' }}>{s.category}</span></td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{s.equipmentName}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{s.fuelName}</td>
                                    <td>
                                        <select value={a1Text} onChange={e => updateSource(s.id, 'dataQuality', e.target.value)} style={selectStyle}>
                                            {DQ_A1_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{a1}</td>
                                    <td>
                                        <select value={a2Text} onChange={e => updateSource(s.id, 'dqCredibility', e.target.value)} style={selectStyle}>
                                            {DQ_A2_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{a2}</td>
                                    <td>
                                        <select value={a3Text} onChange={e => updateSource(s.id, 'dqEfType', e.target.value)} style={selectStyle}>
                                            {DQ_A3_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{a3}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: errorLevel > 18 ? '#ef4444' : errorLevel > 10 ? '#f59e0b' : '#10b981' }}>
                                        {errorLevel}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{pct.toFixed(2)}%</td>
                                    <td style={{ textAlign: 'center' }}>{scoreRange}</td>
                                    <td style={{ textAlign: 'right' }}>{weighted.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
