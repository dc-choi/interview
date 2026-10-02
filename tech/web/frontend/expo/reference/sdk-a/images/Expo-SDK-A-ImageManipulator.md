---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["ImageManipulator context와 native image reference"]
---

# ImageManipulator context와 native image reference

## chainable transformation

`expo-image-manipulator`는 Android/iOS/tvOS/Web의 local image를 바꾼다. `useImageManipulator(source)` 또는 `ImageManipulator.manipulate(source)`는 URI 나 SharedRef<'image'>에서 context를 만든다. context의 synchronous method는 background transformation을 **예약**하고 renderAsync를 기다려 결과 ImageRef를 얻는다. file 저장은 다음 saveAsync 단계다.

```ts
import { ImageManipulator, SaveFormat, FlipType } from 'expo-image-manipulator';
const context = ImageManipulator.manipulate(localUri);
context.resize({ width: 800, height: null }).rotate(90).flip(FlipType.Vertical);
const image = await context.renderAsync();
const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
setPreview(result.uri);
```

resize의 width/height 한쪽만 지정하면 ratio를 보존한다. rotate는 positive clockwise,negative counterclockwise degrees 다. flip은 transformation 당 horizontal/vertical 하나만 가능하므로 두 축은 두번 호출한다. crop은 originX/Y,width,height rectangle이다. extent({width,height,originX,originY,backgroundColor})는 **Web 전용** canvas 확장/위치 변경이다. reset은 처음 로드한 image로 context를 되돌린다. 순서에 따라 crop/rotation 결과가 달라지므로 input dimensions와 bounds를 함께 계산한다.

## ImageRef와 저장

ImageRef는 width,height,nativeRefType를 가진 SharedRef이고 expo-image에 직접 전달할 수 있다. 저장하지 않으면 native memory reference이 므로 persistence URI가 아니다. saveAsync는 cache에 새 file을 만들고 `{uri,width,height,base64?}`를 반환한다. format 기본 JPEG이며 PNG(lossless,느림),WEBP도 제공한다. compress0은 highest compression,1은 highestquality 다. base64:true 면 rawbase64이며 preview에 는 해당 format의 data MIME prefix를 붙인다. 큰 image/base64는 memory 비용이 있다. cache를 영구 보관 위치로 사용하지 않는다.

context와 result는 SharedObject/SharedRef 수명을 따른다. hook은 cleanup을 관리하지만 imperative object를 release 한 뒤 재사용하면 오류가 난다. 서로 다른 소비자가 native reference를 공유하면 조기 release 하지 않는다.

## deprecated function API

manipulateAsync(uri,actions,saveOptions)는 deprecated이며 context API를 권장한다. uri는 localfile 또는 base64dataURI,각 action object는 resize/rotate/flip/crop/extent 중 하나만 가진다. 각 호출은 새 file을 만든다. source file을 같은 URI에 overwrite 하면 image cache 때문에 화면이 바뀌지 않을 수 있으므로 새 result URI를 사용한다. Asset은 downloadAsync 완료 후 localUri를 전달한다.

## 출처

- [Expo Documentation, ImageManipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
