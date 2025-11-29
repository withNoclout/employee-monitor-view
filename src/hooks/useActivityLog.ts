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
                // Transform backend log format to ActivityItem if needed
                // Backend: { timestamp, component, action, user, status, details, ... }
                // Frontend: { id, time, title, type, ... }

                const mapped: ActivityItem[] = data.logs.map((log: any, index: number) => ({
                    id: log.timestamp + index, // simple unique id
                    time: log.timestamp,
                    title: `${log.user} - ${log.action} ${log.component}`,
                    type: log.status === 'Success' ? 'success' : log.status === 'Warning' ? 'warning' : 'info',
                    employeeName: log.user,
                    component: log.component,
                    action: log.action,
                    status: log.status,
                    details: log.details
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
                    details: activity.details || activity.title
                }),
            });
        } catch (error) {
            console.error('Failed to save log:', error);
        }
    };

    return { activities, addActivity, refreshLogs: fetchLogs };
};
