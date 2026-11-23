import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import PersonalClient from "@/models/PersonalClient";
import User from "@/models/User";
import Group from "@/models/Group";
import Loan from "@/models/Loan";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "employee", select: "_id name", model: User },
    { path: "group", select: "_id groupName employee", model: Group },
];

/* ------------------------- GET ------------------------- */

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await context.params;

        let client: any = await Client.findById(id).populate(populateFields);
        if (!client) {
            // Check PersonalClient as fallback
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
                    joiningDate: pClient.createdAt ? new Date(pClient.createdAt).toISOString().split("T")[0] : "",
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
            return NextResponse.json(
                { success: false, error: "Client not found" },
                { status: 404 }
            );
        }

        // Branch check for non-admins
        if (!ctx.isAdmin) {
            const clientBranch = client.branch?._id || client.branch;
            const clientBranchStr = String(clientBranch);
            if (clientBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, error: "Client not found" },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json({ success: true, client });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 500 });
    }
}

/* ------------------------- PUT ------------------------- */

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await context.params;
        const data = await req.json();

        const client = await Client.findById(id);
        if (!client) {
            return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
        }

        if (!ctx.isAdmin) {
            const clientBranchStr = String(client.branch);
            if (clientBranchStr !== ctx.branchId) {
                return NextResponse.json(
                    { success: false, error: "Unauthorized action on client from another branch" },
                    { status: 403 }
                );
            }
            delete data.branch;
        }

        // Phone validation
        if (data.phone === data.nominee?.phone) {
            return NextResponse.json({
                success: false,
                message: "Customer and nominee phone cannot be same",
            }, { status: 400 });
        }

        // Duplicate check within the branch
        const duplicateClient = await Client.findOne({
            _id: { $ne: id },
            branch: client.branch,
            status: "APPROVED",
            $or: [
                { phone: data.phone },
                { "nominee.phone": data.phone },
                ...(data.nominee?.phone
                    ? [
                        { phone: data.nominee.phone },
                        { "nominee.phone": data.nominee.phone },
                    ]
                    : []),
            ],
        });

        if (duplicateClient) {
            return NextResponse.json({
                success: false,
                message: "Customer or Nominee phone already exists in this branch",
                conflictWith: {
                    customerId: duplicateClient._id,
                    customerCode: duplicateClient.customerCode,
                    name: duplicateClient.name,
                    phone: duplicateClient.phone,
                    nomineePhone: duplicateClient.nominee?.phone,
                },
            }, { status: 409 });
        }

        const updatedClient = await Client.findByIdAndUpdate(
            id,
            { ...data, updatedBy: ctx.userId },
            { new: true, runValidators: true }
        );

        return NextResponse.json({
            success: true,
            client: updatedClient,
        });

    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}

/* ------------------------- DELETE ------------------------- */

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { id } = await context.params;

        const client = await Client.findById(id);
        if (!client) {
            return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
        }

        if (!ctx.isAdmin && String(client.branch) !== ctx.branchId) {
            return NextResponse.json(
                { success: false, error: "Unauthorized action on client from another branch" },
                { status: 403 }
            );
        }

        /* -------- CHECK LOANS -------- */

        const loanExists = await Loan.exists({
            customer: id,
            status: "APPROVED",
        });

        if (loanExists) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Client cannot be deleted because an approved loan exists",
                },
                { status: 400 }
            );
        }

        /* -------- DELETE CLIENT -------- */

        await Client.findByIdAndDelete(id);

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error(err);

        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}
