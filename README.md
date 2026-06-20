# Earth Console

Earth Console is a browser-based globe for exploring Earth through time. It combines a present-day globe, reconstructed deep-time coastlines and plate topology, plate-motion visualization, political/geographic reference layers, and a playable Roblox-style surface lens.

The app is designed as a learning tool for asking questions like:

- Where would this city or country have been 50, 100, or 250 million years ago?
- How do plate regions relate to recognizable continent shapes?
- What changes when the same globe is viewed politically, physically, tectonically, or as a playable surface?

## Local Development

```sh
npm install
npm run dev
```

For another device on the local network:

```sh
npm run dev:lan
```

Then open the printed LAN URL, usually something like `http://<laptop-ip>:5173/`.

## Build

```sh
npm run build
npm run preview
```

For LAN preview:

```sh
npm run preview:lan
```

## Data

Generated data lives in `public/data` so ordinary app use does not depend on live API calls.

- Present-day country geometry comes from Natural Earth 1:110m.
- Past point tracks, coastlines, and plate polygons come from GPlates Web Service using the Muller2019 model.
- Future layers are local scenario sketches, not scientific forecasts.

Regenerate cached data with:

```sh
npm run data
```

See [ATTRIBUTION.md](./ATTRIBUTION.md) for data and asset provenance.

## Deployment

This app is configured for GitHub Pages under:

`https://usjoh.github.io/earth-console/`

The Vite build uses relative asset paths so the same build can run under the repository subpath.

## License

No open-source license is granted for this project at this time. The source is visible in the public repository, but reuse rights are not granted beyond rights already attached to the third-party data, assets, and dependencies listed in [ATTRIBUTION.md](./ATTRIBUTION.md) and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
