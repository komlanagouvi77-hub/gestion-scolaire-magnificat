/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        magnificat: {
          navy: "#0A2540",
          gold: "#B08A2E",
          amber: "#F59E0B",
          dark: "#0B1326",
          card: "#142036",
        },
      },
    },
  },
  corePlugins: {
    preflight: false, // Préserve le style CSS existant tout en offrant tous les utilitaires Tailwind
  },
  plugins: [],
}
