import Globe from "globe.gl";
import * as THREE from "three";
import { createIcons, icons } from "lucide";
import "./styles.css";

const publicUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const DATA = {
  countries: publicUrl("data/countries.geojson"),
  tracked: publicUrl("data/tracked-points.json"),
  motion: publicUrl("data/plate-motion.json"),
  plates: (time) => publicUrl(`data/plates/${time}.geojson`),
  coastlines: (time) => publicUrl(`data/coastlines/${time}.geojson`),
};

const ASSETS = {
  earthTexture: publicUrl("assets/earth-blue-marble.jpg"),
  earthTopology: publicUrl("assets/earth-topology.png"),
  nightSky: publicUrl("assets/night-sky.png"),
  deepOcean: publicUrl("assets/deep-ocean.svg"),
  robloxOcean: publicUrl("assets/roblox-ocean.svg"),
  robloxSky: publicUrl("assets/roblox-sky.svg"),
};

const PLATE_SNAPSHOTS = [0, 10, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250];
const PAST_TIMES = [-250, -225, -200, -175, -150, -125, -100, -75, -50, -25, -10, 0];
const KEY_TIMES = [-250, -200, -150, -100, -50, 0, 50, 100, 150, 200, 250];
const REFERENCE_TRACK_IDS = ["yerevan", "boston", "country-ARM", "country-USA", "country-IND"];
const ROBLOX_DEFAULT_CAMERA_ALTITUDE = 0.025;
const ROBLOX_MIN_CAMERA_ALTITUDE = 0.002;
const ROBLOX_SURFACE_CAMERA_THRESHOLD = 0.72;
const ROBLOX_MAX_CAMERA_ALTITUDE = 1.8;
const ROBLOX_KEY_STEP_DEGREES = 3.2;
const ROBLOX_DRAG_DEGREES_PER_PX = 0.085;
const ROBLOX_THUMB_RADIUS_PX = 58;
const ROBLOX_JOYSTICK_MOVE_PX_PER_FRAME = 7.2;
const ROBLOX_JOYSTICK_TURN_RAD_PER_FRAME = 0.03;
const ROBLOX_JOYSTICK_ZOOM_PER_FRAME = 0.018;
const ROBLOX_SURFACE_MIN_PX_PER_DEGREE = 16;
const ROBLOX_SURFACE_MAX_PX_PER_DEGREE = 126;

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

const BOUNDARY_ZONES = [
  {
    id: "mid-atlantic-ridge",
    kind: "divergent",
    name: "Mid-Atlantic Ridge",
    color: "rgba(108, 226, 255, 0.88)",
    label: { lat: 18, lng: -32 },
    points: [
      [-54, -35, 0.034],
      [-36, -22, 0.034],
      [-16, -18, 0.034],
      [4, -30, 0.034],
      [23, -43, 0.034],
      [45, -30, 0.034],
      [62, -18, 0.034],
    ],
  },
  {
    id: "himalaya",
    kind: "collision",
    name: "Himalayan collision",
    color: "rgba(255, 191, 93, 0.9)",
    label: { lat: 30, lng: 84 },
    points: [
      [27, 70, 0.036],
      [30, 78, 0.036],
      [31, 88, 0.036],
      [29, 96, 0.036],
    ],
  },
  {
    id: "andes",
    kind: "subduction",
    name: "Andes subduction",
    color: "rgba(255, 127, 96, 0.88)",
    label: { lat: -22, lng: -72 },
    points: [
      [8, -79, 0.035],
      [-8, -78, 0.035],
      [-25, -72, 0.035],
      [-44, -74, 0.035],
    ],
  },
  {
    id: "east-african-rift",
    kind: "divergent",
    name: "East African Rift",
    color: "rgba(108, 226, 255, 0.78)",
    label: { lat: 0, lng: 36 },
    points: [
      [12, 39, 0.034],
      [4, 37, 0.034],
      [-7, 35, 0.034],
      [-18, 34, 0.034],
    ],
  },
];

const state = {
  time: 0,
  lens: "tectonic",
  playing: false,
  selectedId: "yerevan",
  layers: {
    reconstructedLand: true,
    countries: true,
    plates: true,
    plateMotion: true,
    orientation: true,
    boundaries: true,
    labels: true,
    trails: true,
    referenceTracks: false,
    atmosphere: true,
    stars: true,
  },
  countries: null,
  tracked: null,
  motion: null,
  plates: new Map(),
  coastlines: new Map(),
  futureLand: new Map(),
  robloxLand: new Map(),
  plateAnchors: new Map(),
  reconstructedOutlines: new Map(),
  countryTrackIndex: new Map(),
  globe: null,
  defaultCameraFov: null,
  defaultCameraNear: null,
  defaultCameraFar: null,
  axisObject: null,
  robloxAvatar: null,
  roblox: {
    lat: null,
    lng: null,
    altitude: ROBLOX_DEFAULT_CAMERA_ALTITUDE,
    heading: { lat: 1, lng: 0 },
    followFocus: true,
    walkingUntil: 0,
    animationFrame: null,
    pointers: new Map(),
    drag: {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
      basisRight: null,
      basisUp: null,
    },
    pinch: {
      active: false,
      startDistance: 0,
      startAltitude: ROBLOX_DEFAULT_CAMERA_ALTITUDE,
    },
    controls: {
      frame: null,
      lastTime: 0,
      move: {
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        vectorX: 0,
        vectorY: 0,
      },
      look: {
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        vectorX: 0,
        vectorY: 0,
      },
    },
  },
  timer: null,
};

function qs(selector) {
  return document.querySelector(selector);
}

function fmtTime(time) {
  if (time === 0) return "Present";
  return time < 0 ? `${Math.abs(time)} Ma ago` : `+${time} Ma`;
}

function nearestPlateSnapshot(time) {
  const past = Math.max(0, Math.abs(Math.min(0, time)));
  return PLATE_SNAPSHOTS.reduce((best, next) =>
    Math.abs(next - past) < Math.abs(best - past) ? next : best,
  );
}

