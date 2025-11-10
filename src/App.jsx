import React, { useState, useEffect } from "react";
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
  LogIn,
  Users,
  Bell,
  Activity,
  TrendingUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  History, 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
// ===== ADD THESE NEW IMPORTS =====
import { usePatients, useAuditLogs, useSession, usePagination } from './hooks';
import { 
  calculateWaitDays, 
  calculateStats, 
  exportPatientsToCSV,
  filterPatients as filterPatientsUtil,
  sortPatients,
  getUniqueSurgeons,
  formatDate
} from './utils';
import { 
  SURGERY_TYPES, 
  STATUS_OPTIONS, 
  URGENCY_LEVELS,
  STATUS_COLORS,
  PATIENTS_PER_PAGE,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  AUTHORIZED_USERS,
  SESSION_TIMEOUT
} from './constants';
// ===== END NEW IMPORTS =====

// Now imported from constants!
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const { patients, loading, loadPatients } = usePatients(currentUser);
  const { auditLogs, createAuditLog } = useAuditLogs(currentUser);


  
  // Keep all your other state:
  const [searchTerm, setSearchTerm] = useState("");
  const [currentView, setCurrentView] = useState("waitlist");

  // ...
  

  // Check for logged in user
  useEffect(() => {
    const savedUser = localStorage.getItem("surgicalWaitlistUser");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      setShowLoginModal(true);
    }
  }, []);

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


const [filterUrgency, setFilterUrgency] = useState("all");
const [filterStatus, setFilterStatus] = useState("all");
const [filterSurgeon, setFilterSurgeon] = useState("all");
const [filterSurgeryType, setfilterSurgeryType] = useState("all");


  const filteredPatients = sortPatients(
    filterPatientsUtil(patients, {
      searchTerm,
      urgency: filterUrgency,
      status: filterStatus,
      surgeon: filterSurgeon,
      surgeryType: filterSurgeryType
    }),
    calculateWaitDays
  );

  // Use pagination hook:
  const {
    currentPage,
    totalPages,
    currentItems: currentPatients,
    goToPage,
    nextPage,
    prevPage,
    resetPage
  } = usePagination(filteredPatients, PATIENTS_PER_PAGE);
  
  // Reset page when filters change:
  useEffect(() => {
    resetPage();
  }, [searchTerm, filterUrgency, filterStatus, filterSurgeon, filterSurgeryType]);

  const scheduledPatients = patients
    .filter((p) => p.scheduled_date)
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  // Get unique surgeons for filter
  const uniqueSurgeons = getUniqueSurgeons(patients);

  const [showAuditLog, setShowAuditLog] = useState(false);

  // Statistics calculations
  const stats = calculateStats(patients, calculateWaitDays);

  // SECURE LOGIN MODAL
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

      // Find user
      const user = AUTHORIZED_USERS.find(
        u => u.name === selectedName && u.password === password
      );

      if (user) {
        const userData = { 
          name: user.name, 
          role: user.role, 
          loginTime: new Date().toISOString() 
        };
        localStorage.setItem("surgicalWaitlistUser", JSON.stringify(userData));
        setCurrentUser(userData);
        setShowLoginModal(false);
        setError("");
        createAuditLog("LOGIN", null, null, `${user.name} logged in successfully`);
      } else {
        setError("Invalid password! Please try again.");
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
            <h2 className="text-2xl font-bold text-gray-800">Surgical Waitlist Manager v0.4</h2>
            <p className="text-gray-600 mt-2">Please sign in to continue</p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-4 flex items-center gap-2">
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
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
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
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
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

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      createAuditLog("LOGOUT", null, null, `${currentUser.name} logged out`);
      localStorage.removeItem("surgicalWaitlistUser");
      setCurrentUser(null);
      setShowLoginModal(true);
    }
  };
   
