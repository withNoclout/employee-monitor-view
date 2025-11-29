import { useState } from "react";
import { useActivityLog, ActivityItem } from "@/hooks/useActivityLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Search,
    Filter,
    Download,
    Calendar as CalendarIcon,
    CheckCircle2,
    AlertTriangle,
    Info,
    XCircle,
    Eye,
    Camera,
    Hand,
    Activity,
    Layers,
    Target,
    ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from "recharts";

const ViewLog = () => {
    const { activities, refreshLogs } = useActivityLog();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedLog, setSelectedLog] = useState<ActivityItem | null>(null);
    const [activeTab, setActiveTab] = useState("journal");

    const navigate = useNavigate();

    // Filter logic
    const filteredLogs = activities.filter((log) => {
        const matchesSearch =
            log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.component?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.employeeName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === "all" || log.type === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Metrics Calculation
    const totalAssemblies = activities.length;
    const avgConfidence = Math.round(
        activities.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / (totalAssemblies || 1)
    );
    const successRate = Math.round(
        (activities.filter(l => l.type === 'success').length / (totalAssemblies || 1)) * 100
    );

    // Chart Data Preparation
    const confidenceData = activities.slice(0, 20).map(l => ({
        name: l.time.split('T')[1].substring(0, 5),
        confidence: l.confidence
    })).reverse();

    const methodData = [
        { name: 'YOLO', value: activities.filter(l => l.verificationMethod === 'yolo').length },
        { name: 'Gesture', value: activities.filter(l => l.verificationMethod === 'gesture').length },
        { name: 'Manual', value: activities.filter(l => l.verificationMethod === 'manual').length },
    ];

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "success":
                return "bg-green-500/10 text-green-500 border-green-500/20";
            case "warning":
                return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case "error":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            default:
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "success":
                return <CheckCircle2 className="w-4 h-4" />;
            case "warning":
                return <AlertTriangle className="w-4 h-4" />;
            case "error":
                return <XCircle className="w-4 h-4" />;
            default:
                return <Info className="w-4 h-4" />;
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            Assembly Quality Dashboard
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Monitor component assembly logs, verification accuracy, and quality metrics.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refreshLogs()}>
                        Refresh
                    </Button>
                    <Button variant="default" className="gap-2">
                        <Download className="w-4 h-4" /> Export Report
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/50 backdrop-blur border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Assemblies</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalAssemblies}</div>
                        <p className="text-xs text-muted-foreground">+12% from last week</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Confidence</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgConfidence}%</div>
                        <p className="text-xs text-muted-foreground">Target: 95%</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{successRate}%</div>
                        <p className="text-xs text-muted-foreground">First-pass yield</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="journal" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="journal">Assembly Journal</TabsTrigger>
                    <TabsTrigger value="metrics">Quality Metrics</TabsTrigger>
                </TabsList>

                {/* Journal Tab */}
                <TabsContent value="journal" className="space-y-4 mt-4">
                    {/* Filters */}
                    <Card className="p-4 border-border bg-card/50 backdrop-blur">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by component, user, or action..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="success">Success</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" className="w-[180px]">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                Select Date
                            </Button>
                        </div>
                    </Card>

                    {/* Log Table */}
                    <div className="rounded-md border border-border bg-card/50 backdrop-blur overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-muted/50">
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Step ID</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Component</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Method</TableHead>
                                    <TableHead>Confidence</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            No logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/50">
                                            <TableCell className="font-mono text-xs">
                                                {new Date(log.time).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {log.stepId}
                                            </TableCell>
                                            <TableCell>{log.employeeName}</TableCell>
                                            <TableCell>{log.component}</TableCell>
                                            <TableCell>{log.action}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {log.verificationMethod === 'yolo' && <Camera className="w-3 h-3 text-blue-400" />}
                                                    {log.verificationMethod === 'gesture' && <Hand className="w-3 h-3 text-purple-400" />}
                                                    <span className="capitalize text-xs">{log.verificationMethod}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {log.confidence && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${log.confidence > 90 ? 'bg-green-500' : log.confidence > 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                style={{ width: `${log.confidence}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs">{log.confidence}%</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`${getStatusColor(log.type)} gap-1`}>
                                                    {getStatusIcon(log.type)}
                                                    <span className="capitalize">{log.status}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedLog(log)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {/* Metrics Tab */}
                <TabsContent value="metrics" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-card/50 backdrop-blur border-border">
                            <CardHeader>
                                <CardTitle>Confidence Trend (Last 20 Actions)</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={confidenceData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="name" stroke="#888" fontSize={12} />
                                        <YAxis stroke="#888" fontSize={12} domain={[0, 100]} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="confidence" stroke="#8884d8" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50 backdrop-blur border-border">
                            <CardHeader>
                                <CardTitle>Verification Methods Used</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={methodData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {methodData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex justify-center gap-4 mt-4">
                                    {methodData.map((entry, index) => (
                                        <div key={entry.name} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-sm text-muted-foreground">{entry.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Detail Drawer */}
            <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <SheetContent className="w-[400px] sm:w-[540px] border-l border-border bg-background/95 backdrop-blur">
                    <SheetHeader>
                        <SheetTitle>Assembly Detail</SheetTitle>
                        <SheetDescription>
                            Detailed view of the assembly action and verification evidence.
                        </SheetDescription>
                    </SheetHeader>

                    {selectedLog && (
                        <div className="mt-6 space-y-6">
                            {/* Status Banner */}
                            <div className={`p-4 rounded-lg border ${getStatusColor(selectedLog.type)} flex items-center gap-3`}>
                                {getStatusIcon(selectedLog.type)}
                                <div>
                                    <p className="font-semibold capitalize">{selectedLog.status}</p>
                                    <p className="text-xs opacity-80">
                                        {new Date(selectedLog.time).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Evidence Section */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground">Verification Evidence</h3>
                                <div className="aspect-video bg-muted rounded-lg border border-border flex items-center justify-center relative overflow-hidden group">
                                    {selectedLog.evidenceUrl ? (
                                        <img src={selectedLog.evidenceUrl} alt="Evidence" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-4">
                                            {selectedLog.verificationMethod === 'yolo' ? (
                                                <Camera className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                                            ) : (
                                                <Hand className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                                            )}
                                            <p className="text-sm text-muted-foreground">No image evidence captured</p>
                                        </div>
                                    )}
                                    {/* Overlay Mockup */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="secondary" size="sm">View Full Image</Button>
                                    </div>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-md bg-muted/50 border border-border">
                                    <p className="text-xs text-muted-foreground">Confidence Score</p>
                                    <p className="text-xl font-bold mt-1">{selectedLog.confidence}%</p>
                                </div>
                                <div className="p-3 rounded-md bg-muted/50 border border-border">
                                    <p className="text-xs text-muted-foreground">Method</p>
                                    <p className="text-xl font-bold mt-1 capitalize">{selectedLog.verificationMethod}</p>
                                </div>
                                <div className="p-3 rounded-md bg-muted/50 border border-border">
                                    <p className="text-xs text-muted-foreground">Step ID</p>
                                    <p className="text-xl font-bold mt-1">{selectedLog.stepId}</p>
                                </div>
                                <div className="p-3 rounded-md bg-muted/50 border border-border">
                                    <p className="text-xs text-muted-foreground">Component</p>
                                    <p className="text-xl font-bold mt-1 truncate">{selectedLog.component}</p>
                                </div>
                            </div>

                            {/* Technical Details */}
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground">Technical Details</h3>
                                <ScrollArea className="h-[150px] w-full rounded-md border border-border bg-muted/30 p-4">
                                    <pre className="text-xs font-mono text-muted-foreground">
                                        {JSON.stringify(
                                            {
                                                id: selectedLog.id,
                                                action: selectedLog.action,
                                                user: selectedLog.employeeName,
                                                raw_status: selectedLog.status,
                                                details: selectedLog.details,
                                            },
                                            null,
                                            2
                                        )}
                                    </pre>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default ViewLog;
