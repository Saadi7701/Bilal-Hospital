"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  FileText,
  Download,
  Search,
  ShieldCheck,
  AlertCircle,
  Clock,
  UserCheck,
  FileArchive,
  RefreshCw,
  Eye,
  Calendar,
  CheckCircle,
  HardDrive,
  User,
  Info,
} from "lucide-react";

interface PatientInfo {
  id: string;
  mrNumber: string;
  cnic?: string;
  fullName: string;
  gender: string;
  age: number;
  phone?: string;
}

interface DocumentItem {
  id: string;
  patientId: string;
  visitId?: string;
  admissionFormNumber?: string;
  documentType: string;
  documentName: string;
  relativePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  checksum?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface AdmissionItem {
  id: string;
  formNumber: string;
  dateOfAdmission?: string;
  provisionalDiagnosis?: string;
  status?: string;
  createdAt: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, { label: string; color: string; iconBg: string }> = {
  ADMISSION: { label: "Admission Form", color: "text-blue-700 dark:text-blue-300 border-blue-200 bg-blue-50 dark:bg-blue-900/30", iconBg: "bg-blue-100 text-blue-600" },
  DOCTOR_NOTE: { label: "Doctor / MO Note", color: "text-emerald-700 dark:text-emerald-300 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/30", iconBg: "bg-emerald-100 text-emerald-600" },
  PRESCRIPTION: { label: "Prescription", color: "text-purple-700 dark:text-purple-300 border-purple-200 bg-purple-50 dark:bg-purple-900/30", iconBg: "bg-purple-100 text-purple-600" },
  LABORATORY: { label: "Lab Report", color: "text-amber-700 dark:text-amber-300 border-amber-200 bg-amber-50 dark:bg-amber-900/30", iconBg: "bg-amber-100 text-amber-600" },
  ULTRASOUND: { label: "Ultrasound Report", color: "text-teal-700 dark:text-teal-300 border-teal-200 bg-teal-50 dark:bg-teal-900/30", iconBg: "bg-teal-100 text-teal-600" },
  OPERATION: { label: "Operation Note", color: "text-rose-700 dark:text-rose-300 border-rose-200 bg-rose-50 dark:bg-rose-900/30", iconBg: "bg-rose-100 text-rose-600" },
  REFERRAL: { label: "Referral Form", color: "text-indigo-700 dark:text-indigo-300 border-indigo-200 bg-indigo-50 dark:bg-indigo-900/30", iconBg: "bg-indigo-100 text-indigo-600" },
  DISCHARGE: { label: "Discharge Summary", color: "text-slate-700 dark:text-slate-300 border-slate-200 bg-slate-100 dark:bg-slate-800", iconBg: "bg-slate-200 text-slate-700" },
  OTHER: { label: "Other Document", color: "text-gray-700 border-gray-200 bg-gray-50", iconBg: "bg-gray-100 text-gray-600" },
};

export function PatientFileManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [patientsList, setPatientsList] = useState<PatientInfo[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(false);
  
  const [patientFileData, setPatientFileData] = useState<{
    isAdmitted: boolean;
    admissions: AdmissionItem[];
    documents: Record<string, DocumentItem[]>;
    totalDocuments: number;
    message?: string;
  } | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [selectedAdmissionFilter, setSelectedAdmissionFilter] = useState<string>("ALL");
  const [storageMetrics, setStorageMetrics] = useState<{
    totalPatientFolders: number;
    totalFiles: number;
    totalSizeMB: number;
  } | null>(null);

  useEffect(() => {
    fetchStorageMetrics();
  }, []);

  const fetchStorageMetrics = async () => {
    try {
      const res = await fetch("/api/admin/storage-status");
      if (res.ok) {
        const data = await res.json();
        if (data.storage) {
          setStorageMetrics(data.storage);
        }
      }
    } catch {
      // optional metrics
    }
  };

  const handleSearchPatients = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoadingPatients(true);
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setPatientsList(data.patients || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const loadPatientFile = async (patient: PatientInfo) => {
    setSelectedPatient(patient);
    setLoadingFile(true);
    setPatientFileData(null);
    setSelectedAdmissionFilter("ALL");
    try {
      const res = await fetch(`/api/patient-files?patientId=${patient.id}`);
      if (res.ok) {
        const data = await res.json();
        setPatientFileData(data);
      }
    } catch (err) {
      console.error("Error loading patient file:", err);
    } finally {
      setLoadingFile(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "JSON Data";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600/30 rounded-xl border border-indigo-400/30 text-indigo-300">
                <FileArchive className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Electronic Patient File Archive</h1>
                <p className="text-indigo-200 text-sm mt-0.5">
                  HMS Local Disk Patient File & Document Management System
                </p>
              </div>
            </div>
          </div>

          {storageMetrics && (
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-gray-300">Local Archive Disk</div>
                  <div className="font-semibold text-white">{storageMetrics.totalSizeMB} MB Used</div>
                </div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <div className="text-gray-300">Patient Folders</div>
                <div className="font-semibold text-white">{storageMetrics.totalPatientFolders} Folders</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div>
                <div className="text-gray-300">Archived Docs</div>
                <div className="font-semibold text-white">{storageMetrics.totalFiles} Files</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Patient Search & Selection */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" /> Search Patient File
            </h2>
            <form onSubmit={handleSearchPatients} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by MR No, Name, CNIC..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={loadingPatients}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loadingPatients ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Search"}
              </button>
            </form>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {patientsList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Enter patient MR Number or name above to locate their Electronic Patient File.
                </div>
              ) : (
                patientsList.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => loadPatientFile(pt)}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex items-center justify-between ${
                      selectedPatient?.id === pt.id
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium"
                        : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{pt.fullName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          {pt.mrNumber}
                        </span>
                        {pt.cnic && <span>CNIC: {pt.cnic}</span>}
                      </div>
                    </div>
                    <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Patient File Directory Viewer */}
        <div className="lg:col-span-8">
          {!selectedPatient ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 shadow-sm border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 rounded-2xl flex items-center justify-center mb-4">
                <Folder className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Patient File Selected</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Select a patient from the search list to inspect their Electronic Patient File & local archive documents.
              </p>
            </div>
          ) : loadingFile ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 shadow-sm border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center min-h-[400px]">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Opening Local Patient Folder...</p>
            </div>
          ) : patientFileData && !patientFileData.isAdmitted ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-6 text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-base">Local Patient File Not Created</h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                    Patient <span className="font-semibold">{selectedPatient.fullName}</span> ({selectedPatient.mrNumber}) has <strong>never been admitted</strong> to Bilal Hospital.
                  </p>
                  <div className="mt-3 p-3 bg-amber-100/60 dark:bg-amber-900/40 rounded-lg text-xs space-y-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">HMS System Rule:</p>
                    <p>• Only admitted patients receive a dedicated local Electronic Patient File folder.</p>
                    <p>• When this patient is admitted by Reception, their local folder will be created automatically.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : patientFileData ? (
            <div className="space-y-6">
              {/* Patient File Header */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold text-lg">
                      <Folder className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {selectedPatient.fullName}
                        </h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 mr-1" /> File Active
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-3">
                        <span>MR: {selectedPatient.mrNumber}</span>
                        {selectedPatient.cnic && <span>CNIC: {selectedPatient.cnic}</span>}
                        <span>{selectedPatient.gender}, {selectedPatient.age} yrs</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Admissions: </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {patientFileData.admissions.length}
                      </span>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
                      <span className="text-indigo-600 dark:text-indigo-300">Archived Docs: </span>
                      <span className="font-bold">{patientFileData.totalDocuments}</span>
                    </div>
                  </div>
                </div>

                {/* Path display (Sanitized for UI) */}
                <div className="mt-3 flex items-center gap-2 text-xs font-mono bg-slate-900 text-emerald-400 p-2.5 rounded-lg overflow-x-auto">
                  <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    PATIENT_FILES_ROOT/
                    {selectedPatient.cnic
                      ? selectedPatient.cnic.replace(/[^a-zA-Z0-9-]/g, "_")
                      : selectedPatient.mrNumber.replace(/[^a-zA-Z0-9-]/g, "_")}
                    /
                  </span>
                </div>
              </div>

              {/* Filter Tabs by Admission */}
              {patientFileData.admissions.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedAdmissionFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedAdmissionFilter === "ALL"
                        ? "bg-indigo-600 text-white"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    All Admissions ({patientFileData.totalDocuments})
                  </button>
                  {patientFileData.admissions.map((adm) => (
                    <button
                      key={adm.id}
                      onClick={() => setSelectedAdmissionFilter(adm.formNumber)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        selectedAdmissionFilter === adm.formNumber
                          ? "bg-indigo-600 text-white"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      📁 {adm.formNumber} ({adm.dateOfAdmission ? new Date(adm.dateOfAdmission).toLocaleDateString() : "Admission"})
                    </button>
                  ))}
                </div>
              )}

              {/* Document Categories Accordion / Lists */}
              {Object.keys(patientFileData.documents).length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 text-center text-slate-500 text-xs">
                  No documents found in local archive for this selection.
                </div>
              ) : (
                Object.entries(patientFileData.documents).map(([docType, docs]) => {
                  const filteredDocs =
                    selectedAdmissionFilter === "ALL"
                      ? docs
                      : docs.filter((d) => d.admissionFormNumber === selectedAdmissionFilter);

                  if (filteredDocs.length === 0) return null;
                  const config = DOCUMENT_TYPE_LABELS[docType] || DOCUMENT_TYPE_LABELS.OTHER;

                  return (
                    <div
                      key={docType}
                      className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                      <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({filteredDocs.length} file{filteredDocs.length > 1 ? "s" : ""})
                          </span>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-4 text-xs"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`p-2.5 rounded-lg shrink-0 ${config.iconBg}`}>
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {doc.documentName}
                                </div>
                                <div className="text-slate-500 font-mono text-[11px] truncate mt-0.5">
                                  {doc.relativePath}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-slate-400 text-[11px] mt-1">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(doc.createdAt).toLocaleString()}
                                  </span>
                                  <span>•</span>
                                  <span>{formatFileSize(doc.fileSize)}</span>
                                  {doc.checksum && (
                                    <>
                                      <span>•</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                                        <ShieldCheck className="w-3.5 h-3.5" /> SHA256 Verified
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <a
                              href={`/api/patient-files/download/${doc.id}`}
                              download
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
