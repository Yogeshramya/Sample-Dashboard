import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const IST = "Asia/Kolkata";

/* ===============================
   CURRENT IST TIME
================================ */
export function nowIST(): Date {
    return dayjs().tz(IST).toDate();
}

/* ===============================
   FORMAT IST DATE
================================ */
export function formatIST(
    date: Date | string,
    format = "DD-MM-YYYY hh:mm A"
): string {
    return dayjs(date).tz(IST).format(format);
}

/* ===============================
   TODAY RANGE (IST)
================================ */
export function startOfTodayIST(): Date {
    return dayjs().tz(IST).startOf("day").toDate();
}

export function endOfTodayIST(): Date {
    return dayjs().tz(IST).endOf("day").toDate();
}

/* ===============================
   CUSTOM RANGE (IST)
================================ */
export function rangeIST(from: string, to: string) {
    const start = dayjs(from).tz(IST).startOf("day").toDate();
    const end = dayjs(to).tz(IST).endOf("day").toDate();
    return { start, end };
}

/* ===============================
   TODAY DATE STRING (IST) YYYY-MM-DD
================================ */
export function getTodayIST(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: IST,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

/* ===============================
   PARSE IST DATE (START/END OF DAY)
================================ */
export function parseISTDate(value: string, endOfDay = false): Date {
    return new Date(
        `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`
    );
}
