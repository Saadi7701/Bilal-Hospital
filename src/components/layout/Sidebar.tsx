import React from "react";
import { RolePortal } from "./Navbar";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Lock,
  UserPlus,
  Search,
  Calendar,
  Stethoscope,
  FileText,
  TestTube,
  Radio,
  Pill,
  Package,
  History,
  AlertTriangle,
  HeartPulse,
  Activity,
  Bed,
  FileSpreadsheet,
  ShieldCheck,
  Server,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Folder,
} from "lucide-react";

interface SidebarProps {
  activePortal: RolePortal;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePortal,
  activeTab,
  onSelectTab,
}) => {
  const getNavItems = () => {
    switch (activePortal) {
      case "ADMIN":
        return [
          { id: "analytics", label: "Daily Executive Analysis & Charts", icon: LayoutDashboard },
          { id: "cash_in_table", label: "Daily Cash In Table (Depts)", icon: TrendingUp },
          { id: "cash_out_table", label: "Daily Cash Out Table (Causes)", icon: TrendingDown },
          { id: "cash_ledger", label: "All Transactions Ledger", icon: Wallet },
          { id: "cash_closing", label: "Daily Cash Closing", icon: Lock },
          { id: "users_rbac", label: "User Roles & Staff Passwords", icon: ShieldCheck },
          { id: "audit_logs", label: "Immutable Audit Logs", icon: History },
          { id: "system_health", label: "DB, PITR & Backup Health", icon: Server },
        ];
      case "RECEPTIONIST":
        return [
          { id: "overview", label: "Reception Dashboard", icon: LayoutDashboard },
          { id: "patient_search", label: "Search & Register Patient", icon: Search },
          { id: "new_visit", label: "New Encounter & Fee", icon: Calendar },
          { id: "ot_gyne_reg", label: "OT & Gyne Admission", icon: Bed },
          { id: "hospital_forms", label: "Hospital Forms", icon: FileText },
          { id: "patient_archive", label: "Patient Files / Archive", icon: Folder },
        ];
      case "CONSULTANT":
        return [
          { id: "queue", label: "Waiting Patient Queue", icon: Stethoscope },
          { id: "checked_queue", label: "Daily Checked Patients Queue", icon: CheckCircle2 },
          { id: "doctor_notes", label: "Doctor Notes", icon: FileText },
          { id: "lab_requests", label: "Diagnostic Requests Queue", icon: TestTube },
          { id: "report_review", label: "Lab & Scan Reports Inbox", icon: FileSpreadsheet },
          { id: "patient_archive", label: "Patient Files / Archive", icon: Folder },
        ];
      case "LABORATORY":
        return [
          { id: "lab_queue", label: "Pending Lab Orders", icon: TestTube },
          { id: "result_entry", label: "Enter Test Results", icon: FileSpreadsheet },
          { id: "version_history", label: "Report Version History", icon: History },
          { id: "revision_notices", label: "Consultant Revision Requests", icon: AlertTriangle },
        ];
      case "ULTRASOUND":
        return [
          { id: "us_queue", label: "Ultrasound Requests", icon: Radio },
          { id: "findings_entry", label: "Ultrasound Findings", icon: FileText },
          { id: "us_revisions", label: "Revision Requests", icon: AlertTriangle },
        ];
      case "PHARMACY":
        return [
          { id: "pharmacy_queue", label: "Active Prescriptions Queue", icon: Pill },
          { id: "pharmacy_income", label: "Pharmacy Daily Income & Sales", icon: LayoutDashboard },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Horizontal Navigation Tab Scrollbar (< 768px) */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-2 sticky top-16 z-30 shadow-sm">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Sidebar (>= 768px) */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)] transition-colors duration-300">
        <div className="p-4 space-y-6">
          <div>
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Module Navigation
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <IconComponent
                      className={`w-4 h-4 ${
                        isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-500 dark:text-brand-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Audit Protection</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              All clinical entries & financial transactions are recorded permanently.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-slate-500 text-[10px]">
          <div className="flex items-center justify-between">
            <span>PostgreSQL DB</span>
            <span className="text-emerald-400 font-bold">CONNECTED</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>PITR WAL Sync</span>
            <span className="text-brand-400 font-bold">ACTIVE</span>
          </div>
        </div>
      </aside>
    </>
  );
};
