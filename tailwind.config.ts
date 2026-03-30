import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        kc: {
          DEFAULT: "#A0622A",
          dark: "#5C3317",
          cream: "#EDE8DC",
          light: "#F5F1EA",
          muted: "#B89070",
          line: "rgba(160,98,42,0.18)",
        },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Jost'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