function normalizeLng(lng) {
  let value = lng;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function interpolateLng(a, b, u) {
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return normalizeLng(a + delta * u);
}

function shortestLngDelta(from, to) {
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampLat(lat) {
  return Math.max(-86, Math.min(86, lat));
}

function futureMotion(continent) {
  return FUTURE_MOTIONS[continent] || FUTURE_MOTIONS.default;
}

function futureCoordinate(lat, lng, continent, years) {
  const motion = futureMotion(continent);
  const driftFactor = 1 + Math.sin((years / 250) * Math.PI) * 0.18;
  return [
    normalizeLng(lng + motion.lngPerMyr * years * driftFactor),
    clampLat(lat + motion.latPerMyr * years * driftFactor),
  ];
}

function getTrackPoint(point, time) {
  if (time > 0) {
    const [lng, lat] = futureCoordinate(point.lat, point.lng, point.continent, time);
    return { lat, lng };
  }

  const path = point.path;
  if (path[String(time)]) return path[String(time)];

  const keys = Object.keys(path)
    .map(Number)
    .filter((key) => path[String(key)])
    .sort((a, b) => a - b);
  let left = keys[0];
  let right = keys[keys.length - 1];
  for (let index = 0; index < keys.length - 1; index += 1) {
    if (time >= keys[index] && time <= keys[index + 1]) {
      left = keys[index];
      right = keys[index + 1];
      break;
    }
  }
  if (time <= keys[0]) {
    left = keys[0];
    right = keys[0];
  }
  if (time >= keys[keys.length - 1]) {
    left = keys[keys.length - 1];
    right = keys[keys.length - 1];
  }

  const a = path[String(left)];
  const b = path[String(right)];
  const u = left === right ? 0 : (time - left) / (right - left);
  return {
    lat: a.lat + (b.lat - a.lat) * u,
    lng: interpolateLng(a.lng, b.lng, u),
  };
}

function trackPath(point, time) {
  if (time > 0) {
    const samples = [0, 25, 50, 75, 100, 150, 200, 250].filter((sample) => sample <= time);
    if (!samples.includes(time)) samples.push(time);
    return samples.map((sample) => {
      const [lng, lat] = sample === 0
        ? [point.lng, point.lat]
        : futureCoordinate(point.lat, point.lng, point.continent, sample);
      return [lat, lng, 0.022];
    });
  }

  const keys = Object.keys(point.path)
    .map(Number)
    .filter((key) => point.path[String(key)])
    .sort((a, b) => a - b);
  const relevant = keys.filter((key) => (time < 0 ? key >= time && key <= 0 : key >= 0 && key <= time));
  const sampled = relevant.map((key) => {
    const p = point.path[String(key)];
    return [p.lat, p.lng, 0.022];
  });
  if (!relevant.includes(time)) {
    const current = getTrackPoint(point, time);
    sampled.push([current.lat, current.lng, 0.022]);
  }
  return sampled;
}

function selectedPoint() {
  return state.tracked.points.find((point) => point.id === state.selectedId) || state.tracked.points[0];
}

function visibleWatchPoints() {
  const selected = selectedPoint();
  const ids = new Set([selected.id]);
  if (state.layers.referenceTracks) {
    REFERENCE_TRACK_IDS.forEach((id) => ids.add(id));
  }
  return state.tracked.points.filter((point) => ids.has(point.id));
}

function timelineProgress(time) {
  return ((time + 250) / 500) * 100;
}

function colorByContinent(continent, alpha = 1) {
  const colors = {
    Africa: `rgba(236, 161, 77, ${alpha})`,
    Asia: `rgba(116, 196, 118, ${alpha})`,
    Europe: `rgba(118, 169, 250, ${alpha})`,
    "North America": `rgba(240, 107, 107, ${alpha})`,
    "South America": `rgba(64, 196, 196, ${alpha})`,
    Oceania: `rgba(218, 177, 92, ${alpha})`,
    Antarctica: `rgba(224, 232, 240, ${alpha})`,
  };
  return colors[continent] || `rgba(174, 180, 191, ${alpha})`;
}

function isReconstructionView() {
  return state.layers.reconstructedLand && state.time !== 0;
}

function isRobloxLens() {
  return state.lens === "roblox";
}

function textHash(text) {
  return String(text || "").split("").reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 9973, 17);
}

function robloxLandColor(feature) {
  const baseHues = {
    Africa: 25,
    Asia: 5,
    Europe: 205,
    "North America": 356,
    "South America": 176,
    Oceania: 52,
    Antarctica: 190,
  };
  const continent = feature.properties?.APP_CONTINENT || "Other";
  const base = baseHues[continent] ?? 270;
  const hue = (base + (textHash(feature.properties?.APP_ID) % 28) - 14 + 360) % 360;
  const selected = selectedPoint();
  const isSelectedCountry = selected.kind === "country" && feature.properties?.APP_ID === selected.iso;
  return `hsla(${hue}, ${isSelectedCountry ? 88 : 76}%, ${isSelectedCountry ? 64 : 56}%, 0.9)`;
}

function plateColor(feature) {
  if (isReconstructionView()) {
    return state.lens === "tectonic" ? "rgba(65, 230, 247, 0.035)" : "rgba(65, 230, 247, 0.02)";
  }
  const id = Number(feature.properties?.reconstruction_plate_id || feature.properties?.PLATEID1 || 0);
  const hue = (id * 37) % 360;
  return `hsla(${hue}, 72%, 56%, ${state.lens === "tectonic" ? 0.14 : 0.07})`;
}

function countryCapColor(feature) {
  if (feature.appKind === "roblox-land") return robloxLandColor(feature);
  if (!state.layers.countries || state.lens === "physical") return "rgba(0,0,0,0)";
  const selected = selectedPoint();
  if (selected.kind === "country" && feature.properties.APP_ID === selected.iso) {
    return state.time === 0 ? "rgba(255, 208, 94, 0.76)" : "rgba(255, 208, 94, 0.34)";
  }
  if (state.lens === "political") return colorByContinent(feature.properties.APP_CONTINENT, 0.28);
  if (isReconstructionView()) return "rgba(0, 0, 0, 0)";
  return colorByContinent(feature.properties.APP_CONTINENT, 0.05);
}

function countryStrokeColor(feature) {
  if (feature.appKind === "roblox-land") {
    return state.layers.countries ? "rgba(22, 31, 42, 0.86)" : "rgba(22, 31, 42, 0.22)";
  }
  if (!state.layers.countries || state.lens === "physical") return "rgba(255,255,255,0)";
  const selected = selectedPoint();
  if (selected.kind === "country" && feature.properties.APP_ID === selected.iso) {
    return "rgba(255, 232, 168, 0.94)";
  }
  if (isReconstructionView()) {
    return state.lens === "political" ? "rgba(235, 244, 255, 0.24)" : "rgba(238, 246, 255, 0.06)";
  }
  return state.lens === "political" ? "rgba(220,232,255,0.42)" : "rgba(180,210,255,0.19)";
}

function reconstructedLandColor(feature) {
  if (feature.appKind === "future-land") {
    return colorByContinent(feature.properties.APP_CONTINENT, state.lens === "political" ? 0.72 : 0.66);
  }
  return state.lens === "political" ? "rgba(224, 199, 124, 0.46)" : "rgba(224, 199, 124, 0.34)";
}

function reconstructedLandStroke(feature) {
  if (feature.appKind === "future-land") return "rgba(255, 236, 176, 0.78)";
  return "rgba(255, 244, 190, 0.38)";
}

function buildPointData() {
  return visibleWatchPoints().map((point) => {
    const position = getTrackPoint(point, state.time);
    return {
      ...point,
      lat: position.lat,
      lng: position.lng,
      isSelected: point.id === selectedPoint().id,
    };
  });
}

function buildLabelData() {
  if (!state.layers.labels) return [];
  const labels = buildPointData().filter((point) => point.isSelected || state.layers.referenceTracks);
  if (state.layers.boundaries && !isRobloxLens()) {
    labels.push(
      ...BOUNDARY_ZONES.map((zone) => ({
        id: `boundary-label-${zone.id}`,
        kind: "boundary",
        name: zone.name,
        lat: zone.label.lat,
        lng: zone.label.lng,
        color: zone.color,
      })),
    );
  }
  return labels;
}

function buildPathData() {
  const paths = [];
  if (state.layers.orientation && !isRobloxLens()) {
    paths.push(...buildOrientationPaths());
  }
  if (state.layers.reconstructedLand && !isRobloxLens()) {
    paths.push(...buildReconstructedOutlinePaths());
  }
  if (state.layers.trails) {
    paths.push(
      ...visibleWatchPoints().map((point) => ({
        id: point.id,
        kind: point.id === selectedPoint().id ? "selected-track" : "reference-track",
        color: point.id === selectedPoint().id ? "rgba(255, 209, 102, 0.94)" : "rgba(137, 211, 255, 0.42)",
        points: trackPath(point, state.time),
      })),
    );
  }
  if (state.layers.plateMotion && !isRobloxLens()) {
    paths.push(...buildPlateMotionPaths());
  }
  if (state.layers.boundaries && !isRobloxLens()) {
    paths.push(
      ...BOUNDARY_ZONES.map((zone) => ({
        ...zone,
        kind: `boundary-${zone.kind}`,
      })),
    );
  }
  return paths;
}

function polygonOuterRings(geometry) {
  const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.coordinates || [];
  return polygons
    .map((polygon) => polygon?.[0] || [])
    .filter((ring) => ring.length > 3);
}

function buildReconstructedOutlinePaths() {
  if (!state.layers.reconstructedLand || state.time >= 0) return [];
  const snapshot = nearestPlateSnapshot(state.time);
  const cacheKey = `past:${snapshot}`;
  if (state.reconstructedOutlines.has(cacheKey)) return state.reconstructedOutlines.get(cacheKey);

  const coastlines = state.coastlines.get(snapshot);
  if (!coastlines) return [];

  const paths = coastlines.features
    .map((feature, featureIndex) => ({
      feature,
      featureIndex,
      area: geometryAreaHint(feature.geometry),
    }))
    .filter((entry) => entry.area > 18)
    .sort((a, b) => b.area - a.area)
    .slice(0, 420)
    .flatMap(({ feature, featureIndex }) =>
      polygonOuterRings(feature.geometry).flatMap((ring, ringIndex) => {
        const basePoints = ring.map(([lng, lat]) => [lat, normalizeLng(lng), 0.079]);
        const highlightPoints = ring.map(([lng, lat]) => [lat, normalizeLng(lng), 0.083]);
        return [
          {
            id: `reconstructed-outline-shadow-${snapshot}-${featureIndex}-${ringIndex}`,
            kind: "reconstructed-outline-shadow",
            color: "rgba(5, 17, 20, 0.68)",
            points: basePoints,
          },
          {
            id: `reconstructed-outline-${snapshot}-${featureIndex}-${ringIndex}`,
            kind: "reconstructed-outline",
            color: "rgba(255, 229, 154, 0.62)",
            points: highlightPoints,
          },
        ];
      }),
    )
    .filter((path) => path.points.length > 3);

  state.reconstructedOutlines.set(cacheKey, paths);
  return paths;
}

function buildOrientationPaths() {
  const paths = [];
  for (let lng = -180; lng < 180; lng += 30) {
    const points = [];
    for (let lat = -85; lat <= 85; lat += 5) {
      points.push([lat, lng, 0.018]);
    }
    paths.push({
      id: `longitude-${lng}`,
      kind: "orientation-grid",
      color: lng === 0 ? "rgba(255, 209, 102, 0.22)" : "rgba(218, 238, 255, 0.14)",
      points,
    });
  }
  for (const lat of [-60, -30, 0, 30, 60]) {
    const points = [];
    for (let lng = -180; lng <= 180; lng += 5) {
      points.push([lat, lng, 0.017]);
    }
    paths.push({
      id: `latitude-${lat}`,
      kind: "orientation-grid",
      color: lat === 0 ? "rgba(255, 209, 102, 0.28)" : "rgba(218, 238, 255, 0.1)",
      points,
    });
  }
  return paths;
}

function futureMotionVectors() {
  if (state.time <= 0) return [];
  const centers = {
    "North America": { lat: 47, lng: -105 },
    "South America": { lat: -18, lng: -59 },
    Europe: { lat: 51, lng: 14 },
    Africa: { lat: 3, lng: 22 },
    Asia: { lat: 45, lng: 88 },
    Oceania: { lat: -24, lng: 135 },
    Antarctica: { lat: -76, lng: 28 },
  };
  return Object.entries(centers).map(([continent, center]) => {
    const motion = futureMotion(continent);
    const years = Math.min(250, Math.max(35, state.time));
    return {
      id: `future-${continent}`,
      startLat: center.lat - motion.latPerMyr * years * 0.22,
      startLng: normalizeLng(center.lng - motion.lngPerMyr * years * 0.22),
      endLat: center.lat + motion.latPerMyr * years,
      endLng: normalizeLng(center.lng + motion.lngPerMyr * years),
      color: "rgba(255, 209, 102, 0.78)",
      magnitude: years,
    };
  });
}

function unwrapRing(ring) {
  if (!ring?.length) return [];
  const unwrapped = [[ring[0][0], ring[0][1]]];
  for (let index = 1; index < ring.length; index += 1) {
    const previous = unwrapped[index - 1][0];
    let lng = ring[index][0];
    while (lng - previous > 180) lng -= 360;
    while (lng - previous < -180) lng += 360;
    unwrapped.push([lng, ring[index][1]]);
  }
  return unwrapped;
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const xi = ring[index][0];
    const yi = ring[index][1];
    const xj = ring[previous][0];
    const yj = ring[previous][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonBounds(ring) {
  return ring.reduce(
    (bounds, [lng, lat]) => ({
      minLng: Math.min(bounds.minLng, lng),
      maxLng: Math.max(bounds.maxLng, lng),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat),
    }),
    { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity },
  );
}

function samplePolygonAnchors(polygon, targetCount) {
  const outer = unwrapRing(polygon[0]);
  if (outer.length < 4) return [];
  const holes = polygon.slice(1).map(unwrapRing);
  const bounds = polygonBounds(outer);
  const width = bounds.maxLng - bounds.minLng;
  const height = bounds.maxLat - bounds.minLat;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];

  const aspect = Math.max(0.35, Math.min(2.8, width / Math.max(height, 1)));
  const cols = Math.max(2, Math.ceil(Math.sqrt(targetCount * aspect)));
  const rows = Math.max(2, Math.ceil(targetCount / cols) + 1);
  const anchors = [];

  for (let row = 0; row < rows; row += 1) {
    const lat = bounds.minLat + ((row + 0.5) / rows) * height;
    for (let col = 0; col < cols; col += 1) {
      const lng = bounds.minLng + ((col + 0.5) / cols) * width;
      if (!pointInRing([lng, lat], outer)) continue;
      if (holes.some((hole) => pointInRing([lng, lat], hole))) continue;
      anchors.push({ lat, lng: normalizeLng(lng) });
    }
  }

  if (!anchors.length) {
    const lat = bounds.minLat + height / 2;
    const lng = bounds.minLng + width / 2;
    if (pointInRing([lng, lat], outer)) anchors.push({ lat, lng: normalizeLng(lng) });
  }
  return anchors;
}

function geometryAreaHint(geometry) {
  if (!geometry) return 0;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates || [];
  return polygons.reduce((sum, polygon) => {
    const outer = unwrapRing(polygon[0]);
    if (outer.length < 4) return sum;
    const bounds = polygonBounds(outer);
    return sum + Math.max(0, bounds.maxLng - bounds.minLng) * Math.max(0, bounds.maxLat - bounds.minLat);
  }, 0);
}

function plateFeaturesForVector(snapshot, vector) {
  const plates = state.plates.get(snapshot);
  if (!plates) return [];
  return plates.features.filter((feature) => String(feature.properties?.reconstruction_plate_id) === String(vector.plateId));
}

function anchorsForPlateVector(snapshot, vector) {
  const cacheKey = `${snapshot}:${vector.plateId}`;
  if (state.plateAnchors.has(cacheKey)) return state.plateAnchors.get(cacheKey);
  const features = plateFeaturesForVector(snapshot, vector);
  const ranked = features
    .map((feature) => ({ feature, area: geometryAreaHint(feature.geometry) }))
    .filter((entry) => entry.area > 0)
    .sort((a, b) => b.area - a.area);

  const anchors = [];
  const maxPerPlate = Math.max(9, Math.min(28, Math.ceil((vector.magnitude || 4) / 1.75) + 8));
  for (const { feature, area } of ranked.slice(0, 4)) {
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates || [];
    const target = Math.max(7, Math.min(32, Math.ceil(Math.sqrt(area) / 3.5)));
    for (const polygon of polygons) {
      anchors.push(...samplePolygonAnchors(polygon, target));
      if (anchors.length >= maxPerPlate) break;
    }
    if (anchors.length >= maxPerPlate) break;
  }

  const result = anchors.slice(0, maxPerPlate);
  state.plateAnchors.set(cacheKey, result);
  return result;
}

function futureAnchorsForVector(vector) {
  const continent = vector.id.replace("future-", "");
  return state.countries.features
    .filter((feature) => feature.properties.APP_CONTINENT === continent)
    .sort((a, b) => a.properties.APP_NAME.localeCompare(b.properties.APP_NAME))
    .filter((_, index) => index % 8 === 0)
    .slice(0, 8)
    .map((feature) => {
      const [lng, lat] = futureCoordinate(
        feature.properties.APP_LABEL_LAT,
        feature.properties.APP_LABEL_LNG,
        continent,
        state.time,
      );
      return { lat, lng };
    });
}

function arrowGlyphPaths(vector, anchor, index, color, glowColor) {
  const deltaLat = vector.endLat - vector.startLat;
  const deltaLng = shortestLngDelta(vector.startLng, vector.endLng);
  const magnitude = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
  if (!Number.isFinite(magnitude) || magnitude < 0.01) return [];
  const lineLength = Math.min(18, Math.max(5.4, magnitude * 0.62));
  const unitLat = deltaLat / magnitude;
  const unitLng = deltaLng / magnitude;
  const perpLat = -unitLng;
  const perpLng = unitLat;
  const startLat = clampLat(anchor.lat - unitLat * lineLength * 0.5);
  const startLng = normalizeLng(anchor.lng - unitLng * lineLength * 0.5);
  const endLat = clampLat(anchor.lat + unitLat * lineLength * 0.5);
  const endLng = normalizeLng(anchor.lng + unitLng * lineLength * 0.5);
  const shaft = [];
  for (let step = 0; step <= 10; step += 1) {
    const u = step / 10;
    shaft.push([
      startLat + (endLat - startLat) * u,
      interpolateLng(startLng, endLng, u),
      0.082,
    ]);
  }

  const headLength = Math.min(3.6, Math.max(1.7, lineLength * 0.28));
  const headWidth = headLength * 0.62;
  const baseLat = clampLat(endLat - unitLat * headLength);
  const baseLng = normalizeLng(endLng - unitLng * headLength);
  const left = [
    [endLat, endLng, 0.084],
    [clampLat(baseLat + perpLat * headWidth), normalizeLng(baseLng + perpLng * headWidth), 0.084],
  ];
  const right = [
    [endLat, endLng, 0.084],
    [clampLat(baseLat - perpLat * headWidth), normalizeLng(baseLng - perpLng * headWidth), 0.084],
  ];

  return [
    {
      id: `motion-glow-${vector.id}-${index}`,
      kind: "plate-motion-glow",
      speedMagnitude: magnitude,
      color: glowColor,
      points: shaft,
    },
    {
      id: `motion-shaft-${vector.id}-${index}`,
      kind: "plate-motion-shaft",
      speedMagnitude: magnitude,
      color,
      points: shaft,
    },
    {
      id: `motion-head-left-${vector.id}-${index}`,
      kind: "plate-motion-head",
      speedMagnitude: magnitude,
      color: "rgba(8, 10, 12, 0.9)",
      points: left,
    },
    {
      id: `motion-head-right-${vector.id}-${index}`,
      kind: "plate-motion-head",
      speedMagnitude: magnitude,
      color: "rgba(8, 10, 12, 0.9)",
      points: right,
    },
  ];
}

function buildPlateMotionPaths() {
  if (!state.layers.plateMotion) return [];
  const snapshot = nearestPlateSnapshot(state.time);
  const vectors =
    state.time > 0
      ? futureMotionVectors()
      : (state.motion?.snapshots?.[String(snapshot)] || []);
  return vectors
    .slice(0, state.time > 0 ? 12 : 48)
    .flatMap((vector) =>
      (state.time > 0 ? futureAnchorsForVector(vector) : anchorsForPlateVector(snapshot, vector))
        .flatMap((anchor, index) => {
          const isFuture = state.time > 0;
          return arrowGlyphPaths(
            vector,
            anchor,
            index,
            "rgba(8, 10, 12, 0.88)",
            isFuture ? "rgba(255, 209, 102, 0.36)" : "rgba(97, 230, 255, 0.32)",
          );
        }),
    )
    .filter((path) => path.points.length > 1);
}

function buildArcData() {
  return [];
}

function createAxisObject() {
  if (!state.globe || state.axisObject) return;
  const scene = state.globe.scene();
  const group = new THREE.Group();
  const axisMaterial = new THREE.LineBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.68,
    depthTest: true,
  });

  const poleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.72,
    depthTest: true,
  });
  const poleGeometry = new THREE.SphereGeometry(1.55, 12, 8);
  for (const lat of [90, -90]) {
    const inner = typeof state.globe.getCoords === "function"
      ? state.globe.getCoords(lat, 0, 0.04)
      : { x: 0, y: lat > 0 ? 104 : -104, z: 0 };
    const outer = typeof state.globe.getCoords === "function"
      ? state.globe.getCoords(lat, 0, 0.42)
      : { x: 0, y: lat > 0 ? 142 : -142, z: 0 };
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(inner.x, inner.y, inner.z),
      new THREE.Vector3(outer.x, outer.y, outer.z),
    ]);
    const axisLine = new THREE.Line(axisGeometry, axisMaterial);
    axisLine.renderOrder = 9;
    group.add(axisLine);

    const marker = new THREE.Mesh(poleGeometry, poleMaterial);
    marker.position.set(outer.x, outer.y, outer.z);
    marker.renderOrder = 10;
    group.add(marker);
  }

  group.visible = state.layers.orientation;
  state.axisObject = group;
  scene.add(group);
}

