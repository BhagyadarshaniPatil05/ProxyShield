import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Upload, Sliders, BarChart3, Home, Database, ShieldCheck } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { to: '/', label: 'Overview', icon: Home, end: true },
    { to: '/dashboard', label: 'Audit Dashboard', icon: LayoutDashboard },
    { to: '/datasets/upload', label: 'Dataset Upload', icon: Upload },
    { to: '/audit/new', label: 'Audit Configuration', icon: Sliders },
    { to: '/audit/latest/results', label: 'Audit Results', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase px-3 mb-2 font-semibold">
            Audit Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400 font-medium border border-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="text-[10px] font-mono tracking-wider text-slate-500 uppercase px-3 mb-2 font-semibold">
            Audit Flow
          </div>
          <div className="px-3 py-3 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-cyan-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>1. Understand Data</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span>2. Model Performance</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span>3. Fairness Check</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span>4. Proxy Signals</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span>5. Model Reliance</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span>6. Feature Impact</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span>7. Mitigation</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span>8. Trade-off</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
              <span>9. Review & Decision</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/60 text-xs text-slate-400 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>ProxyShield Framework</span>
      </div>
    </aside>
  );
};

export default Sidebar;
