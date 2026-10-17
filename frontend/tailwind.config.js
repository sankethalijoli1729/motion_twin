/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0B0F12",
        panel: "#141A1F",
        panelHover: "#1A2229",
        borderSubtle: "#222C35",
        borderHover: "#303E4C",
        teal: {
          accent: "#57D6C2",
          dim: "#2E7C70",
          glow: "rgba(87, 214, 194, 0.15)",
        },
        accentBlue: "#38BDF8",
        accentAmber: "#F59E0B",
        accentRed: "#EF4444",
        textMain: "#F3F4F6",
        textMuted: "#9CA3AF",
        textDim: "#6B7280"
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      }
    },
  },
  plugins: [],
}
