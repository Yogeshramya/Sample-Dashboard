import ClientApprovalActions from "@/components/Clients/ClientActions";
import ClientDetails from "@/components/Clients/ClientDetails";
import PageHeader from "@/components/PageHeader";
import React from "react";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import PersonalClient from "@/models/PersonalClient";
import User from "@/models/User";
import Group from "@/models/Group";
import Branch from "@/models/Branch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import mongoose from "mongoose";

export default async function ClientApprovalView({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return (
            <main className="p-6 space-y-6">
                <PageHeader />
                <p className="p-6 text-center text-red-600 font-semibold">
                    Client not found or invalid ID
                </p>
            </main>
        );
    }

    await connectDB();
    void User;
    void Group;
    void Branch;

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/login");
    }

    const role = (session.user as { role?: string })?.role || "";
    const isAdmin = ["ADMINISTRATOR", "ADMIN", "SUPER_ADMIN", "ACCOUNTS_HEAD"].includes(role);

    const populateFields = [
        { path: "employee", select: "_id name", model: User },
        { path: "group", select: "_id groupName employee", model: Group },
        { path: "branch", select: "_id name code", model: Branch },
    ];

    // 1. Try finding in MFI Client collection first
    let client = await Client.findById(id).populate(populateFields).lean();

    // 2. If not found in Client, check PersonalClient collection as fallback
    if (!client) {
        const pClient = await PersonalClient.findById(id).populate("branchId", "name code").lean();
        if (pClient) {
            client = {
                _id: String(pClient._id),
                customerCode: pClient.clientId,
                name: pClient.fullName,
                phone: pClient.mobile,
                dob: "",
                age: "",
                gender: "—",
                aadhar: pClient.idProofNumber || "—",
                joiningDate: pClient.createdAt
                    ? new Date(pClient.createdAt).toISOString().split("T")[0]
                    : "",
                doorStreet: pClient.address || "",
                area: "",
                city: "",
                district: "",
                state: "",
                postalCode: "",
                memberPhoto: pClient.panPhotoUrl,
                memberAadhaarFront: pClient.idProofFrontUrl,
                memberAadhaarBack: pClient.idProofBackUrl,
                occupation: pClient.occupation,
                employee: null,
                group: null,
                branch: pClient.branchId,
                status: pClient.status,
                nominee: {
                    name: pClient.guarantorName || "—",
                    phone: pClient.guarantorMobile || "—",
                    relation: pClient.guarantorRelation || "—",
                    dob: "",
                    age: "",
                    gender: "",
                    aadhar: pClient.guarantorAadhaar || "",
                    occupation: "",
                },
                createdAt: pClient.createdAt ? String(pClient.createdAt) : "",
            };
        }
    }

    if (!client) {
        return (
            <main className="p-6 space-y-6">
                <PageHeader />
                <p className="p-6 text-center text-red-600 font-semibold">
                    Client not found or access denied
                </p>
            </main>
        );
    }

    // Branch authorization check for non-admin users
    if (!isAdmin) {
        const userBranchObj =
            (session.user as { activeBranch?: { _id?: string } })?.activeBranch ||
            (session.user as { branch?: { _id?: string } })?.branch;
        const userBranchId =
            typeof userBranchObj === "object" && userBranchObj !== null
                ? String(userBranchObj._id || "")
                : String(userBranchObj || "");

        const clientBranchId =
            client.branch && typeof client.branch === "object"
                ? String((client.branch as { _id?: unknown })._id || "")
                : String(client.branch || "");

        if (userBranchId && clientBranchId && userBranchId !== clientBranchId) {
            return (
                <main className="p-6 space-y-6">
                    <PageHeader />
                    <p className="p-6 text-center text-red-600 font-semibold">
                        Client not found or access denied
                    </p>
                </main>
            );
        }
    }

    const serializedClient = JSON.parse(JSON.stringify(client));

    return (
        <main className="p-6 space-y-6">
            <PageHeader />
            <ClientDetails client={serializedClient} />
            {serializedClient.status === "PENDING" && (
                <ClientApprovalActions clientId={String(serializedClient._id)} />
            )}
        </main>
    );
}
