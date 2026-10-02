---
tags: [react-native, runtime]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native globals와 브라우저 호환의 범위

React Native 0.87은 일부 web-compatible global API를 제공하지만 브라우저 전체 환경이나 Node.js runtime을 제공하는 것은 아니다. runtime 전역과 native OS 기능을 구분한다.

## 사용 목적별 전역

| 묶음 | 제공되는 이름과 연결 |
|---|---|
| 네트워크 | fetch, Request, Response, Headers, XMLHttpRequest, WebSocket |
| URL | URL, URLSearchParams |
| 요청 취소 | AbortController, AbortSignal |
| 데이터 | Blob, File, FileReader, FormData |
| 예약 | setTimeout/clearTimeout, setInterval/clearInterval |
| frame와 idle | requestAnimationFrame/cancelAnimationFrame, requestIdleCallback/cancelIdleCallback |
| microtask | queueMicrotask |
| 주변 객체 | console, navigator, process, alert |

URL을 파싱하는 것과 OS가 URL scheme을 열도록 하는 Linking은 다른 기능이다. File/Blob이 있다고 Android/iOS 파일 접근 권한을 해결하는 것은 아니며 navigator/process가 있다고 모든 브라우저/Node 속성을 사용할 수도 없다.

## globalThis와 개발 분기

window는 globalThis alias, global은 legacy alias다. 새 global 객체 접근은 globalThis를 우선한다. window.document가 browser DOM이라는 전제로 접근하지 않는다. native ref의 ownerDocument는 별도 UI tree node다.

`__DEV__`는 컴파일에 inline되는 pseudo-global이다. 개발 전용 if block은 minified build에서 제거된다. runtime 권한, 서버 secret과 보안 경계를 이 변수로 보호하지 않는다.

## 문서의 한계와 확인 기준

여러 global reference는 API 존재와 web specification 기반이라는 설명만 두고 상세 계약은 작성 중이다. 이 상태를 브라우저 구현과의 완전 호환 증거로 취급하지 않는다. 특정 option이나 edge case를 사용하려면 적용 RN version의 구현과 해당 web specification, 실제 Android/iOS 실행을 추가 확인한다.

timer의 실행 시점은 JS 작업, frame과 앱 수명에 영향을 받는다. cleanup에서 예약을 취소하고 긴 작업은 frame이나 idle callback에 넣었다는 이유만으로 부하가 사라진다고 보지 않는다.

## 출처

- [React Native, fetch](https://reactnative.dev/docs/global-fetch)
- [React Native, Request](https://reactnative.dev/docs/global-Request)
- [React Native, Response](https://reactnative.dev/docs/global-Response)
- [React Native, Headers](https://reactnative.dev/docs/global-Headers)
- [React Native, XMLHttpRequest](https://reactnative.dev/docs/global-XMLHttpRequest)
- [React Native, WebSocket](https://reactnative.dev/docs/global-WebSocket)
- [React Native, URL](https://reactnative.dev/docs/global-URL)
- [React Native, URLSearchParams](https://reactnative.dev/docs/global-URLSearchParams)
- [React Native, AbortController](https://reactnative.dev/docs/global-AbortController)
- [React Native, AbortSignal](https://reactnative.dev/docs/global-AbortSignal)
- [React Native, Blob](https://reactnative.dev/docs/global-Blob)
- [React Native, File](https://reactnative.dev/docs/global-File)
- [React Native, FileReader](https://reactnative.dev/docs/global-FileReader)
- [React Native, FormData](https://reactnative.dev/docs/global-FormData)
- [React Native, setTimeout](https://reactnative.dev/docs/global-setTimeout)
- [React Native, clearTimeout](https://reactnative.dev/docs/global-clearTimeout)
- [React Native, setInterval](https://reactnative.dev/docs/global-setInterval)
- [React Native, clearInterval](https://reactnative.dev/docs/global-clearInterval)
- [React Native, requestAnimationFrame](https://reactnative.dev/docs/global-requestAnimationFrame)
- [React Native, cancelAnimationFrame](https://reactnative.dev/docs/global-cancelAnimationFrame)
- [React Native, requestIdleCallback](https://reactnative.dev/docs/global-requestIdleCallback)
- [React Native, cancelIdleCallback](https://reactnative.dev/docs/global-cancelIdleCallback)
- [React Native, queueMicrotask](https://reactnative.dev/docs/global-queueMicrotask)
- [React Native, navigator](https://reactnative.dev/docs/global-navigator)
- [React Native, process](https://reactnative.dev/docs/global-process)
- [React Native, alert](https://reactnative.dev/docs/global-alert)
- [React Native, console](https://reactnative.dev/docs/global-console)
- [React Native, window](https://reactnative.dev/docs/global-window)
- [React Native, global](https://reactnative.dev/docs/global-global)
- [React Native, __DEV__](https://reactnative.dev/docs/global-__DEV__)

## 관련 문서

- [[React-Native-JavaScript-Runtime]]
- [[React-Native-Timers]]
- [[RN-Networking]]
- [[RN-Native-Nodes]]
- [[RN-Web-Performance-APIs]]
