import ApprovalForm from "@/components/Funds/ApprovalForm";
import PageHeader from "@/components/PageHeader";
import { connectDB } from "@/lib/db";
import Loan from "@/models/Loan";
import User from "@/models/User";
import Scheme from "@/models/Scheme";
import Client from "@/models/Client";
import Group from "@/models/Group";
import Branch from "@/models/Branch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import mongoose from "mongoose";

type ApprovalPageProps = {
    params: Promise<{
        loadId: string;
    }>;
};

const populateFields = [
    { path: "employee", select: "name", model: User },
    { path: "scheme", select: "schemeName", model: Scheme },
    { path: "customer", select: "customerCode name phone", model: Client },
    {
        path: "group",
        select: "_id groupName employee",
        model: Group,
        populate: {
            path: "employee",
            select: "name",
        },
    },
    { path: "branch", select: "name code", model: Branch },
];

export default async function ApprovalPage({ params }: ApprovalPageProps) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/login");
    }

    const { loadId } = await params;

    if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
        return (
            <div className="max-w-7xl mx-auto py-10">
                <PageHeader />
                <p className="text-center text-red-500 mt-20 font-semibold">
                    Invalid Loan ID
                </p>
            </div>
        );
    }

    await connectDB();
    void User;
    void Scheme;
    void Client;
    void Group;
    void Branch;

    const loan = await Loan.findById(loadId).populate(populateFields).lean();

    if (!loan) {
        return (
            <div className="max-w-7xl mx-auto py-10">
                <PageHeader />
                <p className="text-center text-red-500 mt-20 font-semibold">
                    Loan Not Found
                </p>
            </div>
        );
    }

    const serializedLoan = JSON.parse(JSON.stringify(loan));

    return (
        <div className="max-w-7xl mx-auto py-10">
            <PageHeader />
            <ApprovalForm loan={serializedLoan} />
        </div>
    );
}
