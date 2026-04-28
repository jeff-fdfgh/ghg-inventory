import { useAppContext, getGWP, CATEGORY_COLORS, calcSourceUncertaintyPN, calcOverallUncertainty } from '../AppContext';
import { calcEmission } from '../utils/calculations';

const AD_UNCERTAINTY_OPTIONS = [
    { label: '±1% — 連續量測 (高精度)', value: 1 },
    { label: '±2.5% — 定期量測/財務單據', value: 2.5 },
    { label: '±5% — 財務會計推估', value: 5 },
    { label: '±7.5% — 自行評估', value: 7.5 },
    { label: '±10% — 推估(無計算式)', value: 10 },
    { label: '±15% — 供應商提供', value: 15 },
];

const EF_UNCERTAINTY_OPTIONS = [
    { label: '±2% — 自廠實測', value: 2 },
    { label: '±5% — 同製程經驗值', value: 5 },
    { label: '±10% — 國家排放係數', value: 10 },
    { label: '±15% — 區域排放係數', value: 15 },
    { label: '±20% — 國際公告值', value: 20 },
    { label: '±25% — IPCC 預設值', value: 25 },
    { label: '±50% — 推估值', value: 50 },
];

/* ── Shared input styles ── */
const inputNum: React.CSSProperties = {
    width: '62px', padding: '4px 6px', border: '2px solid #6366f1',
    borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700,
    textAlign: 'center', background: '#f0f0ff', color: '#312e81',
};
const inputNumNeg: React.CSSProperties = { ...inputNum, border: '2px solid #ef4444', background: '#fff5f5', color: '#991b1b' };
const inputNumPos: React.CSSProperties = { ...inputNum, border: '2px solid #10b981', background: '#f0fdf4', color: '#065f46' };
const selectBase: React.CSSProperties = {
    padding: '3px 4px', border: '1px solid var(--border)', borderRadius: '4px',
    fontSize: '0.7rem', width: '100%', background: 'var(--card)', color: 'var(--text)',
    minWidth: '120px',
};
const inputText: React.CSSProperties = {
    padding: '3px 6px', border: '1px solid var(--border)', borderRadius: '4px',
    fontSize: '0.7rem', background: 'var(--card)', color: 'var(--text)',
};

