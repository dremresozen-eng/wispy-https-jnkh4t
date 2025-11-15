import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Stethoscope,
  CalendarDays,
  X,
  Edit3,
  Trash2,
  FileText,
  Download,
  Printer,
  BarChart3,
  LogOut,
  Users,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const SUPABASE_URL = "https://zzifgbkljofyzlxbzypk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWZnYmtsam9meXpseGJ6eXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjQyODMsImV4cCI6MjA3ODIwMDI4M30.8aIx6Ta_ErN2YgiZlr9CJiyb1HIvE-waRuksr42k1Rg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SURGERY_TYPES = [
  "Phacoemulsification",
  "Pars Plana Vitrectomy",
  "Ahmed Glaucoma Valve",
  "Silicone Oil Removal",
  "Silicone Oil Injection",
  "Secondary IOL Implantation",
];

const URGENCY_LEVELS = {
  urgent: {
    label: "Urgent",
    badge: "bg-gradient-to-r from-red-500 to-red-600",
    dot: "bg-red-500",
    borderColor: "#ef4444",
  },
  soon: {
    label: "Soon",
    badge: "bg-gradient-to-r from-amber-500 to-amber-600",
    dot: "bg-amber-500",
    borderColor: "#f59e0b",
  },
  routine: {
    label: "Routine",
    badge: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    dot: "bg-emerald-500",
    borderColor: "#10b981",
  },
};

const STATUS_COLORS = {
  Waiting: { color: "bg-gray-50 border-gray-300", textColor: "text-gray-800" },
  "Pre-op Prep": { color: "bg-yellow-50 border-yellow-300", textColor: "text-yellow-800" },
  Ready: { color: "bg-orange-50 border-orange-300", textColor: "text-orange-800" },
  Scheduled: { color: "bg-red-50 border-red-300", textColor: "text-red-800" },
  Completed: { color: "bg-green-50 border-green-300", textColor: "text-green-800" },
};

const STATUS_OPTIONS = ["Waiting", "Pre-op Prep", "Ready", "Scheduled", "Completed"];

