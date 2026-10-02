---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Audio player, session과 background playback"]
---

# Audio player, session과 background playback

## player 생성과 수명

`expo-audio`는 Android/iOS/tvOS/Web playback/recording package이며 format은 각 native media framework와 browser 지원에 의존한다. headphones/Bluetooth device가 disconnect 되면 자동으로 playback을 멈춘다. useAudioPlayer(source,options)는 즉시 load를 시작하고 unmount 시 release 한다. imperative createAudioPlayer는 자동 해제하지 않으므로 사용 종료에 release/remove를 책임진다. source는 URL/local require number/null 또는 {uri,assetId,headers,name}이며 uri가 있으면 assetId를 무시한다.

```tsx
const player = useAudioPlayer(require('./audio.mp3'), { updateInterval: 500 });
const status = useAudioPlayerStatus(player);
async function replay() { await player.seekTo(0); player.play(); }
return <Button title={status.playing ? '일시 정지' : '재생'}
  onPress={() => status.playing ? player.pause() : player.play()} />;
```

play/pause/replace는 void,seekTo(seconds,toleranceBeforeMs?,toleranceAfterMs?)는 Promise이며 tolerance는 iOS만 이다. playback 종료 후 다시 처음부터 재생하려면 seekTo(0)을 await 한다. currentTime/duration은 seconds,volume 0~1,loop/muted/shouldCorrectPitch를 설정한다. rate 범위는 Android0.1~2,iOS0~2,Web browser이며 setPlaybackRate의 iOS pitch quality low/medium/high를 선택한다.

## status, loading과 preload

useAudioPlayerStatus 또는 playbackStatusUpdate listener는 playing/isLoaded/isBuffering/didJustFinish,error|null,duration 0(unknown),playbackState,timeControlStatus,reasonForWaitingToPlay를 준다. live source는 isLive와 currentOffsetFromLive|null을 쓴다. iOS mediaServicesDidReset이면 player가 source 재 load/recovery를 시도한다. event subscription은 remove 한다.

AudioPlayerOptions.updateInterval 기본 500ms,downloadFirst 기본 false는 전체 리소스를 native 임시 디렉터리/Web 메모리로 받아 buffering을 줄이지만 cache eviction과 CORS 비용이 있다. preferredForwardBufferDuration은 seconds(기본 0, 시스템 결정),큰 값은 메모리/네트워크를 늘린다. Web crossOrigin anonymous/use-credentials는 CDN CORS와 맞춰야 한다. iOS keepAudioSessionActive 기본 false,true 면 pause/finish 후에도 session을 유지하며 필요 시 setIsAudioActiveAsync(false)로 해제한다.

preload(source,{preferredForwardBufferDuration=10})는 module scope에서 buffering을 시작한다. getPreloadedSources는 URI 목록이며 iOS는 use/player replace로 소비되면 목록에서 제거되고 Android/Web은 명시적 clear까지 남는다. clearPreloadedSource는 같은 source를 지정하고 clearAllPreloadedSources는 전체 memory를 해제한다. preload는 영구 offline cache가 아니다.

## global session과 background

setAudioModeAsync(partial mode)는 지정한 property만 바꾼다. playsInSilentMode 기본 true이며 Android false 면 ringer silent/vibrate에서 playback을 억제한다. interruptionMode 기본 mixWithOthers는 Android focus를 요청하지 않아 전화 등 focus loss callback이 없다. duckOthers는 다른 audio 볼륨을 낮추고 doNotMix는 exclusive focus를 요청한다. interruptionModeAndroid는 deprecated 다. shouldPlayInBackground 기본 false,shouldRouteThroughEarpiece 기본 false이며 iOS earpiece는 allowsRecording:true/playAndRecord에 서만효과가 있다. setIsAudioActiveAsync(false)는 전체 playback을 pause 하고 새 재생을 막는 전역 설정이다.

background playback plugin enableBackgroundPlayback 기본 true는 Android FOREGROUND_SERVICE/MEDIA_PLAYBACK+AudioControlsService,iOS UIBackgroundModes audio를 구성한다. native build를 새로만든뒤 session.shouldPlayInBackground=true를 설정한다. Android는**setActiveForLockScreen(true)+doNotMix**까지 필요하며 없으면 약3 분 후 OS가 playback을 멈출수있다. iOS lockscreen은 optional이다. 이 설정을 앱 종료 후 모든 작업 영구 유지로 해석하지 않는다.

lockscreen을 제어하는 player는 하나뿐이다. setActiveForLockScreen(active,{title,artist,albumTitle,artworkUrl},{showSeekBackward,showSeekForward,isLiveStream})로 등록한다. live stream이면 duration/scrub/seek controls가 숨겨진다. updateLockScreenMetadata는 active player에 만효과가있고 clearLockScreenControls 또는 active false로 정리한다. requestNotificationPermissionsAsync는**Android에서만 available이 고다른 platform은 throw**하므로 generated platform 목록만 믿지 않는다.

- playlist: [[Expo-SDK-A-Audio-Playlist]]
- 녹음: [[Expo-SDK-A-Audio-Recording]]
- PCM capture와 sampling: [[Expo-SDK-A-Audio-Stream]]

## 출처

- [Expo Documentation, Audio (expo-audio)](https://docs.expo.dev/versions/latest/sdk/audio)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
