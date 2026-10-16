"use client";

import React, { useState } from "react";
import {
  Pill,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  LayoutDashboard,
  Clock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import {
  PrescriptionRecord,
  MedicineRecord,
  CashTransactionRecord,
} from "../../lib/mockDataStore";

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PharmacyPortalProps {
  activeTab: string;
  prescriptions: PrescriptionRecord[];
  medicines?: MedicineRecord[];
  onDispensePrescription: (
    prescriptionId: string,
    transaction: CashTransactionRecord
  ) => void;
  onAddMedicineBatch?: (medicine: MedicineRecord) => void;
}

export const PharmacyPortal: React.FC<PharmacyPortalProps> = ({
  activeTab,
  prescriptions = [],
  onDispensePrescription,
}) => {
  const [selectedRxForDispense, setSelectedRxForDispense] =
    useState<PrescriptionRecord | null>(null);

  const pendingRx = prescriptions.filter((p) => !p.isDispensed);
  const dispensedRx = prescriptions.filter((p) => p.isDispensed);

  // Pharmacy Total Income
  const totalPharmacySales = dispensedRx.length * 1080;
  const avgRxValue = dispensedRx.length > 0 ? totalPharmacySales / dispensedRx.length : 1080;

  const handleDispenseSubmit = () => {
    if (!selectedRxForDispense) return;

    const totalAmt = (selectedRxForDispense.items.length || 1) * 540;

    const newLedgerTxn: CashTransactionRecord = {
      id: `txn-${Date.now()}`,
      patientId: selectedRxForDispense.patientId,
      transactionNumber: `TXN-PHARM-${String(Date.now()).slice(-4)}`,
      transactionType: "INCOME",
      category: "Pharmacy Sale",
      department: "Pharmacy",
      amount: totalAmt,
      paymentMethod: "CASH",
      description: `Prescription Medicine Sale - ${selectedRxForDispense.patientName} (${selectedRxForDispense.mrNumber})`,
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      patientName: selectedRxForDispense.patientName,
      mrNumber: selectedRxForDispense.mrNumber,
      createdBy: "Zainab Bibi (Pharmacist)",
    };

    onDispensePrescription(selectedRxForDispense.id, newLedgerTxn);
    setSelectedRxForDispense(null);
    alert(`Prescription for ${selectedRxForDispense.patientName} dispensed successfully! Rs. ${totalAmt} recorded in Cash Ledger.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cyan-950 via-slate-900 to-slate-900 p-6 rounded-2xl border border-cyan-800/40 shadow-lg text-white">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Pill className="w-4 h-4" />
            <span>Hospital Pharmacy Portal</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Digital Prescriptions & Pharmacy Income Analytics
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Fulfill electronic prescriptions dispatched from OPD clinics and monitor real-time daily pharmacy sales & income.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="info" size="md">
            Active Pharmacy Desk
          </Badge>
        </div>
      </div>

      {/* TAB 1: ACTIVE PRESCRIPTIONS QUEUE */}
      {(activeTab === "pharmacy_queue" || activeTab === "overview" || !["pharmacy_income"].includes(activeTab)) && (
        <div className="space-y-6">
          {/* Top Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Pending Prescriptions"
              value={pendingRx.length}
              subtitle="Awaiting Dispensing"
              icon={Pill}
              iconBg="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            />
            <StatCard
              title="Dispensed Today"
              value={dispensedRx.length}
              subtitle="Completed Pharmacy Sales"
              icon={CheckCircle2}
              iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              title="Today's Pharmacy Income"
              value={`Rs. ${totalPharmacySales.toLocaleString()}`}
              subtitle="Pharmacy Cash Sales"
              icon={TrendingUp}
              iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              title="Avg Rx Ticket Size"
              value={`Rs. ${Math.round(avgRxValue).toLocaleString()}`}
              subtitle="Per Prescription Sale"
              icon={DollarSign}
              iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
          </div>

          {/* Prescriptions Queue Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Pill className="w-5 h-5 text-cyan-500" />
                  <span>Digital Prescriptions Queue (Dispatched from OPD Clinics)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a prescription to view prescribed dosage instructions and record cash medicine sales.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-400 font-mono">
                {prescriptions.length} Total RX
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3.5 px-4">Rx Date / Time</th>
                    <th className="py-3.5 px-4">Patient Name & MR No</th>
                    <th className="py-3.5 px-4">Consultant Doctor</th>
                    <th className="py-3.5 px-4">Clinical Diagnosis</th>
                    <th className="py-3.5 px-4">Prescribed Medicines</th>
                    <th className="py-3.5 px-4">Dispense Status</th>
                    <th className="py-3.5 px-4 text-right">Dispense Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {prescriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No prescriptions currently in queue.
                      </td>
                    </tr>
                  ) : (
                    prescriptions.map((rx) => (
                      <tr key={rx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {rx.prescriptionDate}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {rx.patientName}
                          <span className="block text-[10px] font-mono text-slate-400 font-normal">
                            {rx.mrNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                          {rx.consultantName}
                        </td>
                        <td className="py-3 px-4 font-semibold text-cyan-600 dark:text-cyan-400">
                          {rx.diagnosis}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {rx.items && rx.items.length > 0
                            ? rx.items.map((i) => i.medicineName).join(", ")
                            : "Standard Meds"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={rx.isDispensed ? "success" : "warning"}>
                            {rx.isDispensed ? "DISPENSED" : "PENDING"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!rx.isDispensed ? (
                            <button
                              onClick={() => setSelectedRxForDispense(rx)}
                              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all"
                            >
                              Dispense & Log Sale
                            </button>
                          ) : (
                            <span className="text-[11px] font-mono text-emerald-500 font-bold">
                              ✓ Sale Posted
                            </span>
                          )}
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

      {/* TAB 2: PHARMACY DAILY INCOME & SALES ANALYSIS */}
      {activeTab === "pharmacy_income" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Today's Pharmacy Sales Revenue"
              value={`Rs. ${totalPharmacySales.toLocaleString()}`}
              subtitle="Gross Cash Income"
              icon={TrendingUp}
              iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              title="Dispensed Prescriptions Count"
              value={dispensedRx.length}
              subtitle="Successful Sales Transactions"
              icon={CheckCircle2}
              iconBg="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            />
            <StatCard
              title="Average Ticket Size"
              value={`Rs. ${Math.round(avgRxValue).toLocaleString()}`}
              subtitle="Per Prescription Sale"
              icon={DollarSign}
              iconBg="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-500" />
                    <span>Pharmacy Daily Income Trend (Rs.)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time pharmacy revenue collection performance over time.
                  </p>
                </div>
                <Badge variant="info">Income Trend</Badge>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { time: "09:00 AM", sales: 1620 },
                      { time: "11:00 AM", sales: 3240 },
                      { time: "01:00 PM", sales: 5400 },
                      { time: "03:00 PM", sales: totalPharmacySales || 6480 },
                    ]}
                  >
                    <defs>
                      <linearGradient id="pharmaColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="time" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#ffffff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, "Pharmacy Sales"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#pharmaColor)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Prescriptions Dispensed Bar Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Hourly Prescriptions Dispensed Count</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hourly volume of completed prescription sales.
                  </p>
                </div>
                <Badge variant="success">Fulfillment Rate</Badge>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { hour: "9 AM", count: 2 },
                      { hour: "11 AM", count: 4 },
                      { hour: "1 PM", count: 6 },
                      { hour: "3 PM", count: dispensedRx.length || 8 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="hour" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#ffffff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`${val} Prescriptions`, "Dispensed"]}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dispense & Log Sale */}
      {selectedRxForDispense && (
        <Modal
          isOpen={!!selectedRxForDispense}
          onClose={() => setSelectedRxForDispense(null)}
          title={`Dispense Prescription - ${selectedRxForDispense.patientName}`}
          subtitle={`MR No: ${selectedRxForDispense.mrNumber} | Consultant: ${selectedRxForDispense.consultantName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300">
              Confirm medicine dispensing. Total sale amount will automatically be posted to the Central Financial Cash Ledger under Pharmacy Income.
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Prescribed Medicines Items:
              </h4>
              {selectedRxForDispense.items && selectedRxForDispense.items.length > 0 ? (
                selectedRxForDispense.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800 last:border-0">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{item.medicineName}</div>
                      <div className="text-[11px] text-slate-500">{item.dosage} • {item.frequency} • {item.duration}</div>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Rs. 540</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">Standard Prescribed Medicines Pack — Rs. 540</div>
              )}
            </div>

            <div className="flex justify-between items-center font-black text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Total Bill Amount:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-lg">
                Rs. {(selectedRxForDispense.items?.length || 1) * 540} PKR
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRxForDispense(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispenseSubmit}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Dispensing & Log Sale</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
