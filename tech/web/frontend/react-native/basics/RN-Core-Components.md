---
tags: [react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Core Components와 네이티브 뷰"]
---

# React Native Core Components와 네이티브 뷰

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 뷰와 컴포넌트의 관계

Android와 iOS UI는 화면의 사각형 영역을 나타내는 뷰로 구성한다. 텍스트, 이미지, 버튼도 뷰이며 다른 뷰를 담는 컨테이너도 뷰다. React Native는 JavaScript에서 React 컴포넌트를 선언하면 해당 플랫폼의 네이티브 뷰를 생성해 화면을 구성한다.

**Native Component**는 플랫폼 뷰에 연결되는 React 컴포넌트다. **Core Component**는 React Native에 기본 포함된 필수 Native Component다. Core Component를 조합한 사용자 컴포넌트는 JSX 재사용 단위이며, 그 자체가 새로운 Kotlin이나 Swift 뷰 구현이라는 뜻은 아니다.

## 기본 컴포넌트 비교

| React Native | Android 비유 | iOS 비유 | 웹 비유 | 역할 |
|---|---|---|---|---|
| `View` | `ViewGroup` | `UIView` | 스크롤 없는 `div` | Flexbox 배치, 스타일, 터치와 접근성 컨테이너 |
| `Text` | `TextView` | `UITextView` | `p` | 텍스트 표시, 스타일, 중첩과 터치 |
| `Image` | `ImageView` | `UIImageView` | `img` | 이미지 표시 |
| `ScrollView` | `ScrollView` | `UIScrollView` | 스크롤 컨테이너 | 서로 다른 자식 뷰를 스크롤 |
| `TextInput` | `EditText` | `UITextField` | 텍스트 `input` | 사용자 문자열 입력 |

위 비교는 역할을 이해하기 위한 대응표다. HTML과 네이티브 뷰가 API, 레이아웃과 이벤트 계약까지 같다는 뜻은 아니다. 문자열은 `Text` 안에서 표시하고, 네트워크 이미지에는 예제처럼 표시 크기를 지정한다.

```tsx
import {Image, ScrollView, Text, TextInput, View} from 'react-native';

const App = () => (
  <ScrollView>
    <Text>소개</Text>
    <View>
      <Image
        source={{uri: 'https://reactnative.dev/img/tiny_logo.png'}}
        style={{width: 64, height: 64}}
      />
      <TextInput defaultValue="입력할 수 있습니다" />
    </View>
  </ScrollView>
);
```

`source`와 `style`은 Core Component에 전달하는 props다. 위 예제에서는 `ScrollView`가 서로 다른 컴포넌트를 담고 `View`가 이미지와 입력을 묶는다.

## 확장 선택과 아키텍처 경계

기본 컴포넌트가 요구를 충족하면 먼저 재사용한다. 부족한 기능은 React Native Directory에서 커뮤니티 컴포넌트를 찾거나 플랫폼 전용 Native Component를 구현한다. Android에서는 Kotlin/Java, iOS에서는 Swift/Objective-C 개발 지식이 그 경계에서 필요해진다.

0.87의 Core Components 소개 페이지에는 네이티브 확장 관련 링크가 legacy API를 참조한다는 경고가 남아 있다. 뷰와 컴포넌트의 개념 설명은 유지하되, 새 네이티브 구현은 New Architecture의 Fabric Native Components와 Codegen 문서를 기준으로 선택한다. 과거 Native Component 구현 링크를 현행 구현 절차로 그대로 사용하지 않는다.

## 출처

- [React Native, Intro React Native Components](https://reactnative.dev/docs/intro-react-native-components)

## 관련 문서

- [[RN-React-Fundamentals]]
- [[RN-Text-Input]]
- [[RN-ScrollView]]
- [[RN-Lists]]
