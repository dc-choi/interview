---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo update QR 코드 주소"]
---

# Expo update QR 코드 주소

## QR 생성 서비스

`qr.expo.dev/eas-update`는 update를 열기 위한 QR SVG 또는 URL을 반환한다. Development build의 deep link는 development client가 대상 update 서버에서 update를 가져오도록 지정한다. QR은 실행 링크이며 native runtime 호환성을 만들어 주는 변환 도구가 아니다.

## 조회 방식

| 대상 | 필수 query |
| --- | --- |
| 빌드 조건의 최신 update | `projectId`, `runtimeVersion`, `channel` |
| 플랫폼별 update 하나 | `updateId` |
| update group | `projectId`, `groupId` |
| branch의 최신 update | `projectId`, `branchId` |
| channel에 연결된 branch의 update | `projectId`, `channelId` |

```text
https://qr.expo.dev/eas-update?projectId=PROJECT_ID&runtimeVersion=RUNTIME&channel=preview&slug=my-app&format=url
```

`slug`는 development build를 대상으로 할 앱 slug다. 생략 기본값 exp는 Expo Go를 대상으로 한다. `appScheme`은 deprecated이며 slug로 대체한다. `host`의 기본값은 u.expo.dev다. `format` 기본값 svg 대신 url을 쓰면 plain text URL을 받는다.

문자열 query를 만들 때 각 값을 URL encoding한다. source 예제의 추상 placeholder는 실제 ID로 바꾸며 channel 이름과 channel ID, 플랫폼별 update ID와 group ID를 혼동하지 않는다. Expo Go가 열 수 있는 범위는 해당 Go 버전과 SDK 지원 조건을 별도로 따른다.

## 출처

- [Expo Documentation, qr.expo.dev](https://docs.expo.dev/more/qr-codes)

## 관련 문서

- [[Expo-Tooling-CLI]]

- [[Expo]]
