---
tags: [expo, expo-sdk, video]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK VideoView, PiP와 Background Playback"]
---

# Expo SDK VideoView, PiP와 Background Playback

VideoView는 player(VideoPlayer|null)와 ViewProps를 받는다. contentFit은 contain(기본, 여백)/cover(잘라 채움)/fill(늘림), iOS contentPosition은 dx/dy offset이다. nativeControls=true, requiresLinearPlayback=false, showsTimecodes=true, allowsVideoFrameAnalysis=true가 기본이다. fullscreen에서는 native controls가 항상 활성화된다.

## Controls와 surfaces

buttonOptions 기본값은 showBottomBar/showPlayPause/showSeekBackward/showSeekForward/showSettings=true, showNext/showPrevious=false다. showSubtitles가 undefined면 자막이 있을 때 표시하고 true/false는 항상 표시/숨김이다. fullscreen bottom bar는 종료를 위해 항상 표시되며 fullscreen button은 fullscreenOptions.enable로 제어한다. 원문에 생성되지 않은 nested 옵션은 추정하지 않는다.

Android surfaceType은 surfaceView(기본, 전력/성능에 유리) 또는 textureView다. VideoView가 겹치고 cover일 때 bounds 밖으로 표시되는 upstream issue에는 textureView를 사용한다. surfaceType은 runtime에 바꾸지 않는다. useExoShutter=false는 첫 frame 전 cover 표시를 제어한다. web crossOrigin은 undefined/anonymous/use-credentials이며 CDN CORS와 맞아야 한다. playsInline을 설정한다. 실험적인 useAudioNodePlayback은 기본 false이며 중복 audio를 줄일 수 있지만 일부 source의 audio를 깨뜨릴 수 있고 runtime 변경도 금지다.

onFirstFrameRender는 cover를 숨길 시점이지만 quality/track 변경에도 호출될 수 있다. onFullscreenEnter/Exit, onPictureInPictureStart/Stop으로 상태를 반영한다. ref.enterFullscreen()/exitFullscreen()은 Promise<void>다. Android fullscreen에서는 JS runtime이 pause되므로 setTimeout으로 종료할 수 없다. playToEnd 등 native event listener를 사용한다.

## Native config, PiP와 background

plugin의 supportsBackgroundPlayback/supportsPictureInPicture가 undefined면 기존 설정을 유지하고 true면 iOS UIBackgroundModes audio와 Android service/PiP를 설정하며 false면 제거한다. binary rebuild가 필요하다. player.staysActiveInBackground/showNowPlayingNotification은 기본 false인 runtime 선택이다. Android now-playing에는 background 지원이 필요하다.

Video.isPictureInPictureSupported()는 boolean이다. view.allowsPictureInPicture/startsPictureInPictureAutomatically(기본 false)와 ref.startPictureInPicture()/stopPictureInPicture()를 사용한다. 미지원 device의 start는 throw하고 동시에 PiP player는 하나뿐이다. plugin 설정도 필요하다.

## App-wide audio와 AirPlay

audioMixingMode 우선순위는 doNotMix>auto>duckOthers>mixWithOthers다. 동시 player 중 가장 강한 mode가 앱 audio에 적용된다. auto는 muted일 때 다른 audio를 허용하지만 iOS now-playing 표시가 활성화되면 interrupt할 수 있다. doNotMix는 muted여도 다른 앱을 pause한다. iOS now-playing은 auto/doNotMix에서만 동작한다.

allowsExternalPlayback=true와 isExternalPlaybackActive는 AirPlay 제어/상태다. VideoAirPlayButton은 AVRoutePickerView이며 tint/activeTint/prioritizeVideoDevices=true, onBeginPresentingRoutes/onEndPresentingRoutes를 받는다. device/provider/DRM의 외부 재생 조건은 별도로 확인한다.

## 출처

- [Expo Documentation, Video (expo-video)](https://docs.expo.dev/versions/latest/sdk/video)

## 관련 문서

- [[Expo-SDK-Video]]
- [[Expo-SDK-Video-Sources]]
- [[Expo-SDK-Keep-Awake]]
