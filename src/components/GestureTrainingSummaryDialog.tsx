import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Activity, Database, Clock, CheckCircle2 } from "lucide-react";

interface GestureTrainingSummaryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    modelInfo: any;
}

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

export const GestureTrainingSummaryDialog: React.FC<GestureTrainingSummaryDialogProps> = ({
    open,
    onOpenChange,
    modelInfo
}) => {
    if (!modelInfo) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <Brain className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight">Gesture Model Training Complete</DialogTitle>
                            <DialogDescription className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                                DTW + k-NN Algorithm
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            title="Accuracy"
                            value={`${(modelInfo.final_accuracy * 100).toFixed(1)}%`}
                            icon={CheckCircle2}
                            color="#10b981"
                        />
                        <StatCard
                            title="Classes"
                            value={modelInfo.num_classes}
                            icon={Activity}
                            color="#3b82f6"
                        />
                        <StatCard
                            title="Total Samples"
                            value={modelInfo.total_samples}
                            icon={Database}
                            color="#f59e0b"
                        />
                        <StatCard
                            title="Model Type"
                            value="DTW"
                            icon={Brain}
                            color="#8b5cf6"
                        />
                    </div>

                    {/* Class Breakdown */}
                    <Card className="bg-muted/20 border-border/50">
                        <CardContent className="p-4">
                            <h3 className="text-sm font-bold mb-4 uppercase tracking-wider flex items-center gap-2">
                                <Database className="w-4 h-4 text-primary" />
                                Class Distribution
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(modelInfo.class_sample_counts || {}).map(([className, count]: [string, any]) => (
                                    <div key={className} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                                        <span className="font-medium text-sm">{className}</span>
                                        <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                            {count} samples
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Training Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>Trained at: {new Date(modelInfo.trained_at).toLocaleString()}</span>
                        </div>
                        <div className="font-mono">
                            k={modelInfo.k} • Downsample={modelInfo.downsample_frames || 20}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                        Close Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
