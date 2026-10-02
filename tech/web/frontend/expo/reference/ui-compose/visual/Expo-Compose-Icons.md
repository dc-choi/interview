---
tags: [expo, react-native, visual]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose Icon XML assets와 tint 상속"]
---

# Compose Icon XML assets와 tint 상속


## 자산과 색 상속

Icon의 필수 source는 ImageSourcePropType이다. XML Metro 자산, require 또는 URI 객체 등을 사용한다. `@expo/material-symbols`의 개별 경로를 가져오면 사용한 아이콘만 번들에 포함한다. local XML은 require로 읽는다. 현재 import 경로는 `@expo/ui/jetpack-compose`이며 원문의 오래된 expo-ui 예시는 쓰지 않는다.

```tsx
import Home from '@expo/material-symbols/home.xml';
<Icon source={Home} size={24} contentDescription="홈" />
```

size는 선택적 dp이고 생략하면 본래 크기를 쓴다. contentDescription은 접근성 설명, modifiers는 네이티브 배치와 시각 효과다. tint 생략은 주변 LocalContentColor를 상속하고 null은 Color.Unspecified로 원래 여러 색을 유지한다. ColorValue를 주면 명시적 tint다.

## Material Symbols 생성 도구

패키지에 든 기본 스타일은 outlined와 기본 축이다. CLI는 rounded/sharp/fill, weight/grade/optical size에 맞춘 XML을 Google Fonts에서 내려받는 제작 도구다.

```sh
npx @expo/material-symbols --style rounded --weight 300 star home
```

output 기본은 ./assets이며 -o/--output으로 바꾼다. -s/--style은 outlined(기본)/rounded/sharp, -f는 fill, -w는 weight 100~700(기본 400), -g는 grade -25/0/200(기본 0), opsz는 20/24/40/48(기본 24)다. 선택한 아이콘의 Google Fonts URL로 축을 지정하는 방식도 있다. 출력 XML을 require하고 실제 크기, tint, 접근성 설명을 확인한다. 이 문서 작성 작업에서는 다운로드를 실행하지 않았다.

## 출처

- [Expo Documentation, Icon](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/icon)

## 관련 문서

- [[Expo-UI-Text-Icons]]
- [[Expo-Compose-Buttons]]
