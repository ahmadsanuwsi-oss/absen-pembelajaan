import { useSchool } from "@/context/SchoolContext";

export function Logo({ size = 40, className = "" }) {
  const { school } = useSchool();
  if (school?.logo) {
    return <img src={school.logo} alt={school.school_name} width={size} height={size} className={`object-contain rounded-lg ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M32 2L58 11V30C58 46 47 57 32 62C17 57 6 46 6 30V11L32 2Z" fill="#800020" stroke="#D4AF37" strokeWidth="2.5"/>
      <path d="M32 8L52 15V30C52 42.5 43.5 51.5 32 55.5C20.5 51.5 12 42.5 12 30V15L32 8Z" fill="#6B0D24"/>
      <path d="M32 18C28 18 25 21 25 25V27H39V25C39 21 36 18 32 18Z" fill="#D4AF37"/>
      <rect x="30.7" y="13.5" width="2.6" height="5" rx="1.3" fill="#D4AF37"/>
      <circle cx="32" cy="13" r="1.6" fill="#D4AF37"/>
      <path d="M20 33C24 31 28.5 31 32 33C35.5 31 40 31 44 33V44C40 42 35.5 42 32 44C28.5 42 24 42 20 44V33Z" fill="#FAF9F6"/>
      <path d="M32 33V44" stroke="#800020" strokeWidth="1.4"/>
      <path d="M23 35.5C25.5 34.7 28.5 34.7 30.5 35.5M23 38.5C25.5 37.7 28.5 37.7 30.5 38.5M33.5 35.5C35.5 34.7 38.5 34.7 41 35.5M33.5 38.5C35.5 37.7 38.5 37.7 41 38.5" stroke="#9E1B32" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}
