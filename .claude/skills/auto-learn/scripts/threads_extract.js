// Threads 페이지에서 글을 뽑는다. Claude in Chrome의 javascript_tool로 이 파일 전체를 한 번 실행한 뒤 호출한다.
//   __vlThreads('list', start)      리포스트 탭: 보이는 글을 "id<TAB>@author<TAB>datetime<TAB>chain<TAB>첫 줄" 행으로
//   __vlThreads('post', id, start)  글 페이지: 그 글과 이어진 같은 작성자의 글, 인용, 이미지 설명, 외부 링크
// javascript_tool 출력은 2000자 근처에서 잘리므로 1800자씩 나눠 주며, 첫 줄의 next 값으로 다음 조각을 읽는다.
// 외부 링크의 쿼리는 추적 값일 수 있어 지우고, YouTube 영상 링크의 v 값만 남긴다.
window.__vlThreads = (mode, a, b) => {
  const clean = (href) => {
    try {
      let u = new URL(href, location.origin);
      if (u.hostname === 'l.threads.com') u = new URL(u.searchParams.get('u'));
      if (u.origin === location.origin) return u.pathname;
      const video = /(^|\.)youtube\.com$/.test(u.hostname) && u.pathname === '/watch' ? u.searchParams.get('v') : null;
      if (video) return `${u.origin}/watch?v=${video}`;
      return u.origin + u.pathname + (u.search ? ' [query omitted]' : '');
    } catch (e) {
      return 'unparseable';
    }
  };
  const countRe = /^[\d.,]+\s*(천|만|K|M|k|m)?$/;
  const extract = (c) => {
    const times = [...c.querySelectorAll('time')];
    if (!times.length) return null;
    const t0 = times[0];
    const anchor = t0.closest('a');
    const key = anchor ? new URL(anchor.getAttribute('href'), location.origin).pathname : null;
    if (!key || !/^\/@[^/]+\/post\/[^/]+$/.test(key)) return null;
    let quote = null;
    let quoteEl = null;
    if (times[1]) {
      let q = times[1];
      while (q.parentElement && q.parentElement !== c && !q.parentElement.contains(t0)) q = q.parentElement;
      quoteEl = q;
      const qa = times[1].closest('a');
      quote = {
        key: qa ? new URL(qa.getAttribute('href'), location.origin).pathname : '',
        dt: times[1].getAttribute('datetime'),
        text: q.innerText,
      };
    }
    let full = c.innerText;
    if (quoteEl) full = full.replace(quoteEl.innerText, '\n[[QUOTE]]\n');
    const lines = full.split('\n');
    const ti = lines.findIndex((l) => l.trim() === t0.innerText.trim());
    let body = lines.slice(ti + 1);
    let chain = '';
    // 연속 글 표시(예: 1 / 6)와 그 뒤의 반응 수를 본문에서 떼어 낸다.
    for (let i = body.length - 2; i >= Math.max(1, body.length - 8); i -= 1) {
      const isChain = body[i].trim() === '/' && /^\d+$/.test(body[i - 1].trim()) && /^\d+$/.test((body[i + 1] || '').trim())
        && body.slice(i + 2).every((l) => countRe.test(l.trim()));
      if (isChain) {
        chain = `${body[i - 1].trim()}/${body[i + 1].trim()}`;
        body = body.slice(0, i - 1).concat(body.slice(i + 2));
        break;
      }
    }
    while (body.length && countRe.test(body[body.length - 1].trim())) body.pop();
    const links = [];
    for (const link of c.querySelectorAll('a')) {
      if (quoteEl && quoteEl.contains(link)) continue;
      const h = link.getAttribute('href') || '';
      if (h.startsWith('/')) continue;
      const cl = clean(h);
      if (!links.includes(cl)) links.push(cl);
    }
    const imgs = [...c.querySelectorAll('img')]
      .filter((i) => !(quoteEl && quoteEl.contains(i)) && !/프로필 사진|profile picture/.test(i.alt))
      .map((i) => i.alt || '(no alt text)');
    const videos = [...c.querySelectorAll('video')].filter((v) => !(quoteEl && quoteEl.contains(v))).length;
    return {
      id: key.split('/').pop(), key, author: key.split('/')[1].slice(1), dt: t0.getAttribute('datetime'),
      body: body.join('\n').trim(), chain, links, imgs, videos, quote,
    };
  };
  const items = [];
  for (const c of document.querySelectorAll('div[data-pressable-container]')) {
    if (c.parentElement.closest('div[data-pressable-container]')) continue;
    const r = extract(c);
    if (r) items.push(r);
  }
  const page = (text, start = 0) => `chars=${text.length} next=${Math.min(text.length, start + 1800)}\n${text.slice(start, start + 1800)}`;
  if (mode === 'list') {
    const rows = items.map((r) => [r.id, `@${r.author}`, r.dt, r.chain || '-', r.body.split('\n')[0].slice(0, 40)].join('\t'));
    return page(rows.join('\n'), a);
  }
  const i = items.findIndex((r) => r.id === a);
  if (i < 0) return `NOT_FOUND ${a} (items=${items.length})`;
  const main = items[i];
  const parts = [];
  for (let j = i + 1; j < items.length && items[j].author === main.author; j += 1) parts.push(items[j]);
  const block = (r, label) => [
    `### ${label}`,
    r.body,
    r.quote ? `[quote] https://www.threads.com${r.quote.key} ${r.quote.dt}\n${r.quote.text}` : '',
    r.imgs.length ? `images: ${r.imgs.join(' | ')}` : '',
    r.videos ? `videos: ${r.videos}` : '',
    r.links.length ? `links: ${r.links.join(' ')}` : '',
  ].filter(Boolean).join('\n');
  const text = [
    `id: ${main.id}`, `url: https://www.threads.com${main.key}`, `author: @${main.author}`,
    `posted_at: ${main.dt}`, `chain: ${main.chain || '-'}`, `parts_on_page: ${parts.length + 1}`,
    block(main, 'main'), ...parts.map((r, n) => block(r, `part ${n + 2}`)),
  ].join('\n');
  return page(text, b);
};
