import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

/* ─── Types ─── */
export interface DataRecord {
    id: number;
    [key: string]: string | number;
}

export interface EmissionSource {
    id: string;
    // 表三欄位
    processNumber: string;
    processCode: string;
    processName: string;
    equipmentNumber: string;
    equipmentCode: string;
    equipmentName: string;
    fuelCategory: string;
    fuelCode: string;
    fuelName: string;
    isBiomass: boolean;
    directIndirect: '直接' | '間接';
    emissionType: string;
    emissionSubType: string;
    gases: Record<string, boolean>;
    isCHP: boolean;
    // 表四欄位
    unit: string;
    otherUnitName: string;      // v1.5.5: 其他單位名稱
    totalAmount: number;
    energySupplier: string;     // v1.5.5: 電力/蒸汽供應商名稱
    fuelLHV: number;            // v1.5.5: 燃料低位熱值 (kcal/unit)
    // 表五欄位
    factors: Record<string, number>;
    gwpValues: Record<string, number>;
    factorSource: string;
    efHeatBasis: Record<string, number>;  // v1.5.5: 燃料單位熱值之排放係數
    efUnitConverted: Record<string, number>; // v1.5.5: 單位排放係數(換算後)
    efSource: string;           // v1.5.5: 排放係數來源
    efType: string;             // v1.5.5: 係數種類代碼
    // 表六欄位
    dataQuality: string;
    factorQuality: string;
    dqActivityError: number;    // v1.5.5: 活動數據誤差等級 A1
    dqCredibility: string;      // v1.5.5: 活動數據可信種類
    dqCalibrationError: number; // v1.5.5: 儀器校正誤差等級 A2
    dqCredibilityNote: string;  // v1.5.5: 數據可信度資訊說明
    dqResponsibleUnit: string;  // v1.5.5: 負責單位或保存單位
    dqEfType: string;           // v1.5.5: 排放係數種類
    dqEfError: number;          // v1.5.5: 排放係數參數誤差等級 A3
    // 表七 不確定性欄位
    adUncertainty: number;       // v1.6: 活動數據不確定性 (+%, 95% CI)
    adUncertaintyNeg: number;    // v1.6: 活動數據不確定性 (-%, 95% CI)
    adUncertaintySource: string; // v1.6: 活動數據不確定性來源
    adUncertaintyUnit: string;   // v1.6: 活動數據保存單位
    efUncertainty: Record<string, number>;       // v1.6: per-gas 排放係數不確定性 (+%)
    efUncertaintyNeg: Record<string, number>;    // v1.6: per-gas 排放係數不確定性 (-%)
    efUncertaintySource: Record<string, string>; // v1.6: per-gas 係數不確定性來源
    // 通用
    category: string;
    enabled: boolean;
    evidenceFiles: string[];
    evidenceRef: string;
    records: DataRecord[];
    note: string;
}

export const ALL_GHG_TYPES = ['CO2', 'CH4', 'N2O', 'HFCs', 'PFCs', 'SF6', 'NF3'] as const;

export const GWP_AR5: Record<string, number> = {
    CO2: 1, CH4: 28, N2O: 265, SF6: 23500, NF3: 16100,
    HFCs: 1530, PFCs: 7390,
};

export const GWP_AR6: Record<string, number> = {
    CO2: 1, CH4: 27.9, N2O: 273, SF6: 25200, NF3: 17400,
    HFCs: 1530, PFCs: 7390,
};

// Default = AR5 per 113年版指引要求, user can switch to AR6
export const DEFAULT_GWP = GWP_AR5;

export const getGWP = (version: 'AR5' | 'AR6'): Record<string, number> =>
    version === 'AR6' ? GWP_AR6 : GWP_AR5;

export const EMISSION_TYPES = ['固定燃燒', '移動燃燒', '製程排放', '逸散', '外購電力'] as const;

export const DQ_A1_OPTIONS = [
    '連續量測',
    '定期(間歇)量測/財務單據(非推估)',
    '財務會計推估',
    '自行評估'
];

