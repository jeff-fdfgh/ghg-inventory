import { useAppContext } from '../AppContext';

export const P0_BasicInfo = () => {
    const { baseline, setBaseline } = useAppContext();
    const u = (field: string, value: string) => setBaseline(prev => ({ ...prev, [field]: value }));

    const inputClasses = "w-full px-4 py-3 bg-[#e5e6ff] rounded-xl border-none focus:ring-2 focus:ring-primary/20 font-label text-sm text-on-surface transition-all";
    const labelClasses = "block font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2";

    return (
        <div>
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary-container opacity-20"></div>
                <h2 className="text-2xl font-extrabold text-primary tracking-tighter mb-8">表一：事業基本資料</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className={labelClasses}>盤查年度(民國)</label>
                        <input type="text" className={inputClasses} value={baseline.year} onChange={e => u('year', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>管制編號</label>
                        <input type="text" className={inputClasses} value={baseline.controlId} onChange={e => u('controlId', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>事業名稱</label>
                        <input type="text" className={inputClasses} value={baseline.companyName} onChange={e => u('companyName', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>統一編號(總公司統編)</label>
                        <input type="text" className={inputClasses} value={baseline.taxId} onChange={e => u('taxId', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>工廠統一編號</label>
                        <input type="text" className={inputClasses} value={baseline.factoryTaxId} onChange={e => u('factoryTaxId', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>負責人姓名</label>
                        <input type="text" className={inputClasses} value={baseline.responsible} onChange={e => u('responsible', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>聯絡人姓名</label>
                        <input type="text" className={inputClasses} value={baseline.contactPerson} onChange={e => u('contactPerson', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>聯絡人電話</label>
                        <input type="text" className={inputClasses} value={baseline.contactPhone} onChange={e => u('contactPhone', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>聯絡人電子信箱</label>
                        <input type="text" className={inputClasses} value={baseline.contactEmail} onChange={e => u('contactEmail', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>聯絡人傳真*</label>
                        <input type="text" className={inputClasses} value={baseline.contactFax} onChange={e => u('contactFax', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>聯絡人手機</label>
                        <input type="text" className={inputClasses} value={baseline.contactMobile} onChange={e => u('contactMobile', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>行業代碼1</label>
                        <input type="text" className={inputClasses} value={baseline.industryCode1} onChange={e => u('industryCode1', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>行業名稱1</label>
                        <input type="text" className={inputClasses} value={baseline.industryName1} onChange={e => u('industryName1', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>行業代碼2*</label>
                        <input type="text" className={inputClasses} value={baseline.industryCode2} onChange={e => u('industryCode2', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>行業名稱2*</label>
                        <input type="text" className={inputClasses} value={baseline.industryName2} onChange={e => u('industryName2', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClasses}>登錄原因</label>
                        <select className={inputClasses} value={baseline.registrationReason} onChange={e => u('registrationReason', e.target.value)}>
                            <option value="">請選擇</option>
                            <option value="依法盤查登錄">依法盤查登錄</option>
                            <option value="自願性登錄">自願性登錄</option>
                            <option value="環評承諾">環評承諾</option>
                            <option value="依法登錄">依法登錄</option>
                            <option value="其他">其他</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>盤查依據規範</label>
                        <select className={inputClasses} value={baseline.verificationBasis} onChange={e => u('verificationBasis', e.target.value)}>
                            <option value="">請選擇</option>
                            <option value="溫室氣體排放量盤查登錄管理辦法/溫室氣體盤查登錄作業指引">溫室氣體排放量盤查登錄管理辦法/盤查登錄作業指引</option>
                            <option value="ISO / CNS 14064-1">ISO / CNS 14064-1</option>
                            <option value="溫室氣體盤查議定書-企業會計與報告標準">溫室氣體盤查議定書-企業會計與報告標準</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>是否經查驗機構查驗</label>
                        <select className={inputClasses} value={baseline.isVerified} onChange={e => u('isVerified', e.target.value)}>
                            <option value="">請選擇</option>
                            <option value="是">是</option>
                            <option value="否">否</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>查驗機構名稱</label>
                        <select className={inputClasses} value={baseline.verifierName} onChange={e => u('verifierName', e.target.value)}>
                            <option value="">請選擇</option>
                            <option>立恩威國際驗證股份有限公司(DNV)</option>
                            <option>台灣德國北德技術監護顧問股份有限公司(TUV NORD)</option>
                            <option>台灣德國萊因技術監護顧問股份有限公司(TUVRh)</option>
                            <option>台灣衛理國際品保驗證股份有限公司(BV)</option>
                            <option>台灣檢驗科技股份有限公司(SGS)</option>
                            <option>英商勞盛股份有限公司台灣分公司(LRQA)</option>
                            <option>亞瑞仕國際驗證股份有限公司(ARES)</option>
                            <option>法標國際認證股份有限公司(AFNOR)</option>
                            <option>新加坡商英國標準協會集團私人有限公司臺灣分公司(BSI)</option>
                            <option>無</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClasses}>備註*</label>
                        <input type="text" className={inputClasses} value={baseline.note} onChange={e => u('note', e.target.value)} />
                    </div>
                </div>

                <div className="mt-12">
                    <button
                        className="px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-xl flex items-center justify-center shadow-xl shadow-primary/10 transition-transform hover:-translate-y-1"
                        onClick={() => { localStorage.setItem('ghg_baseline', JSON.stringify(baseline)); alert('已保存！'); }}
                    >
                        保存基本資料
                    </button>
                </div>
            </div>
        </div>
    );
};
