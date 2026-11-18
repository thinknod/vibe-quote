/* app.js : 동작. 고칠 거리는 data.js에 두고 여기서는 읽기만 해요 */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const won = (n) => Math.round(n).toLocaleString('ko-KR') + '원';
  const KEY = 'quote:lines';
  const MAT = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
  const FIN = Object.fromEntries(FINISHES.map((f) => [f.id, f]));
  const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

  // ---------- 계산 (한 곳) ----------
  const tierOf = (qty) => [...TIERS].sort((a, b) => b.qty - a.qty).find((t) => qty >= t.qty) || { qty: 0, off: 0 };
  function price(line) {
    const it = ITEM[line.item], m = MAT[line.mat], f = FIN[line.fin];
    const unit = Math.ceil((it.base * m.rate * (1 + f.rate)) / 10) * 10;          // 10원 단위 올림
    const tier = tierOf(line.qty);
    let amount = unit * line.qty * (1 - tier.off);
    if (line.rush) amount *= 1 + RUSH.rate;
    amount = Math.round(amount / 10) * 10;
    const lead = line.rush ? Math.ceil(it.leadDays * (1 - RUSH.cut)) : it.leadDays;
    return { unit, amount, off: tier.off, lead };
  }
  function totals(lines) {
    const sub = lines.reduce((s, l) => s + price(l).amount, 0);
    const vat = Math.floor(sub * VAT);
    const lead = lines.reduce((m, l) => Math.max(m, price(l).lead), 0);
    return { sub, vat, total: sub + vat, lead };
  }
  function addBusinessDays(d, n) {
    const x = new Date(d); let k = 0;
    while (k < n) { x.setDate(x.getDate() + 1); const w = x.getDay(); if (w !== 0 && w !== 6) k++; }
    return x;
  }
  const fmtDate = (d) => `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  const dayName = (d) => '일월화수목금토'[d.getDay()];

  // ---------- 상태 ----------
  let lines = [];
  let cur = null;          // 지금 고르는 줄 { item, mat, fin, qty, rush }
  let received = false;

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(s)) return s.filter(valid); } catch (e) { /* 저장 못 하는 브라우저 */ }
    return [];
  }
  function save() { if (received) return; try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) { /* 무시 */ } }
  function valid(l) {
    const it = ITEM[l && l.item];
    return !!(it && it.materials.includes(l.mat) && it.finishes.includes(l.fin) && Number.isInteger(l.qty) && l.qty >= 1 && l.qty <= 100000);
  }

  // 링크: ?q=품목.재질.표면.수량.빠름_… (받는 회사 이름은 넣지 않아요)
  const encode = (ls) => ls.map((l) => [l.item, l.mat, l.fin, l.qty, l.rush ? 1 : 0].join('.')).join('_');
  function decode(q) {
    return String(q || '').split('_').map((s) => {
      const [item, mat, fin, qty, rush] = s.split('.');
      return { item, mat, fin, qty: parseInt(qty, 10), rush: rush === '1' };
    }).filter(valid).slice(0, 30);
  }

  // ---------- 그리기 ----------
  function seg(el, list, current, onPick, label) {
    el.innerHTML = '';
    list.forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'segb'; b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(o.id === current));
      b.innerHTML = `<span>${o.name}</span>${o.sub ? `<small>${o.sub}</small>` : ''}`;
      if (label) b.setAttribute('aria-label', label(o));
      b.addEventListener('click', () => onPick(o.id));
      el.appendChild(b);
    });
  }

  function renderItems() {
    const box = $('items'); box.innerHTML = '';
    ITEMS.forEach((it) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'item'; b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(cur && cur.item === it.id));
      b.innerHTML = `<b>${it.name}</b><span class="d">${it.desc}</span>`
        + `<span class="m">${won(it.base)}부터 · 최소 ${it.minQty}${it.unit} · ${it.leadDays}영업일</span>`;
      b.addEventListener('click', () => pickItem(it.id));
      box.appendChild(b);
    });
  }

  function pickItem(id) {
    const it = ITEM[id];
    cur = { item: id, mat: it.materials[0], fin: it.finishes[0], qty: Math.max(it.minQty, 100), rush: false };
    renderItems(); renderOpts();
    if (matchMedia('(max-width: 1023px)').matches) $('opts').scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
  }
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function renderOpts() {
    const box = $('opts');
    if (!cur) { box.hidden = true; return; }
    box.hidden = false;
    const it = ITEM[cur.item];
    $('opt-title').textContent = it.name;
    seg($('mats'), it.materials.map((id) => ({ id, name: MAT[id].name, sub: MAT[id].note })), cur.mat, (v) => { cur.mat = v; renderOpts(); });
    seg($('fins'), it.finishes.map((id) => ({ id, name: FIN[id].name, sub: FIN[id].rate ? `+${Math.round(FIN[id].rate * 100)}%` : '' })), cur.fin, (v) => { cur.fin = v; renderOpts(); });
    seg($('rush'), [{ id: 'n', name: '보통', sub: `${it.leadDays}영업일` }, { id: 'r', name: RUSH.label, sub: `+${Math.round(RUSH.rate * 100)}%` }],
      cur.rush ? 'r' : 'n', (v) => { cur.rush = v === 'r'; renderOpts(); });
    $('unit').textContent = it.unit;
    if (document.activeElement !== $('qty')) $('qty').value = cur.qty;
    $('qty').min = 1;

    const next = [...TIERS].sort((a, b) => a.qty - b.qty).find((t) => cur.qty < t.qty);
    const now = tierOf(cur.qty);
    $('tier-hint').textContent = (now.off ? `${now.qty}${it.unit} 이상이라 ${Math.round(now.off * 100)}% 할인 중. ` : '')
      + (next ? `${next.qty}${it.unit}부터 ${Math.round(next.off * 100)}% 할인` : '가장 큰 할인 구간이에요');

    const ok = Number.isInteger(cur.qty) && cur.qty >= it.minQty && cur.qty <= 100000;
    $('warn').hidden = ok;
    $('warn').textContent = ok ? '' : (cur.qty > 100000 ? '수량은 100,000 이하로 적어 주세요.' : `${it.name}은 최소 ${it.minQty}${it.unit}부터 견적이 돼요.`);
    $('add').disabled = !ok;
    const p = ok ? price(cur) : { unit: 0, amount: 0, lead: 0 };
    $('pv-unit').textContent = ok ? won(p.unit) : '-';
    $('pv-line').textContent = ok ? won(p.amount) : '-';
    $('pv-lead').textContent = ok ? `${p.lead}영업일` : '-';
  }

  function specOf(l) {
    const it = ITEM[l.item];
    return [MAT[l.mat].name, FIN[l.fin].id === 'none' ? '' : FIN[l.fin].name, l.rush ? RUSH.label : ''].filter(Boolean).join(', ') + ` · ${it.desc}`;
  }

  function renderCart() {
    const ul = $('lines'); ul.innerHTML = '';
    lines.forEach((l, i) => {
      const it = ITEM[l.item], p = price(l);
      const li = document.createElement('li');
      li.innerHTML = `<div class="l-main"><b>${it.name}</b><span>${specOf(l)}</span>`
        + `<span class="l-num">${l.qty.toLocaleString('ko-KR')}${it.unit} × ${won(p.unit)}${p.off ? ` · ${Math.round(p.off * 100)}% 할인` : ''}</span></div>`
        + `<div class="l-r"><b>${won(p.amount)}</b>${received ? '' : `<button class="link" aria-label="${it.name} 빼기">빼기</button>`}</div>`;
      const del = li.querySelector('button');
      if (del) del.addEventListener('click', () => { lines.splice(i, 1); save(); renderCart(); });
      ul.appendChild(li);
    });
    const t = totals(lines);
    $('count').textContent = lines.length;
    $('empty').hidden = lines.length > 0;
    $('s-sub').textContent = won(t.sub); $('s-vat').textContent = won(t.vat); $('s-total').textContent = won(t.total);
    const ship = lines.length ? addBusinessDays(new Date(), t.lead) : null;
    $('s-ship').textContent = ship ? `${fmtDate(ship)}(${dayName(ship)}) 무렵, ${t.lead}영업일` : '-';
    $('open-sheet').disabled = !lines.length;
    $('bar').hidden = !lines.length;
    $('bar-total').textContent = won(t.total);
  }

  function quoteNo(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `Q-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  }

  function renderSheet() {
    const now = new Date(), t = totals(lines);
    $('q-no').textContent = quoteNo(now);
    $('q-date').textContent = fmtDate(now);
    const until = new Date(now); until.setDate(until.getDate() + COMPANY.validDays);
    $('q-valid').textContent = `${fmtDate(until)}까지`;
    $('sh-co').textContent = COMPANY.name;
    $('sh-biz').textContent = `사업자번호 ${COMPANY.bizNo}`;
    $('sh-addr').textContent = COMPANY.address;
    $('sh-mail').textContent = COMPANY.email;
    const rows = $('sh-rows'); rows.innerHTML = '';
    lines.forEach((l) => {
      const it = ITEM[l.item], p = price(l), tr = document.createElement('tr');
      const unitShown = Math.round(p.amount / l.qty);
      const spec = `${specOf(l)}${p.off ? ` · 수량 할인 ${Math.round(p.off * 100)}%` : ''}`;
      tr.innerHTML = `<td>${it.name}<span class="spec-m">${spec}</span></td><td class="spec">${spec}</td>`
        + `<td class="num">${l.qty.toLocaleString('ko-KR')}${it.unit}</td><td class="num">${won(unitShown)}</td><td class="num">${won(p.amount)}</td>`;
      rows.appendChild(tr);
    });
    $('sh-sub').textContent = won(t.sub); $('sh-vat').textContent = won(t.vat); $('sh-sum').textContent = won(t.total);
    $('sh-total').textContent = won(t.total);
    const ship = addBusinessDays(now, t.lead);
    $('sh-ship').textContent = `${fmtDate(ship)}(${dayName(ship)}) 무렵 (${t.lead}영업일)`;
    $('sh-notes').innerHTML = COMPANY.notes.map((n) => `<li>${n}</li>`).join('');
    $('to-print').textContent = $('to').value.trim() ? `${$('to').value.trim()} 귀하` : '';
    fitTable();
  }
  // 휴대폰에서는 사양 칸을 숨겨 품목 아래로 내린다. 합계 줄이 묶는 칸 수도 같이 맞춘다
  const narrow = matchMedia('(max-width: 640px)');
  function fitTable() { document.querySelectorAll('.tbl tfoot th').forEach((th) => { th.colSpan = narrow.matches ? 3 : 4; }); }

  function openSheet() {
    renderSheet();
    $('sheet-wrap').hidden = false;
    document.body.classList.add('sheet-open');
    window.scrollTo(0, 0);
    $('close-sheet').focus();
  }
  function closeSheet() {
    $('sheet-wrap').hidden = true;
    document.body.classList.remove('sheet-open');
    $('open-sheet').focus();
  }
  function link() {
    const u = new URL(location.href);
    u.search = '?q=' + encode(lines); u.hash = '';
    return u.toString();
  }
  function toast(msg) { const t = $('toast'); t.textContent = msg; clearTimeout(toast.t); toast.t = setTimeout(() => { t.textContent = ''; }, 2600); }

  // ---------- 시작 ----------
  document.title = `${COMPANY.name} | 견적 한 장`;
  document.documentElement.style.setProperty('--accent', THEME.accent);
  document.documentElement.style.setProperty('--accent-soft', THEME.accentSoft);
  $('company').textContent = COMPANY.name;
  $('logo').textContent = COMPANY.name.slice(0, 1);
  $('line').textContent = COMPANY.line;

  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    lines = decode(q);
    received = lines.length > 0;
  }
  if (received) { $('received').hidden = false; }
  else lines = load();

  { const it = ITEMS[0]; cur = { item: it.id, mat: it.materials[0], fin: it.finishes[0], qty: Math.max(it.minQty, 100), rush: false }; }   // 처음에는 첫 품목을 골라 둔다
  renderItems(); renderOpts(); renderCart();
  if (received) openSheet();
  window.addEventListener('beforeprint', () => { if (lines.length) renderSheet(); document.querySelectorAll('.tbl tfoot th').forEach((th) => { th.colSpan = 4; }); });
  window.addEventListener('afterprint', fitTable);
  narrow.addEventListener('change', fitTable);

  $('qty').addEventListener('input', () => { cur.qty = parseInt($('qty').value, 10); renderOpts(); });
  $('minus').addEventListener('click', () => { const it = ITEM[cur.item]; cur.qty = Math.max(it.minQty, (cur.qty || 0) - 10); $('qty').value = cur.qty; renderOpts(); });
  $('plus').addEventListener('click', () => { cur.qty = Math.min(100000, (cur.qty || 0) + 10); $('qty').value = cur.qty; renderOpts(); });
  $('add').addEventListener('click', () => {
    if (received) { received = false; $('received').hidden = true; }
    lines.push({ ...cur }); save(); renderCart();
    toast(`${ITEM[cur.item].name}을 담았어요`);
    if (matchMedia('(max-width: 1023px)').matches) $('bar').classList.add('pop'), setTimeout(() => $('bar').classList.remove('pop'), 600);
  });
  $('open-sheet').addEventListener('click', openSheet);
  $('bar-open').addEventListener('click', openSheet);
  $('close-sheet').addEventListener('click', closeSheet);
  $('to').addEventListener('input', () => { $('to-print').textContent = $('to').value.trim() ? `${$('to').value.trim()} 귀하` : ''; });
  $('print').addEventListener('click', () => { renderSheet(); window.print(); });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(link()); toast('견적 링크를 복사했어요. 받는 회사 이름은 링크에 들어가지 않아요'); }
    catch (e) { prompt('아래 주소를 복사해 주세요', link()); }
  });
  if (navigator.share) {
    $('share').hidden = false;
    $('share').addEventListener('click', () => {
      const t = totals(lines);
      navigator.share({ title: `${COMPANY.name} 견적`, text: `${COMPANY.name} 견적, 합계 ${won(t.total)}(부가세 포함)`, url: link() }).catch(() => {});
    });
  }
  $('restart').addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    received = false; $('received').hidden = true; lines = load(); closeSheet(); renderCart();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet-wrap').hidden) closeSheet(); });
})();
