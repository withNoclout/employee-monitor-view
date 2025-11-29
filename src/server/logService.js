import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLogFilePath } from './logPath.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const LOGS_DIR = path.join(__dirname, '../../logs');

// Initialize logs directory
(async () => {
    try {
        await fs.mkdir(LOGS_DIR, { recursive: true });
    } catch (err) {
        console.error('Error creating logs directory:', err);
    }
})();

export const appendLog = async (entry) => {
    try {
        // Use hierarchical path: Task/Component/Part/Year/Month/Day
        // Default to "General" task and "Unknown" component if not provided
        const task = entry.taskName || "General";
        const component = entry.component || "Unknown";
        const part = entry.partId || "General";

        const filePath = await getLogFilePath(task, component, part, new Date(entry.timestamp));

        const logLine = JSON.stringify(entry) + '\n';
        await fs.appendFile(filePath, logLine, 'utf8');
        return true;
    } catch (error) {
        console.error('Error appending log:', error);
        return false;
    }
};

export const readLogs = async (
    filter
) => {
    // NOTE: For a file-based system, reading ALL logs across all folders is expensive.
    // For this implementation, we will scan the 'logs' directory recursively.
    // In a real production system, this should be replaced by a database query.

    const allLogs = [];

    async function scanDir(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await scanDir(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
                const content = await fs.readFile(fullPath, 'utf8');
                const lines = content.split('\n');
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            allLogs.push(JSON.parse(line));
                        } catch (e) {
                            // ignore malformed lines
                        }
                    }
                }
            }
        }
    }

    try {
        await scanDir(LOGS_DIR);
    } catch (error) {
        console.error("Error scanning logs directory:", error);
        return { logs: [], total: 0 };
    }

    // Sort by timestamp descending
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filters
    let filtered = allLogs;
    if (filter) {
        if (filter.component) {
            filtered = filtered.filter(l => l.component.toLowerCase().includes(filter.component.toLowerCase()));
        }
        if (filter.user) {
            filtered = filtered.filter(l => l.user.toLowerCase().includes(filter.user.toLowerCase()));
        }
        if (filter.startDate) {
            filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(filter.startDate));
        }
        if (filter.endDate) {
            filtered = filtered.filter(l => new Date(l.timestamp) <= new Date(filter.endDate));
        }
    }

    const total = filtered.length;
    const limit = filter?.limit || 50;
    const offset = filter?.offset || 0;

    return {
        logs: filtered.slice(offset, offset + limit),
        total
    };
};