export const DQ_A2_OPTIONS = [
    '(1)有進行外部校正或有多組數據茲佐證者',
    '(2)有進行內部校正或經過會計簽證等証明者',
    '(3)未進行儀器校正或未進行紀錄彙整者'
];

export const DQ_A3_OPTIONS = [
    '1自廠發展係數/質量平衡所得係數',
    '2同製程/設備經驗係數',
    '3製造廠提供係數',
    '4區域排放係數',
    '5國家排放係數',
    '6國際排放係數'
];

export const computeA1 = (desc: string): number => {
    if (desc === '連續量測') return 1;
    if (desc === '定期(間歇)量測/財務單據(非推估)') return 2;
    if (desc === '財務會計推估') return 3;
    if (desc === '自行評估') return 3;
    return 2; // Default fallback
};

export const computeA2 = (desc: string): number => {
    if (desc === '(1)有進行外部校正或有多組數據茲佐證者') return 1;
    if (desc === '(2)有進行內部校正或經過會計簽證等証明者') return 2;
    if (desc === '(3)未進行儀器校正或未進行紀錄彙整者') return 3;
    return 2; // Default fallback
};

export const computeA3 = (desc: string): number => {
    if (desc === '1自廠發展係數/質量平衡所得係數') return 1;
    if (desc === '2同製程/設備經驗係數') return 1;
    if (desc === '3製造廠提供係數') return 2;
    if (desc === '4區域排放係數') return 2;
    if (desc === '5國家排放係數') return 3;
    if (desc === '6國際排放係數') return 3;
    return 3; // Default fallback
};

// v1.5.5: 評分區間判定 (PDF 表2-4)
export const getDQScoreRange = (errorLevel: number): number => {
    if (errorLevel <= 10) return 1;
    if (errorLevel <= 18) return 2;
    return 3;
};

// v1.6: 不確定性計算 — 誤差傳播法
/** 單一排放源不確定性 = √(AD不確定性² + EF不確定性²)，正負分開計算 */
export const calcSourceUncertainty = (adPct: number, efPct: number): number =>
    Math.sqrt(adPct * adPct + efPct * efPct);

export const calcSourceUncertaintyPN = (
    adPos: number, adNeg: number, efPos: number, efNeg: number
): { pos: number; neg: number } => ({
    pos: Math.sqrt(adPos * adPos + efPos * efPos),
    neg: Math.sqrt(adNeg * adNeg + efNeg * efNeg),
});

/** 全廠整體不確定性 = √(Σ(排放量ᵢ × 不確定性ᵢ)²) / Σ排放量ᵢ，支援正負分開 */
export const calcOverallUncertainty = (
    items: Array<{ emission: number; uncertainty: number }>
): number => {
    const totalEmission = items.reduce((s, i) => s + i.emission, 0);
    if (totalEmission <= 0) return 0;
    const sumSq = items.reduce((s, i) => s + Math.pow(i.emission * i.uncertainty / 100, 2), 0);
    return (Math.sqrt(sumSq) / totalEmission) * 100;
};

// v1.5.5: SupplementaryData interface
export interface SupplementaryData {
    electricityPurchased: number;
    electricityRenewable: { wind: number; hydro: number; geothermal: number; tidal: number; other: number; otherNote: string; };
    electricityNuclear: number;
    electricitySold: number;
    electricitySoldTarget: string;
    steamProduced: number;
    steamSelfUsed: number;
    steamSold: number;
    steamSoldTarget: string;
    productionSchedules: Array<{ processNumber: string; processCode: string; processName: string; operatingHours: number; operatingDays: number; }>;
    products: Array<{ processNumber: string; processCode: string; processName: string; productName: string; quantity: number; unit: string; }>;
    testingMethods: Array<{ processNumber: string; processCode: string; processName: string; equipmentNumber: string; equipmentCode: string; equipmentName: string; fuelCode: string; fuelName: string; directIndirect: string; emissionType: string; labName: string; labCertification: string; parameterType: string; parameterValue: number; parameterUnit: string; testMethod: string; testMethodCode: string; testDate: string; testFrequency: string; testFrequencyUnit: string; }>;
}

