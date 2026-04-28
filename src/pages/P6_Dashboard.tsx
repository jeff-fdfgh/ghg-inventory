import { Download } from 'lucide-react';
import { useAppContext, CATEGORY_LABELS, CATEGORY_COLORS, getGWP, ALL_GHG_TYPES, getDQScoreRange, computeA1, computeA2, computeA3, calcSourceUncertaintyPN, calcOverallUncertainty } from '../AppContext';
import { calcEmission, sortCategories } from '../utils/calculations';
import * as XLSX from 'xlsx';

export const P6_Dashboard = () => {
    const { sources, baseline, gwpVersion, supplementary } = useAppContext();
    const enabled = sources.filter(s => s.enabled);
    const currentGWP = getGWP(gwpVersion);

    const rows = enabled.map(s => ({ ...s, tco2e: calcEmission(s, currentGWP) }));
    const sortedRows = [...rows].sort((a, b) => a.category.localeCompare(b.category, undefined, { numeric: true }));
    const total = rows.reduce((sum, r) => sum + r.tco2e, 0);

    // Category totals
    const catTotals: Record<string, number> = {};
    rows.forEach(r => { catTotals[r.category] = (catTotals[r.category] || 0) + r.tco2e; });
    const sortedCats = sortCategories(Object.keys(catTotals));

    // Scope totals
    const scope1 = rows.filter(r => r.category.startsWith('1.')).reduce((s, r) => s + r.tco2e, 0);
    const scope2 = rows.filter(r => r.category.startsWith('2.')).reduce((s, r) => s + r.tco2e, 0);
    const scope3456 = total - scope1 - scope2;

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        // 表一
        const s1 = [['一、事業基本資料'], ['盤查期間', '民國', baseline.year], ['管制編號', baseline.controlId], ['事業名稱', baseline.companyName], ['統一編號', baseline.taxId], ['負責人', baseline.responsible], ['聯絡人', baseline.contactPerson], ['電話', baseline.contactPhone], ['Email', baseline.contactEmail], ['行業代碼', baseline.industryCode1], ['行業名稱', baseline.industryName1], ['登錄原因', baseline.registrationReason], ['盤查依據', baseline.verificationBasis], ['查驗機構', baseline.verifierName]];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s1), '表一');
        // 表二
        const s2 = [['二、邊界設定'], ['證書字號', baseline.certificateNumber], ['縣市', baseline.city], ['鄉鎮', baseline.district], ['郵遞區號', baseline.zipCode], ['地址', baseline.address], ['未納入排放源1', baseline.excludedSource1], ['未納入排放源2', baseline.excludedSource2], ['未納入排放源3', baseline.excludedSource3]];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s2), '表二');
        // 表三
        const h3 = ['製程編號', '製程代碼', '製程名稱', '設備編號', '設備代碼', '設備名稱', '原燃物料類別', '原燃物料代碼', '原燃物料名稱', '是否生質能源', '直接/間接', '排放型式', 'CO2', 'CH4', 'N2O', 'HFCs', 'PFCs', 'SF6', 'NF3'];
        const d3 = sortedRows.map(r => [r.processNumber, r.processCode, r.processName, r.equipmentNumber, r.equipmentCode, r.equipmentName, r.fuelCategory, r.fuelCode, r.fuelName, r.isBiomass ? '是' : '否', r.directIndirect, r.emissionType, ...ALL_GHG_TYPES.map(g => r.gases[g] ? 'v' : '')]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h3, ...d3]), '表三');
        // 表四
        const h4 = ['類別', '設備名稱', '原燃物料', '單位', '其他單位名稱', '全年度使用量', '電力/蒸汽供應商', '佐證資料'];
        const d4 = sortedRows.map(r => [r.category, r.equipmentName, r.fuelName, r.unit, r.otherUnitName || '', r.totalAmount, r.energySupplier || '', r.evidenceRef]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h4, ...d4]), '表四');
        // 表五
        const h5 = ['類別', '設備名稱', '原燃物料', '氣體', '活動數據', '單位', '計算方法', '單位排放係數', '係數來源', '係數種類', `GWP(${gwpVersion})`, '排放量(t/yr)', '排放當量(tCO2e)'];
        const d5: (string | number)[][] = [];
        sortedRows.forEach(r => {
            Object.keys(r.gases).filter(g => r.gases[g]).forEach(g => {
                const ef = (r.factors || {})[g] || 0;
                const gw = (r.gwpValues || {})[g] || currentGWP[g] || 1;
                const raw = (r.totalAmount * ef) / 1000;
                d5.push([r.category, r.equipmentName, r.fuelName, g, r.totalAmount, r.unit, r.emissionType || '排放係數法', ef, r.factorSource || r.efSource || '', r.efType || '5', gw, raw, raw * gw]);
            });
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h5, ...d5]), '表五');
        // 表六
        const h6 = ['類別', '設備名稱', '原燃物料', 'A1活動數據取得方式', 'A1等級', '數據可信度', 'A2等級', '排放係數來源', 'A3等級', '誤差等級(A1×A2×A3)', '占比(%)', '評分區間', '加權平均'];
        const d6 = sortedRows.map(r => {
            const a1Text = r.dataQuality || '定期(間歇)量測/財務單據(非推估)';
            const a2Text = r.dqCredibility || '(2)有進行內部校正或經過會計簽證等証明者';
            const a3Text = r.dqEfType || '5國家排放係數';
            const a1 = computeA1(a1Text);
            const a2 = computeA2(a2Text);
            const a3 = computeA3(a3Text);

            const err = a1 * a2 * a3;
            const pct = total > 0 ? (r.tco2e / total) * 100 : 0;
            const sr = getDQScoreRange(err);
            return [r.category, r.equipmentName, r.fuelName, a1Text, a1, a2Text, a2, a3Text, a3, err, pct.toFixed(2), sr, (sr * pct / 100).toFixed(4)];
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h6, ...d6]), '表六');
        // 表七 — 不確定性量化評估 (含 per-gas 展開 + 正負分開)
        const h7 = ['類別', '設備名稱', '原燃物料', '排放當量(tCO2e)', '佔比(%)',
            'AD不確定性(-%)', 'AD不確定性(+%)', 'AD來源',
            '氣體', 'EF不確定性(-%)', 'EF不確定性(+%)', 'EF來源',
            '單一排放源(-%)', '單一排放源(+%)',
            '95%CI下限(tCO2e)', '95%CI上限(tCO2e)'];
        const d7: (string | number)[][] = [];
        const uncItems: Array<{ emission: number; uncPos: number; uncNeg: number }> = [];
        sortedRows.forEach(r => {
            const activeGases = Object.keys(r.gases).filter(g => r.gases[g]);
            const adPos = r.adUncertainty ?? 5;
            const adNeg = r.adUncertaintyNeg ?? adPos;
            // Calculate per-gas data
            const gasData = activeGases.map(g => {
                const ef = (r.factors[g] || 0);
                const gwp = (r.gwpValues[g] ?? currentGWP[g] ?? 1);
                return {
                    gas: g,
                    emission: (r.totalAmount * ef * gwp) / 1000,
                    efPos: (r.efUncertainty || {})[g] ?? 10,
                    efNeg: (r.efUncertaintyNeg || {})[g] ?? ((r.efUncertainty || {})[g] ?? 10),
                };
            });
            const totalGasEm = gasData.reduce((s, ge) => s + ge.emission, 0);
            const wEfPos = totalGasEm > 0 ? Math.sqrt(gasData.reduce((s, ge) => s + Math.pow(ge.emission * ge.efPos / 100, 2), 0)) / totalGasEm * 100 : 10;
            const wEfNeg = totalGasEm > 0 ? Math.sqrt(gasData.reduce((s, ge) => s + Math.pow(ge.emission * ge.efNeg / 100, 2), 0)) / totalGasEm * 100 : 10;
            const srcUnc = calcSourceUncertaintyPN(adPos, adNeg, wEfPos, wEfNeg);
            const pct = total > 0 ? (r.tco2e / total) * 100 : 0;
            uncItems.push({ emission: r.tco2e, uncPos: srcUnc.pos, uncNeg: srcUnc.neg });
            // First gas row includes source-level info
            activeGases.forEach((g, idx) => {
                const gd = gasData.find(x => x.gas === g)!;
                if (idx === 0) {
                    d7.push([
                        r.category, r.equipmentName, r.fuelName, Number(r.tco2e.toFixed(4)), Number(pct.toFixed(2)),
                        adNeg, adPos, r.adUncertaintySource || '',
                        g, gd.efNeg, gd.efPos, ((r.efUncertaintySource || {})[g]) || '',
                        Number(srcUnc.neg.toFixed(2)), Number(srcUnc.pos.toFixed(2)),
                        Number((r.tco2e * (1 - srcUnc.neg / 100)).toFixed(4)),
                        Number((r.tco2e * (1 + srcUnc.pos / 100)).toFixed(4)),
                    ]);
                } else {
                    d7.push([
                        '', '', '', '', '',
                        '', '', '',
                        g, gd.efNeg, gd.efPos, ((r.efUncertaintySource || {})[g]) || '',
                        '', '', '', '',
                    ]);
                }
            });
        });
        // Overall totals
        const overallPos = calcOverallUncertainty(uncItems.map(i => ({ emission: i.emission, uncertainty: i.uncPos })));
        const overallNeg = calcOverallUncertainty(uncItems.map(i => ({ emission: i.emission, uncertainty: i.uncNeg })));
        d7.push([
            '全廠合計', '', '', Number(total.toFixed(4)), '100',
            '', '', '', '', '', '', '',
            Number(overallNeg.toFixed(2)), Number(overallPos.toFixed(2)),
            Number((total * (1 - overallNeg / 100)).toFixed(4)),
            Number((total * (1 + overallPos / 100)).toFixed(4)),
        ]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h7, ...d7]), '表七');
        // 表八
        const h8 = ['排放類別', '排放量(tCO2e)', '佔比(%)'];
        const d8 = sortedCats.map(c => [CATEGORY_LABELS[c] || c, catTotals[c], total > 0 ? ((catTotals[c] / total) * 100).toFixed(2) : '0']);
        d8.push(['合計', total, '100']);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h8, ...d8]), '表八');
        // 表九
        const s9 = [['九、全廠電力蒸汽供需'], ['台電購入(仟度)', supplementary.electricityPurchased],
        ['風力', supplementary.electricityRenewable.wind], ['水力', supplementary.electricityRenewable.hydro],
        ['地熱', supplementary.electricityRenewable.geothermal], ['潮汐', supplementary.electricityRenewable.tidal],
        ['其他再生', supplementary.electricityRenewable.other], ['核能', supplementary.electricityNuclear],
        ['外售電量', supplementary.electricitySold], ['外售對象', supplementary.electricitySoldTarget],
        [''], ['蒸汽產量(公噸)', supplementary.steamProduced], ['自用量', supplementary.steamSelfUsed],
        ['外售量', supplementary.steamSold], ['外售對象', supplementary.steamSoldTarget]];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s9), '表九');
        // 表十
        const h10a = ['製程編號', '製程代碼', '製程名稱', '操作時數(hr)', '操作日數(天)'];
        const d10a = supplementary.productionSchedules.map(p => [p.processNumber, p.processCode, p.processName, p.operatingHours, p.operatingDays]);
        const h10b = ['製程編號', '製程代碼', '製程名稱', '產品名稱', '產量', '單位'];
        const d10b = supplementary.products.map(p => [p.processNumber, p.processCode, p.processName, p.productName, p.quantity, p.unit]);
        const s10 = [['十、產製期程與產品產量'], h10a, ...d10a, [''], ['當年度產品產量'], h10b, ...d10b];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s10), '表十');
        // 表十一
        const h11 = ['製程編號', '製程代碼', '製程名稱', '設備編號', '設備代碼', '設備名稱', '原燃物料代碼', '原燃物料名稱', '直接/間接', '排放型式', '實驗室名稱', '認證資格', '參數類型', '參數數值', '參數單位', '檢測方法', '方法編號', '檢測日期', '檢測頻率', '頻率單位'];
        const d11 = supplementary.testingMethods.map(t => [t.processNumber, t.processCode, t.processName, t.equipmentNumber, t.equipmentCode, t.equipmentName, t.fuelCode, t.fuelName, t.directIndirect, t.emissionType, t.labName, t.labCertification, t.parameterType, t.parameterValue, t.parameterUnit, t.testMethod, t.testMethodCode, t.testDate, t.testFrequency, t.testFrequencyUnit]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([h11, ...d11]), '表十一');

        XLSX.writeFile(wb, `溫室氣體排放清冊_${baseline.companyName || '公司'}_${baseline.year || '年度'}.xlsx`);
    };

    return (
        <div>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>表八：排放量彙總儀表板</h2>
                <button className="btn btn-primary" onClick={handleExport}><Download size={16} /> 匯出官方清冊 Excel</button>
            </div>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="stat-card"><div className="value">{total.toFixed(2)}</div><div className="label">全廠排放 tCO2e</div></div>
                <div className="stat-card"><div className="value">{scope1.toFixed(2)}</div><div className="label">範疇一 (直接)</div></div>
                <div className="stat-card"><div className="value">{scope2.toFixed(2)}</div><div className="label">範疇二 (間接)</div></div>
                <div className="stat-card"><div className="value">{scope3456.toFixed(2)}</div><div className="label">範疇三~六</div></div>
            </div>
            {/* Category breakdown */}
            <div className="card">
                <h3>各類別排放佔比</h3>
                {sortedCats.map(cat => {
                    const val = catTotals[cat];
                    const pct = total > 0 ? (val / total) * 100 : 0;
                    return (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                            <span className="badge" style={{ background: CATEGORY_COLORS[cat] || '#888', minWidth: '36px', textAlign: 'center' }}>{cat}</span>
                            <span style={{ flex: 1, fontSize: '0.85rem' }}>{CATEGORY_LABELS[cat]}</span>
                            <div style={{ width: '200px', background: '#f1f5f9', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, background: CATEGORY_COLORS[cat], height: '100%', transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontWeight: 600, minWidth: '80px', textAlign: 'right' }}>{val.toFixed(4)}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', minWidth: '50px', textAlign: 'right' }}>{pct.toFixed(1)}%</span>
                        </div>
                    );
                })}
            </div>
            {/* Detail table */}
            <div className="card" style={{ overflowX: 'auto' }}>
                <h3>排放明細 (依類別排序)</h3>
                <table>
                    <thead>
                        <tr>
                            <th>類別</th><th>設備</th><th>原燃物料</th><th>活動數據</th><th>排放係數</th><th style={{ textAlign: 'right' }}>排放量</th><th style={{ textAlign: 'right' }}>佔比</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.map(r => (
                            <tr key={r.id}>
                                <td><span className="badge" style={{ background: CATEGORY_COLORS[r.category] }}>{r.category}</span></td>
                                <td>{r.equipmentName}</td>
                                <td>{r.fuelName}</td>
                                <td>{r.totalAmount > 0 ? `${r.totalAmount.toLocaleString()} ${r.unit}` : '—'}</td>
                                <td>{Object.keys(r.factors || {}).length > 0 ? Object.entries(r.factors || {}).map(([g, v]) => `${g}:${v}`).join(', ') : '—'}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.tco2e > 0 ? r.tco2e.toFixed(4) : '—'}</td>
                                <td style={{ textAlign: 'right' }}>{total > 0 && r.tco2e > 0 ? `${((r.tco2e / total) * 100).toFixed(1)}%` : '—'}</td>
                            </tr>
                        ))}
                        <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                            <td colSpan={5}>合計</td><td style={{ textAlign: 'right', color: 'var(--primary)' }}>{total.toFixed(4)}</td><td style={{ textAlign: 'right' }}>100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