const PATIENTS_PER_PAGE = 12;

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function App() {
  // Auth State
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // App State
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUrgency, setFilterUrgency] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterSurgeon, setFilterSurgeon] = useState([]);
  const [filterSurgeryType, setFilterSurgeryType] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [currentView, setCurrentView] = useState("waitlist");
  const [showStats, setShowStats] = useState(true);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getUserName = () => currentUser?.user_metadata?.name || currentUser?.email || "User";
  const getUserRole = () => currentUser?.user_metadata?.role || "user";
  // ✅ AUDIT LOGGING FUNCTIONS (INSIDE COMPONENT)
  const logAudit = async (action, entityType, entityId, oldData = null, newData = null, notes = null) => {
    try {
      if (!currentUser) {
        console.log('No user logged in, skipping audit log');
        return;
      }

      let changes = null;
      if (oldData && newData) {
        changes = {};
        Object.keys(newData).forEach(key => {
          if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
            changes[key] = { from: oldData[key], to: newData[key] };
          }
        });
      }

      const logEntry = {
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.user_metadata?.name || currentUser.email,
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,  // ✅ Convert to string
        old_data: oldData,
        new_data: newData,
        changes,
        notes
      };

      console.log('Creating audit log:', logEntry);

      const { data, error } = await supabase
        .from('audit_logs')
        .insert([logEntry])
        .select();

      if (error) {
        console.error('❌ Error logging audit:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
      } else {
        console.log('✅ Audit log created successfully:', data);
      }
    } catch (error) {
      console.error('❌ Error in logAudit:', error);
    }
  };

  const getPatientSnapshot = (patient) => {
    return {
      name: patient.name,
      patient_id: patient.patient_id,
      surgery_type: patient.surgery_type,
      urgency: patient.urgency,
      status: patient.status,
      surgeon: patient.surgeon,
      scheduled_date: patient.scheduled_date
    };
  };

  const calculateWaitDays = (addedDate) => {
    const now = new Date();
    const added = new Date(addedDate);
    const diffTime = Math.abs(now - added);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const sortPatients = (patientList) => {
    return [...patientList].sort((a, b) => {
      if (a.urgency !== b.urgency) {
        const urgencyOrder = { urgent: 0, soon: 1, routine: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return calculateWaitDays(b.added_date) - calculateWaitDays(a.added_date);
    });
  };

  // ============================================
  // AUTH MANAGEMENT
  // ============================================

  useEffect(() => {
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setCurrentUser(session?.user ?? null);
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await logAudit(
        'LOGOUT',
        'auth',
        currentUser.id,
        null,
        { email: currentUser.email },
        'User logged out'
      );

      await supabase.auth.signOut();
    }
  };

  // ============================================
  // DATA MANAGEMENT
  // ============================================

  useEffect(() => {
    if (currentUser) {
      loadPatients();

      const channel = supabase
        .channel("patients-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
          loadPatients();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("added_date", { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error loading patients:", error);
    }
  };

 const handleDeletePatient = async (patientId) => {
    if (!window.confirm("Are you sure you want to delete this patient? This action cannot be undone.")) return;
    
    try {
      const { data: patientToDelete } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .single();

      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientId);

      if (error) throw error;

      await logAudit(
        'DELETE',
        'patient',
        patientId,
        getPatientSnapshot(patientToDelete),
        null,
        `Deleted patient: ${patientToDelete.name} (ID: ${patientToDelete.patient_id})`
      );

      setSelectedPatient(null);
      loadPatients();
      alert("Patient deleted successfully");
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting patient");
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Patient ID", "Surgery Type", "Urgency", "Status", "Surgeon", "Wait Days", "Scheduled Date"];
    const rows = filteredPatients.map((p) => [
      p.name,
      p.patient_id,
      p.surgery_type,
      p.urgency,
      p.status,
      p.surgeon || "",
      calculateWaitDays(p.added_date),
      p.scheduled_date || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // COMPUTED VALUES (useMemo for performance)
  // ============================================

  const filteredPatients = useMemo(() => {
    const filtered = patients.filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUrgency = filterUrgency.length === 0 || filterUrgency.includes(patient.urgency);
      const matchesStatus = filterStatus.length === 0 || filterStatus.includes(patient.status);
      const matchesSurgeon = filterSurgeon.length === 0 || filterSurgeon.includes(patient.surgeon);
      const matchesSurgeryType = filterSurgeryType.length === 0 || filterSurgeryType.includes(patient.surgery_type);
      return matchesSearch && matchesUrgency && matchesStatus && matchesSurgeon && matchesSurgeryType;
    });
    return sortPatients(filtered);
  }, [patients, searchTerm, filterUrgency, filterStatus, filterSurgeon, filterSurgeryType]);

  const uniqueSurgeons = useMemo(() => {
    return [...new Set(patients.map((p) => p.surgeon).filter(Boolean))];
  }, [patients]);

  const scheduledPatients = useMemo(() => {
    return patients.filter((p) => p.scheduled_date).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  }, [patients]);

  const stats = useMemo(() => {
    return {
      total: patients.length,
      waiting: patients.filter((p) => p.status === "Waiting").length,
      urgent: patients.filter((p) => p.urgency === "urgent" && p.status !== "Completed").length,
      scheduled: patients.filter((p) => p.status === "Scheduled").length,
      completed: patients.filter((p) => p.status === "Completed").length,
      avgWaitTime:
        patients.length > 0
          ? Math.round(patients.reduce((sum, p) => sum + calculateWaitDays(p.added_date), 0) / patients.length)
          : 0,
      longWait: patients.filter((p) => calculateWaitDays(p.added_date) > 30 && p.status !== "Completed").length,
    };
  }, [patients]);

  // ============================================
  // PAGINATION
  // ============================================

  const totalPages = Math.ceil(filteredPatients.length / PATIENTS_PER_PAGE);
  const indexOfLastPatient = currentPage * PATIENTS_PER_PAGE;
  const indexOfFirstPatient = indexOfLastPatient - PATIENTS_PER_PAGE;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterUrgency, filterStatus, filterSurgeon, filterSurgeryType]);

  // ============================================
  // SUB-COMPONENTS
  // ============================================

  // ============================================
  // MULTI-SELECT FILTER COMPONENT
  // ============================================

  const MultiSelectDropdown = ({ label, options, selected, onChange, icon }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (option) => {
      if (selected.includes(option)) {
        onChange(selected.filter(item => item !== option));
      } else {
        onChange([...selected, option]);
      }
    };

    const clearAll = () => {
      onChange([]);
      setIsOpen(false);
    };

    const selectAll = () => {
      onChange(options);
    };

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-3 border-2 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white font-medium flex items-center justify-between gap-2 min-w-[200px] ${
            selected.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            {icon}
            {selected.length === 0 
              ? label 
              : `${label} (${selected.length})`
            }
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            <div className="absolute z-20 mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
              <div className="sticky top-0 bg-gray-50 border-b-2 border-gray-200 p-2 flex gap-2">
                <button
                  onClick={selectAll}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 rounded"
                >
                  Select All
                </button>
                <button
                  onClick={clearAll}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded"
                >
                  Clear All
                </button>
              </div>

              {options.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };
  const LoginModal = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

   const handleLogin = async (e) => {
      e.preventDefault();
      setError("");
      setIsLoading(true);

      try {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setTimeout(async () => {
          try {
            await supabase.from('audit_logs').insert([{
              user_id: data.user.id,
              user_email: data.user.email,
              user_name: data.user.user_metadata?.name || data.user.email,
              action: 'LOGIN',
              entity_type: 'auth',
              entity_id: data.user.id,
              new_data: { email: data.user.email },
              notes: 'User logged in successfully'
            }]);
          } catch (logError) {
            console.error('Error logging login:', logError);
          }
        }, 1000);

      } catch (error) {
        setError(error.message || "Invalid email or password");
      } finally {
        setIsLoading(false);
      }
    };
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Secure Login</h1>
            <p className="text-gray-600 mt-2">Surgical Waitlist Manager v0.4</p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In Securely"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 text-center">🔒 Secured with Supabase Auth</p>
          </div>
        </div>
      </div>
    );
  };

  const StatsDashboard = () => (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Dashboard Overview
        </h2>
        <button onClick={() => setShowStats(!showStats)} className="text-sm text-gray-600 hover:text-gray-800">
          {showStats ? "Hide" : "Show"}
        </button>
      </div>

      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
            <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-800 mt-1">Total Patients</div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
            <div className="text-3xl font-bold text-gray-600">{stats.waiting}</div>
            <div className="text-sm text-gray-800 mt-1">Waiting</div>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
            <div className="text-3xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-sm text-red-800 mt-1 flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Urgent Cases
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
            <div className="text-3xl font-bold text-orange-600">{stats.scheduled}</div>
            <div className="text-sm text-orange-800 mt-1">Scheduled</div>
          </div>

          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-green-800 mt-1">Completed</div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
            <div className="text-3xl font-bold text-purple-600">{stats.avgWaitTime}</div>
            <div className="text-sm text-purple-800 mt-1">Avg Wait (days)</div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border-2 border-amber-200">
            <div className="text-3xl font-bold text-amber-600">{stats.longWait}</div>
            <div className="text-sm text-amber-800 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Wait &gt; 30 days
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-6 mb-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg border-2 ${
            currentPage === 1 ? "border-gray-200 text-gray-400 cursor-not-allowed" : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex gap-2">
          {[...Array(totalPages)].map((_, index) => {
            const pageNumber = index + 1;
            if (
              pageNumber === 1 ||
              pageNumber === totalPages ||
              (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
            ) {
              return (
                <button
                  key={pageNumber}
                  onClick={() => setCurrentPage(pageNumber)}
                  className={`w-10 h-10 rounded-lg border-2 font-semibold ${
                    currentPage === pageNumber
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
              return (
                <span key={pageNumber} className="w-10 h-10 flex items-center justify-center text-gray-400">
                  ...
                </span>
              );
            }
            return null;
          })}
        </div>

        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg border-2 ${
            currentPage === totalPages
              ? "border-gray-200 text-gray-400 cursor-not-allowed"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="ml-4 text-sm text-gray-600">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          <span className="ml-2">({filteredPatients.length} patients)</span>
        </div>
      </div>
    );
  };

  const BulkScheduleModal = () => {
    const [bulkDate, setBulkDate] = useState("");

    const handleBulkSchedule = async () => {
      if (!bulkDate) {
        alert("Please select a date");
        return;
      }

      try {
        for (const patientId of selectedPatients) {
          await supabase.from("patients").update({ scheduled_date: bulkDate, status: "Scheduled" }).eq("id", patientId);
        }
        setShowBulkSchedule(false);
        setSelectedPatients([]);
        loadPatients();
        alert(`${selectedPatients.length} patients scheduled for ${bulkDate}`);
      } catch (error) {
        console.error("Error:", error);
        alert("Error scheduling patients");
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4">Bulk Schedule {selectedPatients.length} Patients</h3>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              value={bulkDate}
              onChange={(e) => setBulkDate(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBulkSchedule(false)}
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
            >
              Cancel
            </button>
            <button onClick={handleBulkSchedule} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
              Schedule All
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AddPatientModal = () => {
    const [formData, setFormData] = useState({
      name: "",
      patient_id: "",
      surgery_type: SURGERY_TYPES[0],
      urgency: "routine",
      status: "Waiting",
      surgeon: "",
      case_information: "",
      anesthesia_approval: false,
      iol_diopter: "",
      equipment_needed: "",
      notes: "",
      scheduled_date: null,
      photo: null,
    });

    const handleSubmit = async () => {
      if (!formData.name || !formData.patient_id) {
        alert("Please fill in required fields");
        return;
      }

      try {
        const { data: existingPatients, error: checkError } = await supabase
          .from("patients")
          .select("patient_id")
          .eq("patient_id", formData.patient_id);

        if (checkError) {
          console.error("Error checking duplicates:", checkError);
        }

        if (existingPatients && existingPatients.length > 0) {
          alert("A patient with this ID already exists! Please use a different Patient ID.");
          return;
        }

        // AFTER (with logging):
const patientData = {
  ...formData,
  patient_key: `patient-${Date.now()}`,
  added_by: getUserName(),
  added_by_id: currentUser.id,
  scheduled_date: formData.scheduled_date || null,
};

const { data: newPatient, error } = await supabase
  .from("patients")
  .insert([patientData])
  .select()
  .single();

if (error) throw error;

// ✅ LOG THE ACTION
await logAudit(
  'CREATE',
  'patient',
  newPatient.id,
  null,
  getPatientSnapshot(newPatient),
  `Added patient: ${newPatient.name} (ID: ${newPatient.patient_id})`
);

setShowAddModal(false);
loadPatients();
      } catch (error) {
        console.error("Error:", error);
        alert("Error adding patient. Please try again.");
      }
    };

    const handlePhotoUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, photo: reader.result });
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Plus className="w-7 h-7" />
              Add New Patient
            </h2>
            <button onClick={() => setShowAddModal(false)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  placeholder="Enter patient name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Patient ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  placeholder="Enter patient ID"
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Case Information</label>
              <textarea
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none"
                placeholder="General case information..."
                rows="4"
                value={formData.case_information}
                onChange={(e) => setFormData({ ...formData, case_information: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Surgery Type</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={formData.surgery_type}
                  onChange={(e) => setFormData({ ...formData, surgery_type: e.target.value })}
                >
                  {SURGERY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency Level</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                >
                  <option value="routine">Routine</option>
                  <option value="soon">Soon</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Surgeon</label>
              <input
                type="text"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="Surgeon name"
                value={formData.surgeon}
                onChange={(e) => setFormData({ ...formData, surgeon: e.target.value })}
              />
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Pre-Op Requirements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">IOL Diopter</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                    placeholder="e.g., +22.0"
                    value={formData.iol_diopter}
                    onChange={(e) => setFormData({ ...formData, iol_diopter: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Equipment Needed</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                    placeholder="Special equipment"
                    value={formData.equipment_needed}
                    onChange={(e) => setFormData({ ...formData, equipment_needed: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Upload Document/Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:font-semibold"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg shadow-blue-500/30 transition-all"
              >
                Add Patient
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

const PatientDetailModal = ({ patient, onClose }) => {
    const [editData, setEditData] = useState(patient);
    const [showQuickActions, setShowQuickActions] = useState(false);

    const handleUpdate = async () => {
      try {
        const updateData = {
          name: editData.name,
          patient_id: editData.patient_id,
          surgery_type: editData.surgery_type,
          urgency: editData.urgency,
          status: editData.status,
          surgeon: editData.surgeon,
          case_information: editData.case_information,
          anesthesia_approval: editData.anesthesia_approval,
          iol_diopter: editData.iol_diopter,
          equipment_needed: editData.equipment_needed,
          notes: editData.notes,
          scheduled_date: editData.scheduled_date || null,
          photo: editData.photo,
          updated_by: getUserName(),
          updated_by_id: currentUser.id,
        };

        const { error } = await supabase
          .from("patients")
          .update(updateData)
          .eq("id", patient.id);

        if (error) throw error;

        await logAudit(
          'UPDATE',
          'patient',
          patient.id,
          getPatientSnapshot(patient),
          getPatientSnapshot(editData),
          `Updated patient: ${editData.name} (ID: ${editData.patient_id})`
        );

        onClose();
        loadPatients();
      } catch (error) {
        console.error("Error:", error);
        alert("Error updating patient");
      }
    };

    const handlePhotoUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditData({ ...editData, photo: reader.result });
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold mb-1">{editData.name}</h2>
                <p className="text-blue-100 text-lg">ID: {editData.patient_id}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${URGENCY_LEVELS[editData.urgency].badge} text-white`}>
                  {URGENCY_LEVELS[editData.urgency].label}
                </span>

                <div className="relative">
                  <button onClick={() => setShowQuickActions(!showQuickActions)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                    <ChevronDown className="w-6 h-6" />
                  </button>
                  {showQuickActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-gray-200 overflow-hidden z-10">
                      {STATUS_OPTIONS.map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            setEditData({ ...editData, status });
                            setShowQuickActions(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm"
                        >
                          Set to: {status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {calculateWaitDays(editData.added_date) > 30 && editData.status !== "Completed" && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-center gap-3">
                <Bell className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-bold text-amber-900">Long Wait Alert</p>
                  <p className="text-sm text-amber-800">This patient has been waiting for {calculateWaitDays(editData.added_date)} days</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <label className="block text-sm font-bold text-blue-900 mb-2">Case Information</label>
              <textarea
                className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none bg-white"
                rows="4"
                value={editData.case_information || ""}
                onChange={(e) => setEditData({ ...editData, case_information: e.target.value })}
              />
            </div>

            {editData.photo && (
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-bold text-gray-700 mb-3">Scanned Document</label>
                <img src={editData.photo} alt="Document" className="max-w-full rounded-lg border-2 border-gray-300 shadow-md" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">


              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Surgery Type</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={editData.surgery_type}
                  onChange={(e) => setEditData({ ...editData, surgery_type: e.target.value })}
                >
                  {SURGERY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={editData.urgency}
                  onChange={(e) => setEditData({ ...editData, urgency: e.target.value })}
                >
                  <option value="routine">Routine</option>
                  <option value="soon">Soon</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Surgeon</label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  value={editData.surgeon || ""}
                  onChange={(e) => setEditData({ ...editData, surgeon: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Scheduled Date</label>
                <input
                  type="date"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  value={editData.scheduled_date || ""}
                  onChange={(e) => setEditData({ ...editData, scheduled_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Wait Time</label>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg border-2 border-gray-200">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="font-bold text-gray-700">{calculateWaitDays(editData.added_date)} days</span>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Pre-Op Checklist
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.anesthesia_approval || false}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        anesthesia_approval: e.target.checked,
                      })
                    }
                    className="w-6 h-6 rounded border-gray-300"
                  />
                  <span className="font-semibold text-gray-700">Anesthesia Approval</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">IOL Diopter</label>
                    <input
                      type="text"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                      value={editData.iol_diopter || ""}
                      onChange={(e) => setEditData({ ...editData, iol_diopter: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Equipment Needed</label>
                    <input
                      type="text"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                      value={editData.equipment_needed || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          equipment_needed: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none"
                rows="4"
                placeholder="Additional notes..."
                value={editData.notes || ""}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Update Photo/Document</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:font-semibold"
              />
            </div>

            <div className="flex gap-3 justify-between pt-4">
              <button
                onClick={() => handleDeletePatient(patient.id)}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Patient
              </button>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg shadow-blue-500/30 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ScheduleView = () => {
    const groupedByDate = scheduledPatients.reduce((acc, patient) => {
      const date = patient.scheduled_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(patient);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="text-center py-20">
            <CalendarDays className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-500 font-medium">No surgeries scheduled yet</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, pts]) => (
            <div key={date} className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <Calendar className="w-6 h-6" />
                  {new Date(date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  <span className="text-sm font-normal opacity-90">({pts.length} surgeries)</span>
                </h3>
              </div>
              <div className="p-5 space-y-3">
                {pts.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`border-l-4 p-5 cursor-pointer hover:shadow-lg transition-all rounded-lg ${STATUS_COLORS[patient.status].color}`}
                    style={{ borderLeftColor: URGENCY_LEVELS[patient.urgency].borderColor }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-xl text-gray-800">{patient.name}</h4>
                          <span
                            className={`w-3 h-3 rounded-full ${URGENCY_LEVELS[patient.urgency].dot}`}
                            title={URGENCY_LEVELS[patient.urgency].label}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mb-3">ID: {patient.patient_id}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span className="flex items-center gap-2 text-gray-700">
                            <Stethoscope className="w-4 h-4" />
                            {patient.surgery_type}
                          </span>
                          {patient.surgeon && (
                            <span className="flex items-center gap-2 text-gray-700">
                              <User className="w-4 h-4" />
                              {patient.surgeon}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${URGENCY_LEVELS[patient.urgency].badge} text-white shadow-md`}>
                        {URGENCY_LEVELS[patient.urgency].label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };


  // Add this component in your App.jsx

const AuditLogsModal = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesUser = filterUser === 'all' || log.user_email === filterUser;
    return matchesAction && matchesUser;
  });

  const uniqueUsers = [...new Set(logs.map(l => l.user_email))];

  const getActionColor = (action) => {
    switch(action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'LOGIN': return 'bg-purple-100 text-purple-800';
      case 'LOGOUT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action) => {
    switch(action) {
      case 'CREATE': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      case 'LOGIN': return '🔓';
      case 'LOGOUT': return '🔒';
      default: return '📝';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <FileText className="w-7 h-7" />
            Audit Logs - Activity History
          </h2>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <select
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none bg-white"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              <option value="all">All Actions</option>
              <option value="CREATE">➕ Created</option>
              <option value="UPDATE">✏️ Updated</option>
              <option value="DELETE">🗑️ Deleted</option>
              <option value="LOGIN">🔓 Login</option>
              <option value="LOGOUT">🔒 Logout</option>
            </select>

            <select
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none bg-white"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>

            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Logs Table */}
          <div className="overflow-auto max-h-[60vh]">
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500">No audit logs found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)} {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-semibold text-gray-800">{log.user_name}</div>
                        <div className="text-xs text-gray-500">{log.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {log.notes || '-'}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Changed: {Object.keys(log.changes).join(', ')}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <p className="text-sm text-purple-800">
              📊 Showing {filteredLogs.length} of {logs.length} total audit logs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
  
  // ============================================
  // RENDER
  // ============================================

  if (!currentUser) {
    return <LoginModal />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3 text-gray-800">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
                  <Stethoscope className="text-white w-8 h-8" />
                </div>
                Surgical Waitlist Manager v0.4
              </h1>
              <p className="text-gray-600 mt-2 ml-1">
                Logged in as: <strong>{getUserName()}</strong> <span className="text-gray-500">({getUserRole()})</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setCurrentView("waitlist")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all shadow-md ${
                  currentView === "waitlist"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-500/30"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300"
                }`}
              >
                <Filter className="w-5 h-5" />
                Waitlist
              </button>
              <button
                onClick={() => setCurrentView("schedule")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all shadow-md ${
                  currentView === "schedule"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-500/30"
                    : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300"
                }`}
              >
                <CalendarDays className="w-5 h-5" />
                Schedule
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl hover:bg-purple-700 font-semibold shadow-lg shadow-purple-500/30 transition-all"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-gray-600 text-white px-5 py-3 rounded-xl hover:bg-gray-700 font-semibold shadow-lg transition-all"
              >
                <Printer className="w-5 h-5" />
                Print
              </button>
              <button
  onClick={() => setShowAuditLogs(true)}
  className="flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl hover:bg-purple-700 font-semibold shadow-lg shadow-purple-500/30 transition-all"
>
  <FileText className="w-5 h-5" />
  Audit Logs
</button>
              {selectedPatients.length > 0 && (
                <button
                  onClick={() => setShowBulkSchedule(true)}
                  className="flex items-center gap-2 bg-orange-600 text-white px-5 py-3 rounded-xl hover:bg-orange-700 font-semibold shadow-lg transition-all"
                >
                  <Calendar className="w-5 h-5" />
                  Schedule {selectedPatients.length}
                </button>
              )}
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-3 rounded-xl hover:from-green-700 hover:to-green-800 font-semibold shadow-lg shadow-green-500/30 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Patient
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl hover:bg-red-700 font-semibold shadow-lg transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters */}
          {currentView === "waitlist" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <MultiSelectDropdown
                  label="Urgency Levels"
                  options={['urgent', 'soon', 'routine']}
                  selected={filterUrgency}
                  onChange={setFilterUrgency}
                  icon={<AlertCircle className="w-4 h-4" />}
                />
                <MultiSelectDropdown
                  label="Status"
                  options={STATUS_OPTIONS}
                  selected={filterStatus}
                  onChange={setFilterStatus}
                  icon={<CheckCircle className="w-4 h-4" />}
                />
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <MultiSelectDropdown
                  label="Surgeons"
                  options={uniqueSurgeons}
                  selected={filterSurgeon}
                  onChange={setFilterSurgeon}
                  icon={<User className="w-4 h-4" />}
                />
                <MultiSelectDropdown
                  label="Surgery Types"
                  options={SURGERY_TYPES}
                  selected={filterSurgeryType}
                  onChange={setFilterSurgeryType}
                  icon={<Stethoscope className="w-4 h-4" />}
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Dashboard */}
        <StatsDashboard />

        {/* Main Content */}
        {currentView === "waitlist" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentPatients.map((patient) => (
                <div
                  key={patient.id}
                  className={`rounded-2xl border-2 p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:-translate-y-1 ${
                    STATUS_COLORS[patient.status].color
                  } ${selectedPatients.includes(patient.id) ? "ring-4 ring-blue-500" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={selectedPatients.includes(patient.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (selectedPatients.includes(patient.id)) {
                          setSelectedPatients(selectedPatients.filter((id) => id !== patient.id));
                        } else {
                          setSelectedPatients([...selectedPatients, patient.id]);
                        }
                      }}
                      className="w-5 h-5 rounded"
                    />
                    <span className={`w-4 h-4 rounded-full ${URGENCY_LEVELS[patient.urgency].dot} shadow-lg`} title={URGENCY_LEVELS[patient.urgency].label} />
                  </div>

                  <div onClick={() => setSelectedPatient(patient)}>
                    <div className="mb-4">
                      <h3 className="font-bold text-xl text-gray-800 mb-1">{patient.name}</h3>
                      <p className="text-sm text-gray-600">ID: {patient.patient_id}</p>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Stethoscope className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium">{patient.surgery_type}</span>
                      </div>

                      {patient.surgeon && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="w-4 h-4 flex-shrink-0" />
                          <span>{patient.surgeon}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>
                          Waiting <strong>{calculateWaitDays(patient.added_date)}</strong> days
                          {calculateWaitDays(patient.added_date) > 30 && <Bell className="w-3 h-3 inline ml-1 text-amber-600" />}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-700">
                        {patient.status === "Completed" ? (
                          <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 flex-shrink-0 text-orange-600" />
                        )}
                        <span className="font-semibold">{patient.status}</span>
                      </div>
                    </div>

                    {patient.scheduled_date && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-300">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-gray-800">{new Date(patient.scheduled_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {currentPatients.length === 0 && (
                <div className="col-span-full text-center py-20">
                  <AlertCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 font-medium">No patients found</p>
                </div>
              )}
            </div>

            <Pagination />
          </>
        ) : (
          <ScheduleView />
        )}
      </div>

      {showAddModal && <AddPatientModal />}
      {selectedPatient && <PatientDetailModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}
      {showBulkSchedule && <BulkScheduleModal />}
      {showAuditLogs && <AuditLogsModal onClose={() => setShowAuditLogs(false)} />}
    </div>
  );
}
