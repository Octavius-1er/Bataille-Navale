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

  // ── Pack Secret items ─────────────────────────────────────────────
  rouge: (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" fill="#0a0000"/>
    <path d="M0 34 Q8 26 16 32 Q24 38 32 30 Q40 22 48 28V48H0Z" fill="#3a0000"/>
    <path d="M0 38 Q10 30 20 36 Q30 42 40 34 Q44 31 48 33V48H0Z" fill="#6a0000"/>
    <path d="M0 42 Q12 34 24 40 Q36 46 48 38V48H0Z" fill="#cc0000" opacity="0.7"/>
    <path d="M0 44 Q12 38 24 43 Q36 48 48 42V48H0Z" fill="#ff0000" opacity="0.4"/>
    <circle cx="8" cy="8" r="1" fill="#ff3333" opacity="0.6"/>
    <circle cx="20" cy="5" r="0.8" fill="#ff1111" opacity="0.4"/>
    <circle cx="35" cy="10" r="1.2" fill="#ff2222" opacity="0.5"/>
    <circle cx="42" cy="6" r="0.7" fill="#ff4444" opacity="0.3"/>
    <path d="M22 14 L24 8 L26 14 L32 16 L26 18 L24 24 L22 18 L16 16 Z" fill="#ff0000" opacity="0.9"/>
    <path d="M22 14 L24 8 L26 14 L32 16 L26 18 L24 24 L22 18 L16 16 Z" fill="none" stroke="#ff6666" stroke-width="0.5"/>
  </svg>`,

  lunar: (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" fill="#04030f"/>
    <circle cx="8" cy="6" r="1" fill="white" opacity="0.9"/>
    <circle cx="18" cy="3" r="0.6" fill="white" opacity="0.7"/>
    <circle cx="30" cy="7" r="0.8" fill="white" opacity="0.8"/>
    <circle cx="42" cy="4" r="1" fill="white" opacity="0.6"/>
    <circle cx="44" cy="14" r="0.5" fill="white" opacity="0.5"/>
    <circle cx="5" cy="22" r="0.7" fill="white" opacity="0.6"/>
    <circle cx="38" cy="20" r="0.6" fill="white" opacity="0.4"/>
    <circle cx="14" cy="16" r="0.5" fill="white" opacity="0.5"/>
    <circle cx="24" cy="12" r="29" fill="none" stroke="#c8d4ff" stroke-width="0.3" opacity="0.2"/>
    <path d="M32 24 A12 12 0 1 1 20 24 A8 8 0 1 0 32 24Z" fill="#c8d4ff" opacity="0.85"/>
    <circle cx="20" cy="20" r="2" fill="#a0b0d8" opacity="0.5"/>
    <circle cx="26" cy="26" r="3" fill="#a0b0d8" opacity="0.4"/>
    <circle cx="22" cy="28" r="1.5" fill="#9090c0" opacity="0.4"/>
    <circle cx="28" cy="19" r="1" fill="#a0b0d8" opacity="0.3"/>
    <ellipse cx="8" cy="40" rx="8" ry="3" fill="#1a1a3a" opacity="0.8"/>
    <ellipse cx="8" cy="38" rx="5" ry="2" fill="#2a2a5a" opacity="0.6"/>
    <ellipse cx="40" cy="43" rx="6" ry="2.5" fill="#1a1a3a" opacity="0.7"/>
    <ellipse cx="24" cy="45" rx="10" ry="3" fill="#0d0d2a" opacity="0.9"/>
    <path d="M4 38 Q8 34 12 38 Q16 42 20 38" fill="none" stroke="#3a3a6a" stroke-width="0.5" opacity="0.6"/>
  </svg>`,

  brainrot: (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" fill="#0a001a"/>
    <path d="M6 34 L10 26 L38 26 L42 34 L24 38Z" fill="#2a0050"/>
    <path d="M6 34 L10 26 L38 26 L42 34 L24 38Z" fill="none" stroke="#ff00ff" stroke-width="1"/>
    <rect x="18" y="18" width="12" height="10" rx="1" fill="#1a0040" stroke="#cc00ff" stroke-width="0.8"/>
    <rect x="22" y="12" width="4" height="8" fill="#2a0060" stroke="#ff44ff" stroke-width="0.7"/>
    <circle cx="20" cy="30" r="2" fill="#ff00ff" opacity="0.9"/>
    <circle cx="28" cy="30" r="2" fill="#00ffff" opacity="0.9"/>
    <text x="19" y="31.5" font-size="3" fill="white" font-family="monospace">😭</text>
    <text x="27" y="31.5" font-size="3" fill="white" font-family="monospace">💀</text>
    <path d="M10 26 Q12 22 14 26" fill="none" stroke="#ff00ff" stroke-width="1.5"/>
    <path d="M34 26 Q36 22 38 26" fill="none" stroke="#00ffff" stroke-width="1.5"/>
    <circle cx="8" cy="10" r="3" fill="#ff00aa" opacity="0.8"/>
    <text x="5.5" y="12" font-size="4" fill="white">🗿</text>
    <circle cx="40" cy="8" r="3" fill="#00ffaa" opacity="0.7"/>
    <text x="37.5" y="10" font-size="4" fill="white">💅</text>
    <circle cx="24" cy="6" r="3" fill="#ffaa00" opacity="0.8"/>
    <text x="21.5" y="8" font-size="4" fill="white">🤙</text>
    <path d="M8 34 L6 38 M12 35 L11 39 M36 35 L37 39 M40 34 L42 38" stroke="#ff00ff" stroke-width="0.8" opacity="0.5"/>
  </svg>`,

  astronaut: (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" fill="#020510"/>
    <circle cx="6" cy="8" r="0.8" fill="white" opacity="0.9"/>
    <circle cx="15" cy="4" r="0.5" fill="white" opacity="0.7"/>
    <circle cx="28" cy="6" r="0.9" fill="white" opacity="0.8"/>
    <circle cx="40" cy="3" r="0.6" fill="white" opacity="0.6"/>
    <circle cx="44" cy="12" r="0.7" fill="white" opacity="0.5"/>
    <circle cx="3" cy="18" r="0.5" fill="white" opacity="0.4"/>
    <circle cx="45" cy="22" r="0.4" fill="#88aaff" opacity="0.6"/>
    <path d="M6 34 L10 26 L38 26 L42 34 L24 38Z" fill="#1a2a4a" stroke="#aaccff" stroke-width="1"/>
    <rect x="17" y="18" width="14" height="10" rx="2" fill="#0a1a3a" stroke="#88aaff" stroke-width="0.9"/>
    <rect x="21" y="12" width="6" height="8" rx="1" fill="#1a2a4a" stroke="#aaccff" stroke-width="0.8"/>
    <circle cx="24" cy="16" r="3" fill="#0a1020" stroke="#00d4ff" stroke-width="0.8"/>
    <circle cx="24" cy="16" r="2" fill="#061525" opacity="0.8"/>
    <path d="M22.5 15 L25.5 15 M24 13.5 L24 16.5" stroke="#00d4ff" stroke-width="0.5" opacity="0.6"/>
    <rect x="10" y="22" width="4" height="6" rx="1" fill="#1a2a4a" stroke="#88aaff" stroke-width="0.6"/>
    <rect x="34" y="22" width="4" height="6" rx="1" fill="#1a2a4a" stroke="#88aaff" stroke-width="0.6"/>
    <circle cx="20" cy="30" r="1.5" fill="#00d4ff" opacity="0.9"/>
    <circle cx="28" cy="30" r="1.5" fill="#00d4ff" opacity="0.9"/>
    <path d="M8 36 Q12 32 16 36" fill="none" stroke="#88aaff" stroke-width="0.8" opacity="0.5"/>
    <path d="M32 36 Q36 32 40 36" fill="none" stroke="#88aaff" stroke-width="0.8" opacity="0.5"/>
    <circle cx="38" cy="10" r="4" fill="none" stroke="#3366ff" stroke-width="0.5" opacity="0.4"/>
    <circle cx="38" cy="10" r="6" fill="none" stroke="#2244cc" stroke-width="0.3" opacity="0.3"/>
    <path d="M36 8 L40 12 M40 8 L36 12" stroke="#4488ff" stroke-width="0.4" opacity="0.3"/>
  </svg>`,

  egyptian: (s=48) => `<svg width="${s}" height="${s}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" fill="#0f0800"/>
    <path d="M0 44 Q24 36 48 44V48H0Z" fill="#1a1000"/>
    <path d="M0 46 Q24 40 48 46V48H0Z" fill="#2a1800" opacity="0.8"/>
    <path d="M6 34 L10 26 L38 26 L42 34 L24 38Z" fill="#1a1000" stroke="#c8a000" stroke-width="1.2"/>
    <rect x="17" y="18" width="14" height="10" rx="0" fill="#0f0800" stroke="#c8a000" stroke-width="1"/>
    <rect x="21" y="12" width="6" height="8" fill="#1a1000" stroke="#c8a000" stroke-width="0.9"/>
    <path d="M24 8 L22 12 L26 12 Z" fill="#c8a000"/>
    <path d="M20 20 L22 18 L24 22 L26 18 L28 20" fill="none" stroke="#c8a000" stroke-width="0.8"/>
    <circle cx="24" cy="30" r="1.5" fill="#c8a000"/>
    <path d="M22 27 Q24 25 26 27" fill="none" stroke="#c8a000" stroke-width="0.6"/>
    <circle cx="20" cy="30" r="1" fill="#44aaff" opacity="0.9"/>
    <circle cx="28" cy="30" r="1" fill="#44aaff" opacity="0.9"/>
    <path d="M9 26 L6 34" stroke="#c8a000" stroke-width="0.5" opacity="0.5"/>
    <path d="M39 26 L42 34" stroke="#c8a000" stroke-width="0.5" opacity="0.5"/>
    <polygon points="10,20 14,8 18,20" fill="#c8a000" opacity="0.8"/>
    <polygon points="34,20 38,8 30,20" fill="none" stroke="#c8a000" stroke-width="0.6" opacity="0.5"/>
    <circle cx="38" cy="6" r="3" fill="#c8a000" opacity="0.9"/>
    <path d="M36 6 L40 6 M38 4 L38 8" stroke="#ffee44" stroke-width="1" stroke-linecap="round"/>
    <path d="M6 40 L8 36 M12 41 L13 37 M36 41 L35 37 M42 40 L40 36" stroke="#c8a000" stroke-width="0.5" opacity="0.4"/>
  </svg>`,
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
  rouge:     { id:'rouge',     name:'Mer Rouge',   rarity:'legendary', free:false, secret:true, icon:'🩸', cellBg:'#0a0000',  cellBorder:'#3a0000',  hitBg:'#5a0000',  missBg:'#200000',  accent:'#ff0000' },
  lunar:     { id:'lunar',     name:'Mer Lunaire', rarity:'legendary', free:false, secret:true, icon:'🌙', cellBg:'#04030f',  cellBorder:'#1a1a3a',  hitBg:'#2a2a5a',  missBg:'#0d0d20',  accent:'#c8d4ff',
    // Extra déco lunaire — cratères et étoiles dans les cellules
    cellDecor: true,
  },
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
  brainrot: {
    id:'brainrot', name:'Flotte Brainrot', rarity:'legendary', free:false, secret:true, icon:'🗿',
    carrier:    { bg:'#1a0030', border:'#ff00ff', color:'#ff66ff' },
    battleship: { bg:'#001a30', border:'#00ffff', color:'#66ffff' },
    cruiser:    { bg:'#1a1a00', border:'#ffff00', color:'#ffff66' },
    submarine:  { bg:'#300010', border:'#ff0055', color:'#ff5588' },
    destroyer:  { bg:'#001a10', border:'#00ff88', color:'#66ffaa' },
    patrol:     { bg:'#100030', border:'#aa00ff', color:'#cc66ff' },
  },
  astronaut: {
    id:'astronaut', name:'Flotte Astronaute', rarity:'epic', free:false, secret:true, icon:'👨‍🚀',
    carrier:    { bg:'#0a1020', border:'#aaccff', color:'#cce0ff' },
    battleship: { bg:'#080e1a', border:'#88aaff', color:'#aaccff' },
    cruiser:    { bg:'#0a1228', border:'#00d4ff', color:'#66eeff' },
    submarine:  { bg:'#060c18', border:'#4488ff', color:'#88bbff' },
    destroyer:  { bg:'#0a1020', border:'#6699ff', color:'#99bbff' },
    patrol:     { bg:'#080e1a', border:'#3366ff', color:'#7799ff' },
  },
  egyptian: {
    id:'egyptian', name:'Flotte Égyptienne', rarity:'epic', free:false, secret:true, icon:'𓂀',
    carrier:    { bg:'#1a1000', border:'#c8a000', color:'#ffd700' },
    battleship: { bg:'#150d00', border:'#aa8800', color:'#ddbb00' },
    cruiser:    { bg:'#1a1000', border:'#c8a000', color:'#ffcc00' },
    submarine:  { bg:'#0f0800', border:'#886600', color:'#ccaa00' },
    destroyer:  { bg:'#1a1000', border:'#c8a000', color:'#eebb00' },
    patrol:     { bg:'#150d00', border:'#aa8800', color:'#ddaa00' },
  },
}

// ── All items flat list (for pack pool) ───────────────────────────
export const ALL_ITEMS = [
  ...Object.values(SEA_THEMES).filter(t=>!t.free && !t.secret).map(t=>({...t, type:'sea_theme'})),
  ...Object.values(SHIP_SKINS).filter(s=>!s.free && !s.secret).map(s=>({...s, type:'ship_skin'})),
]

// ── Secret items (only in secret pack) ───────────────────────────
export const SECRET_ITEMS = [
  ...Object.values(SEA_THEMES).filter(t=>t.secret).map(t=>({...t, type:'sea_theme'})),
  ...Object.values(SHIP_SKINS).filter(s=>s.secret).map(s=>({...s, type:'ship_skin'})),
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
  secret: {
    id:'secret', name:'Pack Secret', icon:'🔮', cost:100,
    color:'#ff0055', glow:'rgba(255,0,85,.6)',
    desc:'5 OBJETS EXCLUSIFS — Introuvables ailleurs !',
    itemCount:5, rarityPool:['legendary','legendary','legendary','legendary','legendary'],
    secret:true,
  },
}

// ── Pick random item by rarity ────────────────────────────────────
export function rollItem(rarity, owned = [], secretPool = false) {
  const pool = (secretPool ? SECRET_ITEMS : ALL_ITEMS).filter(i => i.rarity === rarity && !owned.includes(i.id))
  if (pool.length === 0) {
    return { id:'coins_refund', type:'coins', name:'Remboursement', rarity, icon:'🪙', refund:50 }
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export function openPack(pack, owned = []) {
  const isSecret = !!pack.secret
  return pack.rarityPool.map(r => rollItem(r, owned, isSecret))
}

// ── Coin rewards ──────────────────────────────────────────────────
export const COIN_REWARDS = {
  win:   50,
  loss:  10,
  daily: 20,
}
