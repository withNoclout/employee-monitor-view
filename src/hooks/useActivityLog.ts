import { useState, useEffect } from 'react';

export interface ActivityItem {
    id: string;
    time: string; // ISO string
    title: string;
    type: 'success' | 'warning' | 'info';
    employeeName?: string;
    taskType?: 'daily' | 'monthly' | 'system';
    component?: string;
    action?: string;
    status?: string;
    details?: string;
    // New fields for Quality & Assembly Dashboard
    confidence?: number; // 0-100
    verificationMethod?: 'yolo' | 'gesture' | 'manual';
    stepId?: string;
    evidenceUrl?: string;
}

/**
 * Hook to manage activity log entries.
 * Interacts with the backend API to fetch and save logs.
 */
export const useActivityLog = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);

    // Fetch logs from server on mount
    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const response = await fetch('/api/logs?limit=50');
            if (response.ok) {
                const data = await response.json();

                const mapped: ActivityItem[] = data.logs.map((log: any, index: number) => ({
                    id: log.timestamp + index,
                    time: log.timestamp,
                    title: `${log.user} - ${log.action} ${log.component}`,
                    type: log.status === 'Success' ? 'success' : log.status === 'Warning' ? 'warning' : 'info',
                    employeeName: log.user,
                    component: log.component,
                    action: log.action,
                    status: log.status,
                    details: log.details,
                    // Mock/Default values for new fields if not present in backend yet
                    confidence: log.confidence || Math.floor(Math.random() * (100 - 85) + 85),
                    verificationMethod: log.verificationMethod || (Math.random() > 0.5 ? 'yolo' : 'gesture'),
                    stepId: log.stepId || `STEP-${Math.floor(Math.random() * 10)}`,
                    evidenceUrl: log.evidenceUrl
                }));
                setActivities(mapped);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        }
    };

    const addActivity = async (activity: Partial<ActivityItem>) => {
        // Optimistic update
        const newActivity: ActivityItem = {
            id: Date.now().toString(),
            time: new Date().toISOString(),
            title: activity.title || 'Unknown Activity',
            type: activity.type || 'info',
            confidence: 95, // Default for new manual actions
            verificationMethod: 'manual',
            ...activity
        } as ActivityItem;

        setActivities(prev => [newActivity, ...prev].slice(0, 50));

        // Send to backend
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    timestamp: newActivity.time,
                    component: activity.component || 'System',
                    action: activity.action || 'Log',
                    user: activity.employeeName || 'Unknown',
                    status: activity.type === 'success' ? 'Success' : activity.type === 'warning' ? 'Warning' : 'Error',
                    details: activity.details || activity.title,
                    // Pass new fields to backend (backend might ignore them for now if not updated)
                    confidence: newActivity.confidence,
                    verificationMethod: newActivity.verificationMethod,
                    stepId: newActivity.stepId,
                    evidenceUrl: newActivity.evidenceUrl
                }),
            });
        } catch (error) {
            console.error('Failed to save log:', error);
        }
    };

    return { activities, addActivity, refreshLogs: fetchLogs };
};
