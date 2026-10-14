// npm run dev: gera dist/, serve em http://localhost:4173 e refaz o build quando algo muda.
// Sem recarregar sozinho: depois de salvar, é só atualizar a página.
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync, watch } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
const dist = path.join(raiz, 'dist');
const porta = Number(process.env.PORT || 4173);
const tipos = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

function rodarBuild() {
    spawnSync(process.execPath, [path.join(raiz, 'scripts/build.mjs')], {
        stdio: 'inherit',
        env: { ...process.env, SITE_URL: `http://localhost:${porta}` },
    });
}

rodarBuild();

let espera;
for (const alvo of ['index.html', 'styles', 'public', 'tailwind.config.js']) {
    watch(path.join(raiz, alvo), { recursive: true }, () => {
        clearTimeout(espera);
        espera = setTimeout(rodarBuild, 150);
    });
}

createServer((req, res) => {
    const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let arquivo = path.join(dist, caminho);
    if (!arquivo.startsWith(dist)) return res.writeHead(403).end();
    if (existsSync(arquivo) && statSync(arquivo).isDirectory()) arquivo = path.join(arquivo, 'index.html');
    if (!existsSync(arquivo)) return res.writeHead(404).end('não encontrado');
    res.writeHead(200, { 'Content-Type': tipos[path.extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(arquivo).pipe(res);
}).listen(porta, () => console.log(`servindo dist/ em http://localhost:${porta}`));
