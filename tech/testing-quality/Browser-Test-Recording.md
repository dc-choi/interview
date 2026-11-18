---
tags: [testing, e2e, playwright, puppeteer, cdp, chrome, video, evidence]
status: done
verified_at: 2026-11-18
category: "테스트&품질(Testing&Quality)"
aliases: ["Browser Test Recording", "브라우저 테스트 녹화", "E2E 영상 증거", "Page.startScreenRecording", "chrome-capture"]
---

# 브라우저 테스트 녹화와 실행 증거

E2E 테스트의 영상은 실패한 흐름을 다시 돌리지 않고 확인하는 진단 자료이고, 사람이나 에이전트가 변경한 앱을 실제로 실행했다는 증거다. 그러나 영상은 판정이 아니다. 통과와 실패는 assertion이 정하고 영상은 그 사이에 무슨 일이 있었는지를 보여 줄 뿐이다. 이 문서는 2026-11-18 Playwright 문서, Chrome DevTools Protocol(CDP) 명세, Puppeteer 문서와 chrome-capture README를 대조해 녹화 방식과 운영 기준을 정리한다.

## 녹화 방식 세 가지

| 방식 | 동작 | 특징 |
|---|---|---|
| 테스트 러너 내장 녹화 | Playwright Test의 `video` 옵션이 브라우저 컨텍스트 단위로 녹화한다 | 설정만으로 켜진다. 컨텍스트가 닫힐 때 저장되고, 기본 크기는 viewport를 800x800 안에 맞춰 줄인 크기다 |
| 프레임 전송 후 인코딩 | CDP `Page.startScreencast`가 jpeg나 png 프레임을 이벤트로 보내고 클라이언트가 프레임마다 `screencastFrameAck`로 응답한 뒤, 별도 인코더가 영상을 만든다 | 프레임이 프로토콜 연결로 오가고 인코딩이 따로 있다 |
| 브라우저 내장 녹화 | CDP `Page.startScreenRecording`으로 시작하고 `stopScreenRecording`이 결과를 `IO.StreamHandle`로 돌려준다 | 브라우저가 녹화하면서 인코딩한다. 매개변수는 `audio`, `maxWidth`, `maxHeight`, `frameRate`, `captureArea`(`target` 또는 `browserWindow`)이며 두 명령 모두 experimental이다 |

`captureArea`의 `browserWindow`는 대상 페이지를 보여 주는 브라우저 창 전체를 녹화하며, 명세상 신뢰된 클라이언트와 이를 지원하는 embedder에서만 쓸 수 있다. chrome-capture README는 Playwright의 `recordVideo`를 `startScreencast`와 ffmpeg의 조합으로 설명하고 내장 녹화가 그 방식을 대신한다고 소개한다.

