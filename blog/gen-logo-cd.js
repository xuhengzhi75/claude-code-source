// Logo 方案 C & D v19 — 最终稳定版
// node gen-logo-cd.js
const fs = require('fs');

function makeSVG(grid, scale, bg, cr_ratio = 0.14) {
  const rows = grid.length;
  const cols = grid[0].length;
  const W = cols * scale;
  const H = rows * scale;
  const CR = Math.round(W * cr_ratio);
  let rects = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = grid[y][x];
      if (!c) continue;
      rects += `<rect x="${x*scale}" y="${y*scale}" width="${scale}" height="${scale}" fill="${c}"/>`;
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <defs><clipPath id="r"><rect width="${W}" height="${H}" rx="${CR}" ry="${CR}"/></clipPath></defs>
  <rect width="${W}" height="${H}" rx="${CR}" ry="${CR}" fill="${bg}"/>
  <g clip-path="url(#r)">${rects}</g>
</svg>`;
}

const _ = null;
const O = '#c0622a';
const L = '#e07840';
const K = '#060300';

// ════════════════════════════════════════════════════════
// 方案 C v19 — 梵高草帽（不变）
// ════════════════════════════════════════════════════════
const C = [
//  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  [ _,  _,  _,  _,  _,  _,  _,  O,  O,  _,  _,  _,  _,  _,  _,  _ ],
  [ _,  _,  _,  _,  _,  _,  O,  L,  L,  O,  _,  _,  _,  _,  _,  _ ],
  [ _,  _,  _,  _,  _,  O,  L,  L,  L,  L,  O,  _,  _,  _,  _,  _ ],
  [ _,  _,  _,  _,  O,  L,  L,  L,  L,  L,  L,  O,  _,  _,  _,  _ ],
  [ O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O ],
  [ O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O ],
  [ _,  _,  _,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  _,  _,  _ ],
  [ _,  _,  _,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  _,  _,  _ ],
  [ _,  _,  _,  O,  O,  K,  K,  O,  O,  O,  K,  K,  O,  _,  _,  _ ],
  [ _,  _,  _,  O,  O,  K,  K,  O,  O,  O,  K,  K,  O,  _,  _,  _ ],
  [ _,  _,  _,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  _,  _,  _ ],
  [ _,  _,  _,  O,  O,  O,  K,  K,  K,  K,  O,  O,  O,  _,  _,  _ ],
  [ _,  _,  _,  O,  O,  O,  O,  O,  O,  O,  O,  O,  O,  _,  _,  _ ],
  [ _,  _,  _,  _,  O,  O,  O,  O,  O,  O,  O,  O,  _,  _,  _,  _ ],
  [ _,  _,  _,  _,  O,  _,  _,  _,  _,  _,  _,  O,  _,  _,  _,  _ ],
  [ _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _ ],
];

// ════════════════════════════════════════════════════════
// 方案 D v19 — CC logo 最终版
//
// 布局（安全区域内）：
//   左C: col1-6 (w=6, h=10)，两侧留1格安全距离
//   右C: col9-14 (w=6, h=10)，右侧留1格安全距离
//   间距: col7-8 (2列)
//   嘴: row12, col2-13 (12列)
//
// 圆角半径 ≈ 16*32*0.14 ≈ 71px ≈ 2.2格
// 所以四角2格内不要放像素，col1/col14在安全区内 ✓
// ════════════════════════════════════════════════════════

const D = Array.from({length: 16}, () => Array(16).fill(null));

function drawThickC(grid, sc, sr, w, h, color) {
  // 顶横（2行）
  for (let x = sc; x < sc + w; x++) { grid[sr][x] = color; grid[sr+1][x] = color; }
  // 底横（2行）
  for (let x = sc; x < sc + w; x++) { grid[sr+h-2][x] = color; grid[sr+h-1][x] = color; }
  // 左竖（2列，中间行）
  for (let y = sr+2; y <= sr+h-3; y++) { grid[y][sc] = color; grid[y][sc+1] = color; }
}

// 左C: col1-6, row1-10 (w=6, h=10)
drawThickC(D, 1, 1, 6, 10, O);
// 右C: col9-14, row1-10 (w=6, h=10)
drawThickC(D, 9, 1, 6, 10, O);
// 嘴: row12（1行），col2-13（12列，居中）
for (let x = 2; x <= 13; x++) D[12][x] = O;

console.log('D grid (左C col1-6, 右C col9-14, 两侧各留1格):');
D.forEach((row, i) => {
  const s = row.map(c => c ? '■' : '·').join('');
  console.log(`row${String(i).padStart(2,'0')}: ${s}`);
});

const svgC = makeSVG(C, 32, '#0f1f3d');
const svgD = makeSVG(D, 32, '#111111');
fs.writeFileSync('/Users/gardon/development/mt/claude-code-source/blog/logo-c.svg', svgC);
fs.writeFileSync('/Users/gardon/development/mt/claude-code-source/blog/logo-d.svg', svgD);
console.log('done');
