import PersonalClient from "@/models/PersonalClient";

export const SAVINGS_CLIENT_CODE_PREFIX = "YPSS";

/**
 * Generates the next sequential savings module customer code (e.g. YPSS-0001).
 * Scans existing YPSS-* client codes to compute the highest numeric suffix
 * so concurrent or historical records never cause sequence collisions.
 */
export async function generateNextSavingsClientCode(): Promise<string> {
    const existingClients = await PersonalClient.find({
        clientId: new RegExp(`^${SAVINGS_CLIENT_CODE_PREFIX}-\\d+$`, "i"),
    })
        .select("clientId")
        .lean();

    let maxNumber = 0;

    for (const client of existingClients) {
        if (!client.clientId) continue;
        const match = client.clientId.match(/\d+/g);
        if (!match) continue;
        const num = parseInt(match[match.length - 1], 10);
        if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
        }
    }

    const nextNumber = maxNumber + 1;
    const paddedNumber = String(nextNumber).padStart(4, "0");
    return `${SAVINGS_CLIENT_CODE_PREFIX}-${paddedNumber}`;
}

