const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["assets/**", "entrypoints/**", "components/**"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        "blue-ribbon": {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bbe0ff",
          300: "#8dceff",
          400: "#57b1ff",
          500: "#308fff",
          600: "#156df6",
          700: "#1259e3",
          800: "#1649b7",
          900: "#184090",
          950: "#142857",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};
