---
tags: [react-native, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native 플랫폼별 코드 분리"]
---

# React Native 플랫폼별 코드 분리

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 작은 차이는 Platform

공통 코드를 먼저 유지하고 플랫폼 차이가 작은 스타일이나 조건에 한정되면 `Platform`을 사용한다. `Platform.OS`는 Android에서는 `android`, iOS에서는 `ios`를 반환한다. API 문서에서 플랫폼 전용 props는 `@platform`과 플랫폼 배지로 표시되므로 속성 지원 범위를 확인한다.

```tsx
import {Platform, StyleSheet} from 'react-native';

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'ios' ? 200 : 100,
    ...Platform.select({
      ios: {backgroundColor: 'red'},
      android: {backgroundColor: 'green'},
      default: {backgroundColor: 'blue'},
    }),
  },
});
```

`Platform.select`는 현재 플랫폼에 가장 맞는 값을 고른다. Android/iOS에 해당 키가 있으면 그것을 우선하고, 없으면 `native`, 그마저 없으면 `default`를 사용한다. 스타일 객체뿐 아니라 어떤 값도 반환할 수 있다. 컴포넌트 선택 시에는 함수로 `require`를 감싸고 선택된 함수를 호출하는 예제를 사용할 수 있다.

## 운영체제 버전 구분

Android의 `Platform.Version`은 Android OS 표시 문자열이 아니라 **API level 숫자**다. iOS의 값은 `UIDevice systemVersion`에서 오는 OS 버전 문자열이다. 타입과 의미가 다르므로 플랫폼을 먼저 좁혀 비교한다.

```tsx
import {Platform} from 'react-native';

if (Platform.OS === 'android' && Platform.Version >= 35) {
  // Android API level 조건
}
if (Platform.OS === 'ios') {
  const majorVersion = Number.parseInt(String(Platform.Version), 10);
  // iOS 주 버전을 사용하는 조건
}
```

Android API level과 OS 버전명을 대응시킬 때는 Android 버전 자료를 확인한다. iOS에서 주 버전만 파싱하는 방식은 부 버전 조건까지 구분하지 못하므로 필요한 비교 정밀도에 맞춘다.

## 차이가 커지면 파일 확장자

```text
BigButton.ios.js
BigButton.android.js
```

이 파일들을 `import BigButton from './BigButton'`으로 가져오면 React Native가 실행 플랫폼에 맞는 구현을 선택한다. 스타일 몇 개를 넘어서 렌더 구조나 동작이 다르면 컴포넌트 내부의 조건식을 늘리는 대신 파일로 분리한다.

웹/Node 코드와 React Native 코드를 나누되 Android와 iOS 구현이 같으면 `.native.js`를 사용한다.

```text
Container.js          # 웹/Node 측 기본 구현
Container.native.js   # Metro가 사용하는 네이티브 구현
```

이 경우도 import에는 `.native`를 넣지 않는다. 웹 번들러의 해석 규칙에서 `.native.js`를 제외하면 사용하지 않는 네이티브 구현이 웹 결과물에 들어가는 것을 피할 수 있다.

## 분리 기준

| 차이 | 수단 |
|---|---|
| 작은 값, 스타일과 조건 | `Platform.OS`, `Platform.select` |
| 플랫폼별 큰 UI나 구현 | `.ios`, `.android` 파일 |
| 네이티브 대 웹/Node | `.native`와 기본 파일 |

플랫폼 분기는 공통 API를 지키는 경계에 배치한다. 하나의 iOS 전용 props가 있다는 이유로 화면 전체를 복제할 필요는 없고, 반대로 복잡한 두 구현을 하나의 조건식 덩어리로 유지할 필요도 없다.

## 출처

- [React Native, Platform Specific Code](https://reactnative.dev/docs/platform-specific-code)

## 관련 문서

- [[RN-Core-Components]]
- [[RN-TypeScript]]
