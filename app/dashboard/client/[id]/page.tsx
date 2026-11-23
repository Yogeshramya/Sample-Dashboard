import ClientDetails from "@/components/Clients/ClientDetails";
import PageHeader from "@/components/PageHeader";
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

const populateFields = [
    { path: "employee", select: "_id name", model: User },
    { path: "group", select: "_id groupName employee", model: Group },
    { path: "branch", select: "_id name code", model: Branch },
];

async function getClient(id: string) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

    try {
        await connectDB();
        void User;
        void Group;
        void Branch;

        let client = await Client.findById(id).populate(populateFields).lean();

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

        if (!client) return null;
        return JSON.parse(JSON.stringify(client));
    } catch (err) {
        console.error("getClient error:", err);
        return null;
    }
}

export default async function ClientViewPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/login");
    }

    const { id } = await params;
    const client = await getClient(id);

    if (!client) {
        return (
            <div className="p-6 text-center text-xl text-red-600 font-semibold">
                Client not found
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <PageHeader />
            <ClientDetails client={client} />
        </div>
    );
}
