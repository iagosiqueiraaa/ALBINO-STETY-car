// Gera dist/ a partir das páginas listadas em PAGINAS:
//  - troca cada ícone pelo SVG: <i class="fa-solid fa-car"> (Font Awesome Free 6.5.1, CC BY 4.0)
//    ou <i class="ti ti-car"> (Tabler Icons, MIT), sem depender de CSS ou fonte de ícones
//  - compila o Tailwind (tailwind.config.js + o CSS da página) e cola o resultado dentro do <head>
//  - copia as fontes da página (só latin e latin-ext), a pasta public/ e gera robots.txt e sitemap.xml
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

// fontes: [pacote @fontsource-variable, arquivo de eixos]. "wdth" traz largura e peso.
const PAGINAS = [
    {
        html: 'index.html',
        css: 'styles/site.css',
        fontes: [['montserrat', 'wght'], ['orbitron', 'wght'], ['teko', 'wght']],
    },
    {
        // Redesign em teste: fica em /novo, fora do sitemap e com noindex até virar a página principal
        html: 'novo.html',
        css: 'styles/novo.css',
        fontes: [['archivo', 'wdth']],
        noSitemap: true,
    },
];

// Na Vercel, VERCEL_PROJECT_PRODUCTION_URL já é o domínio próprio quando houver um.
function enderecoDoSite() {
    if (process.env.SITE_URL) return process.env.SITE_URL;
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    return 'https://albino-custom-detail.vercel.app';
}

const SUBCONJUNTOS = /-(latin|latin-ext)-(wght|wdth)-normal\.woff2$/;

function fontesLocais(lista) {
    const blocos = [];
    const arquivos = [];
    for (const [nome, eixos] of lista) {
        const pasta = path.join(modulos, '@fontsource-variable', nome);
        const css = readFileSync(path.join(pasta, `${eixos}.css`), 'utf8');
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

function lerSvg(arquivo, descricao) {
    if (!existsSync(arquivo)) throw new Error(`Ícone ${descricao} não existe (${path.relative(raiz, arquivo)})`);
    const svg = readFileSync(arquivo, 'utf8');
    return {
        viewBox: svg.match(/viewBox="([^"]+)"/)[1],
        corpo: svg
            .replace(/^[\s\S]*?<svg[^>]*>/, '')
            .replace(/<\/svg>\s*$/, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '')
            .replace(/\s+/g, ' ')
            .trim(),
    };
}

const ESTILOS_FA = { 'fa-solid': 'solid', 'fa-regular': 'regular', 'fa-brands': 'brands' };

function iconeFontAwesome(lista) {
    const classeEstilo = lista.find((c) => ESTILOS_FA[c]);
    if (!classeEstilo) return null;
    const classeNome = lista.find((c) => c.startsWith('fa-') && c !== classeEstilo);
    const chave = `fa:${ESTILOS_FA[classeEstilo]}/${classeNome}`;
    if (!cacheIcones.has(chave)) {
        const arquivo = path.join(modulos, '@fortawesome/fontawesome-free/svgs', ESTILOS_FA[classeEstilo], `${classeNome.slice(3)}.svg`);
        cacheIcones.set(chave, lerSvg(arquivo, `${classeEstilo} ${classeNome} (Font Awesome Free 6.5.1)`));
    }
    return { ...cacheIcones.get(chave), resto: lista.filter((c) => c !== classeEstilo && c !== classeNome), extra: '' };
}

function iconeTabler(lista) {
    if (!lista.includes('ti')) return null;
    const classeNome = lista.find((c) => c.startsWith('ti-'));
    const chave = `ti:${classeNome}`;
    if (!cacheIcones.has(chave)) {
        const arquivo = path.join(modulos, '@tabler/icons/icons/outline', `${classeNome.slice(3)}.svg`);
        cacheIcones.set(chave, lerSvg(arquivo, `ti ${classeNome} (Tabler Icons, outline)`));
    }
    return {
        ...cacheIcones.get(chave),
        resto: lista.filter((c) => c !== 'ti' && c !== classeNome),
        extra: ' fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"',
    };
}

function trocarIcones(html) {
    return html.replace(/<i class="([^"]*)"([^>]*)>\s*<\/i>/g, (tag, classes, atributos) => {
        const lista = classes.split(/\s+/).filter(Boolean);
        const icone = iconeFontAwesome(lista) || iconeTabler(lista);
        if (!icone) return tag;
        const resto = icone.resto.join(' ');
        return `<svg class="ico${resto ? ` ${resto}` : ''}" viewBox="${icone.viewBox}"${icone.extra} aria-hidden="true" focusable="false"${atributos}>${icone.corpo}</svg>`;
    });
}

async function montarPagina(pagina, configuracao, site) {
    // Os ícones são trocados antes do Tailwind ler o HTML, senão a classe .ico some do CSS
    let html = trocarIcones(readFileSync(path.join(raiz, pagina.html), 'utf8'));

    const fontes = fontesLocais(pagina.fontes);
    const entradaCss = fontes.css + '\n' + readFileSync(path.join(raiz, pagina.css), 'utf8');
    const { css } = await postcss([
        tailwindcss({ ...configuracao, content: [{ raw: html, extension: 'html' }] }),
        autoprefixer(),
        cssnano({ preset: 'default' }),
    ]).process(entradaCss, { from: path.join(raiz, pagina.css) });

    const marcador = '<link rel="stylesheet" href="/assets/site.css">';
    if (!html.includes(marcador)) throw new Error(`${pagina.html} precisa ter ${marcador} (o build troca pelo CSS)`);
    html = html.replace(marcador, () => `<style>${css}</style>`);
    html = html.replaceAll('%SITE_URL%', site);

    await writeFile(path.join(dist, pagina.html), html);
    for (const arquivo of fontes.arquivos) await cp(arquivo, path.join(dist, 'fonts', path.basename(arquivo)));
    return `${pagina.html} (CSS ${(css.length / 1024).toFixed(1)} KB)`;
}

export async function build() {
    const inicio = Date.now();
    const site = enderecoDoSite().replace(/\/$/, '');
    const configuracao = (await import(`${pathToFileURL(path.join(raiz, 'tailwind.config.js')).href}?t=${inicio}`)).default;

    await rm(dist, { recursive: true, force: true });
    await mkdir(path.join(dist, 'fonts'), { recursive: true });
    await cp(path.join(raiz, 'public'), dist, { recursive: true });

    const resumo = [];
    for (const pagina of PAGINAS) resumo.push(await montarPagina(pagina, configuracao, site));

    const urls = PAGINAS.filter((p) => !p.noSitemap).map((p) => (p.html === 'index.html' ? `${site}/` : `${site}/${p.html.replace(/\.html$/, '')}`));
    await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
    await writeFile(
        path.join(dist, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`
    );

    console.log(`build ok em ${Date.now() - inicio} ms · ${resumo.join(' · ')} · ${cacheIcones.size} ícones · site ${site}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    build().catch((erro) => {
        console.error(erro.message);
        process.exit(1);
    });
}
