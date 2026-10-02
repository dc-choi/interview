---
tags: [expo, react-native, swiftui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SwiftUI modifier, typography와 입력 style"]
---

# Expo SwiftUI modifier, typography와 입력 style

## Font와 Dynamic Type

font({family,size,weight,design,textStyle})는 지정한 속성만 적용하는 usage가 제공된다. weight는 ultraLight/thin/light/regular/medium/semibold/bold/heavy/black, design은 default/rounded/serif/monospaced다. textStyle은 largeTitle/title/title2/title3/headline/subheadline/body/callout/footnote/caption/caption2이며 **사용자 Dynamic Type에 맞춰 scale**한다. family와 textStyle을 함께 쓰면 custom font도 해당 text style 기준으로 확장한다. textStyle 없는 size는 고정 크기다.

dynamicTypeSize는 xSmall/small/medium/large/xLarge/xxLarge/xxxLarge/accessibility1..5, 또는 `{min?,max?}` 범위를 받는다. Host에 적용하면 환경을 통해 child에 전파한다. **min>max는 native trap**이므로 유효한 범위를 지킨다. 완전히 끄기보다 accessibility 크기의 상한을 두는 방식을 공식 문서가 권한다.

## Text modifier

| 함수 | 계약 |
| --- | --- |
| bold()/italic() | Text에서는 지원 버전 전체, 일반 view에 적용은 iOS/tvOS16+ |
| kerning(value?) | 글자 간격 |
| monospacedDigit() | 숫자 폭만 일정하게 하며 다른 글자는 비례 폭 유지 |
| multilineTextAlignment(center/leading/trailing) | 여러 줄의 가로 정렬 |
| minimumScaleFactor(0..1) | 공간이 부족할 때 font를 이 비율까지 축소 |
| allowsTightening(boolean) | 한 줄에 맞추기 위한 글자 간격 압축 허용 |
| lineSpacing(nonnegative points) | 줄 아래와 다음 줄 위 사이 거리, 음수이면 기본값 |
| lineHeight(points) | 총 line height, iOS/tvOS26+ |
| textCase(lowercase/uppercase) | 표시되는 text의 대소문자 변환 |
| textSelection(boolean) | 텍스트 선택 허용 |
| truncationMode(head/middle/tail) | 넘치는 line의 잘리는 위치 |
| underline/strikethrough({isActive,color,pattern}) | 밑줄/취소선과 line pattern |

lineLimit()은 무제한, lineLimit(number)은 최대 줄 수다. lineLimit(number,{reservesSpace:true})와 lineLimit({min,max})는 **iOS/tvOS16+**이며 빈 내용에도 높이 확보 또는 줄 범위를 설정한다. nested Text에는 Text 반환 modifier만 적용되므로 layout/gradient를 segment에 일반화하지 않는다.

## 입력과 keyboard

keyboardType는 default/url/email-address/numeric/phone-pad/ascii-capable/numbers-and-punctuation/name-phone-pad/decimal-pad/twitter/web-search/ascii-capable-number-pad다. autocorrectionDisabled(boolean=true)는 자동 교정을 막는다. textInputAutocapitalization(never/words/sentences/characters)은 iOS15+다.

textContentType는 iOS13+ semantic autofill hint다. 이름/주소/location/organization/jobTitle, username/password/newPassword/oneTimeCode, emailAddress/telephoneNumber/URL, cellularEID/IMEI, creditCard 세부값, birthdate 세부값, dateTime/flightNumber/shipmentTrackingNumber를 지원한다. 키보드 형식과 값 검증을 수행하는 기능은 아니며 새로 도입된 content type의 실제 OS 지원을 확인한다.

submitLabel(search/join/done/send/continue/return/go/next/route)는 iOS15+의 return-key 문구다. onSubmit(()=>void)은 제출 action이다. TextField/ SecureField 문서의 tvOS broad support를 개별 modifier의 iOS 표시로 확장하지 않는다. textFieldStyle은 automatic/plain/roundedBorder다.

```tsx
import { Host, TextField, useNativeState } from '@expo/ui/swift-ui';
import { keyboardType, autocorrectionDisabled, textInputAutocapitalization,
  textContentType, submitLabel, onSubmit } from '@expo/ui/swift-ui/modifiers';
export function CodeEntry() {
  const code = useNativeState('');
  return <Host style={{ width: 280, height: 60 }}><TextField text={code}
    maxLength={6} modifiers={[keyboardType('numeric'), autocorrectionDisabled(),
      textInputAutocapitalization('never'), textContentType('oneTimeCode'),
      submitLabel('done'), onSubmit(() => verify(code.get()))]} /></Host>;
}
```

## Control style

buttonStyle automatic/bordered/borderedProminent/borderless/plain/glass/glassProminent(glass는 iOS/tvOS26+), buttonBorderShape automatic/circle/capsule/roundedRectangle와 선택적 rounded cornerRadius를 쓴다. controlSize mini/small/regular/large/extraLarge(extraLarge iOS17+)를 지정한다.

labelStyle은 automatic/iconOnly/titleAndIcon/titleOnly, labelsHidden()은 child control label을 숨긴다. toggleStyle은 automatic/switch/button이며 button은 tvOS에서 지원되지 않는다. datePickerStyle은 automatic/compact/graphical/wheel, pickerStyle은 automatic/inline/menu/navigationLink/palette/segmented/wheel(wheel tvOS 미지원)이다. gaugeStyle은 automatic/circular/circularCapacity/linear/linearCapacity, progressViewStyle은 automatic/linear/circular다. modifier export가 있어도 해당 component 플랫폼 범위를 함께 따른다.

## 출처

- [Expo Documentation, Modifiers](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers)

## 관련 문서

- [[Expo-UI-Swift|Expo SwiftUI reference]]
