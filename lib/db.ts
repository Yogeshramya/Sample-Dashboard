import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) throw new Error("Missing MONGODB_URI in .env");

type MongooseGlobal = typeof globalThis & {
    mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const globalWithMongoose = global as MongooseGlobal;

if (!globalWithMongoose.mongoose) {
    globalWithMongoose.mongoose = { conn: null, promise: null };
}

const cached = globalWithMongoose.mongoose;

export async function connectDB() {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const dbName = process.env.MONGODB_DB_NAME;
        const options: mongoose.ConnectOptions = dbName ? { dbName } : {};

        cached.promise = mongoose.connect(MONGODB_URI, options).then((mongoose) => mongoose);
    }

    cached.conn = await cached.promise;
    return cached.conn;
}
