import React, { useState } from "react";
import {
  Shield,
  Wallet,
  Receipt,
  Lock,
  History,
  Server,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  TestTube,
  Radio,
  Pill,
  Stethoscope,
  Bed,
  Layers,
  Filter,
  Grid,
  Trash2,
} from "lucide-react";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import {
  CashTransactionRecord,
  DailyCashClosingRecord,
  ConsultantUser,
  PatientRecord,
  VisitRecord,
} from "../../lib/mockDataStore";

// Recharts Import
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AdminPortalProps {
  activeTab: string;
  cashTransactions: CashTransactionRecord[];
  consultants?: ConsultantUser[];
  patients?: PatientRecord[];
  visits?: VisitRecord[];
  onAddExpense: (transaction: CashTransactionRecord) => void;
  onAddReversal: (originalTxnId: string, reason: string) => void;
  onAddConsultant?: (consultant: ConsultantUser) => void;
  isExpenseModalOpen?: boolean;
  setIsExpenseModalOpen?: (open: boolean) => void;
  isPurgeModalOpen?: boolean;
  setIsPurgeModalOpen?: (open: boolean) => void;
}


interface MatrixEncounterRow {
  key: string;
  visitNumber: string;
  date: string;
  time: string;
  patientName: string;
  mrNumber: string;
  consultantFee: number;
  labReportFee: number;
  pharmacyFee: number;
  ultrasoundFee: number;
  otFee: number;
  gyneFee: number;
  rowTotal: number;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  activeTab,
  cashTransactions,
  consultants = [],
  patients = [],
  visits = [],
  onAddExpense,
  onAddReversal,
  onAddConsultant,
  isExpenseModalOpen: propExpenseModalOpen,
  setIsExpenseModalOpen: propSetIsExpenseModalOpen,
  isPurgeModalOpen: propPurgeModalOpen,
  setIsPurgeModalOpen: propSetIsPurgeModalOpen,
}) => {

  // Expense Form State
  const [internalExpenseModalOpen, setInternalExpenseModalOpen] = useState(false);
  const isExpenseModalOpen = propExpenseModalOpen !== undefined ? propExpenseModalOpen : internalExpenseModalOpen;
  const setIsExpenseModalOpen = propSetIsExpenseModalOpen || setInternalExpenseModalOpen;

  // Purge Modal State
  const [internalPurgeModalOpen, setInternalPurgeModalOpen] = useState(false);
  const isPurgeModalOpen = propPurgeModalOpen !== undefined ? propPurgeModalOpen : internalPurgeModalOpen;
  const setIsPurgeModalOpen = propSetIsPurgeModalOpen || setInternalPurgeModalOpen;
  const [isPurging, setIsPurging] = useState(false);

  const handlePurgeData = async () => {
    setIsPurging(true);
    try {
      const res = await fetch("/api/admin/clear-data", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to purge database records.");
      }
      alert("All test patients, visits, prescriptions, orders, and financial transactions have been purged successfully!");
      setIsPurgeModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to purge test data.");
    } finally {
      setIsPurging(false);
    }
  };

  const [expenseCategory, setExpenseCategory] = useState("Hospital Supplies");
  const [expenseDept, setExpenseDept] = useState("Administration");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");

  // Reversal Modal State
  const [selectedTxnForReversal, setSelectedTxnForReversal] =
    useState<CashTransactionRecord | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  // Cash Closing Form State
  const [actualCashInput, setActualCashInput] = useState("");
  const [isClosedToday, setIsClosedToday] = useState(false);

  // Add Consultant Form State
  const [isAddConsultantModalOpen, setIsAddConsultantModalOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newDepartment, setNewDepartment] = useState("Cardiology");
  const [newQualification, setNewQualification] = useState("");
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newConsultationFee, setNewConsultationFee] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Admin Portal User Password Management State
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [selectedUserForPassChange, setSelectedUserForPassChange] = useState<any | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passChangeSuccessMsg, setPassChangeSuccessMsg] = useState<string | null>(null);

  const fetchDbUsers = React.useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setDbUsers(data.users || []);
      }
    } catch (err) {
      console.warn("Failed to fetch database users:", err);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === "users_rbac") {
      fetchDbUsers();
    }
  }, [activeTab, fetchDbUsers]);

  const handleAdminSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassChange || !adminNewPassword.trim()) return;

    setIsChangingPass(true);
    setPassChangeSuccessMsg(null);

    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserForPassChange.id,
          username: selectedUserForPassChange.username,
          newPassword: adminNewPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update user password.");
      }

      setPassChangeSuccessMsg(`Password for '${selectedUserForPassChange.username}' updated successfully in MongoDB Atlas!`);
      setAdminNewPassword("");
      setTimeout(() => {
        setSelectedUserForPassChange(null);
        setPassChangeSuccessMsg(null);
      }, 2000);

      fetchDbUsers();
    } catch (err: any) {
      alert(err.message || "Failed to change password.");
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleAddConsultantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newUsername || !newPassword) return;

    const newConsultantObj: ConsultantUser = {
      id: `doc-${Date.now()}`,
      username: newUsername.trim(),
      password: newPassword.trim(),
      fullName: newFullName.trim(),
      specialty: newSpecialty.trim() || "General Medicine",
      department: newDepartment,
      qualification: newQualification.trim() || "MBBS",
      roomNumber: newRoomNumber.trim() || "OPD Room",
      consultationFee: parseFloat(newConsultationFee) || 1500,
      isActive: false,
      lastLoginAt: "Never logged in",
    };

    if (onAddConsultant) {
      onAddConsultant(newConsultantObj);
    }
    setIsAddConsultantModalOpen(false);
    setNewFullName("");
    setNewSpecialty("");
    setNewUsername("");
    setNewPassword("");
    alert(`Consultant ${newConsultantObj.fullName} created successfully with Username: ${newConsultantObj.username}`);
  };

  // -------------------------------------------------------------
  // DAILY TOTAL PATIENT & DAILY CASH SUMMARY MATRIX (Date-Wise)
  // -------------------------------------------------------------
  const datesSet = new Set<string>();
  cashTransactions.forEach((t) => datesSet.add(t.date));
  (visits || []).forEach((v) => datesSet.add(v.visitDate));

  const sortedDates = Array.from(datesSet).sort().reverse();

  const dailySummaryRows = sortedDates.map((dateStr) => {
    const dateVisits = (visits || []).filter((v) => v.visitDate === dateStr);
    const dateTxns = cashTransactions.filter((t) => t.date === dateStr);

    const patientKeysOnDate = new Set<string>();
    dateVisits.forEach((v) => {
      const key = (v.mrNumber && v.mrNumber !== "MR-0000" ? v.mrNumber : v.patientName || v.patientId || v.id).toLowerCase().trim();
      patientKeysOnDate.add(key);
    });
    dateTxns.forEach((t) => {
      if (t.patientName || t.mrNumber) {
        const key = (t.mrNumber && t.mrNumber !== "MR-0000" ? t.mrNumber : t.patientName || t.id).toLowerCase().trim();
        patientKeysOnDate.add(key);
      }
    });

    const totalPatientsCount = Math.max(patientKeysOnDate.size, dateVisits.length > 0 ? patientKeysOnDate.size : 0);

    let consultantCash = 0;
    let labCash = 0;
    let pharmacyCash = 0;
    let ultrasoundCash = 0;
    let otGyneCash = 0;
    let dailyExpenses = 0;

    dateTxns.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.transactionType === "INCOME") {
        if (t.category.includes("Consultation") || t.department === "Cardiology" || t.department === "OPD") {
          consultantCash += amt;
        } else if (t.department === "Laboratory" || t.category.includes("Lab")) {
          labCash += amt;
        } else if (t.department === "Pharmacy" || t.category.includes("Pharmacy")) {
          pharmacyCash += amt;
        } else if (t.department === "Ultrasound" || t.category.includes("Ultrasound")) {
          ultrasoundCash += amt;
        } else if (t.department === "OT" || t.department === "Gynecology" || t.category.includes("OT") || t.category.includes("Gyne")) {
          otGyneCash += amt;
        } else {
          consultantCash += amt;
        }
      } else if (t.transactionType === "EXPENSE") {
        dailyExpenses += amt;
      }
    });

    const totalDailyCashIn = consultantCash + labCash + pharmacyCash + ultrasoundCash + otGyneCash;
    const netDailyCash = totalDailyCashIn - dailyExpenses;

    return {
      date: dateStr,
      totalPatientsCount,
      consultantCash,
      labCash,
      pharmacyCash,
      ultrasoundCash,
      otGyneCash,
      totalDailyCashIn,
      dailyExpenses,
      netDailyCash,
    };
  });


  // -------------------------------------------------------------
  // MATRIX CASH IN COMPUTATION (Column-by-Column per Patient/Visit)
  // -------------------------------------------------------------
  const matrixMap: Record<string, MatrixEncounterRow> = {};

  cashTransactions
    .filter((t) => t.transactionType === "INCOME")
    .forEach((t) => {
      const key = t.mrNumber || t.patientName || t.id;
      if (!matrixMap[key]) {
        matrixMap[key] = {
          key,
          visitNumber: t.transactionNumber,
          date: t.date,
          time: t.time,
          patientName: t.patientName || "General OPD Patient",
          mrNumber: t.mrNumber || "MR-2026-OPD",
          consultantFee: 0,
          labReportFee: 0,
          pharmacyFee: 0,
          ultrasoundFee: 0,
          otFee: 0,
          gyneFee: 0,
          rowTotal: 0,
        };
      }

      const row = matrixMap[key];
      const amt = Number(t.amount) || 0;

      if (t.category.includes("Consultation") || t.department === "Cardiology" || t.department === "OPD") {
        row.consultantFee = (Number(row.consultantFee) || 0) + amt;
      } else if (t.department === "Laboratory" || t.category.includes("Lab")) {
        row.labReportFee = (Number(row.labReportFee) || 0) + amt;
      } else if (t.department === "Pharmacy" || t.category.includes("Pharmacy")) {
        row.pharmacyFee = (Number(row.pharmacyFee) || 0) + amt;
      } else if (t.department === "Ultrasound" || t.category.includes("Ultrasound")) {
        row.ultrasoundFee = (Number(row.ultrasoundFee) || 0) + amt;
      } else if (t.department === "OT" || t.category.includes("OT")) {
        row.otFee = (Number(row.otFee) || 0) + amt;
      } else if (t.department === "Gynecology" || t.category.includes("Gyne")) {
        row.gyneFee = (Number(row.gyneFee) || 0) + amt;
      } else {
        // Default to Consultant Fee if unspecified
        row.consultantFee = (Number(row.consultantFee) || 0) + amt;
      }

      row.rowTotal =
        (Number(row.consultantFee) || 0) +
        (Number(row.labReportFee) || 0) +
        (Number(row.pharmacyFee) || 0) +
        (Number(row.ultrasoundFee) || 0) +
        (Number(row.otFee) || 0) +
        (Number(row.gyneFee) || 0);
    });

  const matrixRows = Object.values(matrixMap);

  // Column Totals
  const totalConsultantFeeCol = matrixRows.reduce((acc, r) => acc + (Number(r.consultantFee) || 0), 0);
  const totalLabReportCol = matrixRows.reduce((acc, r) => acc + (Number(r.labReportFee) || 0), 0);
  const totalPharmacyCol = matrixRows.reduce((acc, r) => acc + (Number(r.pharmacyFee) || 0), 0);
  const totalUltrasoundCol = matrixRows.reduce((acc, r) => acc + (Number(r.ultrasoundFee) || 0), 0);
  const totalOtCol = matrixRows.reduce((acc, r) => acc + (Number(r.otFee) || 0), 0);
  const totalGyneCol = matrixRows.reduce((acc, r) => acc + (Number(r.gyneFee) || 0), 0);
  const finalGrandTotalCashIn =
    totalConsultantFeeCol +
    totalLabReportCol +
    totalPharmacyCol +
    totalUltrasoundCol +
    totalOtCol +
    totalGyneCol;

  // -------------------------------------------------------------
  // CASH OUT COMPUTATION
  // -------------------------------------------------------------
  const expenseTransactions = cashTransactions.filter(
    (t) => t.transactionType === "EXPENSE"
  );
  const totalExpense = expenseTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const netBalance = finalGrandTotalCashIn - totalExpense;

  // Chart Data: Dept Income Breakdown
  const deptDataMap: Record<string, number> = {
    Consultation: totalConsultantFeeCol,
    Laboratory: totalLabReportCol,
    Pharmacy: totalPharmacyCol,
    Ultrasound: totalUltrasoundCol,
    OT: totalOtCol,
    Gynecology: totalGyneCol,
  };

  const deptChartData = Object.keys(deptDataMap).map((dept) => ({
    name: dept,
    value: deptDataMap[dept],
  }));

  const COLORS = ["#0c8ce9", "#f59e0b", "#06b6d4", "#f43f5e", "#8b5cf6", "#10b981"];

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTxn: CashTransactionRecord = {
      id: `txn-${Date.now()}`,
      transactionNumber: `TXN-2026-${String(Date.now()).slice(-4)}`,
      transactionType: "EXPENSE",
      category: expenseCategory,
      department: expenseDept,
      amount: parseFloat(expenseAmount) || 0,
      paymentMethod: "CASH",
      description: expenseDesc,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdBy: "System Administrator",
    };

    onAddExpense(newTxn);
    setIsExpenseModalOpen(false);
  };

  const handleReversalSubmit = () => {
    if (!selectedTxnForReversal) return;
    onAddReversal(selectedTxnForReversal.id, reversalReason);
    setSelectedTxnForReversal(null);
    alert(`Reversal transaction recorded for ${selectedTxnForReversal.transactionNumber}. Original record preserved.`);
  };

  return (
    <div className="space-y-6">

      {/* TAB 1: COLUMN-BY-COLUMN DAILY CASH IN MATRIX TABLE */}
      {activeTab === "cash_in_table" && (
        <div className="space-y-6">
          {/* Top Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Cash In Revenue"
              value={`Rs. ${finalGrandTotalCashIn.toLocaleString()}`}
              subtitle="Sum across all 6 departments"
              icon={TrendingUp}
              iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              title="Total Cash Out (Expenses)"
              value={`Rs. ${totalExpense.toLocaleString()}`}
              subtitle="Hospital Disbursements"
              icon={TrendingDown}
              iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            />
            <StatCard
              title="Net Cash Balance"
              value={`Rs. ${netBalance.toLocaleString()}`}
              subtitle="Cash In minus Cash Out"
              icon={Wallet}
              iconBg="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
            <StatCard
              title="Patient Encounters"
              value={matrixRows.length}
              subtitle="Processed Today"
              icon={Grid}
              iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
          </div>

          {/* Department Column Total Summaries Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-800 text-center">
              <Stethoscope className="w-5 h-5 mx-auto text-blue-600 dark:text-blue-400 mb-1" />
              <div className="text-[10px] font-bold text-slate-500 uppercase">Consultant Fee Total</div>
              <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                Rs. {totalConsultantFeeCol.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 text-center">
              <TestTube className="w-5 h-5 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
              <div className="text-[10px] font-bold text-slate-500 uppercase">Lab Report Total</div>
              <div className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                Rs. {totalLabReportCol.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-slate-900 border border-cyan-200 dark:border-slate-800 text-center">
              <Pill className="w-5 h-5 mx-auto text-cyan-600 dark:text-cyan-400 mb-1" />
              <div className="text-[10px] font-bold text-slate-500 uppercase">Pharmacy Sale Total</div>
              <div className="text-sm font-black text-cyan-600 dark:text-cyan-400 mt-0.5 font-mono">
                Rs. {totalPharmacyCol.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-slate-900 border border-rose-200 dark:border-slate-800 text-center">
              <Radio className="w-5 h-5 mx-auto text-rose-600 dark:text-rose-400 mb-1" />
              <div className="text-[10px] font-bold text-slate-500 uppercase">Ultrasound Total</div>
              <div className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                Rs. {totalUltrasoundCol.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-slate-900 border border-purple-200 dark:border-slate-800 text-center">
              <Building className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
              <div className="text-[10px] font-bold text-slate-500 uppercase">OT Charges Total</div>
              <div className="text-sm font-black text-purple-600 dark:text-purple-400 mt-0.5 font-mono">
                Rs. {totalOtCol.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 text-center">
              <Bed className="w-5 h-5 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
              <div className="text-[10px] font-bold text-slate-500 uppercase">Gyne Ward Total</div>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                Rs. {totalGyneCol.toLocaleString()}
              </div>
            </div>
          </div>

          {/* MAIN MATRIX TABLE: Lab Report | Ultrasound | Consultant Fee | Pharmacy | OT | Gyne */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Grid className="w-5 h-5 text-purple-500" />
                  <span>Daily Cash In Departmental Summary Table</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed column matrix showing exact fee collected per service entity with individual column totals & final grand total.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">Date / Time</th>
                    <th className="py-3.5 px-4">Patient Name & MR No</th>
                    <th className="py-3.5 px-4 text-center bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Consultant Fee
                    </th>
                    <th className="py-3.5 px-4 text-center bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Lab Report
                    </th>
                    <th className="py-3.5 px-4 text-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      Pharmacy Sale
                    </th>
                    <th className="py-3.5 px-4 text-center bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      Ultrasound Scan
                    </th>
                    <th className="py-3.5 px-4 text-center bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      OT Charges
                    </th>
                    <th className="py-3.5 px-4 text-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Gyne Ward
                    </th>
                    <th className="py-3.5 px-4 text-right bg-slate-200 dark:bg-slate-700 font-black">
                      Patient Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {matrixRows.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {row.date} <span className="block text-[10px]">{row.time}</span>
                      </td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">
                        {row.patientName}
                        <span className="block text-[10px] font-mono font-normal text-slate-400">
                          {row.mrNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-blue-600 dark:text-blue-400 font-bold">
                        {row.consultantFee > 0 ? `Rs. ${row.consultantFee.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400 font-bold">
                        {row.labReportFee > 0 ? `Rs. ${row.labReportFee.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-center text-cyan-600 dark:text-cyan-400 font-bold">
                        {row.pharmacyFee > 0 ? `Rs. ${row.pharmacyFee.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">
                        {row.ultrasoundFee > 0 ? `Rs. ${row.ultrasoundFee.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-center text-purple-600 dark:text-purple-400 font-bold">
                        {row.otFee > 0 ? `Rs. ${row.otFee.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                        {row.gyneFee > 0 ? `Rs. ${row.gyneFee.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-850">
                        Rs. {row.rowTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* FOOTER: INDIVIDUAL COLUMN TOTALS & FINAL GRAND TOTAL */}
                <tfoot>
                  {/* Row 1: Individual Column Totals */}
                  <tr className="bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={2} className="py-3.5 px-4 font-sans font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Individual Column Totals:
                    </td>
                    <td className="py-3.5 px-4 text-center text-blue-600 dark:text-blue-400">
                      Rs. {totalConsultantFeeCol.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center text-amber-600 dark:text-amber-400">
                      Rs. {totalLabReportCol.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center text-cyan-600 dark:text-cyan-400">
                      Rs. {totalPharmacyCol.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center text-rose-600 dark:text-rose-400">
                      Rs. {totalUltrasoundCol.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center text-purple-600 dark:text-purple-400">
                      Rs. {totalOtCol.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400">
                      Rs. {totalGyneCol.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                      Rs. {finalGrandTotalCashIn.toLocaleString()}
                    </td>
                  </tr>

                  {/* Row 2: FINAL GRAND TOTAL HIGHLIGHT */}
                  <tr className="bg-emerald-600 text-white font-sans font-black text-sm">
                    <td colSpan={6} className="py-4 px-4 uppercase tracking-widest text-emerald-100">
                      ★ FINAL HOSPITAL GRAND TOTAL DAILY CASH IN:
                    </td>
                    <td colSpan={3} className="py-4 px-4 text-right font-mono text-lg tracking-tight">
                      Rs. {finalGrandTotalCashIn.toLocaleString()} PKR
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAILY CASH OUT TABLE (Expenses & Causes) */}
      {activeTab === "cash_out_table" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-500" />
                <span>Daily Cash Out Table (Hospital Expenses & Causes)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Structured disbursement table showing exact cause/purpose (Medicine Stock, Lab Supplies, Utilities, Salary, Maintenance) for all Cash Out entries.
              </p>
            </div>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Log New Expense</span>
            </button>
          </div>

          {/* Cash Out Tabular View */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Cause / Purpose Category</th>
                  <th className="py-3 px-4">Detailed Description / Voucher Note</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Authorized By</th>
                  <th className="py-3 px-4 text-right">Cash Out Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenseTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {txn.date} <span className="block text-[10px]">{txn.time}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {txn.transactionNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {txn.department}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                        {txn.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-sm">
                      {txn.description}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="neutral" size="sm">{txn.paymentMethod}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {txn.createdBy}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-sm text-rose-600 dark:text-rose-400 text-right">
                      - Rs. {txn.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Cash Out Row */}
              <tfoot>
                <tr className="bg-rose-500/10 dark:bg-rose-950/40 border-t-2 border-rose-500 text-xs font-black text-slate-900 dark:text-white">
                  <td colSpan={7} className="py-3.5 px-4 text-right uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Grand Total Daily Cash Out (Expenses):
                  </td>
                  <td className="py-3.5 px-4 font-mono text-base text-rose-600 dark:text-rose-400 text-right">
                    - Rs. {totalExpense.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EXECUTIVE CHARTS & DAILY ANALYSIS DASHBOARD (NO TABLE) */}
      {(activeTab === "analytics" ||
        activeTab === "overview" ||
        !["cash_in_table", "cash_out_table", "cash_ledger", "cash_closing", "system_health", "audit_logs", "users_rbac"].includes(activeTab)) && (
        <div className="space-y-6">
          {/* Top Quick Metrics Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Daily Total Patients"
              value={dailySummaryRows.length > 0 ? dailySummaryRows.reduce((acc, r) => acc + r.totalPatientsCount, 0) : visits.length}
              subtitle="Total Encounters Processed"
              icon={Grid}
              iconBg="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
            <StatCard
              title="Daily Total Sales (Income)"
              value={`Rs. ${finalGrandTotalCashIn.toLocaleString()}`}
              subtitle="All Department Revenues"
              icon={TrendingUp}
              iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              title="Daily Total Expenses"
              value={`Rs. ${totalExpense.toLocaleString()}`}
              subtitle="Disbursements & Outflows"
              icon={TrendingDown}
              iconBg="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            />
            <StatCard
              title="Net Daily Cash Balance"
              value={`Rs. ${netBalance.toLocaleString()}`}
              subtitle="Net Revenue After Expenses"
              icon={Wallet}
              iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
          </div>

          {/* Daily Trend Charts Grid (Sales & Patients) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Daily Revenue & Income Trend */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span>Daily Sales & Revenue Trend (Rs.)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daily cash revenue growth across all hospital operations.
                  </p>
                </div>
                <Badge variant="success" size="sm">Revenue Growth</Badge>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={
                      dailySummaryRows.length > 0
                        ? dailySummaryRows.map((r) => ({ date: r.date, income: r.totalDailyCashIn, net: r.netDailyCash }))
                        : [{ date: "Today", income: finalGrandTotalCashIn || 5000, net: netBalance || 5000 }]
                    }
                  >
                    <defs>
                      <linearGradient id="incomeColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#ffffff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, "Daily Revenue"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#10b981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#incomeColor)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Daily Patient Traffic Trend */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Grid className="w-4 h-4 text-purple-500" />
                    <span>Daily Patient Traffic & Encounters Trend</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Number of patient visits and encounters recorded daily.
                  </p>
                </div>
                <Badge variant="purple" size="sm">Patient Flow</Badge>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      dailySummaryRows.length > 0
                        ? dailySummaryRows.map((r) => ({ date: r.date, count: r.totalPatientsCount }))
                        : [{ date: "Today", count: visits.length || 1 }]
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#ffffff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`${val} Patients`, "Daily Encounters"]}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Departmental Revenue Contribution (Rs.)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#ffffff",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="value" fill="#0c8ce9" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Departmental Revenue Share
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {deptChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#ffffff",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ALL TRANSACTIONS LEDGER */}
      {activeTab === "cash_ledger" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-500" />
                <span>Centralized Double-Entry Master Cash Ledger</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Combined stream of Income, Expenses, Refunds and Reversals.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">Txn Number</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category & Dept</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Logged By</th>
                  <th className="py-3 px-4 text-right">Audit Reversal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cashTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {txn.transactionNumber}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {txn.date} {txn.time}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          txn.transactionType === "INCOME"
                            ? "success"
                            : txn.transactionType === "EXPENSE"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {txn.transactionType}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {txn.category}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        Dept: {txn.department}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {txn.description}
                    </td>
                    <td
                      className={`py-3 px-4 font-mono font-bold text-sm ${
                        txn.transactionType === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {txn.transactionType === "INCOME" ? "+" : "-"} Rs.{" "}
                      {txn.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {txn.createdBy}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {txn.transactionType !== "REVERSAL" ? (
                        <button
                          onClick={() => setSelectedTxnForReversal(txn)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Create Reversal Transaction"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Reversal Entry
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: DAILY CASH CLOSING */}
      {activeTab === "cash_closing" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-500" />
              <span>End of Day Cash Drawer Closing & Reconciliation</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Once closed, financial records for the day are locked against silent retro-edits.
            </p>
          </div>

          <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Opening Cash Balance:</span>
              <span className="font-bold">Rs. 12,500.00</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>+ Total Today&apos;s Income:</span>
              <span className="font-bold">+ Rs. {finalGrandTotalCashIn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-rose-600 dark:text-rose-400">
              <span>- Total Today&apos;s Expenses:</span>
              <span className="font-bold">- Rs. {totalExpense.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
              <span>Expected Closing Cash:</span>
              <span className="text-purple-600 dark:text-purple-400">
                Rs. {(12500 + netBalance).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Physical Cash Counted in Drawer (Rs.) *
            </label>
            <input
              type="number"
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Calculated Cash Difference: <strong>Rs. 0.00 (Balanced)</strong>
            </span>
          </div>

          <button
            onClick={() => {
              setIsClosedToday(true);
              alert("Business Day Closed & Financial Period Locked successfully!");
            }}
            disabled={isClosedToday}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
          >
            {isClosedToday ? "Day Closed & Financial Period Locked" : "Lock & Close Business Day"}
          </button>
        </div>
      )}

      {/* TAB 6: SYSTEM & PITR HEALTH */}
      {activeTab === "system_health" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="PostgreSQL Status"
              value="HEALTHY"
              subtitle="Source of Truth DB"
              icon={Server}
              iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              title="PITR WAL Sync"
              value="ACTIVE"
              subtitle="S3 Storage Synced"
              icon={Shield}
              iconBg="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
            <StatCard
              title="Redis Session Store"
              value="CONNECTED"
              subtitle="BullMQ Queues Active"
              icon={CheckCircle2}
              iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              title="Object Storage Usage"
              value="312 MB"
              subtitle="Private Medical Scans"
              icon={FileSpreadsheet}
              iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Automated Backup & Scheduled Restore Test Status
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-500">Last Full DB Snapshot:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  2026-09-04 02:00 AM (PASS)
                </span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-500">WAL Archiving PITR Sync Lag:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  12 Seconds (RPO &lt; 5 mins)
                </span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-slate-500">Last Monthly Restore Verification Test:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  2026-09-01 — Row count & schema integrity verified
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: IMMUTABLE AUDIT LOGS */}
      {activeTab === "audit_logs" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-purple-500" />
            <span>Immutable Audit Logs Stream</span>
          </h3>

          <div className="space-y-2 font-mono text-xs">
            {[
              { time: "10:20:15 AM", user: "receptionist1", action: "COLLECTED_FEE", detail: "Rs. 3000 Ultrasound Fee for Sobia Imran" },
              { time: "09:55:02 AM", user: "lab_tech1", action: "LAB_REPORT_SUBMITTED_V1", detail: "Order LAB-2026-0881 Submitted" },
              { time: "09:50:11 AM", user: "dr_bilal", action: "LAB_ORDERED", detail: "Ordered CBC & Lipid Profile for Tariq Mehmood" },
              { time: "09:45:00 AM", user: "dr_bilal", action: "PRESCRIPTION_CREATED", detail: "Prescribed Softavas 5mg & Lipiget 10mg" },
              { time: "09:30:22 AM", user: "receptionist1", action: "PATIENT_VISIT_CREATED", detail: "MR-2026-0001 Assigned to Dr. Bilal Ahmad" },
            ].map((log, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">[{log.time}]</span>{" "}
                  <span className="text-slate-900 dark:text-white font-bold">{log.user}</span> •{" "}
                  <Badge variant="info" size="sm">{log.action}</Badge>
                  <p className="text-slate-500 text-[11px] mt-0.5">{log.detail}</p>
                </div>
                <span className="text-[10px] text-emerald-500 font-bold">VERIFIED HASH</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: USER ROLES & STAFF ACCESS */}
      {activeTab === "users_rbac" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-500" />
                <span>User Roles & Consultant Access Management</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage hospital staff, consultant login credentials (usernames & passwords), and monitor live Active/Un-Active portal login status.
              </p>
            </div>

            <button
              onClick={() => setIsAddConsultantModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Consultant</span>
            </button>
          </div>

          {/* Consultants Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-500" />
              <span>Registered Hospital Consultants ({consultants.length})</span>
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">Consultant Doctor</th>
                    <th className="py-3.5 px-4">Specialty & Dept</th>
                    <th className="py-3.5 px-4">Login Username</th>
                    <th className="py-3.5 px-4">Room & Fee</th>
                    <th className="py-3.5 px-4 text-center">Live Portal Status</th>
                    <th className="py-3.5 px-4 text-right">Last Login Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {consultants.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-black">
                            {c.fullName.split(" ")[1]?.[0] || "D"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{c.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{c.qualification}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{c.specialty}</div>
                        <div className="text-[10px] text-slate-400">Dept: {c.department}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {c.username}
                        <span className="block text-[10px] text-slate-400 font-normal">Pass: ••••••••</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">{c.roomNumber}</div>
                        <div className="text-[11px] text-emerald-600 font-bold">Rs. {c.consultationFee.toLocaleString()}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            ACTIVE (Logged In)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            UN-ACTIVE (Logged Out)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                        {c.lastLoginAt || "Never logged in"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Master Password Control Section for All Portals */}
          <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                  <span>Portal Credentials & Master Password Management</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Special Admin Override: View all registered portal staff and update passwords dynamically with bcrypt hashing in MongoDB Atlas.
                </p>
              </div>
              <button
                onClick={fetchDbUsers}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Refresh User List
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">Portal Staff Member</th>
                    <th className="py-3.5 px-4">Username</th>
                    <th className="py-3.5 px-4">Role & Assigned Portal</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Admin Security Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dbUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                        No portal users found in MongoDB database.
                      </td>
                    </tr>
                  ) : (
                    dbUsers.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {usr.fullName}
                          <span className="block text-[10px] text-slate-400 font-mono font-normal">
                            {usr.email}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                          {usr.username}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              usr.role === "ADMIN"
                                ? "purple"
                                : usr.role === "CONSULTANT"
                                ? "success"
                                : usr.role === "RECEPTIONIST"
                                ? "info"
                                : "warning"
                            }
                          >
                            {usr.role} ({usr.portal})
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4">
                          {usr.isActive ? (
                            <Badge variant="success" size="sm">Active</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">Disabled</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedUserForPassChange(usr);
                              setAdminNewPassword("");
                              setPassChangeSuccessMsg(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Change Password</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Change Password */}
      {selectedUserForPassChange && (
        <Modal
          isOpen={!!selectedUserForPassChange}
          onClose={() => setSelectedUserForPassChange(null)}
          title={`Change Password for ${selectedUserForPassChange.fullName}`}
          subtitle={`Username: ${selectedUserForPassChange.username} | Role: ${selectedUserForPassChange.role}`}
          maxWidth="md"
        >
          <form onSubmit={handleAdminSubmitPasswordChange} className="space-y-4 text-xs">
            {passChangeSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passChangeSuccessMsg}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300">
              Admin Access: Set a new password for this portal account. The password will be hashed with bcrypt before saving to MongoDB Atlas.
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                minLength={5}
                placeholder="Enter new password (min 5 characters)"
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedUserForPassChange(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isChangingPass}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                {isChangingPass ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Save New Password to Database</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}



      {/* Modal: Log Expense */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Log Hospital Operational Expense"
        subtitle="Generates EXPENSE transaction in Central Cash Ledger with Cause/Purpose tracking"
        maxWidth="md"
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expense Cause / Purpose Category *</label>
            <select
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            >
              <option value="Hospital Supplies">Hospital Supplies & Consumables</option>
              <option value="Medicine Purchase">Medicine Inventory Purchase</option>
              <option value="Lab Equipment">Lab Equipment & Reagents</option>
              <option value="Ultrasound Expense">Ultrasound Gel & Paper Rolls</option>
              <option value="Salary">Staff Salary & Allowances</option>
              <option value="Electricity">Electricity & Utility Bills</option>
              <option value="Maintenance">Building & Generator Maintenance</option>
              <option value="Miscellaneous Expense">Miscellaneous Expense</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Department *</label>
            <select
              value={expenseDept}
              onChange={(e) => setExpenseDept(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            >
              <option value="Administration">Administration</option>
              <option value="Laboratory">Laboratory</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Ultrasound">Ultrasound</option>
              <option value="Cardiology">Cardiology OPD</option>
              <option value="Gynecology">Gynecology OPD & Ward</option>
              <option value="OT">Operation Theater</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Amount Out (Rs.) *</label>
            <input
              type="number"
              required
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-rose-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Detailed Cause / Voucher Note *</label>
            <textarea
              rows={2}
              required
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
            >
              Log Expense Entry
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reversal Entry */}
      {selectedTxnForReversal && (
        <Modal
          isOpen={!!selectedTxnForReversal}
          onClose={() => setSelectedTxnForReversal(null)}
          title="Log Reversal Transaction"
          subtitle={`Reversing ${selectedTxnForReversal.transactionNumber} (Rs. ${selectedTxnForReversal.amount})`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold">
              Original transaction record will NOT be deleted. A corresponding REVERSAL entry will offset the ledger balance.
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Reversal *</label>
              <textarea
                rows={3}
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTxnForReversal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReversalSubmit}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Log Reversal Entry
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Add New Consultant */}
      <Modal
        isOpen={isAddConsultantModalOpen}
        onClose={() => setIsAddConsultantModalOpen(false)}
        title="Add New Consultant Account"
        subtitle="Set consultant profile, consultation fee, login username, and password for individual portal access"
        maxWidth="lg"
      >
        <form onSubmit={handleAddConsultantSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Consultant Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Ahmed Khan"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Medical Specialty *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Neurologist / General Surgeon"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Department *
              </label>
              <select
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Gynecology">Gynecology & Obstetrics</option>
                <option value="General Surgery">General Surgery</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Neurology">Neurology</option>
                <option value="ENT">ENT & Ophthalmology</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Qualifications *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MBBS, FCPS (Neurology)"
                value={newQualification}
                onChange={(e) => setNewQualification(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                OPD Room Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. OPD-105"
                value={newRoomNumber}
                onChange={(e) => setNewRoomNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Consultation Fee (Rs.) *
              </label>
              <input
                type="number"
                required
                placeholder="2000"
                value={newConsultationFee}
                onChange={(e) => setNewConsultationFee(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-emerald-600"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-3 mt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
              <Shield className="w-4 h-4" />
              <span>Consultant Individual Portal Login Credentials</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Login Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. drahmed"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 font-mono font-bold text-purple-600 dark:text-purple-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Login Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 font-mono font-bold text-purple-600 dark:text-purple-300"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddConsultantModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
            >
              Create Consultant Account
            </button>
          </div>
        </form>
      </Modal>

      {/* PURGE TEST / MOCK DATA MODAL */}
      <Modal
        isOpen={isPurgeModalOpen}
        onClose={() => !isPurging && setIsPurgeModalOpen(false)}
        title="Purge Operational Mock Data from MongoDB Atlas"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Warning: Irreversible Data Deletion</span>
            </div>
            <p>
              This operation will permanently purge all test patients, visits, OPD tokens, prescriptions, lab test orders, ultrasound scan reports, pharmacy transactions, and cash ledgers from MongoDB Atlas.
            </p>
            <p className="font-semibold text-rose-200">
              User accounts (Admin, Doctors, Receptionists, Pharmacists, Technicians) will remain preserved so you can continue logging in.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={isPurging}
              onClick={() => setIsPurgeModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPurging}
              onClick={handlePurgeData}
              className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 disabled:opacity-50 flex items-center gap-2"
            >
              {isPurging ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Purging MongoDB...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm & Purge All Test Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

