import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * LUMINA QUANT - INSTITUTIONAL LIQUIDITY PROVIDER
 * Complete working example with main App component
 */

// Custom SVG Icon Set
const Icons = {
  Logo: ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="8">
      <path d="M50 10 C 20 10, 10 40, 10 50 C 10 80, 40 90, 50 90 C 80 90, 90 60, 90 50" strokeOpacity="0.2" />
      <path d="M50 10 C 80 10, 90 40, 90 50" strokeLinecap="round" />
      <circle cx="50" cy="50" r="20" strokeWidth="0" fill="currentColor" className="animate-pulse" />
      <path d="M30 50 L 70 50" strokeWidth="4" strokeOpacity="0.5" />
      <path d="M50 30 L 50 70" strokeWidth="4" strokeOpacity="0.5" />
    </svg>
  ),
  Prism: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 22h20L12 2z" />
      <path d="M12 6l4.5 12" />
      <path d="M12 6l-4.5 12" />
    </svg>
  ),
  Globe: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" strokeOpacity="0.3" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeOpacity="0.3" />
      <path d="M12 2 C 18 2, 20 8, 20 12 C 20 16, 18 22, 12 22" strokeLinecap="round" />
    </svg>
  ),
  Chart: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 21h18" strokeLinecap="square" />
      <path d="M3 16l5-5 4 4 8-10" strokeLinejoin="round" />
      <circle cx="19.5" cy="5.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  Shield: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v8" strokeOpacity="0.5" />
      <path d="M8 12h8" strokeOpacity="0.5" />
    </svg>
  ),
  Algorithm: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="14" width="8" height="8" rx="1" />
      <path d="M6 10v4a2 2 0 0 0 2 2h4" />
      <path d="M14 10v1a2 2 0 0 0 2 2h1" />
    </svg>
  ),
  ArrowUpRight: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  ),
  Layers: ({ className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
};

// Canvas Background
const FluidMesh = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    let mouse = { x: -1000, y: -1000 };
    let animationId;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    };

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        this.size = Math.random() * 1.5 + 0.5;
        this.baseX = this.x;
        this.baseY = this.y;
        this.density = (Math.random() * 30) + 1;
      }

      update() {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let maxDistance = 200;
        let force = (maxDistance - distance) / maxDistance;
        let directionX = forceDirectionX * force * this.density;
        let directionY = forceDirectionY * force * this.density;

        if (distance < maxDistance) {
          this.x -= directionX;
          this.y -= directionY;
        } else {
          if (this.x !== this.baseX) {
            let dx = this.x - this.baseX;
            this.x -= dx / 50;
          }
          if (this.y !== this.baseY) {
            let dy = this.y - this.baseY;
            this.y -= dy / 50;
          }
        }
        
        this.x += this.vx;
        this.y += this.vy;

        if (this.x > width || this.x < 0) this.vx = -this.vx;
        if (this.y > height || this.y < 0) this.vy = -this.vy;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const count = Math.min(50, Math.floor((width * height) / 15000));
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          let dx = particles[i].x - particles[j].x;
          let dy = particles[i].y - particles[j].y;
          let distance = Math.sqrt(dx*dx + dy*dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.15 - distance/1200})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
        particles[i].update();
        particles[i].draw();
      }
      animationId = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);

    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-60"
    />
  );
};

// UI Components
const GlassCard = ({ children, className = "", hoverEffect = true }) => (
  <div className={`
    relative overflow-hidden
    bg-white/40 backdrop-blur-md 
    border border-white/50 
    shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] 
    rounded-2xl 
    transition-all duration-500 ease-out
    ${hoverEffect ? 'hover:scale-[1.02] hover:shadow-[0_16px_48px_0_rgba(31,38,135,0.1)] hover:bg-white/60' : ''}
    ${className}
  `}>
    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
    {children}
  </div>
);