function updateAxisObject() {
  if (state.axisObject) state.axisObject.visible = state.layers.orientation;
}

function createRobloxAvatarObject() {
  if (!state.globe || state.robloxAvatar) return;
  const group = new THREE.Group();
  const torsoMaterial = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.72, metalness: 0.05 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.68, metalness: 0.02 });
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8, metalness: 0.04 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7, metalness: 0.05 });
  const faceMaterial = new THREE.MeshBasicMaterial({ color: 0x172033 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.5, 1.15), torsoMaterial);
  torso.position.y = 2.2;
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.45, 1.45), headMaterial);
  head.position.y = 4.35;
  const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.06), faceMaterial);
  leftEye.position.set(-0.28, 4.56, 0.76);
  const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.06), faceMaterial);
  rightEye.position.set(0.28, 4.56, 0.76);
  const smile = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.06), faceMaterial);
  smile.position.set(0, 4.18, 0.76);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.95, 0.68), headMaterial);
  leftArm.position.set(-1.42, 2.34, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.95, 0.68), headMaterial);
  rightArm.position.set(1.42, 2.34, 0);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.45, 0.82), legMaterial);
  leftLeg.position.set(-0.48, 0.72, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.45, 0.82), legMaterial);
  rightLeg.position.set(0.48, 0.72, 0);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.5, 0.28), accentMaterial);
  flag.position.set(1.35, 3.4, 0);
  const flagTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.68, 0.18), accentMaterial);
  flagTop.position.set(1.88, 4.05, 0);
  group.add(leftLeg, rightLeg, torso, head, leftEye, rightEye, smile, leftArm, rightArm, flag, flagTop);
  group.userData = {
    baseScale: 1,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
  };
  group.visible = false;
  state.robloxAvatar = group;
  state.globe.scene().add(group);
}

function robloxFocusPosition() {
  return getTrackPoint(selectedPoint(), state.time);
}

function activeRobloxPosition() {
  if (state.roblox.followFocus || state.roblox.lat == null || state.roblox.lng == null) {
    const position = robloxFocusPosition();
    state.roblox.lat = position.lat;
    state.roblox.lng = position.lng;
  }
  return { lat: state.roblox.lat, lng: state.roblox.lng };
}

function updateRobloxHud() {
  const hud = qs("#robloxHud");
  if (!hud) return;
  hud.hidden = !isRobloxLens();
  const position = activeRobloxPosition();
  const readout = qs("#robloxPosition");
  if (readout) readout.textContent = `${position.lat.toFixed(1)} lat, ${position.lng.toFixed(1)} lng`;
}

function robloxCoords(lat, lng, altitude = 0.11) {
  return typeof state.globe.getCoords === "function"
    ? state.globe.getCoords(lat, lng, altitude)
    : { x: 0, y: 100 * (1 + altitude), z: 0 };
}

function robloxForwardVector(position, normal, origin) {
  const heading = state.roblox.heading || { lat: 1, lng: 0 };
  const latFactor = Math.max(0.28, Math.cos((position.lat * Math.PI) / 180));
  const magnitude = Math.hypot(heading.lat || 0, (heading.lng || 0) * latFactor) || 1;
  const ahead = robloxCoords(
    clampLat(position.lat + ((heading.lat || 0) / magnitude) * 1.8),
    normalizeLng(position.lng + ((heading.lng || 0) / magnitude) * 1.8),
    0.11,
  );
  const forward = new THREE.Vector3(ahead.x - origin.x, ahead.y - origin.y, ahead.z - origin.z);
  forward.addScaledVector(normal, -forward.dot(normal));
  if (forward.lengthSq() < 0.000001) {
    forward.crossVectors(new THREE.Vector3(0, 1, 0), normal);
  }
  if (forward.lengthSq() < 0.000001) {
    forward.crossVectors(new THREE.Vector3(1, 0, 0), normal);
  }
  return forward.normalize();
}

function projectRobloxTangent(vector, normal) {
  if (!vector) return null;
  const tangent = vector.clone().addScaledVector(normal, -vector.dot(normal));
  return tangent.lengthSq() > 0.000001 ? tangent.normalize() : null;
}

