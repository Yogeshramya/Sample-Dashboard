import SavingsReturnSearchContent from "@/components/Funds/FundReturn";
import { Suspense } from "react";

export default function SavingsReturnSearchPage() {
    return (
        <Suspense
            fallback={
                <div className="p-6 text-center">
                    Loading...
                </div>
            }
        >
            <SavingsReturnSearchContent />
        </Suspense>
    );
}