// ADD SESSION MANAGEMENT:
  useSession(currentUser, handleLogout);
   
  // Delete patient function
  const handleDeletePatient = async (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!window.confirm("Are you sure you want to delete this patient?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientId);

      if (error) throw error;
      
      // ADD THIS:
      await createAuditLog(
        "DELETE",
        patientId,
        patient.name,
        `Patient deleted by ${currentUser.name}`
      );
      
      setSelectedPatient(null);
      loadPatients();
      alert("Patient deleted successfully");
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting patient");
    }
  };
   
  // Quick status update
  const quickStatusUpdate = async (patient, newStatus) => {
    try {
      const { error } = await supabase
        .from("patients")
        .update({ status: newStatus })
        .eq("id", patient.id);

      if (error) throw error;
      loadPatients();
    } catch (error) {
      console.error("Error:", error);
      alert("Error updating status");
    }
  };

  // Export to CSV
 const exportToCSV = () => {
    exportPatientsToCSV(filteredPatients, calculateWaitDays);
    createAuditLog("EXPORT", null, null, `${currentUser.name} exported patient list to CSV`);
  };

  // Print function
const handlePrint = () => {
    window.print();
    createAuditLog("PRINT", null, null, `${currentUser.name} printed patient list`);
  };
   
  // Bulk schedule
  const BulkScheduleModal = () => {
    const [bulkDate, setBulkDate] = useState("");

    const handleBulkSchedule = async () => {
      if (!bulkDate) {
        alert("Please select a date");
        return;
      }

      try {
        for (const patientId of selectedPatients) {
          await supabase
            .from("patients")
            .update({ scheduled_date: bulkDate, status: "Scheduled" })
            .eq("id", patientId);
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Date
            </label>
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
            <button
              onClick={handleBulkSchedule}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Schedule All
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Statistics Dashboard
  const StatsDashboard = () => (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          Dashboard Overview
        </h2>
        <button
          onClick={() => setShowStats(!showStats)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
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

  // Pagination Component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-center gap-2 mt-6 mb-4">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className={`p-2 rounded-lg border-2 ${
            currentPage === 1
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex gap-2">
          {[...Array(totalPages)].map((_, index) => {
            const pageNumber = index + 1;
            // Show first page, last page, current page, and pages around current
            if (
              pageNumber === 1 ||
              pageNumber === totalPages ||
              (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
            ) {
              return (
                <button
                  key={pageNumber}
                  onClick={() => goToPage(pageNumber)}
                  className={`w-10 h-10 rounded-lg border-2 font-semibold ${
                    currentPage === pageNumber
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            } else if (
              pageNumber === currentPage - 2 ||
              pageNumber === currentPage + 2
            ) {
              return <span key={pageNumber} className="w-10 h-10 flex items-center justify-center text-gray-400">...</span>;
            }
            return null;
          })}
        </div>

        <button
          onClick={nextPage}
          disabled={currentPage === totalPages}
          className={`p-2 rounded-lg border-2 ${
            currentPage === totalPages
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
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
          alert(
            "A patient with this ID already exists! Please use a different Patient ID."
          );
          return;
        }

        const { error } = await supabase.from("patients").insert([
          {
            patient_key: `patient-${Date.now()}`,
            name: formData.name,
            patient_id: formData.patient_id,
            surgery_type: formData.surgery_type,
            urgency: formData.urgency,
            status: formData.status,
            surgeon: formData.surgeon,
            case_information: formData.case_information,
            anesthesia_approval: formData.anesthesia_approval,
            iol_diopter: formData.iol_diopter,
            equipment_needed: formData.equipment_needed,
            notes: formData.notes,
            scheduled_date: formData.scheduled_date || null,
            photo: formData.photo,
            added_by: currentUser.name,
          },
        ]);

        if (error) throw error;
        await createAuditLog(
          "ADD",
          formData.patient_id,
          formData.name,
          `Patient added by ${currentUser.name}`,
          null,
          `Status: ${formData.status}, Urgency: ${formData.urgency}`
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
            <button
              onClick={() => setShowAddModal(false)}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
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
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, patient_id: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Case Information
              </label>
              <textarea
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none"
                placeholder="General case information..."
                rows="4"
                value={formData.case_information}
                onChange={(e) =>
                  setFormData({ ...formData, case_information: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Surgery Type
                </label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={formData.surgery_type}
                  onChange={(e) =>
                    setFormData({ ...formData, surgery_type: e.target.value })
                  }
                >
                  {SURGERY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Urgency Level
                </label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={formData.urgency}
                  onChange={(e) =>
                    setFormData({ ...formData, urgency: e.target.value })
                  }
                >
                  <option value="routine">Routine</option>
                  <option value="soon">Soon</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Surgeon
              </label>
              <input
                type="text"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="Surgeon name"
                value={formData.surgeon}
                onChange={(e) =>
                  setFormData({ ...formData, surgeon: e.target.value })
                }
              />
            </div>

            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Pre-Op Requirements
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      IOL Diopter
                    </label>
                    <input
                      type="text"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                      placeholder="e.g., +22.0"
                      value={formData.iol_diopter}
                      onChange={(e) =>
                        setFormData({ ...formData, iol_diopter: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Equipment Needed
                    </label>
                    <input
                      type="text"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                      placeholder="Special equipment"
                      value={formData.equipment_needed}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          equipment_needed: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Upload Document/Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:font-semibold"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
             <div className="flex gap-3">
  <button
    onClick={() => setShowAddModal(false)}
    className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
  >
    Cancel
  </button>
  <button
    onClick={() => setShowAuditLog(true)}
    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-5 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 font-semibold shadow-lg shadow-purple-500/30 transition-all"
  >
    Activity Log
  </button>
</div>

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
        const { error } = await supabase
          .from("patients")
          .update({
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
          })
          .eq("id", patient.id);

        if (error) throw error;
        await createAuditLog(
          "EDIT",
          patient.id,
          editData.name,
          `Patient updated by ${currentUser.name}`,
          `Old: ${patient.status}`,
          `New: ${editData.status}`
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
                <span
                  className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                    URGENCY_LEVELS[editData.urgency].badge
                  } text-white`}
                >
                  {URGENCY_LEVELS[editData.urgency].label}
                </span>
                
                {/* Quick Actions Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <ChevronDown className="w-6 h-6" />
                  </button>
                  {showQuickActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-gray-200 overflow-hidden z-10">
                      {STATUS_OPTIONS.map(status => (
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

                <button
                  onClick={onClose}
                  className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Alert for long wait */}
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
              <label className="block text-sm font-bold text-blue-900 mb-2">
                Case Information
              </label>
              <textarea
                className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none bg-white"
                rows="4"
                value={editData.case_information || ""}
                onChange={(e) =>
                  setEditData({ ...editData, case_information: e.target.value })
                }
              />
            </div>

            {editData.photo && (
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Scanned Document
                </label>
                <img
                  src={editData.photo}
                  alt="Document"
                  className="max-w-full rounded-lg border-2 border-gray-300 shadow-md"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Surgery Type
                </label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={editData.surgery_type}
                  onChange={(e) =>
                    setEditData({ ...editData, surgery_type: e.target.value })
                  }
                >
                  {SURGERY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={editData.status}
                  onChange={(e) =>
                    setEditData({ ...editData, status: e.target.value })
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Urgency
                </label>
                <select
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white"
                  value={editData.urgency}
                  onChange={(e) =>
                    setEditData({ ...editData, urgency: e.target.value })
                  }
                >
                  <option value="routine">Routine</option>
                  <option value="soon">Soon</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Surgeon
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  value={editData.surgeon || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, surgeon: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                  value={editData.scheduled_date || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, scheduled_date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Wait Time
                </label>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg border-2 border-gray-200">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span className="font-bold text-gray-700">
                    {calculateWaitDays(editData.added_date)} days
                  </span>
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
                  <span className="font-semibold text-gray-700">
                    Anesthesia Approval
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      IOL Diopter
                    </label>
                    <input
                      type="text"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                      value={editData.iol_diopter || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, iol_diopter: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Equipment Needed
                    </label>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none resize-none"
                rows="4"
                placeholder="Additional notes..."
                value={editData.notes || ""}
                onChange={(e) =>
                  setEditData({ ...editData, notes: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Update Photo/Document
              </label>
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
                <button
                  onClick={onClose}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
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
            <p className="text-xl text-gray-500 font-medium">
              No surgeries scheduled yet
            </p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, pts]) => (
            <div
              key={date}
              className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden"
            >
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
                    className={`border-l-4 p-5 cursor-pointer hover:shadow-lg transition-all rounded-lg ${
                      STATUS_COLORS[patient.status].color
                    }`}
                    style={{ borderLeftColor: URGENCY_LEVELS[patient.urgency].borderColor }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-xl text-gray-800">
                            {patient.name}
                          </h4>
                          <span
                            className={`w-3 h-3 rounded-full ${
                              URGENCY_LEVELS[patient.urgency].dot
                            }`}
                            title={URGENCY_LEVELS[patient.urgency].label}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          ID: {patient.patient_id}
                        </p>
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
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-bold ${
                          URGENCY_LEVELS[patient.urgency].badge
                        } text-white shadow-md`}
                      >
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

  if (!currentUser) {
    return <LoginModal />;
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading...</p>
        </div>
      </div>
    );

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
                Logged in as: <strong>{currentUser.name}</strong> ({currentUser.role})
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
                onClick={handlePrint}
                className="flex items-center gap-2 bg-gray-600 text-white px-5 py-3 rounded-xl hover:bg-gray-700 font-semibold shadow-lg transition-all"
              >
                <Printer className="w-5 h-5" />
                Print
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
                <select
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white font-medium"
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                >
                  <option value="all">All Urgency Levels</option>
                  <option value="urgent">🔴 Urgent</option>
                  <option value="soon">🟡 Soon</option>
                  <option value="routine">🟢 Routine</option>
                </select>
                <select
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white font-medium"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col md:flex-row gap-4">
                <select
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white font-medium"
                  value={filterSurgeon}
                  onChange={(e) => setFilterSurgeon(e.target.value)}
                >
                  <option value="all">All Surgeons</option>
                  {uniqueSurgeons.map((surgeon) => (
                    <option key={surgeon} value={surgeon}>
                      {surgeon}
                    </option>
                  ))}
                </select>
                <select
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white font-medium"
                  value={filterSurgeryType}
                  onChange={(e) => setFilterSurgeryType(e.target.value)}
                >
                  <option value="all">All Surgery Types</option>
                  {SURGERY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
                  } ${selectedPatients.includes(patient.id) ? 'ring-4 ring-blue-500' : ''}`}
                >
                  {/* Selection checkbox */}
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={selectedPatients.includes(patient.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (selectedPatients.includes(patient.id)) {
                          setSelectedPatients(selectedPatients.filter(id => id !== patient.id));
                        } else {
                          setSelectedPatients([...selectedPatients, patient.id]);
                        }
                      }}
                      className="w-5 h-5 rounded"
                    />
                    <span
                      className={`w-4 h-4 rounded-full ${
                        URGENCY_LEVELS[patient.urgency].dot
                      } shadow-lg`}
                      title={URGENCY_LEVELS[patient.urgency].label}
                    />
                  </div>

                  <div onClick={() => setSelectedPatient(patient)}>
                    <div className="mb-4">
                      <h3 className="font-bold text-xl text-gray-800 mb-1">
                        {patient.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        ID: {patient.patient_id}
                      </p>
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
                          {calculateWaitDays(patient.added_date) > 30 && (
                            <Bell className="w-3 h-3 inline ml-1 text-amber-600" />
                          )}
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
                          <span className="font-bold text-gray-800">
                            {new Date(patient.scheduled_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {currentPatients.length === 0 && (
                <div className="col-span-full text-center py-20">
                  <AlertCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                  <p className="text-xl text-gray-500 font-medium">
                    No patients found
                  </p>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            <Pagination />
          </>
        ) : (
          <ScheduleView />
        )}
      </div>

      {showAddModal && <AddPatientModal />}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
      {showBulkSchedule && <BulkScheduleModal />}
      {showLoginModal && <LoginModal />}
    </div>
  );
   function AuditLogModal() {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <History className="w-7 h-7" />
              Activity Audit Log
            </h2>
            <button
              onClick={() => setShowAuditLog(false)}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No activity logs yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log, index) => (
                  <div
                    key={index}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            log.action === "DELETE" ? "bg-red-100 text-red-800" :
                            log.action === "ADD" ? "bg-green-100 text-green-800" :
                            log.action === "EDIT" ? "bg-blue-100 text-blue-800" :
                            log.action === "LOGIN" ? "bg-purple-100 text-purple-800" :
                            log.action === "LOGOUT" ? "bg-gray-100 text-gray-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            {log.user_name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({log.user_role})
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">
                          {log.details}
                        </p>
                        {log.patient_name && (
                          <p className="text-sm text-gray-600">
                            Patient: <strong>{log.patient_name}</strong>
                          </p>
                        )}
                        {log.old_value && log.new_value && (
                          <p className="text-xs text-gray-500 mt-2">
                            Changed: <span className="line-through">{log.old_value}</span> → <strong>{log.new_value}</strong>
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                        <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

}
