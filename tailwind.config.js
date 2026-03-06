/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			bg: '#09090B',
  			surface: '#18181B',
  			elevated: '#27272A',
  			border: 'hsl(var(--border))',
  			'text-primary': '#FAFAFA',
  			'text-secondary': '#A1A1AA',
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			'accent-hover': '#C4B5FD',
  			success: '#34D399',
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
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'Fira Code',
  				'monospace'
  			]
  		},
  		fontSize: {
  			'scale-1': [
  				'0.64rem',
  				{
  					lineHeight: '1rem'
  				}
  			],
  			'scale-2': [
  				'0.8rem',
  				{
  					lineHeight: '1.2rem'
  				}
  			],
  			'scale-3': [
  				'1rem',
  				{
  					lineHeight: '1.5rem'
  				}
  			],
  			'scale-4': [
  				'1.25rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			'scale-5': [
  				'1.563rem',
  				{
  					lineHeight: '2rem'
  				}
  			],
  			'scale-6': [
  				'1.953rem',
  				{
  					lineHeight: '2.5rem'
  				}
  			],
  			'scale-7': [
  				'2.441rem',
  				{
  					lineHeight: '3rem'
  				}
  			],
  			'scale-8': [
  				'3.052rem',
  				{
  					lineHeight: '3.5rem'
  				}
  			]
  		},
  		borderRadius: {
  			xl: '12px',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			'glow-accent': '0 0 20px rgba(167, 139, 250, 0.15)',
  			'glow-accent-md': '0 0 30px rgba(167, 139, 250, 0.25)',
  			card: '0 4px 24px rgba(0,0,0,0.4)'
  		},
  		backdropBlur: {
  			xs: '4px'
  		},
  		animation: {
  			'fade-up': 'fadeUp 0.5s ease forwards',
  			'fade-in': 'fadeIn 0.3s ease forwards',
  			'scale-in': 'scaleIn 0.3s ease forwards',
  			'bar-fill': 'barFill 1s ease forwards',
  			'count-up': 'countUp 1s ease forwards'
  		},
  		keyframes: {
  			fadeUp: {
  				from: {
  					opacity: '0',
  					transform: 'translateY(16px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			fadeIn: {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			scaleIn: {
  				from: {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
