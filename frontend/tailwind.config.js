/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["PP Fragment", "Space Grotesk", "Inter", "ui-sans-serif", "system-ui"],
        heading: ["PP Fragment", "Mondwest", "ui-serif", "serif"],
        body: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont"],
        ui: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont"],
      },
      boxShadow: {
        glass: "0 24px 80px rgba(0, 0, 0, 0.34)",
        folder: "0 28px 44px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255,255,255,0.3)",
      },
    },
  },
  plugins: [],
};
