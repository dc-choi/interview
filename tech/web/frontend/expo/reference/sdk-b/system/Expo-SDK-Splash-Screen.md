---
tags: [expo, expo-sdk, system]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Native Splash Screen"]
---

# Expo SDK Native Splash Screen

expo-splash-screen은 Android/iOS/tvOS native launch 화면을 제어한다. npx expo install expo-splash-screen 후 namespace import한다. 준비되면 자동 hide가 기본이며 지연이 필요할 때만 수동으로 유지한다. SDK52부터 Expo Go는 icon을 보여주고 development build도 plugin 전체 appearance를 재현하지 못하므로 release build에서 확인해야 한다.

## 수명과 runtime API

preventAutoHideAsync():Promise<boolean>은 module global scope에서 await 없이 호출한다. React hook 안에서 호출하면 이미 숨긴 뒤일 수 있다. hide():void는 즉시 숨기며 hideAsync():Promise<void>는 backward compatibility용이다. 렌더할 content가 준비되기 전에 hide하면 blank 화면이 보인다. resource failure도 finally에서 준비/fallback 상태로 전환해 영구 splash를 피한다.

```tsx
SplashScreen.preventAutoHideAsync();
function RootLayout() {
  const ready = useResources();
  useEffect(()=>{ if (ready) SplashScreen.hide(); }, [ready]);
  return ready ? <Stack /> : null;
}
```

setOptions({duration, fade}):void는 기본 animation을 설정한다. duration default400ms, fade default false이며 reference에서 fade는 iOS 지원이다. 예제 1000ms를 기본값으로 읽지 않는다. custom animation은 별도 transition 구현으로 이어진다.

## Build-time plugin

expo-splash-screen plugin의 backgroundColor 기본#ffffff, image path, imageWidth 기본 100, resizeMode contain(default)/cover/native를 설정한다. dark는 image/backgroundColor override, android/ios는 platform partial config다. enableFullScreenImage_legacy=false는 iOS 전환용이며 향후 제거 예정이다. 기존 splash 설정은 legacy이고 config plugin이 권장 경로다. OTA JS 수정만으로 native launch image/색을 바꿀 수 없다.

## 출처

- [Expo Documentation, SplashScreen](https://docs.expo.dev/versions/latest/sdk/splash-screen)

## 관련 문서

- [[Expo-Router-Layouts]]
- [[Expo-Integrations-Icons-Store-Assets]]
