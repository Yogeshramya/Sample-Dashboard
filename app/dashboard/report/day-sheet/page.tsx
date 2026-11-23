import DaySheetPage from "@/components/Report/Daysheet";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DaySheetPage />
        </Suspense>
    );
}