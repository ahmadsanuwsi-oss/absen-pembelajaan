export const ATTENDANCE_TYPES = [
  { value: "datang", label: "Kehadiran (Datang)" },
  { value: "pulang", label: "Kehadiran (Pulang)" },
  { value: "dhuha", label: "Sholat Dhuha" },
  { value: "dzuhur", label: "Sholat Dzuhur" },
  { value: "pramuka", label: "Ekstra Pramuka" },
  { value: "tartil", label: "Ekstra Tartil" },
  { value: "ekstra_tahfidz", label: "Ekstra Tahfidz" },
];

export function waLinkFromPhone(phone, text = "") {
  const d = String(phone || "").replace(/\D/g, "");
  let n = d;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  if (!n.startsWith("62")) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
