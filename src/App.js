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
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zzifgbkljofyzlxbzypk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWZnYmtsam9meXpseGJ6eXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjQyODMsImV4cCI6MjA3ODIwMDI4M30.8aIx6Ta_ErN2YgiZlr9CJiyb1HIvE-waRuksr42k1Rg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [currentView, setCurrentView] = useState("waitlist");

  const surgeryTypes = [
    "Phacoemulsification",
    "Pars Plana Vitrectomy",
    "Ahmed Glaucoma Valve",
    "Silicone Oil Removal",
    "Silicone Oil Injection",
    "Secondary IOL Implantation",
  ];

  const urgencyLevels = {
    urgent: {
      label: "Urgent",
      color: "bg-red-100 border-red-400 text-red-900 shadow-sm",
      badge: "bg-red-500",
    },
    soon: {
      label: "Soon",
      color: "bg-yellow-100 border-yellow-400 text-yellow-900 shadow-sm",
      badge: "bg-yellow-500",
    },
    routine: {
      label: "Routine",
      color: "bg-green-100 border-green-400 text-green-900 shadow-sm",
      badge: "bg-green-500",
    },
  };

  const statusOptions = [
    "Waiting",
    "Pre-op Prep",
    "Ready",
    "Scheduled",
    "Completed",
  ];

  useEffect(() => {
    loadPatients();

    const channel = supabase
      .channel("patients-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients" },
        () => {
          loadPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    setLoading(false);
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

  const filteredPatients = sortPatients(
    patients.filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUrgency =
        filterUrgency === "all" || patient.urgency === filterUrgency;
      const matchesStatus =
        filterStatus === "all" || patient.status === filterStatus;
      return matchesSearch && matchesUrgency && matchesStatus;
    })
  );

  const scheduledPatients = patients
    .filter((p) => p.scheduled_date)
    .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

  const AddPatientModal = () => {
    const [formData, setFormData] = useState({
      name: "",
      patient_id: "",
      surgery_type: surgeryTypes[0],
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

      // Check for duplicate patient ID
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

        // If no duplicate, proceed to insert
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
          },
        ]);

        if (error) throw error;
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
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          overflowY: "auto",
          padding: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <h2 className="text-2xl font-bold mb-4">Add New Patient</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Patient ID *
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={formData.patient_id}
                  onChange={(e) =>
                    setFormData({ ...formData, patient_id: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Case Information
              </label>
              <textarea
                className="w-full border rounded px-3 py-2 h-24"
                placeholder="General information..."
                value={formData.case_information}
                onChange={(e) =>
                  setFormData({ ...formData, case_information: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Surgery Type
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.surgery_type}
                  onChange={(e) =>
                    setFormData({ ...formData, surgery_type: e.target.value })
                  }
                >
                  {surgeryTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Urgency
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
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
              <label className="block text-sm font-medium mb-1">Surgeon</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={formData.surgeon}
                onChange={(e) =>
                  setFormData({ ...formData, surgeon: e.target.value })
                }
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Pre-Op Requirements</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm mb-1">IOL Diopter</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={formData.iol_diopter}
                    onChange={(e) =>
                      setFormData({ ...formData, iol_diopter: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Equipment Needed</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
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

            <div>
              <label className="block text-sm font-medium mb-1">
                Upload Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          overflowY: "auto",
          padding: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            maxWidth: "900px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">{editData.name}</h2>
              <p className="text-gray-600">ID: {editData.patient_id}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                urgencyLevels[editData.urgency].color
              }`}
            >
              {urgencyLevels[editData.urgency].label}
            </span>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-blue-800">
              Case Information
            </label>
            <textarea
              className="w-full border-2 rounded px-3 py-2 h-24 bg-blue-50"
              value={editData.case_information || ""}
              onChange={(e) =>
                setEditData({ ...editData, case_information: e.target.value })
              }
            />
          </div>

          {editData.photo && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Scanned Document
              </label>
              <img
                src={editData.photo}
                alt="Document"
                className="max-w-full rounded border"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">
                Surgery Type
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={editData.surgery_type}
                onChange={(e) =>
                  setEditData({ ...editData, surgery_type: e.target.value })
                }
              >
                {surgeryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={editData.status}
                onChange={(e) =>
                  setEditData({ ...editData, status: e.target.value })
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Urgency</label>
              <select
                className="w-full border rounded px-3 py-2"
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
              <label className="block text-sm font-medium mb-1">Surgeon</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={editData.surgeon || ""}
                onChange={(e) =>
                  setEditData({ ...editData, surgeon: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={editData.scheduled_date || ""}
                onChange={(e) =>
                  setEditData({ ...editData, scheduled_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Wait Time
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded">
                <Clock size={16} />
                <span>{calculateWaitDays(editData.added_date)} days</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mb-6">
            <h3 className="font-medium mb-3">Pre-Op Checklist</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editData.anesthesia_approval || false}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      anesthesia_approval: e.target.checked,
                    })
                  }
                  className="w-5 h-5"
                />
                <span>Anesthesia Approval</span>
              </label>
              <div>
                <label className="block text-sm mb-1">IOL Diopter</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={editData.iol_diopter || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, iol_diopter: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Equipment Needed</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
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

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="w-full border rounded px-3 py-2 h-24"
              value={editData.notes || ""}
              onChange={(e) =>
                setEditData({ ...editData, notes: e.target.value })
              }
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">
              Update Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
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
          <div className="text-center py-12 text-gray-500">
            No surgeries scheduled
          </div>
        ) : (
          Object.entries(groupedByDate).map(([date, pts]) => (
            <div
              key={date}
              className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6"
            >
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="text-blue-600" />
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="space-y-3">
                {pts.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`border-l-4 p-4 cursor-pointer hover:bg-gray-50 border rounded ${
                      urgencyLevels[patient.urgency].badge
                    }`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-bold text-lg">{patient.name}</h4>
                        <p className="text-sm text-gray-600">
                          ID: {patient.patient_id}
                        </p>
                        <p className="text-sm mt-1">{patient.surgery_type}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            urgencyLevels[patient.urgency].color
                          }`}
                        >
                          {urgencyLevels[patient.urgency].label}
                        </span>
                        {patient.surgeon && (
                          <p className="text-sm mt-2 flex items-center gap-1 justify-end">
                            <User size={14} />
                            {patient.surgeon}
                          </p>
                        )}
                      </div>
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

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Stethoscope className="text-blue-600" />
              Surgical Waitlist Manager
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentView("waitlist")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  currentView === "waitlist"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                <Filter size={20} />
                Waitlist
              </button>
              <button
                onClick={() => setCurrentView("schedule")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  currentView === "schedule"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                <CalendarDays size={20} />
                Schedule
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Plus size={20} />
                Add Patient
              </button>
            </div>
          </div>

          {currentView === "waitlist" && (
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border-2 rounded-lg"
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
              >
                <option value="all">All Urgency</option>
                <option value="urgent">Urgent</option>
                <option value="soon">Soon</option>
                <option value="routine">Routine</option>
              </select>
              <select
                className="px-4 py-2 border-2 rounded-lg"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {currentView === "waitlist" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`rounded-lg border-4 p-4 cursor-pointer hover:shadow-xl transition-all ${
                  urgencyLevels[patient.urgency].color
                }`}
                style={{ minHeight: "200px" }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{patient.name}</h3>
                    <p className="text-sm text-gray-600">
                      ID: {patient.patient_id}
                    </p>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full ${
                      urgencyLevels[patient.urgency].badge
                    }`}
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span className="font-medium">{patient.surgery_type}</span>
                  </div>
                  {patient.surgeon && (
                    <div className="flex items-center gap-2">
                      <User size={16} />
                      <span>{patient.surgeon}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>
                      Waiting {calculateWaitDays(patient.added_date)} days
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {patient.status === "Completed" ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <AlertCircle size={16} className="text-orange-600" />
                    )}
                    <span className="font-medium">{patient.status}</span>
                  </div>
                </div>
                {patient.scheduled_date && (
                  <div className="mt-3 pt-3 border-t-2 border-gray-300">
                    <p className="text-sm font-bold">
                      Scheduled:{" "}
                      {new Date(patient.scheduled_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {filteredPatients.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No patients found
              </div>
            )}
          </div>
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
    </div>
  );
}
