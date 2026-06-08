# AdrenAI Launch Site

The launch site is static and can be deployed to GitHub Pages, Netlify, or any
static host.

```bash
python -m http.server 8080 --directory site
```

Validate and preview the site before deployment:

```bash
corepack pnpm site:validate
corepack pnpm site:serve
```
