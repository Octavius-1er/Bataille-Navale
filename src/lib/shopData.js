// src/lib/shopData.js
// All cosmetic items, packs, and rarities

export const RARITY = {
  common:    { id:'common',    label:'COMMUN',    color:'#aaaaaa', glow:'rgba(170,170,170,.3)',  weight:60 },
  rare:      { id:'rare',      label:'RARE',       color:'#4488ff', glow:'rgba(68,136,255,.4)',   weight:25 },
  epic:      { id:'epic',      label:'ÉPIQUE',     color:'#aa44ff', glow:'rgba(170,68,255,.5)',   weight:12 },
  legendary: { id:'legendary', label:'LÉGENDAIRE', color:'#ffd700', glow:'rgba(255,215,0,.6)',    weight:3  },
}

// ── SVG Icons for items (replacing emojis) ────────────────────────
export const ITEM_ICONS = {
  // Sea themes
  default:   (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#050d1a"/><path d="M0 28 Q12 20 24 28 Q36 36 48 28V48H0Z" fill="#0d2a4a"/><path d="M0 32 Q12 24 24 32 Q36 40 48 32V48H0Z" fill="#1a4a7a"/><path d="M0 36 Q12 28 24 36 Q36 44 48 36V48H0Z" fill="#00d4ff" opacity="0.4"/></svg>`,
  arctic:    (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#0a1a2a"/><polygon points="24,4 32,20 40,18 30,30 34,44 24,36 14,44 18,30 8,18 16,20" fill="#88ddff" opacity="0.9"/><circle cx="24" cy="24" r="4" fill="white"/></svg>`,
  lava:      (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#1a0500"/><ellipse cx="24" cy="38" rx="18" ry="6" fill="#cc2200"/><path d="M20 38 Q16 28 20 18 Q22 10 24 6 Q26 10 28 18 Q32 28 28 38Z" fill="#ff4400"/><path d="M22 38 Q20 30 22 22 Q23 16 24 12 Q25 16 26 22 Q28 30 26 38Z" fill="#ffaa00"/><path d="M23 38 Q22 32 23 26 Q23.5 22 24 20 Q24.5 22 25 26 Q26 32 25 38Z" fill="#ffff00" opacity="0.8"/></svg>`,
  neon:      (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#001a0a"/><rect x="8" y="8" width="32" height="32" rx="4" fill="none" stroke="#00ff88" stroke-width="2"/><rect x="14" y="14" width="20" height="20" rx="2" fill="none" stroke="#00ff88" stroke-width="1" opacity="0.5"/><circle cx="24" cy="24" r="4" fill="#00ff88"/><line x1="24" y1="8" x2="24" y2="14" stroke="#00ff88" stroke-width="2"/><line x1="24" y1="34" x2="24" y2="40" stroke="#00ff88" stroke-width="2"/><line x1="8" y1="24" x2="14" y2="24" stroke="#00ff88" stroke-width="2"/><line x1="34" y1="24" x2="40" y2="24" stroke="#00ff88" stroke-width="2"/></svg>`,
  space:     (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#05010f"/><circle cx="12" cy="12" r="1.5" fill="white"/><circle cx="36" cy="8" r="1" fill="white"/><circle cx="42" cy="20" r="1.5" fill="white"/><circle cx="8" cy="30" r="1" fill="white"/><circle cx="40" cy="38" r="1" fill="white"/><circle cx="20" cy="42" r="1.5" fill="white"/><ellipse cx="24" cy="24" rx="14" ry="10" fill="none" stroke="#aa44ff" stroke-width="1.5"/><ellipse cx="24" cy="24" rx="14" ry="10" fill="none" stroke="#6600ff" stroke-width="1" transform="rotate(30,24,24)"/><circle cx="24" cy="24" r="6" fill="#3300aa"/><circle cx="24" cy="24" r="3" fill="#aa44ff"/></svg>`,
  desert:    (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#1a1000"/><path d="M0 36 Q10 28 18 34 Q24 38 32 30 Q38 24 48 30V48H0Z" fill="#3a2800"/><circle cx="36" cy="14" r="8" fill="#ffaa00"/><path d="M36 4 L36 6 M36 22 L36 24 M26 14 L28 14 M44 14 L46 14" stroke="#ffcc44" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  toxic:     (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#0a1a00"/><circle cx="24" cy="22" r="10" fill="#2a4a00" stroke="#aaff00" stroke-width="2"/><path d="M24 12 Q28 8 32 12" fill="none" stroke="#aaff00" stroke-width="2"/><path d="M15 28 Q10 30 10 26" fill="none" stroke="#aaff00" stroke-width="2"/><path d="M33 28 Q38 30 38 26" fill="none" stroke="#aaff00" stroke-width="2"/><circle cx="24" cy="22" r="4" fill="#aaff00" opacity="0.8"/><circle cx="20" cy="20" r="2" fill="#001a00"/><circle cx="28" cy="20" r="2" fill="#001a00"/><path d="M20 25 Q24 28 28 25" fill="none" stroke="#001a00" stroke-width="1.5"/></svg>`,
  abyss:     (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#000005"/><circle cx="24" cy="24" r="18" fill="#05001a"/><circle cx="24" cy="24" r="12" fill="#0a0030"/><circle cx="24" cy="24" r="6" fill="#1a0060"/><circle cx="24" cy="24" r="2" fill="#3300ff"/><circle cx="20" cy="20" r="1" fill="#3300ff" opacity="0.6"/><circle cx="28" cy="18" r="0.8" fill="#3300ff" opacity="0.4"/><circle cx="16" cy="28" r="0.6" fill="#3300ff" opacity="0.3"/></svg>`,
  // Ship skins
  golden:    (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#2a1a00"/><path d="M6 32 L10 24 L38 24 L42 32 L24 36Z" fill="#ffd700"/><rect x="18" y="16" width="12" height="10" rx="1" fill="#ffaa00"/><rect x="22" y="10" width="4" height="8" fill="#ffcc00"/><circle cx="24" cy="34" r="3" fill="#ffee44"/><rect x="8" y="32" width="32" height="4" rx="1" fill="#cc9900"/></svg>`,
  ghost:     (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#0a0a1a"/><path d="M6 32 L10 24 L38 24 L42 32 L24 36Z" fill="rgba(200,200,255,0.15)" stroke="rgba(200,200,255,0.4)" stroke-width="1"/><rect x="18" y="16" width="12" height="10" rx="1" fill="rgba(200,200,255,0.1)" stroke="rgba(200,200,255,0.3)" stroke-width="1"/><rect x="22" y="10" width="4" height="8" fill="rgba(200,200,255,0.1)" stroke="rgba(200,200,255,0.3)" stroke-width="1"/><circle cx="21" cy="28" r="2" fill="rgba(220,220,255,0.8)"/><circle cx="27" cy="28" r="2" fill="rgba(220,220,255,0.8)"/></svg>`,
  fire:      (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#2a0800"/><path d="M6 32 L10 24 L38 24 L42 32 L24 36Z" fill="#cc2200"/><rect x="18" y="16" width="12" height="10" rx="1" fill="#ff4400"/><rect x="22" y="10" width="4" height="8" fill="#ff6600"/><path d="M16 32 Q18 28 20 32 Q22 28 24 32 Q26 28 28 32 Q30 28 32 32" stroke="#ff9900" stroke-width="2" fill="none"/></svg>`,
  ice:       (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#001a2a"/><path d="M6 32 L10 24 L38 24 L42 32 L24 36Z" fill="#1a5a8a"/><rect x="18" y="16" width="12" height="10" rx="1" fill="#2288cc"/><rect x="22" y="10" width="4" height="8" fill="#44aaff"/><polygon points="24,26 27,30 24,34 21,30" fill="#88ddff"/></svg>`,
  toxic_ship:(s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="48" height="48" fill="#001500"/><path d="M6 32 L10 24 L38 24 L42 32 L24 36Z" fill="#1a4400"/><rect x="18" y="16" width="12" height="10" rx="1" fill="#226600"/><rect x="22" y="10" width="4" height="8" fill="#44aa00"/><circle cx="20" cy="28" r="3" fill="#aaff00" opacity="0.8"/><circle cx="28" cy="28" r="3" fill="#aaff00" opacity="0.8"/></svg>`,
}

// Renders an SVG icon as a data URL for use in img tags or backgrounds
export function getItemIcon(itemId, size=48) {
  const fn = ITEM_ICONS[itemId] || ITEM_ICONS[itemId+'_ship']
  if (!fn) return null
  const svg = fn(size)
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

// ── Sea themes ────────────────────────────────────────────────────
export const SEA_THEMES = {
  default:   { id:'default',   name:'Océan',      rarity:'common',    free:true,  icon:'🌊', cellBg:'#050d1a',  cellBorder:'#0c1e30',  hitBg:'#4a1800',  missBg:'#0a2a4a',  accent:'#00d4ff' },
  arctic:    { id:'arctic',    name:'Arctique',    rarity:'rare',      free:false, icon:'🧊', cellBg:'#0a1a2a',  cellBorder:'#1a4a6a',  hitBg:'#1a3a5a',  missBg:'#0d2a3a',  accent:'#88ddff' },
  lava:      { id:'lava',      name:'Lave',        rarity:'epic',      free:false, icon:'🌋', cellBg:'#1a0500',  cellBorder:'#4a1500',  hitBg:'#6a2000',  missBg:'#2a0800',  accent:'#ff4400' },
  neon:      { id:'neon',      name:'Néon',        rarity:'rare',      free:false, icon:'💚', cellBg:'#001a0a',  cellBorder:'#004a1a',  hitBg:'#003a10',  missBg:'#001508',  accent:'#00ff88' },
  space:     { id:'space',     name:'Cosmos',      rarity:'legendary', free:false, icon:'🌌', cellBg:'#05010f',  cellBorder:'#1a0a3a',  hitBg:'#2a0a4a',  missBg:'#0a0520',  accent:'#aa44ff' },
  desert:    { id:'desert',    name:'Désert',      rarity:'rare',      free:false, icon:'🏜️', cellBg:'#1a1000',  cellBorder:'#3a2800',  hitBg:'#4a2800',  missBg:'#2a1800',  accent:'#ffaa00' },
  toxic:     { id:'toxic',     name:'Toxique',     rarity:'epic',      free:false, icon:'☢️', cellBg:'#0a1a00',  cellBorder:'#2a4a00',  hitBg:'#3a5a00',  missBg:'#1a2a00',  accent:'#aaff00' },
  abyss:     { id:'abyss',     name:'Abysses',     rarity:'legendary', free:false, icon:'🕳️', cellBg:'#000005',  cellBorder:'#05001a',  hitBg:'#10003a',  missBg:'#03000f',  accent:'#3300ff' },
}

// ── Ship skins ────────────────────────────────────────────────────
export const SHIP_SKINS = {
  default: {
    id:'default', name:'Standard', rarity:'common', free:true, icon:'⚓',
    carrier:    { bg:'#0e2a4a', border:'#3377bb', color:'#66aaee' },
    battleship: { bg:'#20103a', border:'#7744bb', color:'#aa77ee' },
    cruiser:    { bg:'#0e3a28', border:'#339966', color:'#55cc88' },
    submarine:  { bg:'#0a2e1e', border:'#228855', color:'#44bb77' },
    destroyer:  { bg:'#3a1a08', border:'#aa5522', color:'#ee8844' },
  },
  golden: {
    id:'golden', name:'Flotte Dorée', rarity:'legendary', free:false, icon:'✨',
    carrier:    { bg:'#2a1a00', border:'#ffd700', color:'#ffee44' },
    battleship: { bg:'#2a1500', border:'#ffaa00', color:'#ffcc44' },
    cruiser:    { bg:'#1a1200', border:'#ffcc00', color:'#ffdd44' },
    submarine:  { bg:'#1a1000', border:'#ffbb00', color:'#ffcc33' },
    destroyer:  { bg:'#1a0e00', border:'#ff9900', color:'#ffbb33' },
  },
  ghost: {
    id:'ghost', name:'Flotte Fantôme', rarity:'epic', free:false, icon:'👻',
    carrier:    { bg:'rgba(200,200,255,.07)', border:'rgba(200,200,255,.25)', color:'rgba(220,220,255,.6)' },
    battleship: { bg:'rgba(200,200,255,.07)', border:'rgba(200,200,255,.2)',  color:'rgba(220,220,255,.5)' },
    cruiser:    { bg:'rgba(200,200,255,.07)', border:'rgba(200,200,255,.2)',  color:'rgba(220,220,255,.5)' },
    submarine:  { bg:'rgba(200,200,255,.07)', border:'rgba(200,200,255,.15)', color:'rgba(220,220,255,.4)' },
    destroyer:  { bg:'rgba(200,200,255,.07)', border:'rgba(200,200,255,.15)', color:'rgba(220,220,255,.4)' },
  },
  fire: {
    id:'fire', name:'Flotte de Feu', rarity:'epic', free:false, icon:'🔥',
    carrier:    { bg:'#2a0800', border:'#ff4400', color:'#ff6600' },
    battleship: { bg:'#2a0500', border:'#ff3300', color:'#ff5500' },
    cruiser:    { bg:'#1a0500', border:'#ff5500', color:'#ff7700' },
    submarine:  { bg:'#1a0300', border:'#ff2200', color:'#ff4400' },
    destroyer:  { bg:'#1a0a00', border:'#ff6600', color:'#ff8800' },
  },
  ice: {
    id:'ice', name:'Flotte Glaciale', rarity:'rare', free:false, icon:'❄️',
    carrier:    { bg:'#001a2a', border:'#44aaff', color:'#88ccff' },
    battleship: { bg:'#00152a', border:'#3399ff', color:'#77bbff' },
    cruiser:    { bg:'#001520', border:'#55bbff', color:'#99ddff' },
    submarine:  { bg:'#001020', border:'#2288ff', color:'#66bbff' },
    destroyer:  { bg:'#001525', border:'#66ccff', color:'#aaddff' },
  },
  toxic: {
    id:'toxic', name:'Flotte Toxique', rarity:'rare', free:false, icon:'☣️',
    carrier:    { bg:'#001a00', border:'#44ff00', color:'#88ff44' },
    battleship: { bg:'#001500', border:'#33ee00', color:'#77ee33' },
    cruiser:    { bg:'#001200', border:'#55ff00', color:'#99ff55' },
    submarine:  { bg:'#001000', border:'#22dd00', color:'#66dd22' },
    destroyer:  { bg:'#001500', border:'#66ff00', color:'#aaff66' },
  },
}

// ── All items flat list (for pack pool) ───────────────────────────
export const ALL_ITEMS = [
  ...Object.values(SEA_THEMES).filter(t=>!t.free).map(t=>({...t, type:'sea_theme'})),
  ...Object.values(SHIP_SKINS).filter(s=>!s.free).map(s=>({...s, type:'ship_skin'})),
]

// ── Packs ─────────────────────────────────────────────────────────
export const PACKS = {
  starter: {
    id:'starter', name:'Pack Starter', icon:'🎀', cost:0,
    color:'#00ff88', glow:'rgba(0,255,136,.3)',
    desc:'GRATUIT — 1 objet pour débuter !',
    itemCount:1, rarityPool:['rare'], starterOnly:true,
  },
  basic: {
    id:'basic', name:'Pack Marin', icon:'📦', cost:100,
    color:'#4488ff', glow:'rgba(68,136,255,.3)',
    desc:'3 objets · Communs & Rares',
    itemCount:3, rarityPool:['common','common','rare'],
  },
  epic: {
    id:'epic', name:'Pack Amiral', icon:'🎁', cost:300,
    color:'#aa44ff', glow:'rgba(170,68,255,.4)',
    desc:'3 objets · Rares & Épiques',
    itemCount:3, rarityPool:['rare','rare','epic'],
  },
  legendary: {
    id:'legendary', name:'Pack Légende', icon:'🌟', cost:700,
    color:'#ffd700', glow:'rgba(255,215,0,.5)',
    desc:'3 objets · Épiques & Légendaires',
    itemCount:3, rarityPool:['epic','epic','legendary'],
  },
}

// ── Pick random item by rarity ────────────────────────────────────
export function rollItem(rarity, owned = []) {
  const pool = ALL_ITEMS.filter(i => i.rarity === rarity && !owned.includes(i.id))
  if (pool.length === 0) {
    // All owned — give coins refund marker
    return { id:'coins_refund', type:'coins', name:'Remboursement', rarity, icon:'🪙', refund:50 }
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export function openPack(pack, owned = []) {
  return pack.rarityPool.map(r => rollItem(r, owned))
}

// ── Coin rewards ──────────────────────────────────────────────────
export const COIN_REWARDS = {
  win:   50,
  loss:  10,
  daily: 20,
}
