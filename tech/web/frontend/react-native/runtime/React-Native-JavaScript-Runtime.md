---
tags: [react-native, mobile, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native JavaScript 환경과 변환"]
---

# React Native JavaScript 환경과 변환

React Native 0.87 문서 기준이다.

React Native의 JavaScript 실행 환경은 브라우저와 같지 않다. React component와 JavaScript 로직은 공유할 수 있지만 DOM이나 브라우저 전용 API가 자동으로 제공되지는 않는다.

## 엔진, 변환과 API를 구분하기

| 구분 | 책임 | 예시 |
|---|---|---|
| JavaScript engine | 실행과 메모리 관리 | Hermes, 선택적으로 JavaScriptCore |
| Babel transform | 지원 syntax를 실행 가능한 형태로 변환 | JSX, TypeScript syntax, module 변환 |
| React Native runtime API와 polyfill | 앱 코드가 사용할 API 제공 | `fetch`, timer, `console`, `__DEV__` |
| Native module/component | OS 기능과 native UI 연결 | 플랫폼 저장소, 기기 기능, view |

Babel이 문법을 처리한다는 사실과 해당 global API가 존재한다는 사실은 다르다. TypeScript 변환도 타입 검사를 대신하지 않는다. `tsc` 등의 별도 검사를 개발 흐름에서 실행한다.

## 현재 엔진과 과거 원격 실행

기본 엔진은 Hermes다. JSC를 선택하면 community package의 통합 절차와 앱 버전 호환성을 확인한다. iOS 앱의 JSC는 실행 가능 메모리 제약 때문에 일반적인 JIT 사용을 전제로 하지 않는다.

JavaScript Environment 원문에는 Chrome에서 V8으로 JS를 실행하는 설명이 남아 있다. 이 Remote JavaScript Debugging은 0.79에서 제거됐으므로 0.87의 현행 선택지로 적용하지 않는다. 현재 디버거는 실제 앱 엔진을 조사하는 방식과 legacy 원격 실행을 구분한다.

## Syntax 변환 범위

실제 활성 변환은 프로젝트 Babel 설정과 `@react-native/babel-preset`으로 확인한다. 문서에 실린 예시는 다음 계열을 포함한다.

- ES2015의 arrow function, block scope, class, destructuring, template literal, default/rest parameter와 module.
- exponentiation, async function, object spread와 optional catch binding.
- dynamic import, nullish coalescing, optional chaining과 class field.
- JSX, Flow와 TypeScript syntax, ESM/CJS 변환.

문서 목록의 stage proposal을 표준 JavaScript라고 부르거나 모든 transform이 모든 bundler 설정에 적용된다고 단정하지 않는다. library가 최신 syntax와 특정 runtime API를 요구하면 두 호환성을 각각 확인한다.

## 제공 API

공식 환경 문서는 CommonJS `require`, console 메서드, `XMLHttpRequest`, `fetch`, timeout/interval/immediate/animation frame 계열을 제시한다. 또한 `Array.from`, `find`, `findIndex`, `includes`, `Object.assign`, `entries`, `values`와 여러 문자열 메서드를 열거한다.

`__DEV__`는 개발 모드 분기를 위한 값이다. 보안 비밀이나 접근 제어를 이 분기만으로 보호하지 않는다. API가 익숙한 이름을 갖더라도 cookie, 인증과 networking의 플랫폼 제약은 별도 계약이다.

## 실무 확인

엔진 차이가 의심되면 실제 기기의 release build에서도 재현한다. debugger를 바꾸거나 transform을 추가한 뒤 문제가 사라졌다는 결과만으로 원래 엔진의 실행을 증명할 수 없다. 웹 library를 가져올 때는 DOM 사용, Node.js built-in 의존과 native 호환 여부를 먼저 확인한다.

## 출처

- [React Native, JavaScript Environment](https://reactnative.dev/docs/javascript-environment)

## 관련 문서

- [[React-Native-Hermes]]
- [[React-Native-Timers]]
- [[React-Native-Native-Debugging]]
