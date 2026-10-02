---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo development와 production JS mode"]
---

# Expo development와 production JS mode

## JS mode와 binary build type

`expo start`는 기본 development mode다. warning, runtime validation, developer menu, Fast Refresh와 inspector는 진단에 유용하지만 성능 overhead가 있다. production JS는 minification과 code removal을 적용하며 `__DEV__`가 false다. performance를 development mode 수치로 판단하지 않는다.

```sh
npx expo start --no-dev --minify
```

이 명령은 개발 서버에서 production JS 조건을 재현한다. 앱을 닫고 다시 열어 변경 mode가 반영됐는지 확인한다. JS-only minification 오류와 production branch 누락을 빨리 찾는 데 유용하다.

## 실제 출시 검증과 차이

production JS를 development binary에 load하는 것과 signed Release binary는 다른 조합이다. native compiler optimization, embedded assets, startup, credentials와 network 설정은 실제 release build에서 확인한다. OTA로 publish하는 bundle도 production JS 조건을 가진다.

production mode에서는 CLI terminal console forwarding이 꺼지므로 device native log를 확인한다. Chrome에서 JS를 별도 실행하는 역사적 remote-debug 방식은 현재 Hermes runtime/DevTools 검증과 혼동하지 않는다.

## 출처

- [Expo Documentation, Development and production modes](https://docs.expo.dev/workflow/development-mode)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
