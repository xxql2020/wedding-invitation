import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getSupabaseConfigDebugInfo } from "./lib/supabase";

const supabaseDebugInfo = getSupabaseConfigDebugInfo();

if (typeof window !== "undefined") {
  Object.assign(window, {
    __WEDDING_SUPABASE_DEBUG__: supabaseDebugInfo,
  });
}

console.info("[WeddingInvitation] Supabase config debug", supabaseDebugInfo);

createRoot(document.getElementById("root")!).render(<App />);
