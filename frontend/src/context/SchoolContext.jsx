import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { API } from "@/lib/api";

const SchoolContext = createContext(null);

const DEFAULT = { school_name: "MI Miftahul Jannah", school_subtitle: "Madrasah Ibtidaiyah", logo: null, academic_year: "2025/2026", semester: "2" };

export function SchoolProvider({ children }) {
  const [school, setSchool] = useState(DEFAULT);

  const refresh = useCallback(() => {
    axios.get(`${API}/settings/public`).then((r) => setSchool({ ...DEFAULT, ...r.data })).catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <SchoolContext.Provider value={{ school, refresh }}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  return useContext(SchoolContext) || { school: DEFAULT, refresh: () => {} };
}
