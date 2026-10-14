// Mesmo tema que estava no tailwind.config do CDN, agora compilado no build.
/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './novo.html'],
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
                },
                // Redesign (novo.html): estúdio escuro e um vermelho só, sólido
                studio: {
                    950: '#060607',
                    900: '#0a0a0c',
                    850: '#0f0f12',
                    800: '#151519',
                    700: '#1e1e23',
                    600: '#2a2a31'
                },
                candy: {
                    300: '#ff7a83',
                    400: '#ff3341',
                    500: '#e3121f',
                    600: '#b80d18',
                    700: '#8f0710'
                }
            },
            fontFamily: {
                sans: ['"Montserrat Variable"', 'Montserrat', 'system-ui', 'sans-serif'],
                tech: ['"Orbitron Variable"', 'Orbitron', 'sans-serif'],
                racing: ['"Teko Variable"', 'Teko', 'sans-serif'],
                arch: ['"Archivo Variable"', 'Archivo', 'system-ui', 'sans-serif']
            },
            transitionTimingFunction: {
                saida: 'cubic-bezier(0.23, 1, 0.32, 1)',
                movimento: 'cubic-bezier(0.77, 0, 0.175, 1)'
            }
        }
    }
};
