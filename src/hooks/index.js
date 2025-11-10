import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SESSION_TIMEOUT } from "./constants";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🔹 Hasta verilerini yükleme
export function usePatients(currentUser) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = async () => {
    if (!currentUser) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error) setPatients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser) loadPatients();
  }, [currentUser]);

  return { patients, loading, loadPatients };
}

// 🔹 Audit Log yönetimi
export function useAuditLogs(currentUser) {
  const [auditLogs, setAuditLogs] = useState([]);

  const createAuditLog = async (action, patient_id, patient_name, details) => {
    if (!currentUser) return;
    await supabase.from("audit_logs").insert([
      {
        user_name: currentUser.name,
        user_role: currentUser.role,
        action,
        patient_id,
        patient_name,
        details,
      },
    ]);
    loadAuditLogs();
  };

  const loadAuditLogs = async () => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(100);
    if (!error) setAuditLogs(data || []);
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return { auditLogs, createAuditLog };
}

// 🔹 Oturum kontrolü (otomatik logout)
export function useSession(currentUser, onTimeout) {
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      onTimeout?.();
    }, SESSION_TIMEOUT);
    return () => clearTimeout(timer);
  }, [currentUser]);
}

// 🔹 Sayfalama hook’u
export function usePagination(items, perPage) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / perPage);
  const currentItems = items.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
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
}