export const defaultSupplementary: SupplementaryData = {
    electricityPurchased: 0, electricityRenewable: { wind: 0, hydro: 0, geothermal: 0, tidal: 0, other: 0, otherNote: '' },
    electricityNuclear: 0, electricitySold: 0, electricitySoldTarget: '',
    steamProduced: 0, steamSelfUsed: 0, steamSold: 0, steamSoldTarget: '',
    productionSchedules: [], products: [], testingMethods: [],
};

export interface BaselineInfo {
    year: string;
    controlId: string;
    companyName: string;
    taxId: string;
    factoryTaxId: string;
    responsible: string;
    contactPerson: string;
    contactPhone: string;
    contactEmail: string;
    contactFax: string;
    contactMobile: string;
    industryCode1: string;
    industryName1: string;
    industryCode2: string;
    industryName2: string;
    registrationReason: string;
    verificationBasis: string;
    isVerified: string;
    verifierName: string;
    note: string;
    // 表二
    certificateNumber: string;
    authority: string;
    city: string;
    district: string;
    zipCode: string;
    village: string;
    neighborhood: string;
    address: string;
    excludedSource1: string;
    excludedSource2: string;
    excludedSource3: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
    '1.1': '1.1 來自固定式燃燒源之直接排放',
    '1.2': '1.2 來自移動式燃燒源之直接排放',
    '1.3': '1.3 來自生產製程過程之直接排放',
    '1.4': '1.4 來自逸散排放源之直接排放',
    '1.5': '1.5 來自土地使用、土地使用變更及林業之直接排放',
    '2.1': '2.1 來自輸入電力的間接排放',
    '3.1': '3.1 由上游運輸及貨物配送產生之排放',
    '3.2': '3.2 由下游運輸與貨物配送產生之排放',
    '3.3': '3.3 員工通勤產生之排放',
    '3.4': '3.4 由客戶及訪客運輸所產生之排放',
    '3.5': '3.5 業務旅運產生之排放',
    '4.1': '4.1 組織採購原料之排放',
    '4.2': '4.2 資本財製造之排放',
    '4.3': '4.3 處置固體與液體廢棄物之排放',
    '4.4': '4.4 資本財租賃使用之排放',
    '4.5': '4.5 輔導清潔維護等服務之排放',
    '5.1': '5.1 產品使用階段之排放',
    '5.2': '5.2 客戶租賃使用之排放',
    '5.3': '5.3 產品廢棄處理之排放',
    '5.4': '5.4 投資所產生之排放',
    '6.1': '6.1 由其他來源產生的間接排放',
};

export const CATEGORY_COLORS: Record<string, string> = {
    '1.1': '#ef4444', '1.2': '#f97316', '1.3': '#a855f7', '1.4': '#06b6d4', '1.5': '#14b8a6',
    '2.1': '#059669',
    '3.1': '#8b5cf6', '3.2': '#6366f1', '3.3': '#3b82f6', '3.4': '#0ea5e9', '3.5': '#0284c7',
    '4.1': '#3b82f6', '4.2': '#2563eb', '4.3': '#78716c', '4.4': '#57534e', '4.5': '#a8a29e',
    '5.1': '#10b981', '5.2': '#059669', '5.3': '#047857', '5.4': '#064e3b',
    '6.1': '#64748b',
};

interface AppState {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    baseline: BaselineInfo;
    setBaseline: React.Dispatch<React.SetStateAction<BaselineInfo>>;
    sources: EmissionSource[];
    setSources: React.Dispatch<React.SetStateAction<EmissionSource[]>>;
    gwpVersion: 'AR5' | 'AR6';
    setGwpVersion: (v: 'AR5' | 'AR6') => void;
    supplementary: SupplementaryData;
    setSupplementary: React.Dispatch<React.SetStateAction<SupplementaryData>>;
}

const AppContext = createContext<AppState | undefined>(undefined);

const load = <T,>(key: string, def: T): T => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
};

