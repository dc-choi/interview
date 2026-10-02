---
tags: [expo, expo-sdk, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Manifest 타입"]
---

# Expo SDK Manifest 타입

expo-manifests는 native/Expo Go manifest 타입을 제공한다. npx expo install expo-manifests 후 type import를 사용한다. manifest는 configuration/type 계약이며 그 자체로 현재 실행 환경을 증명하는 것은 아니다.

EmbeddedManifest는 build createManifest.js 단계에서 생성되고 id:string, commitTime:number, assets:any[]다. BareManifest는 deprecated alias다. ExpoUpdatesManifest는 id/createdAt/runtimeVersion:string, launchAsset:ManifestAsset, assets:ManifestAsset[], metadata:object, extra?:ManifestExtra다. ManifestAsset의 reference 최소 field는 url:string이다. NewManifest는 ExpoUpdatesManifest로 renamed된 deprecated alias다.

ManifestExtra는 scopeKey(client data scoping opaque key)와 eas?:{projectId?:UUID}, expoClient?:ExpoClientConfig, expoGo?:ExpoGoConfig를 포함한다. projectId/scopeKey는 project transfer/rename으로 바뀌지 않는다. ExpoClientConfig는 ExpoConfig에 development CLI 전용 hostUri를 더한다.

ExpoGoConfig는 debuggerHost, developer(record+tool), mainModuleName, packagerOpts를 포함한다. packagerOpts는 dev/minify/strict flags와 hostType/lanType/urlRandomness/urlType 등 development 연결 설정이다. Expo Go 내부 configuration을 production Update manifest와 동일한 구조로 읽지 않는다.

```ts
import type { ExpoUpdatesManifest } from 'expo-manifests';
function runtimeOf(manifest: ExpoUpdatesManifest) { return manifest.runtimeVersion; }
```

실제 Updates manifest/embedded launch 판별은 [[Expo-SDK-Updates]]의 runtime API와 함께 처리한다. 타입 assertion만으로 deprecated/embedded/update variant가 변환되는 것은 아니다.

## 출처

- [Expo Documentation, Manifests](https://docs.expo.dev/versions/latest/sdk/manifests)

## 관련 문서

- [[Expo-SDK-Updates]]
