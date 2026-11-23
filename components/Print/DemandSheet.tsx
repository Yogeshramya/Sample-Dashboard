"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Customer } from "@/types/customer";
import { Loan, Dues } from "@/types/fund";

/* ================= TYPES ================= */

interface RowData {
    client: Customer;
    loan: Loan | null;
    due?: Dues | null;
    nextDueNo: number | null;
    paidDues: number;
    totalDues: number;
    totalSavings: number;
}

interface Group {
    groupName: string;
    collectionDay: string;
    collectionTime: string;
}

interface Employee {
    name: string;
    branch?: {
        _id: string;
        name: string;
    };
}

/* ================= HELPERS ================= */

function getNextDueInfo(dues: Dues[]) {
    const paidCount = dues.filter((d) => d.paid).length;
    const nextDue = dues[paidCount];
    if (!nextDue) return { dueNo: null, due: null };
    return { dueNo: paidCount + 1, due: nextDue };
}

function formatManualDate(date: string) {
    if (!date) return "";
    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
}

/* ================= PAGE ================= */

export default function DemandSheetPrintPage() {
    const params = useSearchParams();

    const groupId = params.get("groupId");
    const employeeId = params.get("employee");
    const date = params.get("date");

    const [rows, setRows] = useState<RowData[]>([]);
    const [group, setGroup] = useState<Group | null>(null);
    const [employee, setEmployee] = useState<Employee | null>(null);

    const sheetDate = formatManualDate(date || "");

    /* ================= LOAD DATA ================= */

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            if (!groupId) return;

            try {
                const groupRes = await fetch(`/api/group/${groupId}`);
                const groupData = await groupRes.json();
                if (isMounted) setGroup(groupData);

                if (employeeId) {
                    const empRes = await fetch(`/api/employees/${employeeId}`);
                    const empData = await empRes.json();
                    if (isMounted) setEmployee(empData);
                }

                const clientRes = await fetch(`/api/clients?groupId=${groupId}&status=ACTIVE`);
                const clientData = await clientRes.json();

                const clients = clientData.clients || [];
                const finalRows: RowData[] = [];

                for (const client of clients) {
                    const loanRes = await fetch(
                        `/api/fund/customer?customerId=${client._id}`
                    );
                    const loanData = await loanRes.json();

                    const loan =
                        loanData?.loan?.status === "APPROVED" ? loanData.loan : null;

                    const savRes = await fetch(
                        `/api/fund/total-savings?clientId=${client._id}`
                    );
                    const savData = await savRes.json();

                    const totalSavings = Number(savData.totalSavings || 0);

                    if (!loan && totalSavings === 0) continue;

                    let due = null;
                    let nextDueNo = null;
                    let paidDues = 0;
                    let totalDues = 0;

                    if (loan) {
                        const next = getNextDueInfo(loan.dues);
                        due = next.due;
                        nextDueNo = next.dueNo;
                        paidDues = loan.dues.filter((d: Dues) => d.present).length;
                        totalDues = loan.dues.length;
                    }

                    finalRows.push({
                        client,
                        loan,
                        due,
                        nextDueNo,
                        paidDues,
                        totalDues,
                        totalSavings,
                    });
                }

                if (isMounted) {
                    setRows(finalRows);
                }
            } catch (error) {
                console.error("Failed to load demand sheet print data:", error);
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, [groupId, employeeId]);

    /* ================= TOTALS ================= */

    const totals = rows.reduce(
        (acc, r) => {
            let outstanding = 0;
            let principal = 0;
            let interest = 0;
            let savings = 0;
            let total = 0;

            if (r.loan) {
                const totalPrincipalInterest = r.loan.dues.reduce(
                    (sum, d) =>
                        sum + Number(d.principal || 0) + Number(d.interest || 0),
                    0
                );

                const paidPrincipalInterest = r.loan.dues
                    .filter((d) => d.paid)
                    .reduce(
                        (sum, d) =>
                            sum + Number(d.principal || 0) + Number(d.interest || 0),
                        0
                    );

                outstanding = totalPrincipalInterest - paidPrincipalInterest;

                principal = Number(r.due?.principal || 0);
                interest = Number(r.due?.interest || 0);
                savings = Number(r.due?.savings || 0);
                total = Number(r.due?.total || 0);
            }

            acc.outstanding += outstanding;
            acc.totalSavings += r.totalSavings;
            acc.principal += principal;
            acc.interest += interest;
            acc.savings += savings;
            acc.total += total;

            return acc;
        },
        {
            outstanding: 0,
            totalSavings: 0,
            principal: 0,
            interest: 0,
            savings: 0,
            total: 0,
        }
    );

    return (
        <div className="sheet-container mx-auto flex flex-col justify-between w-[297mm] h-[210mm] p-[5mm] box-border bg-white print:p-0 print:m-0 print:w-[287mm] print:h-[200mm]">

            {/* ================= PRINT STYLES ================= */}

            <style jsx global>{`
                @page {
                    size: A4 landscape;
                    margin: 5mm;
                }

                @media print {
                    html, body {
                        width: 297mm;
                        height: 210mm;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .sheet-container {
                        width: 100% !important;
                        height: 200mm !important;
                        max-height: 200mm !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                    }

                    button {
                        display: none !important;
                    }

                    .table-wrapper {
                        flex: 1 1 0% !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }

                    table {
                        width: 100% !important;
                        height: 100% !important;
                        font-size: 9px !important;
                        line-height: 1.2;
                    }

                    th, td {
                        padding: 1px 2px !important;
                    }

                    tbody tr {
                        height: calc(100% / ${rows.length || 1}) !important;
                    }

                    thead {
                        display: table-header-group;
                    }

                    tfoot {
                        display: table-footer-group;
                    }
                }
            `}</style>

            {/* ================= PRINT BUTTON ================= */}

            <div className="flex justify-end mb-2 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="px-6 py-1.5 border border-black text-black text-sm font-semibold hover:bg-black hover:text-white transition-colors"
                >
                    Print
                </button>
            </div>

            {/* ================= TOP HEADER ================= */}
            <div className="w-full shrink-0">
                <Image
                    src="/print/demand_header.png"
                    alt="Header"
                    width={1400}
                    height={180}
                    priority
                    className="w-full object-contain"
                />

                <div className="flex justify-between items-center text-[10px] md:text-xs font-semibold mt-1 mb-1 border-b border-black pb-0.5">
                    <p><span className="font-bold">BRANCH:</span> {employee?.branch?.name}</p>
                    <p><span className="font-bold">AREA:</span> {group?.groupName}</p>
                    <p><span className="font-bold">S.M:</span> {employee?.name}</p>
                    <p><span className="font-bold">DAY:</span> {group?.collectionDay}</p>
                    <p><span className="font-bold">TIME:</span> {group?.collectionTime}</p>
                    <p><span className="font-bold">DATE:</span> {sheetDate}</p>
                </div>
            </div>

            {/* ================= EXPANDED MIDDLE SECTION ================= */}
            <div className="table-wrapper w-full flex-1 flex flex-col min-h-0">
                <table className="w-full h-full table-fixed border border-black border-collapse text-center text-[10px]">
                    <thead className="bg-white font-bold shrink-0 h-6">
                        <tr>
                            <th className="border border-black p-0.5 w-[6%]">ID</th>
                            <th className="border border-black p-0.5 w-[9%]">LOAN</th>
                            <th className="border border-black p-0.5 w-[16%] text-left pl-1">NAME</th>
                            <th className="border border-black p-0.5 w-[11%]">PHONE</th>
                            <th className="border border-black p-0.5 w-[6%]">PRES.</th>
                            <th className="border border-black p-0.5 w-[5%]">DUE</th>
                            <th className="border border-black p-0.5 w-[9%]">OUTSTAND.</th>
                            <th className="border border-black p-0.5 w-[8%]">SAVINGS</th>
                            <th className="border border-black p-0.5 w-[6%]">PRIN.</th>
                            <th className="border border-black p-0.5 w-[6%]">INT.</th>
                            <th className="border border-black p-0.5 w-[6%]">SAV.</th>
                            <th className="border border-black p-0.5 w-[7%]">TOTAL</th>
                            <th className="border border-black p-0.5 w-[6%]">SIGN</th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((r) => {
                            let outstanding = 0;
                            let principal = 0;
                            let interest = 0;
                            let savings = 0;
                            let total = 0;

                            if (r.loan) {
                                const totalPrincipalInterest = r.loan.dues.reduce(
                                    (sum, d) =>
                                        sum +
                                        Number(d.principal || 0) +
                                        Number(d.interest || 0),
                                    0
                                );

                                const paidPrincipalInterest = r.loan.dues
                                    .filter((d) => d.paid)
                                    .reduce(
                                        (sum, d) =>
                                            sum +
                                            Number(d.principal || 0) +
                                            Number(d.interest || 0),
                                        0
                                    );

                                outstanding = totalPrincipalInterest - paidPrincipalInterest;

                                principal = Number(r.due?.principal || 0);
                                interest = Number(r.due?.interest || 0);
                                savings = Number(r.due?.savings || 0);
                                total = Number(r.due?.total || 0);
                            }

                            return (
                                <tr key={r.client._id} className="h-full">
                                    <td className="border border-black p-0.5 font-bold truncate">
                                        {r.client.customerCode}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold leading-tight">
                                        <div>{r.loan?.loanAmount || 0}</div>
                                        {r.loan && (
                                            <div className="text-[8px]">
                                                {new Date(r.loan.loanDate).toLocaleDateString("en-GB")}
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-black p-0.5 text-left pl-1 font-bold leading-tight">
                                        <div className="truncate">{r.client.name}</div>
                                        {r.client.nominee?.name && (
                                            <div className="text-[8px] truncate font-normal">
                                                {r.client.nominee.name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold leading-tight">
                                        <div className="truncate">{r.client.phone}</div>
                                        {r.client.nominee?.phone && (
                                            <div className="text-[8px] truncate font-normal">
                                                {r.client.nominee.phone}
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold">
                                        {r.paidDues}/{r.totalDues}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold">
                                        {r.nextDueNo ? r.nextDueNo : "-"}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold">
                                        {outstanding}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold">
                                        {r.totalSavings}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold">
                                        {principal}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold">
                                        {interest}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold">
                                        {savings}
                                    </td>
                                    <td className="border border-black p-0.5 font-bold">
                                        {total}
                                    </td>
                                    <td className="border border-black p-0.5"></td>
                                </tr>
                            );
                        })}
                    </tbody>

                    <tfoot className="font-bold bg-white shrink-0 h-5.5">
                        <tr>
                            <td colSpan={6} className="border border-black p-0.5 text-right pr-1">
                                TOTAL
                            </td>
                            <td className="border border-black p-0.5">{totals.outstanding}</td>
                            <td className="border border-black p-0.5">{totals.totalSavings}</td>
                            <td className="border border-black p-0.5">{totals.principal}</td>
                            <td className="border border-black p-0.5">{totals.interest}</td>
                            <td className="border border-black p-0.5">{totals.savings}</td>
                            <td className="border border-black p-0.5">{totals.total}</td>
                            <td className="border border-black p-0.5"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* ================= PINNED FOOTER ================= */}
            <div className="w-full shrink-0 pt-1">
                <Image
                    src="/print/demand_footer.png"
                    alt="Footer"
                    width={2000}
                    height={500}
                    priority
                    className="w-full object-contain"
                />
            </div>
        </div>
    );
}