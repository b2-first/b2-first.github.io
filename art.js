/* Original flat illustrations for Speaking Part 2 (photo-comparison practice).
   Each scene is a 320×220 SVG string. Drawn from simple shapes; no external assets. */
window.SPEAK_ART = (() => {
  const SK = ['#f3c9a5', '#e0a77c', '#b9784f', '#8a5536', '#f6d7bd'];
  const INK = '#2a2433';

  // A person drawn around their feet (0,0). pose: stand | sit | chair (upper body only, legs hidden)
  function person(x, y, o = {}) {
    const s = o.s || 1, skin = o.skin || SK[0], hair = o.hair || '#3b2a20', top = o.top || '#5b7cfa', bot = o.bottom || '#33405c';
    const pose = o.pose || 'stand', arms = o.arms || 'down', hs = o.hs || 'short';
    const sit = pose === 'sit' || pose === 'chair';
    const bodyTop = sit ? -60 : -74, bodyBot = sit ? -22 : -36, headY = bodyTop - 13;
    let g = '';
    // legs
    if (pose === 'stand') {
      g += `<rect x="-9" y="-38" width="7.5" height="36" rx="3" fill="${bot}"/><rect x="1.5" y="-38" width="7.5" height="36" rx="3" fill="${bot}"/>`;
      g += `<ellipse cx="-6" cy="-1" rx="6" ry="3" fill="${INK}"/><ellipse cx="6" cy="-1" rx="6" ry="3" fill="${INK}"/>`;
    } else if (pose === 'run') {
      g += `<path d="M-3 -38 L-14 -20 L-26 -12" stroke="${bot}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M3 -38 L12 -18 L8 -2" stroke="${bot}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      g += `<ellipse cx="-28" cy="-10" rx="6" ry="3" fill="${INK}" transform="rotate(-30 -28 -10)"/><ellipse cx="12" cy="-1" rx="6" ry="3" fill="${INK}"/>`;
    } else if (pose === 'sit') {
      g += `<ellipse cx="0" cy="-12" rx="22" ry="10" fill="${bot}"/>`;
    }
    // long hair goes behind the head
    if (hs === 'long') g += `<rect x="-13" y="${headY - 4}" width="26" height="${hs === 'long' ? 26 : 0}" rx="8" fill="${hair}"/>`;
    // body
    g += `<rect x="-13" y="${bodyTop}" width="26" height="${bodyBot - bodyTop}" rx="9" fill="${top}"/>`;
    // arms: [shoulderX, shoulderY, handX, handY]
    const sy = bodyTop + 5;
    const A = {
      down: [[-11, sy, -17, bodyBot - 4], [11, sy, 17, bodyBot - 4]],
      up: [[-11, sy, -22, sy - 30], [11, sy, 22, sy - 30]],
      wave: [[-11, sy, -17, bodyBot - 4], [11, sy, 24, sy - 26]],
      point: [[-11, sy, -17, bodyBot - 4], [11, sy, 34, sy - 10]],
      pointL: [[-11, sy, -34, sy - 10], [11, sy, 17, bodyBot - 4]],
      hold: [[-11, sy, -7, sy + 16], [11, sy, 7, sy + 16]],
      type: [[-11, sy, -10, sy + 26], [11, sy, 10, sy + 26]],
      cheers: [[-11, sy, -17, bodyBot - 4], [11, sy, 16, sy - 16]],
      run: [[-11, sy, -22, sy + 18], [11, sy, 22, sy + 4]],
      ride: [[-11, sy, 22, sy + 16], [11, sy, 28, sy + 14]],
      bags: [[-11, sy, -19, bodyBot + 2], [11, sy, 19, bodyBot + 2]]
    }[arms];
    for (const [a, b, c, d] of A) g += `<path d="M${a} ${b} L${c} ${d}" stroke="${top}" stroke-width="7.5" stroke-linecap="round" fill="none"/><circle cx="${c}" cy="${d}" r="3.6" fill="${skin}"/>`;
    // neck + head
    g += `<rect x="-3.5" y="${headY + 7}" width="7" height="8" fill="${skin}"/><circle cx="0" cy="${headY}" r="11" fill="${skin}"/>`;
    // hair cap
    g += `<path d="M-11.6 ${headY + 1} A11.6 11.6 0 0 1 11.6 ${headY + 1} Q5 ${headY - 6} -11.6 ${headY + 1}Z" fill="${hair}"/>`;
    if (hs === 'bun') g += `<circle cx="0" cy="${headY - 13}" r="5.5" fill="${hair}"/>`;
    if (hs === 'cap') g += `<path d="M-12 ${headY - 2} A12 12 0 0 1 12 ${headY - 2}Z" fill="${o.cap || '#e85d4a'}"/><rect x="-2" y="${headY - 4}" width="20" height="4" rx="2" fill="${o.cap || '#e85d4a'}"/>`;
    // face
    g += `<circle cx="-4" cy="${headY + 1}" r="1.4" fill="${INK}"/><circle cx="4" cy="${headY + 1}" r="1.4" fill="${INK}"/><path d="M-3.5 ${headY + 5.5} q3.5 3 7 0" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    if (o.glasses) g += `<g stroke="${INK}" stroke-width="1.2" fill="none"><circle cx="-4" cy="${headY + 1}" r="3.4"/><circle cx="4" cy="${headY + 1}" r="3.4"/><path d="M-0.6 ${headY + 1}h1.2"/></g>`;
    if (o.phones) g += `<path d="M-12 ${headY + 2} A12 12 0 0 1 12 ${headY + 2}" stroke="${INK}" stroke-width="3" fill="none"/><rect x="-15" y="${headY - 1}" width="6" height="9" rx="2.5" fill="${INK}"/><rect x="9" y="${headY - 1}" width="6" height="9" rx="2.5" fill="${INK}"/>`;
    if (o.pack) g = `<rect x="-17" y="${bodyTop - 2}" width="34" height="34" rx="8" fill="${o.pack}"/>` + g;
    return `<g transform="translate(${x} ${y}) scale(${s})">${g}</g>`;
  }
  const svg = (label, body) => `<svg viewBox="0 0 320 220" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const cloud = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".9"><ellipse cx="0" cy="0" rx="20" ry="9"/><ellipse cx="12" cy="-6" rx="13" ry="10"/><ellipse cx="-10" cy="-4" rx="10" ry="8"/></g>`;
  const tree = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-5" y="-40" width="10" height="40" rx="3" fill="#8a5a3b"/><circle cx="0" cy="-58" r="26" fill="#4f9a56"/><circle cx="-16" cy="-46" r="16" fill="#5aab61"/><circle cx="16" cy="-48" r="17" fill="#468c4d"/></g>`;

  const S = {};

  S.classroom = svg('Класс: учительница у доски, ученики за партами', `
    <rect width="320" height="220" fill="#f4ead8"/><rect y="168" width="320" height="52" fill="#c99a6b"/>
    <rect x="120" y="22" width="178" height="92" rx="6" fill="#2f5e4e" stroke="#8a5a3b" stroke-width="6"/>
    <g stroke="#e8f0ea" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".9"><path d="M140 48h60M140 64h86M140 80h44"/><path d="M240 46l18 28h-36z"/><circle cx="270" cy="88" r="10"/></g>
    <rect x="22" y="30" width="56" height="44" rx="4" fill="#bfe2f3" stroke="#fff" stroke-width="4"/><path d="M50 30v44M22 52h56" stroke="#fff" stroke-width="3"/>
    ${person(92, 168, { skin: SK[1], hair: '#5a3a28', hs: 'bun', top: '#c2456b', bottom: '#2f3b52', arms: 'point', s: 1.05 })}
    ${person(60, 214, { pose: 'chair', skin: SK[0], hair: '#e0b04a', top: '#5b7cfa', arms: 'wave', hs: 'long' })}
    ${person(150, 214, { pose: 'chair', skin: SK[2], hair: '#2a1d16', top: '#f0a83a' })}
    ${person(240, 214, { pose: 'chair', skin: SK[4], hair: '#7a4a2c', top: '#43a68a', glasses: true })}
    <g fill="#a8794f"><rect x="18" y="188" width="88" height="10" rx="3"/><rect x="108" y="188" width="88" height="10" rx="3"/><rect x="198" y="188" width="88" height="10" rx="3"/></g>
    <g fill="#8a5a3b"><rect x="22" y="198" width="80" height="22"/><rect x="112" y="198" width="80" height="22"/><rect x="202" y="198" width="80" height="22"/></g>
    <rect x="128" y="182" width="22" height="7" rx="1.5" fill="#fff"/><rect x="232" y="181" width="18" height="8" rx="1.5" fill="#e85d4a"/>`);

  S.online = svg('Молодой человек учится дома онлайн за ноутбуком', `
    <rect width="320" height="220" fill="#e7e3f3"/><rect y="176" width="320" height="44" fill="#b8a98f"/>
    <rect x="200" y="22" width="92" height="76" rx="5" fill="#ffd98a" stroke="#fff" stroke-width="5"/><path d="M246 22v76M200 60h92" stroke="#fff" stroke-width="3"/>
    <g><rect x="22" y="28" width="70" height="104" fill="#a77a55"/><rect x="26" y="34" width="62" height="28" fill="#8a5f40"/><rect x="26" y="68" width="62" height="28" fill="#8a5f40"/><rect x="26" y="102" width="62" height="26" fill="#8a5f40"/>
      <g><rect x="30" y="40" width="8" height="22" fill="#e85d4a"/><rect x="40" y="44" width="7" height="18" fill="#5b7cfa"/><rect x="49" y="38" width="9" height="24" fill="#43a68a"/><rect x="62" y="42" width="7" height="20" fill="#f0a83a"/>
      <rect x="30" y="76" width="9" height="20" fill="#7c5cd6"/><rect x="42" y="72" width="7" height="24" fill="#e0b04a"/><path d="M54 96l14-22 6 3-14 22z" fill="#c2456b"/></g></g>
    ${person(181, 166, { pose: 'chair', skin: SK[1], hair: '#2a1d16', top: '#3f6fd8', arms: 'type', phones: true, s: 1.15 })}
    <rect x="96" y="176" width="190" height="10" rx="3" fill="#8a5a3b"/><rect x="104" y="186" width="10" height="34" fill="#6d4630"/><rect x="268" y="186" width="10" height="34" fill="#6d4630"/>
    <path d="M150 176l8-38h46l8 38z" fill="#9aa3b5"/><circle cx="181" cy="157" r="5" fill="#d9dde6"/>
    <g transform="translate(118 176)"><rect x="-9" y="-16" width="18" height="16" rx="3" fill="#e85d4a"/><path d="M-6 -16c0-12 12-12 12 0" stroke="#e85d4a" stroke-width="3" fill="none"/></g>
    <g transform="translate(262 176)"><rect x="-8" y="-14" width="16" height="14" rx="3" fill="#c97a4a"/><path d="M0 -14c-8-14-16-10-14-22 8 2 12 8 14 22zM0 -14c6-12 14-12 16-22-10 0-14 8-16 22z" fill="#4f9a56"/></g>
    <g transform="translate(224 150)"><path d="M0 26v-26l14-8" stroke="#3a3346" stroke-width="3" fill="none"/><path d="M8 -14l18 4-6 10z" fill="#3a3346"/><ellipse cx="0" cy="26" rx="10" ry="3" fill="#3a3346"/></g>`);

  S.picnic = svg('Семья на пикнике в парке', `
    <rect width="320" height="220" fill="#bfe6f7"/><circle cx="276" cy="38" r="18" fill="#ffd45a"/>${cloud(70, 40)}${cloud(190, 28, .8)}
    <path d="M0 120 Q80 100 160 116 T320 110 V220 H0Z" fill="#7cc56f"/><path d="M0 150 Q100 136 200 150 T320 146 V220 H0Z" fill="#69b25d"/>
    ${tree(40, 132, 1.1)}${tree(292, 126, .85)}
    <path d="M60 196 L250 196 L280 168 L92 168 Z" fill="#e85d4a"/>
    <g fill="#fff" opacity=".85"><path d="M98 168h16l-22 28h-16zM142 168h16l-14 28h-16zM186 168h16l-6 28h-16zM230 168h16l2 28h-16z"/><path d="M80 182h190l-6 6H74z"/></g>
    ${person(120, 182, { pose: 'sit', skin: SK[0], hair: '#7a4a2c', top: '#3f6fd8', bottom: '#33405c', arms: 'down', s: 1.05 })}
    ${person(170, 184, { pose: 'sit', skin: SK[0], hair: '#e0b04a', top: '#c2456b', bottom: '#4b3f6b', hs: 'long', arms: 'hold', s: 1.05 })}
    ${person(212, 186, { pose: 'sit', skin: SK[4], hair: '#e0b04a', top: '#f0a83a', bottom: '#43a68a', arms: 'wave', s: .72 })}
    <g transform="translate(250 176)"><path d="M-16 -16h32l-4 18h-24z" fill="#b8844f"/><path d="M-14 -16c0-14 28-14 28 0" stroke="#8a5a3b" stroke-width="3" fill="none"/><circle cx="-6" cy="-18" r="4" fill="#e85d4a"/><circle cx="3" cy="-19" r="4" fill="#8fd16a"/></g>
    <g transform="translate(150 186)"><ellipse cx="0" cy="0" rx="12" ry="4" fill="#fff"/><circle cx="-3" cy="-2" r="3" fill="#e85d4a"/><circle cx="4" cy="-2" r="3" fill="#ffd45a"/></g>`);

  S.festival = svg('Толпа на музыкальном фестивале под открытым небом', `
    <defs><linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b1f5c"/><stop offset="1" stop-color="#c2456b"/></linearGradient></defs>
    <rect width="320" height="220" fill="url(#fsky)"/>
    <g fill="#fff" opacity=".8"><circle cx="30" cy="24" r="1.4"/><circle cx="90" cy="14" r="1.2"/><circle cx="250" cy="20" r="1.4"/><circle cx="300" cy="44" r="1.1"/><circle cx="180" cy="10" r="1.1"/></g>
    <g opacity=".35"><path d="M70 40 L20 170 L60 170Z" fill="#ffe680"/><path d="M160 34 L130 170 L190 170Z" fill="#8fe0ff"/><path d="M250 40 L260 170 L300 170Z" fill="#ff9be0"/></g>
    <rect x="40" y="96" width="240" height="40" fill="#1d1530"/><rect x="34" y="36" width="252" height="10" fill="#3a2d5c"/><rect x="36" y="46" width="8" height="90" fill="#3a2d5c"/><rect x="276" y="46" width="8" height="90" fill="#3a2d5c"/>
    <g fill="#ffe680"><circle cx="70" cy="46" r="6"/><circle cx="160" cy="46" r="6"/><circle cx="250" cy="46" r="6"/></g>
    <g fill="#e9e2ff"><circle cx="160" cy="76" r="7"/><rect x="152" y="83" width="16" height="13" rx="4"/><path d="M168 86l14-12" stroke="#e9e2ff" stroke-width="4" stroke-linecap="round"/></g>
    <g fill="#ffe680"><rect x="2" y="4" width="4" height="7" transform="translate(90 60) rotate(20)"/><rect x="2" y="4" width="4" height="7" transform="translate(220 70) rotate(-30)"/><rect x="2" y="4" width="4" height="7" transform="translate(120 30) rotate(50)"/><rect x="2" y="4" width="4" height="7" transform="translate(280 90) rotate(10)" fill="#8fe0ff"/><rect x="2" y="4" width="4" height="7" transform="translate(40 80) rotate(-10)" fill="#ff9be0"/></g>
    ${[[20, 0], [56, 1], [92, 0], [128, 1], [164, 0], [200, 1], [236, 0], [272, 1], [306, 0]].map(([x, u]) => person(x, 238, { pose: 'chair', skin: SK[(x / 36 | 0) % 5], hair: ['#2a1d16', '#e0b04a', '#7a4a2c', '#c2456b'][x % 4], top: ['#3f6fd8', '#f0a83a', '#43a68a', '#e85d4a', '#7c5cd6'][(x / 36 | 0) % 5], arms: u ? 'up' : 'wave', s: 1.05, hs: x % 3 ? 'short' : 'long' })).join('')}
    ${[[38, 1], [110, 0], [182, 1], [254, 0]].map(([x, u]) => person(x, 262, { pose: 'chair', skin: SK[(x / 40 | 0) % 5], hair: '#2a1d16', top: ['#c2456b', '#3f6fd8', '#f0a83a', '#43a68a'][(x / 72 | 0) % 4], arms: u ? 'up' : 'cheers', s: 1.25 })).join('')}`);

  S.hiking = svg('Двое друзей в походе в горах', `
    <rect width="320" height="220" fill="#cfeaf7"/><circle cx="60" cy="40" r="16" fill="#ffd45a"/>${cloud(230, 34)}${cloud(130, 22, .7)}
    <path d="M-10 170 L80 60 L130 120 L190 40 L290 160 L330 130 V220 H-10Z" fill="#8aa1b8"/>
    <path d="M80 60 L64 80 L74 78 L82 88 L92 74Z M190 40 L172 64 L184 60 L192 70 L204 58Z" fill="#fff"/>
    <path d="M-10 190 Q90 140 200 170 T330 150 V220 H-10Z" fill="#6fae6a"/>
    <path d="M60 220 Q120 190 170 196 T260 176" stroke="#d9c49a" stroke-width="10" fill="none" stroke-linecap="round"/>
    <g fill="#3f7d48"><path d="M268 178l10-26 10 26z"/><path d="M286 172l8-22 8 22z"/><path d="M24 196l9-24 9 24z"/></g>
    ${person(150, 196, { skin: SK[1], hair: '#2a1d16', top: '#e85d4a', bottom: '#33405c', arms: 'point', pack: '#f0a83a', hs: 'cap', cap: '#3f6fd8' })}
    ${person(196, 186, { skin: SK[0], hair: '#e0b04a', top: '#43a68a', bottom: '#4b3f6b', arms: 'wave', pack: '#7c5cd6', hs: 'long', s: .95 })}
    <path d="M128 196l-6-40" stroke="#6d4630" stroke-width="3" stroke-linecap="round"/>`);

  S.beach = svg('Пара отдыхает на пляже у моря', `
    <rect width="320" height="220" fill="#aee3f5"/><circle cx="262" cy="40" r="20" fill="#ffd45a"/>${cloud(80, 34, .9)}
    <rect y="96" width="320" height="50" fill="#3fa9d8"/><path d="M0 104q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0" stroke="#bfe9fa" stroke-width="3" fill="none"/><path d="M0 124q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0" stroke="#bfe9fa" stroke-width="2" fill="none" opacity=".7"/>
    <path d="M0 140 Q160 124 320 140 V220 H0Z" fill="#f3d9a4"/>
    <g transform="translate(40 150)"><path d="M0 0 Q6-50 4-90" stroke="#8a5a3b" stroke-width="8" fill="none" stroke-linecap="round"/><g fill="#4f9a56"><path d="M4-90 q30-6 44 14 q-26-6-44-14z"/><path d="M4-90 q-30-8-40 10 q22-8 40-10z"/><path d="M4-90 q14-22 38-22 q-20 10-38 22z"/><path d="M4-90 q-12-24-34-26 q18 12 34 26z"/></g></g>
    <path d="M160 70 L160 176" stroke="#6d4630" stroke-width="4"/><path d="M100 92 Q160 40 220 92Z" fill="#e85d4a"/><path d="M130 92 Q160 46 190 92Z" fill="#fff" opacity=".9"/><path d="M152 92 Q160 54 168 92Z" fill="#e85d4a"/>
    <g><path d="M104 176 l20-24 h50 l-6 24z" fill="#3f6fd8"/><path d="M178 176 l20-24 h50 l-6 24z" fill="#f0a83a"/></g>
    <g transform="translate(172 162) rotate(-90)">${person(0, 0, { pose: 'chair', skin: SK[1], hair: '#2a1d16', top: '#43a68a', arms: 'down', glasses: true, s: .95 })}</g>
    <g transform="translate(246 162) rotate(-90)">${person(0, 0, { pose: 'chair', skin: SK[0], hair: '#e0b04a', top: '#c2456b', arms: 'down', hs: 'long', s: .95 })}</g>
    <g transform="translate(272 182)"><rect x="-6" y="-24" width="12" height="24" rx="4" fill="#ffe680"/><path d="M0-24l6-12" stroke="#e85d4a" stroke-width="2"/></g>
    <circle cx="70" cy="192" r="10" fill="#fff"/><path d="M60 192h20M70 182v20" stroke="#e85d4a" stroke-width="3"/>`);

  S.cooking = svg('Семья вместе готовит ужин на кухне', `
    <rect width="320" height="220" fill="#f6eee2"/>
    <g fill="#9fd3c7"><rect x="14" y="16" width="92" height="44" rx="4"/><rect x="214" y="16" width="92" height="44" rx="4"/></g><g fill="#7bbcae"><circle cx="58" cy="38" r="3"/><circle cx="62" cy="38" r="3"/><circle cx="258" cy="38" r="3"/><circle cx="262" cy="38" r="3"/></g>
    <rect x="126" y="20" width="68" height="48" rx="4" fill="#bfe2f3" stroke="#fff" stroke-width="4"/><path d="M160 20v48" stroke="#fff" stroke-width="3"/>
    ${person(96, 190, { skin: SK[2], hair: '#2a1d16', top: '#3f6fd8', bottom: '#33405c', arms: 'hold', s: 1.15 })}
    ${person(156, 190, { skin: SK[2], hair: '#2a1d16', top: '#f0a83a', bottom: '#4b3f6b', arms: 'cheers', hs: 'long', s: .78 })}
    ${person(266, 190, { skin: SK[1], hair: '#5a3a28', top: '#c2456b', bottom: '#33405c', arms: 'pointL', hs: 'bun', s: 1.1 })}
    <rect x="0" y="150" width="320" height="12" fill="#e9e2d6"/><rect x="0" y="162" width="320" height="58" fill="#9fd3c7"/><g stroke="#7bbcae" stroke-width="2"><path d="M80 166v50M160 166v50M240 166v50"/></g><g fill="#5f9d90"><rect x="34" y="186" width="14" height="3" rx="1.5"/><rect x="114" y="186" width="14" height="3" rx="1.5"/><rect x="194" y="186" width="14" height="3" rx="1.5"/><rect x="274" y="186" width="14" height="3" rx="1.5"/></g>
    <g transform="translate(214 150)"><rect x="-20" y="-20" width="40" height="20" rx="4" fill="#5d6275"/><rect x="-24" y="-22" width="48" height="5" rx="2" fill="#4a4f60"/><path d="M-8-30q4-8 0-14M2-30q4-8 0-14M12-30q4-8 0-14" stroke="#c8c3d6" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>
    <g transform="translate(96 150)"><rect x="-26" y="-6" width="52" height="6" rx="2" fill="#c99a6b"/><circle cx="-12" cy="-10" r="6" fill="#e85d4a"/><path d="M2-6l14-10 4 4-12 8z" fill="#f0a83a"/><circle cx="16" cy="-10" r="5" fill="#8fd16a"/></g>
    <g transform="translate(156 150)"><path d="M-12-14h24l-3 14h-18z" fill="#fff"/><path d="M4-14l10-18" stroke="#8a5a3b" stroke-width="3" stroke-linecap="round"/></g>`);

  S.restaurant = svg('Друзья ужинают в ресторане', `
    <rect width="320" height="220" fill="#3a2d3f"/><rect y="0" width="320" height="120" fill="#4a3a52"/>
    <g fill="#5e4a68"><rect x="20" y="20" width="60" height="70" rx="30"/><rect x="240" y="20" width="60" height="70" rx="30"/></g>
    <g><path d="M90 0v28M160 0v22M230 0v28" stroke="#2a2030" stroke-width="2"/><g fill="#ffcf6b"><path d="M78 28h24l-4 12h-16z"/><path d="M148 22h24l-4 12h-16z"/><path d="M218 28h24l-4 12h-16z"/></g><g fill="#ffe680" opacity=".25"><circle cx="90" cy="44" r="26"/><circle cx="160" cy="38" r="26"/><circle cx="230" cy="44" r="26"/></g></g>
    ${person(70, 178, { pose: 'chair', skin: SK[0], hair: '#e0b04a', top: '#43a68a', arms: 'cheers', hs: 'long', s: 1.05 })}
    ${person(130, 172, { pose: 'chair', skin: SK[3], hair: '#2a1d16', top: '#f0a83a', arms: 'wave', s: 1.05 })}
    ${person(192, 172, { pose: 'chair', skin: SK[1], hair: '#7a4a2c', top: '#3f6fd8', arms: 'cheers', glasses: true, s: 1.05 })}
    ${person(252, 178, { pose: 'chair', skin: SK[4], hair: '#c2456b', top: '#7c5cd6', arms: 'down', hs: 'bun', s: 1.05 })}
    <rect x="30" y="150" width="260" height="14" rx="4" fill="#fff"/><path d="M36 164h248l-8 56H44z" fill="#e9e2f0"/>
    <g fill="#fff" stroke="#d6cfe0" stroke-width="2"><ellipse cx="80" cy="150" rx="18" ry="5"/><ellipse cx="240" cy="150" rx="18" ry="5"/></g>
    <g fill="#e85d4a"><circle cx="76" cy="147" r="4"/><circle cx="244" cy="147" r="4" fill="#8fd16a"/></g>
    <g transform="translate(160 150)"><rect x="-22" y="-20" width="44" height="20" rx="4" fill="#f6c1d6"/><rect x="-22" y="-12" width="44" height="4" fill="#fff"/><rect x="-1.5" y="-30" width="3" height="10" fill="#8fe0ff"/><path d="M0-36q4 4 0 6q-4-2 0-6z" fill="#ffcf6b"/></g>
    <g fill="#bfe9fa" opacity=".9"><path d="M110 150v-14h8v14z"/><path d="M204 150v-14h8v14z"/></g>`);

  // shopping bag hanging from a hand at (x, y)
  const bag = (x, y, c) => `<path d="M${x - 5} ${y + 4} q5 -9 10 0" stroke="${INK}" stroke-width="1.6" fill="none"/><rect x="${x - 9}" y="${y + 3}" width="18" height="22" rx="2" fill="${c}"/>`;
  const car = (x, y, c, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-30 -8 v-10 q0 -4 4 -4 h8 l8 -10 h22 l10 10 h8 q4 0 4 4 v10z" fill="${c}"/><path d="M-14 -22 l6 -8 h8 v8z M4 -22 v-8 h8 l7 8z" fill="#cfeaf7"/><circle cx="-18" cy="-6" r="6" fill="${INK}"/><circle cx="18" cy="-6" r="6" fill="${INK}"/></g>`;

  S.football = svg('Футбольный матч: игрок радуется забитому голу', `
    <rect width="320" height="220" fill="#cfeaf7"/>${cloud(70, 22, .8)}
    <rect y="34" width="320" height="58" fill="#8aa1b8"/>
    <g>${Array.from({ length: 3 }, (_, r) => Array.from({ length: 27 }, (_, i) => `<circle cx="${6 + i * 12 + (r % 2) * 6}" cy="${46 + r * 14}" r="4.2" fill="${['#e85d4a', '#3f6fd8', '#f0a83a', '#fff', '#43a68a'][(i * 3 + r) % 5]}"/>`).join('')).join('')}</g>
    <rect y="88" width="320" height="132" fill="#6fae6a"/><g fill="#66a362"><rect x="0" y="88" width="40" height="132"/><rect x="80" y="88" width="40" height="132"/><rect x="160" y="88" width="40" height="132"/><rect x="240" y="88" width="40" height="132"/></g>
    <path d="M320 112 H226 V200 H320" stroke="#fff" stroke-width="3" fill="none" opacity=".85"/>
    <g transform="translate(250 104)"><g stroke="#d8dde6" stroke-width="1"><path d="M8 4h48M8 16h48M8 28h48M8 40h48M8 52h48M14 0v62M26 0v62M38 0v62M50 0v62"/></g><path d="M0 64 V0 H62 V64" stroke="#fff" stroke-width="5" fill="none" stroke-linejoin="round"/></g>
    <g transform="translate(290 150)"><circle r="7" fill="#fff" stroke="${INK}" stroke-width="1.2"/><path d="M0 -3 l3 2 -1 3.4h-4l-1 -3.4z" fill="${INK}"/></g>
    ${person(266, 170, { skin: SK[0], hair: '#7a4a2c', top: '#f0d23a', bottom: INK, arms: 'down', s: .78 })}
    ${person(206, 190, { skin: SK[2], hair: '#2a1d16', top: '#3f6fd8', bottom: '#fff', arms: 'down', s: .88 })}
    ${person(72, 204, { pose: 'run', skin: SK[1], hair: '#5a3a28', top: '#e85d4a', bottom: '#fff', arms: 'run', s: .92 })}
    ${person(140, 208, { skin: SK[3], hair: '#2a1d16', top: '#e85d4a', bottom: '#fff', arms: 'up', s: 1.08 })}`);

  S.running = svg('Девушка одна бегает в парке', `
    <rect width="320" height="220" fill="#d6effa"/><circle cx="262" cy="38" r="17" fill="#ffd45a"/>${cloud(80, 30)}${cloud(190, 50, .7)}
    <path d="M-10 150 Q80 110 170 140 T330 120 V220 H-10Z" fill="#8cc27f"/><path d="M-10 172 Q110 150 200 170 T330 160 V220 H-10Z" fill="#6fae6a"/>
    ${tree(36, 160, .9)}${tree(286, 150, 1.05)}${tree(228, 128, .55)}
    <path d="M-10 214 Q120 178 200 190 T330 176" stroke="#e3d2a8" stroke-width="22" fill="none" stroke-linecap="round"/>
    <g transform="translate(96 156)"><rect x="-26" y="-14" width="52" height="5" rx="2" fill="#8a5a3b"/><rect x="-26" y="-6" width="52" height="5" rx="2" fill="#8a5a3b"/><rect x="-22" y="-1" width="4" height="12" fill="#5d4030"/><rect x="18" y="-1" width="4" height="12" fill="#5d4030"/></g>
    ${person(166, 200, { pose: 'run', skin: SK[0], hair: '#5a3a28', top: '#c2456b', bottom: '#33405c', arms: 'run', hs: 'long', phones: true, s: 1.12 })}`);

  S.cycling = svg('Молодой человек едет на велосипеде по велодорожке в городе', `
    <rect width="320" height="220" fill="#cfeaf7"/>${cloud(250, 24, .8)}
    <g><rect x="0" y="34" width="70" height="110" fill="#e7b38a"/><rect x="70" y="58" width="60" height="86" fill="#9fb7d9"/><rect x="130" y="24" width="74" height="120" fill="#d8a7c4"/><rect x="204" y="50" width="56" height="94" fill="#b7d6a0"/><rect x="260" y="38" width="60" height="106" fill="#e9d38f"/></g>
    <g fill="#fff" opacity=".75">${[[10, 46], [40, 46], [10, 76], [40, 76], [10, 106], [40, 106], [82, 70], [106, 70], [82, 100], [106, 100], [142, 36], [172, 36], [142, 66], [172, 66], [142, 96], [172, 96], [216, 62], [238, 62], [216, 92], [238, 92], [272, 50], [298, 50], [272, 80], [298, 80], [272, 110], [298, 110]].map(([x, y]) => `<rect x="${x}" y="${y}" width="14" height="18" rx="2"/>`).join('')}</g>
    <rect y="144" width="320" height="34" fill="#7d8597"/><g fill="#e9edf3"><rect x="10" y="159" width="26" height="4"/><rect x="70" y="159" width="26" height="4"/><rect x="130" y="159" width="26" height="4"/><rect x="190" y="159" width="26" height="4"/><rect x="250" y="159" width="26" height="4"/></g>
    ${car(40, 176, '#e85d4a', .8)}${car(110, 176, '#3f6fd8', .8)}${car(270, 176, '#f0a83a', .8)}
    <rect y="178" width="320" height="6" fill="#e9edf3"/><rect y="184" width="320" height="36" fill="#5fb07a"/>
    <g fill="#e9fbe9" opacity=".8" transform="translate(262 204)"><circle cx="-10" cy="0" r="6" fill="none" stroke="#e9fbe9" stroke-width="2"/><circle cx="10" cy="0" r="6" fill="none" stroke="#e9fbe9" stroke-width="2"/><path d="M-10 0 L-2 0 L4 -8 L-6 -8Z M4 -8 L10 0" stroke="#e9fbe9" stroke-width="2" fill="none"/></g>
    <g stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="118" cy="196" r="20"/><circle cx="196" cy="196" r="20"/><path d="M118 196 L152 196 L142 158 Z M144 166 L180 160 M152 196 L180 160 L196 196 M180 160 L176 144 M170 142 h12"/></g>
    <ellipse cx="141" cy="155" rx="9" ry="3.5" fill="${INK}"/>
    <path d="M142 150 L166 156 L158 196" stroke="#33405c" stroke-width="7.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="160" cy="197" rx="6" ry="3" fill="${INK}"/>
    ${person(142, 172, { pose: 'chair', skin: SK[1], hair: '#2a1d16', top: '#43a68a', arms: 'ride', hs: 'cap', cap: '#e85d4a' })}`);

  S.bus = svg('Пассажиры стоят в переполненном автобусе', `
    <rect width="320" height="220" fill="#e9edf3"/>
    <rect x="0" y="34" width="320" height="76" fill="#bfe3f5"/><g fill="#9fb7d9"><rect x="10" y="70" width="40" height="40"/><rect x="58" y="56" width="30" height="54"/><rect x="150" y="62" width="44" height="48"/><rect x="236" y="50" width="34" height="60"/><rect x="280" y="74" width="40" height="36"/></g>
    <g fill="#c9cfdb"><rect x="0" y="30" width="320" height="6"/><rect x="0" y="108" width="320" height="8"/><rect x="100" y="30" width="8" height="86"/><rect x="210" y="30" width="8" height="86"/></g>
    <rect x="0" y="14" width="320" height="5" rx="2" fill="#8a93a6"/>
    <g stroke="#8a93a6" stroke-width="2" fill="none">${[70, 128, 186, 244, 302].map(x => `<path d="M${x} 18 v52"/><circle cx="${x}" cy="76" r="6"/>`).join('')}</g>
    <rect x="18" y="14" width="6" height="206" fill="#f0c43a"/><rect x="292" y="14" width="6" height="206" fill="#f0c43a"/>
    <rect y="196" width="320" height="24" fill="#9aa1ad"/>
    ${person(76, 198, { skin: SK[4], hair: '#5a3a28', top: '#e9a0b8', bottom: '#33405c', hs: 'bun', s: .9 })}${person(192, 198, { skin: SK[1], hair: '#2a1d16', top: '#9fb7d9', bottom: '#4b3f6b', s: .9 })}${person(250, 198, { skin: SK[0], hair: '#e0b04a', top: '#d9c49a', bottom: '#33405c', hs: 'long', s: .88 })}
    ${person(46, 206, { skin: SK[0], hair: '#e0b04a', top: '#7c5cd6', bottom: '#33405c', arms: 'wave', hs: 'long', s: 1.02 })}
    ${person(104, 210, { skin: SK[2], hair: '#2a1d16', top: '#3f6fd8', bottom: '#4b3f6b', arms: 'wave', glasses: true, s: 1.06 })}
    ${person(162, 208, { skin: SK[1], hair: '#5a3a28', top: '#e85d4a', bottom: '#33405c', arms: 'wave', phones: true, s: 1.04 })}
    ${person(220, 210, { skin: SK[3], hair: '#2a1d16', top: '#43a68a', bottom: '#33405c', arms: 'wave', hs: 'bun', s: 1.06 })}
    ${person(278, 208, { skin: SK[4], hair: '#7a4a2c', top: '#f0a83a', bottom: '#4b3f6b', arms: 'hold', s: 1.02 })}
    <rect x="274" y="146" width="9" height="14" rx="2" fill="${INK}"/>`);

  S.market = svg('Женщина покупает фрукты на уличном рынке', `
    <rect width="320" height="220" fill="#d6effa"/>${cloud(60, 20, .7)}
    <g><rect x="0" y="40" width="80" height="120" fill="#e7b38a"/><rect x="250" y="30" width="70" height="130" fill="#d8a7c4"/></g>
    <rect y="160" width="320" height="60" fill="#d9cdb8"/>
    <rect x="96" y="40" width="6" height="140" fill="#8a5a3b"/><rect x="284" y="40" width="6" height="140" fill="#8a5a3b"/>
    ${person(192, 164, { skin: SK[2], hair: '#2a1d16', top: '#43a68a', bottom: '#33405c', arms: 'down', hs: 'cap', cap: '#f0a83a', s: .95 })}
    <g>${Array.from({ length: 8 }, (_, i) => `<path d="M${90 + i * 26} 30 h26 v22 q-13 10 -26 0z" fill="${i % 2 ? '#fff' : '#e85d4a'}"/>`).join('')}</g>
    <rect x="96" y="126" width="194" height="58" rx="3" fill="#b07a4f"/><rect x="96" y="126" width="194" height="6" fill="#8a5a3b"/>
    <g>${[[120, '#f08a2c'], [160, '#e04a3a'], [200, '#8fd16a'], [240, '#ffd45a'], [270, '#7c5cd6']].map(([x, c]) => `<rect x="${x - 17}" y="112" width="34" height="16" rx="2" fill="#d7a874"/>` + [[-9, 108], [0, 106], [9, 108], [-4, 101], [5, 101]].map(([dx, y]) => `<circle cx="${x + dx}" cy="${y}" r="5.5" fill="${c}"/>`).join('')).join('')}</g>
    <g fill="#fff">${[120, 160, 200, 240].map(x => `<rect x="${x - 7}" y="132" width="14" height="9" rx="1.5"/>`).join('')}</g>
    ${person(56, 210, { skin: SK[0], hair: '#7a4a2c', top: '#3f6fd8', bottom: '#4b3f6b', arms: 'point', hs: 'long', s: 1.1 })}
    ${bag(37, 166, '#f6d7bd')}`);

  S.mall = svg('Две подруги с покупками в торговом центре', `
    <rect width="320" height="220" fill="#eef0f6"/>
    <rect y="0" width="320" height="70" fill="#dfe3ee"/>
    <g><rect x="16" y="10" width="86" height="46" rx="3" fill="#c7e7f5"/><rect x="118" y="10" width="86" height="46" rx="3" fill="#f6d7e6"/><rect x="220" y="10" width="86" height="46" rx="3" fill="#dff1d8"/></g>
    ${person(150, 62, { skin: SK[1], hair: '#2a1d16', top: '#7c5cd6', bottom: '#33405c', s: .45 })}${person(250, 62, { skin: SK[0], hair: '#e0b04a', top: '#43a68a', bottom: '#33405c', hs: 'long', s: .45 })}
    <rect y="62" width="320" height="10" fill="#b7bdcc"/><g stroke="#9aa1b4" stroke-width="2"><path d="M0 52 H320"/>${Array.from({ length: 17 }, (_, i) => `<path d="M${i * 20} 52 v10"/>`).join('')}</g>
    <g><rect x="10" y="84" width="130" height="86" rx="3" fill="#c7e7f5"/><rect x="10" y="78" width="130" height="14" rx="3" fill="#e85d4a"/><rect x="180" y="84" width="130" height="86" rx="3" fill="#f6d7e6"/><rect x="180" y="78" width="130" height="14" rx="3" fill="#3f6fd8"/></g>
    <g fill="#fff" opacity=".85"><rect x="30" y="82" width="50" height="6" rx="3"/><rect x="200" y="82" width="60" height="6" rx="3"/></g>
    <g><path d="M40 168 v-46 q0 -8 10 -8 q10 0 10 8 v46z" fill="#f0a83a"/><path d="M90 168 v-46 q0 -8 10 -8 q10 0 10 8 v46z" fill="#43a68a"/><path d="M214 168 v-46 q0 -8 10 -8 q10 0 10 8 v46z" fill="#7c5cd6"/><path d="M264 168 v-46 q0 -8 10 -8 q10 0 10 8 v46z" fill="#e85d4a"/></g>
    <rect y="170" width="320" height="50" fill="#d4d8e3"/><g stroke="#c3c8d6" stroke-width="2"><path d="M0 194 H320M60 170 L40 220M140 170 L130 220M220 170 L230 220M290 170 L310 220"/></g>
    <g transform="translate(160 176)"><path d="M-12 0 l4 -22 h16 l4 22z" fill="#b07a4f"/><circle cx="0" cy="-34" r="16" fill="#5aab61"/><circle cx="-10" cy="-26" r="10" fill="#4f9a56"/><circle cx="10" cy="-28" r="11" fill="#468c4d"/></g>
    ${person(116, 208, { skin: SK[0], hair: '#e0b04a', top: '#c2456b', bottom: '#33405c', arms: 'bags', hs: 'long', s: 1.08 })}
    ${bag(96, 171, '#f0a83a')}${bag(137, 171, '#fff')}
    ${person(206, 210, { skin: SK[2], hair: '#2a1d16', top: '#f0a83a', bottom: '#4b3f6b', arms: 'bags', hs: 'bun', s: 1.08 })}
    ${bag(186, 173, '#7c5cd6')}${bag(227, 173, '#43a68a')}`);

  return S;
})();
