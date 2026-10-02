---
tags: [react-native, native, codegen, typescript]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Spec 타입과 플랫폼 대응"]
---

# React Native Spec 타입과 플랫폼 대응

React Native 0.87 공식 문서 기준이다. 아래 절차와 예제는 문서 계약을 설명하며, 이 정리 작업에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## Spec의 역할과 타입 선택

Spec은 Flow/TypeScript로 네이티브 호출 계약을 선언하고 Codegen의 입력이 된다. TypeScript에서 표현할 수 있는 임의의 타입이 모두 네이티브 경계에서 지원되는 것은 아니다. Appendix의 대응표와 해당 생성 인터페이스를 함께 확인한다.

일반 `Object`보다 필드가 선언된 object literal을 사용한다. JavaScript의 타입 표기만 믿지 않고 네이티브 map/dictionary의 키, nullable, 배열 원소와 반환 계약을 맞춘다.

## 기본 대응표

| JS/TypeScript | Android Java | iOS ObjC | 확인할 조건 |
| --- | --- | --- | --- |
| `string` | `String` | `NSString` | nullable이면 `string \| null` |
| `boolean` | `Boolean` | `NSNumber` | platform 생성 시그니처와 nullable 대조 |
| object literal | Appendix는 고정 매핑을 제시하지 않음 | Appendix는 고정 매핑을 제시하지 않음 | 범용 Object보다 권장하며 실제 생성 시그니처 확인 |
| `Object` | `ReadableMap` | untyped dictionary | 필드 계약이 느슨해짐 |
| `Array<T>` | `ReadableArray` | `NSArray` | 객체 내부 배열 변환은 `RCTConvertVecToArray`를 사용할 수 있음 |
| `Function` | 표에 일반 매핑 없음 | 표에 일반 매핑 없음 | 지원되는 callback 선언 사용 |
| `Promise<T>` | `com.facebook.react.bridge.Promise` | resolve/reject block | 생성된 비동기 계약 사용 |
| callback `() => ...` | `Callback` | `RCTResponseSenderBlock` | 결과 타입과 호출 횟수 규칙 확인 |
| `number` | `double` | `NSNumber` | Appendix에서 nullable 지원이 별도 보장되지 않음 |
| literal union `'SUCCESS' \| 'FAIL'` | 위치별 생성 결과 확인 | 위치별 생성 결과 확인 | Appendix는 callback 위치 조건을 표시 |

표의 `ReadableMap`과 `ReadableArray`는 주로 JavaScript에서 Android 메서드로 전달하는 입력 방향의 타입이다. 반환 방향의 생성 시그니처를 같은 타입으로 가정하지 않고 실제 산출물을 확인한다.

Flow의 `?T`는 TypeScript의 `T | null` 대응으로 제시된다. 모든 표기와 조합에서 동일하게 지원된다고 확장하지 않는다. 모듈 메서드와 컴포넌트 props, 이벤트의 허용 타입은 생성 맥락별로 다를 수 있다.

## 객체 선언 예시

```ts
export type StorageEntry = {
  key: string;
  value: string;
};
```

Android에서 `Arguments.createMap()`으로 payload를 만들면 `key`, `value`가 정확히 맞아야 한다. iOS dictionary에서도 같은 이름과 값 타입을 유지한다. Codegen의 인터페이스 생성은 네이티브가 잘못된 키를 넣는 모든 경우를 자동으로 막아 주는 검증기가 아니다.

## 타입 검토 순서

1. RN Appendix에서 지원 여부와 nullable 조건을 확인한다.
2. `Libraries/` 아래 코어 Spec을 같은 종류의 API 예제로 확인한다.
3. Codegen을 실행하여 실제 Java/ObjC++/C++ 선언을 읽는다.
4. JavaScript wrapper에서 입력 형식과 단위를 정하고 네이티브 구현에서 필요한 변환을 수행한다.
5. 누락 값, 빈 배열, 잘못된 payload와 Promise 실패를 플랫폼별로 확인한다.

큰 정수와 커스텀 C++ 구조는 단순히 JS `number`로 바꾸지 않고 [[RN-Native-Module-Advanced]]의 bridging 계약을 사용한다.

## 출처

- [React Native, Appendix](https://reactnative.dev/docs/appendix)

## 관련 문서

- [[RN-Codegen]]
- [[RN-Native-Module-Advanced]]
- [[RN-Native-Platform]]
