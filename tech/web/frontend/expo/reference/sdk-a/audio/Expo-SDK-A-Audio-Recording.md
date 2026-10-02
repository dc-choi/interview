---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["AudioRecorder permission, formats와 저장 수명"]
---

# AudioRecorder permission, formats와 저장 수명

## permission과 prepare

useAudioRecorder(options,statusListener?)는 recorder 수명을관리한다. AudioModule 또는 exportedgetRecordingPermissionsAsync/requestRecordingPermissionsAsync로 microphoneaccess를 확인한다. denied 면 record를 시작하지않고 canAskAgain=false에 settings 안내를한다. setAudioModeAsync({allowsRecording:true,playsInSilentMode:true})를 await 하고 prepareToRecordAsync를 마친뒤 record 한다. sourcehook의 자동 prepare 설명과예제의 explicitprepare가 함께있으므로실제 record-ready 상태를확인한다.

```ts
const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
async function begin() {
  const permission = await AudioModule.requestRecordingPermissionsAsync();
  if (!permission.granted) return;
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  await recorder.prepareToRecordAsync(); recorder.record({ forDuration: 60 });
}
async function finish() { await recorder.stop(); if (recorder.uri) saveUri(recorder.uri); }
```

record(options)와 pause는 void,stop는 Promise<void>,uri는 string|null이다. recordForDuration/startRecordingAtTime은 deprecated이며 record({forDuration,atTime})를 쓴다. seconds 단위 forDuration은 자동정지,atTime은 iOSdelay이며 Android/Web은 무시한다. iOS는 delay 중이미 recorderactive/status가 보일수있으나실제 capture는 나중시작하므로 countdown 으로 해석하지 않는다.

## status와 input

useAudioRecorderState(recorder,interval=500ms)는 polling RecorderState를 반환한다. canRecord,isRecording,durationMillis,metering(optional),url|null,mediaServicesDidReset을 읽는다. recorder.currentTime은 seconds 다. statusListener/RecordingStatus는 hasError/error,isFinished,url을 준다. iOS mediaServicesDidReset이면 recorder가 invalid 되어**다시 prepare**해야 한다. player의 자동 recovery와 다르다.

준비된 뒤 getAvailableInputs,getCurrentInput,setInput(uid)로 name/type/uid의 input을 선택한다. 원문의 getAvailableInputs/setInput 설명은 Promise 라고쓰지만 generatedsignature는 array/void로 표기돼있어반환보장을혼합하지 않는다. 실제설치타입을확인한다. genericrecordingplatformheading이 tvOS에 도붙어있지만 mic/hardware/API 지원은 platform 개별조건에따른다.

## format과 directory

RecordingOptions는 extension,sampleRateHz,numberOfChannels,bitRatebps,android/ios/web,isMeteringEnabled,directory(cachedefault/document)를 받는다. HIGH_QUALITY는 native.m4a/AAC,44100Hz,2channel,128000bps,iOSMAXquality이고 Webwebm128000bps 다. LOW_QUALITY는 Android.3gp/amr_nb,64000bps,iOS.m4aAAC/MINquality 지만 Web은 같은128000bps 다. preset이 모든 platform에 서같은 container/bitrate를 뜻하지 않는다.

AndroidoutputFormatdefault/3gp/mpeg4/amrnb/amrwb/aac_adts/mpeg2ts/webm와 encoderdefault/amr_nb/amr_wb/aac/he_aac/aac_eld를 지원한다. audioSourcemic/default/camcorder/unprocessed/voice_communication/voice_performance/voice_recognition은 signalprocessing/latency 목적이다. unprocessed는 미지원이면 default 다. maxFileSizebytes는 limit이며 source의 stopAndUnloadAsync 문구는 oldAPI 잔재이므로현재 recorder.stop로 정리한다.

iOSaudioQualityMIN0/LOW32/MEDIUM64/HIGH96/MAX127,outputFormatAACfamily/ALAC/LINEARPCM 등,PCMbitdepth/endian/float,bitDepthHint,bitRateStrategy를 설정한다. containerextension과 codec를 맞추고 deviceformat 지원범위를확인한다. Web은 MediaRecordermimeType/bitsPerSecond로 전달되며 browser 별지원이불일치한다. ChromeWebMdurationmetadata 누락 knownissue,securecontext/getUserMediapermission 조건이있다.

## background 녹음

pluginmicrophonePermission(false는 iOSpermission 비활성),recordAudioAndroiddefaulttrue,enableBackgroundRecordingdefaultfalse 다. true는 Androidrecordingforegroundservice+FOREGROUND_SERVICE_MICROPHONE/POST_NOTIFICATIONS,iOSaudioUIBackgroundMode를 구성한다. runtimeallowsBackgroundRecording도 true 여야한다. Android는 dismiss 불가 Recordingnotification+stopbutton을 표시하며정지후사라진다. battery 비용이크다. currentrecording 기본 cache는 OS가 삭제할수있으므로 documentoption을 쓰거나 File.move를 await 해보관한다. permission 문구/nativeconfiguration 변경은새 binary가 필요하다.

- [Expo Documentation, Audio (expo-audio)](https://docs.expo.dev/versions/latest/sdk/audio/)

## 출처


## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
