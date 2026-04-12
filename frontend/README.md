# Handwritten Font Generator Frontend

Static GitHub Pages app that loads handwriting `.ttf` fonts directly from this repository and lets users:

- choose from multiple handwriting styles
- type custom text
- tune spacing, slant, page width, ink color, and paper style
- export the rendered result as a PNG
- share a preconfigured link via query parameters

## Local development

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
cd frontend
npm run build
```

## GitHub Pages deployment

This frontend is configured to work when published under:

`https://shhubham-r.github.io/handwritten-font-generator/`

Recommended publish target:
- Build from `frontend/`
- Deploy the generated `frontend/dist/` directory to GitHub Pages

If you use GitHub Actions, the build already has the correct Vite `base` path for Pages.
