// Supabase Configuration
export const SUPABASE_URL = "https://zzifgbkljofyzlxbzypk.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWZnYmtsam9meXpseGJ6eXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MjQyODMsImV4cCI6MjA3ODIwMDI4M30.8aIx6Ta_ErN2YgiZlr9CJiyb1HIvE-waRuksr42k1Rg";

// Authorized Users
export const AUTHORIZED_USERS = [
  { name: "Özlem Şahin", password: "0000", role: "admin" },
  { name: "Mehmet Orkun Sevik", password: "0001", role: "surgeon" },
  { name: "Aslan Aykut", password: "0002", role: "surgeon" },
  { name: "Emre Sözen", password: "0004", role: "surgeon" },
  { name: "Tuğçe Kılıçarslan", password: "0005", role: "surgeon" },
  { name: "Yiğitalp Akpınar", password: "0006", role: "surgeon" },
];

// Surgery Types
export const SURGERY_TYPES = [
  "Phacoemulsification",
  "Pars Plana Vitrectomy",
  "Ahmed Glaucoma Valve",
  "Silicone Oil Removal",
  "Silicone Oil Injection",
  "Secondary IOL Implantation",
];

// Status Options
export const STATUS_OPTIONS = [
  "Waiting",
  "Pre-op Prep",
  "Ready",
  "Scheduled",
  "Completed",
];

// Urgency Levels
export const URGENCY_LEVELS = {
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

// Status Colors
export const STATUS_COLORS = {
  "Waiting": {
    color: "bg-gray-50 border-gray-300",
    textColor: "text-gray-800",
  },
  "Pre-op Prep": {
    color: "bg-yellow-50 border-yellow-300",
    textColor: "text-yellow-800",
  },
  "Ready": {
    color: "bg-orange-50 border-orange-300",
    textColor: "text-orange-800",
  },
  "Scheduled": {
    color: "bg-red-50 border-red-300",
    textColor: "text-red-800",
  },
  "Completed": {
    color: "bg-green-50 border-green-300",
    textColor: "text-green-800",
  },
};

// Session Configuration
export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const MAX_LOGIN_ATTEMPTS = 5;
export const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Pagination
export const PATIENTS_PER_PAGE = 12;

// App Version
export const APP_VERSION = "0.4";
