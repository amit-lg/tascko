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
        priority: {
          low: "var(--color-priority-low)",
          medium: "var(--color-priority-medium)",
          high: "var(--color-priority-high)",
        },
        status: {
          todo: "var(--color-status-todo)",
          "in-progress": "var(--color-status-in-progress)",
          done: "var(--color-status-done)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
