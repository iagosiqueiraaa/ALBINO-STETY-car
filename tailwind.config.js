// Mesmo tema que estava no tailwind.config do CDN, agora compilado no build.
/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html'],
    theme: {
        extend: {
            colors: {
                redcustom: {
                    400: '#ff3b3b',
                    500: '#e50914',
                    600: '#b8050e',
                    700: '#8b0000',
                    glow: 'rgba(229, 9, 20, 0.45)'
                },
                goldcustom: {
                    400: '#f5c842',
                    500: '#d4af37',
                    600: '#aa8214'
                },
                darkbase: {
                    950: '#060709',
                    900: '#0c0e12',
                    850: '#13161c',
                    800: '#1c202a',
                    700: '#262c3a'
                }
            },
            fontFamily: {
                sans: ['"Montserrat Variable"', 'Montserrat', 'system-ui', 'sans-serif'],
                tech: ['"Orbitron Variable"', 'Orbitron', 'sans-serif'],
                racing: ['"Teko Variable"', 'Teko', 'sans-serif']
            }
        }
    }
};
