import { useAppContext, type SupplementaryData } from '../AppContext';

export const P8_Supplementary = () => {
    const { supplementary, setSupplementary } = useAppContext();

    const update = <K extends keyof SupplementaryData>(key: K, value: SupplementaryData[K]) => {
        setSupplementary(prev => ({ ...prev, [key]: value }));
    };

    const numInput = (label: string, value: number, onChange: (v: number) => void, unit: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <label style={{ minWidth: '160px', fontSize: '0.85rem' }}>{label}</label>
            <input type="number" value={value || ''} onChange={e => onChange(Number(e.target.value))}
                style={{ padding: '0.3rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px', width: '140px', background: 'var(--card)', color: 'var(--text)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{unit}</span>
        </div>
    );

    const txtInput = (label: string, value: string, onChange: (v: string) => void) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <label style={{ minWidth: '160px', fontSize: '0.85rem' }}>{label}</label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)}
                style={{ padding: '0.3rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px', flex: 1, background: 'var(--card)', color: 'var(--text)' }} />
        </div>
    );

    return (
        <div>
            {/* ─── 表九: 電力供需 ─── */}
            <div className="card">
                <h2>表九：全廠電力供需情況</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    離網電力供應者或及蒸汽生產者應填寫本表。即使無生產/售電亦應填 0。
                </p>
                {numInput('台電購入', supplementary.electricityPurchased, v => update('electricityPurchased', v), '仟度')}
                <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border)', marginBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem' }}>再生能源</p>
                    {numInput('風力', supplementary.electricityRenewable.wind, v => update('electricityRenewable', { ...supplementary.electricityRenewable, wind: v }), '仟度')}
                    {numInput('水力', supplementary.electricityRenewable.hydro, v => update('electricityRenewable', { ...supplementary.electricityRenewable, hydro: v }), '仟度')}
                    {numInput('地熱', supplementary.electricityRenewable.geothermal, v => update('electricityRenewable', { ...supplementary.electricityRenewable, geothermal: v }), '仟度')}
                    {numInput('潮汐', supplementary.electricityRenewable.tidal, v => update('electricityRenewable', { ...supplementary.electricityRenewable, tidal: v }), '仟度')}
                    {numInput('其他再生能源', supplementary.electricityRenewable.other, v => update('electricityRenewable', { ...supplementary.electricityRenewable, other: v }), '仟度')}
                    {txtInput('其他再生備註', supplementary.electricityRenewable.otherNote, v => update('electricityRenewable', { ...supplementary.electricityRenewable, otherNote: v }))}
                </div>
                {numInput('核能發電量', supplementary.electricityNuclear, v => update('electricityNuclear', v), '仟度')}
                {numInput('外售電量', supplementary.electricitySold, v => update('electricitySold', v), '仟度')}
                {txtInput('外售對象', supplementary.electricitySoldTarget, v => update('electricitySoldTarget', v))}
            </div>

            {/* ─── 表九: 蒸汽供需 ─── */}
            <div className="card">
                <h2>表九：全廠蒸汽供需情況</h2>
                {numInput('蒸汽產量', supplementary.steamProduced, v => update('steamProduced', v), '公噸')}
                {numInput('自用量', supplementary.steamSelfUsed, v => update('steamSelfUsed', v), '公噸')}
                {numInput('外售量', supplementary.steamSold, v => update('steamSold', v), '公噸')}
                {txtInput('外售對象', supplementary.steamSoldTarget, v => update('steamSoldTarget', v))}
            </div>

            {/* ─── 表十: 產製期程 ─── */}
            <div className="card">
                <h2>表十：產製期程與產品產量</h2>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>各製程產製期程</h3>
                <table style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                    <thead><tr>
                        <th>製程編號</th><th>製程代碼</th><th>製程名稱</th>
                        <th>操作時數(hr)</th><th>操作日數(天)</th><th></th>
                    </tr></thead>
                    <tbody>
                        {supplementary.productionSchedules.map((ps, i) => (
                            <tr key={i}>
                                {(['processNumber', 'processCode', 'processName'] as const).map(f => (
                                    <td key={f}><input type="text" value={ps[f]} onChange={e => {
                                        const arr = [...supplementary.productionSchedules];
                                        arr[i] = { ...arr[i], [f]: e.target.value };
                                        update('productionSchedules', arr);
                                    }} style={{ padding: '2px 4px', border: '1px solid var(--border)', borderRadius: '4px', width: '80px', background: 'var(--card)', color: 'var(--text)', fontSize: '0.75rem' }} /></td>
                                ))}
                                {(['operatingHours', 'operatingDays'] as const).map(f => (
                                    <td key={f}><input type="number" value={ps[f] || ''} onChange={e => {
                                        const arr = [...supplementary.productionSchedules];
                                        arr[i] = { ...arr[i], [f]: Number(e.target.value) };
                                        update('productionSchedules', arr);
                                    }} style={{ padding: '2px 4px', border: '1px solid var(--border)', borderRadius: '4px', width: '70px', background: 'var(--card)', color: 'var(--text)', fontSize: '0.75rem' }} /></td>
                                ))}
                                <td><button onClick={() => {
                                    const arr = supplementary.productionSchedules.filter((_, j) => j !== i);
                                    update('productionSchedules', arr);
                                }} style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button onClick={() => update('productionSchedules', [...supplementary.productionSchedules, { processNumber: '', processCode: '', processName: '', operatingHours: 24, operatingDays: 365 }])}
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    + 新增產製期程
                </button>

                <h3 style={{ fontSize: '0.9rem', margin: '1.5rem 0 0.5rem' }}>當年度產品產量</h3>
                <table style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                    <thead><tr>
                        <th>製程編號</th><th>製程代碼</th><th>製程名稱</th>
                        <th>產品名稱</th><th>產量</th><th>單位</th><th></th>
                    </tr></thead>
                    <tbody>
                        {supplementary.products.map((p, i) => (
                            <tr key={i}>
                                {(['processNumber', 'processCode', 'processName', 'productName'] as const).map(f => (
                                    <td key={f}><input type="text" value={p[f]} onChange={e => {
                                        const arr = [...supplementary.products];
                                        arr[i] = { ...arr[i], [f]: e.target.value };
                                        update('products', arr);
                                    }} style={{ padding: '2px 4px', border: '1px solid var(--border)', borderRadius: '4px', width: '80px', background: 'var(--card)', color: 'var(--text)', fontSize: '0.75rem' }} /></td>
                                ))}
                                <td><input type="number" value={p.quantity || ''} onChange={e => {
                                    const arr = [...supplementary.products];
                                    arr[i] = { ...arr[i], quantity: Number(e.target.value) };
                                    update('products', arr);
                                }} style={{ padding: '2px 4px', border: '1px solid var(--border)', borderRadius: '4px', width: '80px', background: 'var(--card)', color: 'var(--text)', fontSize: '0.75rem' }} /></td>
                                <td><input type="text" value={p.unit} onChange={e => {
                                    const arr = [...supplementary.products];
                                    arr[i] = { ...arr[i], unit: e.target.value };
                                    update('products', arr);
                                }} style={{ padding: '2px 4px', border: '1px solid var(--border)', borderRadius: '4px', width: '50px', background: 'var(--card)', color: 'var(--text)', fontSize: '0.75rem' }} /></td>
                                <td><button onClick={() => update('products', supplementary.products.filter((_, j) => j !== i))}
                                    style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button onClick={() => update('products', [...supplementary.products, { processNumber: '', processCode: '', processName: '', productName: '', quantity: 0, unit: '公噸' }])}
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    + 新增產品
                </button>
            </div>

            {/* ─── Save indicator ─── */}
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                💾 所有資料自動保存至 localStorage
            </div>
        </div>
    );
};
