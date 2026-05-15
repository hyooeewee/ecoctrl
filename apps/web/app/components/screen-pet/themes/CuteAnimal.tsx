interface ThemeProps {
  isSpeaking?: boolean;
  isListening?: boolean;
  isLoading?: boolean;
  size?: number;
}

export function CuteAnimal({ isSpeaking, isListening, isLoading, size = 64 }: ThemeProps) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full transition-all duration-300"
      style={{ width: size, height: size }}
    >
      <div
        className={`absolute inset-0 rounded-full blur-md transition-opacity duration-300 ${
          isSpeaking
            ? "bg-orange-400/40 opacity-100"
            : isListening
              ? "bg-pink-400/40 opacity-100"
              : isLoading
                ? "bg-yellow-400/40 opacity-100 animate-pulse"
                : "bg-orange-300/20 opacity-60"
        }`}
      />
      <svg viewBox="0 0 64 64" style={{ width: size * 0.75, height: size * 0.75 }}>
        <ellipse cx="18" cy="14" rx="8" ry="12" fill="#f97316" />
        <ellipse cx="46" cy="14" rx="8" ry="12" fill="#f97316" />
        <ellipse cx="18" cy="16" rx="4" ry="7" fill="#fdba74" />
        <ellipse cx="46" cy="16" rx="4" ry="7" fill="#fdba74" />
        <circle cx="32" cy="34" r="20" fill="#fb923c" />
        <circle cx="24" cy="30" r="4" fill="#1f2937" />
        <circle cx="40" cy="30" r="4" fill="#1f2937" />
        <circle cx="25" cy="29" r="1.5" fill="white" />
        <circle cx="41" cy="29" r="1.5" fill="white" />
        <ellipse cx="32" cy="38" rx="3" ry="2" fill="#7c2d12" />
        <path d="M28 42 Q32 46 36 42" stroke="#7c2d12" strokeWidth="1.5" fill="none" />
        <circle cx="18" cy="36" r="3" fill="#fca5a5" opacity="0.6" />
        <circle cx="46" cy="36" r="3" fill="#fca5a5" opacity="0.6" />
      </svg>
    </div>
  );
}
