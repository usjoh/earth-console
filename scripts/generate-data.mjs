import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(PUBLIC_DIR, "data");
const PLATES_DIR = path.join(DATA_DIR, "plates");
const COASTLINES_DIR = path.join(DATA_DIR, "coastlines");
const ASSETS_DIR = path.join(PUBLIC_DIR, "assets");

const MODEL = "Muller2019";
const PAST_TIMES = [0, 10, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250];
const PLATE_SNAPSHOTS = PAST_TIMES;
const CHUNK_SIZE = 60;

const COUNTRIES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const EARTH_TEXTURES = [
  {
    file: "earth-blue-marble.jpg",
    url: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  },
  {
    file: "earth-topology.png",
    url: "https://unpkg.com/three-globe/example/img/earth-topology.png",
  },
  {
    file: "night-sky.png",
    url: "https://unpkg.com/three-globe/example/img/night-sky.png",
  },
];

const SOURCE_METADATA = {
  naturalEarth: {
    name: "Natural Earth 1:110m Admin 0 Countries",
    url: "https://www.naturalearthdata.com/",
    termsUrl: "https://www.naturalearthdata.com/about/terms-of-use/",
    license: "Public domain",
  },
  gplates: {
    name: "GPlates Web Service",
    url: "https://gws.gplates.org/",
    model: MODEL,
    modelDocsUrl: "https://gwsdoc.gplates.org/models/#muller2019",
    license: "Creative Commons Attribution 4.0 International",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    citation:
      "Muller, R. D. et al. (2019), A global plate model including lithospheric deformation along major rifts and orogens since the Triassic. Tectonics, 38. https://doi.org/10.1029/2018TC005462",
  },
  localScenario: {
    name: "Earth Console local scenario vectors",
    note: "Illustrative future drift vectors, not a validated scientific forecast.",
  },
  threeGlobeTextures: {
    name: "three-globe example image assets",
    url: "https://github.com/vasturiano/three-globe",
    license: "MIT",
  },
};

const CITIES = [
  { id: "yerevan", kind: "city", name: "Yerevan", country: "Armenia", lat: 40.1872, lng: 44.5152 },
  { id: "boston", kind: "city", name: "Boston", country: "United States", lat: 42.3601, lng: -71.0589 },
  { id: "new-york", kind: "city", name: "New York", country: "United States", lat: 40.7128, lng: -74.006 },
  { id: "london", kind: "city", name: "London", country: "United Kingdom", lat: 51.5072, lng: -0.1276 },
  { id: "cairo", kind: "city", name: "Cairo", country: "Egypt", lat: 30.0444, lng: 31.2357 },
  { id: "delhi", kind: "city", name: "Delhi", country: "India", lat: 28.6139, lng: 77.209 },
  { id: "tokyo", kind: "city", name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { id: "sydney", kind: "city", name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { id: "rio", kind: "city", name: "Rio de Janeiro", country: "Brazil", lat: -22.9068, lng: -43.1729 },
  { id: "cape-town", kind: "city", name: "Cape Town", country: "South Africa", lat: -33.9249, lng: 18.4241 },
];

const FEATURE_COUNTRIES = [
  "Armenia",
  "United States of America",
  "Brazil",
  "Egypt",
  "India",
  "China",
  "Australia",
  "France",
  "Madagascar",
  "South Africa",
  "Japan",
  "United Kingdom",
];

const FUTURE_MOTIONS = {
  "North America": { latPerMyr: 0.006, lngPerMyr: -0.045 },
  "South America": { latPerMyr: 0.015, lngPerMyr: -0.025 },
  Europe: { latPerMyr: 0.012, lngPerMyr: 0.035 },
  Africa: { latPerMyr: 0.045, lngPerMyr: 0.022 },
  Asia: { latPerMyr: 0.006, lngPerMyr: 0.014 },
  Oceania: { latPerMyr: 0.058, lngPerMyr: 0.046 },
  Antarctica: { latPerMyr: 0.004, lngPerMyr: 0.008 },
  default: { latPerMyr: 0.012, lngPerMyr: 0.016 },
};

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return response.json();
}

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function countryName(feature) {
  return (
    feature.properties.NAME_EN ||
    feature.properties.NAME_LONG ||
    feature.properties.ADMIN ||
    feature.properties.NAME
  );
}

function countryId(feature) {
  const iso = feature.properties.ISO_A3_EH || feature.properties.ISO_A3 || feature.properties.ADM0_A3;
  if (iso && iso !== "-99") return iso;
  return countryName(feature).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function roundNumber(value, digits = 3) {
  return Number(Number(value).toFixed(digits));
}

function compactRing(ring, maxPoints = 160) {
  if (!Array.isArray(ring) || ring.length <= 4) return ring;
  const step = Math.max(1, Math.ceil(ring.length / maxPoints));
  const sampled = ring
    .filter((_, index) => index % step === 0 || index === ring.length - 1)
    .map(([lng, lat]) => [roundNumber(lng), roundNumber(lat)]);
  const first = sampled[0];
  const last = sampled[sampled.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    sampled.push([...first]);
  }
  return sampled.length >= 4 ? sampled : ring.map(([lng, lat]) => [roundNumber(lng), roundNumber(lat)]);
}

function compactGeometry(geometry, maxPoints = 160) {
  if (!geometry) return geometry;
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => compactRing(ring, maxPoints)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => compactRing(ring, maxPoints)),
      ),
    };
  }
  return geometry;
}

