import { useAppContext, getGWP, CATEGORY_COLORS } from '../AppContext';

export const P4_Quantification = () => {
    const { sources, gwpVersion } = useAppContext();
    const enabled = sources.filter(s => s.enabled && s.totalAmount > 0);
    const sorted = [...enabled].sort((a, b) => a.category.localeCompare(b.category, undefined, { numeric: true }));
    const currentGWP = getGWP(gwpVersion);

    return (
        <div>
            <div className="card">
                <h2>表五：定量盤查</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    各排放源依氣體別拆解。GWP 使用 IPCC {gwpVersion}。排放量 = AD × EF × GWP ÷ 1000 (tCO2e)
                </p>
            </div>
            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '0.8rem' }}>
                    <thead>
                        <tr>
                            <th>類別</th>
                            <th>設備名稱</th>
                            <th>原燃物料</th>
                            <th>氣體</th>
                            <th style={{ textAlign: 'right' }}>活動數據</th>
                            <th>計算方法</th>
                            <th style={{ textAlign: 'right' }}>單位排放係數</th>
                            <th>係數來源</th>
                            <th>係數種類</th>
                            <th style={{ textAlign: 'right' }}>排放量(t/yr)</th>
                            <th style={{ textAlign: 'right' }}>GWP ({gwpVersion})</th>
                            <th style={{ textAlign: 'right' }}>排放當量(tCO2e)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(s => {
                            const gasKeys = Object.keys(s.gases).filter(g => s.gases[g]);
                            return gasKeys.map((gas, gi) => {
                                const ef = (s.factors || {})[gas] || 0;
                                const gw = (s.gwpValues || {})[gas] || currentGWP[gas] || 1;
                                const rawEmission = (s.totalAmount * ef) / 1000; // tonnes/year
                                const emission = rawEmission * gw;
                                return (
                                    <tr key={`${s.id}-${gas}`} style={{ borderTop: gi === 0 ? '2px solid var(--border)' : undefined }}>
                                        {gi === 0 && <td rowSpan={gasKeys.length}><span className="badge" style={{ background: CATEGORY_COLORS[s.category] || 'var(--primary)' }}>{s.category}</span></td>}
                                        {gi === 0 && <td rowSpan={gasKeys.length}>{s.equipmentName}</td>}
                                        {gi === 0 && <td rowSpan={gasKeys.length}>{s.fuelName}</td>}
                                        <td>{gas}</td>
                                        <td style={{ textAlign: 'right' }}>{s.totalAmount.toLocaleString()} {s.unit}</td>
                                        <td style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.emissionType || '排放係數法'}</td>
                                        <td style={{ textAlign: 'right' }}>{ef || '—'}</td>
                                        <td style={{ fontSize: '0.7rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.factorSource || s.efSource || '—'}</td>
                                        <td style={{ fontSize: '0.7rem' }}>{s.dqEfType || s.efType || '5'}</td>
                                        <td style={{ textAlign: 'right' }}>{rawEmission > 0 ? rawEmission.toFixed(4) : '—'}</td>
                                        <td style={{ textAlign: 'right' }}>{gw}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: emission > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                            {emission > 0 ? emission.toFixed(4) : '—'}
                                        </td>
                                    </tr>
                                );
                            });
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
