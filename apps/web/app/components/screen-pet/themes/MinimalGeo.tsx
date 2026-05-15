interface ThemeProps {
  isSpeaking?: boolean;
  isListening?: boolean;
  isLoading?: boolean;
  size?: number;
}

export function MinimalGeo({ isSpeaking, isListening, isLoading, size = 64 }: ThemeProps) {
  return (
    <div
      className="relative flex items-center justify-center transition-all duration-300"
      style={{ width: size, height: size }}
    >
      <div
        className={`absolute inset-0 rounded-2xl blur-lg transition-opacity duration-300 ${
          isSpeaking
            ? "bg-violet-400/50 opacity-100"
            : isListening
              ? "bg-emerald-400/50 opacity-100"
              : isLoading
                ? "bg-amber-400/50 opacity-100 animate-pulse"
                : "bg-slate-400/20 opacity-40"
        }`}
      />
      <svg viewBox="0 0 64 64" style={{ width: size * 0.6, height: size * 0.6 }}>
        <rect
          x="8"
          y="8"
          width="48"
          height="48"
          rx="12"
          fill="none"
          stroke={isSpeaking ? "#8b5cf6" : isListening ? "#10b981" : "#94a3b8"}
          strokeWidth="2"
          className={isLoading ? "animate-pulse" : ""}
        />
        <circle
          cx="32"
          cy="32"
          r="12"
          fill={isSpeaking ? "#8b5cf6" : isListening ? "#10b981" : "#cbd5e1"}
          className="transition-colors duration-300"
        />
        {(isSpeaking || isListening) && (
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="16"
            fill="none"
            stroke={isSpeaking ? "#8b5cf6" : "#10b981"}
            strokeWidth="1"
            opacity="0.5"
          >
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
          </rect>
        )}
      </svg>
    </div>
  );
}
