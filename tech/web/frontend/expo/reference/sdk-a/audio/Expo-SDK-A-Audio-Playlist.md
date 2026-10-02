---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AudioPlaylist queue, loop와 gapless playback"]
---

# AudioPlaylist queue, loop와 gapless playback

## hook과 queue

useAudioPlaylist({sources=[],loop='none',updateInterval=500,crossOrigin})는 gaplessqueue의 SharedObject를 만들고 unmount에 해제한다. createAudioPlaylist는 manual 수명을관리한다. sources는 require/URL/sourceobject이고 returnedsourceinfo는 name/uri 다. useAudioPlaylistStatus는 playlistStatusUpdate를 구독해 currentIndex,trackCount,currentTime/durationseconds,isLoaded/isBuffering,playing,muted,volume,playbackRate,loop,didJustFinish를 반환한다.

```tsx
const playlist = useAudioPlaylist({ sources: tracks, loop: 'all' });
const status = useAudioPlaylistStatus(playlist);
return <View>
  <Text>{status.currentIndex + 1} / {status.trackCount}</Text>
  <Button title="다음" onPress={() => playlist.next()} />
</View>;
```

## mutation과 navigation

add(source)는끝에추가,insert(source,index)는위치삽입,remove(index)는한 track 제거,clear는 전체 queue 제거,destroy는 native 자원해제다. remove(index)를 player.remove()의자원해제와혼동하지 않는다. next/previous는 allloop에 서양끝을 wrap 하고 noneloop 끝에서는 no-op이다. skipTo(index)는 track 선택,seekTo(seconds)는현재 track 내 positionPromise 다. play/pause는 void 다.

loopnone은 마지막뒤정지,single은 현재 track 반복,all은 전체 queue 반복이다. currentIndex/sources/trackCount는 readonly이며 queue가 바뀌면 UIindex의 유효범위를다시계산한다. trackChanged는{previousIndex,currentIndex},playlistStatusUpdate는 상태 snapshot을 emit 한다. manualsubscription은 remove 한다. Web crossOrigin은 audioelementCORS와 audio 데이터접근을조절하며 server 정책과함께설정한다. nativebackgroundsession 설정은 [[Expo-SDK-A-Audio]]를따르고 playlistpage의 queue 기능만으로 lockscreen/background 수명을보장하지 않는다.

- [Expo Documentation, Audio (expo-audio)](https://docs.expo.dev/versions/latest/sdk/audio/)

## 출처


## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
