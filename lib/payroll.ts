/**
 * Payroll calculation and utility helpers for Sample Small Finance Pvt Ltd
 */

const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
];

const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
];

function convertBelowThousand(n: number): string {
    let str = "";
    if (n >= 100) {
        str += ones[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
    }
    if (n >= 20) {
        str += tens[Math.floor(n / 10)] + " ";
        n %= 10;
    }
    if (n > 0) {
        str += ones[n] + " ";
    }
    return str.trim();
}

/**
 * Converts any number to Indian numbering system words
 * e.g. 17723 -> "Rupees Seventeen Thousand Seven Hundred and Twenty Three Only"
 */
export function numberToIndianWords(amount: number): string {
    if (!amount || isNaN(amount) || amount === 0) {
        return "Rupees Zero Only";
    }

    const rounded = Math.round(amount);
    let n = Math.abs(rounded);
    let result = "";

    const crore = Math.floor(n / 10000000);
    n %= 10000000;

    const lakh = Math.floor(n / 100000);
    n %= 100000;

    const thousand = Math.floor(n / 1000);
    n %= 1000;

    const remainder = n;

    if (crore > 0) {
        result += convertBelowThousand(crore) + " Crore ";
    }
    if (lakh > 0) {
        result += convertBelowThousand(lakh) + " Lakh ";
    }
    if (thousand > 0) {
        result += convertBelowThousand(thousand) + " Thousand ";
    }
    if (remainder > 0) {
        result += convertBelowThousand(remainder) + " ";
    }

    result = result.trim();
    return `Rupees ${result} Only`.replace(/\s+/g, " ");
}

/**
 * Formats a number to standard Indian Rupee format
 * e.g. 17723 -> ₹17,723.00
 */
export function formatCurrencyINR(val: number | string | undefined | null): string {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(num);
}

/**
 * Pure numeric string formatter without currency symbol
 * e.g. 17723.5 -> "17,723.50"
 */
export function formatNumberINR(val: number | string | undefined | null): string {
    const num = Number(val) || 0;
    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(num);
}

/**
 * Calculates standard payroll parameters
 */
export interface SalaryCalculationInput {
    basic: number;
    hra: number;
    da: number;
    travelling: number;
    increment?: number;
    overtime?: number;
    bonus?: number;
    incentive?: number;
    totalDays: number;
    absentDays: number;
    includePF?: boolean;
    pfAmount?: number;
    includeESI?: boolean;
    esiAmount?: number;
    staffDeposit?: number;
    advance?: number;
    penalty?: number;
    personalLoan?: number;
    otherDeductions?: number;
    professionalTax?: number;
}

export function calculatePayroll(input: SalaryCalculationInput) {
    const basic = Number(input.basic) || 0;
    const hra = Number(input.hra) || 0;
    const da = Number(input.da) || 0;
    const travelling = Number(input.travelling) || 0;
    const increment = Number(input.increment) || 0;
    const overtime = Number(input.overtime) || 0;
    const bonus = Number(input.bonus) || 0;
    const incentive = Number(input.incentive) || 0;

    const totalDays = Number(input.totalDays) > 0 ? Number(input.totalDays) : 30;
    const absentDays = Number(input.absentDays) || 0;

    // Total Gross Earnings
    const totalEarnings =
        basic + hra + da + travelling + increment + overtime + bonus + incentive;

    // Daily Salary
    const dailySalary = totalEarnings > 0 ? totalEarnings / totalDays : 0;

    // Leave / LOP Deduction
    const lop = Math.round(dailySalary * absentDays * 100) / 100;

    // Statutory PF: 12% of Basic
    let pf = 0;
    if (input.includePF !== false) {
        pf = input.pfAmount !== undefined ? Number(input.pfAmount) : Math.round(basic * 0.12);
    }

    // Statutory ESI: 0.75% of Gross (Standard employee ESIC contribution in India)
    let esi = 0;
    if (input.includeESI !== false) {
        esi =
            input.esiAmount !== undefined
                ? Number(input.esiAmount)
                : Math.round(totalEarnings * 0.0075);
    }

    const staffDeposit = input.staffDeposit !== undefined ? Number(input.staffDeposit) : 500;
    const advance = Number(input.advance) || 0;
    const penalty = Number(input.penalty) || 0;
    const personalLoan = Number(input.personalLoan) || 0;
    const otherDeductions = Number(input.otherDeductions) || 0;
    const professionalTax = Number(input.professionalTax) || 0;

    const totalDeductions =
        Math.round(
            (lop +
                pf +
                esi +
                staffDeposit +
                advance +
                penalty +
                personalLoan +
                otherDeductions +
                professionalTax) *
                100
        ) / 100;

    const netSalary = Math.max(0, Math.round((totalEarnings - totalDeductions) * 100) / 100);
    const amountInWords = numberToIndianWords(Math.round(netSalary));

    return {
        totalEarnings,
        dailySalary: Math.round(dailySalary * 100) / 100,
        lop,
        pf,
        esi,
        staffDeposit,
        advance,
        penalty,
        personalLoan,
        otherDeductions,
        professionalTax,
        totalDeductions,
        netSalary,
        amountInWords,
    };
}