const defaultBaseline: BaselineInfo = {
    year: '', controlId: '', companyName: '', taxId: '', factoryTaxId: '',
    responsible: '', contactPerson: '', contactPhone: '', contactEmail: '',
    contactFax: '', contactMobile: '',
    industryCode1: '', industryName1: '', industryCode2: '', industryName2: '',
    registrationReason: '', verificationBasis: '', isVerified: '', verifierName: '', note: '',
    certificateNumber: '', authority: '', city: '', district: '', zipCode: '',
    village: '', neighborhood: '', address: '',
    excludedSource1: '', excludedSource2: '', excludedSource3: '',
};

export const makeSource = (overrides: Partial<EmissionSource> & { id: string; category: string }): EmissionSource => ({
    processNumber: '', processCode: '', processName: '',
    equipmentNumber: '', equipmentCode: '', equipmentName: '',
    fuelCategory: '1.原燃物料', fuelCode: '', fuelName: '',
    isBiomass: false, directIndirect: '直接', emissionType: '固定燃燒', emissionSubType: '',
    gases: { CO2: true }, isCHP: false,
    unit: '', otherUnitName: '', totalAmount: 0, energySupplier: '', fuelLHV: 0,
    factors: {}, gwpValues: {},
    factorSource: '', efHeatBasis: {}, efUnitConverted: {}, efSource: '', efType: '5',
    dataQuality: 'invoice', factorQuality: 'national',
    dqActivityError: 2, dqCredibility: '2', dqCalibrationError: 2,
    dqCredibilityNote: '', dqResponsibleUnit: '', dqEfType: '5', dqEfError: 3,
    adUncertainty: 5, adUncertaintyNeg: 5, adUncertaintySource: '', adUncertaintyUnit: '',
    efUncertainty: {}, efUncertaintyNeg: {}, efUncertaintySource: {},
    enabled: true, evidenceFiles: [], evidenceRef: '', records: [], note: '',
    ...overrides,
});