function robloxSurfaceZoomProgress() {
  const min = Math.log(ROBLOX_MIN_CAMERA_ALTITUDE);
  const max = Math.log(ROBLOX_MAX_CAMERA_ALTITUDE);
  return clamp((Math.log(state.roblox.altitude) - min) / (max - min), 0, 1);
}

function robloxSurfacePixelsPerDegree() {
  const zoomProgress = Math.pow(robloxSurfaceZoomProgress(), 0.58);
  return THREE.MathUtils.lerp(ROBLOX_SURFACE_MAX_PX_PER_DEGREE, ROBLOX_SURFACE_MIN_PX_PER_DEGREE, zoomProgress);
}

function robloxSurfaceHeadingBasis(position) {
  const heading = state.roblox.heading || { lat: 1, lng: 0 };
  const latFactor = Math.max(0.28, Math.cos((position.lat * Math.PI) / 180));
  const east = (heading.lng || 0) * latFactor;
  const north = heading.lat || 0;
  const magnitude = Math.hypot(east, north) || 1;
  const forward = { x: east / magnitude, y: north / magnitude };
  return {
    forward,
    right: { x: forward.y, y: -forward.x },
  };
}

function robloxSurfaceProjection(width, height, position) {
  const basis = robloxSurfaceHeadingBasis(position);
  const scale = robloxSurfacePixelsPerDegree();
  const origin = {
    x: width * 0.5,
    y: height * 0.58,
  };
  const latScale = Math.max(0.28, Math.cos((position.lat * Math.PI) / 180));

  return (lat, lng, lift = 0) => {
    const east = shortestLngDelta(position.lng, lng) * latScale;
    const north = lat - position.lat;
    const right = east * basis.right.x + north * basis.right.y;
    const forward = east * basis.forward.x + north * basis.forward.y;
    const distanceAhead = Math.max(0, forward + 1.2);
    const perspective = clamp(1 / (1 + distanceAhead * 0.055), 0.36, 1.18);
    return {
      x: origin.x + right * scale * perspective,
      y: origin.y - forward * scale * perspective - lift * scale,
      forward,
      perspective,
    };
  };
}

function robloxSurfaceFeatures() {
  if (!state.countries) return [];
  if (state.layers.reconstructedLand) return buildRobloxLand();
  if (!state.layers.countries) return [];
  return state.countries.features.map((feature) => ({
    ...feature,
    appKind: "roblox-land",
  }));
}

function robloxSurfacePath(geometry, project, width, height) {
  const polygons =
    geometry?.type === "Polygon"
      ? [geometry.coordinates]
      : geometry?.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
  if (!polygons.length) return null;

  const path = new Path2D();
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  let hasPoints = false;

  for (const polygon of polygons) {
    for (const ring of polygon) {
      if (!ring?.length) continue;
      let ringStarted = false;
      for (const [lng, lat] of ring) {
        const point = project(lat, lng);
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        if (!ringStarted) {
          path.moveTo(point.x, point.y);
          ringStarted = true;
          hasPoints = true;
        } else {
          path.lineTo(point.x, point.y);
        }
        bounds.minX = Math.min(bounds.minX, point.x);
        bounds.maxX = Math.max(bounds.maxX, point.x);
        bounds.minY = Math.min(bounds.minY, point.y);
        bounds.maxY = Math.max(bounds.maxY, point.y);
      }
      if (ringStarted) path.closePath();
    }
  }

  if (!hasPoints) return null;
  const margin = Math.max(width, height) * 0.4;
  if (bounds.maxX < -margin || bounds.minX > width + margin || bounds.maxY < -margin || bounds.minY > height + margin) {
    return null;
  }
  return path;
}

function drawRobloxSurfaceBackground(ctx, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.42);
  sky.addColorStop(0, "#b9e8f4");
  sky.addColorStop(0.58, "#7ec5e4");
  sky.addColorStop(1, "#4aa3dc");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const water = ctx.createLinearGradient(0, height * 0.22, 0, height);
  water.addColorStop(0, "#3da6e6");
  water.addColorStop(0.55, "#1e86dd");
  water.addColorStop(1, "#0b5cae");
  ctx.fillStyle = water;
  ctx.fillRect(0, height * 0.22, width, height * 0.78);

  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(0, height * 0.22, width, 2);
}

function drawRobloxSurfaceGrid(ctx, width, height, project, position) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(210, 243, 255, 0.18)";
  const latStart = Math.floor((position.lat - 36) / 5) * 5;
  const latEnd = Math.ceil((position.lat + 44) / 5) * 5;
  const lngStart = Math.floor((position.lng - 70) / 5) * 5;
  const lngEnd = Math.ceil((position.lng + 70) / 5) * 5;

  for (let lat = latStart; lat <= latEnd; lat += 5) {
    ctx.beginPath();
    let started = false;
    for (let lng = lngStart; lng <= lngEnd; lng += 1.5) {
      const point = project(lat, normalizeLng(lng));
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.stroke();
  }

  for (let lng = lngStart; lng <= lngEnd; lng += 5) {
    ctx.beginPath();
    let started = false;
    for (let lat = latStart; lat <= latEnd; lat += 1.5) {
      const point = project(clampLat(lat), normalizeLng(lng));
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawRobloxSurfaceLand(ctx, width, height, project) {
  const features = robloxSurfaceFeatures();
  const shadowOffset = Math.max(8, Math.min(22, robloxSurfacePixelsPerDegree() * 0.18));
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const feature of features) {
    const path = robloxSurfacePath(feature.geometry, project, width, height);
    if (!path) continue;

    ctx.save();
    ctx.translate(0, shadowOffset);
    ctx.fillStyle = "rgba(17, 29, 43, 0.74)";
    ctx.fill(path, "evenodd");
    ctx.restore();

    ctx.fillStyle = robloxLandColor(feature);
    ctx.fill(path, "evenodd");
    ctx.lineWidth = state.layers.countries ? 1.2 : 0.45;
    ctx.strokeStyle = state.layers.countries ? "rgba(24, 34, 48, 0.72)" : "rgba(24, 34, 48, 0.22)";
    ctx.stroke(path);
  }
  ctx.restore();
}

function drawRobloxSurfaceAvatar(ctx, width, height) {
  const walking = isRobloxLens() && window.performance.now() < state.roblox.walkingUntil;
  const phase = window.performance.now() / 95;
  const swing = walking ? Math.sin(phase) : 0;
  const scale = Math.max(0.82, Math.min(1.34, height / 700));
  const size = Math.max(58, Math.min(96, height * 0.105)) * scale;
  const x = width * 0.5;
  const y = height * 0.58;

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(6, 12, 18, 0.28)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.52, size * 0.45, size * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  const legSwing = swing * size * 0.08;
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(-size * 0.22, size * 0.1 + legSwing, size * 0.16, size * 0.42);
  ctx.fillRect(size * 0.06, size * 0.1 - legSwing, size * 0.16, size * 0.42);

  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(-size * 0.29, -size * 0.23, size * 0.58, size * 0.42);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(-size * 0.18, -size * 0.62, size * 0.36, size * 0.34);
  ctx.fillRect(-size * 0.43, -size * 0.2 - legSwing * 0.5, size * 0.14, size * 0.36);
  ctx.fillRect(size * 0.29, -size * 0.2 + legSwing * 0.5, size * 0.14, size * 0.36);

  ctx.fillStyle = "#172033";
  ctx.fillRect(-size * 0.08, -size * 0.46, size * 0.05, size * 0.04);
  ctx.fillRect(size * 0.04, -size * 0.46, size * 0.05, size * 0.04);
  ctx.fillRect(-size * 0.1, -size * 0.36, size * 0.2, size * 0.03);

  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = Math.max(3, size * 0.035);
  ctx.beginPath();
  ctx.moveTo(size * 0.34, -size * 0.38);
  ctx.lineTo(size * 0.34, -size * 0.82);
  ctx.stroke();
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(size * 0.36, -size * 0.82, size * 0.28, size * 0.17);
  ctx.restore();
}

function drawRobloxSurfaceLabels(ctx, width, height) {
  if (!state.layers.labels) return;
  const selected = selectedPoint();
  ctx.save();
  ctx.font = "700 15px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(6, 12, 18, 0.78)";
  ctx.fillStyle = "rgba(255, 239, 187, 0.95)";
  const x = width * 0.5;
  const y = height * 0.58 - Math.max(66, Math.min(104, height * 0.12));
  ctx.strokeText(selected.name, x, y);
  ctx.fillText(selected.name, x, y);
  ctx.restore();
}

function renderRobloxSurface() {
  const canvas = qs("#robloxSurface");
  if (!canvas || !isRobloxLens() || !state.countries) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const targetWidth = Math.round(rect.width * dpr);
  const targetHeight = Math.round(rect.height * dpr);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const width = rect.width;
  const height = rect.height;
  const position = activeRobloxPosition();
  const project = robloxSurfaceProjection(width, height, position);

  drawRobloxSurfaceBackground(ctx, width, height);
  drawRobloxSurfaceGrid(ctx, width, height, project, position);
  drawRobloxSurfaceLand(ctx, width, height, project);
  drawRobloxSurfaceLabels(ctx, width, height);
  drawRobloxSurfaceAvatar(ctx, width, height);
}

function fallbackRobloxMovementBasis(position, normal, origin) {
  const northCoords = robloxCoords(clampLat(position.lat + 1), position.lng, 0);
  const eastCoords = robloxCoords(position.lat, normalizeLng(position.lng + 1), 0);
  let up = projectRobloxTangent(
    new THREE.Vector3(northCoords.x - origin.x, northCoords.y - origin.y, northCoords.z - origin.z),
    normal,
  );
  let right = projectRobloxTangent(
    new THREE.Vector3(eastCoords.x - origin.x, eastCoords.y - origin.y, eastCoords.z - origin.z),
    normal,
  );
  if (!right) right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal).normalize();
  if (!up) up = new THREE.Vector3().crossVectors(right, normal).normalize();
  return { right, up };
}

function robloxScreenMovementBasis(position) {
  const originCoords = robloxCoords(position.lat, position.lng, 0);
  const origin = new THREE.Vector3(originCoords.x, originCoords.y, originCoords.z);
  const normal = origin.clone().normalize();
  const fallback = fallbackRobloxMovementBasis(position, normal, origin);
  const camera = state.globe?.camera?.();
  if (!camera) return fallback;

  camera.updateMatrixWorld?.();
  const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  return {
    right: projectRobloxTangent(cameraRight, normal) || fallback.right,
    up: projectRobloxTangent(cameraUp, normal) || fallback.up,
  };
}

function moveRobloxAvatarByScreenDelta(dx, dy, basisRight, basisUp, duration = 0) {
  const position = activeRobloxPosition();
  const surfaceBase = robloxCoords(position.lat, position.lng, 0);
  const normal = new THREE.Vector3(surfaceBase.x, surfaceBase.y, surfaceBase.z).normalize();
  const fallback = robloxScreenMovementBasis(position);
  const right = projectRobloxTangent(basisRight, normal) || fallback.right;
  const up = projectRobloxTangent(basisUp, normal) || fallback.up;
  const direction = new THREE.Vector3()
    .addScaledVector(right, dx)
    .addScaledVector(up, -dy);
  moveRobloxAvatarAlongTangent(direction, direction.length(), duration);
}

function moveRobloxAvatarAlongTangent(direction, pixels, duration = 0, options = {}) {
  const position = activeRobloxPosition();
  const surfaceBase = robloxCoords(position.lat, position.lng, 0);
  const normal = new THREE.Vector3(surfaceBase.x, surfaceBase.y, surfaceBase.z).normalize();
  const radius = new THREE.Vector3(surfaceBase.x, surfaceBase.y, surfaceBase.z).length() || 100;
  const tangent = projectRobloxTangent(direction, normal);
  if (!tangent || pixels < 0.5) return;

  const surfaceBlend = robloxSurfaceModeBlend();
  const angleLimit = THREE.MathUtils.lerp(0.12, 0.035, surfaceBlend);
  const angle = Math.min(angleLimit, pixels * ROBLOX_DRAG_DEGREES_PER_PX * robloxMovementScale() * (Math.PI / 180));
  const nextNormal = normal
    .clone()
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(tangent, Math.sin(angle))
    .normalize();
  const nextPoint = nextNormal.multiplyScalar(radius);
  const nextGeo = typeof state.globe.toGeoCoords === "function"
    ? state.globe.toGeoCoords(nextPoint)
    : null;
  if (nextGeo) {
    setRobloxAvatarPosition(nextGeo.lat, nextGeo.lng, duration, options);
  }
}

function moveRobloxAvatarByThumbInput(vectorX, vectorY, frameScale) {
  const amount = Math.hypot(vectorX, vectorY);
  if (amount < 0.04) return;
  const position = activeRobloxPosition();
  const surface = robloxCoords(position.lat, position.lng, 0.11);
  const normal = new THREE.Vector3(surface.x, surface.y, surface.z).normalize();
  const forward = robloxForwardVector(position, normal, surface);
  const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
  const direction = new THREE.Vector3()
    .addScaledVector(right, vectorX)
    .addScaledVector(forward, -vectorY);
  moveRobloxAvatarAlongTangent(
    direction,
    amount * ROBLOX_JOYSTICK_MOVE_PX_PER_FRAME * frameScale,
    0,
    { preserveHeading: true },
  );
}

function setRobloxHeadingFromForward(position, forward, duration = 0) {
  const surfaceBase = robloxCoords(position.lat, position.lng, 0);
  const normal = new THREE.Vector3(surfaceBase.x, surfaceBase.y, surfaceBase.z).normalize();
  const radius = new THREE.Vector3(surfaceBase.x, surfaceBase.y, surfaceBase.z).length() || 100;
  const tangentForward = projectRobloxTangent(forward, normal);
  if (!tangentForward) return;
  const aheadAngle = 2 * (Math.PI / 180);
  const nextNormal = normal
    .clone()
    .multiplyScalar(Math.cos(aheadAngle))
    .addScaledVector(tangentForward, Math.sin(aheadAngle))
    .normalize();
  const nextGeo = typeof state.globe.toGeoCoords === "function"
    ? state.globe.toGeoCoords(nextNormal.multiplyScalar(radius))
    : null;
  if (!nextGeo) return;
  state.roblox.heading = {
    lat: nextGeo.lat - position.lat,
    lng: shortestLngDelta(position.lng, nextGeo.lng),
  };
  updateRobloxAvatarObject();
  pointRobloxCameraAtAvatar(duration);
}

function rotateRobloxHeading(radians, duration = 0) {
  if (!isRobloxLens() || Math.abs(radians) < 0.0001) return;
  const position = activeRobloxPosition();
  const surface = robloxCoords(position.lat, position.lng, 0.11);
  const normal = new THREE.Vector3(surface.x, surface.y, surface.z).normalize();
  const forward = robloxForwardVector(position, normal, surface).applyAxisAngle(normal, -radians);
  setRobloxHeadingFromForward(position, forward, duration);
}

function updateRobloxAvatarObject() {
  if (!state.robloxAvatar) return;
  state.robloxAvatar.visible = isRobloxLens();
  if (!isRobloxLens()) return;

  const position = activeRobloxPosition();
  const coords = robloxCoords(position.lat, position.lng, 0.11);
  state.robloxAvatar.position.set(coords.x, coords.y, coords.z);
  const normal = new THREE.Vector3(coords.x, coords.y, coords.z).normalize();
  const forward = robloxForwardVector(position, normal, coords);
  const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
  const correctedForward = new THREE.Vector3().crossVectors(right, normal).normalize();
  const orientation = new THREE.Matrix4().makeBasis(right, normal, correctedForward);
  state.robloxAvatar.quaternion.setFromRotationMatrix(orientation);
}

function markRobloxAvatarWalking(duration = 280) {
  if (!isRobloxLens()) return;
  state.roblox.walkingUntil = Math.max(state.roblox.walkingUntil, window.performance.now() + duration);
}

function updateRobloxAvatarAnimation() {
  const walking = isRobloxLens() && window.performance.now() < state.roblox.walkingUntil;
  if (state.robloxAvatar) {
    const parts = state.robloxAvatar.userData;
    const phase = window.performance.now() / 95;
    const swing = walking ? Math.sin(phase) * 0.62 : 0;
    const bob = walking ? Math.abs(Math.sin(phase)) * 0.045 : 0;
    const avatarScale = isRobloxLens()
      ? THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.15, 1.85, robloxCameraBlend()), 3.25, robloxSurfaceModeBlend())
      : 1;
    if (parts.leftLeg) parts.leftLeg.rotation.x = swing;
    if (parts.rightLeg) parts.rightLeg.rotation.x = -swing;
    if (parts.leftArm) parts.leftArm.rotation.x = -swing * 0.72;
    if (parts.rightArm) parts.rightArm.rotation.x = swing * 0.72;
    state.robloxAvatar.scale.setScalar(avatarScale + bob);
  }
  if (isRobloxLens() && (walking || robloxThumbControlsActive())) renderRobloxSurface();
  state.roblox.animationFrame = window.requestAnimationFrame(updateRobloxAvatarAnimation);
}

