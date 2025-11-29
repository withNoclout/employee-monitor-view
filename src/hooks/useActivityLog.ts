import { useState, useEffect } from 'react';

export interface ActivityItem {
    id: string;
    time: string; // ISO string
    title: string;
    type: 'success' | 'warning' | 'info';
    employeeName?: string;
    taskType?: 'daily' | 'monthly' | 'system';
}

const STORAGE_KEY = 'employee_activity_log';

/**
 * Hook to manage activity log entries.
 * Persists to localStorage and synchronizes across tabs/windows.
 */
export const useActivityLog = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setActivities(JSON.parse(saved));
        } else {
            // Seed with default data if empty
            const initialData: ActivityItem[] = [
                {
                    id: '1',
                    time: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
                    title: 'Michael Chen completed Daily Safety Check',
                    type: 'success',
                    employeeName: 'Michael Chen',
                    taskType: 'daily',
                },
                {
                    id: '2',
                    time: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
                    title: 'Emma Williams submitted Monthly Performance Report',
                    type: 'info',
                    employeeName: 'Emma Williams',
                    taskType: 'monthly',
                },
                {
                    id: '3',
                    time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                    title: 'System Alert: High CPU Usage',
                    type: 'warning',
                    taskType: 'system',
                },
            ];
            setActivities(initialData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
        }
    }, []);

    // Sync across tabs/windows via storage event
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                setActivities(JSON.parse(e.newValue));
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const addActivity = (activity: Omit<ActivityItem, 'id' | 'time'>) => {
        setActivities(prev => {
            const newActivity: ActivityItem = {
                ...activity,
                id: Date.now().toString(),
                time: new Date().toISOString(),
            };
            const updated = [newActivity, ...prev].slice(0, 50); // keep latest 50
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    return { activities, addActivity };
};
