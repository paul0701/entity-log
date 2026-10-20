import { NavLink } from "react-router-dom";
import { Skull, BarChart3, Globe2 } from "lucide-react";

const TABS = [
  { to: "/log", label: "Log", icon: Skull, id: "log-trial-tab" },
  { to: "/stats", label: "My Stats", icon: BarChart3, id: "my-stats-tab" },
  { to: "/global", label: "Global", icon: Globe2, id: "global-leaderboards-tab" },
];

export const BottomNav = () => (
  <nav data-testid="bottom-nav" className="bottom-nav">
    {TABS.map(({ to, label, icon: Icon, id }) => (
      <NavLink key={to} to={to} data-testid={id}
        className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}>
        <Icon className="h-6 w-6" strokeWidth={2} />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);

export const Disclaimer = () => (
  <footer data-testid="legal-disclaimer" className="disclaimer">
    Unofficial, non-commercial fan project. Dead by Daylight and all related characters are trademarks of
    Behaviour Interactive Inc. and their respective owners. Not affiliated with or endorsed by Behaviour Interactive.
  </footer>
);

export const PageHeader = ({ eyebrow, title, right }) => (
  <header className="flex items-end justify-between gap-3 px-4 pt-6 pb-4 fade-up">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-stone-100 title-glow">{title}</h1>
    </div>
    {right}
  </header>
);

export const Shell = ({ children }) => (
  <div className="app-shell">
    <div className="grain" aria-hidden />
    <main className="relative z-10 flex-1 pb-4">{children}</main>
    <Disclaimer />
    <BottomNav />
  </div>
);
