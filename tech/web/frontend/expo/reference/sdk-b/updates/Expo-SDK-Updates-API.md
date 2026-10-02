---
tags: [expo, expo-sdk, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Updates Check, Fetch와 Reload API"]
---

# Expo SDK Updates Check, Fetch와 Reload API

Updates API는 release runtime에서 사용한다. development/Expo Go/disabled 환경에서는 check/fetch/reload/extra-param이 reject할 수 있다. 잦은 polling의 bandwidth, battery와 rate-limit 비용을 고려하고 launch/foreground 등 명확한 시점에 검사한다.

## Check와 fetch result

checkForUpdateAsync():Promise<UpdateCheckResult>는 download하지 않는다. 사용 가능하면 {isAvailable:true, isRollBackToEmbedded:false, manifest}, rollback 지시이면 {isAvailable:false, isRollBackToEmbedded:true, manifest:undefined}, 없으면 false/false와 reason을 반환한다. reason은 noUpdateAvailableOnServer/rollbackNoEmbeddedConfiguration/rollbackRejectedBySelectionPolicy/updatePreviouslyFailed/updateRejectedBySelectionPolicy다. isAvailable만 검사하면 rollback을 놓친다.

fetchUpdateAsync():Promise<UpdateFetchResult>는 호환하는 최신 update를 저장한다. 새 update는 isNew=true와 manifest, rollback은 isNew=false/isRollBackToEmbedded=true, 그 외는 false/false다. timeout/server/native 실패는 reject할 수 있으므로 결과 flag와 예외를 모두 처리한다.

```ts
const check = await Updates.checkForUpdateAsync();
if (check.isAvailable || check.isRollBackToEmbedded) {
  const fetched = await Updates.fetchUpdateAsync();
  if (fetched.isNew || fetched.isRollBackToEmbedded) {
    await persistUnsavedWork();
    await Updates.reloadAsync();
  }
}
```

## Reload와 screen

reloadAsync({reloadScreenOptions?}):Promise<void>는 다운로드한 bundle로 다시 시작한다. Expo.reloadAppAsync와 달리 실행 bundle을 바꾼다. Promise resolve는 실제 reload 직전 native instruction을 보낸 시점이므로 await 뒤에 중요한 작업을 두지 않는다. 사용자 작업 저장을 먼저 완료한다. native host/bridge 초기화가 빠지면 production reload가 실패할 수 있다.

reload screen 옵션은 backgroundColor(기본 white), fade=false, image(string/module ID/{url, width, height, scale}), imageFullScreen=false, imageResizeMode(contain/cover/center/stretch), spinner{enabled, color, size:small|medium|large}다. ExpoUpdatesModule.showReloadScreen/hideReloadScreen은 native class API이며 일반 사용에서는 reload option을 우선한다.

## Params, overrides와 logs

getExtraParamsAsync()는 Record<string,string>, setExtraParamAsync(key, value|null|undefined)는 Promise<void>다. Expo-Extra-Params structured field dictionary로 전송하고 nullish 값은 제거한다. 서버가 selection에 사용할 수 있지만 이것을 token 전송의 권한 계약으로 취급하지 않는다.

setUpdateRequestHeadersOverride(headers|null)는 build request headers를 바꾼다. setUpdateURLAndRequestHeadersOverride({updateUrl, requestHeaders}|null)는 URL까지 바꾸며 disableAntiBrickingMeasures=true가 필요하다. 복구 보호를 끄고 잘못된 runtime을 대상으로 할 위험이 있으므로 일반 설정을 대신하는 방법으로 권장하지 않는다. null은 override를 해제한다.

readLogEntriesAsync(maxAge=3600000)는 UpdatesLogEntry[]를 반환한다. timestamp(ms)/message/code/level과 optional updateId/assetId/stacktrace가 있다. code는 초기화, server/load/assets/signature/runtime 등의 진단, level은 trace/debug/info/warn/error/fatal이다. clearLogEntriesAsync는 원문에 현재 client에서 no-op이라고 명시되어 삭제를 보장하지 않는다.

ERR_UPDATES_DISABLED/RELOAD/CHECK/FETCH/READ_LOGS, ERR_NOT_AVAILABLE_IN_DEV_CLIENT를 operation별로 처리한다. native internal manifestString/initialContext에 직접 결합하기보다 public API와 hook의 typed variant를 사용한다.

## 출처

- [Expo Documentation, Updates](https://docs.expo.dev/versions/latest/sdk/updates)

## 관련 문서

- [[Expo-SDK-Updates]]
- [[Expo-SDK-Manifests]]
