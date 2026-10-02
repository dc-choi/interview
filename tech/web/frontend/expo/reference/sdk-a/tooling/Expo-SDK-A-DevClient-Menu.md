---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["DevClient launcher와 standalone DevMenu"]
---

# DevClient launcher와 standalone DevMenu

## 설치와 선택

`npx expo install expo-dev-client`, `import * as DevClient from 'expo-dev-client'`. debug native build에 launcher, network/debug tools와 extensible dev menu를 넣는다. native module 구성은 해당 development binary에 포함된다.

launcher가 필요 없는 brownfield 앱은 `npx expo install expo-dev-menu`, `import * as DevMenu from 'expo-dev-menu'`를 standalone 으로 사용할 수 있다. dev-client는 dev-menu를 포함하므로 전체 development build에 두 library를 따로 중복 설치할 이유는 없다. menu는 shake, three-finger long press 또는 programmatic open 으로 접근한다.

## Plugin 설정

| 옵션 | 의미 |
|---|---|
| launchMode | most-recent(default) 또는 launcher |
| defaultLaunchURL | fallback/direct launch URL |
| addGeneratedScheme | custom URL scheme 등록, 기본 true |
| android/ios.launchMode | platform override |
| android/ios.defaultLaunchURL | platform URL override |

most-recent는 최근 project 연결을 시도하고 실패 시 fallback/launcher를 사용한다. plugin 설정 변경은 native rebuild가 필요하다. 예제 localhost 주소는 실행 환경에 맞춰 바꾼다. emulator의 host 접근 주소를 원문의10.0.0.2 예제로 확정하지 않는다.

## Menu API

openMenu/closeMenu/hideMenu는 void 다. registerDevMenuItems는 Promise<void>이며 item은 name/callback/shouldCollapse(defaultfalse)다. subsequent registration은 이전 목록을 override 하므로 feature 마다 독립 append처럼 호출하지 않는다.

```ts
await DevMenu.registerDevMenuItems([
  { name: 'Reset test state', callback: resetTestState, shouldCollapse: true },
]);
```

이 UI는 debug build 용이며 production 사용자에게 implementation controls를 보여주는 기능으로 쓰지 않는다. destructive debug item은 실행 scope를 명확히 한다. TV는 SDK54+ 지원이며 Android TV는 유사 기능, Apple TV는 local/tunneled packager 기본 기능을 지원하지만 EAS auth/build/update listing은 제한된다.

## 출처

- [Expo Documentation, DevClient](https://docs.expo.dev/versions/latest/sdk/dev-client)
- [Expo Documentation, DevMenu](https://docs.expo.dev/versions/latest/sdk/dev-menu)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
