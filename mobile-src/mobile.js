  <script id="mobile-redesign-script">
    // =========================================================================
    // 6. 휴대폰 전용 보정 (폭 480px 이하에서만 동작)
    //    (1) 16px보다 작은 글씨를 16px로 키운다. (PC·태블릿에서는 원래 크기로 되돌린다)
    //    (2) 한 장 핵심 정리 SVG 포스터를 같은 글·같은 순서의 세로 카드로 다시 짠다.
    //    학습 내용, 순서, 내레이션·효과음 기능은 그대로 둔다.
    // =========================================================================
    (function () {
      const MQ = window.matchMedia('(max-width: 480px)');
      const MIN_PX = 16;
      const FLOOR_ATTR = 'data-m-fs';

      // ---------------------------------------------------------------------
      // (1) 최소 글자 크기 16px
      // ---------------------------------------------------------------------
      function hasOwnText(el) {
        for (const n of el.childNodes) {
          if (n.nodeType === 3 && n.textContent.trim()) return true;
        }
        return false;
      }

      function floorElement(el) {
        if (el.hasAttribute(FLOOR_ATTR)) return;
        if (el.closest('svg, .m-ig')) return;
        const tag = el.tagName;
        const isField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
        if (!isField && !hasOwnText(el)) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (!fs || fs >= MIN_PX) return;
        el.setAttribute(FLOOR_ATTR, el.style.getPropertyValue('font-size') + '|' + el.style.getPropertyPriority('font-size'));
        el.style.setProperty('font-size', MIN_PX + 'px', 'important');
      }

      function floorTree(root) {
        if (!MQ.matches || !root || root.nodeType !== 1) return;
        // 글자 크기를 바꿀 때 transition 애니메이션이 생기지 않게 잠깐 끈다.
        const html = document.documentElement;
        html.classList.add('m-notrans');
        floorElement(root);
        root.querySelectorAll('*').forEach(floorElement);
        void html.offsetWidth;
        html.classList.remove('m-notrans');
      }

      function unfloorAll() {
        document.querySelectorAll('[' + FLOOR_ATTR + ']').forEach(el => {
          const [val, prio] = el.getAttribute(FLOOR_ATTR).split('|');
          el.removeAttribute(FLOOR_ATTR);
          if (val) el.style.setProperty('font-size', val, prio || '');
          else el.style.removeProperty('font-size');
        });
      }

      let pending = new Set();
      let scheduled = false;
      const observer = new MutationObserver(muts => {
        if (!MQ.matches) return;
        for (const m of muts) {
          if (m.type === 'childList') {
            m.addedNodes.forEach(n => { if (n.nodeType === 1) pending.add(n); else if (n.parentElement) pending.add(n.parentElement); });
          } else if (m.type === 'attributes' && m.target.nodeType === 1) {
            pending.add(m.target);
          }
        }
        if (!scheduled) {
          scheduled = true;
          requestAnimationFrame(() => {
            scheduled = false;
            const list = pending; pending = new Set();
            list.forEach(n => { if (n.isConnected) floorTree(n); });
          });
        }
      });

      // ---------------------------------------------------------------------
      // (2) 한 장 핵심 정리: SVG 포스터 → 세로 카드
      // ---------------------------------------------------------------------
      const SVG_NS = 'http://www.w3.org/2000/svg';
      let figSeq = 0;

      function svgSizeToPx(s) {
        if (s >= 36) return 26;
        if (s >= 26) return 22;
        if (s >= 22) return 20;
        if (s >= 19) return 18;
        if (s >= 17) return 17;
        return 16;
      }

      function esc(t) {
        return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      }

      function paintFromFill(fill, svg) {
        if (!fill || fill === 'none') return '';
        const m = /^url\(#([^)]+)\)$/.exec(fill.trim());
        if (!m) return fill;
        const g = svg.querySelector('#' + CSS.escape(m[1]));
        if (!g) return '';
        const stops = [...g.querySelectorAll('stop')].map(s => `${s.getAttribute('stop-color')} ${s.getAttribute('offset') || '0%'}`);
        const vertical = g.getAttribute('x2') === '0' && g.getAttribute('y2') === '1';
        return `linear-gradient(${vertical ? '180deg' : '120deg'}, ${stops.join(', ')})`;
      }

      function isEmojiOnly(t) {
        return /^[\p{Extended_Pictographic}️‍\s]+$/u.test(t) && t.trim().length > 0;
      }

      function isArrowOnly(t) {
        return /^[→⇒➜➔▶►]+$/.test(t.trim());
      }

      function startsWithMarker(t) {
        return /^\s*([•·※\-–▶►✔✓(（[①②③④⑤⑥⑦⑧⑨⑩]|\d+[.)]|[A-Z가-힣]{1,4}\s*[:)]|\p{Extended_Pictographic})/u.test(t);
      }

      function measure(svg) {
        // 숨겨진 SVG는 크기를 잴 수 없으므로 화면 밖에 복제해서 잰다.
        const host = document.createElement('div');
        host.style.cssText = 'position:absolute;left:-10000px;top:0;width:1200px;visibility:hidden;pointer-events:none;';
        const clone = svg.cloneNode(true);
        clone.removeAttribute('id');
        const vbw = (svg.viewBox.baseVal && svg.viewBox.baseVal.width) || 1200;
        clone.setAttribute('width', String(vbw));
        clone.style.width = vbw + 'px';
        host.appendChild(clone);
        document.body.appendChild(host);
        const origEls = [...svg.querySelectorAll('*')];
        const cloneEls = [...clone.querySelectorAll('*')];
        const boxes = new Map();
        cloneEls.forEach((c, i) => {
          if (typeof c.getBBox !== 'function') return;
          try {
            const b = c.getBBox();
            // 그룹 이동(transform)까지 반영해 포스터 전체 좌표로 바꾼다.
            const m = c.getCTM();
            let x1 = b.x, y1 = b.y, x2 = b.x + b.width, y2 = b.y + b.height;
            if (m) {
              const pts = [[x1, y1], [x2, y1], [x1, y2], [x2, y2]].map(([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]);
              x1 = Math.min(...pts.map(q => q[0])); x2 = Math.max(...pts.map(q => q[0]));
              y1 = Math.min(...pts.map(q => q[1])); y2 = Math.max(...pts.map(q => q[1]));
            }
            boxes.set(origEls[i], { x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
          } catch (e) {}
        });
        host.remove();
        return boxes;
      }

      function contains(outer, inner, tol = 2) {
        return inner.x >= outer.x - tol && inner.y >= outer.y - tol &&
          inner.x + inner.w <= outer.x + outer.w + tol && inner.y + inner.h <= outer.y + outer.h + tol;
      }

      function containsPoint(outer, px, py) {
        return px >= outer.x && px <= outer.x + outer.w && py >= outer.y && py <= outer.y + outer.h;
      }

      function buildTree(svg) {
        const boxes = measure(svg);
        const vb = svg.viewBox.baseVal;
        const W = vb && vb.width ? vb.width : 1200;
        const H = vb && vb.height ? vb.height : 1650;
        const root = { kind: 'box', el: null, box: { x: 0, y: 0, w: W, h: H }, children: [], fill: '', stroke: '' };

        const rects = [];
        const texts = [];
        const graphics = [];
        for (const el of svg.children) collect(el);
        function collect(el) {
          const tag = el.tagName.toLowerCase();
          if (tag === 'defs' || tag === 'title' || tag === 'desc') return;
          if (tag === 'g' || tag === 'a') { for (const c of el.children) collect(c); return; }
          const box = boxes.get(el);
          if (!box) return;
          if (tag === 'rect') {
            if (box.w * box.h > W * H * 0.8) return; // 포스터 배경·테두리
            rects.push({ kind: 'box', el, box, children: [], fill: el.getAttribute('fill') || '', stroke: el.getAttribute('stroke') || '' });
          } else if (tag === 'text') {
            texts.push({ kind: 'text', el, box });
          } else if (box.w > 0 || box.h > 0) {
            graphics.push({ kind: 'gfx', el, box });
          }
        }

        const area = n => n.box.w * n.box.h;
        const byArea = [...rects].sort((a, b) => area(a) - area(b));

        function smallestContainer(node, pool, test) {
          for (const r of pool) {
            if (r === node) continue;
            if (area(r) <= area(node) && node.kind === 'box') continue;
            if (test(r)) return r;
          }
          return root;
        }

        rects.forEach(r => { r.parent = smallestContainer(r, byArea, c => contains(c.box, r.box)); });
        texts.forEach(t => {
          const cx = t.box.x + t.box.w / 2, cy = t.box.y + t.box.h / 2;
          t.parent = smallestContainer(t, byArea, c => containsPoint(c.box, cx, cy));
        });
        graphics.forEach(g => {
          const cx = g.box.x + g.box.w / 2, cy = g.box.y + g.box.h / 2;
          g.parent = smallestContainer(g, byArea, c => contains(c.box, g.box, 4) || (area(c) < W * H * 0.3 && containsPoint(c.box, cx, cy)));
        });

        // 그림(선·도형)이 있는 상자는 그림 영역을 잘라 한 덩어리 그림으로 보여준다.
        const figParents = new Map();
        graphics.forEach(g => {
          if (!figParents.has(g.parent)) figParents.set(g.parent, []);
          figParents.get(g.parent).push(g);
        });

        const consumed = new Set();
        const figures = [];
        figParents.forEach((gs, parent) => {
          // 가로줄만 있는 상자는 표(table)이므로 HTML 표로 다시 그린다.
          const isRule = g => g.el.tagName.toLowerCase() === 'line' && Math.abs(g.box.h) < 3;
          if (parent !== root && gs.every(isRule)) { parent.isTable = true; return; }
          const mine = new Set();
          let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
          gs.forEach(g => { x1 = Math.min(x1, g.box.x); y1 = Math.min(y1, g.box.y); x2 = Math.max(x2, g.box.x + g.box.w); y2 = Math.max(y2, g.box.y + g.box.h); });
          let fb = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
          // 그림 영역 안의 글자·작은 상자도 그림에 포함한다.
          const M = 26; // 그림 가장자리에 붙은 이름표까지 함께 묶는다.
          const inside = n => n.parent && isDescendantOf(n, parent) &&
            containsPoint({ x: fb.x - M, y: fb.y - M, w: fb.w + M * 2, h: fb.h + M * 2 }, n.box.x + n.box.w / 2, n.box.y + n.box.h / 2);
          let grew = true;
          while (grew) {
            grew = false;
            [...texts, ...rects].forEach(n => {
              if (consumed.has(n) || n === parent || !inside(n)) return;
              consumed.add(n);
              mine.add(n);
              const nx2 = Math.max(fb.x + fb.w, n.box.x + n.box.w), ny2 = Math.max(fb.y + fb.h, n.box.y + n.box.h);
              const nx1 = Math.min(fb.x, n.box.x), ny1 = Math.min(fb.y, n.box.y);
              if (nx1 < fb.x || ny1 < fb.y || nx2 > fb.x + fb.w || ny2 > fb.y + fb.h) grew = true;
              fb = { x: nx1, y: ny1, w: nx2 - nx1, h: ny2 - ny1 };
            });
          }
          const pad = 8;
          fb = { x: fb.x - pad, y: fb.y - pad, w: fb.w + pad * 2, h: fb.h + pad * 2 };
          const labels = texts.filter(t => mine.has(t));
          const minFont = labels.reduce((m, t) => Math.min(m, parseFloat(t.el.getAttribute('font-size')) || 16), Infinity);
          figures.push({ kind: 'fig', box: fb, parent, labels, minFont });
        });

        function isDescendantOf(n, anc) {
          let p = n.parent;
          while (p) { if (p === anc) return true; p = p.parent; }
          return anc === root;
        }

        rects.forEach(r => { if (!consumed.has(r)) r.parent.children.push(r); });
        texts.forEach(t => { if (!consumed.has(t)) t.parent.children.push(t); });
        figures.forEach(f => f.parent.children.push(f));
        return { root, W };
      }

      function toRows(children) {
        const items = [...children].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
        const rows = [];
        for (const it of items) {
          const cy = it.box.y + it.box.h / 2;
          const row = rows.find(r => cy >= r.top && cy <= r.bottom && it.box.y < r.bottom);
          if (row) {
            row.items.push(it);
            row.top = Math.min(row.top, it.box.y);
            row.bottom = Math.max(row.bottom, it.box.y + it.box.h);
          } else {
            rows.push({ items: [it], top: it.box.y, bottom: it.box.y + it.box.h });
          }
        }
        rows.sort((a, b) => a.top - b.top);
        rows.forEach(r => r.items.sort((a, b) => a.box.x - b.box.x));
        return rows;
      }

      function textStyle(el, inheritFill) {
        const size = parseFloat(el.getAttribute('font-size')) || 16;
        const weight = el.getAttribute('font-weight') || '';
        const fill = el.getAttribute('fill') || inheritFill || '#0F172A';
        return { size, weight, fill };
      }

      function textInner(el) {
        let html = '';
        el.childNodes.forEach(n => {
          if (n.nodeType === 3) html += esc(n.textContent);
          else if (n.nodeType === 1 && n.tagName.toLowerCase() === 'tspan') {
            const fill = n.getAttribute('fill');
            const w = n.getAttribute('font-weight');
            html += `<span style="${fill ? 'color:' + fill + ';' : ''}${w ? 'font-weight:' + w + ';' : ''}">${esc(n.textContent)}</span>`;
          }
        });
        return html;
      }

      function spanFor(t) {
        const st = textStyle(t.el);
        const raw = t.el.textContent;
        const emoji = isEmojiOnly(raw);
        const px = emoji ? Math.max(20, Math.min(24, st.size)) : svgSizeToPx(st.size);
        return {
          st, raw, emoji,
          html: `<span style="color:${st.fill};font-size:${px}px;${st.weight ? 'font-weight:' + st.weight + ';' : ''}">${textInner(t.el)}</span>`
        };
      }

      function renderText(t, parentBox) {
        const s = spanFor(t);
        const anchor = t.el.getAttribute('text-anchor');
        const centered = anchor === 'middle' && parentBox && parentBox.kind === 'box' && parentBox !== null;
        const cls = ['m-ig-t'];
        if (s.emoji) cls.push('is-emoji');
        if (centered) cls.push('is-center');
        if (isArrowOnly(s.raw)) return `<span class="m-ig-t m-ig-arrow">${s.html}</span>`;
        return `<div class="${cls.join(' ')}">${s.html}</div>`;
      }

      function isPill(n) {
        return n.kind === 'box' && n.box.h <= 44 && n.children.length > 0 &&
          n.children.every(c => c.kind === 'text') &&
          (parseFloat(n.el.getAttribute('rx')) || 0) >= n.box.h / 2 - 2;
      }

      function isFigOnly(n) {
        return n.kind === 'fig' || (n.kind === 'box' && n.children.length === 1 && n.children[0].kind === 'fig');
      }

      function isInlineItem(n) {
        return n.kind === 'text' || isPill(n);
      }

      function renderFigure(f, svg, W, avail) {
        avail = avail || 300;
        const id = ++figSeq;
        const clone = svg.cloneNode(true);
        clone.removeAttribute('id');
        clone.removeAttribute('style');
        clone.setAttribute('viewBox', `${f.box.x} ${f.box.y} ${f.box.w} ${f.box.h}`);
        clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('[id]').forEach(e => { e.id = e.id + '-m' + id; });
        clone.querySelectorAll('*').forEach(e => {
          ['fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-end', 'marker-start'].forEach(a => {
            const v = e.getAttribute(a);
            if (v && v.startsWith('url(#')) e.setAttribute(a, v.replace(/url\(#([^)]+)\)/, `url(#$1-m${id})`));
          });
        });
        // 그림 폭: 작은 그림은 1.6배까지만 키우고, 큰 그림은 화면 폭에 맞춘다.
        const maxW = Math.round(f.box.w * 1.6);
        let html = `<div class="m-ig-fig" style="width:${maxW}px">${clone.outerHTML}</div>`;
        // 화면 폭에 맞춰 줄였을 때 그림 속 글씨가 너무 작아지면, 같은 글자를 아래에 크게 다시 적는다.
        const estScale = avail / f.box.w;
        if (f.labels.length && f.minFont * Math.min(1.6, estScale) < 11) {
          const rows = toRows(f.labels);
          const items = [];
          rows.forEach(r => r.items.forEach(t => { const tx = t.el.textContent.trim(); if (tx) items.push(tx); }));
          html += `<ul class="m-ig-figlabels" aria-label="그림 속 글자">${items.map(tx => `<li>${esc(tx)}</li>`).join('')}</ul>`;
        }
        return html;
      }

      function renderBox(n, svg, W, depth) {
        const rows = toRows(n.children);
        let inner = '';
        let prevPara = null; // 이어지는 줄 합치기

        rows.forEach(r => {
          const allInline = r.items.every(isInlineItem);
          if (r.items.length === 1 && r.items[0].kind === 'text') {
            const t = r.items[0];
            const s = spanFor(t);
            const x = t.box.x;
            if (prevPara && !s.emoji && !isArrowOnly(s.raw) && !startsWithMarker(s.raw) &&
                x >= prevPara.x - 3 && x <= prevPara.x + 16 &&
                Math.abs(s.st.size - prevPara.size) <= 2 &&
                t.box.y - prevPara.bottom < s.st.size * 1.2 &&
                prevPara.anchor === (t.el.getAttribute('text-anchor') || 'start')) {
              prevPara.parts.push(s.html);
              prevPara.bottom = t.box.y + t.box.h;
              return;
            }
            flushPara();
            prevPara = { x, size: s.st.size, bottom: t.box.y + t.box.h, anchor: t.el.getAttribute('text-anchor') || 'start', parts: [s.html], t, n };
            return;
          }
          flushPara();
          if (allInline && r.items.length > 1) {
            const centered = r.items.every(it => it.kind === 'text' ? it.el.getAttribute('text-anchor') === 'middle' : false);
            inner += `<div class="m-ig-row${centered ? ' is-center' : ''}">${r.items.map(it => it.kind === 'text' ? renderText(it, n).replace(/^<div/, '<span').replace(/<\/div>$/, '</span>') : renderNode(it, svg, W, depth + 1)).join('')}</div>`;
          } else if (r.items.length > 1 && r.items.every(isFigOnly)) {
            // 나란히 있던 작은 그림들은 두 칸씩 나란히 둔다.
            const n2 = Math.min(2, r.items.length);
            inner += `<div class="m-ig-figrow" style="grid-template-columns:repeat(${n2},minmax(0,1fr))">${r.items.map(it => renderFigure(it.kind === 'fig' ? it : it.children[0], svg, W, 300 / n2)).join('')}</div>`;
          } else {
            r.items.forEach(it => {
              if (it.kind === 'text') inner += renderText(it, n);
              else inner += renderNode(it, svg, W, depth + 1);
            });
          }
        });
        flushPara();

        function flushPara() {
          if (!prevPara) return;
          const p = prevPara;
          prevPara = null;
          const s = spanFor(p.t);
          if (p.parts.length === 1) { inner += renderText(p.t, p.n); return; }
          const centered = p.anchor === 'middle';
          inner += `<div class="m-ig-t${centered ? ' is-center' : ''}">${p.parts.join(' ')}</div>`;
        }

        if (!n.el) return `<div class="m-ig-box">${inner}</div>`;
        const bg = paintFromFill(n.fill, svg);
        const isGrad = /gradient/.test(bg);
        const stroke = n.stroke && n.stroke !== 'none' ? n.stroke : '';
        const strokeW = Math.min(2, parseFloat(n.el.getAttribute('stroke-width')) || 1.5);
        const cls = ['m-ig-box'];
        if (isGrad && depth <= 1) cls.push('is-hero');
        else if (depth <= 1) cls.push('is-section');
        if (n.box.h <= 60 && n.children.every(c => c.kind === 'text')) cls.push('is-chip');
        const style = `${bg ? 'background:' + bg + ';' : ''}${stroke ? `border:${strokeW}px solid ${stroke};` : ''}`;
        return `<div class="${cls.join(' ')}" style="${style}">${inner}</div>`;
      }

      function renderTable(n, svg) {
        const head = n.children.find(c => c.kind === 'box' && c.children.length && c.box.y - n.box.y < 6);
        const bodyTexts = n.children.filter(c => c.kind === 'text');
        const cell = (t, tag) => {
          const st = textStyle(t.el);
          return `<${tag} style="color:${st.fill};${st.weight ? 'font-weight:' + st.weight + ';' : ''}">${textInner(t.el)}</${tag}>`;
        };
        let html = '<table class="m-ig-table">';
        if (head) {
          const bg = paintFromFill(head.fill, svg);
          html += `<thead><tr style="${bg ? 'background:' + bg + ';' : ''}">${toRows(head.children.filter(c => c.kind === 'text')).flatMap(r => r.items).map(t => cell(t, 'th')).join('')}</tr></thead>`;
        }
        html += '<tbody>' + toRows(bodyTexts).map(r => `<tr>${r.items.map(t => cell(t, 'td')).join('')}</tr>`).join('') + '</tbody></table>';
        const stroke = n.stroke && n.stroke !== 'none' ? n.stroke : '#E2E8F0';
        return `<div class="m-ig-tablewrap" style="border-color:${stroke}">${html}</div>`;
      }

      function renderNode(n, svg, W, depth) {
        if (n.kind === 'fig') return renderFigure(n, svg, W);
        if (n.isTable) return renderTable(n, svg);
        if (n.kind === 'text') return renderText(n, null);
        if (!n.children.length) return '';
        if (isPill(n)) {
          const bg = paintFromFill(n.fill, svg);
          const parts = toRows(n.children).flatMap(r => r.items).map(t => spanFor(t).html).join(' ');
          return `<span class="m-ig-pill" style="${bg ? 'background:' + bg + ';' : ''}">${parts}</span>`;
        }
        return renderBox(n, svg, W, depth);
      }

      function buildMobileInfographic() {
        const svg = document.getElementById('summaryInfographicSvg');
        const viewer = document.querySelector('#appViewInfographic .nh-ig-viewer');
        if (!svg || !viewer) return;
        const old = document.querySelector('#appViewInfographic .m-ig');
        if (old) old.remove();
        try {
          figSeq = 0;
          const { root, W } = buildTree(svg);
          const wrap = document.createElement('div');
          wrap.className = 'm-ig';
          wrap.setAttribute('aria-label', '한 장 핵심 정리 (휴대폰용 세로 보기)');
          wrap.innerHTML = renderBox(root, svg, W, 0);
          // 맨 아래 출처 줄은 카드 밖 작은 글씨로
          viewer.parentNode.insertBefore(wrap, viewer.nextSibling);
        } catch (e) {
          // 다시 짜기에 실패하면 원래 포스터를 그대로 보여준다.
          viewer.style.setProperty('display', 'block', 'important');
        }
      }

      // 수업 패키지가 열릴 때마다 휴대폰용 정리 카드를 만든다.
      const origInit = window.initLessonPackage;
      if (typeof origInit === 'function') {
        window.initLessonPackage = function () {
          const r = origInit.apply(this, arguments);
          try { buildMobileInfographic(); } catch (e) {}
          return r;
        };
      }

      function applyMode() {
        if (MQ.matches) {
          floorTree(document.body);
          observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        } else {
          observer.disconnect();
          unfloorAll();
        }
      }

      if (MQ.addEventListener) MQ.addEventListener('change', applyMode);
      else if (MQ.addListener) MQ.addListener(applyMode);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyMode);
      else applyMode();
    })();
  </script>
