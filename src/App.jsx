import React, { useState, useEffect } from "react";
import {
  Search, Plus, Filter, Calendar, Clock, AlertCircle, CheckCircle,
  User, Stethoscope, CalendarDays, X, Trash2, FileText, Download,
  Printer, BarChart3, LogOut, Bell, ChevronDown, ChevronLeft, ChevronRight, History
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ✅ Custom hooks & utilities
import {
  usePatients,
  useAuditLogs,
  useSession,
  usePagination
} from "./hooks";

import {
  calculateWaitDays,
  calculateStats,
  exportPatientsToCSV,
  filterPatients as filterPatientsUtil,
  sortPatients,
  getUniqueSurgeons
} from "./utils";

import {
  SURGERY_TYPES,
  STATUS_OPTIONS,
  URGENCY_LEVELS,
  STATUS_COLORS,
  PATIENTS_PER_PAGE,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  AUTHORIZED_USERS
} from "./constants";

// ✅ Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  // ===============================
  // 🔹 USER & SESSION MANAGEMENT
  // ===============================
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ===============================
  // 🔹 FILTERS & STATE CONTROLS
  // ===============================
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSurgeon, setFilterSurgeon] = useState("all");
  const [filterSurgeryType, setFilterSurgeryType] = useState("all");

  // ===============================
  // 🔹 UI STATE
  // ===============================
  const [currentView, setCurrentView] = useState("waitlist");
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showStats, setShowStats] = useState(true);
  const [showAuditLog, setShowAuditLog] = useState(false);

  // ===============================
  // 🔹 DATA HOOKS
  // ===============================
  const { patients, loading, loadPatients } = usePatients(currentUser);
  const { auditLogs, createAuditLog } = useAuditLogs(currentUser);
  useSession(currentUser, handleLogout);

  // ===============================
  // 🔹 LOGIN MANAGEMENT
  // ===============================
  useEffect(() => {
    const savedUser = localStorage.getItem("surgicalWaitlistUser");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      setShowLoginModal(true);
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      if (currentUser) {
        createAuditLog("LOGOUT", null, null, `${currentUser.name} logged out`);
      }
      localStorage.removeItem("surgicalWaitlistUser");
      setCurrentUser(null);
      setShowLoginModal(true);
    }
  };

  // ===============================
  // 🔹 LOGIN MODAL COMPONENT
  // ===============================
  const LoginModal = () => {
    const [selectedName, setSelectedName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = () => {
      if (!selectedName) {
        setError("Please select your name");
        return;
      }
      if (!password) {
        setError("Please enter your password");
        return;
      }

      const user = AUTHORIZED_USERS.find(
        (u) => u.name === selectedName && u.password === password
      );

      if (user) {
        const userData = {
          name: user.name,
          role: user.role,
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem("surgicalWaitlistUser", JSON.stringify(userData));
        setCurrentUser(userData);
        setShowLoginModal(false);
        setError("");
        createAuditLog("LOGIN", null, null, `${user.name} logged in`);
      } else {
        setError("Invalid credentials. Please try again.");
        setPassword("");
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              Surgical Waitlist Manager v0.4
            </h2>
            <p className="text-gray-600 mt-2">Please sign in to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 text-sm font-semibold">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Your Name
              </label>
              <select
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                value={selectedName}
                onChange={(e) => {
                  setSelectedName(e.target.value);
                  setError("");
                }}
              >
                <option value="">-- Choose your name --</option>
                {AUTHORIZED_USERS.map((user) => (
                  <option key={user.name} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg shadow-blue-500/30 transition-all"
            >
              Sign In
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              🔒 Secure Access - Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return <LoginModal />;
  }

  // ===============================
  // ✅ CONTINUE TO NEXT PART...
  // ===============================
  // ===============================
  // 🔹 DATA FILTERING & PAGINATION
  // ===============================

  const filteredPatients = sortPatients(
    filterPatientsUtil(patients, {
      searchTerm,
      urgency: filterUrgency,
      status: filterStatus,
      surgeon: filterSurgeon,
      surgeryType: filterSurgeryType,
    }),
    calculateWaitDays
  );

  const {
    currentPage,
    totalPages,
    currentItems: currentPatients,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
  } = usePagination(filteredPatients, PATIENTS_PER_PAGE);

  useEffect(() => {
    resetPage();
  }, [searchTerm, filterUrgency, filterStatus, filterSurgeon, filterSurgeryType]);

  const uniqueSurgeons = getUniqueSurgeons(patients);
  const stats = calculateStats(patients, calculateWaitDays);

  // ===============================
  // 🔹 UTILITY FUNCTIONS
  // ===============================
  const exportToCSV = () => {
    exportPatientsToCSV(filteredPatients, calculateWaitDays);
    createAuditLog("EXPORT", null, null, `${currentUser.name} exported CSV`);
  };

  const handlePrint = () => {
    window.print();
    createAuditLog("PRINT", null, null, `${currentUser.name} printed list`);
  };

  const toggleSelectPatient = (id) => {
    setSelectedPatients((prev) =>
      prev.includes(id)
        ? prev.filter((pid) => pid !== id)
        : [...prev, id]
    );
  };

  // ===============================
  // 🔹 LOADING STATE
  // ===============================
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );

  // ===============================
  // 🔹 MAIN RENDER
  // ===============================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      {/* 🔷 TOP BAR */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-2">
          <Stethoscope className="w-7 h-7" /> Surgical Waitlist
        </h1>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add Patient
          </button>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            <Download className="w-4 h-4" /> Export
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg"
          >
            <Printer className="w-4 h-4" /> Print
          </button>

          <button
            onClick={() => setShowAuditLog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            <History className="w-4 h-4" /> Audit Log
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* 🔷 FILTER BAR */}
      <div className="bg-white shadow rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
        <input
          type="text"
          placeholder="Search patient..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg px-3 py-2 col-span-2"
        />

        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All Urgency</option>
          {URGENCY_LEVELS.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filterSurgeon}
          onChange={(e) => setFilterSurgeon(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All Surgeons</option>
          {uniqueSurgeons.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={filterSurgeryType}
          onChange={(e) => setFilterSurgeryType(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">All Surgery Types</option>
          {SURGERY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* 🔷 STATS SECTION */}
      {showStats && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <Users className="text-blue-600" />
            <div>
              <p className="text-gray-500 text-sm">Total Patients</p>
              <p className="text-xl font-bold">{patients.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <Clock className="text-yellow-500" />
            <div>
              <p className="text-gray-500 text-sm">Avg Wait (days)</p>
              <p className="text-xl font-bold">{stats.averageWaitDays}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <AlertCircle className="text-red-500" />
            <div>
              <p className="text-gray-500 text-sm">High Urgency</p>
              <p className="text-xl font-bold">{stats.highUrgency}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <CheckCircle className="text-green-500" />
            <div>
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-xl font-bold">{stats.completed}</p>
            </div>
          </div>
        </div>
      )}

      {/* 🔷 PATIENT TABLE */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        {filteredPatients.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            <p>No patients match your filters.</p>
          </div>
        ) : (
          <table className="min-w-full text-sm text-left">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="p-3"></th>
                <th className="p-3">Name</th>
                <th className="p-3">Surgeon</th>
                <th className="p-3">Surgery</th>
                <th className="p-3">Urgency</th>
                <th className="p-3">Status</th>
                <th className="p-3">Wait Days</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPatients.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedPatients.includes(p.id)}
                      onChange={() => toggleSelectPatient(p.id)}
                    />
                  </td>
                  <td className="p-3 font-medium text-gray-800">{p.name}</td>
                  <td className="p-3">{p.surgeon}</td>
                  <td className="p-3">{p.surgery_type}</td>
                  <td className="p-3">{p.urgency}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3">{calculateWaitDays(p.created_at)}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => setSelectedPatient(p)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 🔷 PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 gap-2">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* 🔷 ADD PATIENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Plus className="text-blue-600" /> Add New Patient
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Patient Name"
                className="w-full border px-3 py-2 rounded"
                id="name"
              />
              <input
                type="text"
                placeholder="Patient ID"
                className="w-full border px-3 py-2 rounded"
                id="pid"
              />
              <select className="w-full border px-3 py-2 rounded" id="surgery">
                {SURGERY_TYPES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select className="w-full border px-3 py-2 rounded" id="urgency">
                <option value="routine">Routine</option>
                <option value="soon">Soon</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  alert("Patient added (mock).");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔷 BULK SCHEDULE MODAL */}
      {showBulkSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              Schedule {selectedPatients.length} patients
            </h2>
            <input
              type="date"
              className="w-full border px-3 py-2 rounded mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowBulkSchedule(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBulkSchedule(false);
                  alert("Scheduled successfully (mock)");
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔷 AUDIT LOG MODAL */}
      {showAuditLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 m-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="text-purple-600" /> Audit Log
              </h2>
              <button
                onClick={() => setShowAuditLog(false)}
                className="hover:bg-gray-100 p-2 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-6">
                No audit logs recorded yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {auditLogs.map((log, i) => (
                  <div
                    key={i}
                    className="border rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {log.action} - {log.details}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">
                      {log.user_name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
