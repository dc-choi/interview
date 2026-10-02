---
tags: [expo, react-native, app]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 이미지 화면과 재사용 버튼의 상태 흐름"]
---

# Expo 이미지 화면과 재사용 버튼의 상태 흐름

## 화면 분해

초기 화면은 큰 preview image와 아래의 사진 선택/기본 사진 사용 버튼으로 구성한다. image container와 footer를 Flexbox로 나누고 이미지 320x440, radius18 같은 치수는 tutorial 예제일 뿐 모든 device의 responsive 계약은 아니다.

`expo-image`는 static require와 `{uri}` source를 지원한다. ImageViewer 같은 공유 component는 `src/components`에 두어 Router가 screen으로 발견하지 않게 한다. `@` import alias는 실제 tsconfig의 경로 mapping과 일치해야 한다.

```tsx
import { Image } from 'expo-image';
import { type ImageSourcePropType } from 'react-native';

interface ImageViewerProps {
  readonly imgSource: ImageSourcePropType;
  readonly selectedImage?: string;
}
export const ImageViewer = ({ imgSource, selectedImage }: ImageViewerProps) =>
  <Image source={selectedImage ? { uri: selectedImage } : imgSource}
    style={{ width: 320, height: 440, borderRadius: 18 }} />;
```

## Pressable과 component props

Pressable은 tap, long press, press-in/out 등을 처리한다. tutorial button은 `label`, optional `theme: 'primary'`, `onPress`를 받으며 primary만 yellow border, white background와 image icon을 가진다.

style array의 뒤 inline object는 앞 style의 같은 속성을 override한다. primary style을 공통 style에 넣으면 secondary도 바뀌므로 공통 구조와 실제 variant 차이만 분리한다. 처음 alert placeholder를 사용하더라도 실제 `onPress` 연결 후 양 버튼이 전달된 callback을 쓰게 해야 한다.

## Image picker

```sh
npx expo install expo-image-picker
```

```tsx
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

const [selectedImage, setSelectedImage] = useState<string>();
const [showAppOptions, setShowAppOptions] = useState(false);
const pickImageAsync = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: true, quality: 1,
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  if (!asset) return;
  setSelectedImage(asset.uri);
  setShowAppOptions(true);
};
```

위 state/handler는 component 내부에 둔다. picker는 system UI를 열고 success는 `canceled: false`와 assets를 제공한다. `allowsEditing`은 native 선택 후 crop UI에 관련되며 web과 같다고 가정하지 않는다. quality1은 예제의 최대 quality 선택이고 memory/file size 비용을 고려한다.

asset는 URI, width/height, filename/MIME/size 등의 metadata를 제공하지만 platform마다 필드와 null 가능성이 다르다. `assetId`, EXIF/base64 같은 값은 요청 옵션과 platform에 따라 없을 수 있다. web은 data URL/file 기반 결과일 수 있으며 native cache path와 같지 않다.

## 상태 전환과 실패

선택 success 때 URI와 options를 갱신하고 cancel이면 이전 state를 유지한다. 기본 사진 사용은 picker 없이 options를 연다. selected URI가 있으면 ImageViewer가 placeholder 대신 보여준다. cancel은 일반 사용자 행동이므로 앱 오류와 구분한다.

선택 권한, runtime exceptions와 제한된 library access는 실제 SDK/platform reference를 따른다. URI를 받은 것과 장기 보존/서버 upload가 완료된 것은 다르다. cache 파일을 장기 저장해야 하면 적절한 filesystem/media 흐름을 수행한다.

## 출처

- [Expo Documentation, Build a screen](https://docs.expo.dev/tutorial/build-a-screen)
- [Expo Documentation, Use an image picker](https://docs.expo.dev/tutorial/image-picker)

## 관련 문서

- [[Expo-Learn-App-Modal]]
- [[Expo-Home-Assets]]
