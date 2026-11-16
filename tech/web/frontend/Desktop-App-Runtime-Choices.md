---
tags: [web, frontend, desktop, electron, webview, rust, gpu-ui]
status: done
verified_at: 2026-11-16
category: "웹&네트워크(Web&Network)"
aliases: ["Desktop App Runtime Choices", "데스크톱 앱 런타임 선택", "Electron 대안"]
---

# 데스크톱 앱 런타임 선택: Electron, 시스템 WebView와 네이티브 GPU UI

웹 기술로 데스크톱 앱을 만드는 방식과 UI를 직접 그리는 방식은 메모리와 배포 크기만 다른 것이 아니다. 렌더링 엔진을 누가 배포하고 업데이트하는지, 플랫폼마다 화면이 같은지, 웹 코드와 모바일 코드를 얼마나 공유하는지, 접근성과 입력기 같은 기본 기능을 누가 책임지는지가 함께 바뀐다.

## 세 가지 구조

| 구조 | 화면을 그리는 주체 | 브라우저 엔진 배포 | 얻는 것 | 치르는 비용 |
|---|---|---|---|---|
| Electron | 앱에 포함한 Chromium | 앱마다 번들 | 웹 코드 재사용, 플랫폼 간 같은 엔진 | 앱마다 엔진 크기와 다중 프로세스, 엔진 보안 업데이트를 앱이 책임 |
| 시스템 WebView (Tauri 등) | OS가 제공하는 WebView | 번들하지 않음 | 작은 바이너리, 웹 코드 재사용 | OS와 버전마다 엔진이 달라 기능 지원과 버그가 다름 |
| 네이티브 GPU UI (GPUI 등) | UI 프레임워크가 GPU로 직접 그림 | 없음 | 웹 엔진 없는 렌더링 경로 | 프레임워크 성숙도, 텍스트, 입력기와 접근성 같은 기본 기능을 직접 검증 |

### Electron은 Chromium의 다중 프로세스를 물려받는다

Electron 문서 기준, 앱마다 진입점인 main process가 하나 있고 Node.js 환경에서 앱 수명주기와 창을 관리한다. 열린 `BrowserWindow`마다 별도의 renderer process가 웹 콘텐츠를 그린다. renderer는 기본적으로 Node.js에 직접 접근하지 않으며, preload script와 context isolation, `contextBridge`로 필요한 기능만 노출한다. CPU를 많이 쓰거나 신뢰할 수 없는 작업은 `UtilityProcess`로 별도 자식 프로세스에 둘 수 있다.

### 시스템 WebView는 엔진을 OS에 맡긴다

Tauri는 Rust로 컴파일한 바이너리에서 OS의 WebView로 HTML을 그리며, 런타임을 함께 배포하지 않아 앱이 작다고 설명한다. 엔진은 Windows에서 Chromium 기반 WebView2, macOS에서 WKWebView, Linux에서 webkit2gtk다. 같은 웹 기능도 OS와 업데이트 상태에 따라 지원 여부가 달라질 수 있다.

엔진을 번들하지 않는다고 프로세스가 하나가 되지는 않는다. Microsoft 문서 기준 WebView2 Runtime은 Microsoft Edge와 같은 프로세스 모델을 쓰며, 하나의 browser process, 하나 이상의 renderer process와 GPU, 오디오 같은 helper process를 user data folder 단위로 묶는다. 메모리는 앱 프로세스 하나가 아니라 이 묶음 전체로 측정한다.

### 네이티브 GPU UI는 웹 엔진을 빼는 대신 프레임워크를 떠안는다

GPUI는 Zed 편집기를 만든 팀의 Rust UI 프레임워크로, 즉시 모드와 유지 모드를 섞은 GPU 가속 방식을 쓴다. 2026-11-09 README 기준 pre-1.0이며 버전 사이에 호환성이 깨지는 변경이 잦을 수 있다고 밝힌다. macOS는 Metal로 그리고, Linux와 FreeBSD는 Wayland나 X11 backend를, Windows는 Win32와 DirectWrite를 쓴다. 당분간 Zed 개발과 묶여 있어 기여도 Zed 저장소에서 맞춘다.

## Electron이 엔진을 번들하는 근거

Electron 문서(Why Electron)는 엔진 번들의 근거로 안정성, 보안과 성능을 든다. 아래는 Electron 유지보수자 측의 주장이다.

- **지원할 가장 오래된 OS가 상한이 된다.** OS WebView를 쓰면 지원해야 하는 가장 오래된 OS 버전에 포함된 브라우저 버전으로 기능이 제한된다.
- **엔진 버그를 앱 업데이트로 고칠 수 있다.** OS WebView에 안정성 버그가 있으면 사용자에게 OS 업그레이드를 요청하는 것 말고 방법이 없고, 최신 macOS나 Windows 11로 올릴 수 없는 장비라면 새 컴퓨터를 사라고 해야 한다고 적는다. 엔진을 번들하면 안정성과 보안 수정을 OS 업그레이드 없이 앱 업데이트로 배포할 수 있다. 문서는 OS 공급자가 내장 WebView를 브라우저만큼 긴급하게 꾸준히 갱신하는 것을 보지 못했다고도 적는다.
- **성능은 앱 규모에 따라 다르다고 본다.** 단순한 HTML 문서는 내장 WebView가 자원을 덜 쓸 때가 있다고 인정하면서, 큰 앱은 최신 Chromium으로 더 나은 성능을 낼 수 있었다는 경험을 적는다.
- **비용도 문서가 인정한다.** 번들 때문에 대부분의 앱이 100MB를 넘고, 압축한 앱은 보통 80~100MB다. 작은 디스크 용량이 필수 조건이면 다른 도구를 쓰라고 한다.

