/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6ff",
          500: "#3b6cff",
          600: "#2754e6",
          700: "#1f44bf",
          900: "#0e2664",
        },
      },
    },
  },
  plugins: [],
};
