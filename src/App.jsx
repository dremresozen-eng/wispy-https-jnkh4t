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
      color: "bg-red-50 border-red-300",
      textColor: "text-red-800",
      badge: "bg-gradient-to-r from-red-500 to-red-600",
      dot: "bg-red-500",
    },
    soon: {
      label: "Soon",
      color: "bg-amber-50 border-amber-300",
      textColor: "text-amber-800",
      badge: "bg-gradient-to-r from-amber-500 to-amber-600",
      dot: "bg-amber-500",
    },
    routine: {
      label: "Routine",
      color: "bg-emerald-50 border-emerald-300",
      textColor: "text-emerald-800",
      badge: "bg-gradient-to-r from-emerald-500 to-emerald-600",
      dot: "bg-emerald-500",
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
                  {surgeryTypes.map((type) => (
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
                    urgencyLevels[editData.urgency].badge
                  } text-white`}
                >
                  {urgencyLevels[editData.urgency].label}
                </span>
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
                  {surgeryTypes.map((type) => (
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
                  {statusOptions.map((status) => (
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

            <div className="flex gap-3 justify-end pt-4">
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
                </h3>
              </div>
              <div className="p-5 space-y-3">
                {pts.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`border-l-4 p-5 cursor-pointer hover:shadow-lg transition-all rounded-lg border ${
                      urgencyLevels[patient.urgency].color
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-xl text-gray-800">
                            {patient.name}
                          </h4>
                          <span
                            className={`w-3 h-3 rounded-full ${
                              urgencyLevels[patient.urgency].dot
                            }`}
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
                          urgencyLevels[patient.urgency].badge
                        } text-white shadow-md`}
                      >
                        {urgencyLevels[patient.urgency].label}
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
                Surgical Waitlist Manager
              </h1>
              <p className="text-gray-600 mt-2 ml-1">
                Manage and track surgical procedures
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
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-3 rounded-xl hover:from-green-700 hover:to-green-800 font-semibold shadow-lg shadow-green-500/30 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Patient
              </button>
            </div>
          </div>

          {/* Filters */}
          {currentView === "waitlist" && (
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
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Main Content */}
        {currentView === "waitlist" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`rounded-2xl border-2 p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:-translate-y-1 ${
                  urgencyLevels[patient.urgency].color
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-gray-800 mb-1">
                      {patient.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      ID: {patient.patient_id}
                    </p>
                  </div>
                  <span
                    className={`w-4 h-4 rounded-full ${
                      urgencyLevels[patient.urgency].dot
                    } shadow-lg`}
                  />
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
            ))}
            {filteredPatients.length === 0 && (
              <div className="col-span-full text-center py-20">
                <AlertCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-500 font-medium">
                  No patients found
                </p>
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