이 일반화는 OS 업데이트와 함께 갱신되는 WebView에 주로 맞는다. 앞의 Tauri Webview Versions 문서 기준으로 macOS의 WKWebView는 정기 OS 업데이트로 갱신되고 지원이 끝난 macOS는 WebKit 갱신을 받지 못한다. 반면 Windows의 WebView2는 스스로 업데이트해 비교적 최신 Chromium 빌드를 쓴다고 적는다. 다만 Microsoft Learn 기준 이는 Evergreen 배포의 경우이고, Fixed Version 배포는 자동으로 갱신되지 않으며 Evergreen도 관리자가 업데이트를 막거나 오프라인이면 갱신되지 않을 수 있다. Electron 원문은 Windows 11도 명시하므로, Evergreen WebView2에서는 OS 업그레이드만이 방법이라는 주장이 그대로 맞지 않는다는 것은 두 출처를 비교한 이 문서의 판단이다.

이 근거는 앞 절의 업데이트 책임과 짝을 이룬다. 수정을 직접 배포할 수 있다는 것은 Chromium 보안 업데이트를 앱 릴리스로 따라가야 한다는 뜻이기도 하다.

### 사례: Slack의 MacGap에서 Electron으로의 이전 (2016)

Slack Engineering의 2016-10-25 글에 따르면 초기 Mac 앱은 MacGap v1으로 만들었고, 내부적으로 OS의 WebView가 네이티브 창 안에서 웹 콘텐츠를 그렸다. 이 WebView는 OS의 Safari 버전에 묶여 있어 오래된 macOS의 Safari 문제가 앱에 영향을 줄 때 선택지가 많지 않았다. HTTP/2 같은 새 기능은 WKWebView에만 들어와 전환하려면 사실상 다시 써야 했다. Windows 앱은 기존 코드를 재사용할 수 없어 Electron을 택했고, 이미 있던 Electron macOS 빌드를 바탕으로 Mac, Windows, Linux의 코드베이스를 하나로 합쳤다. 앞의 엔진 버그와 OS 종속 불릿에 해당하는 사례로 읽을 수 있다(Slack 글이 Electron 문서의 논거를 직접 인용하지는 않으며 이 연결은 이 문서의 해석이다). HTTP/2 문제는 OS 버전보다 구형 WebView API와 WKWebView의 세대 차이에 가깝다.

### Tauri 3 alpha는 CEF runtime 선택지를 추가했다

릴리스 노트에 따르면 Tauri 3.0.0-alpha.0부터 WebView runtime을 `tauri` crate의 Cargo feature(`wry`, `cef` feature는 제거)가 아니라 앱 코드에서 고르게 바뀌었다. 앱은 runtime crate에 직접 의존하고 `tauri::Builder`의 `runtime` 호출에 시스템 WebView 계열인 `tauri_runtime_wry::Wry` 또는 `tauri_runtime_cef::Cef`를 넘긴다. 자동으로 선택되는 runtime은 없다. 지정하지 않으면 cargo 컴파일 오류가 아니라 앱을 초기화할 때 `tauri_runtime::Error::RuntimeNotConfigured` 오류가 난다. `tauri-runtime-cef` crate는 docs.rs 설명 기준 Chromium Embedded Framework(CEF)용 Tauri runtime interface다. Linux에서는 Wry runtime이 gtk3, CEF runtime이 gtk4를 켠다.

이는 alpha.0 릴리스 노트 기준이며 이후 alpha(2026-11-16 확인일 현재 tauri 3.0.0-alpha.6)의 변경은 대조하지 않았다. 릴리스 노트는 CEF runtime이 Chromium을 앱에 어떻게 함께 배포하는지, 앱 크기가 얼마인지 설명하지 않는다. 따라서 Electron처럼 엔진을 번들한다고 단정하지 않고, 같은 프레임워크 안에서 렌더링 엔진 계열을 고르는 구조로 바뀌는 흐름으로만 읽는다.

## 메모리와 시작 시간을 비교하는 방법

런타임을 바꾼 효과를 주장하거나 검증할 때는 다음 조건을 맞춘다(측정 제안).

- 같은 시나리오: 로그인 계정 수, 열린 창과 채널 수, 실행 시간
- 같은 지표: 작업 관리자의 어떤 메모리 열인지, 모든 하위 프로세스를 합산했는지
- 같은 시작 정의: 창이 보인 시점과 실제로 조작할 수 있는 시점을 구분
- 같은 기능 범위: 초기 빌드가 기존 앱의 모든 기능을 갖췄는지

