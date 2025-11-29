// src/server/logService.ts
import { promises as fs } from "fs";
import path from "path";

// Directory where logs will be stored (relative to project root)
const LOG_DIR = path.resolve(__dirname, "../../logs");
const LOG_FILE = path.join(LOG_DIR, "assembly_logs.jsonl");

// Ensure the logs directory exists
export const ensureLogDir = async () => {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
    } catch (e) {
        console.error("Failed to create log directory", e);
    }
};

/**
 * Append a log entry to the JSONL file.
 * The entry is stored as a single line of JSON for fast appends.
 */
export const appendLog = async (log: Record<string, any>) => {
    await ensureLogDir();
    const line = JSON.stringify({ ...log, time: new Date().toISOString() }) + "\n";
    await fs.appendFile(LOG_FILE, line, "utf8");
};

/**
 * Read logs with optional pagination.
 * Returns an array of parsed objects.
 */
export const readLogs = async (options: { offset?: number; limit?: number } = {}) => {
    const { offset = 0, limit = 100 } = options;
    try {
        const data = await fs.readFile(LOG_FILE, "utf8");
        const lines = data.trim().split(/\n/);
        const sliced = lines.slice(offset, offset + limit);
        return sliced.map((l) => JSON.parse(l));
    } catch (e) {
        // If file doesn't exist yet, return empty array
        if ((e as any).code === "ENOENT") return [];
        console.error("Error reading logs", e);
        return [];
    }
};
