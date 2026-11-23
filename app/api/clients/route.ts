import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import User from "@/models/User";
import Group from "@/models/Group";
import mongoose from "mongoose";
import { getTodayIST, parseISTDate } from "@/lib/ist";
import { getBranchContext, unauthorizedBranchResponse } from "@/lib/branch";

const populateFields = [
    { path: "employee", select: "name", model: User },
    {
        path: "group",
        select: "groupName employee createdBy",
        model: Group,
        populate: [
            { path: "employee", select: "name", model: User },
            { path: "createdBy", select: "name", model: User },
        ],
    },
];

type Condition =
    | { [field: string]: { $regex: string; $options: string } }
    | { [field: string]: string }
    | { [field: string]: number };

interface ClientQuery {
    branch?: mongoose.Types.ObjectId | string;
    $or?: Condition[] | Array<Record<string, unknown>>;
    $and?: Array<Record<string, unknown>>;
    group?: string | { $in: mongoose.Types.ObjectId[] };
    createdAt?: { $gte?: Date; $lte?: Date };
    status?: string | { $in?: string[]; $nin?: string[]; $ne?: string };
}

/* ================= GET CLIENTS ================= */

export async function GET(req: Request) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        const { searchParams } = new URL(req.url);

        const search = searchParams.get("search");
        const groupId = searchParams.get("groupId");
        const today = searchParams.get("today");
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const status = searchParams.get("status");

        const query: ClientQuery = {};

        // Strict branch scoping: matches direct branch OR group's branch
        if (ctx.branchObjectId) {
            const branchGroups = await Group.find({ branch: ctx.branchObjectId }).select("_id").lean();
            const groupIds = branchGroups.map((g) => g._id);

            if (groupIds.length > 0) {
                query.$or = [
                    { branch: ctx.branchObjectId },
                    { group: { $in: groupIds } },
                ];
            } else {
                query.branch = ctx.branchObjectId;
            }
        }

        /* ---------- SEARCH ---------- */

        if (search) {
            const searchConditions = [
                { name: { $regex: search, $options: "i" } },
                { customerCode: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ];

            if (query.$or) {
                query.$and = [
                    { $or: query.$or },
                    { $or: searchConditions },
                ];
                delete query.$or;
            } else {
                query.$or = searchConditions;
            }
        }

        if (groupId) query.group = groupId;

        if (today === "true") {
            const start = new Date();
            start.setUTCHours(0, 0, 0, 0);

            const end = new Date();
            end.setUTCHours(23, 59, 59, 999);

            query.createdAt = { $gte: start, $lte: end };
        }

        if (from && to) {
            const startDate = new Date(from);
            const endDate = new Date(to);
            endDate.setUTCHours(23, 59, 59, 999);

            query.createdAt = {
                $gte: startDate,
                $lte: endDate,
            };
        }

        if (status) {
            if (status === "ACTIVE") {
                // Active clients include approved clients and clients pending activation, excluding rejected or closed
                query.status = { $nin: ["REJECTED", "CLOSED"] };
            } else {
                query.status = status;
            }
        }

        const clients = await Client.find(query)
            .populate(populateFields)
            .lean();

        return NextResponse.json({
            success: true,
            count: clients.length,
            clients,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, error },
            { status: 500 }
        );
    }
}

/* ================= CREATE CLIENT ================= */

export async function POST(req: Request) {
    try {
        await connectDB();

        const ctx = await getBranchContext(req);
        const unauth = unauthorizedBranchResponse(ctx);
        if (unauth) return unauth;

        if (!ctx.branchObjectId) {
            return NextResponse.json(
                { success: false, error: "A valid branch is required to create a client" },
                { status: 400 }
            );
        }

        const data = await req.json();

        const customerPhone = data.phone;
        const nomineePhone = data.nominee?.phone;

        /* ---------- VALIDATE PHONE ---------- */

        if (customerPhone && nomineePhone && customerPhone === nomineePhone) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Customer and nominee phone cannot be same",
                },
                { status: 400 }
            );
        }

        /* ---------- DUPLICATE CHECK WITHIN BRANCH ---------- */

        const existingClient = await Client.findOne({
            branch: ctx.branchObjectId,
            status: "APPROVED",
            $or: [
                { phone: customerPhone },
                { "nominee.phone": customerPhone },
                ...(nomineePhone
                    ? [
                        { phone: nomineePhone },
                        { "nominee.phone": nomineePhone },
                    ]
                    : []),
            ],
        }).select("_id name customerCode phone nominee.phone");

        if (existingClient) {
            return NextResponse.json(
                {
                    success: false,
                    exists: true,
                    message: "Customer already exists with same phone in this branch",
                    conflictWith: {
                        customerId: existingClient._id,
                        customerCode: existingClient.customerCode,
                        name: existingClient.name,
                        phone: existingClient.phone,
                        nomineePhone: existingClient.nominee?.phone,
                    },
                },
                { status: 409 }
            );
        }

        /* ---------- CREATE CLIENT ---------- */

        const newClient = new Client({
            ...data,
            createdBy: ctx.userId,
            employee: data.employee,
            branch: ctx.branchObjectId,
            status: "PENDING",
        });

        await newClient.save();

        const populatedClient = await Client.findById(newClient._id)
            .populate(populateFields)
            .lean();

        return NextResponse.json({
            success: true,
            client: populatedClient,
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { success: false, error },
            { status: 500 }
        );
    }
}
