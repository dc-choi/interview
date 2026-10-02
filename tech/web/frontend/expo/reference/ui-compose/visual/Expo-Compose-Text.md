---
tags: [expo, react-native, visual]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Compose Text typography, spans와 overflow"]
---

# Compose Text typography, spans와 overflow


## 텍스트 배치

Text의 선택적 children은 문자열/숫자/중첩 Text다. color(string), minLines/maxLines, softWrap, overflow(clip/ellipsis/visible), style(TextStyle), modifiers를 받는다. softWrap=false이면 수평으로 계속 배치하므로 유한한 너비와 overflow 설정으로 결과를 확인한다.

native style은 RN 박스 스타일이 아니라 Compose 타이포그래피다. Universal의 textStyle/numberOfLines와 계약이 다르다. Material typography를 기본으로 고르고 명시적 스타일 필드로 덮어쓴다.

```tsx
<Text maxLines={2} overflow="ellipsis" modifiers={[width(200)]}
  style={{ typography: 'bodyLarge', fontWeight: 'bold' }}>긴 내용</Text>
```

## 스타일과 중첩

fontSize/letterSpacing/lineHeight는 sp다. fontWeight는 normal/bold/100~900, fontStyle은 normal/italic, textDecoration은 none/underline/lineThrough다. fontFamily는 default/sansSerif/serif/monospace/cursive 또는 expo-font로 불러온 이름이다. background는 글자 span의 배경이며 shadow는 color/offsetX/offsetY/blurRadius(dp)다.

TextStyle에는 lineHeight, textAlign(left/right/center/justify/start/end), lineBreak(simple/heading/paragraph), typography가 있다. typography는 display/headline/title/body/label 각각 Large/Medium/Small, 총 15개다. 사용자 정의 폰트와 굵기의 지원은 폰트 로딩 계약을 따른다.

중첩 Text는 부모 스타일을 상속하고 자식 속성을 추가로 적용한다. 부모의 bold와 자식의 italic은 함께 적용된다. 색과 배경만 바꿔 문장 안의 강조를 표현할 수 있지만 임의의 네이티브 제어를 텍스트 span처럼 넣는 계약은 아니다.

minLines는 최소 표시 높이, maxLines는 최대 줄 수, overflow는 넘친 내용의 표시 방식이다. 접근성 글자 크기, 긴 한국어 단어, RTL의 start/end와 줄바꿈을 확인한다. 폰트가 준비되기 전의 대체 글꼴 표시 여부는 앱에서 정한다.

## 출처

- [Expo Documentation, Text](https://docs.expo.dev/versions/latest/sdk/ui/jetpack-compose/text)

## 관련 문서

- [[Expo-Compose-Host]]
- [[Expo-Home-Fonts]]
