import { useAppContext } from '../AppContext';

export const P1_Boundary = () => {
    const { baseline, setBaseline } = useAppContext();
    const u = (field: string, value: string) => setBaseline(prev => ({ ...prev, [field]: value }));

    return (
        <div>
            <div className="card">
                <h2>表二：邊界設定</h2>
                <div className="grid-2">
                    <div className="field"><label>目的事業主管機關所核發之證書字號</label><input type="text" value={baseline.certificateNumber} onChange={e => u('certificateNumber', e.target.value)} /></div>
                    <div className="field"><label>目的事業主管機關</label><input type="text" value={baseline.authority} onChange={e => u('authority', e.target.value)} /></div>
                    <div className="field"><label>縣市別</label><input type="text" value={baseline.city} onChange={e => u('city', e.target.value)} /></div>
                    <div className="field"><label>鄉鎮別</label><input type="text" value={baseline.district} onChange={e => u('district', e.target.value)} /></div>
                    <div className="field"><label>郵遞區號</label><input type="text" value={baseline.zipCode} onChange={e => u('zipCode', e.target.value)} /></div>
                    <div className="field"><label>里別*</label><input type="text" value={baseline.village} onChange={e => u('village', e.target.value)} /></div>
                    <div className="field"><label>鄰別*</label><input type="text" value={baseline.neighborhood} onChange={e => u('neighborhood', e.target.value)} /></div>
                    <div className="field"><label>地址</label><input type="text" value={baseline.address} onChange={e => u('address', e.target.value)} /></div>
                </div>
            </div>
            <div className="card">
                <h3>邊界內未納入計算之排放源</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>如有不納入計算之排放源，請於下方說明理由。</p>
                <div className="field"><label>未納入排放源 1*</label><textarea rows={2} value={baseline.excludedSource1} onChange={e => u('excludedSource1', e.target.value)} /></div>
                <div className="field"><label>未納入排放源 2*</label><textarea rows={2} value={baseline.excludedSource2} onChange={e => u('excludedSource2', e.target.value)} /></div>
                <div className="field"><label>未納入排放源 3*</label><textarea rows={2} value={baseline.excludedSource3} onChange={e => u('excludedSource3', e.target.value)} /></div>
            </div>
        </div>
    );
};