const SectionHeader = ({ subtitle, title, align = "center" }) => (
  <div className={`mb-16 flex flex-col ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
    <span className="inline-block py-1 px-3 rounded-full bg-slate-200/50 text-slate-600 text-xs font-bold tracking-[0.2em] uppercase mb-4 backdrop-blur-sm border border-white/50">
      {subtitle}
    </span>
    <h2 className="text-4xl md:text-5xl font-light text-slate-900 tracking-tight leading-[1.1]">
      {title}
    </h2>
  </div>
);

// Liquidity Engine Component
const LiquidityEngine = () => {
  const [dataPoints, setDataPoints] = useState([]);
  const [executionLog, setExecutionLog] = useState([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now();
      const price = 42000 + Math.sin(time / 1000) * 50 + Math.random() * 20;
      
      setDataPoints(prev => {
        const newArr = [...prev, { time, price }];
        if (newArr.length > 40) newArr.shift();
        return newArr;
      });

      if (Math.random() > 0.7) {
        setExecutionLog(prev => {
          const types = ['FILLED', 'PARTIAL', 'ROUTED'];
          const pairs = ['BTC/USDT', 'ETH/USD', 'SOL/USDC', 'SPY/USD', 'GLD/USD'];
          const newLog = {
            id: Math.random().toString(36).substr(2, 5).toUpperCase(),
            pair: pairs[Math.floor(Math.random() * pairs.length)],
            type: types[Math.floor(Math.random() * types.length)],
            size: (Math.random() * 10).toFixed(4),
            latency: Math.floor(Math.random() * 15) + 'ms'
          };
          const newArr = [newLog, ...prev];
          if (newArr.length > 6) newArr.pop();
          return newArr;
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard className="p-0 w-full max-w-4xl mx-auto h-[500px] flex flex-col md:flex-row border-slate-200">
      <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-200/50 relative overflow-hidden">
        <div className="absolute top-4 left-6 z-10">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Alpha/V3 Engine</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-600 font-mono">SYSTEM OPTIMAL</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-3/4 px-2 flex items-end justify-between gap-1">
          {dataPoints.map((pt, i) => {
            const height = ((pt.price - 41900) / 200) * 100;
            const isPositive = i > 0 && pt.price > dataPoints[i-1].price;
            return (
              <div 
                key={pt.time}
                className={`w-full rounded-t-sm transition-all duration-300 ${isPositive ? 'bg-emerald-400/60' : 'bg-rose-400/60'}`}
                style={{ height: `${Math.max(5, height)}%` }}
              />
            )
          })}
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/10 to-transparent opacity-10 mix-blend-overlay" />
        <div className="absolute inset-0 border border-slate-100 m-6 rounded-lg pointer-events-none" />
      </div>

      <div className="w-full md:w-80 bg-slate-50/50 p-6 flex flex-col">
        <div className="mb-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Live Execution Stream</h4>
          <div className="space-y-2">
            {executionLog.map((log) => (
              <div key={log.id} className="flex justify-between items-center text-[10px] font-mono bg-white p-2 rounded border border-slate-100 shadow-sm">
                <span className="text-slate-700 font-bold">{log.pair}</span>
                <span className={`
                  px-1.5 py-0.5 rounded text-[9px]
                  ${log.type === 'FILLED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}
                `}>{log.type}</span>
                <span className="text-slate-400">{log.latency}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-auto">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>24h Volume</span>
            <span className="font-mono text-slate-900">$4.2B</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Active Orders</span>
            <span className="font-mono text-slate-900">12,421</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Spread</span>
            <span className="font-mono text-emerald-600">0.02%</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};

// Statistics Component
const StatCard = ({ icon: Icon, value, label, change }) => (
  <GlassCard className="p-6">
    <div className="flex items-start justify-between mb-4">
      <Icon className="w-8 h-8 text-slate-600" />
      <span className={`text-xs font-bold ${change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {change > 0 ? '+' : ''}{change}%
      </span>
    </div>
    <div className="space-y-1">
      <h3 className="text-2xl font-light text-slate-900">{value}</h3>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  </GlassCard>
);

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, description }) => (
  <GlassCard className="p-8 group">
    <div className="mb-6">
      <Icon className="w-12 h-12 text-slate-700 group-hover:text-blue-600 transition-colors duration-300" />
    </div>
    <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{description}</p>
  </GlassCard>
);

// MAIN APP COMPONENT - THIS IS WHAT WAS MISSING!
export default function App() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
      {/* Background Animation */}
      <FluidMesh />
      
      {/* Header */}
      <header className="relative z-10 px-6 py-8">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icons.Logo className="w-10 h-10" />
            <span className="text-2xl font-light text-slate-900">LUMINA QUANT</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Solutions</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Technology</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">About</a>
            <button className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
              Get Started
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h1 className="text-6xl md:text-7xl font-light text-slate-900 mb-6">
              Institutional
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Liquidity Provider
              </span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              High-frequency market making with sub-millisecond execution across 200+ digital asset pairs
            </p>
          </div>

          {/* Live Engine Demo */}
          <LiquidityEngine />
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <SectionHeader 
            subtitle="Performance Metrics"
            title="Real-Time Statistics"
          />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard icon={Icons.Chart} value="$4.2B" label="Daily Volume" change={12.5} />
            <StatCard icon={Icons.Globe} value="200+" label="Trading Pairs" change={8.2} />
            <StatCard icon={Icons.Shield} value="99.99%" label="Uptime" change={0.01} />
            <StatCard icon={Icons.Layers} value="0.8ms" label="Avg Latency" change={-5.3} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <SectionHeader 
            subtitle="Our Technology"
            title="Advanced Trading Infrastructure"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Icons.Algorithm}
              title="Smart Order Routing"
              description="Our proprietary algorithm finds the best execution path across multiple exchanges in real-time."
            />
            <FeatureCard 
              icon={Icons.Prism}
              title="Risk Management"
              description="Advanced portfolio hedging with dynamic position limits and automated risk controls."
            />
            <FeatureCard 
              icon={Icons.Shield}
              title="Secure Infrastructure"
              description="Enterprise-grade security with multi-signature wallets and cold storage integration."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <GlassCard className="p-12">
            <h2 className="text-4xl font-light text-slate-900 mb-4">
              Ready to optimize your liquidity?
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Join leading institutions leveraging our market-making infrastructure
            </p>
            <div className="flex gap-4 justify-center">
              <button className="px-8 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors">
                Schedule Demo
              </button>
              <button className="px-8 py-3 border border-slate-300 text-slate-900 rounded-lg hover:bg-white transition-colors">
                Read Documentation
              </button>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-slate-600">
            © 2024 Lumina Quant. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Terms</a>
            <a href="#" className="text-slate-600 hover:text-slate-900 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}