function startRobloxAvatarAnimation() {
  if (state.roblox.animationFrame) return;
  state.roblox.animationFrame = window.requestAnimationFrame(updateRobloxAvatarAnimation);
}

function robloxCameraBlend() {
  const rawChaseBlend = clamp(
    (ROBLOX_MAX_CAMERA_ALTITUDE - state.roblox.altitude) / (ROBLOX_MAX_CAMERA_ALTITUDE - ROBLOX_MIN_CAMERA_ALTITUDE),
    0,
    1,
  );
  return rawChaseBlend * rawChaseBlend * (3 - 2 * rawChaseBlend);
}

function robloxSurfaceModeBlend() {
  const rawSurfaceBlend = clamp(
    (ROBLOX_SURFACE_CAMERA_THRESHOLD - state.roblox.altitude) / (ROBLOX_SURFACE_CAMERA_THRESHOLD - ROBLOX_MIN_CAMERA_ALTITUDE),
    0,
    1,
  );
  return rawSurfaceBlend * rawSurfaceBlend * (3 - 2 * rawSurfaceBlend);
}

function robloxMovementScale() {
  const closeMovementScale = THREE.MathUtils.lerp(0.72, 0.22, robloxCameraBlend());
  return THREE.MathUtils.lerp(closeMovementScale, 0.1, robloxSurfaceModeBlend());
}

function pointRobloxCameraAtAvatar(duration = 240) {
  if (!state.globe || !isRobloxLens()) return;
  const position = activeRobloxPosition();
  const chaseBlend = robloxCameraBlend();
  const surfaceBlend = robloxSurfaceModeBlend();
  const surfaceBase = robloxCoords(position.lat, position.lng, 0);
  const surface = robloxCoords(position.lat, position.lng, 0.11);
  const normal = new THREE.Vector3(surface.x, surface.y, surface.z).normalize();
  const forward = robloxForwardVector(position, normal, surface);
  const surfacePoint = new THREE.Vector3(surface.x, surface.y, surface.z);
  const globeRadius = new THREE.Vector3(surfaceBase.x, surfaceBase.y, surfaceBase.z).length() || 100;
  const overheadHeight = globeRadius * (0.38 + state.roblox.altitude * 0.72);
  const chaseHeightRatio = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(0.24, 0.17, chaseBlend),
    0.012,
    surfaceBlend,
  );
  const behindDistanceRatio = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(0.04, 0.12, chaseBlend),
    0.032,
    surfaceBlend,
  );
  const lookAheadRatio = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(0.004, 0.006, chaseBlend),
    -0.05,
    surfaceBlend,
  );
  const lookHeightRatio = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(0.026, 0.075, chaseBlend),
    -0.055,
    surfaceBlend,
  );
  const chaseHeight = globeRadius * chaseHeightRatio;
  const behindDistance = globeRadius * behindDistanceRatio;
  const lookAheadDistance = globeRadius * lookAheadRatio;
  const lookHeight = globeRadius * lookHeightRatio;
  const radialCamera = surfacePoint.clone().addScaledVector(normal, overheadHeight);
  const chaseCamera = surfacePoint
    .clone()
    .addScaledVector(forward, -behindDistance)
    .addScaledVector(normal, chaseHeight);
  const lookAt = surfacePoint
    .clone()
    .addScaledVector(forward, lookAheadDistance)
    .addScaledVector(normal, lookHeight);
  const cameraPosition = radialCamera.clone().lerp(chaseCamera, chaseBlend);

  const camera = state.globe.camera?.();
  if (!camera) return;
  const chaseFov = THREE.MathUtils.lerp(state.defaultCameraFov || 50, 46, chaseBlend);
  camera.fov = THREE.MathUtils.lerp(chaseFov, 28, surfaceBlend);
  if (state.defaultCameraNear != null) {
    camera.near = THREE.MathUtils.lerp(state.defaultCameraNear, 0.02, surfaceBlend);
  }
  if (state.defaultCameraFar != null) {
    camera.far = THREE.MathUtils.lerp(state.defaultCameraFar, globeRadius * 5.5, surfaceBlend);
  }
  camera.position.copy(cameraPosition);
  camera.up.copy(normal);
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix?.();
  const controls = state.globe.controls?.();
  if (controls?.target) {
    controls.target.copy(lookAt);
    controls.update?.();
  }
}

function setRobloxCameraAltitude(altitude, duration = 120) {
  if (!isRobloxLens()) return;
  state.roblox.altitude = clamp(altitude, ROBLOX_MIN_CAMERA_ALTITUDE, ROBLOX_MAX_CAMERA_ALTITUDE);
  pointRobloxCameraAtAvatar(duration);
  renderRobloxSurface();
}

