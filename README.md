# Albino Custom Detail

Landing page de uma página só (`index.html`). O Tailwind é compilado no build em vez de rodar pelo CDN.

## Rodar no computador

```bash
npm install
npm run dev
```

Abre em http://localhost:4173. O build roda de novo a cada arquivo salvo; é só atualizar a página.

## Publicar

A Vercel roda `npm run build` e publica a pasta `dist/` (configuração em `vercel.json`).

## Onde mexer

- `index.html`: textos, seções e o script da página. Ícones continuam como no Font Awesome Free 6.5.1 (`<i class="fa-solid fa-car"></i>`); o build troca cada um pelo SVG.
- `styles/site.css`: CSS próprio (`.glass-dark`, `.carbon-bg`, comparador antes e depois).
- `tailwind.config.js`: cores e fontes.
- `public/`: favicon e `og.jpg` (imagem que aparece quando o link é compartilhado no WhatsApp).
- Número do WhatsApp: constante `WHATSAPP` no script e os links `wa.me` do HTML.
