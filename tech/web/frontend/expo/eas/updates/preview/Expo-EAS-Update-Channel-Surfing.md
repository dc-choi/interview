---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update channel surfing와 header override"]
---

# EAS Update channel surfing와 header override

SDK54/expo-updates0.29.0 이후 header override로 설치된 release build가 다른 channel을 요청할 수 있다. 일반 dev client에서는 이 API를 지원하지 않으며 release 또는 EX_UPDATES_NATIVE_DEBUG 설정을 사용한다. platform/runtime 호환성은 그대로 적용된다.

## Build header와 persist

native build에 expo-channel-name이 포함되어야 한다. EAS Build의 profile.channel은 이를 추가하지만 local run/build는 updates.requestHeaders 선언과 rebuild가 필요하다. override 가능한 다른 header도 build config에 선언되어야 한다. 전달한 객체는 custom request headers 전체를 대체하므로 계속 필요한 header를 모두 포함한다.

```ts
Updates.setUpdateRequestHeadersOverride({'expo-channel-name':channel});
const result = await Updates.checkForUpdateAsync();
if (result.isAvailable || result.isRollBackToEmbedded) {
  await Updates.fetchUpdateAsync();
  await persistUnsavedWork();
  await Updates.reloadAsync();
}
```

trusted tester의 app-level trigger에서 실행하고 없거나 실패한 update를 표시한다. compatible update가 없다고 기존 bundle이 목표 channel 내용으로 바뀌지는 않는다. override는 device에 persist하며 교체/null clear/uninstall까지 유지된다. Updates.channel은 시작 시 값을 나타내므로 override 직후 바로 바뀌지 않고 reload 뒤 반영된다.

## Build channel로 복귀

setUpdateRequestHeadersOverride(null)로 해제한 뒤 check/fetch/reload하거나 다음 launch를 기다린다. background로 보내는 것과 완전 restart를 구분한다. 앞뒤 channel의 database migration/data shape가 맞지 않으면 전환 후 데이터 손실이나 실행 실패가 발생할 수 있어 일방향 전환 또는 schema compatibility를 설계한다. broken update가 복귀 UI도 막을 수 있으므로 일반 사용자용 즉흥 preview 기능으로 확대하지 않는다.

## 출처

- [Expo Documentation, Channel surfing](https://docs.expo.dev/eas-update/channel-surfing)

## 관련 문서

- [[Expo-EAS-Update-Override]]
- [[Expo-SDK-Updates-API]]
