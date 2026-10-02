---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Asset 파일 로딩과 캐시"]
---

# Asset 파일 로딩과 캐시

## 설치와 asset reference

`npx expo install expo-asset`, `import { Asset, useAssets } from 'expo-asset'`. Android/iOS/tvOS/web/Expo Go를 지원한다. require('./file.png')는 Metro asset module이며 Asset.fromModule은 module ID, network URL 또는 uri/width/height object에서 Asset을 만든다. fromURI와 fromMetadata도 제공한다.

name/type/hash는 file stem/extension/MD5 metadata 다. width/height는 image scale(@2x 등)을 나눈 logical 크기다. downloaded는 download 완료 상태, localUri는 local cache file URI 또는 null이다. uri는 development Metro/legacy asset server 경로와 연결될 수 있으며 current updates 환경에서는 remote uri에 직접 의존하지 않는다.

## Download와 hooks

```ts
const asset = Asset.fromModule(require('./assets/example.png'));
await asset.downloadAsync();
if (asset.localUri) console.log(asset.localUri);
```

downloadAsync는 최신 local cache가 있으면 다시 내려받지 않고 Promise<Asset>을 반환한다. Asset.loadAsync는 single/array module/URL을 받고 Asset[]을 반환하는 helper 다. useAssets는 `[Asset[]|undefined, Error|undefined]`이며 loading/error를 나눈다. hook input 목록을 동적으로 바꿔도 자동 reload 하지 않는다.

cache는 OS/user에 의해 지워질 수 있어 다음 app session의 영구 파일이 아니다. 영구 보관이 필요하면 document 영역으로 옮기는 정책을 둔다. 캐시 filename은 ExponentAsset-{cacheFileId}.{extension} 형태다. Paths.cache 전체 삭제는 다른 cache도 지우므로 좁은 scope를 고려한다.

## Build-time embedding

expo-asset plugin의 assets는 project-relative files/directories 다. supported types는 png/jpg/gif, mp4/mp3/lottie/riv, db, glb 다. native resource name은 filename 기반이며 변경은 native rebuild가 필요하다. lottie/riv 등 require 하려면 Metro assetExts도 확인한다. db는 SQLite import 절차를 따르고 모든 file extension을 plugin이 지원한다고 가정하지 않는다.

## 출처

- [Expo Documentation, Asset](https://docs.expo.dev/versions/latest/sdk/asset)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