function setRobloxAvatarPosition(lat, lng, duration = 240, options = {}) {
  if (!isRobloxLens()) return;
  const previous = activeRobloxPosition();
  const nextLat = clampLat(lat);
  const nextLng = normalizeLng(lng);
  const deltaLat = nextLat - previous.lat;
  const deltaLng = shortestLngDelta(previous.lng, nextLng);
  state.roblox.lat = nextLat;
  state.roblox.lng = nextLng;
  state.roblox.followFocus = false;
  if (Math.abs(deltaLat) + Math.abs(deltaLng) > 0.02) {
    if (!options.preserveHeading) {
      state.roblox.heading = { lat: deltaLat, lng: deltaLng };
    }
    markRobloxAvatarWalking(duration + 120);
  }
  updateRobloxAvatarObject();
  updateRobloxHud();
  pointRobloxCameraAtAvatar(duration);
  renderRobloxSurface();
}

function resetRobloxAvatarToFocus() {
  const position = robloxFocusPosition();
  state.roblox.lat = position.lat;
  state.roblox.lng = position.lng;
  state.roblox.followFocus = true;
  updateRobloxAvatarObject();
  updateRobloxHud();
  pointRobloxCameraAtAvatar(520);
  renderRobloxSurface();
}

function moveRobloxAvatar(direction) {
  if (!isRobloxLens()) return;
  const position = activeRobloxPosition();
  const step = ROBLOX_KEY_STEP_DEGREES * THREE.MathUtils.lerp(1, 0.38, robloxSurfaceModeBlend());
  const next = { ...position };
  if (direction === "north") next.lat += step;
  if (direction === "south") next.lat -= step;
  if (direction === "east") next.lng += step;
  if (direction === "west") next.lng -= step;
  setRobloxAvatarPosition(next.lat, next.lng, 260);
}

function resetRobloxGestureState() {
  state.roblox.pointers.clear();
  state.roblox.drag = {
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    basisRight: null,
    basisUp: null,
  };
  state.roblox.pinch = {
    active: false,
    startDistance: 0,
    startAltitude: state.roblox.altitude,
  };
  resetRobloxThumbControl("move");
  resetRobloxThumbControl("look");
  if (state.roblox.controls.frame) {
    window.cancelAnimationFrame(state.roblox.controls.frame);
    state.roblox.controls.frame = null;
  }
  state.roblox.controls.lastTime = 0;
  qs("#app")?.classList.remove("roblox-dragging", "roblox-pinching");
}

function robloxPointerDistance() {
  const points = [...state.roblox.pointers.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function startRobloxPinch() {
  const distance = robloxPointerDistance();
  if (!distance) return;
  state.roblox.drag.active = false;
  state.roblox.pinch = {
    active: true,
    startDistance: distance,
    startAltitude: state.roblox.altitude,
  };
  qs("#app")?.classList.remove("roblox-dragging");
  qs("#app")?.classList.add("roblox-pinching");
}

function startRobloxSurfaceDrag(event) {
  if (!isRobloxLens() || event.button > 0) return;
  state.roblox.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  event.currentTarget.setPointerCapture?.(event.pointerId);
  if (state.roblox.pointers.size >= 2) {
    startRobloxPinch();
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  activeRobloxPosition();
  const basis = robloxScreenMovementBasis(activeRobloxPosition());
  state.roblox.followFocus = false;
  state.roblox.drag = {
    active: true,
    pointerId: event.pointerId,
    lastX: event.clientX,
    lastY: event.clientY,
    basisRight: basis.right,
    basisUp: basis.up,
  };
  qs("#app")?.classList.add("roblox-dragging");
  event.preventDefault();
  event.stopPropagation();
}

function moveRobloxSurfaceDrag(event) {
  if (!isRobloxLens() || !state.roblox.pointers.has(event.pointerId)) return;
  state.roblox.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (state.roblox.pointers.size >= 2) {
    if (!state.roblox.pinch.active) startRobloxPinch();
    const distance = robloxPointerDistance();
    if (distance && state.roblox.pinch.startDistance) {
      const zoomFactor = state.roblox.pinch.startDistance / distance;
      setRobloxCameraAltitude(state.roblox.pinch.startAltitude * zoomFactor, 0);
    }
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const drag = state.roblox.drag;
  if (!drag.active || event.pointerId !== drag.pointerId) return;

  const dx = event.clientX - drag.lastX;
  const dy = event.clientY - drag.lastY;
  if (Math.abs(dx) + Math.abs(dy) < 0.5) return;

  moveRobloxAvatarByScreenDelta(dx, dy, drag.basisRight, drag.basisUp, 0);
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
  event.preventDefault();
  event.stopPropagation();
}

function endRobloxSurfaceDrag(event) {
  if (!isRobloxLens() || !state.roblox.pointers.has(event.pointerId)) return;
  state.roblox.pointers.delete(event.pointerId);
  try {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture can already be gone if the browser cancels a touch gesture.
  }
  if (state.roblox.pointers.size >= 2) {
    startRobloxPinch();
  } else if (state.roblox.pointers.size === 1) {
    const [[pointerId, point]] = [...state.roblox.pointers.entries()];
    const basis = robloxScreenMovementBasis(activeRobloxPosition());
    state.roblox.pinch.active = false;
    state.roblox.drag = {
      active: true,
      pointerId,
      lastX: point.x,
      lastY: point.y,
      basisRight: basis.right,
      basisUp: basis.up,
    };
    qs("#app")?.classList.remove("roblox-pinching");
    qs("#app")?.classList.add("roblox-dragging");
  } else {
    resetRobloxGestureState();
  }
  event.preventDefault();
  event.stopPropagation();
}

function zoomRobloxCameraFromWheel(event) {
  if (!isRobloxLens()) return;
  const nextAltitude = state.roblox.altitude * Math.exp(event.deltaY * 0.0012);
  setRobloxCameraAltitude(nextAltitude, 90);
  event.preventDefault();
  event.stopPropagation();
}

function robloxThumbControl(kind) {
  return state.roblox.controls[kind];
}

function updateRobloxThumbStick(kind) {
  const control = robloxThumbControl(kind);
  const stick = qs(kind === "move" ? "#robloxMoveStick" : "#robloxLookStick");
  const pad = qs(`[data-roblox-pad="${kind}"]`);
  if (!stick || !pad) return;
  const x = control.vectorX * ROBLOX_THUMB_RADIUS_PX;
  const y = control.vectorY * ROBLOX_THUMB_RADIUS_PX;
  stick.style.transform = `translate(${x}px, ${y}px)`;
  pad.classList.toggle("is-active", control.active);
}

function resetRobloxThumbControl(kind) {
  const control = robloxThumbControl(kind);
  control.active = false;
  control.pointerId = null;
  control.startX = 0;
  control.startY = 0;
  control.vectorX = 0;
  control.vectorY = 0;
  updateRobloxThumbStick(kind);
}

function updateRobloxThumbVector(kind, event) {
  const control = robloxThumbControl(kind);
  const dx = event.clientX - control.startX;
  const dy = event.clientY - control.startY;
  const distance = Math.hypot(dx, dy);
  const amount = distance > ROBLOX_THUMB_RADIUS_PX ? ROBLOX_THUMB_RADIUS_PX / distance : 1;
  control.vectorX = (dx * amount) / ROBLOX_THUMB_RADIUS_PX;
  control.vectorY = (dy * amount) / ROBLOX_THUMB_RADIUS_PX;
  updateRobloxThumbStick(kind);
}

function robloxThumbControlsActive() {
  return state.roblox.controls.move.active || state.roblox.controls.look.active;
}

function stepRobloxThumbControls(now) {
  if (!isRobloxLens()) {
    resetRobloxThumbControl("move");
    resetRobloxThumbControl("look");
    state.roblox.controls.frame = null;
    state.roblox.controls.lastTime = 0;
    return;
  }

  const lastTime = state.roblox.controls.lastTime || now;
  const frameScale = clamp((now - lastTime) / 16.67, 0.25, 2.5);
  state.roblox.controls.lastTime = now;

  const move = state.roblox.controls.move;
  if (move.active && Math.hypot(move.vectorX, move.vectorY) > 0.04) {
    moveRobloxAvatarByThumbInput(move.vectorX, move.vectorY, frameScale);
  }

  const look = state.roblox.controls.look;
  if (look.active) {
    if (Math.abs(look.vectorX) > 0.04) {
      rotateRobloxHeading(look.vectorX * ROBLOX_JOYSTICK_TURN_RAD_PER_FRAME * frameScale, 0);
    }
    if (Math.abs(look.vectorY) > 0.08) {
      setRobloxCameraAltitude(
        state.roblox.altitude * Math.exp(look.vectorY * ROBLOX_JOYSTICK_ZOOM_PER_FRAME * frameScale),
        0,
      );
    }
  }

  if (robloxThumbControlsActive()) {
    state.roblox.controls.frame = window.requestAnimationFrame(stepRobloxThumbControls);
  } else {
    state.roblox.controls.frame = null;
    state.roblox.controls.lastTime = 0;
  }
}

function ensureRobloxThumbLoop() {
  if (!state.roblox.controls.frame) {
    state.roblox.controls.frame = window.requestAnimationFrame(stepRobloxThumbControls);
  }
}

function startRobloxThumbControl(event) {
  if (!isRobloxLens() || event.button > 0) return;
  const pad = event.currentTarget;
  const kind = pad.dataset.robloxPad;
  if (!kind) return;
  const control = robloxThumbControl(kind);
  control.active = true;
  control.pointerId = event.pointerId;
  control.startX = event.clientX;
  control.startY = event.clientY;
  control.vectorX = 0;
  control.vectorY = 0;
  pad.setPointerCapture?.(event.pointerId);
  updateRobloxThumbVector(kind, event);
  ensureRobloxThumbLoop();
  event.preventDefault();
  event.stopPropagation();
}

function moveRobloxThumbControl(event) {
  const kind = event.currentTarget.dataset.robloxPad;
  if (!kind) return;
  const control = robloxThumbControl(kind);
  if (!control.active || control.pointerId !== event.pointerId) return;
  updateRobloxThumbVector(kind, event);
  event.preventDefault();
  event.stopPropagation();
}

function endRobloxThumbControl(event) {
  const kind = event.currentTarget.dataset.robloxPad;
  if (!kind) return;
  const control = robloxThumbControl(kind);
  if (control.pointerId !== event.pointerId) return;
  try {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture can already be gone after a system gesture cancellation.
  }
  resetRobloxThumbControl(kind);
  if (robloxThumbControlsActive()) ensureRobloxThumbLoop();
  event.preventDefault();
  event.stopPropagation();
}

function transformGeometryForFuture(geometry, continent, years) {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) =>
        ring.map(([lng, lat]) => futureCoordinate(lat, lng, continent, years)),
      ),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => ring.map(([lng, lat]) => futureCoordinate(lat, lng, continent, years))),
      ),
    };
  }
  return geometry;
}

