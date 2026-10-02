---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo module native call mocks"]
---

# Expo module native call mocks

## Jest에서 native 구현 대체

Expo 앱 unit test는 jest-expo preset을 사용하는 방식이 권장된다. native Swift/Kotlin은 Node/Jest에서 실행할 수 없으므로 mock은 JS가 호출할 함수와 반환값을 제공한다. mock 통과는 실제 native correctness의 증거가 아니다.

module package의 `mocks/`에 native Name과 같은 filename을 둔다. 예를 들어 ExpoClipboard module은 mocks/ExpoClipboard.ts에 hasStringAsync를 export한다. jest-expo의 requireNativeModule 경로가 이 mock을 돌려준다.

```ts
// mocks/ExpoClipboard.ts
export async function hasStringAsync(): Promise<boolean> { return false; }
```

## 자동 생성

macOS/SourceKitten을 준비한 뒤 expo-module.config.json이 있는 module directory에서 `npx expo-modules-test-core generate-ts-mocks`를 실행한다. generate-js-mocks는 JS output이다. Swift source에서 method/view를 읽으므로 Kotlin-only method는 직접 추가한다. generated stub의 any, 빈 함수와 event type은 실용적 반환 contract에 맞게 보완한다.

## 무엇을 검증하는가

| JS 책임 | assertion 예 |
|---|---|
| parameter 전달 | toHaveBeenCalledWith |
| fallback/default option 전달 | wrapper가 native에 전달한 실제 object |
| Promise 성공/실패 처리 | resolves/rejects와 error mapping |
| mount/unmount 자원 호출 | renderHook와 unmount, start/stop 호출 |
| parameter 변경 | rerender 후 이전 작업 stop/새 작업 start |

toHaveBeenCalled 계열은 jest.fn spy가 필요하다. 단순 export function stub을 그대로 import했을 때 자동 spy라고 가정하지 않는다. 필요하면 jest.mock으로 native module을 spy 구현으로 대체한다. beforeEach/afterEach에서 reset하고 throw, unexpected native value와 cleanup 경로를 다룬다.

view rendering, OS permission, queue/thread, actual native callback과 platform-specific method는 example app/device build에서 별도 검증한다. mocks는 JS wrapper tests를 native binary와 분리하는 도구이며 module availability 문제를 해결하지 않는다.

## 출처

- [Expo Documentation, Mocking native calls in Expo modules](https://docs.expo.dev/modules/mocking)

## 관련 문서

- [[Expo-Native|Expo native 모듈과 알림]]
