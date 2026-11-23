import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/upload";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const rawFolder = (formData.get("folder") as string) || "temp";
        const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "");

        if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

        const url = await uploadToR2(file, folder);
        return NextResponse.json({ success: true, url });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { url } = await req.json();
        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        const urlObj = new URL(url);
        const key = urlObj.pathname.substring(1); // Remove leading slash

        if (!key) {
            return NextResponse.json({ error: "Invalid file key" }, { status: 400 });
        }

        await r2.send(
            new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: key,
            })
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
    }
}
