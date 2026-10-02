---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["CameraView preview, permission와 photo capture"]
---

# CameraView preview, permission와 photo capture

## preview 수명과 설정

`expo-camera`의 CameraView는 Android/iOS 실제 기기와 Web에서 camera preview, photo, video와 barcode 기능을 제공한다. native capture 결과는 cache 파일이다. **동시에 활성 preview는 하나만** 유지하며 screen unfocused 시 unmount 한다. iOS active(defaulttrue)는 unmount 없이 session을 멈출 수 있는 prop이다.

useCameraPermissions/useMicrophonePermissions 또는 get/requestCameraPermissionsAsync/get/requestMicrophonePermissionsAsync로 runtime permission을 처리한다. hook은 response|null,request,get을 반환한다. canAskAgain=false 면 settings 안내가 필요하다. iOS plugin cameraPermission/microphonePermission은 usage description을 정하며 localized locale의 ios NSCameraUsageDescription/NSMicrophoneUsageDescription은 InfoPlist.strings로 생성된다. Android CAMERA 자동 선언, recordAudioAndroid 기본 true는 RECORD_AUDIO를 추가한다. runtime 허가와 manifest 선언을 구분한다.

barcodeScannerEnabled 기본 true이며 false는 scanning native code를 줄일 수 있다. **Android prebuilt module에 는 이미 library가 포함되어 있으므로** false 적용에는 package.json buildFromSource에 expo-camera를 넣어 source build 해야 한다. source의 수동 cameraview Maven 설정은 설치된 package의 실제 native dependency와 확인하고 오래된 instruction을 일괄 추가하지 않는다. config 변경은 새 binary가 필요하다.

## props와 ready

facing front/back(defaultback),mode picture/video(defaultpicture),flash off/on/auto/screen(defaultoff),enableTorch(defaultfalse),zoom0~1(default0),mirror(defaultfalse),animateShutter(defaulttrue)를 설정한다. screen flash는 AndroidCameraX screenflash/iOSRetinaFlash 다. iOS autofocus off는 필요 시 자동 focus,on은 한번 focus 후 lock이 므로 이름만 보고 off를 focus 완전비활성으로 해석하지 않는다. onCameraReady이 후 capture, onMountError{message}는 session 시작실패다.

pictureSize는 getAvailablePictureSizesAsync 결과를 사용하고 지정 시 ratio가 무시된다. Androidratio4:3/16:9/1:1은 previewscale를 FILL→FIT로 바꾸며 unsupportedratio는 closest로 대체된다. iOSselectedLens 기본 builtInWideAngleCamera는 getAvailableLensesAsync/onAvailableLensesChanged의 목록에서 선택한다. orientationlock 상태의 responsiveOrientationWhenOrientationLocked와 callback 으로 landscapecapture를 허용할 수 있다. Webposter는 loadingimage 다.

```tsx
const [permission, requestPermission] = useCameraPermissions();
const ref = useRef<CameraView>(null);
const [ready, setReady] = useState(false);
if (!permission) return <View />;
if (!permission.granted) return <Button title="카메라 허용" onPress={requestPermission} />;
return <CameraView ref={ref} style={{ flex: 1 }} facing="back"
  onCameraReady={() => setReady(true)} onMountError={({ message }) => showError(message)} />;
// 사용자 capture action에서 ready && ref.current를 확인한다.
```

## photo와 native reference

takePictureAsync(options)는기본 cache의 `{uri,width,height,format,base64?,exif?}`를 반환한다. quality0~1(default1),base64,exif,additionalExif,shutterSound(defaulttrue),skipProcessing을 받는다. skipProcessing은 orientationpipeline과 quality를 무시하므로빠르지만기기 EXIForientation에 따라잘못보일수있다. onPictureSavedcallback을 지정하면 Promise가 사진저장완료데이터없이일찍 resolve 하고데이터는 callback 으로온다. 이를일반 capture 결과와혼동하지 않는다. mirroroption은 deprecated이며 CameraViewprop을 쓴다.

pictureRef:true overload는 PictureRefSharedRef를 반환한다. width/height/nativeRefType을 읽고 expo-image/manipulator에 직접전달할 수 있다. savePictureAsync({base64,quality,metadata})는 cachePhotoResult를 만든다. nativeURI는 temporary이 므로 document에 복사하려면 currentFile.copy를 await 한다. WebURI는 base64로 localfilesystempath가 아니다. WebimageTypepng/jpg,scale,isImageMirroroption은 native와 다르다.

pausePreview/resumePreview는 Promise 다. **previewpaused에서 capture는 Androidthrow,iOSlastvisibleframe**이므로피한다. WebisAvailableAsync는 camera 존재만확인하며 permission/HTTPS가 허용되었음을뜻하지 않는다. cross-originChromeiframe은 allow="microphone; camera;"가필요하다.

- video와 scanner는 [[Expo-SDK-A-Camera-Recording-Scanning]]

## 출처

- [Expo Documentation, Camera](https://docs.expo.dev/versions/latest/sdk/camera)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
