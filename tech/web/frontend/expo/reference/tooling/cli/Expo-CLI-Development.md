---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo CLI 개발 서버와 실행 대상"]
---

# Expo CLI 개발 서버와 실행 대상

## CLI와 서버

`npx expo`는 프로젝트의 expo 패키지에 포함된 CLI이며 기본 동작은 `expo start`다. Metro 개발 서버의 기본 port는 8081이다. Expo CLI와 React Native CLI는 함께 쓸 수 있지만 기존 native 프로젝트는 Expo bundling 연결을 별도로 구성해야 한다.

expo-dev-client가 있으면 기본 실행 대상으로 development build를 사용하며 없으면 Expo Go를 사용한다. `--dev-client`, `--go`로 강제하고 터미널 S로 전환한다. A/I/W는 Android/iOS Simulator/웹 열기, Shift+A/I는 기기 선택, R은 reload, M은 native dev menu, J는 Hermes DevTools, O는 editor, E는 QR 표시다.

## 연결 방식

기본 연결은 LAN이다. `--localhost`는 localhost로 제한하며 `--port 0`은 빈 port를 선택한다. `EXPO_PACKAGER_PROXY_URL`은 클라이언트에 전달할 proxy 주소를 지정한다.

`--tunnel`은 ngrok을 통해 외부에서 개발 서버에 접근하게 한다. @expo/ngrok 구성이 필요하고 LAN보다 느리며 양쪽 네트워크 연결이 필요하다. 주소가 공개되므로 URL의 임의성을 인증 수단으로 취급하지 않는다. `--offline`과 동시에 사용할 수 없다. `--https`는 deprecated다.

`--offline`은 CLI 네트워크 요청을 막는 개발 모드다. 앱의 API 요청까지 차단하는 옵션이 아니다. .expo의 devices.json/settings.json은 로컬 기기와 서버 상태이므로 소스와 함께 공유하지 않는다.

## Open endpoint

`GET /_expo/open`은 CLI가 열 URL을 JSON으로 조회한다. `platform=ios|android|web`을 지정하거나 생략해 모든 플랫폼을 조회한다. `runtime` 값은 default/expo/custom/unknown이며 마지막은 기기에서 실행 대상을 고르는 페이지를 반환한다.

응답의 url은 deep link 또는 선택 페이지, scheme은 앱 scheme, availableRuntimes는 가능한 실행 대상, appId는 bundle ID/package다. 플랫폼을 생략하면 platforms 객체로 모인다. 앱이 실제 기기에 설치됐다는 확인과 appId 조회는 다르다.

`POST /_expo/open?platform=ios`는 서버 호스트에서 기기를 실제로 여는 변경 동작이다. 동일 origin만 허용한다. 200은 실행 정보, 403은 origin 불일치, 501은 호스트의 플랫폼 실행 불가, 500은 실행 과정 오류다. 원격 도구는 GET으로 URL을 얻고 원격 기기에서 여는 흐름을 구분한다.

SDK 57 custom deep link는 `<scheme>://expo-development-client/?url=...`다. CLI 최신 문서에 있는 `__expo_url` 형식과 `EXPO_NO_DEV_MENU`는 SDK 58 이상 설명이므로 SDK 57에 그대로 적용하지 않는다.

## 계정과 진단

register/login/whoami/logout은 Expo 계정을 다루며 EAS CLI와 자격 증명을 공유한다. iOS 실기기의 Expo Go는 CLI와 같은 Expo 계정 로그인 여부도 확인한다. CLI 로그인과 Apple 개발자 계정 서명은 다른 단계다.

`DEBUG=expo:*` 또는 `EXPO_DEBUG`는 CLI 로그, `EXPO_PROFILE`은 CLI 성능 측정이다. 앱 자체 profiling과 구분한다. `EXPO_NO_TELEMETRY=1`로 선택적인 사용 통계 수집을 끌 수 있다. 자세한 빌드와 도구 옵션은 [[Expo-CLI-Build-Export]], [[Expo-CLI-Config-Install]]에서 이어진다.

## 출처

- [Expo Documentation, Expo CLI](https://docs.expo.dev/more/expo-cli)

## 관련 문서

- [[Expo-Tooling-CLI]]

- [[Expo]]
