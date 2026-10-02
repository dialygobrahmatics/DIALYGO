import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, Bell, ChevronLeft, ChevronRight, Home, LogOut, Search, ShieldCheck, ChevronDown, UserRound, Rocket,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ROLES } from "@/config/roles";
import { navByRole, commonNav, pageTitles } from "@/config/nav";
import { patients } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const notifications = [
  { title: "Access flow below threshold", detail: "Ramesh Iyer — 480 mL/min recorded on 2026-05-28", tone: "alert" },
  { title: "Prescription awaiting sign-off", detail: "Session #128 core-engine output pending clinician review", tone: "warn" },
  { title: "Laboratory report uploaded", detail: "Fatima Sheikh — CBC/RFT 2026-06-05", tone: "info" },
];

const SidebarLinks = ({ role, onNavigate, collapsed }) => (
  <nav className="flex-1 overflow-y-auto py-3" data-testid="sidebar-nav">
    {(navByRole[role] || []).map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        data-testid={`nav-${item.to.split("/").filter(Boolean).join("-")}`}
        className={({ isActive }) =>
          `flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isActive ? "bg-white text-navy shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
          }`
        }
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    ))}
    <div className="mt-4 pt-3 border-t border-white/15 mx-2">
      {commonNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          data-testid="nav-roadmap"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive ? "bg-white text-navy shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default function AppLayout({ children }) {
  const { user, role, logout, selectedPatientId, setSelectedPatientId, customPatients } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const crumb = pageTitles[location.pathname] || ["DialyGo", "Overview"];
  const allPatients = [...patients, ...customPatients];
  const results = q ? allPatients.filter((p) => `${p.name} ${p.id} ${p.uhid}`.toLowerCase().includes(q.toLowerCase())) : [];

  // Functional breadcrumb for the Patients flow only; other pages keep their existing static crumb.
  const patientFlow = {
    doctor: { list: "/doctor/patients", main: "/doctor/patient-360", subs: ["/doctor/clinical-history", "/doctor/dialysis-history", "/doctor/vascular", "/doctor/core-analysis", "/doctor/reports", "/doctor/clinical-review"] },
    operator: { list: "/operator/search", main: "/operator/pre-session", subs: ["/operator/current-session", "/operator/history", "/operator/vascular", "/operator/machine-insights", "/operator/procedure-support", "/operator/reports"] },
  }[role];

  const activePatient = allPatients.find((p) => p.id === selectedPatientId);
  const homeTo = ROLES[role]?.home || "/";
  const path = location.pathname;

  let crumbs = [{ label: crumb[0] }, { label: crumb[1] }];
  if (patientFlow) {
    if (path === patientFlow.list) {
      crumbs = [{ label: "Home", to: homeTo }, { label: "Patients" }];
    } else if (path === patientFlow.main && activePatient) {
      crumbs = [{ label: "Home", to: homeTo }, { label: "Patients", to: patientFlow.list }, { label: activePatient.name }];
    } else if (patientFlow.subs.includes(path) && activePatient) {
      crumbs = [
        { label: "Home", to: homeTo },
        { label: "Patients", to: patientFlow.list },
        { label: activePatient.name, to: patientFlow.main },
        { label: crumb[1] },
      ];
    }
  }
  const currentTitle = crumbs[crumbs.length - 1].label;

  const brand = (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm px-2.5 py-1">
        <img src="/dialygo-logo.png" alt="DialyGo" className={`object-contain max-h-full ${collapsed ? "w-12" : "w-[128px]"}`} data-testid="brand-logo" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={`hidden lg:flex flex-col dg-gradient-navy sticky top-0 h-screen transition-[width] duration-200 ${collapsed ? "w-[76px]" : "w-64"}`}
        data-testid="sidebar"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/12">
          {brand}
          <button
            data-testid="sidebar-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            className="text-white/60 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        {!collapsed && (
          <div className="px-4 py-3 border-b border-white/12">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/45">Role modules</p>
            <p className="text-sm font-semibold text-white mt-1">{ROLES[role]?.label}</p>
          </div>
        )}
        <SidebarLinks role={role} collapsed={collapsed} />
        {!collapsed && (
          <p className="text-[10px] text-white/45 px-4 py-3 border-t border-white/12 leading-relaxed">
            Phase-I prototype · rule-based decision support · requires qualified clinical review
          </p>
        )}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 no-print">
          <div className="h-16 px-3 sm:px-5 flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" data-testid="mobile-menu-btn">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" aria-label="DialyGo navigation" className="p-0 w-64 dg-gradient-navy border-navy-deep">
                <div className="h-16 flex items-center px-4 border-b border-white/12">{brand}</div>
                <SidebarLinks role={role} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <Link to={ROLES[role]?.home || "/"} data-testid="home-icon-btn" className="h-9 w-9 rounded-xl border border-slate-200 grid place-items-center text-navy hover:border-navy hover:bg-navy-tint transition-colors shrink-0">
              <Home className="h-4 w-4" />
            </Link>

            <div className="min-w-0 hidden sm:block">
              <p className="overline flex items-center gap-1" data-testid="breadcrumb">
                {crumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {c.to ? (
                      <Link to={c.to} data-testid={`breadcrumb-link-${i}`} className="hover:text-navy transition-colors">{c.label}</Link>
                    ) : (
                      <span>{c.label}</span>
                    )}
                    {i < crumbs.length - 1 && <span className="text-slate-300">/</span>}
                  </span>
                ))}
              </p>
              <h2 className="font-head font-bold leading-none truncate">{currentTitle}</h2>
            </div>

            <div className="flex-1" />

            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative hidden md:block w-64">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    data-testid="topbar-search-input"
                    value={q}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
                    placeholder="Search patients"
                    className="pl-9 h-9"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent align="end" onOpenAutoFocus={(e) => e.preventDefault()} className="w-80 p-2" data-testid="topbar-search-results">
                {results.length === 0 ? (
                  <p className="text-sm text-slate-500 p-2">Type a patient name, DialyGo ID or UHID.</p>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.id}
                      data-testid={`search-result-${p.id}`}
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setQ("");
                        setSearchOpen(false);
                        navigate(role === "doctor" ? "/doctor/patient-360" : "/operator/pre-session");
                      }}
                      className="w-full text-left px-3 py-2 rounded hover:bg-slate-100 transition-colors"
                    >
                      <p className="text-sm font-semibold">{p.name}</p>
                      <p className="metric-num text-xs text-slate-500">{p.id} · {p.vascular.type}</p>
                    </button>
                  ))
                )}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative" data-testid="notifications-btn">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-white text-[10px] grid place-items-center">3</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-2" data-testid="notifications-panel">
                <p className="overline px-2 py-1">Notifications</p>
                {notifications.map((n, i) => (
                  <div key={i} className="px-2 py-2 rounded hover:bg-slate-50 transition-colors">
                    <p className={`text-sm font-semibold ${n.tone === "alert" ? "text-red-700" : n.tone === "warn" ? "text-amber-800" : "text-slate-800"}`}>{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.detail}</p>
                  </div>
                ))}
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="profile-menu-btn" className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl border border-slate-200 hover:border-navy transition-colors">
                  <span className="h-7 w-7 rounded-full bg-navy-tint border border-[#c3dcf7] grid place-items-center">
                    <UserRound className="h-4 w-4 text-navy" />
                  </span>
                  <span className="hidden sm:block text-left">
                    <span className="block text-xs font-semibold leading-none" data-testid="profile-name">{user?.name}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">{ROLES[role]?.label}</span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60" data-testid="profile-menu">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-slate-500 metric-num">{user?.id} · {user?.title}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/roadmap")} data-testid="profile-roadmap-item">
                  <Rocket className="h-4 w-4 mr-2" /> Future roadmap
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="logout-btn" onClick={async () => { await logout(); navigate("/"); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="px-3 sm:px-5 pb-2.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
              <ShieldCheck className="h-3.5 w-3.5" /> DPDP consent on file
            </span>
            <span className="text-xs font-semibold dg-chip-navy rounded-full px-2.5 py-0.5">Prototype Analysis · Decision Support Only</span>
            {role !== "patient" && role !== "techadmin" && role !== "dialysisadmin" && (
              <span className="text-xs text-slate-600" data-testid="active-patient-chip">
                Active patient: <span className="font-semibold">{allPatients.find((p) => p.id === selectedPatientId)?.name}</span>
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 min-w-0">{children}</main>

        <footer className="px-4 sm:px-6 py-5 no-print">
          <p className="text-xs text-slate-500 border-t border-slate-200 pt-4">
            DialyGo Phase-I prototype · Rule-based, illustrative, mock-data core engine. Not predictive ML, not image analysis,
            not autonomous machine control. No hereditary or gene-level personalisation is captured or used. Requires qualified
            clinical review before any recommendation is applied.
          </p>
        </footer>
      </div>
    </div>
  );
}
