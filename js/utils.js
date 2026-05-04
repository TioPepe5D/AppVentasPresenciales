// ---------- Utils ----------
const fmtCLP = (n) => {
  if (!isFinite(n)) n = 0;
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Math.round(n));
};
const fmtDate = (t) => {
  const d = new Date(t);
  return d.toLocaleDateString('es-CL', { day:'2-digit', month:'short' }).replace('.','') +
         ' · ' + d.toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' });
};
const uid = () => Math.random().toString(36).slice(2, 9);

const CATEGORY_EMOJI = {
  collar_pulsera_mujer_925: "🇨🇱",
  collar_pulsera_hombre_925: "🇨🇱",
  aros_colgantes_925: "🇨🇱",
  anillos_925: "🇨🇱",
  collar_pulsera_micro: "🇨🇱",
  italiana_925: "🇮🇹",
  gf_18k: "☀️"
};
const emojiForCategory = (key, cat) => {
  if (CATEGORY_EMOJI[key]) return CATEGORY_EMOJI[key];
  const mat = (cat?.material || "").toUpperCase();
  if (mat.includes("GF")) return "☀️";
  if (mat === "925") return "🇮🇹";
  return "🇨🇱";
};

const MESSAGE_GROUPS = [
  { key: "collares", label: "Cadena", emoji: "🇨🇱",
    categories: ["collar_pulsera_mujer_925", "collar_pulsera_hombre_925"] },
  { key: "micro", label: "Micro", emoji: "🇨🇱",
    categories: ["collar_pulsera_micro", "aros_colgantes_925", "anillos_925"] },
  { key: "italiana", label: "Italiana 925", emoji: "🇮🇹",
    categories: ["italiana_925"] },
  { key: "gf", label: "GF 18K", emoji: "☀️",
    categories: ["gf_18k"] }
];
const fmtGrams = (g) => {
  const r = Math.round(g * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};
// Mapa de tipo de lote → clave de grupo de mensaje
const LOTE_GROUP_MAP = {
  cadena:   'collares',
  micro:    'micro',
  italiana: 'italiana',
  gf18k:    'gf',
};

const buildMessagePiezas = (validLines, prices) => {
  const sums = new Map();
  const order = [];
  const ungrouped = [];
  const insumos = [];

  const addToGroup = (groupKey, grams) => {
    const group = MESSAGE_GROUPS.find(g => g.key === groupKey);
    if (!group) return;
    if (!sums.has(group.key)) { sums.set(group.key, 0); order.push(group); }
    sums.set(group.key, sums.get(group.key) + grams);
  };

  for (const l of validLines) {
    if (l.category === INSUMO_KEY) { insumos.push(l); continue; }
    if (l.category === LOTE_KEY) {
      // Los gramos de cada tipo del lote se suman al grupo correspondiente
      const gramsMap = l.loteGramsMap || {};
      for (const [typeKey, groupKey] of Object.entries(LOTE_GROUP_MAP)) {
        const g = Number(gramsMap[typeKey]) || 0;
        if (g > 0) addToGroup(groupKey, g);
      }
      continue;
    }
    const grams = Number(l.grams) || 0;
    const group = MESSAGE_GROUPS.find(g => g.categories.includes(l.category));
    if (group) {
      if (!sums.has(group.key)) { sums.set(group.key, 0); order.push(group); }
      sums.set(group.key, sums.get(group.key) + grams);
    } else {
      const cat = prices[l.category];
      ungrouped.push({
        grams,
        label: cat?.name || l.category,
        emoji: emojiForCategory(l.category, cat)
      });
    }
  }
  const lines = order.map(g => `${fmtGrams(sums.get(g.key))} | ${g.emoji} ${g.label}`);
  for (const u of ungrouped) lines.push(`${fmtGrams(u.grams)} | ${u.emoji} ${u.label}`);
  for (const ins of insumos) {
    const cost  = Number(ins.insumoCost)  || Number(ins.insumoPrice) || 0;
    const valor = Number(ins.insumoValor) || Number(ins.insumoPrice) || cost;
    const qty = 1;
    lines.push(`💎 ${qty} ${ins.insumoName || 'Insumo'}: $${fmtCLP(cost * qty)}`);
  }
  return lines.join('\n');
};

// Index map: 0=T-0 (≤$30k), 1=T-I (>$30k), 2=T-II (>$100k), 3=T-III (>499g), 4=T-IV (>999g)
// El total final CON el descuento del tramo debe superar el umbral.
// Si al aplicar T-II el total cae bajo $100k, se baja a T-I, etc.
function computeTotals(lines, prices){
  const regular = lines.filter(l => l.category !== INSUMO_KEY && l.category !== LOTE_KEY);
  const totalWeight = regular.reduce((s,l) => s + (Number(l.grams)||0), 0);

  const calcRegularTotal = (tierIdx) => regular.reduce((s,l) => {
    const cat = prices[l.category];
    if (!cat) return s;
    const unitPrice = Number(l.customPrice) || 0;
    return s + unitPrice * (Number(l.grams)||0);
  }, 0);

  let tier;
  // Peso tiene prioridad
  if (totalWeight > 999) tier = 4;
  else if (totalWeight > 499) tier = 3;
  else {
    // Tramos por precio: el total AL precio del tramo debe superar el umbral
    const totalAtII = calcRegularTotal(2);
    const totalAtI  = calcRegularTotal(1);

    if (totalAtII > 100000) tier = 2;
    else tier = 1;
  }

  const regularTotal = calcRegularTotal(tier);
  const insumoTotal = lines.filter(l => l.category === INSUMO_KEY).reduce((s,l) => {
    const cost  = Number(l.insumoCost)  || Number(l.insumoPrice) || 0;
    const valor = Number(l.insumoValor) || cost;
    const qty   = 1;
    return s + valor * qty;
  }, 0);
  const loteTotal = lines.filter(l => l.category === LOTE_KEY).reduce((s,l) => s + (Number(l.lotePrice)||0), 0);
  const total = regularTotal + insumoTotal + loteTotal;

  let reason;
  if (totalWeight > 999) reason = `Peso total ${fmtCLP(totalWeight)}g supera 999g`;
  else if (totalWeight > 499) reason = `Peso total ${fmtCLP(totalWeight)}g supera 499g`;
  else if (tier === 2) reason = `Venta supera $100.000`;
  else reason = `Precio T-I`;

  return { tier, total, totalWeight, reason };
}
