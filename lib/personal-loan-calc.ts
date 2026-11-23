import { IPersonalLoanDue } from "@/models/PersonalLoan";
import { LoanInterestType, LoanRepaymentFrequency } from "@/types/personal-loan";

export interface AmortizationScheduleResult {
    totalInterest: number;
    totalPayable: number;
    installmentAmount: number;
    dues: IPersonalLoanDue[];
}

export function generateAmortizationDues(
    loanAmount: number,
    interestRatePercent: number,
    interestType: LoanInterestType,
    repaymentFrequency: LoanRepaymentFrequency,
    tenureUnits: number,
    startDateInput: Date = new Date()
): AmortizationScheduleResult {
    const principal = Math.max(0, loanAmount);
    const tenure = Math.max(1, tenureUnits);
    const rate = Math.max(0, interestRatePercent);

    let totalInterest = 0;
    let installmentAmount = 0;
    const dues: IPersonalLoanDue[] = [];

    if (interestType === "FLAT") {
        // Flat rate calculation:
        // Annual rate % converted to tenure
        // If daily: tenure is in days
        // If weekly: tenure is in weeks
        // If monthly: tenure is in months
        let annualMultiplier = 1;
        if (repaymentFrequency === "DAILY") {
            annualMultiplier = tenure / 365;
        } else if (repaymentFrequency === "WEEKLY") {
            annualMultiplier = tenure / 52;
        } else {
            annualMultiplier = tenure / 12;
        }

        totalInterest = Math.round(principal * (rate / 100) * annualMultiplier);
        const totalPayable = principal + totalInterest;
        installmentAmount = Math.round(totalPayable / tenure);

        const principalPerInstallment = Math.round((principal / tenure) * 100) / 100;
        const interestPerInstallment = Math.round((totalInterest / tenure) * 100) / 100;

        let currentDate = new Date(startDateInput);
        let accumulatedPrincipal = 0;
        let accumulatedInterest = 0;

        for (let i = 1; i <= tenure; i++) {
            // Advance date based on frequency
            currentDate = new Date(currentDate);
            if (repaymentFrequency === "DAILY") {
                currentDate.setDate(currentDate.getDate() + 1);
                // Skip Sunday if daily
                if (currentDate.getDay() === 0) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            } else if (repaymentFrequency === "WEEKLY") {
                currentDate.setDate(currentDate.getDate() + 7);
            } else {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            const isLast = i === tenure;
            const p = isLast ? Math.round((principal - accumulatedPrincipal) * 100) / 100 : principalPerInstallment;
            const int = isLast ? Math.round((totalInterest - accumulatedInterest) * 100) / 100 : interestPerInstallment;
            const total = Math.round((p + int) * 100) / 100;

            accumulatedPrincipal += p;
            accumulatedInterest += int;

            dues.push({
                installmentNo: i,
                dueDate: new Date(currentDate),
                principalAmount: p,
                interestAmount: int,
                totalDue: total,
                paidAmount: 0,
                principalPaid: 0,
                interestPaid: 0,
                penaltyPaid: 0,
                remainingAmount: total,
                isPaid: false,
                paidAt: null,
                status: "PENDING",
            });
        }

        return {
            totalInterest,
            totalPayable,
            installmentAmount,
            dues,
        };
    } else {
        // Reducing Balance calculation (Standard EMI)
        // Periodic interest rate
        let r = 0;
        if (repaymentFrequency === "DAILY") {
            r = rate / 100 / 365;
        } else if (repaymentFrequency === "WEEKLY") {
            r = rate / 100 / 52;
        } else {
            r = rate / 100 / 12;
        }

        let emi = 0;
        if (r > 0) {
            emi = (principal * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
        } else {
            emi = principal / tenure;
        }
        installmentAmount = Math.round(emi);

        let balance = principal;
        let currentDate = new Date(startDateInput);

        for (let i = 1; i <= tenure; i++) {
            currentDate = new Date(currentDate);
            if (repaymentFrequency === "DAILY") {
                currentDate.setDate(currentDate.getDate() + 1);
                if (currentDate.getDay() === 0) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            } else if (repaymentFrequency === "WEEKLY") {
                currentDate.setDate(currentDate.getDate() + 7);
            } else {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            const interestForPeriod = Math.round(balance * r * 100) / 100;
            const principalForPeriod =
                i === tenure ? Math.round(balance * 100) / 100 : Math.round((emi - interestForPeriod) * 100) / 100;
            const total = Math.round((principalForPeriod + interestForPeriod) * 100) / 100;

            balance = Math.max(0, balance - principalForPeriod);
            totalInterest += interestForPeriod;

            dues.push({
                installmentNo: i,
                dueDate: new Date(currentDate),
                principalAmount: principalForPeriod,
                interestAmount: interestForPeriod,
                totalDue: total,
                paidAmount: 0,
                principalPaid: 0,
                interestPaid: 0,
                penaltyPaid: 0,
                remainingAmount: total,
                isPaid: false,
                paidAt: null,
                status: "PENDING",
            });
        }

        totalInterest = Math.round(totalInterest);
        const totalPayable = principal + totalInterest;

        return {
            totalInterest,
            totalPayable,
            installmentAmount,
            dues,
        };
    }
}

