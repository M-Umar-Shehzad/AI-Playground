/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  darkMode: "class",
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        "background-top": "var(--background-top)",
        "background-bottom": "var(--background-bottom)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        border: "var(--border)",
        muted: "var(--muted)",
        "accent-income": "var(--accent-income)",
        "accent-expense": "var(--accent-expense)",
      },
    },
  },
  plugins: [],
}
