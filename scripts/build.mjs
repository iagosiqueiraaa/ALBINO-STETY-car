// Gera dist/ a partir do index.html:
//  - compila o Tailwind (tailwind.config.js + styles/site.css) e cola o CSS dentro do <head>
//  - troca cada <i class="fa-..."></i> pelo SVG do ícone (Font Awesome Free, CC BY 4.0)
//  - copia as fontes (só latin e latin-ext), a pasta public/ e gera robots.txt e sitemap.xml
//  - troca %SITE_URL% pelo endereço de produção
import { readFileSync, existsSync } from 'node:fs';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

const raiz = path.resolve(import.meta.dirname, '..');
const dist = path.join(raiz, 'dist');
const modulos = path.join(raiz, 'node_modules');

// Na Vercel, VERCEL_PROJECT_PRODUCTION_URL já é o domínio próprio quando houver um.
function enderecoDoSite() {
    if (process.env.SITE_URL) return process.env.SITE_URL;
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    return 'https://albino-custom-detail.vercel.app';
}

const FONTES = ['montserrat', 'orbitron', 'teko'];
const SUBCONJUNTOS = /-(latin|latin-ext)-wght-normal\.woff2$/;

function fontesLocais() {
    const blocos = [];
    const arquivos = [];
    for (const nome of FONTES) {
        const pasta = path.join(modulos, '@fontsource-variable', nome);
        const css = readFileSync(path.join(pasta, 'wght.css'), 'utf8');
        for (const bloco of css.match(/@font-face\s*{[^}]*}/g)) {
            const arquivo = bloco.match(/url\(\.\/files\/([^)]+)\)/)?.[1];
            if (!arquivo || !SUBCONJUNTOS.test(arquivo)) continue;
            blocos.push(bloco.replace(`./files/${arquivo}`, `/fonts/${arquivo}`));
            arquivos.push(path.join(pasta, 'files', arquivo));
        }
    }
    return { css: blocos.join('\n'), arquivos };
}

const cacheIcones = new Map();

function svgDoIcone(estilo, nome) {
    const chave = `${estilo}/${nome}`;
    if (!cacheIcones.has(chave)) {
        const arquivo = path.join(modulos, '@fortawesome/fontawesome-free/svgs', estilo, `${nome}.svg`);
        if (!existsSync(arquivo)) {
            throw new Error(`Ícone fa-${estilo} fa-${nome} não existe no Font Awesome Free 6.5.1 (procure em fontawesome.com/search?ic=free)`);
        }
        const svg = readFileSync(arquivo, 'utf8');
        cacheIcones.set(chave, {
            viewBox: svg.match(/viewBox="([^"]+)"/)[1],
            corpo: svg.replace(/^[\s\S]*?<\/?svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<!--[\s\S]*?-->/g, ''),
        });
    }
    return cacheIcones.get(chave);
}

const ESTILOS = { 'fa-solid': 'solid', 'fa-regular': 'regular', 'fa-brands': 'brands' };

function trocarIcones(html) {
    return html.replace(/<i class="([^"]*)"([^>]*)>\s*<\/i>/g, (tag, classes, atributos) => {
        const lista = classes.split(/\s+/).filter(Boolean);
        const classeEstilo = lista.find((c) => ESTILOS[c]);
        if (!classeEstilo) return tag;
        const classeNome = lista.find((c) => c.startsWith('fa-') && c !== classeEstilo);
        const { viewBox, corpo } = svgDoIcone(ESTILOS[classeEstilo], classeNome.slice(3));
        const resto = lista.filter((c) => c !== classeEstilo && c !== classeNome).join(' ');
        return `<svg class="ico${resto ? ` ${resto}` : ''}" viewBox="${viewBox}" aria-hidden="true" focusable="false"${atributos}>${corpo}</svg>`;
    });
}

export async function build() {
    const inicio = Date.now();
    const site = enderecoDoSite().replace(/\/$/, '');
    const configuracao = (await import(`${pathToFileURL(path.join(raiz, 'tailwind.config.js')).href}?t=${inicio}`)).default;

    // Os ícones são trocados antes do Tailwind ler o HTML, senão a classe .ico some do CSS
    let html = trocarIcones(readFileSync(path.join(raiz, 'index.html'), 'utf8'));

    const fontes = fontesLocais();
    const entradaCss = fontes.css + '\n' + readFileSync(path.join(raiz, 'styles/site.css'), 'utf8');
    const { css } = await postcss([
        tailwindcss({ ...configuracao, content: [{ raw: html, extension: 'html' }] }),
        autoprefixer(),
        cssnano({ preset: 'default' }),
    ]).process(entradaCss, { from: path.join(raiz, 'styles/site.css') });

    const marcador = '<link rel="stylesheet" href="/assets/site.css">';
    if (!html.includes(marcador)) throw new Error(`index.html precisa ter ${marcador} (o build troca pelo CSS)`);
    html = html.replace(marcador, () => `<style>${css}</style>`);
    html = html.replaceAll('%SITE_URL%', site);

    await rm(dist, { recursive: true, force: true });
    await mkdir(path.join(dist, 'fonts'), { recursive: true });
    await cp(path.join(raiz, 'public'), dist, { recursive: true });
    for (const arquivo of fontes.arquivos) await cp(arquivo, path.join(dist, 'fonts', path.basename(arquivo)));
    await writeFile(path.join(dist, 'index.html'), html);
    await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
    await writeFile(
        path.join(dist, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc></url>\n</urlset>\n`
    );

    console.log(`build ok em ${Date.now() - inicio} ms · CSS ${(css.length / 1024).toFixed(1)} KB · ${cacheIcones.size} ícones · site ${site}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    build().catch((erro) => {
        console.error(erro.message);
        process.exit(1);
    });
}
