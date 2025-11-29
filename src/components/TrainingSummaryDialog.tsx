import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, Share2, Target, Crosshair, BarChart3, Activity } from 'lucide-react';

interface TrainingSummaryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    metrics: {
        precision: number;
        recall: number;
        mAP50: number;
        mAP50_95: number;
        box_loss: number;
        cls_loss: number;
        dfl_loss: number;
        epoch: number;
    } | null;
}

export const TrainingSummaryDialog: React.FC<TrainingSummaryDialogProps> = ({ isOpen, onClose, metrics }) => {
    const [activeTab, setActiveTab] = useState('visuals');

    if (!metrics) return null;

    const comparisonData = [
        { name: 'mAP50 (Accuracy)', value: metrics.mAP50 * 100, color: '#22c55e' },
        { name: 'mAP50-95 (Robustness)', value: metrics.mAP50_95 * 100, color: '#3b82f6' },
    ];

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                    <div className="text-2xl font-mono font-bold mt-1 tracking-tight" style={{ color }}>{value}</div>
                </div>
                <div className={`p-2 rounded-lg bg-${color}/10 border border-${color}/20`}>
                    <Icon className="w-5 h-5" style={{ color }} />
                </div>
            </CardContent>
        </Card>
    );

    const ImageCard = ({ src, title, className = "" }: { src: string, title: string, className?: string }) => (
        <Card className="overflow-hidden border-border/50 bg-black/20 w-fit mx-auto">
            <CardHeader className="p-3 bg-muted/20 border-b border-border/50">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                    <Activity className="w-3 h-3 text-primary" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className={`p-0 relative group ${className}`}>
                <img
                    src={`http://localhost:3000/api/training-results/${src}`}
                    alt={title}
                    className="max-h-[80vh] min-w-[800px] w-auto object-contain transition-transform duration-500 group-hover:scale-105 bg-white"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1a1a1a/666?text=Image+Not+Found';
                    }}
                />
            </CardContent>
        </Card>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-fit max-w-[95vw] h-[95vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-border/50">
                <DialogHeader className="p-6 border-b border-border/50 bg-muted/10">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3 tracking-tight">
                                <BarChart3 className="w-6 h-6 text-primary" />
                                TRAINING ANALYSIS REPORT
                            </DialogTitle>
                            <DialogDescription className="mt-1 font-mono text-xs text-muted-foreground">
                                MODEL PERFORMANCE SUMMARY • EPOCH {metrics.epoch}
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-2">
                                <Download className="w-4 h-4" /> Export
                            </Button>
                            <Button variant="default" size="sm" className="gap-2 shadow-industrial" onClick={onClose}>
                                Done
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 p-6">
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <StatCard
                            title="mAP50 (Accuracy)"
                            value={`${(metrics.mAP50 * 100).toFixed(1)}%`}
                            icon={Target}
                            color="#22c55e"
                        />
                        <StatCard
                            title="mAP50-95 (Robustness)"
                            value={`${(metrics.mAP50_95 * 100).toFixed(1)}%`}
                            icon={Activity}
                            color="#3b82f6"
                        />
                        <StatCard
                            title="Precision"
                            value={`${(metrics.precision * 100).toFixed(1)}%`}
                            icon={Crosshair}
                            color="#f59e0b"
                        />
                        <StatCard
                            title="Recall"
                            value={`${(metrics.recall * 100).toFixed(1)}%`}
                            icon={Share2}
                            color="#ec4899"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-8 h-64">
                        <Card className="col-span-2 bg-card/50 border-border/50">
                            <CardHeader>
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Performance Comparison</CardTitle>
                            </CardHeader>
                            <CardContent className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData} layout="vertical" margin={{ left: 20 }}>
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis dataKey="name" type="category" width={150} tick={{ fill: '#888', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                                            cursor={{ fill: 'transparent' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                                            {comparisonData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/50 border-border/50">
                            <CardHeader>
                                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loss Metrics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-border/30">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Box Loss</span>
                                    <span className="font-mono font-bold text-primary tracking-tight">{metrics.box_loss.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-border/30">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Class Loss</span>
                                    <span className="font-mono font-bold text-primary tracking-tight">{metrics.cls_loss.toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-border/30">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">DFL Loss</span>
                                    <span className="font-mono font-bold text-primary tracking-tight">{metrics.dfl_loss.toFixed(4)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="visuals" className="w-full" onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="visuals">Visual Analysis</TabsTrigger>
                            <TabsTrigger value="graphs">Detailed Graphs</TabsTrigger>
                        </TabsList>

                        <TabsContent value="visuals" className="space-y-6">
                            <div className="flex flex-col gap-8 w-full">
                                <ImageCard src="confusion_matrix.png" title="Confusion Matrix" />
                                <ImageCard src="confusion_matrix_normalized.png" title="Normalized Confusion Matrix" />
                                <ImageCard src="val_batch0_pred.jpg" title="Validation Batch 0 (Predictions)" />
                                <ImageCard src="val_batch0_labels.jpg" title="Validation Batch 0 (Ground Truth)" />
                                <ImageCard src="val_batch1_pred.jpg" title="Validation Batch 1 (Predictions)" />
                                <ImageCard src="val_batch1_labels.jpg" title="Validation Batch 1 (Ground Truth)" />
                            </div>
                        </TabsContent>

                        <TabsContent value="graphs" className="space-y-6">
                            <div className="flex flex-col gap-8 w-full">
                                <ImageCard src="results.png" title="Overall Results" />
                                <ImageCard src="BoxF1_curve.png" title="F1 Confidence Curve" />
                                <ImageCard src="BoxP_curve.png" title="Precision Confidence Curve" />
                                <ImageCard src="BoxR_curve.png" title="Recall Confidence Curve" />
                            </div>
                        </TabsContent>
                    </Tabs>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
