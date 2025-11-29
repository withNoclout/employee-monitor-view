import path from "path";
import { promises as fs } from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Build a hierarchical path for storing logs.
 * Structure: logs/Task/<task>/<component>/<part>/<year>/<month>/<day>/assembly_logs.jsonl
 *
 * @param task - High level task name (e.g., "Assembly")
 * @param component - Component name (e.g., "Gear")
 * @param part - Specific part identifier (e.g., "Gear-001")
 * @param date - Date object (defaults to now)
 */
export const getLogFilePath = async (
    task: string,
    component: string,
    part: string,
    date: Date = new Date()
): Promise<string> => {
    const year = date.getFullYear().toString();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-indexed
    const day = String(date.getDate()).padStart(2, "0");

    // Navigate up from src/server to project root, then into logs
    const dir = path.resolve(
        __dirname,
        "../../logs",
        "Task",
        task,
        component,
        part,
        year,
        month,
        day
    );

    // Ensure the directory hierarchy exists
    await fs.mkdir(dir, { recursive: true });

    return path.join(dir, "assembly_logs.jsonl");
};
