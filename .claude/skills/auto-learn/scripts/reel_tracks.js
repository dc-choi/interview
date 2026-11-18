// Instagram 릴스 페이지에서 영상과 음성 트랙의 주소를 고른다. 페이지를 읽기만 하며 클릭, 입력, 재생 위치 이동을 하지 않는다.
// ego-browser 스크립트에서 이 파일을 node:fs로 읽어 page.evaluate(소스)로 한 번 실행해 함수를 정의한 뒤 같은 스크립트에서 부른다.
// 동기 함수라 반환값은 page.evaluate가 페이지의 Promise를 기다리는지와 관계없이 그대로 돌아온다.
//   1. 릴스 페이지를 goto로 열고 캡션 등을 읽은 뒤 2~3초 기다린다. 재생이 시작돼야 트랙 요청이 남는다.
//   2. const t = await page.evaluate(() => window.__vlReelTracks());
//      반환값은 {audio, video, quality, duration}이다. audio와 video 가운데 하나라도 null이면 2~3초 기다려 한 번만 다시 부른다.
//   3. 받을 폴더 D(<파일 접두사>-reels/<id>)를 node:fs의 mkdirSync(D, { recursive: true })로 만들고 있는 트랙만 받는다.
//      const r = await page.fetch(t.video, { saveAs: `${D}/video.mp4`, credentials: 'omit', timeout: 60000 });
//      audio도 같은 방식으로 `${D}/audio.mp4`에 받는다. 반환값의 ok가 true가 아니거나 예외가 나면 그 트랙은 받지 못한
//      것으로 보고 저장된 파일을 node:fs의 rmSync(경로, { force: true })로 지운다.
//   4. duration이 null이 아니면 VL reel-extract의 --duration으로 넘긴다. 받은 파일의 길이와 크게 다르면 VL이 다른 영상으로
//      보고 단서를 고치지 않는다.
// 주소는 서명된 값이고 길어서 출력하지 않는다. 같은 스크립트 안에서 page.fetch에만 쓰고, console에는 quality, duration과
// 주소가 있는지만 남긴다.
// 트랙은 bytestart와 byteend 쿼리를 단 DASH 요청으로 performance 항목에 남는다. 두 쿼리를 지우면 트랙 전체의 주소가 되고,
// 종류는 efg 쿼리(base64 JSON)의 vencode_tag(예: ...dash_vp9-basic-gen2_720p, ...dash_ln_heaac_vbr3_audio)로 가린다.
// 먼저 요청된 영상(efg의 xpv_asset_id)의 트랙만 쓰고, 같은 종류가 여러 번 나오면 먼저 요청된 것을 쓴다. 연 릴스가 페이지가
// 미리 받는 다른 영상보다 먼저 재생되므로, 다른 영상의 트랙이 섞이지 않는다.
// 영상은 720p, 540p, 1080p, 360p 순으로 고르고, 이 품질 표시가 없으면 음성이 아닌 첫 트랙을 쓴다(quality는 unknown).
// DASH 요청이 없고 <video>가 Instagram CDN의 https 주소를 직접 재생하면 그 파일을 video로 주고 audio는 null이다(음성이
// 같은 파일에 들어 있다).
window.__vlReelTracks = () => {
  const cdn = (url) => url.protocol === 'https:' && /(^|\.)(cdninstagram\.com|fbcdn\.net)$/.test(url.hostname);
  const tracks = new Map();
  let asset;
  for (const { name } of performance.getEntriesByType('resource')) {
    if (!/[?&]bytestart=/.test(name)) continue;
    let url;
    let info;
    try {
      url = new URL(name);
      const efg = (/[?&]efg=([^&#]*)/.exec(name) || [])[1] || '';
      info = JSON.parse(atob(decodeURIComponent(efg).replace(/-/g, '+').replace(/_/g, '/')));
    } catch (e) {
      continue;
    }
    const tag = info && info.vencode_tag;
    if (!tag || !cdn(url)) continue;
    const id = info.xpv_asset_id == null ? null : info.xpv_asset_id;
    if (asset === undefined) asset = id;
    if (id !== asset || tracks.has(tag)) continue;
    url.searchParams.delete('bytestart');
    url.searchParams.delete('byteend');
    tracks.set(tag, url.toString());
  }
  const pick = (keys) => {
    for (const key of keys) {
      for (const [tag, url] of tracks) if (tag.includes(key)) return [url, key];
    }
    return [null, null];
  };
  const media = document.querySelector('video');
  const duration = media && Number.isFinite(media.duration) ? Math.round(media.duration) : null;
  if (!tracks.size) {
    let video = null;
    try {
      if (media && cdn(new URL(media.currentSrc))) video = media.currentSrc;
    } catch (e) {
      // blob: 주소나 빈 값은 받을 수 없다.
    }
    return { audio: null, video, quality: null, duration };
  }
  const [audio] = pick(['audio']);
  let [video, quality] = pick(['720p', '540p', '1080p', '360p']);
  if (!video) {
    const other = [...tracks].find(([tag]) => !tag.includes('audio'));
    if (other) [video, quality] = [other[1], 'unknown'];
  }
  return { audio, video, quality, duration };
};
