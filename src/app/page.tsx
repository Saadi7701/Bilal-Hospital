"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Sidebar } from "../components/layout/Sidebar";
import { AdminPortal } from "../components/portals/AdminPortal";
import { ReceptionistPortal } from "../components/portals/ReceptionistPortal";
import { ConsultantPortal } from "../components/portals/ConsultantPortal";
import { LabPortal } from "../components/portals/LabPortal";
import { UltrasoundPortal } from "../components/portals/UltrasoundPortal";
import { PharmacyPortal } from "../components/portals/PharmacyPortal";
import { LoginPage } from "../components/auth/LoginPage";

import {
  AuthSessionUser,
  getAuthSession,
  setAuthSession,
  clearAuthSession,
} from "../lib/authSession";

import {
  INITIAL_CONSULTANTS,
  PatientRecord,
  VisitRecord,
  AdmissionRecord,
  PrescriptionRecord,
  LabOrderRecord,
  UltrasoundOrderRecord,
  MedicineRecord,
  CashTransactionRecord,
  ConsultantUser,
} from "../lib/mockDataStore";

import {
  fetchPatientsFromApi,
  createPatientApi,
  fetchVisitsFromApi,
  createVisitApi,
  updateVisitStatusApi,
  fetchLabOrdersFromApi,
  createLabOrderApi,
  fetchUltrasoundOrdersFromApi,
  createUltrasoundOrderApi,
  fetchPrescriptionsFromApi,
  createPrescriptionApi,
  dispensePrescriptionApi,
  fetchMedicinesFromApi,
  createMedicineApi,
  fetchCashTransactionsFromApi,
  createCashTransactionApi,
} from "../lib/apiClient";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isInitializing, setIsInitializing] = useState(true);

  // Master Dynamic Data State (Initially Empty, Populated via API)
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrderRecord[]>([]);
  const [ultrasoundOrders, setUltrasoundOrders] = useState<UltrasoundOrderRecord[]>([]);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransactionRecord[]>([]);
  const [consultants, setConsultants] = useState<ConsultantUser[]>(INITIAL_CONSULTANTS);

  // Master Data Loading Function
  const loadDynamicData = useCallback(async () => {
    try {
      const [pats, vsts, labs, us, rxs, meds, cash] = await Promise.all([
        fetchPatientsFromApi(),
        fetchVisitsFromApi(),
        fetchLabOrdersFromApi(),
        fetchUltrasoundOrdersFromApi(),
        fetchPrescriptionsFromApi(),
        fetchMedicinesFromApi(),
        fetchCashTransactionsFromApi(),
      ]);
      setPatients(pats);
      setVisits(vsts);
      setLabOrders(labs);
      setUltrasoundOrders(us);
      setPrescriptions(rxs);
      setMedicines(meds);
      setCashTransactions(cash);
    } catch (err) {
      console.warn("[Real-time Sync Error]:", err);
    }
  }, []);

  // Initialize Auth Session on mount
  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      setCurrentUser(session);
      setDefaultTabForPortal(session.portal);
    }
    setIsInitializing(false);
  }, []);

  // Continuous 3-Second Real-Time Database Polling Sync across all portals
  useEffect(() => {
    if (currentUser) {
      loadDynamicData();
      const interval = setInterval(() => {
        loadDynamicData();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser, loadDynamicData]);

  const setDefaultTabForPortal = (portal: AuthSessionUser["portal"]) => {
    switch (portal) {
      case "ADMIN":
        setActiveTab("analytics");
        break;
      case "RECEPTIONIST":
        setActiveTab("overview");
        break;
      case "CONSULTANT":
        setActiveTab("queue");
        break;
      case "LABORATORY":
        setActiveTab("lab_queue");
        break;
      case "ULTRASOUND":
        setActiveTab("us_queue");
        break;
      case "PHARMACY":
        setActiveTab("pharmacy_queue");
        break;
    }
  };

  const handleLoginSuccess = (userSession: AuthSessionUser) => {
    setAuthSession(userSession);
    setCurrentUser(userSession);
    setDefaultTabForPortal(userSession.portal);
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
  };

  // Real-Time DB Handlers
  const handleAddPatient = async (patient: PatientRecord) => {
    setPatients((prev) => [patient, ...prev]);
    // Map frontend PatientRecord to the shape the API expects
    await createPatientApi({
      ...patient,
      fatherOrHusbandName: patient.fatherHusbandName,
    } as any);
    loadDynamicData();
  };

  const handleAddVisit = async (visit: VisitRecord, transaction: CashTransactionRecord) => {
    setVisits((prev) => [visit, ...prev]);
    setCashTransactions((prev) => [transaction, ...prev]);
    await createVisitApi(visit);
    if (transaction && transaction.amount > 0) {
      await createCashTransactionApi(transaction);
    }
    loadDynamicData();
  };

  const handleAddAdmission = (admission: AdmissionRecord, transaction: CashTransactionRecord) => {
    setAdmissions((prev) => [admission, ...prev]);
    if (transaction && transaction.amount > 0) {
      createCashTransactionApi(transaction);
    }
  };

  const handleDischargePatient = (admissionId: string) => {
    const dischargeTimeStr = `${new Date().toISOString().split("T")[0]} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    setAdmissions(
      admissions.map((a) =>
        a.id === admissionId
          ? { ...a, status: "DISCHARGED", dischargeOutTime: dischargeTimeStr }
          : a
      )
    );
  };

  const handleAddPrescription = async (prescription: PrescriptionRecord) => {
    setPrescriptions((prev) => [prescription, ...prev]);
    await createPrescriptionApi(prescription);
    loadDynamicData();
  };

  const handleAddLabOrder = async (order: LabOrderRecord, transaction: CashTransactionRecord) => {
    setLabOrders((prev) => [order, ...prev]);
    setCashTransactions((prev) => [transaction, ...prev]);
    await createLabOrderApi(order);
    if (transaction && transaction.amount > 0) {
      await createCashTransactionApi(transaction);
    }
    loadDynamicData();
  };

  const handleAddUltrasoundOrder = async (order: UltrasoundOrderRecord, transaction: CashTransactionRecord) => {
    setUltrasoundOrders((prev) => [order, ...prev]);
    setCashTransactions((prev) => [transaction, ...prev]);
    await createUltrasoundOrderApi(order);
    if (transaction && transaction.amount > 0) {
      await createCashTransactionApi(transaction);
    }
    loadDynamicData();
  };

  const handleAcceptLabReport = async (labOrderId: string) => {
    const targetOrder = labOrders.find((l) => l.id === labOrderId);
    setLabOrders(
      labOrders.map((l) => (l.id === labOrderId ? { ...l, status: "ACCEPTED" } : l))
    );
    if (targetOrder) {
      setVisits((prev) =>
        prev.map((v) =>
          (v.id === targetOrder.visitId || v.mrNumber === targetOrder.mrNumber)
            ? { ...v, status: "CHECKED" }
            : v
        )
      );
    }
    await fetch("/api/lab-orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: labOrderId, status: "ACCEPTED" }),
    });
    loadDynamicData();
  };

  const handleRequestLabRevision = async (labOrderId: string, reason: string, comment: string) => {
    setLabOrders(
      labOrders.map((l) =>
        l.id === labOrderId
          ? { ...l, status: "REVISION_REQUESTED", revisionReason: reason, revisionComment: comment }
          : l
      )
    );
    await fetch("/api/lab-orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: labOrderId, action: "REVISE", revisionReason: reason, revisionComment: comment }),
    });
    loadDynamicData();
  };

  const handleSubmitLabResult = async (
    labOrderId: string,
    resultsJson: string,
    pdfFileName?: string,
    isVersion2?: boolean,
    imageBase64?: string
  ) => {
    try {
      const targetOrder = labOrders.find((l) => l.id === labOrderId);
      const newStatus = isVersion2 ? "ACCEPTED" : "REPORT_PREPARED";

      setLabOrders((prev) =>
        prev.map((l) =>
          l.id === labOrderId
            ? { ...l, status: newStatus, resultsV1: resultsJson, attachedPdfName: pdfFileName || l.attachedPdfName }
            : l
        )
      );

      if (targetOrder) {
        setVisits((prev) =>
          prev.map((v) =>
            (v.id === targetOrder.visitId || v.mrNumber === targetOrder.mrNumber) && v.status === "LAB_REQUESTED"
              ? { ...v, status: "COMPLETED" }
              : v
          )
        );
      }

      await fetch("/api/lab-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: labOrderId,
          action: "SUBMIT_RESULTS",
          resultsJson,
          pdfFileName,
          isVersion2,
          imageBase64,
        }),
      });
      loadDynamicData();
    } catch (err) {
      console.warn("Error updating lab order:", err);
    }
  };

  const handleSubmitUltrasoundResult = async (
    usOrderId: string,
    findings: string,
    impressionOrPdf?: string,
    imageBase64?: string
  ) => {
    try {
      await fetch("/api/ultrasound-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: usOrderId,
          action: "SUBMIT_REPORT",
          findings,
          pdfFileName: impressionOrPdf,
          imageBase64,
        }),
      });
      loadDynamicData();
    } catch (err) {
      console.warn("Error updating ultrasound order:", err);
    }
  };

  const handleDispensePrescription = async (prescriptionId: string, transaction?: CashTransactionRecord) => {
    setPrescriptions((prev) =>
      prev.map((p) => (p.id === prescriptionId ? { ...p, isDispensed: true } : p))
    );
    await dispensePrescriptionApi(prescriptionId);
    if (transaction) {
      setCashTransactions((prev) => [transaction, ...prev]);
      await createCashTransactionApi(transaction);
    }
    loadDynamicData();
  };

  const handleAddMedicineBatch = async (newMed: MedicineRecord) => {
    setMedicines((prev) => [newMed, ...prev]);
    await createMedicineApi(newMed);
    loadDynamicData();
  };

  const handleAddExpense = async (transaction: CashTransactionRecord) => {
    setCashTransactions((prev) => [transaction, ...prev]);
    await createCashTransactionApi(transaction);
    loadDynamicData();
  };

  const handleAddReversal = async (originalTxnId: string, reason: string) => {
    const orig = cashTransactions.find((t) => t.id === originalTxnId);
    if (orig) {
      const reversalTxn: CashTransactionRecord = {
        id: `rev-${Date.now()}`,
        transactionNumber: `REV-${orig.transactionNumber || "TXN"}`,
        transactionType: "REVERSAL",
        category: "REVERSAL",
        department: orig.department || "Admin",
        amount: -orig.amount,
        paymentMethod: orig.paymentMethod || "CASH",
        description: `Reversal: ${reason}`,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        patientName: orig.patientName,
        mrNumber: orig.mrNumber,
        createdBy: "Admin Supervisor",
      };
      setCashTransactions((prev) => [reversalTxn, ...prev]);
      await createCashTransactionApi(reversalTxn);
      loadDynamicData();
    }
  };

  const handleAddConsultant = (consultant: ConsultantUser) => {
    setConsultants((prev) => [consultant, ...prev]);
  };

  const handleConsultantLogin = (consultantId: string) => {
    setConsultants(
      consultants.map((c) => (c.id === consultantId ? { ...c, isActive: true } : c))
    );
  };

  const handleConsultantLogout = (consultantId: string) => {
    setConsultants(
      consultants.map((c) => (c.id === consultantId ? { ...c, isActive: false } : c))
    );
  };

  const handleUpdateVisitStatus = async (visitId: string, status: VisitRecord["status"]) => {
    setVisits((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, status } : v))
    );
    await updateVisitStatusApi(visitId, status);
    loadDynamicData();
  };

  const handleUpdateLabOrderStatus = async (labOrderId: string, status: LabOrderRecord["status"]) => {
    setLabOrders((prev) =>
      prev.map((l) => (l.id === labOrderId ? { ...l, status } : l))
    );
    await fetch("/api/lab-orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: labOrderId, status }),
    });
    loadDynamicData();
  };

  const handleUpdateUltrasoundOrderStatus = async (usOrderId: string, status: UltrasoundOrderRecord["status"]) => {
    setUltrasoundOrders((prev) =>
      prev.map((u) => (u.id === usOrderId ? { ...u, status } : u))
    );
    await fetch("/api/ultrasound-orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: usOrderId, status }),
    });
    loadDynamicData();
  };

  // If loading session state from localStorage
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-400">Loading Bilal Hospital Portal...</p>
        </div>
      </div>
    );
  }

  // If NOT logged in, show the Login Directory Hub!
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If logged in, render authenticated portal shell!
  const activePortal = currentUser.portal;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-brand-500 selection:text-white transition-colors duration-300">
      {/* Navigation Header with logged in user profile & logout button */}
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      {/* Main Body Shell */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activePortal={activePortal}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full">
          {activePortal === "ADMIN" && (
            <AdminPortal
              activeTab={activeTab}
              cashTransactions={cashTransactions}
              consultants={consultants}
              patients={patients}
              visits={visits}
              onAddExpense={handleAddExpense}
              onAddReversal={handleAddReversal}
              onAddConsultant={handleAddConsultant}
            />
          )}

          {activePortal === "RECEPTIONIST" && (
            <ReceptionistPortal
              activeTab={activeTab}
              patients={patients}
              visits={visits}
              admissions={admissions}
              onAddPatient={handleAddPatient}
              onAddVisit={handleAddVisit}
              onAddAdmission={handleAddAdmission}
              onDischargePatient={handleDischargePatient}
            />
          )}

          {activePortal === "CONSULTANT" && (
            <ConsultantPortal
              activeTab={activeTab}
              sessionUser={currentUser}
              visits={visits}
              prescriptions={prescriptions}
              labOrders={labOrders}
              ultrasoundOrders={ultrasoundOrders}
              consultants={consultants}
              onAddPrescription={handleAddPrescription}
              onAddLabOrder={handleAddLabOrder}
              onAddUltrasoundOrder={handleAddUltrasoundOrder}
              onAcceptLabReport={handleAcceptLabReport}
              onRequestLabRevision={handleRequestLabRevision}
              onUpdateVisitStatus={handleUpdateVisitStatus}
              onConsultantLogin={handleConsultantLogin}
              onConsultantLogout={handleConsultantLogout}
            />
          )}

          {activePortal === "LABORATORY" && (
            <LabPortal
              activeTab={activeTab}
              labOrders={labOrders}
              onSubmitLabResult={handleSubmitLabResult}
              onUpdateLabOrderStatus={handleUpdateLabOrderStatus}
            />
          )}

          {activePortal === "ULTRASOUND" && (
            <UltrasoundPortal
              activeTab={activeTab}
              ultrasoundOrders={ultrasoundOrders}
              onSubmitUltrasoundResult={handleSubmitUltrasoundResult}
              onUpdateUltrasoundOrderStatus={handleUpdateUltrasoundOrderStatus}
            />
          )}

          {activePortal === "PHARMACY" && (
            <PharmacyPortal
              activeTab={activeTab}
              prescriptions={prescriptions}
              medicines={medicines}
              onDispensePrescription={handleDispensePrescription}
              onAddMedicineBatch={handleAddMedicineBatch}
            />
          )}
        </main>
      </div>
    </div>
  );
}