초기 빌드의 스크린샷 한 장은 방향을 보여 줄 뿐 같은 조건의 벤치마크가 아니다.

## 코드 공유와 업데이트 경계

웹 UI를 버리면 웹, 데스크톱과 모바일이 화면 코드를 공유하던 이점도 줄어든다. 대신 상태 관리, 네트워크, 동기화 같은 앱 로직을 Rust 같은 공통 코어로 두고 플랫폼마다 UI만 따로 두는 구성이 가능하다. 이때는 공통 코어의 API 경계와 각 플랫폼 UI의 접근성, 입력기와 텍스트 렌더링을 별도로 시험한다.

업데이트를 실행 전 대기 화면에서 하지 않고 백그라운드에서 받으면 시작이 빨라진다. 반면 업데이트 실패, 부분 적용과 되돌리기를 앱이 직접 다뤄야 한다.

## 선택 점검

- 화면을 웹과 공유해야 하는가, 앱 로직만 공유하면 되는가
- 엔진 보안 업데이트를 앱 릴리스로 책임질 수 있는가, OS에 맡길 수 있는가
- 지원할 OS 버전의 WebView 차이를 시험 범위에 넣었는가
- 네이티브 UI 프레임워크의 성숙도와 호환성 깨짐을 감당할 인력이 있는가
- 스크린 리더, 입력기(한글 조합 포함), 고해상도 텍스트를 직접 확인했는가([[Cross-Platform-Keyboard|플랫폼별 키보드 입력]])

## 사례: Discord의 Electron 제거 계획 (2026-11 보도 기준)

Discord 공동창업자이자 CTO는 2026-11-04 X 게시물에서 클라이언트를 Rust로 다시 만든다고 밝혔다. 보도에 따르면 데스크톱은 Electron 대신 GPUI로 화면을 그리고 YouTube와 Activities 같은 기능에만 시스템 WebView를 쓴다. 모바일은 React Native를 없애되 네이티브 UI를 유지하며, 데스크톱과 모바일이 Rust로 코드를 공유한다. Windows Latest는 CTO의 X 계정에 올라온 15초 영상(Discord 소셜과 커뮤니티 담당 직원 촬영, Discord 공식 계정도 공유)에서 초기 빌드(작업 관리자 이름 Discord Phoenix)가 계정 두 개를 동시에 로그인한 상태로 290.2MB를 쓰고, 시작 전 업데이트 화면 없이 백그라운드에서 업데이트한다고 전했다. 같은 조건의 벤치마크는 공개되지 않았고 클라이언트는 아직 공개 배포 전이다. CTO의 원 게시물은 직접 열람하지 못해 보도로만 확인했다.

## 출처

- [Electron, Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron, Why Electron](https://www.electronjs.org/docs/latest/why-electron) — 2026-11-16 엔진 번들의 근거와 크기 비용 확인
- [Building Hybrid Applications with Electron — Slack Engineering, Anaïs Betts](https://slack.engineering/building-hybrid-applications-with-electron/) — 2016-10-25
- [tauri v3.0.0-alpha.0 — GitHub, tauri-apps/tauri](https://github.com/tauri-apps/tauri/releases/tag/tauri-v3.0.0-alpha.0) — 2026-11-16 runtime 선택 방식 확인
- [docs.rs, tauri-runtime-cef](https://docs.rs/crate/tauri-runtime-cef/latest) — 2026-11-16 3.0.0-alpha.7 기준 crate 설명
- [Microsoft Learn, Distribute your app and the WebView2 Runtime](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution) — Evergreen과 Fixed Version의 갱신 차이
- [Tauri, Tauri Architecture](https://v2.tauri.app/concept/architecture/)
- [Tauri, Webview Versions](https://v2.tauri.app/reference/webview-versions/)
- [Microsoft Learn, Process model for WebView2 apps](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/process-model)
- [GPUI — Zed Industries](https://www.gpui.rs/)
- [GPUI README — GitHub, zed-industries/zed](https://github.com/zed-industries/zed/blob/main/crates/gpui/README.md) — 2026-11-09 상태와 플랫폼 확인
- [Every Windows 11 app should kill Electron, and Discord just showed why — Windows Latest](https://www.windowslatest.com/2026/11/06/every-windows-11-app-should-kill-electron-and-discord-just-showed-why-no-starting-screen-and-70-less-ram-even-with-two-accounts-signed-in/) — 2026-11-06, CTO 계정에 올라온 영상의 분석이며 독자 벤치마크가 아님
- [Discord CTO confirms the desktop and mobile apps are being rebuilt in Rust — Inven Global](https://www.invenglobal.com/articles/28182/discord-cto-confirms-the-desktop-and-mobile-apps-are-being-rebuilt-in-rust) — 2차 보도

## 관련 문서

- [[Frontend-Framework-Evaluation|프론트엔드 도구 평가]]
- [[Cross-Platform-Keyboard|플랫폼별 키보드 입력]]
- [[React-Native|React Native]]
- [[V8|V8]]
