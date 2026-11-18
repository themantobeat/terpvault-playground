# TerpVault viewer playground

Experimental copies of the TerpVault 3D viewers as Web Components (no iframe), for testing Wix Custom Elements.
This repository is separate from production. Nothing here feeds the live storefront.

- `tv-viewer.js`: spin viewer component (`<tv-viewer>`), test page `index.html`
- `tv-home-scroll.js`: scroll animation home page component (`<tv-home-scroll>`), test page `home-scroll.html`
- `home/`, `assets/`: copied page files and models

Pushing to `main` updates the GitHub Pages site within a few minutes.

## home-worker/ (2026-11-18)

Test build of the home page with the 3D normals step moved into a background worker. Output matches the current home/ build exactly (checked per mesh). Changed files: s2.js, s4.js, index.html (script versions only). Test traffic here is not in any analytics. Live site and themantobeat/terpvault-ar are unchanged.
