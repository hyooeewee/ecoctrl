interface ThemeProps {
  isSpeaking?: boolean;
  isListening?: boolean;
  isLoading?: boolean;
  size?: number;
}

export function TechRobot({ isSpeaking, isListening, isLoading, size = 64 }: ThemeProps) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full transition-all duration-300"
      style={{ width: size, height: size }}
    >
      <div
        className={`absolute inset-0 rounded-full blur-md transition-opacity duration-300 ${
          isSpeaking
            ? "bg-cyan-400/40 opacity-100"
            : isListening
              ? "bg-emerald-400/40 opacity-100"
              : isLoading
                ? "bg-amber-400/40 opacity-100 animate-pulse"
                : "bg-cyan-400/20 opacity-60"
        }`}
      />
      <svg
        viewBox="0 0 64 64"
        className="relative z-10"
        style={{ width: size * 0.7, height: size * 0.7 }}
      >
        <rect
          x="12"
          y="8"
          width="40"
          height="36"
          rx="6"
          fill="#1a2332"
          stroke="#22d3ee"
          strokeWidth="1.5"
        />
        <circle
          cx="24"
          cy="24"
          r="5"
          fill={isSpeaking ? "#22d3ee" : isListening ? "#34d399" : "#64748b"}
        >
          {isSpeaking && (
            <animate attributeName="r" values="5;4;5" dur="0.6s" repeatCount="indefinite" />
          )}
        </circle>
        <circle
          cx="40"
          cy="24"
          r="5"
          fill={isSpeaking ? "#22d3ee" : isListening ? "#34d399" : "#64748b"}
        >
          {isSpeaking && (
            <animate attributeName="r" values="5;4;5" dur="0.6s" repeatCount="indefinite" />
          )}
        </circle>
        <line x1="32" y1="8" x2="32" y2="2" stroke="#22d3ee" strokeWidth="1.5" />
        <circle cx="32" cy="2" r="2" fill="#22d3ee">
          {isListening && (
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
          )}
        </circle>
        <rect x="22" y="36" width="20" height="3" rx="1.5" fill="#475569" />
      </svg>
    </div>
  );
}
