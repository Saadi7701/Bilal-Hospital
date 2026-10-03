import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_PRODUCTION_URI ||
  "mongodb+srv://alisaadix7710_db_user:Bilalhospital222@cluster0.xcrdtmp.mongodb.net/bilal_hospital_prod?retryWrites=true&w=majority&appName=Cluster0";

if (!process.env.MONGODB_PRODUCTION_URI) {
  console.warn(
    "[MongoDB Alert] MONGODB_PRODUCTION_URI environment variable is not defined. Using hardcoded fallback URI."
  );
} else {
  console.log("[MongoDB] Using MONGODB_PRODUCTION_URI from environment.");
}

/**
 * Global cache interface to maintain a single Mongoose connection across hot reloads.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Production-ready Mongoose connection options.
 */
export const MONGOOSE_PRODUCTION_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize: 50,              // Maintain up to 50 socket connections for high concurrency
  minPoolSize: 10,              // Keep 10 warm connections ready
  serverSelectionTimeoutMS: 5000, // Timeout after 5s if MongoDB server is unreachable
  socketTimeoutMS: 45000,       // Close sockets after 45s of inactivity
  connectTimeoutMS: 10000,      // Timeout for initial connection establishment
  retryWrites: true,            // Auto retry write operations on transient network errors
  retryReads: true,             // Auto retry read operations
  autoIndex: true, // Always build indexes (needed for production Atlas text search and unique constraints)
};

/**
 * Connect to the MongoDB Production Cluster.
 */
export async function connectToProductionDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("[MongoDB] Initializing Production MongoDB Cluster Connection...");
    
    cached.promise = mongoose
      .connect(MONGODB_URI, MONGOOSE_PRODUCTION_OPTIONS)
      .then((mongooseInstance) => {
        console.log("[MongoDB] Successfully connected to Production MongoDB Cluster.");
        return mongooseInstance;
      })
      .catch((error) => {
        console.error("[MongoDB Error] Failed to connect to Production MongoDB Cluster:", error.message);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export const connectToDatabase = connectToProductionDatabase;

/**
 * Graceful shutdown hook to safely close connection pools on application termination.
 */
export async function disconnectProductionDatabase(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log("[MongoDB] Production MongoDB Cluster connection disconnected gracefully.");
  }
}

// Attach SIGINT / SIGTERM listeners for graceful shutdown in containerized environments
if (typeof process !== "undefined") {
  process.on("SIGINT", async () => {
    await disconnectProductionDatabase();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await disconnectProductionDatabase();
    process.exit(0);
  });
}