export const P7_Uncertainty = () => {
    const { sources, setSources, gwpVersion } = useAppContext();
    const currentGWP = getGWP(gwpVersion);
    const enabled = sources.filter(s => s.enabled);
    const sorted = [...enabled].sort((a, b) => a.category.localeCompare(b.category, undefined, { numeric: true }));

    const updateSource = (id: string, field: string, value: string | number | Record<string, number> | Record<string, string>) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    // Build rows with calculations
    const rows = sorted.map(s => {
        const emission = calcEmission(s, currentGWP);
        const activeGases = Object.keys(s.gases).filter(g => s.gases[g]);
        const gasData = activeGases.map(g => {
            const ef = (s.factors[g] || 0);
            const gwp = (s.gwpValues[g] ?? currentGWP[g] ?? 1);
            return {
                gas: g,
                emission: (s.totalAmount * ef * gwp) / 1000,
                efPos: (s.efUncertainty || {})[g] ?? 10,
                efNeg: (s.efUncertaintyNeg || {})[g] ?? ((s.efUncertainty || {})[g] ?? 10),
            };
        });
        const totalGasEmission = gasData.reduce((sum, ge) => sum + ge.emission, 0);
        // Weighted EF uncertainty (pos and neg separately)
        const weightedEfPos = totalGasEmission > 0
            ? Math.sqrt(gasData.reduce((sum, ge) => sum + Math.pow(ge.emission * ge.efPos / 100, 2), 0)) / totalGasEmission * 100 : 10;
        const weightedEfNeg = totalGasEmission > 0
            ? Math.sqrt(gasData.reduce((sum, ge) => sum + Math.pow(ge.emission * ge.efNeg / 100, 2), 0)) / totalGasEmission * 100 : 10;
        const adPos = s.adUncertainty ?? 5;
        const adNeg = s.adUncertaintyNeg ?? adPos;
        const srcUnc = calcSourceUncertaintyPN(adPos, adNeg, weightedEfPos, weightedEfNeg);
        return { ...s, emission, activeGases, gasData, srcUnc };
    });

    const totalEmission = rows.reduce((sum, r) => sum + r.emission, 0);
    const overallPos = calcOverallUncertainty(rows.map(r => ({ emission: r.emission, uncertainty: r.srcUnc.pos })));
    const overallNeg = calcOverallUncertainty(rows.map(r => ({ emission: r.emission, uncertainty: r.srcUnc.neg })));
    const ciUpper = totalEmission * (1 + overallPos / 100);
    const ciLower = totalEmission * (1 - overallNeg / 100);

    return (
        <div>
            <div className="card">
                <h2>表七：不確定性量化評估</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    依據 ISO 14064-1 §2.3.6，以誤差傳播法計算各排放源及全廠不確定性 (95% 信賴區間)。
                    公式：單一排放源 = √(AD² + EF²)；全廠 = √(Σ(Eᵢ×Uᵢ)²) / ΣEᵢ。正負不確定性可分開設定。
                </p>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="stat-card">
                    <div className="value">{totalEmission.toFixed(2)}</div>
                    <div className="label">全廠排放 tCO2e</div>
                </div>
                <div className="stat-card">
                    <div className="value" style={{ color: '#f59e0b' }}>
                        <span style={{ color: '#ef4444' }}>-{overallNeg.toFixed(2)}%</span>
                        {' / '}
                        <span style={{ color: '#10b981' }}>+{overallPos.toFixed(2)}%</span>
                    </div>
                    <div className="label">整體不確定性</div>
                </div>
                <div className="stat-card">
                    <div className="value" style={{ fontSize: '1.1rem', color: '#ef4444' }}>{ciLower.toFixed(2)}</div>
                    <div className="label">95% CI 下限 tCO2e</div>
                </div>
                <div className="stat-card">
                    <div className="value" style={{ fontSize: '1.1rem', color: '#10b981' }}>{ciUpper.toFixed(2)}</div>
                    <div className="label">95% CI 上限 tCO2e</div>
                </div>
            </div>

            {/* Detail Table */}
            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '0.72rem', borderCollapse: 'collapse', minWidth: '1200px' }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                            <th rowSpan={2}>類別</th>
                            <th rowSpan={2}>設備名稱</th>
                            <th rowSpan={2}>原燃物料</th>
                            <th rowSpan={2}>排放當量<br />(tCO2e)</th>
                            <th colSpan={4} style={{ textAlign: 'center', borderBottom: '2px solid #6366f1' }}>活動數據不確定性</th>
                            <th rowSpan={2} style={{ minWidth: '480px' }}>排放係數不確定性 (per-gas)</th>
                            <th colSpan={2} style={{ textAlign: 'center', borderBottom: '2px solid #f59e0b' }}>單一排放源不確定性</th>
                            <th rowSpan={2}>95% CI<br />下限</th>
                            <th rowSpan={2}>95% CI<br />上限</th>
                        </tr>
                        <tr style={{ background: 'rgba(0,0,0,0.03)' }}>
                            <th style={{ color: '#10b981' }}>預設選項</th>
                            <th style={{ color: '#ef4444' }}>- %</th>
                            <th style={{ color: '#10b981' }}>+ %</th>
                            <th>AD 來源</th>
                            <th style={{ color: '#ef4444' }}>- %</th>
                            <th style={{ color: '#10b981' }}>+ %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => {
                            const pct = totalEmission > 0 ? (r.emission / totalEmission) * 100 : 0;
                            return (
                                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td><span className="badge" style={{ background: CATEGORY_COLORS[r.category] || 'var(--primary)' }}>{r.category}</span></td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{r.equipmentName}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{r.fuelName}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                        {r.emission > 0 ? r.emission.toFixed(4) : '—'}
                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>({pct.toFixed(1)}%)</span>
                                    </td>
                                    {/* AD preset selector */}
                                    <td>
                                        <select
                                            value={'__set__'}
                                            onChange={e => {
                                                if (e.target.value !== '__set__') {
                                                    const v = Number(e.target.value);
                                                    updateSource(r.id, 'adUncertainty', v);
                                                    updateSource(r.id, 'adUncertaintyNeg', v);
                                                }
                                            }}
                                            style={selectBase}
                                        >
                                            <option value="__set__">選擇預設…</option>
                                            {AD_UNCERTAINTY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </td>
                                    {/* AD negative */}
                                    <td style={{ textAlign: 'center' }}>
                                        <input type="number" step="any" min="0"
                                            value={r.adUncertaintyNeg ?? r.adUncertainty ?? 5}
                                            onChange={e => updateSource(r.id, 'adUncertaintyNeg', Number(e.target.value))}
                                            style={inputNumNeg}
                                        />
                                    </td>
                                    {/* AD positive */}
                                    <td style={{ textAlign: 'center' }}>
                                        <input type="number" step="any" min="0"
                                            value={r.adUncertainty ?? 5}
                                            onChange={e => updateSource(r.id, 'adUncertainty', Number(e.target.value))}
                                            style={inputNumPos}
                                        />
                                    </td>
                                    <td>
                                        <input type="text" placeholder="來源"
                                            value={r.adUncertaintySource ?? ''}
                                            onChange={e => updateSource(r.id, 'adUncertaintySource', e.target.value)}
                                            style={{ ...inputText, width: '75px' }}
                                        />
                                    </td>
                                    {/* Per-gas EF uncertainty: nested sub-table */}
                                    <td style={{ padding: '2px' }}>
                                        <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                                                    <th style={{ padding: '2px 4px', width: '40px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>氣體</th>
                                                    <th style={{ padding: '2px 4px', textAlign: 'left', borderBottom: '1px solid var(--border)', minWidth: '135px' }}>預設</th>
                                                    <th style={{ padding: '2px 4px', width: '72px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: '#ef4444', fontWeight: 700 }}>- %</th>
                                                    <th style={{ padding: '2px 4px', width: '72px', textAlign: 'center', borderBottom: '1px solid var(--border)', color: '#10b981', fontWeight: 700 }}>+ %</th>
                                                    <th style={{ padding: '2px 4px', width: '70px', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>來源</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {r.activeGases.map(g => {
                                                    const curPos = (r.efUncertainty || {})[g] ?? 10;
                                                    const curNeg = (r.efUncertaintyNeg || {})[g] ?? curPos;
                                                    return (
                                                        <tr key={g} style={{ borderBottom: '1px dashed rgba(0,0,0,0.06)' }}>
                                                            <td style={{ padding: '3px 4px', fontWeight: 700, color: 'var(--primary)' }}>{g}</td>
                                                            <td style={{ padding: '3px 4px' }}>
                                                                <select
                                                                    value={'__set__'}
                                                                    onChange={e => {
                                                                        if (e.target.value !== '__set__') {
                                                                            const v = Number(e.target.value);
                                                                            updateSource(r.id, 'efUncertainty', { ...(r.efUncertainty || {}), [g]: v });
                                                                            updateSource(r.id, 'efUncertaintyNeg', { ...(r.efUncertaintyNeg || {}), [g]: v });
                                                                        }
                                                                    }}
                                                                    style={{ ...selectBase, fontSize: '0.68rem', minWidth: '130px' }}
                                                                >
                                                                    <option value="__set__">選擇…</option>
                                                                    {EF_UNCERTAINTY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                                </select>
                                                            </td>
                                                            <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                                                                <input type="number" step="any" min="0"
                                                                    value={curNeg}
                                                                    onChange={e => updateSource(r.id, 'efUncertaintyNeg', { ...(r.efUncertaintyNeg || {}), [g]: Number(e.target.value) })}
                                                                    style={inputNumNeg}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                                                                <input type="number" step="any" min="0"
                                                                    value={curPos}
                                                                    onChange={e => updateSource(r.id, 'efUncertainty', { ...(r.efUncertainty || {}), [g]: Number(e.target.value) })}
                                                                    style={inputNumPos}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '3px 4px' }}>
                                                                <input type="text" placeholder="—"
                                                                    value={(r.efUncertaintySource || {})[g] ?? ''}
                                                                    onChange={e => updateSource(r.id, 'efUncertaintySource', { ...(r.efUncertaintySource || {}), [g]: e.target.value })}
                                                                    style={{ ...inputText, width: '55px' }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </td>
                                    {/* Source uncertainty results */}
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>
                                        - {r.srcUnc.neg.toFixed(2)}%
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                                        + {r.srcUnc.pos.toFixed(2)}%
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 600 }}>
                                        {r.emission > 0 ? (r.emission * (1 - r.srcUnc.neg / 100)).toFixed(4) : '—'}
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                                        {r.emission > 0 ? (r.emission * (1 + r.srcUnc.pos / 100)).toFixed(4) : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                            <td colSpan={3}>全廠合計</td>
                            <td style={{ textAlign: 'right' }}>{totalEmission.toFixed(4)}</td>
                            <td colSpan={5}></td>
                            <td style={{ textAlign: 'center', color: '#ef4444' }}>- {overallNeg.toFixed(2)}%</td>
                            <td style={{ textAlign: 'center', color: '#10b981' }}>+ {overallPos.toFixed(2)}%</td>
                            <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{ciLower.toFixed(4)}</td>
                            <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>{ciUpper.toFixed(4)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Formula Reference */}
            <div className="card" style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <h3 style={{ fontSize: '0.9rem' }}>公式說明</h3>
                <ul style={{ lineHeight: 2 }}>
                    <li><strong>單一排放源不確定性</strong>：U_source = √(U_AD² + U_EF²)，正負分別計算</li>
                    <li><strong>加權排放係數不確定性</strong>：U_EF = √(Σ(E_gas × U_ef_gas)²) / Σ E_gas，多元氣體排放源以個別氣體排放量加權</li>
                    <li><strong>全廠不確定性</strong>：U_total = √(Σ(E_i × U_i)²) / ΣE_i，以各排放源排放當量加權，正負分別計算</li>
                    <li><strong>95% 信賴區間</strong>：下限 = E × (1 - U_neg/100)，上限 = E × (1 + U_pos/100)</li>
                    <li>💡 <strong>使用方式</strong>：選擇「預設」下拉選單會同時設定正負值；之後可在
                        <span style={{ ...inputNumNeg, display: 'inline', padding: '1px 4px', fontSize: '0.7rem' }}>紅框</span> 和
                        <span style={{ ...inputNumPos, display: 'inline', padding: '1px 4px', fontSize: '0.7rem' }}>綠框</span>
                        中分別修改正負不確定性數值</li>
                </ul>
            </div>
        </div>
    );
};
