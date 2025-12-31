import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#1e1f22',
          darker: '#111214',
          light: '#2b2d31',
          lighter: '#313338',
          blurple: '#5865f2',
          green: '#3ba55c',
          yellow: '#faa61a',
          red: '#ed4245',
        },
      },
    },
  },
  plugins: [],
};

export default config;
