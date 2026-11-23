import { PlanFrequency } from "@/types/personal";

export type SchemeType = "STANDARD" | "CUSTOM";

export interface SchemeBenefitInput {
    frequency: PlanFrequency;
    installmentAmount: number;
    durationMonths?: number;
    benefitMonths?: number;
    benefitWeeks?: number;
    benefitDays?: number;
}

export interface SchemeCalculationResult {
    durationMonths: number;
    benefitMonths: number;
    benefitWeeks: number;
    benefitDays: number;
    totalInstallments: number;
    totalContribution: number;
    benefitAmount: number;
    maturityAmount: number;
    benefitDescriptionText: string;
}

/**
 * Calculates total installments, contribution, benefit amount and maturity amount
 * based on collection frequency, installment, duration and custom benefit periods (months, weeks, days).
 */
export function calculatePersonalSchemeValues(input: SchemeBenefitInput): SchemeCalculationResult {
    const durationMonths = Math.max(1, Number(input.durationMonths) || 12);
    const installment = Math.max(0, Number(input.installmentAmount) || 0);
    const months = Math.max(0, Number(input.benefitMonths ?? 2));
    const weeks = Math.max(0, Number(input.benefitWeeks ?? 0));
    const days = Math.max(0, Number(input.benefitDays ?? 0));

    let totalInstallments = 0;
    let totalContribution = 0;
    let benefitAmount = 0;

    if (input.frequency === "DAILY") {
        // Daily: 30 days = 1 month
        totalInstallments = durationMonths * 30;
        totalContribution = installment * totalInstallments;
        const totalBenefitDays = (months * 30) + (weeks * 7) + days;
        benefitAmount = Math.round(totalBenefitDays * installment);
    } else if (input.frequency === "WEEKLY") {
        // Weekly: 52 weeks in 12 months (~4.333 weeks / month)
        totalInstallments = Math.round((52 / 12) * durationMonths);
        totalContribution = installment * totalInstallments;
        const totalBenefitWeeks = (months * (52 / 12)) + weeks + (days / 7);
        benefitAmount = Math.round(totalBenefitWeeks * installment);
    } else {
        // Monthly: 1 installment per month. 30 days = 1 month for week/day prorating
        totalInstallments = durationMonths;
        totalContribution = installment * totalInstallments;
        const totalBenefitMonths = months + (weeks * 7 / 30) + (days / 30);
        benefitAmount = Math.round(totalBenefitMonths * installment);
    }

    const maturityAmount = totalContribution + benefitAmount;

    // Human-readable summary of the benefit period
    const parts: string[] = [];
    if (months > 0) parts.push(`${months} Month${months > 1 ? "s" : ""}`);
    if (weeks > 0) parts.push(`${weeks} Week${weeks > 1 ? "s" : ""}`);
    if (days > 0) parts.push(`${days} Day${days > 1 ? "s" : ""}`);
    const benefitDescriptionText = parts.length > 0 ? parts.join(" + ") : "0 Benefit";

    return {
        durationMonths,
        benefitMonths: months,
        benefitWeeks: weeks,
        benefitDays: days,
        totalInstallments,
        totalContribution,
        benefitAmount,
        maturityAmount,
        benefitDescriptionText,
    };
}

/**
 * Returns a human-friendly benefit label for a scheme object
 */
export function formatSchemeBenefitLabel(scheme?: {
    benefitMonths?: number;
    benefitWeeks?: number;
    benefitDays?: number;
}): string {
    if (!scheme) return "2 Months";
    const months = scheme.benefitMonths;
    const weeks = scheme.benefitWeeks || 0;
    const days = scheme.benefitDays || 0;

    // If undefined (legacy scheme), default to 2 Months
    if (months === undefined && weeks === 0 && days === 0) {
        return "2 Months";
    }

    const m = months ?? 0;
    const parts: string[] = [];
    if (m > 0) parts.push(`${m} Mo${m > 1 ? "s" : ""}`);
    if (weeks > 0) parts.push(`${weeks} Wk${weeks > 1 ? "s" : ""}`);
    if (days > 0) parts.push(`${days} Day${days > 1 ? "s" : ""}`);

    return parts.length > 0 ? parts.join(" + ") : "0 Benefit";
}

