import TrialBalancePage from "@/components/Report/TrialBalance";
import { Suspense } from "react";

export default function TrialBalanceContent() {
    return (
        <Suspense
            fallback={
                <div className="p-6 text-center">
                    Loading...
                </div>
            }
        >
            <TrialBalancePage />
        </Suspense>
    );
}