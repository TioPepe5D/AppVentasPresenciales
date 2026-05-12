// ── Constantes de React Hooks (disponibles globalmente desde React CDN) ──
const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ---------- Data ----------
const DEFAULT_PRICES = {
  "collar_pulsera_mujer_925": { "name": "Collar y Pul Mujer 💁🏼‍♀️", "material": "SL 925", "cost": 450, "costKilero": 400, "prices": [1900, 950, 800, 650, 550] },
  "collar_pulsera_hombre_925": { "name": "Collar y Pul Hombre 🙋🏻‍♂️", "material": "SL 925", "cost": 450, "costKilero": 400, "prices": [1500, 750, 700, 500, 450] },
  "aros_colgantes_925": { "name": "Aros y Colgantes ✨", "material": "SL 925", "cost": 650, "costKilero": 550, "prices": [3600, 1200, 1000, 900, 850] },
  "anillos_925": { "name": "Anillos 💍", "material": "SL 925", "cost": 650, "costKilero": 550, "prices": [4500, 1500, 1250, 1100, 1000] },
  "collar_pulsera_micro": { "name": "Collar y Pul Micro 💎", "material": "Micro", "cost": 650, "costKilero": 550, "prices": [2000, 1000, 900, 800, 750] },
  "italiana_925": { "name": "Italiana 🇮🇹", "material": "925", "cost": 2000, "costKilero": 2000, "prices": [5500, 2750, 2500, 2250, 2000] },
  "gf_18k": { "name": "GF 18 K ⚜️", "material": "GF 18K", "cost": 1400, "costKilero": 1300, "prices": [5000, 2500, 2250, 2000, 1800] }
};

const CATEGORY_ORDER = Object.keys(DEFAULT_PRICES);
const INSUMO_KEY = "__insumos__";
const LOTE_KEY   = "__lotes__";
const LOTE_TYPES = [
  { key: "cadena",   label: "Cadena",   emoji: "🔗" },
  { key: "micro",    label: "Micro",    emoji: "💎" },
  { key: "italiana", label: "Italy",    emoji: "🇮🇹" },
  { key: "gf18k",    label: "GF 18K",  emoji: "☀️" },
];

const LOTE_CAT_MAP = {
  cadena:   'collar_pulsera_mujer_925',
  micro:    'collar_pulsera_micro',
  italiana: 'italiana_925',
  gf18k:    'gf_18k',
};

const TIER_RULES = [
  { label: "PU",  desc: "Precio unitario (pieza individual)" },
  { label: "I",   desc: "Supera $30.000" },
  { label: "II",  desc: "Supera $100.000" },
  { label: "III", desc: "Supera 499g" },
  { label: "IV",  desc: "Supera 999g" },
];

const LS_HISTORY   = "joya.history.v1";
const LS_PRICES    = "joya.prices.v1";
const LS_TAB       = "joya.tab.v1";
const LS_PAGO      = "joya.pago.v1";
const LS_AUTH      = "joya.auth.v1";
const LS_HIST_MIG  = "joya.history.migrated.v2";
const LS_THEME     = "joya.theme.v1";
const LS_CUSTOM_THEME = "joya.theme.custom.v1";

const APP_PASSWORD = ".";
const TEAM = ["Diego","Benjamín","Jordan","Cristopher","Valentina","Amanda","Martín"];
const EMPRESA = "Empresa";
const PCT_SCHEDULER = 0.35;
const PCT_ATTENDANT = 0.35;
const PCT_EMPRESA   = 0.30;

const DEFAULT_CUSTOM = { bg: "#0e0e12", panel: "#1a1a22", ink: "#eeeeee", accent: "#9b6bff" };

const INSUMO_KEY_CONST = "__insumos__";
