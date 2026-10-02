---
tags: [expo, react-native, app]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 화면 합성 저장과 플랫폼 차이"]
---

# Expo 화면 합성 저장과 플랫폼 차이

## Capture 영역

native에서는 `react-native-view-shot`의 `captureRef`로 View를 rasterize하고 media library에 저장한다. image와 sticker만 공통 View 안에 묶고 buttons/modal은 바깥에 둬 결과에 포함되지 않게 한다.

```sh
npx expo install react-native-view-shot expo-media-library
```

```tsx
const imageRef = useRef<View>(null);
<View ref={imageRef} collapsable={false}>
  <ImageViewer imgSource={placeholder} selectedImage={selectedImage} />
  {pickedEmoji && <EmojiSticker imageSize={40} stickerSource={pickedEmoji} />}
</View>
```

collapsable=false는 layout-only View가 native tree에서 제거되지 않게 해 capture target을 유지한다. ref가 mount되었는지, 이미지가 준비되었는지 확인한 뒤 capture한다.

```tsx
const localUri = await captureRef(imageRef, { height: 440, quality: 1 });
```

capture는 temporary file URI를 반환한다. image dimensions/quality/format 옵션, pixel density와 target clipping은 실제 library 계약에 따른다. URI 생성 후 media save가 성공해야 완료 UI를 보여준다.

## Permission과 SDK57 저장 API

image picker의 system selection과 media library 저장은 서로 다른 동작이다. tutorial은 ImagePicker의 library permission hook으로 준비하고 `saveToLibraryAsync` 예제를 제공하지만 read/write/limited access 요구는 platform과 SDK Reference의 직접 계약으로 확인한다.

사용자가 거부하면 무한 자동 prompt 대신 재시도/Settings/다른 저장 방법을 안내한다. 최초 permission object의 null은 미로딩 상태일 수 있고 이미 denied인 상태와 구분한다. 요청 결과의 granted/canAskAgain과 대상 작업을 확인한다.

SDK57 modern API는 `Asset.create(localUri)`를 사용한다. 다음처럼 저장 권한을 직접 확인하고 capture 결과를 생성한다.

```tsx
import { Asset, requestPermissionsAsync } from 'expo-media-library';
const permission = await requestPermissionsAsync();
if (permission.status !== 'granted') return;
const localUri = await captureRef(imageRef, { height: 440, quality: 1 });
const savedAsset = await Asset.create(localUri);
```

SDK57 root export의 `saveToLibraryAsync`는 deprecated이며 runtime에서 throw한다. 기존 tutorial 코드를 그대로 유지하려면 해당 함수를 `expo-media-library/legacy`에서 명시적으로 가져와야 한다. modern/legacy의 반환과 permission 계약을 섞지 않는다. 이 수정은 SDK57 media-library reference의 저장 예제와 deprecation 계약을 따른다.

## Web capture

web은 이 tutorial에서 `dom-to-image`로 DOM node를 JPEG data URL로 변환하고 anchor download를 시작한다.

```tsx
const dataUrl = await domtoimage.toJpeg(imageRef.current, {
  quality: 0.95, width: 320, height: 440,
});
const link = document.createElement('a');
link.download = 'sticker-smash.jpeg';
link.href = dataUrl;
link.click();
```

이 code는 web branch에서만 실행한다. ref target이 실제 DOM node인지 확인하고 native View ref type과의 차이를 처리한다. `Platform.OS === 'web'` 분기 또는 `.web.tsx`/native 파일 분리로 browser API import의 runtime 접근을 구분한다.

`dom-to-image`는 tutorial의 illustrative library이며 production/browser 전체 지원을 보장하는 권장이 아니다. 외부 이미지/font의 CORS, canvas tainting, unsupported style와 browser별 download 동작을 검증한다.

TypeScript에서 `declare module 'dom-to-image'`는 import error를 없애지만 API 타입 안전성을 제공하지 않는다. 사용할 반환/옵션을 typed wrapper나 해당 package type으로 확인한다.

## Export와 reset 확인

save handler는 capture, media save 또는 web conversion/download의 실패를 잡아 사용자에게 알려야 한다. permission denied, null ref, image load 실패, 파일 write 오류와 web capture 실패를 구분한다. native save와 browser download initiation의 성공 의미도 다르다.

선택/drag/scale/reset 뒤 결과 이미지에 의도한 요소와 위치만 남는지 각 platform에서 확인한다. 이후 theme/status bar, app icon/splash와 production build는 별도 native configuration 검증이다.

## 출처

- [Expo Documentation, Take a screenshot](https://docs.expo.dev/tutorial/screenshot)
- [Expo Documentation, Handle platform differences](https://docs.expo.dev/tutorial/platform-differences)

- [Expo SDK57 MediaLibrary reference](https://docs.expo.dev/versions/latest/sdk/media-library/)

## 관련 문서

- [[Expo-Learn-App-Gestures]]
- [[Expo-Learn-App-Finishing]]
- [[Expo-Home-Storage]]
