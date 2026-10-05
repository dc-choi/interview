// YouTube 사이드바(가이드)의 구독 채널을 "handle<TAB>title" 행으로 모은다. Claude in Chrome의 javascript_tool로 실행한다.
// 이 파일 전체를 한 번 실행해 함수를 정의한 뒤 `await __vlSubs(0)`을 실행하고, 출력 첫 줄의 next 값으로 `await __vlSubs(next)`를 이어 부른다.
// javascript_tool은 끝에 남은 Promise를 기다리지 않으므로 호출에는 await를 붙인다.
// javascript_tool 출력은 2000자 근처에서 잘리므로 한 번에 1800자 안쪽의 행만 돌려준다.
// 다시 모으려면 페이지를 새로 고친 뒤 이 파일 전체를 다시 실행한다.
window.__vlSubs = async (start = 0) => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  if (!window.__vlSubsRows) {
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
  }
  const rows = window.__vlSubsRows;
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