## Playwright 내장 녹화

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    video: 'retain-on-failure', // 모두 녹화하고 통과한 테스트의 영상은 지운다
  },
});
```

- 값은 `'off'`(기본), `'on'`, `'retain-on-failure'`, `'on-first-retry'`다. 객체형은 `mode`와 `size`를 받는다. 특정 크기가 필요하면 viewport를 그 크기로 두거나 `size`를 지정한다.
- 결과는 테스트 출력 폴더(보통 `test-results`)에 생긴다. 직접 만든 컨텍스트는 `await context.close()`를 해야 저장된다.
- 영상 설정의 `show` 옵션은 각 동작의 대상 요소 윤곽과 동작 제목을 영상에 표시하고(`actions`, 기본 표시 500ms), 현재 테스트 정보도 덧붙인다(`test`). 무엇을 눌렀는지 영상만 보고 알 수 있게 된다.

## Chrome 내장 녹화와 chrome-capture

`Page.startScreenRecording`은 CDP tip-of-tree 명세에 experimental로 정의돼 있다. Puppeteer는 이를 `page.record()`로 감싸며, 25.18.1 문서 기준 `ScreenRecording`을 돌려주고 `stop()`으로 끝내며 mp4를 낸다. chrome-capture는 같은 API를 Playwright Page, Puppeteer Page나 CDP 세션에서 쓰게 해 주는 Apache-2.0 도구다. 아래는 README 기준 내용이다.

- Chrome 153 이상이 필요하다. Chromium 일정표의 153 stable 날짜는 2026-09-08이다. Puppeteer의 래퍼는 25.10 이상의 experimental 기능으로 소개되고, Playwright 쪽 지원은 README 작성 시점에 열린 PR 상태였다.
- 출력은 AV1 영상의 mp4 하나다. 최대 2160p, 60~120fps로 녹화하며 FFmpeg 설치가 필요 없다.
- CLI(`npx chrome-capture <url> <output.mp4> <duration>`)는 탭 오디오를 기본으로 녹음한다. 라이브러리 `startRecording(page, options)`의 기본값은 `frameRate` 60, `maxWidth` 1280, `maxHeight` 720이며 `audio`는 꺼져 있다. 오디오는 48kHz 스테레오 Opus다.
- `chrome-capture/playwright`의 `screenRecordingFixture`를 `auto: true`로 쓰면 테스트마다 녹화해 mp4를 리포트에 붙인다. 끄면 테스트 중간에 직접 시작한다. 로그인과 페이지 로딩을 마친 뒤 필요한 구간만 녹화할 수 있다.
- 60fps를 넘는 녹화는 macOS에서 120Hz ProMotion 화면에 맞추려고 headful로 실행한다. GPU 없는 headless Linux는 1080p나 1440p의 60fps가 보고된 범위다. 비트레이트와 품질 옵션은 아직 없고 Chrome이 픽셀 속도에 맞춰 정한다(720p30 약 2Mbps에서 2160p120 약 72Mbps). Windows와 discrete GPU가 있는 Linux는 시험되지 않았다.

README의 비교는 M4 Max에서 1280x800, 6.4초 UI 재생을 `recordVideo`와 견준 결과다.

| 항목 | 내장 녹화 | `recordVideo` |
|---|---|---|
| 출력 fps | 60 | 25 |
| 전체 소요 | 11초 | 21초 |
| 정지와 마무리 | 17ms | 3,800ms |
| WebSocket 전송량 | 450KB | 10.5MB |
| 파일 크기 | 330KB | 480KB |

작성자가 한 장비에서 잰 수치이며 여기서 재현하지 않았다. 프레임을 프로토콜로 보내지 않는 구조가 전송량과 마무리 시간 차이를 설명하지만, CI 장비의 GPU 유무와 headless 여부에 따라 결과는 달라진다.

## 운영 기준

다음은 위 방식들을 CI에 들일 때의 제안이다.

1. **남길 영상을 고른다**: 모든 테스트를 보관하지 않고 `retain-on-failure`나 `on-first-retry`로 실패와 재시도만 남긴다. 저장소 용량과 리포트 업로드 시간이 줄어든다.
2. **필요한 구간만 녹화한다**: 로그인과 초기 로딩 뒤에 시작하면 파일이 작아지고 인증 화면이 영상에 남지 않는다.
3. **영상을 민감 산출물로 다룬다**: 화면의 개인정보, 토큰과 내부 데이터가 그대로 담긴다. CI artifact의 보존 기간과 접근 범위를 정하고, 운영 데이터가 아닌 시험 데이터로 녹화한다.
4. **판정과 증거를 함께 남긴다**: 영상은 assertion 결과, 실행 명령, 환경과 로그를 대신하지 않는다. 에이전트의 완료 보고에도 이 묶음을 요구한다([[Agentic-Verification#반복을 끝내는 조건|에이전트 기반 검증의 종료 조건]]).
5. **experimental API에 기대는 정도를 정한다**: CDP의 experimental 명령은 Chrome 버전에 따라 바뀔 수 있으므로 CI의 Chrome과 라이브러리 버전을 고정하고, 실패하면 러너 내장 녹화로 돌아갈 경로를 둔다.

## 고르는 기준

- **회귀 진단이 목적이면**: 러너 내장 녹화로 충분하다. 설정이 단순하고 실패한 테스트에만 영상이 남는다.
- **데모, 애니메이션 검수, 소리 확인이 목적이면**: 높은 프레임레이트와 탭 오디오가 필요하므로 Chrome 내장 녹화를 검토한다. Chrome과 Chromium 계열에 묶이고 experimental이라는 조건을 받아들여야 한다.
- **화면 상태 판정이 목적이면**: 영상보다 접근성 트리나 스크린샷 비교처럼 기계가 판정할 수 있는 입력을 먼저 쓴다([[Natural-Language-E2E-Agent|자연어 E2E 테스트 에이전트]]).

## 체크포인트

- 영상이 있는데도 assertion을 빼면 안 되는 이유는 무엇인가?
- `retain-on-failure`와 `on-first-retry`는 저장 비용과 진단 범위에서 어떻게 다른가?
- 프레임을 프로토콜로 보내는 방식과 브라우저 내장 녹화의 비용 차이는 어디에서 생기는가?
- 녹화를 로그인 뒤에 시작하면 어떤 위험이 줄어드는가?
- experimental CDP 명령에 기댄 녹화를 CI의 필수 단계로 둘 때 필요한 대비는 무엇인가?

## 출처

- [Playwright, Videos](https://playwright.dev/docs/videos) — 2026-11-18 녹화 모드, 기본 크기, 저장 시점과 `show` 옵션 대조
- [ChromeDevTools devtools-protocol, Page.pdl](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Page.pdl) — tip-of-tree 기준 `startScreenRecording`, `stopScreenRecording`, `startScreencast`의 매개변수와 experimental 표기
- [Puppeteer, Page.record() method](https://pptr.dev/api/puppeteer.page.record) — 25.18.1 문서, 반환 타입과 사용하는 CDP API
- [Chromium Dash, Milestone 153 schedule](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=153) — stable 날짜
- [chrome-capture — GitHub, paulirish](https://github.com/paulirish/chrome-capture) — README의 요구 버전, 옵션 기본값, fixture, 한계와 벤치마크. 벤치마크는 작성자 측정
- [chrome-capture - Chrome 탭의 화면과 소리를 최대 4K 120fps로 녹화하는 도구 — GeekNews](https://news.hada.io/topic?id=37379) — 2026-11-18 소개 글, 원문 식별에 사용

## 관련 문서

- [[Agentic-Verification|에이전트 기반 검증]]
- [[Natural-Language-E2E-Agent|자연어 E2E 테스트 에이전트]]
- [[NextJS-Testing-E2E|Next.js Cypress와 Playwright 실행]]
- [[Deterministic-Test|Deterministic test]]
- [[Test-Pyramid|테스트 계층]]
