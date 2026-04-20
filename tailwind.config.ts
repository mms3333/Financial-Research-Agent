import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#050B1A",
        panel: "#0B1224",
        border: "#1D2B4D",
        accent: "#3DDC97",
        info: "#4AA3FF"
      }
    }
  },
  plugins: []
};

export default config;
