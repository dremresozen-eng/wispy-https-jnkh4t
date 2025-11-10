export const SUPABASE_URL = "https://your-supabase-url.supabase.co";
export const SUPABASE_ANON_KEY = "your-anon-key-here";

// Kullanıcı listesi (örnek)
export const AUTHORIZED_USERS = [
  { name: "Dr. Emre Sözen", role: "Admin", password: "1234" },
  { name: "Assistant", role: "User", password: "5678" },
];

// Listeleme ayarları
export const PATIENTS_PER_PAGE = 6;
export const SESSION_TIMEOUT = 1000 * 60 * 60; // 1 saat

export const SURGERY_TYPES = [
  "Cataract",
  "Trabeculectomy",
  "Vitrectomy",
  "Corneal Transplant",
];

export const STATUS_OPTIONS = ["Waiting", "Scheduled", "Completed", "Cancelled"];

export const URGENCY_LEVELS = ["routine", "soon", "urgent"];

export const STATUS_COLORS = {
  Waiting: { color: "bg-gray-100" },
  Scheduled: { color: "bg-yellow-100" },
  Completed: { color: "bg-green-100" },
  Cancelled: { color: "bg-red-100" },
};

