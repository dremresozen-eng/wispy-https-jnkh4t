import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SESSION_TIMEOUT } from "../constants";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hook for managing patients data
export const usePatients = (currentUser) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (currentUser) {
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
    }
  }, [currentUser]);

  return { patients, loading, loadPatients };
};

// Hook for managing audit logs
export const useAuditLogs = (currentUser) => {
  const [auditLogs, setAuditLogs] = useState([]);

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      if (data && !error) {
        setAuditLogs(data);
      } else {
        const localLogs = JSON.parse(localStorage.getItem("auditLogs") || "[]");
        setAuditLogs(localLogs.slice(0, 100));
      }
    } catch (error) {
      const localLogs = JSON.parse(localStorage.getItem("auditLogs") || "[]");
      setAuditLogs(localLogs.slice(0, 100));
    }
  };

  const createAuditLog = async (action, patientId, patientName, details, oldValue = null, newValue = null) => {
    if (!currentUser) return;

    try {
      const logEntry = {
        action,
        patient_id: patientId,
        patient_name: patientName,
        user_name: currentUser.name,
        user_role: currentUser.role,
        details,
        old_value: oldValue,
        new_value: newValue,
        timestamp: new Date().toISOString(),
      };

      await supabase.from("audit_logs").insert([logEntry]).catch(() => {
        console.log("Audit table not created yet - storing locally");
      });

      const existingLogs = JSON.parse(localStorage.getItem("auditLogs") || "[]");
      existingLogs.unshift(logEntry);
      if (existingLogs.length > 1000) existingLogs.pop();
      localStorage.setItem("auditLogs", JSON.stringify(existingLogs));

      loadAuditLogs();
    } catch (error) {
      console.error("Error creating audit log:", error);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAuditLogs();
    }
  }, [currentUser]);

  return { auditLogs, createAuditLog, loadAuditLogs };
};

// Hook for session management
export const useSession = (currentUser, onLogout) => {
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now();
      if (currentUser && now - lastActivity > SESSION_TIMEOUT) {
        alert("Session expired due to inactivity. Please login again.");
        onLogout();
      }
    };

    const interval = setInterval(checkInactivity, 60000);
    
    const updateActivity = () => setLastActivity(Date.now());
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [currentUser, lastActivity, onLogout]);

  return { lastActivity };
};

// Hook for pagination
export const usePagination = (items, itemsPerPage) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);
  const resetPage = () => setCurrentPage(1);

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
  };
};

// Export supabase client
export { supabase };
