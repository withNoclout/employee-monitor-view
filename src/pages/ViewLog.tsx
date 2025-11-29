// src/pages/ViewLog.tsx
import { useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Calendar } from "lucide-react";

// Mock data for demonstration
const mockLogs = [
    {
        id: 1,
        timestamp: "2025-11-28 14:12",
        component: "Gear Assembly",
        action: "Created",
        user: "alice",
        status: "Success",
        details: "Initial assembly of gear set.",
    },
    {
        id: 2,
        timestamp: "2025-11-28 15:05",
        component: "Gear Assembly",
        action: "Modified",
        user: "bob",
        status: "Warning",
        details: "Adjusted tolerance.",
    },
    // Add more rows as needed
];

export const ViewLog = () => {
    const [selectedLog, setSelectedLog] = useState<typeof mockLogs[0] | null>(null);
    const [openDrawer, setOpenDrawer] = useState(false);

    const handleRowClick = (log: typeof mockLogs[0]) => {
        setSelectedLog(log);
        setOpenDrawer(true);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
            {/* Top navigation bar */}
            <nav className="bg-gradient-to-r from-indigo-800 via-purple-800 to-pink-800 p-4 rounded-xl mb-6 shadow-lg backdrop-blur-md">
                <h1 className="text-2xl font-bold text-white">Component Assembly Log</h1>
            </nav>

            {/* Breadcrumb */}
            <Breadcrumb className="mb-4 text-sm">
                <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                    <BreadcrumbLink href="/logs">Logs</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbItem>
                    <BreadcrumbLink href="#" isCurrentPage>
                        Component Assembly
                    </BreadcrumbLink>
                </BreadcrumbItem>
            </Breadcrumb>

            {/* Filter toolbar */}
            <Card className="bg-gray-800 bg-opacity-60 backdrop-blur-sm mb-4 border border-gray-700">
                <CardHeader>
                    <CardTitle className="text-gray-200">Filters</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <Input placeholder="Search..." className="bg-gray-700 text-gray-100 placeholder-gray-400" />
                    <Select>
                        <SelectTrigger className="bg-gray-700 text-gray-100">
                            <SelectValue placeholder="Component Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="gear">Gear</SelectItem>
                            <SelectItem value="bolt">Bolt</SelectItem>
                            <SelectItem value="casing">Casing</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger className="bg-gray-700 text-gray-100">
                            <SelectValue placeholder="User" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="alice">Alice</SelectItem>
                            <SelectItem value="bob">Bob</SelectItem>
                            <SelectItem value="carol">Carol</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select>
                        <SelectTrigger className="bg-gray-700 text-gray-100">
                            <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="flex items-center gap-2 bg-gray-700 text-gray-100 border-gray-600">
                        <Calendar size={16} /> Date Range
                    </Button>
                </CardContent>
            </Card>

            {/* Log table */}
            <Card className="bg-gray-800 bg-opacity-60 backdrop-blur-sm border border-gray-700">
                <CardHeader>
                    <CardTitle className="text-gray-200">Assembly Log Entries</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="min-w-full">
                        <TableHeader>
                            <TableRow className="bg-gray-700">
                                <TableHead className="text-gray-300">Timestamp</TableHead>
                                <TableHead className="text-gray-300">Component</TableHead>
                                <TableHead className="text-gray-300">Action</TableHead>
                                <TableHead className="text-gray-300">User</TableHead>
                                <TableHead className="text-gray-300">Status</TableHead>
                                <TableHead className="text-gray-300">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockLogs.map((log) => (
                                <TableRow
                                    key={log.id}
                                    className="cursor-pointer hover:bg-gray-700 transition-colors"
                                    onClick={() => handleRowClick(log)}
                                >
                                    <TableCell className="text-gray-200">{log.timestamp}</TableCell>
                                    <TableCell className="text-gray-200">{log.component}</TableCell>
                                    <TableCell className="text-gray-200">{log.action}</TableCell>
                                    <TableCell className="text-gray-200">{log.user}</TableCell>
                                    <TableCell className={`font-medium ${log.status === "Error" ? "text-red-400" : log.status === "Warning" ? "text-yellow-400" : "text-green-400"}`}> {log.status} </TableCell>
                                    <TableCell className="text-gray-400 truncate max-w-xs">{log.details}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Floating Export button */}
            <Button
                className="fixed bottom-6 right-6 rounded-full w-14 h-14 flex items-center justify-center bg-gradient-to-r from-indigo-600 to-pink-600 shadow-lg hover:shadow-xl transition-shadow"
                title="Export Logs"
            >
                Export
            </Button>

            {/* Detail drawer */}
            <Drawer open={openDrawer} onOpenChange={setOpenDrawer}>
                <DrawerContent className="bg-gray-900 text-gray-100 max-w-md">
                    <DrawerHeader>
                        <DrawerTitle>Log Details</DrawerTitle>
                        <DrawerDescription>Full trace for the selected entry.</DrawerDescription>
                    </DrawerHeader>
                    {selectedLog && (
                        <div className="p-4 space-y-4">
                            <p><strong>Timestamp:</strong> {selectedLog.timestamp}</p>
                            <p><strong>Component:</strong> {selectedLog.component}</p>
                            <p><strong>Action:</strong> {selectedLog.action}</p>
                            <p><strong>User:</strong> {selectedLog.user}</p>
                            <p><strong>Status:</strong> {selectedLog.status}</p>
                            <p><strong>Details:</strong> {selectedLog.details}</p>
                            {/* Placeholder for assembly steps, code diffs, links */}
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">Assembly Steps</h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-300">
                                    <li>Step 1 – Load parts</li>
                                    <li>Step 2 – Align gear teeth</li>
                                    <li>Step 3 – Apply torque</li>
                                </ul>
                            </div>
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">Code Diff</h3>
                                <pre className="bg-gray-800 p-2 rounded overflow-x-auto text-xs">
                                    + const tolerance = 0.02;
                                    - const tolerance = 0.05;
                                </pre>
                            </div>
                            <Button variant="link" className="mt-2 text-indigo-400 hover:underline">
                                View source file on repository
                            </Button>
                        </div>
                    )}
                </DrawerContent>
            </Drawer>
        </div>
    );
};

export default ViewLog;