function collectGeometryPoints(geometry, points = []) {
  if (!geometry) return points;
  if (geometry.type === "Polygon") {
    for (const ring of geometry.coordinates) {
      for (const [lng, lat] of ring) points.push({ lng, lat });
    }
  }
  if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) points.push({ lng, lat });
      }
    }
  }
  return points;
}

function sphericalCentroid(features) {
  let x = 0;
  let y = 0;
  let z = 0;
  let count = 0;
  for (const feature of features) {
    for (const point of collectGeometryPoints(feature.geometry)) {
      const lat = (point.lat * Math.PI) / 180;
      const lng = (point.lng * Math.PI) / 180;
      x += Math.cos(lat) * Math.cos(lng);
      y += Math.cos(lat) * Math.sin(lng);
      z += Math.sin(lat);
      count += 1;
    }
  }
  if (!count) return null;
  x /= count;
  y /= count;
  z /= count;
  const lng = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);
  return { lat: roundNumber((lat * 180) / Math.PI, 3), lng: roundNumber((lng * 180) / Math.PI, 3) };
}

function shortestLngDelta(from, to) {
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function motionArrow(center, deltaLat, deltaLng, scale = 1.1) {
  const magnitude = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
  if (!center || magnitude < 0.12) return null;
  const length = Math.max(1.4, Math.min(8, magnitude * scale));
  const unitLat = deltaLat / magnitude;
  const unitLng = deltaLng / magnitude;
  return {
    startLat: clampLat(center.lat - unitLat * length * 0.35),
    startLng: normalizeLng(center.lng - unitLng * length * 0.35),
    endLat: clampLat(center.lat + unitLat * length * 0.65),
    endLng: normalizeLng(center.lng + unitLng * length * 0.65),
    magnitude: roundNumber(magnitude, 3),
  };
}

function normalizeLng(lng) {
  let value = lng;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function clampLat(lat) {
  return Math.max(-86, Math.min(86, lat));
}

function futurePoint(point, years) {
  const motion = FUTURE_MOTIONS[point.continent] || FUTURE_MOTIONS.default;
  const driftFactor = 1 + Math.sin((years / 250) * Math.PI) * 0.18;
  return {
    lat: clampLat(point.lat + motion.latPerMyr * years * driftFactor),
    lng: normalizeLng(point.lng + motion.lngPerMyr * years * driftFactor),
  };
}

function projectedPath(point) {
  const path = {};
  for (const time of PAST_TIMES) {
    path[String(-time)] = null;
  }
  path["0"] = { lat: point.lat, lng: point.lng };
  for (const future of [25, 50, 75, 100, 150, 200, 250]) {
    path[String(future)] = futurePoint(point, future);
  }
  return path;
}

async function reconstructPoints(points, time) {
  if (time === 0) {
    return points.map((point) => ({ lat: point.lat, lng: point.lng }));
  }

  const output = [];
  for (let start = 0; start < points.length; start += CHUNK_SIZE) {
    const chunk = points.slice(start, start + CHUNK_SIZE);
    const lons = chunk.map((point) => point.lng.toFixed(5)).join(",");
    const lats = chunk.map((point) => point.lat.toFixed(5)).join(",");
    const url = `https://gws.gplates.org/reconstruct/reconstruct_points/?lons=${encodeURIComponent(lons)}&lats=${encodeURIComponent(lats)}&time=${time}&model=${MODEL}`;
    const data = await fetchJson(url);
    const coordinates = data.coordinates || [];
    for (const coord of coordinates) {
      output.push({ lng: coord[0], lat: coord[1] });
    }
  }
  return output;
}

async function writeJson(file, data) {
  await writeFile(file, `${JSON.stringify(data)}\n`);
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(PLATES_DIR, { recursive: true });
  await mkdir(COASTLINES_DIR, { recursive: true });
  await mkdir(ASSETS_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();

  console.log("Downloading country geometry");
  const countries = await fetchJson(COUNTRIES_URL);
  countries.properties = {
    generatedAt,
    sources: {
      naturalEarth: SOURCE_METADATA.naturalEarth,
    },
    transformations: ["Filtered indeterminate features", "Compacted geometry for browser rendering"],
  };
  countries.features = countries.features
    .filter((feature) => feature.properties.TYPE !== "Indeterminate")
    .map((feature) => {
      const name = countryName(feature);
      const id = countryId(feature);
      const labelLng = Number(feature.properties.LABEL_X);
      const labelLat = Number(feature.properties.LABEL_Y);
      return {
        id,
        type: "Feature",
        geometry: compactGeometry(feature.geometry, 140),
        properties: {
          APP_ID: id,
          APP_NAME: name,
          APP_CONTINENT: feature.properties.CONTINENT || "Other",
          APP_LABEL_LAT: Number.isFinite(labelLat) ? labelLat : 0,
          APP_LABEL_LNG: Number.isFinite(labelLng) ? labelLng : 0,
        },
      };
    });
  await writeJson(path.join(DATA_DIR, "countries.geojson"), countries);

  console.log("Writing country index");
  const countryPoints = countries.features.map((feature) => ({
    id: `country-${feature.properties.APP_ID}`,
    kind: "country",
    name: feature.properties.APP_NAME,
    country: feature.properties.APP_NAME,
    continent: feature.properties.APP_CONTINENT,
    iso: feature.properties.APP_ID,
    lat: feature.properties.APP_LABEL_LAT,
    lng: feature.properties.APP_LABEL_LNG,
  }));
  const cityPoints = CITIES.map((city) => ({
    ...city,
    continent:
      countryPoints.find((country) => country.name === city.country)?.continent ||
      (city.country === "United States" ? "North America" : "Other"),
  }));
  const trackedPoints = [...cityPoints, ...countryPoints];

  console.log("Reconstructing point tracks");
  const tracksById = new Map(
    trackedPoints.map((point) => [point.id, { ...point, path: projectedPath(point) }]),
  );
  for (const time of PAST_TIMES) {
    console.log(`  ${time} Ma`);
    const reconstructed = await reconstructPoints(trackedPoints, time);
    reconstructed.forEach((position, index) => {
      tracksById.get(trackedPoints[index].id).path[String(-time)] = position;
    });
  }
  await writeJson(path.join(DATA_DIR, "tracked-points.json"), {
    model: MODEL,
    times: [...PAST_TIMES.map((time) => -time).reverse(), 0, 25, 50, 75, 100, 150, 200, 250],
    generatedAt,
    sources: {
      naturalEarth: SOURCE_METADATA.naturalEarth,
      gplates: SOURCE_METADATA.gplates,
      localScenario: SOURCE_METADATA.localScenario,
    },
    transformations: [
      "Country tracks use Natural Earth label points",
      "Past positions are reconstructed with GPlates Web Service",
      "Future positions use local scenario vectors",
    ],
    points: [...tracksById.values()],
  });

  console.log("Downloading GPlates plate polygon snapshots");
  const plateSnapshots = new Map();
  for (const time of PLATE_SNAPSHOTS) {
    console.log(`  ${time} Ma`);
    const url = `https://gws.gplates.org/topology/plate_polygons?time=${time}&model=${MODEL}`;
    const polygons = await fetchJson(url);
    const compactPlates = {
      type: "FeatureCollection",
      features: polygons.features.map((feature) => ({
        type: "Feature",
        geometry: compactGeometry(feature.geometry, 90),
        properties: {
          reconstruction_plate_id:
            feature.properties?.reconstruction_plate_id ||
            feature.properties?.PLATEID1 ||
            feature.properties?.plate_id ||
            feature.properties?.pid ||
            null,
        },
      })),
      properties: {
        model: MODEL,
        timeMa: time,
        generatedAt,
        sources: {
          gplates: SOURCE_METADATA.gplates,
        },
        transformations: ["Compacted topology polygons for browser rendering"],
      },
    };
    plateSnapshots.set(time, compactPlates);
    await writeJson(path.join(PLATES_DIR, `${time}.geojson`), compactPlates);
  }

  console.log("Downloading reconstructed coastlines");
  for (const time of PLATE_SNAPSHOTS) {
    console.log(`  ${time} Ma`);
    const url = `https://gws.gplates.org/reconstruct/coastlines/?time=${time}&model=${MODEL}`;
    const coastlines = await fetchJson(url);
    await writeJson(path.join(COASTLINES_DIR, `${time}.geojson`), {
      type: "FeatureCollection",
      features: coastlines.features.map((feature) => ({
        type: "Feature",
        geometry: compactGeometry(feature.geometry, 120),
        properties: {
          reconstruction_plate_id:
            feature.properties?.reconstruction_plate_id ||
            feature.properties?.PLATEID1 ||
            feature.properties?.plate_id ||
            feature.properties?.pid ||
            null,
        },
      })),
      properties: {
        model: MODEL,
        timeMa: time,
        generatedAt,
        sources: {
          gplates: SOURCE_METADATA.gplates,
        },
        transformations: ["Compacted reconstructed coastlines for browser rendering"],
      },
    });
  }

  console.log("Computing plate motion arrows");
  const centroidsByTime = new Map();
  for (const [time, collection] of plateSnapshots) {
    const groups = new Map();
    for (const feature of collection.features) {
      const plateId = feature.properties.reconstruction_plate_id;
      if (plateId == null) continue;
      if (!groups.has(plateId)) groups.set(plateId, []);
      groups.get(plateId).push(feature);
    }
    const centroids = new Map();
    for (const [plateId, features] of groups) {
      const center = sphericalCentroid(features);
      if (center) centroids.set(String(plateId), center);
    }
    centroidsByTime.set(time, centroids);
  }
  const motionSnapshots = {};
  for (const time of PLATE_SNAPSHOTS) {
    const current = centroidsByTime.get(time);
    const compareTime = time === 0 ? 25 : PLATE_SNAPSHOTS[PLATE_SNAPSHOTS.indexOf(time) - 1];
    const compare = centroidsByTime.get(compareTime);
    if (!current || !compare) {
      motionSnapshots[String(time)] = [];
      continue;
    }
    const arrows = [];
    for (const [plateId, center] of current) {
      const next = compare.get(plateId);
      if (!next) continue;
      const deltaLat = time === 0 ? center.lat - next.lat : next.lat - center.lat;
      const deltaLng = time === 0 ? shortestLngDelta(next.lng, center.lng) : shortestLngDelta(center.lng, next.lng);
      const arrow = motionArrow(center, deltaLat, deltaLng);
      if (!arrow) continue;
      arrows.push({
        id: `${time}-${plateId}`,
        plateId,
        timeMa: time,
        color: "rgba(117, 224, 255, 0.78)",
        ...arrow,
      });
    }
    motionSnapshots[String(time)] = arrows
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 70);
  }
  await writeJson(path.join(DATA_DIR, "plate-motion.json"), {
    model: MODEL,
    generatedAt,
    sources: {
      gplates: SOURCE_METADATA.gplates,
    },
    transformations: [
      "Plate motion arrows are derived from GPlates plate polygon centroid changes between cached snapshots",
    ],
    snapshots: motionSnapshots,
  });

  console.log("Preparing featured-country outlines");
  const featured = countries.features
    .filter((feature) => FEATURE_COUNTRIES.includes(feature.properties.APP_NAME))
    .map((feature) => ({
      ...feature,
      properties: {
        APP_ID: feature.properties.APP_ID,
        APP_NAME: feature.properties.APP_NAME,
        APP_CONTINENT: feature.properties.APP_CONTINENT,
      },
    }));
  await writeJson(path.join(DATA_DIR, "featured-countries.geojson"), {
    type: "FeatureCollection",
    properties: {
      generatedAt,
      sources: {
        naturalEarth: SOURCE_METADATA.naturalEarth,
      },
      transformations: ["Subset of selected country outlines for Roblox lens readability"],
    },
    features: featured,
  });

  console.log("Downloading globe textures");
  for (const asset of EARTH_TEXTURES) {
    const outputFile = path.join(ASSETS_DIR, asset.file);
    try {
      await readFile(outputFile);
      console.log(`  cached ${asset.file}`);
    } catch {
      console.log(`  ${asset.file}`);
      await writeFile(outputFile, await fetchBuffer(asset.url));
    }
  }

  console.log("Done");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
