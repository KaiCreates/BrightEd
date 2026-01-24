import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors (Base Layer - 70-75% of UI)
        'teal-deep': '#0F4C5C',
        'teal-medium': '#1A7A8C',
        'teal-light': '#2D9BA8',
        'navy-soft': '#1E3A5F',
        'navy-dark': '#0F1F3A',
        
        // Secondary Colors (Engagement Layer - 15-20%)
        'yellow-warm': '#F5A623',
        'yellow-bright': '#FFC107',
        'orange-soft': '#FF8C42',
        'orange-warm': '#FF6B35',
        
        // Accent Colors (Cognitive Activation - <5%)
        'purple-light': '#B19CD9',
        'purple-lavender': '#D4A5E8',
        'red-error': '#E63946',
        
        // Neutral
        'gray-light': '#F5F7FA',
        'gray-medium': '#CBD5E0',
        'gray-dark': '#4A5568',
      },
      fontFamily: {
        'heading': ['Inter', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
}
export default config
