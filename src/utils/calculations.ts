import { type EmissionSource, GWP_AR5 } from '../AppContext';

/** Calculate emission for a source using specified GWP table: Σ(AD × EF[gas] × GWP[gas]) / 1000 → tCO2e */
export const calcEmission = (s: EmissionSource, gwpTable?: Record<string, number>): number => {
    if (!s.totalAmount) return 0;
    const gwp = gwpTable || GWP_AR5;
    let total = 0;
    for (const gas of Object.keys(s.gases)) {
        if (!s.gases[gas]) continue;
        const ef = (s.factors || {})[gas] || 0;
        const gw = (s.gwpValues || {})[gas] || gwp[gas] || 1;
        total += s.totalAmount * ef * gw;
    }
    return total / 1000;
};

/** Calculate per-gas breakdown */
export const calcPerGas = (s: EmissionSource, gwpTable?: Record<string, number>): Record<string, number> => {
    const result: Record<string, number> = {};
    if (!s.totalAmount) return result;
    const gwp = gwpTable || GWP_AR5;
    for (const gas of Object.keys(s.gases)) {
        if (!s.gases[gas]) continue;
        const ef = (s.factors || {})[gas] || 0;
        const gw = (s.gwpValues || {})[gas] || gwp[gas] || 1;
        result[gas] = (s.totalAmount * ef * gw) / 1000;
    }
    return result;
};

/** Sort category keys numerically */
export const sortCategories = (keys: string[]): string[] =>
    [...keys].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
