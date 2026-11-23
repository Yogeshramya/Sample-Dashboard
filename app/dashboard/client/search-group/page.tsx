import SearchGroupPage from "@/components/Groups/SearchGroup";
import { Suspense } from "react";

export default function SearchGroup() {
    return (
        <Suspense
            fallback={
                <div className="p-6 text-center">
                    Loading...
                </div>
            }
        >
            <SearchGroupPage />
        </Suspense>
    );
}