const defaultSources: EmissionSource[] = [
    // ═══ 1.1 固定燃燒 (from Excel 固定-柴油/天然氣/液化石油氣 sheets) ═══
    makeSource({ id: 'fixed_diesel', category: '1.1', processName: '其他發電作業程序', equipmentName: '緊急發電機', fuelName: '柴油', unit: 'L', totalAmount: 262.4, factors: { CO2: 2.6356, CH4: 0.00027336, N2O: 0.8206 }, factorSource: '環境部 6.0.4版 → 柴油', gases: { CO2: true, CH4: true, N2O: true }, emissionType: '固定燃燒', directIndirect: '直接' }),
    makeSource({ id: 'fixed_ng_boiler', category: '1.1', processName: '蒸氣鍋爐程序', equipmentName: '蒸氣鍋爐-二廠', fuelName: '天然氣', unit: 'm³', totalAmount: 2187.98, factors: { CO2: 4.5783, CH4: 0.000475, N2O: 0.00223 }, factorSource: '環境部 6.0.4版 → 天然氣(8067kcal/m³)', gases: { CO2: true, CH4: true, N2O: true }, emissionType: '固定燃燒' }),
    makeSource({ id: 'fixed_ng_crucible', category: '1.1', processName: '金屬熔解程序', equipmentName: '坩鍋爐', fuelName: '天然氣', unit: 'm³', totalAmount: 28461, factors: { CO2: 4.5783, CH4: 0.000475, N2O: 0.00223 }, factorSource: '環境部 6.0.4版 → 天然氣(8985kcal/m³)', gases: { CO2: true, CH4: true, N2O: true }, emissionType: '固定燃燒' }),
    makeSource({ id: 'fixed_lpg_core', category: '1.1', processName: '砂心燒結程序', equipmentName: '芯子爐', fuelName: '液化石油氣', unit: 'L', totalAmount: 113486.832, factors: { CO2: 1.6513, CH4: 0.000296, N2O: 0.000296 }, factorSource: '環境部 6.0.4版 → 液化石油氣', gases: { CO2: true, CH4: true, N2O: true }, emissionType: '固定燃燒' }),
    makeSource({ id: 'fixed_lpg_mold1', category: '1.1', processName: '造模加熱程序', equipmentName: '造模設備-3廠', fuelName: '液化石油氣', unit: 'L', totalAmount: 383852.52, factors: { CO2: 1.6513, CH4: 0.000296, N2O: 0.000296 }, factorSource: '環境部 6.0.4版 → 液化石油氣', gases: { CO2: true, CH4: true, N2O: true }, emissionType: '固定燃燒' }),
    makeSource({ id: 'fixed_lpg_mold2', category: '1.1', processName: '造模加熱程序', equipmentName: '造模設備-1廠', fuelName: '液化石油氣', unit: 'L', totalAmount: 31709.556, factors: { CO2: 1.6513, CH4: 0.000296, N2O: 0.000296 }, factorSource: '環境部 6.0.4版 → 液化石油氣', gases: { CO2: true, CH4: true, N2O: true }, emissionType: '固定燃燒' }),
    // ═══ 1.2 移動燃燒 ═══
    makeSource({ id: 'mobile_gasoline', category: '1.2', processName: '交通運輸活動', equipmentName: '公務車-TPU125', fuelName: '車用汽油', unit: 'L', totalAmount: 52.5, factors: { CO2: 2.2631, CH4: 0.000816, N2O: 0.000816 }, factorSource: '環境部 6.0.4版 → 車用汽油', gases: { CO2: true, CH4: true, N2O: true }, emissionType: '移動燃燒' }),
    makeSource({ id: 'mobile_diesel', category: '1.2', processName: '交通運輸活動', equipmentName: '貨車', fuelName: '柴油', unit: 'L', gases: { CO2: true, CH4: true, N2O: true }, emissionType: '移動燃燒' }),
    // ═══ 1.3 製程排放 (from 製程原料表) ═══
    makeSource({ id: 'process_co2', category: '1.3', processName: '砂心製造程序', equipmentName: '造模設備', fuelName: '二氧化碳鋼瓶', unit: 'kg', totalAmount: 16650, factors: { CO2: 1 }, factorSource: '排放係數已考量原料與產生GHG成分的比例', gases: { CO2: true }, emissionType: '製程排放' }),
    makeSource({ id: 'process_methanol_ct', category: '1.3', processName: '呋喃塗模劑製程', equipmentName: '澆鑄成型設備', fuelName: '甲醇-成太化工', unit: 'kg', totalAmount: 30720, factors: { CO2: 1.375 }, factorSource: '燃燒反應式 2CH3OH+3O2→2CO2+4H2O', gases: { CO2: true }, emissionType: '製程排放' }),
    makeSource({ id: 'process_methanol_ql', category: '1.3', processName: '呋喃塗模劑製程', equipmentName: '澆鑄成型設備', fuelName: '甲醇-啟琳化工', unit: 'kg', totalAmount: 44800, factors: { CO2: 1.375 }, factorSource: '燃燒反應式 2CH3OH+3O2→2CO2+4H2O', gases: { CO2: true }, emissionType: '製程排放' }),
    makeSource({ id: 'process_coating_280p', category: '1.3', processName: '呋喃塗模劑製程', equipmentName: '澆鑄成型設備', fuelName: '塗模劑51ML 280P', unit: 'kg', totalAmount: 47000, factors: { CO2: 0.447 }, factorSource: '內含甲醇(30~35%)', gases: { CO2: true }, emissionType: '製程排放' }),
    makeSource({ id: 'process_coating_7919n', category: '1.3', processName: '呋喃塗模劑製程', equipmentName: '澆鑄成型設備', fuelName: '塗模劑5CML 7919N', unit: 'kg', totalAmount: 12500, factors: { CO2: 1.638 }, factorSource: '內含甲醇(15~25%)+異丙醇(<5%)', gases: { CO2: true }, emissionType: '製程排放' }),
    makeSource({ id: 'process_coating_2000', category: '1.3', processName: '呋喃塗模劑製程', equipmentName: '澆鑄成型設備', fuelName: '塗模劑5CML 2000', unit: 'kg', totalAmount: 5500, factors: { CO2: 1.913 }, factorSource: '內含甲醇(5~15%)+異丙醇(<10%)', gases: { CO2: true }, emissionType: '製程排放' }),
    makeSource({ id: 'process_carburizer_fg', category: '1.3', processName: '製程-熔解用', equipmentName: '其他熔融設施', fuelName: '加炭劑-福廣', unit: 'kg', totalAmount: 234000, factors: { CO2: 3.612 }, factorSource: 'SDS C>98.5%, 溶解損失20%', gases: { CO2: true }, emissionType: '製程排放' }),
    makeSource({ id: 'process_carburizer_jh', category: '1.3', processName: '製程-熔解用', equipmentName: '其他熔融設施', fuelName: '加炭劑-京華', unit: 'kg', totalAmount: 36000, factors: { CO2: 1.354 }, factorSource: 'SDS C>98.5%, 溶解損失20%', gases: { CO2: true }, emissionType: '製程排放' }),
    makeSource({ id: 'process_acetylene', category: '1.3', processName: '維修保養程序', equipmentName: '切割設施', fuelName: '乙炔', unit: 'kg', totalAmount: 936, factors: { CO2: 3.385 }, factorSource: '環境部 6.0.4版 → 乙炔', gases: { CO2: true }, emissionType: '製程排放' }),
    // ═══ 1.4 逸散 ═══
    makeSource({ id: 'fugitive_ext', category: '1.4', processName: '消防活動', equipmentName: '消防設施', fuelName: 'CO2滅火器', unit: 'kg', totalAmount: 0, factors: { CO2: 1 }, factorSource: '設備銘牌.採購明細', gases: { CO2: true }, emissionType: '逸散' }),
    makeSource({ id: 'fugitive_septic_factory', category: '1.4', processName: '水肥處理程序', equipmentName: '化糞池-二廠', fuelName: '甲烷', unit: '人小時', totalAmount: 415039.5, factors: { CH4: 0.0000366 }, factorSource: '環境部 6.0.4版 → 化糞池', gases: { CH4: true }, emissionType: '逸散' }),
    makeSource({ id: 'fugitive_septic_dorm1', category: '1.4', processName: '水肥處理程序', equipmentName: '化糞池-宿一', fuelName: '甲烷', unit: '人小時', totalAmount: 129392, factors: { CH4: 0.0000366 }, factorSource: '環境部 6.0.4版 → 化糞池', gases: { CH4: true }, emissionType: '逸散' }),
    makeSource({ id: 'fugitive_septic_dorm2', category: '1.4', processName: '水肥處理程序', equipmentName: '化糞池-宿二', fuelName: '甲烷', unit: '人小時', totalAmount: 129216, factors: { CH4: 0.0000366 }, factorSource: '環境部 6.0.4版 → 化糞池', gases: { CH4: true }, emissionType: '逸散' }),
    makeSource({ id: 'fugitive_refrig_r410a', category: '1.4', processName: '冷媒補充', equipmentName: '3F辦公室水冷式冰水機組', fuelName: '冷媒R410A', unit: 'kg', totalAmount: 3.458, factors: { HFCs: 1 }, gwpValues: { HFCs: 2256 }, factorSource: '維修保養紀錄', gases: { HFCs: true }, emissionType: '逸散' }),
    makeSource({ id: 'fugitive_refrig_r134a', category: '1.4', processName: '冷媒補充', equipmentName: '移動式冷凍設備', fuelName: '冷媒R134a', unit: 'kg', totalAmount: 1.091, factors: { HFCs: 1 }, gwpValues: { HFCs: 1530 }, factorSource: '維修保養紀錄', gases: { HFCs: true }, emissionType: '逸散' }),
    makeSource({ id: 'fugitive_refrig_r32', category: '1.4', processName: '冷媒補充', equipmentName: '分離式冷氣', fuelName: '冷媒R32', unit: 'kg', totalAmount: 4.619, factors: { HFCs: 1 }, gwpValues: { HFCs: 771 }, factorSource: '維修保養紀錄', gases: { HFCs: true }, emissionType: '逸散' }),
    makeSource({ id: 'fugitive_spray', category: '1.4', processName: '維修保養程序', equipmentName: '噴霧劑', fuelName: '防銹油WD-40', unit: 'kg', totalAmount: 28.84, factors: { CO2: 1 }, factorSource: '推進氣體CO2佔比2.5%', gases: { CO2: true }, emissionType: '逸散' }),
    // ═══ 2.1 外購電力 ═══
    makeSource({ id: 'electricity', category: '2.1', processName: '外購電力', equipmentName: '台電電錶', fuelName: '外購電力', unit: '度', totalAmount: 15576800, factors: { CO2: 0.474 }, factorSource: '經濟部能源署 113年度 (114.04.14公告)', gases: { CO2: true }, emissionType: '外購電力', directIndirect: '間接' }),
    // ═══ 4.1 組織採購 ═══
    makeSource({ id: 'water_factory', category: '4.1', processName: '自來水使用', equipmentName: '台灣自來水-二廠', fuelName: '自來水', unit: '度', totalAmount: 22525.6, factors: { CO2: 0.160 }, factorSource: '台灣自來水公司排放係數', gases: { CO2: true }, directIndirect: '間接', emissionType: '製程排放' }),
    makeSource({ id: 'water_dorm', category: '4.1', processName: '自來水使用', equipmentName: '台灣自來水-宿二', fuelName: '自來水', unit: '度', totalAmount: 10959.09, factors: { CO2: 0.160 }, factorSource: '台灣自來水公司排放係數', gases: { CO2: true }, directIndirect: '間接', emissionType: '製程排放' }),
    // ═══ 4.3 廢棄物 ═══
    makeSource({ id: 'waste_eps', category: '4.3', processName: '廢棄物清運', equipmentName: '廢棄物清運', fuelName: '保麗龍下腳料', unit: 't', totalAmount: 6.05, factors: { CO2: 21.295 }, factorSource: '再利用,柴油大貨車,延噸公里955.9tkm', gases: { CO2: true }, directIndirect: '間接', emissionType: '製程排放' }),
    makeSource({ id: 'waste_sand', category: '4.3', processName: '廢棄物清運', equipmentName: '廢棄物清運', fuelName: '廢砂', unit: 't', totalAmount: 3105.44, factors: { CO2: 21.295 }, factorSource: '再利用,柴油大貨車', gases: { CO2: true }, directIndirect: '間接', emissionType: '製程排放' }),
];

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [activeTab, setActiveTab] = useState<string>(() => load('ghg_tab', 'basic'));
    const [baseline, setBaseline] = useState<BaselineInfo>(() => ({ ...defaultBaseline, ...load('ghg_baseline', defaultBaseline) }));
    const [gwpVersion, setGwpVersion] = useState<'AR5' | 'AR6'>(() => load('ghg_gwp_version', 'AR5' as 'AR5' | 'AR6'));
    const [supplementary, setSupplementary] = useState<SupplementaryData>(() => ({ ...defaultSupplementary, ...load('ghg_supplementary', defaultSupplementary) }));
    const [sources, setSources] = useState<EmissionSource[]>(() => {
        const saved = load('ghg_sources', defaultSources);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return saved.map((s: any) => {
            // Migrate v1.0 gases array ['CO2','CH4'] → v1.5 object { CO2: true, CH4: true }
            let migratedGases = s.gases;
            if (Array.isArray(s.gases)) {
                migratedGases = {};
                s.gases.forEach((g: string) => { migratedGases[g] = true; });
            }
            return { ...makeSource({ id: s.id, category: s.category }), ...s, gases: migratedGases };
        });
    });

    useEffect(() => { localStorage.setItem('ghg_tab', JSON.stringify(activeTab)); }, [activeTab]);
    useEffect(() => { localStorage.setItem('ghg_baseline', JSON.stringify(baseline)); }, [baseline]);
    useEffect(() => { localStorage.setItem('ghg_sources', JSON.stringify(sources)); }, [sources]);
    useEffect(() => { localStorage.setItem('ghg_gwp_version', JSON.stringify(gwpVersion)); }, [gwpVersion]);
    useEffect(() => { localStorage.setItem('ghg_supplementary', JSON.stringify(supplementary)); }, [supplementary]);


    return (
        <AppContext.Provider value={{ activeTab, setActiveTab, baseline, setBaseline, sources, setSources, gwpVersion, setGwpVersion, supplementary, setSupplementary }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext must be used within AppProvider');
    return ctx;
};
