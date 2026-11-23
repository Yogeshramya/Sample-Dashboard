"use client";

import ManageClientPage from "@/components/Clients/EditClient";
import LoadingOverlay from "@/components/Loading";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense
            fallback={
                <LoadingOverlay show={true} />
            }
        >
            <ManageClientPage />
        </Suspense>
    );
}