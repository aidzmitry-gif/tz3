import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F6F2EA",
        ink: "#1B1714",
        clay: {
          DEFAULT: "#B6451F",
          50: "#FBEDE6",
          100: "#F4D6C7",
          600: "#B6451F",
          700: "#933718",
        },
        sage: {
          DEFAULT: "#4F6F52",
          50: "#EDF1ED",
          100: "#D7E2D8",
          600: "#4F6F52",
          700: "#3C5640",
        },
        sand: "#E8E0D2",
        muted: "#8A8178",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(27,23,20,0.04), 0 8px 24px -12px rgba(27,23,20,0.18)",
        lift: "0 2px 4px rgba(27,23,20,0.05), 0 18px 40px -18px rgba(27,23,20,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
