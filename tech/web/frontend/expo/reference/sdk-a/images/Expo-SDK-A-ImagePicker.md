---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["ImagePicker 권한, 선택 결과와 편집 조건"]
---

# ImagePicker 권한, 선택 결과와 편집 조건

## system UI와 권한

`expo-image-picker`는 Android/iOS/Web system photo/video picker와 camera UI를 연다. 현재 system library picker는 일반적으로 사전 media permission 없이 열 수 있다. **iOS video 원본(Passthrough)** 접근은 selection 후 permission dialog가 나올 수 있어 requestMediaLibraryPermissionsAsync를 먼저 호출하면 흐름을 예측할 수 있다. camera는 requestCameraPermissionsAsync로 확인하고 iOS Simulator 대신 실제 camera 기기에서 테스트한다. 원문 Permissions.CAMERA_ROLL/iOS10 표기는 현재 permission API이 름으로 사용하지 않는다.

useCameraPermissions/useMediaLibraryPermissions는 `[response|null,request,get]`를 반환한다. media get/request의 writeOnly 기본 false,accessPrivileges는 all/limited/none(Android34+,iOS14+ limited)이다. granted snapshot과 assets 전체 접근 범위는 별개다. Web permission request는 no-op이고 picker는 user activation에서 즉시 호출해야 한다. browser cancel event는 일관되게 반환되지 않는다.

```ts
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 5,
  allowsEditing: false, quality: 1,
});
if (!result.canceled) {
  for (const asset of result.assets) enqueueUpload(asset.uri, asset.mimeType);
}
```

## 결과와 activity 복원

성공은 canceled:false,assets:array,취소는 canceled:true,assets:null이다. uri,width,height가 기본이며 dimension0은 system이 값을 주지 않은 경우다. type은 image/video/livePhoto/pairedVideo/null,duration은 milliseconds,fileSize는 bytes 다. assetId/fileName은 limited access 나 Android file browsing에서 null 일 수 있다. mimeType도 알수없음이 가능하다. base64는 선택 image의 JPEGrawbytes,exif는 optional(iOS cameraGPS 제외),Web file은 FormData upload에 쓸수있다. live photo는 pairedVideoAsset를 같이반환한다.

Android가 picker이 후 MainActivity를 죽이면 getPendingResultAsync로 lost result를 복구한다. 반환은 result/error{code,message,exception?}/null이고 다른 platform은 null이다. developer의 Don't keep activities로 재현할 수 있다. canceled와 error를 구분한다.

## editing, quality와 video

allowsEditing 기본 false는 Androidcrop/rotate,iOScrop이다. multiple(defaultfalse)와 mutuallyexclusive이며 multiple이면 editing이 ignored 된다. aspect[x,y]/shape(rectangle/oval)는 Androidcrop만, iOS crop은 square 다. iOS UIImagePickerController의 high-resolution crop rectangle이 부정확한 knownissue가 있다. quality0~1(default1)은이미압축된 file을 더크게만들수있고 iOSlibraryPNG/BMP에 는무시된다. AndroidanimatedGIF를 유지하려면**quality1+editingfalse**가필요하며그외는첫 framePNG가 될수있다.

mediaTypes는 images/videos/livePhotos array이며 MediaTypeOptions enum은 deprecated 다. livePhotos는 iOS 원본 image+pairedvideo이며 editing 일때 ignored 되고 quality와 무관하게 originalquality 다. Android/Web은 livePhotos를 무시한다. selectionLimit0은 systemmaximum,orderedSelection(iOS15+)은선택순서 badge와 정확한순서를제공한다. AndroiddefaultTab은 photos/albums,legacy:true는 외부 file 까지선택하는 oldpicker 다.

preferredAssetRepresentationMode는 automatic/compatible/current(가능하면 transcoding 회피),presentationStyle은 automatic/fullscreen/page/formsheet/popover/current/overcontext 다. videoExportPreset은 deprecated이며 defaultPassthrough(무변환),H264/HEVC와 resolutionpreset이 있다. shouldDownloadFromNetwork 기본 false는 iCloud 접근을허용하며 video에 는 Passthrough 일때적용되고다른 preset은 자동 download 한다. videoMaxDuration은**seconds**,0은 nolimit 지만 iOSediting은 기본10 분 cap,Android는 cameraapp 지원,Web은 무효다. videoQuality는 iOSHigh/Medium/Low/VGA/IFramepreset이다. cameraTypefront/back은 Androidcameraapp에 따라다를수있다.

## build 설정

plugin photosPermission/cameraPermission/microphonePermission 으로 iOSusage 문구를정한다. AndroidRECORD_AUDIO가 기본추가되며 microphonePermission:false로 차단,cameraPermission:false는 CAMERA 차단이다. nativeiOS 수동설정은 NSPhotoLibraryUsageDescription/NSCameraUsageDescription/NSMicrophoneUsageDescription이 필요하다. Android crop light/dark colors는 toolbar/icon/action/back/background 색상을 build에 설정한다. 모든 native 변경은 rebuild가 필요하다. manifest 선언과 runtime 사용자허가는구분한다.

## 출처

- [Expo Documentation, ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
