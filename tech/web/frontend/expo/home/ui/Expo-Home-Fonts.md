---
tags: [expo, react-native, ui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 커스텀 폰트와 로딩 계약"]
---

# Expo 커스텀 폰트와 로딩 계약

## 형식과 적용 방식

SDK57 공통 경로는 static OTF/TTF 파일이다. 두 형식 모두 Android/iOS/web을 지원하며 같은 폰트가 두 형식으로 제공되면 공식 가이드는 OTF를 우선 제안한다. WOFF/WOFF2는 iOS/web만, EOT/SVG는 web만, DFONT는 Android만 지원 목록에 있고 다른 형식은 Metro asset extension과 플랫폼 지원을 확인해야 한다. 미지원 파일은 native crash를 유발할 수 있다.

| 적용 방법 | 대상 | 장점과 제약 |
| --- | --- | --- |
| `expo-font` config plugin | Android/iOS | 시작부터 사용 가능, native build 필요, Go에 적용 안 됨 |
| `useFonts` | Android/iOS/web, Go | runtime async loading, ready/error 처리 필요 |
| `@expo-google-fonts/*` | 파일 import 또는 plugin/runtime | font package에 포함된 static cuts 사용 |

## Native embedding

```json
{
  "expo": {
    "plugins": [["expo-font", {
      "fonts": ["./assets/fonts/FiraSans-MediumItalic.ttf"],
      "android": { "fonts": [{
        "fontFamily": "Inter",
        "fontDefinitions": [
          { "path": "./assets/fonts/Inter-Bold.ttf", "weight": 700 },
          { "path": "./assets/fonts/Inter-BoldItalic.ttf", "weight": 700, "style": "italic" }
        ]
      }] },
      "ios": { "fonts": ["./assets/fonts/Inter-Bold.ttf", "./assets/fonts/Inter-BoldItalic.ttf"] }
    }]]
  }
}
```

`npx expo install expo-font` 이후 plugin을 추가하고 새 native build를 만든다. 경로는 project root 기준이다. Android의 파일 경로 array는 확장자를 제외한 파일명을 family로 사용하며 object는 family/weight/style을 XML font resource로 지정한다. iOS는 font 내부의 family/PostScript metadata를 읽는다.

동일 표시명을 가정하지 않는다. file명과 PostScript name을 일치시키거나 `Platform.select`로 플랫폼별 이름을 고른다. PostScript name은 display name이 아닌 font 식별자다. Android 수동 native 프로젝트는 `android/app/src/main/assets/fonts`, iOS는 font resource와 Info.plist 등록을 관리한다.

## Runtime loading과 splash

```tsx
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Ionicons from '@expo/vector-icons/Ionicons';

SplashScreen.preventAutoHideAsync();

export default function Root() {
  const [loaded, error] = useFonts({
    'Inter-Black': require('./assets/fonts/Inter-Black.otf'),
    ...Ionicons.font,
  });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return <Text style={loaded ? { fontFamily: 'Inter-Black' } : undefined}>앱 콘텐츠</Text>;
}
```

예제의 file 경로는 component 파일 위치에 맞춰 조정한다. 오류가 발생하면 fallback UI/font와 오류 기록 정책을 선택하고 무한 splash로 남기지 않는다. 아이콘 font도 preload하면 첫 화면의 invisible icon을 줄인다. font import와 `Ionicons.font` map은 객체로 합쳐야 하며 `require`에 두 번째 인자를 넣는 방식이 아니다.

remote font는 `useFonts` map에 URL을 넣을 수 있으나 network availability와 web CORS를 처리한다. local assets는 앱 download에 포함되어 연결 장애의 영향을 줄인다. loading 대기는 `!loaded && !error`이며 `!loaded || !error`를 쓰면 정상 성공에서도 화면이 안 나올 수 있다.

## Google Fonts

```sh
npx expo install expo-font expo-splash-screen @expo-google-fonts/inter
```

runtime에서는 package가 export한 `Inter_900Black`과 `useFonts`를 `{Inter_900Black}`로 넘긴다. native embedding에는 `node_modules/@expo-google-fonts/inter/900Black/Inter_900Black.ttf` 경로를 plugin에 지정한다. embedding의 Android 이름은 `Inter_900Black`, iOS는 `Inter-Black`일 수 있어 metadata를 확인한다.

## SDK58 이후 기능을 SDK57과 구분

현재 Home font guide에는 SDK58과 RN0.88의 기능도 선행 설명되어 있다. SDK57에서는 variable font와 하나의 family에 여러 runtime font files를 등록하는 새 array API를 기본 지원으로 가정하지 않는다.

SDK58 이후 variable font는 Android의 `wght` axis와 iOS named instances로 face를 선택한다. Android10 이상 weight range, Android15 이상 italic axis 조건이 있고 iOS는 named instance가 없으면 default face로 제한된다. RN0.88의 `fontVariationSettings`는 Text/TextInput의 axes를 직접 지정하며 weight/style보다 우선한다.

SDK58의 `FontFamilyDefinition[]`은 family별 여러 files를 한 호출에 등록한다. weight/style을 명시하고 이미 load한 family에 나중 호출로 face를 추가할 수 없다는 계약이 있다. Android runtime multi-face는 API29 이전 제한이 있고 web은 CSS metadata를 읽지 못하므로 명시 값이 필요하다. 이 기능을 쓰려면 해당 SDK/Reference로 업그레이드 범위를 별도로 확인한다.

## 출처

- [Expo Documentation, Fonts](https://docs.expo.dev/develop/user-interface/fonts)

## 관련 문서

- [[Expo-Home-Splash-Icons]]
- [[Expo-Home-Assets]]
