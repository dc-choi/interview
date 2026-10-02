---
tags: [expo, expo-sdk, communication]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK 음성 합성"]
---

# Expo SDK 음성 합성

expo-speech는 Android/iOS/web에서 text-to-speech를 제공하며 Expo Go에 포함된다. npx expo install expo-speech, import * as Speech from 'expo-speech'로 사용한다. 물리 iOS 기기는 silent mode에서 소리가 나지 않을 수 있다.

## Queue와 제어

speak(text, options={}):void는 진행 중이면 queue에 추가한다. maxSpeechInputLength는 플랫폼별 제한이며 iOS는 Number.MAX_VALUE로 기술된다. stop():Promise<void>는 재생과 queue를 모두 지운다. pause()/resume():Promise<void>는 Android에서 지원하지 않는다. isSpeakingAsync():Promise<boolean>은 pause 중에도 true다. 여러 화면이 같은 queue를 쓸 때 unmount의 stop이 다른 화면 발화를 끊을 수 있어 소유권을 정한다.

```ts
const voices = await Speech.getAvailableVoicesAsync();
Speech.speak('읽을 내용', {language:'ko-KR', rate:1, pitch:1,
  onDone:()=>setReading(false), onError:()=>setReading(false)});
```

getAvailableVoicesAsync():Promise<Voice[]>는 identifier/language/name/quality(Default/Enhanced)를 반환한다. web에는 isDefault/localService/voiceURI도 있다. options.language는 BCP47, voice는 identifier, pitch/rate 기본 1, volume은 0..1(default1)이다. iOS useApplicationAudioSession=false는 독립 audio session으로 mixing/ducking/interruption을 관리하는 선택이다.

onStart/onDone/onStopped/onError와 word boundary onBoundary를 통해 상태를 반영한다. onPause/onResume/onMark 등 web callback 및 platform 지원 차이는 동일하지 않다. 내부 _voiceIndex를 안정 API로 의존하지 않는다. 발화 완료와 audio device에서 사용자가 실제로 들었다는 사실은 구분한다.

## 출처

- [Expo Documentation, Speech](https://docs.expo.dev/versions/latest/sdk/speech)

## 관련 문서

- [[Expo-SDK-B]]
