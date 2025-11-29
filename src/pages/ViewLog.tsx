import React, { useState, useEffect } from "react";
import {
    Search, Filter, Download, ChevronRight, Clock, User,
    AlertTriangle, CheckCircle, Info, FileCode, Layers, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { formatDistanceToNow } from "date-fns";
import { useActivityLog, ActivityItem } from "@/hooks/useActivityLog";

const ViewLog = () => {
    const { activities, refreshLogs } = useActivityLog();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<string>("all");
    const [selectedLog, setSelectedLog] = useState<ActivityItem | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Filter logs based on search term and type
    const filteredLogs = activities.filter(log => {
        const matchesSearch = log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.employeeName && log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = selectedType === "all" || log.type === selectedType;
        return matchesSearch && matchesType;
    });

    const handleLogClick = (log: ActivityItem) => {
        setSelectedLog(log);
        setIsDrawerOpen(true);
    };

    const getStatusBadge = (type: string) => {
        switch (type) {
            case "success":
                return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Success</Badge>;
            case "warning":
                return <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20">Warning</Badge>;
            case "info":
            default:
                return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Info</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                                <Layers className="w-6 h-6 text-primary" />
                            </div>
                            Component Assembly Log
                        </h1>
                        <p className="text-muted-foreground mt-1 ml-14">
                            Traceability and monitoring for all assembly activities
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => refreshLogs()}>
                            Refresh
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90">
                            <Download className="w-4 h-4 mr-2" />
                            Export Logs
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by component, user, or action..."
                                    className="pl-9 bg-background/50 border-border/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger className="w-[180px] bg-background/50 border-border/50">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="success">Success</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" className="border-border/50">
                                <Calendar className="w-4 h-4 mr-2" />
                                Date Range
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Log Table */}
                <Card className="bg-card border-border shadow-lg overflow-hidden">
                    <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Recent Activities
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[600px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-muted/50 border-border">
                                        <TableHead className="w-[200px]">Timestamp</TableHead>
                                        <TableHead>Activity</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Component</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No logs found matching your criteria
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.map((log) => (
                                            <TableRow
                                                key={log.id}
                                                className="cursor-pointer hover:bg-muted/30 transition-colors border-border"
                                                onClick={() => handleLogClick(log)}
                                            >
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {new Date(log.time).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-foreground">{log.title}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {formatDistanceToNow(new Date(log.time), { addSuffix: true })}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <User className="w-3 h-3 text-primary" />
                                                        </div>
                                                        <span className="text-sm">{log.employeeName || "Unknown"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {log.component || "System"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(log.type)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Detail Drawer */}
                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <DrawerContent className="h-[85vh]">
                        <div className="mx-auto w-full max-w-4xl">
                            <DrawerHeader>
                                <DrawerTitle className="text-2xl flex items-center gap-3">
                                    {selectedLog?.title}
                                    {selectedLog && getStatusBadge(selectedLog.type)}
                                </DrawerTitle>
                                <DrawerDescription>
                                    Log ID: {selectedLog?.id} • {selectedLog && new Date(selectedLog.time).toLocaleString()}
                                </DrawerDescription>
                            </DrawerHeader>

                            <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(85vh-150px)]">
                                {/* Details Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium text-muted-foreground">Component Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex justify-between py-2 border-b border-border/50">
                                                <span className="text-sm">Component Name</span>
                                                <span className="font-medium">{selectedLog?.component || "N/A"}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-border/50">
                                                <span className="text-sm">Action Type</span>
                                                <span className="font-medium">{selectedLog?.action || "N/A"}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-border/50">
                                                <span className="text-sm">User</span>
                                                <span className="font-medium">{selectedLog?.employeeName || "N/A"}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium text-muted-foreground">System Metadata</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="flex justify-between py-2 border-b border-border/50">
                                                <span className="text-sm">Task Type</span>
                                                <span className="font-medium">{selectedLog?.taskType || "General"}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-border/50">
                                                <span className="text-sm">Verification Status</span>
                                                <span className="font-medium text-green-500">Verified</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Extended Details / Code Diff Placeholder */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <FileCode className="w-5 h-5 text-primary" />
                                            Assembly Details / Code Diff
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                            {selectedLog?.details ? (
                                                <pre>{selectedLog.details}</pre>
                                            ) : (
                                                <div className="text-muted-foreground italic">No additional details available for this log entry.</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <DrawerFooter>
                                <DrawerClose asChild>
                                    <Button variant="outline">Close</Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </Drawer>

            </div>
        </div>
    );
};

export default ViewLog;
