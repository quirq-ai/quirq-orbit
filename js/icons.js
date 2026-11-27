// ==================================================================
// ICONS
// drawIcon: canvas masks that become the dot patterns on each globe.
// svg: small inline icons for the UI.
// ==================================================================

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function knockout(ctx, fn) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  fn();
  ctx.restore();
}

export function drawIcon(ctx, id, S) {
  const s = S / 256;
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (id) {
    case 'code': {
      // a window with </> knocked out
      roundRect(ctx, 22, 46, 212, 164, 30);
      ctx.fill();
      knockout(ctx, () => {
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(96, 92); ctx.lineTo(60, 128); ctx.lineTo(96, 164);
        ctx.moveTo(160, 92); ctx.lineTo(196, 128); ctx.lineTo(160, 164);
        ctx.moveTo(140, 82); ctx.lineTo(116, 174);
        ctx.stroke();
      });
      break;
    }
    case 'xo': {
      // the XO mark: two pairs of chevrons
      ctx.lineWidth = 30;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(14, 70); ctx.lineTo(66, 128); ctx.lineTo(14, 186);
      ctx.moveTo(122, 70); ctx.lineTo(70, 128); ctx.lineTo(122, 186);
      ctx.moveTo(186, 70); ctx.lineTo(134, 128); ctx.lineTo(186, 186);
      ctx.moveTo(190, 70); ctx.lineTo(242, 128); ctx.lineTo(190, 186);
      ctx.stroke();
      break;
    }
    case 'spark': {
      // four-point star with a small companion
      ctx.beginPath();
      const star = (cx, cy, r, w) => {
        ctx.moveTo(cx, cy - r);
        ctx.quadraticCurveTo(cx + w, cy - w, cx + r, cy);
        ctx.quadraticCurveTo(cx + w, cy + w, cx, cy + r);
        ctx.quadraticCurveTo(cx - w, cy + w, cx - r, cy);
        ctx.quadraticCurveTo(cx - w, cy - w, cx, cy - r);
      };
      star(118, 136, 96, 20);
      star(204, 54, 36, 8);
      ctx.fill();
      break;
    }
    case 'q': {
      // the quirq mark
      const q = new Path2D('M50 0A50 50 0 0 1 100 50V118A14 14 0 0 1 86 132A14 14 0 0 1 72 118V94.87A50 50 0 1 1 50 0ZM50 33A17 17 0 1 0 50 67A17 17 0 1 0 50 33Z');
      ctx.translate(52, 22);
      ctx.scale(1.58, 1.58);
      ctx.fill(q, 'evenodd');
      break;
    }
    case 'checklist': {
      roundRect(ctx, 30, 30, 196, 196, 28);
      ctx.fill();
      knockout(ctx, () => {
        ctx.lineWidth = 14;
        for (const y of [80, 128, 176]) {
          ctx.beginPath();
          ctx.moveTo(56, y); ctx.lineTo(68, y + 12); ctx.lineTo(90, y - 12);
          ctx.stroke();
          ctx.fillRect(110, y - 8, 90, 16);
        }
      });
      break;
    }
    case 'doc': {
      roundRect(ctx, 52, 24, 152, 208, 22);
      ctx.fill();
      knockout(ctx, () => {
        ctx.fillRect(78, 62, 100, 18);
        ctx.fillRect(78, 98, 100, 14);
        ctx.fillRect(78, 128, 100, 14);
        ctx.fillRect(78, 158, 64, 14);
      });
      break;
    }
    case 'lens': {
      // a magnifier: research
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.arc(110, 110, 66, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 42;
      ctx.beginPath();
      ctx.moveTo(162, 162); ctx.lineTo(220, 220);
      ctx.stroke();
      break;
    }
    case 'play': {
      roundRect(ctx, 16, 54, 224, 148, 42);
      ctx.fill();
      knockout(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(104, 88); ctx.lineTo(172, 128); ctx.lineTo(104, 168);
        ctx.closePath();
        ctx.fill();
      });
      break;
    }
    default: {
      ctx.beginPath();
      ctx.arc(128, 128, 90, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const P = {
  code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  rocket: '<path d="M14 4c3 0 6 3 6 6l-7 7-6-6 7-7z"/><path d="M7 11l-3 1-1 4 4-1M13 17l-1 3-4 1 1-4"/><circle cx="15" cy="9" r="1.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 14h9"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  cart: '<path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  portal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 9v11"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v4"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  memory: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4.5A2.5 2.5 0 0 0 9 4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  msg: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h-.5A1 1 0 0 1 4 15z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  ext: '<path d="M7 17L17 7M9 7h8v8"/>',
  github: '<path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/>',
  x: '<path fill="currentColor" stroke="none" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/>',
  linkedin: '<path fill="currentColor" stroke="none" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4z"/>',
  youtube: '<path fill="currentColor" stroke="none" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.8 15.1V8.9l5.8 3.1-5.8 3.1z"/>',
};

export function svg(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}
