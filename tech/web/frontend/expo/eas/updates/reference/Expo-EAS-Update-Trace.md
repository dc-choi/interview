---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update ID와 Dashboard 추적"]
---

# EAS Update ID와 Dashboard 추적

Updates.updateId는 platform update ID이며 group ID와 다르다. release에서 embedded update도 ID를 가질 수 있지만 embedded launch는 일반 OTA update record로 Dashboard에서 찾을 수 없다. 원문의 항상 ID 반환 설명은 disabled/development의 null 가능성을 제외한 맥락으로 읽는다.

## Embedded 여부와 링크

```ts
const id = Updates.updateId;
const canTrace = !Updates.isEmbeddedLaunch && id !== null;
```

먼저 isEmbeddedLaunch를 확인하고 downloaded update라면 아래 Dashboard URL을 만든다.

```text
https://expo.dev/accounts/<account>/projects/<project>/updates/<updateId>
```

Dashboard의 group URL에 platform-specific updateId를 넣어도 해당 group을 열 수 있다. account/project와 실제 실행 ID를 함께 기록한다. runtime/channel과 createdAt도 비교하며 remote에서 publish한 최신 group과 device의 현재 실행 ID가 같다고 가정하지 않는다. embedded bundle patch upload 기능을 client embedded launch의 일반 OTA record lookup과 혼동하지 않는다.

## 출처

- [Expo Documentation, How to trace an update ID back to the EAS dashboard](https://docs.expo.dev/eas-update/trace-update-id-expo-dashboard)

## 관련 문서

- [[Expo-EAS-Update-Debug]]
- [[Expo-SDK-Updates]]
