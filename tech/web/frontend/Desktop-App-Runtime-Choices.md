---
tags: [web, frontend, desktop, electron, webview, rust, gpu-ui]
status: done
verified_at: 2026-11-09
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
