---
tags: [react-native, mobile, accessibility]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 접근성 의미와 상태

React Native 0.87 Accessibility 기준. Android TalkBack과 iOS VoiceOver 같은 보조 기술이 UI의 이름, 역할, 상태와 값을 이해하게 한다. 같은 JS prop도 플랫폼의 native 접근성 API에 다르게 매핑될 수 있다.

## accessible과 grouping

`accessible={true}`는 screen reader와 하드웨어 키보드 같은 보조 기술이 요소를 발견하도록 표시한다. Android에서는 native `focusable`, iOS에서는 `isAccessibilityElement`로 매핑한다. Touchable 요소는 기본적으로 accessible이다.

accessible이라고 실제 focus가 반드시 그 요소에 오는 것은 아니다. VoiceOver의 중첩 접근성 요소 제약이나 TalkBack이 부모를 선택하는 경우가 있다. 부모의 grouping과 자식 버튼이 별도로 탐색돼야 하는지를 함께 정한다.

## label, hint와 연결 label

| 속성 | 의미와 조건 |
|---|---|
| accessibilityLabel | 요소가 무엇인지 설명하는 읽기 이름 |
| accessibilityHint | 동작 결과가 label만으로 불명확할 때 추가 설명 |
| accessibilityLabelledBy | Android, 다른 요소의 nativeID를 label로 연결 |

명시 label이 없으면 자식 Text 노드 내용을 공백으로 이어 이름을 만든다. 아이콘 버튼이나 여러 텍스트가 섞인 카드에서는 기본 조합이 적절한지 확인한다.

```tsx
import {Text, TextInput, TouchableOpacity, View} from 'react-native';

export const AccessibleForm = () => (
  <View>
    <Text nativeID="email-label">이메일</Text>
    <TextInput accessibilityLabel="이메일 입력"
      accessibilityLabelledBy="email-label" />
    <TouchableOpacity accessibilityLabel="이전 화면"
      accessibilityHint="현재 입력을 유지하고 이전 화면으로 이동합니다"
      accessibilityRole="button">
      <Text>뒤로</Text>
    </TouchableOpacity>
  </View>
);
```

이 예제는 의미 연결만 보여 주며 실제 버튼 동작은 생략했다. iOS hint는 VoiceOver 설정에서 hints가 켜진 경우 label 뒤에 읽는다. 가이드의 Android 설명에서는 hint 끄기 설정이 없다고 기록하므로 사용자 기기의 TalkBack 버전과 실제 읽기를 확인한다.

## 역할

`accessibilityRole`과 `role`은 목적을 전달한다. 함께 지정하면 **role이 우선**한다. 둘의 이름 목록은 동일하지 않다.

| 의미 | accessibilityRole | role |
|---|---|---|
| 조정 가능한 값 | adjustable | slider |
| 중요한 알림 | alert | alert |
| 버튼 | button | button |
| 체크박스 | checkbox | checkbox |
| 선택 입력 | combobox | combobox |
| 제목 | header | heading |
| 이미지 | image | img |
| 이미지 버튼 | imagebutton | 별도 해당 이름 없음 |
| 키보드 키 | keyboardkey | 별도 해당 이름 없음 |
| 링크 | link | link |
| 목록 | 별도 해당 이름 없음 | list |
| 목록 항목 | 별도 해당 이름 없음 | listitem |
| 메뉴 | menu | menu |
| 메뉴 모음 | menubar | menubar |
| 메뉴 항목 | menuitem | menuitem |
| 역할 없음 | none | none, presentation |
| 진행률 | progressbar | progressbar |
| 라디오 | radio | radio |
| 라디오 그룹 | radiogroup | radiogroup |
| 스크롤바 | scrollbar | scrollbar |
| 검색 입력 | search | searchbox |
| 선택 목록을 여는 버튼 | spinbutton | spinbutton |
| 앱 상태 요약 | summary | summary |
| 스위치 | switch | switch |
| 탭 | tab | tab |
| 탭 목록 | tablist | tablist |
| 정적 텍스트 | text | 별도 해당 이름 없음 |
| 타이머 | timer | timer |
| 토글 버튼 | togglebutton | 별도 해당 이름 없음 |
| 도구 모음 | toolbar | toolbar |
| 격자 목록 | grid | grid |

`togglebutton`은 `accessibilityState.checked`로 켜짐과 꺼짐을 전달한다. grid는 ScrollView, VirtualizedList, FlatList, SectionList에서 사용하며 Android에 grid 진입/이탈 안내를 제공한다. 모양이 비슷하다는 이유로 다른 기능의 역할을 지정하지 않는다.

## 상태와 값

`accessibilityState`는 선택 가능한 모든 속성을 객체로 전달한다.

| 필드 | 의미 | 값 |
|---|---|---|
| disabled | 사용할 수 없는지 | boolean |
| selected | 현재 선택됐는지 | boolean |
| checked | 체크 상태 | boolean 또는 mixed |
| busy | 현재 처리 중인지 | boolean |
| expanded | 펼쳐진 상태인지 | boolean |

접근성 disabled를 전달한다고 버튼의 실제 실행까지 막는 계약이 자동 생기는 것은 아니다. 실제 비활성 처리와 안내 상태를 맞춘다.

`accessibilityValue`는 범위 또는 텍스트 값을 제공한다. `now`를 쓰면 `min`과 `max`가 필요하다. `text`를 쓰면 수치 min/now/max보다 우선하는 설명이다.

```tsx
<View accessible accessibilityRole="progressbar"
  accessibilityLabel="다운로드"
  accessibilityState={{busy: true}}
  accessibilityValue={{min: 0, now: 40, max: 100}} />;
```

## ARIA 이름의 대응

0.87에서는 다음 ARIA prop도 제공한다. 브라우저의 모든 ARIA 계약이 그대로 구현된다고 확대하지 않는다.

| ARIA prop | 대응하는 의미 |
|---|---|
| aria-label | 접근성 이름 |
| aria-labelledby | Android, nativeID로 label 연결 |
| aria-disabled | 인지 가능하지만 조작 불가 상태 |
| aria-selected | 선택 여부 |
| aria-checked | boolean 또는 mixed 체크 상태 |
| aria-busy | 변경 중 상태 |
| aria-expanded | 펼침 상태 |
| aria-valuemin, aria-valuemax, aria-valuenow | 범위의 최소/최대/현재 값 |
| aria-valuetext | 값의 텍스트 설명 |
| aria-hidden | 보조 기술에서 요소와 자식을 숨김 |
| aria-live | Android의 동적 변경 알림 |
| aria-modal | iOS의 modal focus 범위 |

`aria-busy`, `aria-checked`, `aria-disabled`, `aria-expanded`, `aria-hidden`, `aria-modal`의 가이드 기본값은 false다. `aria-live` 기본값은 off다. API별 플랫폼 조건과 숨김 범위는 [[RN-Accessibility-Platforms|플랫폼 동작]]에서 이어서 확인한다.

## 확인할 점

아이콘 label, 부모 grouping, label과 hint 중복, 역할 이름 차이, 상태와 실제 동작의 일치를 확인한다. 예제는 선언 방식을 설명하며 screen reader로 실행 검증되지 않았다.

## 출처

- [React Native 0.87, Accessibility](https://reactnative.dev/docs/accessibility)

## 관련 문서

- [[RN-Accessibility-Platforms|플랫폼 속성과 접근성 동작]]
- [[RN-Accessibility-Focus|focus 순서와 기기 검증]]
- [[RN-Touches|터치 입력과 피드백]]
