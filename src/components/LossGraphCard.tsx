// src/components/LossGraphCard.tsx
import React from "react";

interface GraphCardProps {
    title: string;
    data: any[];
    xKey: string;
    yKey: string;
    color?: string;
}

export const LossGraphCard: React.FC<GraphCardProps> = ({ title, data, xKey, yKey, color = "hsl(var(--primary))" }) => {
    // Sort data by xKey to ensure line flows correctly
    const sortedData = [...data].sort((a, b) => (a[xKey] || 0) - (b[xKey] || 0));

    // Determine max values for scaling
    const maxX = Math.max(...sortedData.map(d => d[xKey] || 0), 1);
    const maxY = Math.max(...sortedData.map(d => d[yKey] || 0), 0.1); // Avoid div by zero

    const width = 300;
    const height = 180;
    const padding = 40; // Increased padding for labels

    const points = sortedData.map(d => {
        const xVal = d[xKey] || 0;
        const yVal = d[yKey] || 0;
        const x = padding + (xVal / maxX) * (width - 2 * padding);
        const y = height - padding - (yVal / maxY) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(" ");

    const lastValue = sortedData.length > 0 ? sortedData[sortedData.length - 1][yKey] : 0;
    const lastX = sortedData.length > 0 ? sortedData[sortedData.length - 1][xKey] : 0;

    return (
        <div className="relative rounded-xl shadow-industrial-lg border border-border/40 bg-gradient-to-b from-gray-800 to-gray-900 backdrop-blur-lg p-4 text-foreground/60 font-mono text-sm">
            <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="font-bold uppercase tracking-wide text-xs text-white">{title}</h3>
                <span className="text-xs font-bold" style={{ color }}>{typeof lastValue === 'number' ? lastValue.toFixed(4) : lastValue}</span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Grid lines */}
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />
                <line x1={width - padding} y1={padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

                {/* Axis Labels */}
                <text x={width / 2} y={height - 10} textAnchor="middle" fill="#e5e7eb" fontSize="10" fontWeight="bold">Epoch</text>
                <text x={10} y={height / 2} textAnchor="middle" fill="#e5e7eb" fontSize="10" fontWeight="bold" transform={`rotate(-90, 10, ${height / 2})`}>Value</text>

                {/* Min/Max Labels */}
                <text x={padding - 5} y={height - padding} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="8">0</text>
                <text x={padding - 5} y={padding + 8} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="8">{maxY.toFixed(2)}</text>
                <text x={width - padding} y={height - padding + 12} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8">{maxX}</text>

                {/* Data line */}
                <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                {/* Current point */}
                {sortedData.length > 0 && (
                    <circle
                        cx={padding + (lastX / maxX) * (width - 2 * padding)}
                        cy={height - padding - (lastValue / maxY) * (height - 2 * padding)}
                        r="4"
                        fill={color}
                        stroke="white"
                        strokeWidth="1"
                    />
                )}
            </svg>
        </div>
    );
};
