/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			'neutral-soft': {
  				50: '#FAFAFA',
  				100: '#F5F5F5',
  				200: '#E5E5E5',
  				300: '#D4D4D4',
  				400: '#A3A3A3',
  				500: '#737373',
  				600: '#525252',
  				700: '#404040',
  				800: '#262626',
  				900: '#171717',
  			},
  			'primary-soft': {
  				50: '#FFF5F5',
  				100: '#FFE8E8',
  				200: '#FFD1D1',
  				300: '#FFB3B3',
  				400: '#FF8A8A',
  				500: '#FF6B6B',
  				600: '#E85555',
  				700: '#D14343',
  				800: '#B93333',
  				900: '#9E2828',
  			},
  			'success-soft': {
  				50: '#F0FDF4',
  				100: '#DCFCE7',
  				200: '#BBF7D0',
  				300: '#86EFAC',
  				400: '#4ADE80',
  				500: '#22C55E',
  				600: '#16A34A',
  				700: '#15803D',
  				800: '#166534',
  				900: '#14532D',
  			},
  			'warning-soft': {
  				50: '#FFFBEB',
  				100: '#FEF3C7',
  				200: '#FDE68A',
  				300: '#FCD34D',
  				400: '#FBBF24',
  				500: '#F59E0B',
  				600: '#D97706',
  				700: '#B45309',
  				800: '#92400E',
  				900: '#78350F',
  			},
  			'error-soft': {
  				50: '#FEF2F2',
  				100: '#FEE2E2',
  				200: '#FECACA',
  				300: '#FCA5A5',
  				400: '#F87171',
  				500: '#EF4444',
  				600: '#DC2626',
  				700: '#B91C1C',
  				800: '#991B1B',
  				900: '#7F1D1D',
  			},
  			'info-soft': {
  				50: '#F5F3FF',
  				100: '#EDE9FE',
  				200: '#DDD6FE',
  				300: '#C4B5FD',
  				400: '#A78BFA',
  				500: '#8B5CF6',
  				600: '#7C3AED',
  				700: '#6D28D9',
  				800: '#5B21B6',
  				900: '#4C1D95',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}