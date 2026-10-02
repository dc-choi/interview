---
tags: [expo, expo-sdk, video]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Video Player와 이벤트"]
---

# Expo SDK Video Player와 이벤트

expo-video는 Android/iOS/tvOS/web과 Expo Go에서 VideoPlayer와 VideoView를 분리해 재생한다. `npx expo install expo-video` 후 useVideoPlayer/VideoView를 import한다. player property 변경은 React state를 갱신하지 않으므로 이벤트를 구독한다. 화면은 [[Expo-SDK-Video-View]], source/cache/DRM은 [[Expo-SDK-Video-Sources]]에 있다.

## 생성, release와 playback

useVideoPlayer(source, setup?, playerBuilderOptions?)는 unmount 시 release한다. createVideoPlayer(source, options?)는 소유자가 release()해야 한다. Android에서는 한 player를 여러 mounted VideoView에 동시에 연결할 수 없다. player는 view 없이 preload/buffer할 수 있지만 메모리와 network 비용이 발생한다.

```tsx
const player = useVideoPlayer(source, p=>{p.loop=true;});
const {isPlaying} = useEvent(player,'playingChange',{isPlaying:player.playing});
return <VideoView player={player} style={{height:220}} />;
```

play()/pause()/replay()/seekBy(seconds)는 void를 반환하고 currentTime에 seconds를 지정해 seek한다. currentTime/duration/bufferedPosition 단위도 seconds다. bufferedPosition=-1은 판정 불가, 0은 현재 위치까지 buffer되지 않았음을 뜻한다. replace(source)는 iOS UI thread를 동기적으로 막을 수 있어 replaceAsync(source)를 사용한다. Android/web에서는 두 API의 동작이 동등하다. iOS PHAsset URI는 constructor/replaceAsync에서 지원하며 legacy asset.uri를 사용한다. localUri는 필요한 접근 권한을 포함하지 않는다.

playing/status/duration/isLive/videoTrack 등은 readonly다. loop=false, muted=false, volume=1(0..1), playbackRate=1(0..16), preservesPitch=true, keepScreenOnWhilePlaying=true가 기본이다. muted와 volume은 독립적이다. Android의 화면 유지 기능은 보이는 view에서만 동작한다. PlayerBuilderOptions는 생성 전 Android seekForwardIncrement/seekBackwardIncrement를 seconds로 설정하며 0.001..999 범위로 제한된다.

## Event state

expo useEvent는 state와 자동 cleanup, useEventListener는 callback과 자동 cleanup을 제공한다. player.addListener는 subscription.remove()로 정리한다. statusChange에는 idle/loading/readyToPlay/error와 optional error.message/oldStatus가 있다. sourceLoad의 duration/available tracks/source metadata는 재생 buffer 준비 완료를 뜻하지 않는다.

playingChange, playToEnd, sourceChange, mutedChange, volumeChange, playbackRateChange, audioTrackChange/subtitleTrackChange/videoTrackChange, availableAudioTracksChange/availableSubtitleTracksChange, isExternalPlaybackActiveChange를 구독한다. timeUpdateEventInterval=0이면 timeUpdate가 없고 양수 seconds로 설정하면 currentTime/bufferedPosition/currentLiveTimestamp/currentOffsetFromLive를 전달한다.

availableAudioTracks/availableSubtitleTracks 항목에는 language/label/name/default/autoselect와 Android id가 있다. subtitleTrack/audioTrack은 제공된 배열 항목을 선택하며 subtitleTrack=null은 자막을 끈다. availableVideoTracks/videoTrack에는 size(px), frameRate, averageBitrate/peakBitrate(bits/s), mimeType, HLS url, videoRange(sdr/hlg/pq), Android isSupported가 있다. deprecated bitrate 대신 새 fields를 사용한다. peakBitrate 설명의 average 표기는 원문 불일치다. iOS HLS track 정보는 .m3u8 또는 contentType:hls가 필요하다.

## Live, buffer와 seek

currentLiveTimestamp는 EXT-X-PROGRAM-DATE-TIME 기반 frame의 서버 시각이며 metadata가 없으면 null이다. currentOffsetFromLive/targetOffsetFromLive는 seconds다. metadata 누락을 non-live로 취급하지 않는다.

bufferOptions는 객체 전체를 할당한다. preferredForwardBufferDuration은 Android 20초/iOS 0(auto), Android minBufferForPlayback=2초/maxBufferBytes=0(auto)/prioritizeTimeOverSizeThreshold=false, iOS waitsToMinimizeStalling=true가 기본이다. forward duration보다 큰 minBufferForPlayback은 무시된다.

seekTolerance{toleranceBefore, toleranceAfter}는 음수가 아닌 seconds이며 기본 0이다. 큰 허용 오차는 정확도를 낮추고 속도를 높일 수 있다. 잦은 seek에는 scrubbingModeOptions.scrubbingModeEnabled를 잠시 켠다. Android는 재생을 억제하므로 drag 종료 시 false로 돌리고 iOS는 pause가 권장된다. Android allowSkippingMediaCodecFlush/enableDynamicScheduling/increaseCodecOperatingRate/useDecodeOnlyFlag(API34+)는 기본 true이며 최적화와 resource 비용을 함께 판단한다.

## 출처

- [Expo Documentation, Video (expo-video)](https://docs.expo.dev/versions/latest/sdk/video)

## 관련 문서

- [[Expo-SDK-Video-View]]
- [[Expo-SDK-Video-Sources]]
- [[Expo-SDK-LivePhoto-Thumbnails]]
