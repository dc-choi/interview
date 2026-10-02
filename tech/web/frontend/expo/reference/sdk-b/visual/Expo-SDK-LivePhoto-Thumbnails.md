---
tags: [expo, expo-sdk, visual]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Live Photo와 레거시 썸네일"]
---

# Expo SDK Live Photo와 레거시 썸네일

expo-live-photo는 iOS Live Photo 표시/재생 모듈이며 Expo Go에 포함된다. npx expo install expo-live-photo 후 LivePhotoView를 import한다. LivePhotoView.isAvailable():boolean으로 device 지원 여부를 검사한다.

## LivePhotoView

source는 {photoUri, pairedVideoUri}|null이다. 촬영 당시 photo/video metadata가 서로 paired된 원본이어야 하며 변형/별도 파일을 임의 결합할 수 없다. ImagePicker mediaTypes:['livePhotos'] 결과의 첫 asset.uri와 pairedVideoAsset?.uri를 취소 여부와 함께 확인한다.

```tsx
<LivePhotoView ref={viewRef} source={asset} contentFit="contain" isMuted
  onLoadError={({message})=>setError(message)} style={{height:300}} />
```

contentFit contain(default)/cover, isMuted=true(default), useDefaultGestureRecognizer=true(default longpress)를 설정한다. ViewProps도 받는다. onLoadStart/onPreviewPhotoLoad/onLoadComplete/onLoadError({message}), onPlaybackStart/onPlaybackStop으로 preview 준비와 video playback 상태를 구분한다. ref.startPlayback('hint'|'full'):void는 짧은 hint 또는 full video를 재생하며 stopPlayback():void로 중지한다. source type은 style 인수를 필수로 표시하지만 설명은 생략시 full이라고 하므로 명시적으로 전달한다.

## Deprecated VideoThumbnails

expo-video-thumbnails는 patch를 받지 않는 deprecated module이다. 원문은 SDK56 제거 예정 문구를 SDK57 페이지에 여전히 표시하므로 설치 가능 여부를 그 문구만으로 단정하지 않는다. 신규 사용은 [[Expo-SDK-Video]]의 player.generateThumbnailsAsync로 이동한다.

기존 import * as VideoThumbnails의 getThumbnailAsync(localOrRemoteURI,{time, quality, headers}):Promise<{uri, width, height}>는 time을 milliseconds, quality를 0..1로 받는다. remote headers는 실제 network request에 전달된다. Android/iOS/tvOS의 legacy 계약이며 thumbnail 생성 failure를 catch한다. 새 Video API의 시간 단위/결과 native image reference를 이 legacy file URI와 혼동하지 않는다.

## 출처

- [Expo Documentation, LivePhoto](https://docs.expo.dev/versions/latest/sdk/live-photo)
- [Expo Documentation, VideoThumbnails](https://docs.expo.dev/versions/latest/sdk/video-thumbnails)

## 관련 문서

- [[Expo-SDK-Video]]
