---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Audio PCM streaming과 player waveform sampling"]
---

# Audio PCM streaming과 player waveform sampling

## 실시간 microphone PCM

useAudioStream({sampleRate=48000,channels=1,encoding='float32',onBuffer})는{stream,isStreaming}을 반환한다. requestRecordingPermissionsAsync가 granted 인뒤 stream.start():Promise<void>로시작하고 stop():void로 nativecapture를 멈추고자원을해제한다. AudioStreamSharedObject의 sampleRate/channels는**start 후실제값**이며 hardware가 requestedrate를 줄수없으면다를수있다.

```ts
const { stream, isStreaming } = useAudioStream({
  sampleRate: 16000, channels: 1, encoding: 'int16',
  onBuffer: buffer => sendPcm(buffer.data, buffer.sampleRate, buffer.channels),
});
async function start() {
  const permission = await requestRecordingPermissionsAsync();
  if (permission.granted) await stream.start();
}
// 사용 종료에 stream.stop()
```

AudioStreamBuffer는 ArrayBufferdata,actualsampleRateHz,channels,timestamp(stream 시작후 seconds)다. float32는4bytes/sample와-1~1,int16은2bytes/samplelittle-endiansignedinteger 다. multi-channel은 interleaved[L,R,L,R,...]이므로 deinterleave/codec 변환시 samplecount와 byteorder를 맞춘다. audioStreamBuffer/audioStreamStatusevent로 도구독할 수 있다. rawPCMstream은 encodedrecordingfile이 나영구저장결과와다르며 networkproducer/consumer 속도차이와 backpressure를 앱이처리한다.

## player audio sampling

useAudioSampleListener(player,listener)는지원될때 sampling을 켜고 waveformevent를 구독한다. player.isAudioSamplingSupported를 확인한다. Android는**playbackwaveform에 도 RECORD_AUDIOpermission**이필요하며모든 platform에 서지원하지 않는다. sample.channels는 채널별 framesnumber[](-1~1 normalized),timestamp는 tracktimeline**seconds**다. microphoneAudioStream의 interleavedArrayBuffer와 다른 shape 다. realtimecallback에 서불필요한 fullarraylogging/복제를줄이고 UIrenderfrequency와 samplingfrequency를 분리한다. hookcleanup과 imperativeevent subscriptionremove를 연결한다.

- [Expo Documentation, Audio (expo-audio)](https://docs.expo.dev/versions/latest/sdk/audio/)

## 출처


## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
