/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        neo: {
          base: "#f0f2f5",
          light: "#ffffff",
          dark: "#d1d9e6",
          text: "#1a1a1a",
          textMuted: "#4a5568",
          accent: "#3b82f6",
          danger: "#ef4444",
          success: "#22c55e",
          warning: "#f59e0b",
        },
      },
      boxShadow: {
        neo: "8px 8px 16px #b8c1d1, -8px -8px 16px #ffffff",
        "neo-inset": "inset 4px 4px 8px #b8c1d1, inset -4px -4px 8px #ffffff",
        "neo-pressed": "inset 6px 6px 12px #b8c1d1, inset -6px -6px 12px #ffffff",
        "neo-hover": "10px 10px 20px #a3b1c6, -10px -10px 20px #ffffff",
        "neo-critical": "0 0 0 3px rgba(239, 68, 68, 0.3), 8px 8px 16px #b8c1d1, -8px -8px 16px #ffffff",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};