function transformGeometryByDelta(geometry, deltaLat, deltaLng) {
  const shift = ([lng, lat]) => [normalizeLng(lng + deltaLng), clampLat(lat + deltaLat)];
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => ring.map(shift)),
    };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) => polygon.map((ring) => ring.map(shift))),
    };
  }
  return geometry;
}

function buildFutureLand() {
  if (state.time <= 0) return [];
  const cacheKey = String(state.time);
  if (state.futureLand.has(cacheKey)) return state.futureLand.get(cacheKey);
  const features = state.countries.features.map((feature) => ({
    ...feature,
    appKind: "future-land",
    geometry: transformGeometryForFuture(feature.geometry, feature.properties.APP_CONTINENT, state.time),
  }));
  state.futureLand.set(cacheKey, features);
  return features;
}

function buildRobloxLand() {
  if (!state.layers.reconstructedLand) return [];
  const cacheKey = String(state.time);
  if (state.robloxLand.has(cacheKey)) return state.robloxLand.get(cacheKey);

  const features = state.countries.features.map((feature) => {
    const track = state.countryTrackIndex.get(feature.properties.APP_ID);
    const labelLat = feature.properties.APP_LABEL_LAT;
    const labelLng = feature.properties.APP_LABEL_LNG;
    const projected = track ? getTrackPoint(track, state.time) : { lat: labelLat, lng: labelLng };
    return {
      ...feature,
      appKind: "roblox-land",
      geometry: transformGeometryByDelta(
        feature.geometry,
        projected.lat - labelLat,
        shortestLngDelta(labelLng, projected.lng),
      ),
    };
  });

  state.robloxLand.set(cacheKey, features);
  return features;
}

function combinePolygons() {
  const polygons = [];
  if (isRobloxLens()) {
    polygons.push(...buildRobloxLand());
    return polygons;
  }
  if (state.layers.reconstructedLand && state.time > 0) {
    polygons.push(...buildFutureLand());
  }
  if (state.layers.plates && state.time <= 0) {
    const snapshot = nearestPlateSnapshot(state.time);
    const plates = state.plates.get(snapshot);
    if (plates) {
      polygons.push(
        ...plates.features.map((feature) => ({
          ...feature,
          appKind: "plate",
          appSnapshot: snapshot,
        })),
      );
    }
  }
  if (state.layers.countries) {
    polygons.push(
      ...state.countries.features.map((feature) => ({
        ...feature,
        appKind: "country",
      })),
    );
  }
  return polygons;
}

function setStatus(text) {
  qs("#statusText").textContent = text;
}

function setPanelOpen(open) {
  const shell = qs("#app");
  const toggle = qs("#toolsToggle");
  shell.classList.toggle("panel-open", open);
  toggle?.setAttribute("aria-expanded", String(open));
}

function updateTopbarHeight() {
  const topbar = qs(".topbar");
  if (!topbar) return;
  qs("#app").style.setProperty("--topbar-height", `${Math.ceil(topbar.getBoundingClientRect().height)}px`);
}

async function loadPlateSnapshot(snapshot) {
  if (state.plates.has(snapshot)) return;
  const data = await fetch(DATA.plates(snapshot)).then((response) => response.json());
  state.plates.set(snapshot, data);
}

async function loadCoastlineSnapshot(snapshot) {
  if (state.coastlines.has(snapshot)) return;
  const data = await fetch(DATA.coastlines(snapshot)).then((response) => response.json());
  state.coastlines.set(snapshot, data);
}

async function ensureVisibleLayers() {
  const snapshot = nearestPlateSnapshot(state.time);
  const loaders = [];
  if (state.time <= 0 && (state.layers.plates || state.layers.plateMotion)) loaders.push(loadPlateSnapshot(snapshot));
  if (state.time < 0 && state.layers.reconstructedLand) loaders.push(loadCoastlineSnapshot(snapshot));
  await Promise.all(loaders);
}

function updateReadouts() {
  const selected = selectedPoint();
  const position = getTrackPoint(selected, state.time);
  qs("#timeReadout").textContent = fmtTime(state.time);
  qs("#timeline").value = String(state.time);
  qs("#progressFill").style.width = `${timelineProgress(state.time)}%`;
  qs("#selectedName").textContent = selected.name;
  qs("#selectedMeta").textContent =
    selected.kind === "city" ? `${selected.country} city track` : `${selected.continent} country centroid`;
  qs("#latLng").textContent = `${position.lat.toFixed(2)} lat, ${position.lng.toFixed(2)} lng`;
  qs("#hudSelectedName").textContent = selected.name;
  qs("#hudSelectedMeta").textContent =
    selected.kind === "city" ? `${selected.country} city track` : `${selected.continent} country centroid`;
  qs("#hudLatLng").textContent = `${position.lat.toFixed(2)} lat, ${position.lng.toFixed(2)} lng`;
  qs("#modelBadge").textContent =
    state.time < 0 ? "GPlates Muller2019" : state.time === 0 ? "Present-day Natural Earth" : "Scenario mode";
  qs("#plateBadge").textContent =
    state.time < 0
      ? `Coastlines/plates: ${nearestPlateSnapshot(state.time)} Ma`
      : state.time === 0
        ? "Present-day surface"
        : "Future scenario land";
  qs("#playIcon").setAttribute("data-lucide", state.playing ? "pause" : "play");
  qs("#playLabel").textContent = state.playing ? "Pause" : "Play";
  createIcons({ icons });
}

function updateLensMode() {
  qs("#app")?.classList.toggle("lens-roblox", isRobloxLens());
  if (!isRobloxLens()) {
    resetRobloxGestureState();
  }
  const controls = state.globe?.controls?.();
  if (controls) {
    controls.autoRotate = !isRobloxLens();
    controls.autoRotateSpeed = isRobloxLens() ? 0 : 0.28;
    controls.enableRotate = !isRobloxLens();
    controls.enablePan = !isRobloxLens();
    controls.enableZoom = !isRobloxLens();
    controls.enableDamping = true;
    controls.dampingFactor = isRobloxLens() ? 0.12 : 0.08;
  }
  if (!isRobloxLens()) {
    const camera = state.globe?.camera?.();
    if (camera) {
      camera.up.set(0, 1, 0);
      if (state.defaultCameraFov) camera.fov = state.defaultCameraFov;
      if (state.defaultCameraNear != null) camera.near = state.defaultCameraNear;
      if (state.defaultCameraFar != null) camera.far = state.defaultCameraFar;
      camera.updateProjectionMatrix?.();
    }
  }
}

function updateGlobe() {
  const globe = state.globe;
  if (!globe) return;
  updateLensMode();

  globe
    .showAtmosphere(state.layers.atmosphere)
    .globeImageUrl(
      isRobloxLens()
        ? ASSETS.robloxOcean
        : state.layers.reconstructedLand && state.time !== 0
          ? ASSETS.deepOcean
          : ASSETS.earthTexture,
    )
    .backgroundImageUrl(isRobloxLens() ? ASSETS.robloxSky : state.layers.stars ? ASSETS.nightSky : null)
    .polygonsData(combinePolygons())
    .polygonCapColor((feature) => {
      if (feature.appKind === "roblox-land") return robloxLandColor(feature);
      if (feature.appKind === "plate") return plateColor(feature);
      if (feature.appKind === "reconstructed-land" || feature.appKind === "future-land") return reconstructedLandColor(feature);
      return countryCapColor(feature);
    })
    .polygonSideColor((feature) => {
      if (feature.appKind === "roblox-land") return "rgba(19, 31, 44, 0.72)";
      if (feature.appKind === "plate") return isReconstructionView() ? "rgba(0, 0, 0, 0)" : "rgba(20, 27, 38, 0.05)";
      if (feature.appKind === "reconstructed-land" || feature.appKind === "future-land") return "rgba(0, 0, 0, 0)";
      return "rgba(10, 18, 28, 0.12)";
    })
    .polygonStrokeColor((feature) => {
      if (feature.appKind === "roblox-land") return countryStrokeColor(feature);
      if (feature.appKind === "plate") return isReconstructionView() ? "rgba(16, 112, 126, 0.82)" : "rgba(117, 241, 255, 0.38)";
      if (feature.appKind === "reconstructed-land" || feature.appKind === "future-land") return reconstructedLandStroke(feature);
      return countryStrokeColor(feature);
    })
    .polygonAltitude((feature) => {
      if (feature.appKind === "roblox-land") {
        const selected = selectedPoint();
        return selected.kind === "country" && feature.properties.APP_ID === selected.iso ? 0.08 : 0.055;
      }
      if (feature.appKind === "plate") return isReconstructionView() ? 0.056 : state.lens === "tectonic" ? 0.018 : 0.008;
      if (feature.appKind === "reconstructed-land" || feature.appKind === "future-land") return 0.036;
      const selected = selectedPoint();
      if (selected.kind === "country" && feature.properties.APP_ID === selected.iso) return state.time === 0 ? 0.03 : 0.052;
      return state.time === 0 ? (state.lens === "political" ? 0.012 : 0.006) : 0.05;
    })
    .pointsData(isRobloxLens() ? [] : buildPointData())
    .labelsData(buildLabelData())
    .pathsData(buildPathData())
    .arcsData(buildArcData());

  const selected = selectedPoint();
  const position = getTrackPoint(selected, state.time);
  if (isRobloxLens()) {
    pointRobloxCameraAtAvatar(620);
  } else {
    globe.pointOfView({ lat: position.lat, lng: position.lng, altitude: 1.85 }, 900);
  }
  updateAxisObject();
  updateRobloxAvatarObject();
  updateRobloxHud();
  renderRobloxSurface();
  updateReadouts();
}

async function setTime(time) {
  state.time = Number(time);
  setStatus("Loading visible reconstruction layer");
  await ensureVisibleLayers();
  updateGlobe();
  setStatus("Ready");
}

function setLens(lens) {
  state.lens = lens;
  if (isRobloxLens()) state.roblox.followFocus = true;
  document.querySelectorAll("[data-lens]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lens === lens);
  });
  updateLensMode();
  updateGlobe();
}

async function setLayer(layer, value) {
  state.layers[layer] = value;
  await ensureVisibleLayers();
  updateGlobe();
}

function togglePlayback() {
  state.playing = !state.playing;
  if (state.playing) {
    state.timer = window.setInterval(() => {
      const next = state.time >= 250 ? -250 : state.time + 1;
      setTime(next);
    }, 80);
  } else {
    window.clearInterval(state.timer);
    state.timer = null;
  }
  updateReadouts();
}

