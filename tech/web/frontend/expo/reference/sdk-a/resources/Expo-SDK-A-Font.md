---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Font build embedding과 runtime loading"]
---

# Font build embedding과 runtime loading

## 설치와 두 loading 방법

`npx expo install expo-font`, `import * as Font from 'expo-font'`. Android/iOS/tvOS/web/Expo Go를 지원한다. Android/iOS에서는 config plugin의 build-time embedding이 권장되며 web와 runtime-dependent source는 useFonts/loadAsync를 사용한다.

plugin fonts는 project-relative path 목록이다. Android 단순 path는 filename이 family name, iOS는 font 내부 이름을 사용한다. Android object fontFamily/fontDefinitions(path,weight 등)는 XML family를 정의한다. native 직접 관리 시 Android assets/fonts, iOS UIAppFonts/native 등록을 수행한다. getLoadedFonts로 실제 fontFamily names를 확인한다.

## Runtime API

| API | 의미 |
|---|---|
| loadAsync(name,source) 또는 map | Promise<void>, source는 URI/moduleID/Asset/FontResource |
| useFonts(map) | loaded,error tuple, input map 변경 자동 reload 없음 |
| isLoaded/isLoading | synchronous family 상태 |
| getLoadedFonts | build-time와 runtime font names |
| renderToImageAsync(glyphs,options) | Android/iOS text image 생성 |

```tsx
const [loaded, error] = Font.useFonts({ Example: require('./assets/example.ttf') });
if (!loaded && !error) return null;
return <Text style={{ fontFamily: loaded ? 'Example' : undefined }}>본문</Text>;
```

SplashScreen을 hold 한 경우 loaded 또는 error 양쪽에서 hide 한다. font 실패로 app이 영구 blank가 되지 않게 fallback 한다. renderToImage options는 color/fontFamily/lineHeight/size이고 result는 uri, logical width/height, scale이다. pixel dimensions는 logical size×scale이다.

## Web display와 오류

FontResource.display는 generated @font-face의 font-display이며 component 마다 동적으로 바꿀 style이 아니다. AUTO는 browser 결정, BLOCK은 초기 invisible, SWAP은 fallback 즉시표시, FALLBACK은 짧은 block이 후 swap 제한, OPTIONAL은 network/resource 여건에 따라 browser가 로드를 생략할 수 있다. native에서 이 display 옵션은 직접 효과가 없다.

ERR_FONT_API/SOURCE/FAMILY는 input/resource/name 문제, ERR_WEB_ENVIRONMENT는 document injection 불가, ERR_DOWNLOAD는 network, ERR_UNLOAD는 loading 중 unload 관련 오류다. remote font는 URI/network/CORS를 확인하고 load 실패를 정상 UI fallback 으로 처리한다.

## 출처

- [Expo Documentation, Font](https://docs.expo.dev/versions/latest/sdk/font)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
