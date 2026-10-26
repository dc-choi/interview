// YouTube 사이드바(가이드)의 구독 채널을 "handle<TAB>title" 행으로 모은다. ego-browser 스크립트에서 이 파일을 node:fs로 읽어
// page.evaluate(소스)로 한 번 실행해 함수를 정의한다. 안내는 page.evaluate가 페이지의 Promise를 기다리는지 말하지 않으므로
// 모으기와 읽기를 나눠 같은 스크립트에서 부른다.
//   1. await page.evaluate(() => { window.__vlSubsLoad(); });
//   2. await page.waitForFunction(() => Array.isArray(window.__vlSubsRows), undefined, { timeout: 30_000 });
//   3. await page.evaluate((n) => window.__vlSubs(n), 0)   반환값 첫 줄의 next 값으로 이어 부른다.
// 한 번에 1800자 안쪽의 행만 돌려준다. 다시 모으려면 페이지를 새로 고친 뒤 이 파일 전체를 다시 실행한다.
window.__vlSubsLoad = async () => {
  if (window.__vlSubsRows || window.__vlSubsLoading) return;
  window.__vlSubsLoading = true;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  if (!document.querySelector('ytd-guide-renderer ytd-guide-entry-renderer')) {
    document.querySelector('#guide-button button, #guide-button')?.click();
    await wait(1500);
  }
  // 구독 섹션의 더보기를 펼친다. 펼친 뒤에는 확장 버튼이 숨으므로 보이는 것만 누른다.
  for (let round = 0; round < 2; round += 1) {
    for (const expander of document.querySelectorAll('ytd-guide-collapsible-entry-renderer #expander-item')) {
      if (expander.offsetParent !== null) expander.click();
    }
    await wait(1500);
  }
  const rows = [];
  for (const anchor of document.querySelectorAll('ytd-guide-entry-renderer a#endpoint')) {
    const match = (anchor.getAttribute('href') || '').match(/^\/(@[^/?#]+|channel\/UC[\w-]{22})(?:[/?#]|$)/);
    if (!match) continue;
    const title = (anchor.getAttribute('title') || anchor.innerText || '').replace(/\s+/g, ' ').trim();
    rows.push(`${decodeURIComponent(match[1])}\t${title}`);
  }
  window.__vlSubsRows = [...new Set(rows)];
};
window.__vlSubs = (start = 0) => {
  const rows = window.__vlSubsRows;
  if (!rows) return 'NOT_READY: __vlSubsLoad를 부른 뒤 __vlSubsRows를 기다린다';
  const out = [];
  let size = 0;
  let next = start;
  while (next < rows.length && size + rows[next].length + 1 <= 1800) {
    out.push(rows[next]);
    size += rows[next].length + 1;
    next += 1;
  }
  return [`total=${rows.length} next=${next}`, ...out].join('\n');
};