function buildControls() {
  const focusSelect = qs("#focusSelect");
  const cityGroup = document.createElement("optgroup");
  cityGroup.label = "Cities";
  const countryGroup = document.createElement("optgroup");
  countryGroup.label = "Countries";

  state.tracked.points
    .filter((point) => point.kind === "city")
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((point) => {
      const option = document.createElement("option");
      option.value = point.id;
      option.textContent = `${point.name}, ${point.country}`;
      cityGroup.append(option);
    });

  state.tracked.points
    .filter((point) => point.kind === "country")
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((point) => {
      const option = document.createElement("option");
      option.value = point.id;
      option.textContent = point.name;
      countryGroup.append(option);
    });

  focusSelect.append(cityGroup, countryGroup);
  focusSelect.value = state.selectedId;

  const tickRow = qs("#ticks");
  KEY_TIMES.forEach((time) => {
    const tick = document.createElement("button");
    tick.type = "button";
    tick.className = "tick";
    tick.style.left = `${timelineProgress(time)}%`;
    tick.textContent = time === 0 ? "0" : String(time);
    tick.addEventListener("click", () => setTime(time));
    tickRow.append(tick);
  });

  qs("#timeline").addEventListener("input", (event) => {
    setTime(event.target.value);
  });
  qs("#playButton").addEventListener("click", togglePlayback);
  qs("#resetButton").addEventListener("click", () => setTime(0));
  focusSelect.addEventListener("change", (event) => {
    state.selectedId = event.target.value;
    state.roblox.followFocus = true;
    updateGlobe();
  });
  document.querySelectorAll("[data-lens]").forEach((button) => {
    button.addEventListener("click", () => setLens(button.dataset.lens));
  });
  document.querySelectorAll("[data-layer]").forEach((input) => {
    input.addEventListener("change", () => setLayer(input.dataset.layer, input.checked));
  });
  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => setTime(Number(button.dataset.jump)));
  });
  document.querySelectorAll("[data-walk]").forEach((button) => {
    button.addEventListener("click", () => moveRobloxAvatar(button.dataset.walk));
  });
  qs("#robloxCenter")?.addEventListener("click", resetRobloxAvatarToFocus);
  const globeTarget = qs("#globe");
  globeTarget.addEventListener("pointerdown", startRobloxSurfaceDrag, { capture: true, passive: false });
  globeTarget.addEventListener("pointermove", moveRobloxSurfaceDrag, { capture: true, passive: false });
  globeTarget.addEventListener("pointerup", endRobloxSurfaceDrag, { capture: true, passive: false });
  globeTarget.addEventListener("pointercancel", endRobloxSurfaceDrag, { capture: true, passive: false });
  globeTarget.addEventListener("wheel", zoomRobloxCameraFromWheel, { capture: true, passive: false });
  document.querySelectorAll("[data-roblox-pad]").forEach((pad) => {
    pad.addEventListener("pointerdown", startRobloxThumbControl, { passive: false });
    pad.addEventListener("pointermove", moveRobloxThumbControl, { passive: false });
    pad.addEventListener("pointerup", endRobloxThumbControl, { passive: false });
    pad.addEventListener("pointercancel", endRobloxThumbControl, { passive: false });
  });
  qs("#toolsToggle").addEventListener("click", () => setPanelOpen(!qs("#app").classList.contains("panel-open")));
  qs("#toolsClose").addEventListener("click", () => setPanelOpen(false));
  qs("#panelScrim").addEventListener("click", () => setPanelOpen(false));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setPanelOpen(false);
    if (!isRobloxLens()) return;
    if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(document.activeElement?.tagName)) return;
    const movement = {
      ArrowUp: "north",
      w: "north",
      W: "north",
      ArrowDown: "south",
      s: "south",
      S: "south",
      ArrowLeft: "west",
      a: "west",
      A: "west",
      ArrowRight: "east",
      d: "east",
      D: "east",
    }[event.key];
    if (movement) {
      event.preventDefault();
      moveRobloxAvatar(movement);
    }
  });
  window.addEventListener("resize", () => {
    updateTopbarHeight();
    renderRobloxSurface();
  });
  updateTopbarHeight();
}

function initGlobe() {
  const container = qs("#globe");
  state.globe = Globe({ animateIn: true, waitForGlobeReady: true })(container)
    .globeImageUrl(ASSETS.earthTexture)
    .bumpImageUrl(ASSETS.earthTopology)
    .backgroundImageUrl(ASSETS.nightSky)
    .atmosphereColor("#74d5ff")
    .atmosphereAltitude(0.19)
    .hexPolygonResolution(3)
    .polygonLabel((feature) => {
      if (feature.appKind === "roblox-land") {
        return `<b>${feature.properties.APP_NAME}</b><br/>Roblox surface<br/>${fmtTime(state.time)}`;
      }
      if (feature.appKind === "plate") {
        const plate = feature.properties?.reconstruction_plate_id || "unknown";
        return `<b>Plate polygon</b><br/>ID ${plate}<br/>${feature.appSnapshot} Ma snapshot`;
      }
      if (feature.appKind === "reconstructed-land") {
        return `<b>Reconstructed coastline</b><br/>${feature.appSnapshot} Ma`;
      }
      if (feature.appKind === "future-land") {
        return `<b>Future scenario land</b><br/>${feature.properties.APP_CONTINENT}`;
      }
      return `<b>${feature.properties.APP_NAME}</b><br/>${feature.properties.APP_CONTINENT}`;
    })
    .pointLat("lat")
    .pointLng("lng")
    .pointAltitude((point) => (point.isSelected ? 0.075 : 0.045))
    .pointRadius((point) => (point.isSelected ? 0.42 : 0.25))
    .pointColor((point) => (point.isSelected ? "rgba(255, 209, 102, 0.96)" : "rgba(104, 214, 255, 0.76)"))
    .pointLabel((point) => `<b>${point.name}</b><br/>${fmtTime(state.time)}`)
    .labelLat("lat")
    .labelLng("lng")
    .labelAltitude((point) => (point.kind === "boundary" ? 0.065 : 0.1))
    .labelText("name")
    .labelSize((point) =>
      isRobloxLens() ? (point.isSelected ? 0.62 : 0.44) : point.isSelected ? 1.18 : point.kind === "boundary" ? 0.62 : 0.78,
    )
    .labelDotRadius((point) => (isRobloxLens() ? (point.isSelected ? 0.14 : 0.08) : point.isSelected ? 0.2 : 0.1))
    .labelColor((point) =>
      point.isSelected
        ? "rgba(255, 239, 187, 0.98)"
        : point.kind === "boundary"
          ? point.color
          : "rgba(218, 238, 255, 0.78)",
    )
    .pathPoints("points")
    .pathPointLat((point) => point[0])
    .pathPointLng((point) => point[1])
    .pathPointAlt((point) => point[2])
    .pathColor("color")
    .pathStroke((path) =>
      path.kind === "orientation-grid"
        ? 0.55
        : path.kind === "reconstructed-outline-shadow"
          ? 2.2
        : path.kind === "reconstructed-outline"
          ? 0.9
        : path.kind === "plate-motion-glow"
          ? 7
          : path.kind === "plate-motion-shaft"
            ? Math.min(3.6, Math.max(2.35, (path.speedMagnitude || 5) / 6))
            : path.kind === "plate-motion-head"
              ? 3.1
          : path.kind === "selected-track"
            ? 3
            : path.kind?.startsWith("boundary")
              ? 2.2
              : 1.2,
    )
    .pathDashLength((path) =>
      path.kind === "orientation-grid"
        ? 1
        : path.kind === "reconstructed-outline" || path.kind === "reconstructed-outline-shadow"
          ? 1
        : path.kind === "plate-motion-glow"
          ? 0.16
          : path.kind === "plate-motion-shaft"
            ? 1
            : path.kind === "plate-motion-head"
              ? 1
          : path.kind === "selected-track" || path.kind === "reference-track"
            ? 0.02
            : 0.012,
    )
    .pathDashGap((path) =>
      path.kind === "orientation-grid"
        ? 0.001
        : path.kind === "reconstructed-outline" || path.kind === "reconstructed-outline-shadow"
          ? 0.001
        : path.kind === "plate-motion-glow"
          ? 0.075
          : path.kind === "plate-motion-shaft"
            ? 0.001
            : path.kind === "plate-motion-head"
              ? 0.001
          : path.kind === "selected-track" || path.kind === "reference-track"
            ? 0.008
            : 0.006,
    )
    .pathDashInitialGap((path) => (path.kind === "plate-motion-glow" ? ((path.id.length % 9) / 9) : 0))
    .pathDashAnimateTime((path) =>
      path.kind === "orientation-grid" || path.kind === "reconstructed-outline" || path.kind === "reconstructed-outline-shadow" || path.kind === "plate-motion-shaft" || path.kind === "plate-motion-head"
        ? 100000
        : path.kind === "plate-motion-glow"
          ? 1450
          : path.kind?.startsWith("boundary")
            ? 2600
            : 4200,
    )
    .arcStartLat("startLat")
    .arcStartLng("startLng")
    .arcEndLat("endLat")
    .arcEndLng("endLng")
    .arcColor("color")
    .arcAltitude(0.075)
    .arcStroke(0.65)
    .arcDashLength(0.22)
    .arcDashGap(0.08)
    .arcDashInitialGap(() => Math.random())
    .arcDashAnimateTime(1800);

  const controls = state.globe.controls();
  const camera = state.globe.camera?.();
  state.defaultCameraFov = camera?.fov || 50;
  state.defaultCameraNear = camera?.near ?? null;
  state.defaultCameraFar = camera?.far ?? null;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.28;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  const scene = state.globe.scene();
  const sunlight = new THREE.DirectionalLight(0xfff3d0, 1.35);
  sunlight.position.set(-1.2, 0.4, 1.6);
  scene.add(sunlight);
  scene.add(new THREE.AmbientLight(0x8ab4ff, 0.7));
  createAxisObject();
  createRobloxAvatarObject();
  startRobloxAvatarAnimation();

  const resizeGlobe = () => {
    const box = container.getBoundingClientRect();
    state.globe.width(Math.max(320, Math.floor(box.width))).height(Math.max(320, Math.floor(box.height)));
  };
  resizeGlobe();
  new ResizeObserver(resizeGlobe).observe(container);
}

async function bootstrap() {
  setStatus("Loading Earth data");
  const [countries, tracked, motion] = await Promise.all([
    fetch(DATA.countries).then((response) => response.json()),
    fetch(DATA.tracked).then((response) => response.json()),
    fetch(DATA.motion).then((response) => response.json()),
    loadPlateSnapshot(0),
    loadCoastlineSnapshot(0),
  ]);
  state.countries = countries;
  state.tracked = tracked;
  state.motion = motion;
  state.countryTrackIndex = new Map(
    tracked.points
      .filter((point) => point.kind === "country")
      .map((point) => [point.iso, point]),
  );

  buildControls();
  initGlobe();
  setLens(state.lens);
  await setTime(0);
}

document.addEventListener("DOMContentLoaded", () => {
  createIcons({ icons });
  bootstrap().catch((error) => {
    console.error(error);
    setStatus("Could not load Earth Console data. Run npm run data.");
  });
});
