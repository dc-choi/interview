---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Observe 이벤트와 installation 식별자"]
---

# Observe 이벤트와 installation 식별자

## Custom event

Observe.logEvent(name, options)는 기능 흐름의 중요한 사건을 기록한다. 이름은 검색과 집계가 쉬운 고정 문자열로 두고 사용자 ID나 주문 ID를 이름에 넣지 않는다. severity는 trace/debug/info/warn/error/fatal, body는 내용, displayName은 session timeline 표시용이다.

attributes 옵션은 JSON string/number/boolean/array/object를 사용한다. Date, undefined, function 같은 값은 기록에서 빠질 수 있다. expo. event와 attribute namespace는 SDK 예약 영역이며 충돌 항목은 버리고 development에서 경고한다.

expo.memory.warning, expo-image.oversized 같은 SDK event도 같은 timeline과 CLI events에서 확인한다. Event 수집은 계정 사용량과 개인정보 범위를 함께 고려한다.

## Client ID 계약

Observe.clientId는 Android/iOS에서 문자열, web에서 null이다. import 직후 읽을 수 있고 configure가 필수는 아니다. 하드웨어나 사용자 계정에서 유도하지 않은 random ID를 native preferences에 저장한다. expo-updates 등 EAS client library와 같은 installation ID를 공유한다.

App launch, 앱 업데이트와 OTA update에는 유지된다. 데이터 삭제/재설치로 바뀌지만 backup restore, Android Auto Backup이 이전 값을 복원할 수 있다. 소개 페이지의 재설치 시 항상 초기화된다는 단순 설명보다 이 예외를 적용한다.

Client ID는 사람을 확정하는 ID가 아니며 익명이라고 단정할 수도 없는 pseudonymous data다. 외부 오류 수집기와 연결하면 개인정보 처리 범위를 검토한다. sampling에서 제외된 installation도 ID를 반환하므로 ID 존재가 metric 전송 증거는 아니다.

## 출처

- [Expo Documentation, User-defined events](https://docs.expo.dev/eas/observe/events)
- [Expo Documentation, Client ID](https://docs.expo.dev/eas/observe/reference/client-id)

## 관련 문서

- [[Expo-Observe]]

- [[Expo]]
