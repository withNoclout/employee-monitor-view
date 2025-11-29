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
    
    // Fix blurriness by scaling for devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 25, right: 15, bottom: 35, left: 45 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    // Clear canvas with theme-aware background
    const bgColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#09090b' : '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid with theme-aware colors
    ctx.strokeStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#27272a' : '#e4e4e7';
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
    
    // Draw axes with theme-aware colors
    ctx.strokeStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#3f3f46' : '#d4d4d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Title with theme-aware colors
    ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fafafa' : '#09090b';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Per-Epoch Loss', padding.left, 15);
    
    // X-axis label
    ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#a1a1aa' : '#71717a';
    ctx.font = '10px system-ui, -apple-system, sans-serif';
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
      
      // Gradient line with primary color
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
      const gradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
      gradient.addColorStop(0, `hsl(${primaryColor})`);
      gradient.addColorStop(1, `hsl(${primaryColor} / 0.6)`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      lossHistory.forEach((loss, index) => {
        // Clamp x to stay within graph boundaries
        const xRatio = lossHistory.length > 1 ? index / (lossHistory.length - 1) : 0;
        const x = padding.left + (graphWidth * Math.min(1, Math.max(0, xRatio)));
        const normalizedLoss = (loss - minLoss) / lossRange;
        const y = padding.top + graphHeight * (1 - normalizedLoss);
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      
      // Draw current point (last) with primary color
      if (lossHistory.length > 0) {
        const lastLoss = lossHistory[lossHistory.length - 1];
        const xRatio = lossHistory.length > 1 ? 1 : 0;
        const x = padding.left + (graphWidth * xRatio);
        const normalizedLoss = (lastLoss - minLoss) / lossRange;
        const y = padding.top + graphHeight * (1 - normalizedLoss);
        
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        ctx.fillStyle = `hsl(${primaryColor})`;
        ctx.shadowColor = `hsl(${primaryColor} / 0.4)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      
      // Y-axis labels with theme-aware colors
      ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#a1a1aa' : '#71717a';
      ctx.font = '9px system-ui, -apple-system, sans-serif';
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
        const xRatio = lossHistory.length > 1 ? i / (lossHistory.length - 1) : 0;
        const x = padding.left + (graphWidth * Math.min(1, Math.max(0, xRatio)));
        ctx.fillText((i + 1).toString(), x, height - padding.bottom + 12);
      }
      if (lossHistory.length > 1) {
        ctx.fillText(lossHistory.length.toString(), padding.left + graphWidth, height - padding.bottom + 12);
      }
    } else {
      ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#52525b' : '#a1a1aa';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
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
    
    // Fix blurriness by scaling for devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const padding = { top: 25, right: 15, bottom: 35, left: 45 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;
    
    // Clear canvas with theme-aware background
    const bgColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#09090b' : '#ffffff';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid with theme-aware colors
    ctx.strokeStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#27272a' : '#e4e4e7';
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
    
    // Draw axes with theme-aware colors
    ctx.strokeStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#3f3f46' : '#d4d4d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();
    
    // Title with theme-aware colors
    ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fafafa' : '#09090b';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Progress vs Avg Loss', padding.left, 15);
    
    // X-axis label
    ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#a1a1aa' : '#71717a';
    ctx.font = '10px system-ui, -apple-system, sans-serif';
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
        
        // Draw progress line (target - straight diagonal) with theme-aware colors
        const successColor = getComputedStyle(document.documentElement).getPropertyValue('--success').trim();
        ctx.strokeStyle = `hsl(${successColor} / 0.3)`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, height - padding.bottom);
        const progressRatioForLine = Math.min(1, Math.max(0, progress / 100));
        ctx.lineTo(padding.left + graphWidth * progressRatioForLine, padding.top);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw current progress vertical marker
        const progressX = padding.left + graphWidth * progressRatioForLine;
        ctx.strokeStyle = `hsl(${successColor} / 0.5)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(progressX, padding.top);
        ctx.lineTo(progressX, height - padding.bottom);
        ctx.stroke();
        
        // Draw avg loss curve with primary color
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        const gradient = ctx.createLinearGradient(padding.left, 0, width - padding.right, 0);
        gradient.addColorStop(0, `hsl(${primaryColor})`);
        gradient.addColorStop(1, `hsl(${primaryColor} / 0.7)`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        avgLosses.forEach((point, index) => {
          // Clamp x to stay within graph boundaries
          const progressRatio = Math.min(1, Math.max(0, point.progress / 100));
          const x = padding.left + (graphWidth * progressRatio);
          const normalizedLoss = (point.avgLoss - minAvg) / range;
          const y = padding.top + graphHeight * (1 - normalizedLoss);
          
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // Draw current point with primary color (reuse variable)
        const lastPoint = avgLosses[avgLosses.length - 1];
        const progressRatio = Math.min(1, Math.max(0, lastPoint.progress / 100));
        const x = padding.left + (graphWidth * progressRatio);
        const normalizedLoss = (lastPoint.avgLoss - minAvg) / range;
        const y = padding.top + graphHeight * (1 - normalizedLoss);
        
        ctx.fillStyle = `hsl(${primaryColor})`;
        ctx.shadowColor = `hsl(${primaryColor} / 0.4)`;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Y-axis labels with theme-aware colors
        ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#a1a1aa' : '#71717a';
        ctx.font = '9px system-ui, -apple-system, sans-serif';
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
      ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#52525b' : '#a1a1aa';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for data...', width / 2, height / 2);
    }
    
  }, [lossHistory, currentEpoch, totalEpochs]);
  
  const currentLoss = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1] : 0;
  const avgLoss = lossHistory.length > 0 ? lossHistory.reduce((a, b) => a + b, 0) / lossHistory.length : 0;
  const minLoss = lossHistory.length > 0 ? Math.min(...lossHistory) : 0;
  const progress = totalEpochs > 0 ? Math.round((currentEpoch / totalEpochs) * 100) : 0;
  
  return (
    <div className="loss-graph-container glass-effect shadow-industrial-lg" style={{
      borderRadius: '8px',
      padding: '20px',
      border: '1px solid hsl(var(--border) / 0.4)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid hsl(var(--border) / 0.3)'
      }}>
        <div>
          <h3 style={{
            margin: 0,
            color: 'hsl(var(--foreground))',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '-0.01em'
          }}>
            Training Progress
          </h3>
          <p style={{
            margin: '4px 0 0 0',
            color: 'hsl(var(--muted-foreground))',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Phase {currentPhase}: {phaseDescription}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              color: 'hsl(var(--muted-foreground))', 
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>Epoch</span>
            <div style={{
              color: 'hsl(var(--primary))',
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: 'monospace',
              marginTop: '2px'
            }}>
              {currentEpoch} / {totalEpochs}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              color: 'hsl(var(--muted-foreground))', 
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>Current Loss</span>
            <div style={{
              color: 'hsl(var(--primary))',
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: 'monospace',
              marginTop: '2px'
            }}>
              {currentLoss.toFixed(4)}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              color: 'hsl(var(--muted-foreground))', 
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>Avg Loss</span>
            <div style={{
              color: 'hsl(var(--primary) / 0.8)',
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: 'monospace',
              marginTop: '2px'
            }}>
              {avgLoss.toFixed(4)}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <span style={{ 
              color: 'hsl(var(--muted-foreground))', 
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>Best Loss</span>
            <div style={{
              color: 'hsl(var(--success))',
              fontSize: '18px',
              fontWeight: 700,
              fontFamily: 'monospace',
              marginTop: '2px'
            }}>
              {minLoss.toFixed(4)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div style={{
        height: '2px',
        background: 'hsl(var(--muted) / 0.6)',
        borderRadius: '1px',
        marginBottom: '16px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'hsl(var(--primary))',
          borderRadius: '1px',
          transition: 'width 0.3s ease',
          boxShadow: '0 0 8px hsl(var(--primary) / 0.4)'
        }} />
      </div>
      
      {/* Two Graphs Side by Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        {/* Graph 1: Per-Epoch Loss */}
        <div style={{
          background: 'hsl(var(--muted) / 0.2)',
          borderRadius: '6px',
          position: 'relative',
          padding: '10px',
          border: '1px solid hsl(var(--border) / 0.3)'
        }}>
          <canvas
            ref={epochCanvasRef}
            style={{
              width: '100%',
              height: '180px',
              borderRadius: '4px'
            }}
          />
        </div>
        
        {/* Graph 2: Progress vs Avg Loss */}
        <div style={{
          background: 'hsl(var(--muted) / 0.2)',
          borderRadius: '6px',
          padding: '10px',
          border: '1px solid hsl(var(--border) / 0.3)'
        }}>
          <canvas
            ref={progressCanvasRef}
            style={{
              width: '100%',
              height: '180px',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
      
      {/* Stats Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginTop: '16px',
        padding: '12px',
        background: 'hsl(var(--muted) / 0.2)',
        borderRadius: '6px',
        border: '1px solid hsl(var(--border) / 0.3)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            color: 'hsl(var(--muted-foreground))', 
            fontSize: '10px', 
            display: 'block',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '4px'
          }}>Progress</span>
          <span style={{ 
            color: 'hsl(var(--primary))', 
            fontSize: '14px', 
            fontWeight: 700,
            fontFamily: 'monospace'
          }}>{progress}%</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            color: 'hsl(var(--muted-foreground))', 
            fontSize: '10px', 
            display: 'block',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '4px'
          }}>Total Epochs</span>
          <span style={{ 
            color: 'hsl(var(--foreground))', 
            fontSize: '14px', 
            fontWeight: 700,
            fontFamily: 'monospace'
          }}>{totalEpochs}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            color: 'hsl(var(--muted-foreground))', 
            fontSize: '10px', 
            display: 'block',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '4px'
          }}>Loss Reduction</span>
          <span style={{ 
            color: 'hsl(var(--success))', 
            fontSize: '14px', 
            fontWeight: 700,
            fontFamily: 'monospace'
          }}>
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
