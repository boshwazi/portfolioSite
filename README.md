# Portfolio site

Single-page portfolio for Megat Mohammad Akif. Plain HTML, CSS and JavaScript, with no build step and no dependencies, so GitHub Pages serves the files as they are.

Live at: https://boshwazi.github.io/portfolioSite/

## Files

| File | What it holds |
|---|---|
| `index.html` | All content: hero, What I do, Selected work (with the diagrams), Tools, Contact |
| `assets/styles.css` | Colour tokens for light and dark, layout, and motion |
| `assets/main.js` | Theme toggle, scroll reveals, the What I do rail, the project stage, copy email |
| `assets/fonts/` | Geist and Geist Mono (self-hosted) |
| `assets/favicon.svg` | Tab icon |

## Editing

- **Text**: edit `index.html` directly. Each project is one `<article class="proj">` block.
- **Accent colour**: change `--accent` and `--accent-soft` in `assets/styles.css` (once for light, twice for dark).
- **Adding a project**: copy an `<article class="proj" data-proj>` block. The desktop stage picks it up automatically.

## Preview locally

```bash
python -m http.server 4173
```

Then open http://127.0.0.1:4173.

## Deploy (GitHub Pages)

1. Push to `main`.
2. On GitHub: **Settings > Pages > Build and deployment**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`, then Save.
3. The site is live at the URL above within a minute or two. Later pushes redeploy automatically.

All paths are relative, so the site works under the `/portfolioSite/` sub-path.

## Credits

- [Geist](https://vercel.com/font) fonts by Vercel, SIL Open Font License (`assets/fonts/OFL.txt`)
- Icons from [Phosphor Icons](https://phosphoricons.com), MIT licence
