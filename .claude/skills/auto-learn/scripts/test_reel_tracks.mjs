// reel_tracks.js 오프라인 검사: node .claude/skills/auto-learn/scripts/test_reel_tracks.mjs
// 페이지 전역(performance, document, window)을 가짜로 만들어 헬퍼가 고르는 트랙을 확인한다. 주소와 태그는 지어낸 값이다.
import assert from 'node:assert';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./reel_tracks.js', import.meta.url), 'utf8');
const V = 'ig-test.clips.c2-C3.dash_vp9-basic-gen2_';
const A = 'ig-test.clips.c2-C3.dash_ln_heaac_vbr3_audio';

// efg 값은 표준 base64(%로 감싼 것과 감싸지 않은 것)와 URL용 base64 세 가지로 만든다.
const efg = (tag, asset, style) => {
  const raw = Buffer.from(JSON.stringify({ vencode_tag: tag, xpv_asset_id: asset, duration_s: 31 })).toString('base64');
  if (style === 'urlsafe') return raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return style === 'pct' ? encodeURIComponent(raw) : raw;
};
const entry = (host, tag, { asset = 1, style = 'pct', extra = '' } = {}) => ({
  name: `https://${host}/o1/v/t2/f2/m78/${tag.slice(-6)}-${asset}.mp4?_nc_ht=x&efg=${efg(tag, asset, style)}`
    + `&oh=00_sig&oe=6900&bytestart=0&byteend=999${extra}`,
});
const tracks = (entries, video = null) => {
  globalThis.window = {};
  globalThis.performance = { getEntriesByType: (kind) => (kind === 'resource' ? entries : []) };
  globalThis.document = { querySelector: () => video };
  new Function(source)();
  return window.__vlReelTracks();
};
const cdn = 'scontent-test.cdninstagram.com';

// 품질 순서(540p가 1080p보다 먼저), 먼저 요청된 같은 종류, 쿼리 정리, 다른 호스트와 읽을 수 없는 efg 제외
let t = tracks([
  entry(cdn, `${V}1080p`), entry(cdn, `${V}540p`, { style: 'urlsafe' }),
  entry('test.fna.fbcdn.net', A, { style: 'plain' }), entry(cdn, `${V}540p`, { extra: '&second=1' }),
  entry('evil.example.com', `${V}720p`), { name: `https://${cdn}/v/x.jpg?stp=1` },
  { name: `https://${cdn}/v/x.mp4?bytestart=0&byteend=5&efg=notbase64!!` },
], { duration: 31.4, currentSrc: 'blob:https://www.instagram.com/x' });
assert.equal(t.quality, '540p');
assert.ok(!/bytestart|byteend|second=1/.test(t.video), t.video);
assert.ok(new URL(t.audio).hostname.endsWith('fbcdn.net') && !/bytestart/.test(t.audio));
assert.equal(t.duration, 31);

// 연 릴스(자산 1)는 540p와 음성만, 미리 받는 다른 영상(자산 2)은 720p가 있다. 다른 자산의 트랙을 섞지 않는다.
t = tracks([entry(cdn, `${V}540p`, { asset: 1 }), entry(cdn, `${V}720p`, { asset: 2 }), entry(cdn, A, { asset: 2 }),
  entry(cdn, A, { asset: 1 })]);
assert.equal(t.quality, '540p');
assert.ok(t.video.includes('540p-1') && t.audio.includes('_audio-1'), JSON.stringify(t));

// 720p가 있으면 720p, 음성 트랙이 없으면 audio는 null
t = tracks([entry(cdn, `${V}360p`), entry(cdn, `${V}720p`, { style: 'plain' })]);
assert.deepEqual([t.quality, t.audio, t.duration], ['720p', null, null]);

// 품질 표시가 없으면 음성이 아닌 첫 트랙을 video로 쓴다.
t = tracks([entry(cdn, A), entry(cdn, 'ig-test.clips.dash_baseline_1_v1')]);
assert.ok(t.video.includes('/e_1_v1-1.mp4') && t.audio.includes('_audio'), JSON.stringify(t));
assert.equal(t.quality, 'unknown');
t = tracks([entry(cdn, A)]);
assert.deepEqual([t.video, t.quality], [null, null]);

// DASH 요청이 없으면 Instagram CDN의 https 재생 주소만 video로 쓴다.
const full = `https://${cdn}/v/full.mp4?oh=1`;
assert.deepEqual(tracks([], { duration: NaN, currentSrc: full }), { audio: null, video: full, quality: null, duration: null });
for (const currentSrc of ['https://evil.example.com/full.mp4', `http://${cdn}/v/full.mp4`, 'blob:https://www.instagram.com/x', '']) {
  assert.equal(tracks([], { duration: 10, currentSrc }).video, null, currentSrc);
}
assert.deepEqual(tracks([], null), { audio: null, video: null, quality: null, duration: null });
console.log('reel_tracks ok');
