---
tags: [expo, expo-sdk, video]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Video Source, DRM와 Cache"]
---

# Expo SDK Video Source, DRM와 Cache

VideoSource는 string URI, require의 숫자 asset ID, null 또는 {uri|assetId, contentType, headers, drm, metadata, useCaching}다. uri와 assetId가 함께 있으면 uri가 우선한다. null로 player를 만들고 replaceAsync로 나중에 preload할 수 있다. metadata의 title/artist/artwork는 now-playing 표시를 설정한다.

## Format와 DRM

contentType은 auto(기본)/progressive/hls/dash(Android)/smoothStreaming(Android)다. 확장자가 없는 stream은 auto가 progressive로 판단할 수 있어 명시한다. source.headers는 media request, drm.headers는 license server request다. DRMOptions에는 필수 type/licenseServer, headers, Android multiKey, iOS certificateUrl/base64CertificateData/contentId가 있다. base64 certificate가 있으면 URL을 무시한다. Android는 ClearKey/PlayReady/Widevine, iOS는 FairPlay를 지원한다. header 설정만으로 license 권한이 생기지는 않는다.

## Cache와 thumbnail

useCaching=true는 Android/iOS의 persistent LRU cache를 사용한다. 기본 preferred size는 1GB이며 저장 공간 부족으로 삭제될 수 있어 중요한 offline file 보관에 의존하지 않는다. 일부만 cache되면 offline 재생도 그 부분까지 가능하다. iOS HLS와 양 플랫폼 DRM caching은 지원하지 않는다. getCurrentVideoCacheSize()는 bytes, setVideoCacheSizeAsync(bytes)/clearVideoCacheAsync()는 Promise<void>다. cache 변경/삭제는 VideoPlayer instance가 전혀 없을 때 호출한다. 실제 크기는 preferred limit보다 조금 클 수 있다.

generateThumbnailsAsync(times:number|number[], {maxWidth, maxHeight}?)는 seconds를 기준으로 현재 asset의 VideoThumbnail[]을 반환한다. native image SharedRef를 expo-image의 source로 사용하고 requestedTime/actualTime(seconds)/width/height/nativeRefType을 읽는다. legacy thumbnail의 milliseconds/file URI 결과와 구분한다.

```ts
const thumbnails = await player.generateThumbnailsAsync([0,5,10], {maxWidth:320});
// <Image source={thumbnails[0]} style={{width:320,height:180}} />
```

## Advanced iOS asset transport

VideoAssetTransportProvider는 native 확장점이며 custom Expo Module/build가 필요하고 Expo Go에서는 사용할 수 없다. identifier로 registry를 교체/해제하며 높은 priority부터 선택한다. makeLoadPlan(sourceDescriptor)은 nil로 넘기거나 VideoAssetLoadPlan을 반환한다. 원문의 DASH→localhost HLS 예제는 실제 converter/proxy까지 구현한 코드가 아니다.

load plan에는 assetURL/assetOptions/reportedContentTypeHint, resourceLoaderDelegate/Queue, prepareAsset, retainedObjects, attachErrorHandler, onAssetDeinit을 설정한다. module OnCreate에서 registerProvider, OnDestroy에서 unregisterProvider(withId)를 호출한다. proxy/parser는 asset 수명 동안 retain하고 deinit에서 정리한다. format 변환 시 effective hint도 바꾸고 나중에 발생한 오류를 player에 전달한다. 이 확장점을 기본 iOS DASH 지원으로 해석하지 않는다.

## 출처

- [Expo Documentation, Video (expo-video)](https://docs.expo.dev/versions/latest/sdk/video)

## 관련 문서

- [[Expo-SDK-Video]]
- [[Expo-SDK-Video-View]]
- [[Expo-SDK-LivePhoto-Thumbnails]]
- [[Expo-SDK-MediaLibrary]]
