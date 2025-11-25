import React, { useEffect, useRef } from 'react';

interface LossGraphProps {
  lossHistory: number[];
  currentEpoch: number;
  totalEpochs: number;
  currentPhase: number;
  phaseDescription: string;
}

const LossGraph: React.FC<LossGraphProps> = ({
  lossHistory,
  currentEpoch,
  totalEpochs,
  currentPhase,
  phaseDescription
}) => {
  const epochCanvasRef = useRef<HTMLCanvasElement>(null);
  const progressCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Graph 1: Per-Epoch Loss
  useEffect(() => {
    const canvas = epochCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 25, right: 15, bottom: 35, left: 45 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#2d2d44';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (graphWidth / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Per-Epoch Loss', padding.left, 15);
    
    // X-axis label
    ctx.fillStyle = '#8888aa';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Epoch', width / 2, height - 5);
    
    // Y-axis label
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Loss', 0, 0);
    ctx.restore();
    
    // Draw loss curve
    if (lossHistory.length > 0) {
      const maxLoss = Math.max(...lossHistory) * 1.1;
      const minLoss = Math.min(...lossHistory) * 0.9;
      const lossRange = maxLoss - minLoss || 1;
      
      // Gradient line
      const gradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, '#22d3ee');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      lossHistory.forEach((loss, index) => {
        const x = padding.left + (graphWidth / Math.max(lossHistory.length - 1, 1)) * index;
        const normalizedLoss = (loss - minLoss) / lossRange;
        const y = padding.top + graphHeight * (1 - normalizedLoss);
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Draw current point (last)
      if (lossHistory.length > 0) {
        const lastLoss = lossHistory[lossHistory.length - 1];
        const x = padding.left + graphWidth * ((lossHistory.length - 1) / Math.max(lossHistory.length - 1, 1));
        const normalizedLoss = (lastLoss - minLoss) / lossRange;
        const y = padding.top + graphHeight * (1 - normalizedLoss);
        
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // Y-axis labels
      ctx.fillStyle = '#8888aa';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 4; i++) {
        const lossValue = maxLoss - (lossRange / 4) * i;
        const y = padding.top + (graphHeight / 4) * i;
        ctx.fillText(lossValue.toFixed(2), padding.left - 5, y + 3);
      }
      
      // X-axis labels (epoch numbers)
      ctx.textAlign = 'center';
      const step = Math.max(1, Math.ceil(lossHistory.length / 5));
      for (let i = 0; i < lossHistory.length; i += step) {
        const x = padding.left + (graphWidth / Math.max(lossHistory.length - 1, 1)) * i;
        ctx.fillText((i + 1).toString(), x, height - padding.bottom + 12);
      }
      if (lossHistory.length > 1) {
        ctx.fillText(lossHistory.length.toString(), padding.left + graphWidth, height - padding.bottom + 12);
      }
    } else {
      ctx.fillStyle = '#666';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for data...', width / 2, height / 2);
    }
    
  }, [lossHistory, currentEpoch]);
  
  // Graph 2: Progress vs Average Loss
  useEffect(() => {
    const canvas = progressCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 25, right: 15, bottom: 35, left: 45 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#2d2d44';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (graphHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (graphWidth / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Title
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Progress vs Avg Loss', padding.left, 15);
    
    // X-axis label
    ctx.fillStyle = '#8888aa';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Progress %', width / 2, height - 5);
    
    // Y-axis label
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Avg Loss', 0, 0);
    ctx.restore();
    
    // Calculate rolling average losses at progress checkpoints
    const progress = totalEpochs > 0 ? (currentEpoch / totalEpochs) * 100 : 0;
    
    if (lossHistory.length > 0) {
      // Calculate cumulative average at each point
      const avgLosses: { progress: number; avgLoss: number }[] = [];
      let sum = 0;
      
      for (let i = 0; i < lossHistory.length; i++) {
        sum += lossHistory[i];
        const avg = sum / (i + 1);
        const prog = ((i + 1) / totalEpochs) * 100;
        avgLosses.push({ progress: prog, avgLoss: avg });
      }
      
      if (avgLosses.length > 0) {
        const maxAvg = Math.max(...avgLosses.map(a => a.avgLoss)) * 1.1;
        const minAvg = Math.min(...avgLosses.map(a => a.avgLoss)) * 0.9;
        const range = maxAvg - minAvg || 1;
        
        // Draw progress line (target - straight diagonal)
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, height - padding.bottom);
        ctx.lineTo(padding.left + graphWidth * (progress / 100), padding.top);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw current progress vertical marker
        const progressX = padding.left + graphWidth * (progress / 100);
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(progressX, padding.top);
        ctx.lineTo(progressX, height - padding.bottom);
        ctx.stroke();
        
        // Draw avg loss curve
        const gradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
        gradient.addColorStop(0, '#f472b6');
        gradient.addColorStop(1, '#a855f7');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        avgLosses.forEach((point, index) => {
          const x = padding.left + (graphWidth * point.progress / 100);
          const normalizedLoss = (point.avgLoss - minAvg) / range;
          const y = padding.top + graphHeight * (1 - normalizedLoss);
          
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Draw current point
        const lastPoint = avgLosses[avgLosses.length - 1];
        const x = padding.left + (graphWidth * lastPoint.progress / 100);
        const normalizedLoss = (lastPoint.avgLoss - minAvg) / range;
        const y = padding.top + graphHeight * (1 - normalizedLoss);
        
        ctx.fillStyle = '#a855f7';
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Y-axis labels
        ctx.fillStyle = '#8888aa';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
          const lossValue = maxAvg - (range / 4) * i;
          const yPos = padding.top + (graphHeight / 4) * i;
          ctx.fillText(lossValue.toFixed(2), padding.left - 5, yPos + 3);
        }
        
        // X-axis labels (progress %)
        ctx.textAlign = 'center';
        for (let i = 0; i <= 5; i++) {
          const pct = i * 20;
          const xPos = padding.left + (graphWidth / 5) * i;
          ctx.fillText(`${pct}%`, xPos, height - padding.bottom + 12);
        }
      }
    } else {
      ctx.fillStyle = '#666';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for data...', width / 2, height / 2);
    }
    
  }, [lossHistory, currentEpoch, totalEpochs]);
  
  const currentLoss = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1] : 0;
  const avgLoss = lossHistory.length > 0 ? lossHistory.reduce((a, b) => a + b, 0) / lossHistory.length : 0;
  const minLoss = lossHistory.length > 0 ? Math.min(...lossHistory) : 0;
  const progress = totalEpochs > 0 ? Math.round((currentEpoch / totalEpochs) * 100) : 0;
  
  return (
    <div className="loss-graph-container" style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      border: '1px solid #2d2d44'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div>
          <h3 style={{
            margin: 0,
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600
          }}>
            Training Progress
          </h3>
          <p style={{
            margin: '2px 0 0 0',
            color: '#8888aa',
            fontSize: '11px'
          }}>
            Phase {currentPhase}: {phaseDescription}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#8888aa', fontSize: '10px' }}>Epoch</span>
            <div style={{
              color: '#00ff88',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}>
              {currentEpoch} / {totalEpochs}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#8888aa', fontSize: '10px' }}>Current Loss</span>
            <div style={{
              color: '#22d3ee',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}>
              {currentLoss.toFixed(4)}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#8888aa', fontSize: '10px' }}>Avg Loss</span>
            <div style={{
              color: '#a855f7',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}>
              {avgLoss.toFixed(4)}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#8888aa', fontSize: '10px' }}>Best Loss</span>
            <div style={{
              color: '#6bcb77',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}>
              {minLoss.toFixed(4)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div style={{
        height: '4px',
        background: '#2d2d44',
        borderRadius: '2px',
        marginBottom: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #00ff88 0%, #00cc6a 100%)',
          borderRadius: '2px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      
      {/* Two Graphs Side by Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px'
      }}>
        {/* Graph 1: Per-Epoch Loss */}
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          padding: '8px'
        }}>
          <canvas
            ref={epochCanvasRef}
            width={280}
            height={180}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '4px'
            }}
          />
        </div>
        
        {/* Graph 2: Progress vs Avg Loss */}
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px',
          padding: '8px'
        }}>
          <canvas
            ref={progressCanvasRef}
            width={280}
            height={180}
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
      
      {/* Stats Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: '12px',
        padding: '8px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '6px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#8888aa', fontSize: '10px', display: 'block' }}>Progress</span>
          <span style={{ color: '#00ff88', fontSize: '13px', fontWeight: 600 }}>{progress}%</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#8888aa', fontSize: '10px', display: 'block' }}>Total Epochs</span>
          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{totalEpochs}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#8888aa', fontSize: '10px', display: 'block' }}>Loss Reduction</span>
          <span style={{ color: '#6bcb77', fontSize: '13px', fontWeight: 600 }}>
            {lossHistory.length > 1 
              ? `${(((lossHistory[0] - currentLoss) / lossHistory[0]) * 100).toFixed(1)}%`
              : '0%'
            }
          </span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#8888aa', fontSize: '10px', display: 'block' }}>Avg Improvement</span>
          <span style={{ color: '#a855f7', fontSize: '13px', fontWeight: 600 }}>
            {lossHistory.length > 1 
              ? `${(((lossHistory[0] - avgLoss) / lossHistory[0]) * 100).toFixed(1)}%`
              : '0%'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default LossGraph;
