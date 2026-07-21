---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["Execution Context"]
verified_at: 2026-07-21
---

### 실행 컨텍스트
JS 코드가 실행되는 환경

- 구성 요소
1. Lexical Environment
    ```
    let이나 const같은 변수나 함수의 식별자 및 외부 스코프의 참조를 포함.
    
    클로저같은 기능이 동작하도록 스코프 체인을 관리한다.
    ```
2. Variable Environment
    ```
    var로 선언한 식별자나 함수 선언문을 저장한다. 호이스팅이 발생하는 영역이다.
    ```
3. This Binding
    ```
    현재 실행 컨텍스트에서 this가 무엇을 가리키는지를 결정한다.
    
    함수 호출 방식에 따라 this가 가리키는 대상이 달라진다.
    ```

---

- 컨텍스트 유형
1. Global Context
    ```
    script 코드의 전역 실행 환경. Node.js에는 globalThis가 있지만 CommonJS와 ESM의 top-level binding은
    전역 객체의 property로 자동 노출되지 않고 모듈 스코프에 남는다.
    ```
2. Function Context
    ```
    함수가 호출될 때마다 생성되고 함수의 매개변수, 지역 변수, 내부 함수 등이 해당 컨텍스트에 포함됩니다.
    ```
3. Module Context
    ```
    Node.js 파일의 module scope와 평가는 module system에 따라 다르다.

    CommonJS는 각 파일을 function wrapper로 감싸 exports, require, module, __filename, __dirname을
    wrapper parameter처럼 제공한다. ESM에는 이 다섯 CommonJS 변수가 없고 import/export와
    import.meta.filename, import.meta.dirname 같은 ESM API를 사용한다.

    두 방식 모두 top-level 선언을 다른 모듈에 자동 공유하지 않지만 export 방식과 평가 규칙은 서로 다르다.
    ```

---

- 실행 컨텍스트 생성 과정
1. 컴파일 단계
    ```
    코드 실행 전, 자바스크립트 엔진은 모든 변수와 함수 선언을 미리 스캔합니다.
    
    선언된 변수와 함수는 실행 컨텍스트의 Lexical Environment, Variable Environment에 저장됩니다.
    ```
2. 실행 단계
    ```
    코드가 실제로 실행되면서, 변수에 값이 할당되고 함수가 호출됩니다.
    
    함수 호출 시 새로운 실행 컨텍스트가 생성되어 콜 스택에 쌓이고, 실행이 끝나면 제거됩니다.
    ```

## 관련 문서
- [[Call-Stack-Heap|Call Stack Heap]]
- [[Scope]]
- [[Closure]]

## 출처

- [Node.js CommonJS Modules — The module wrapper](https://nodejs.org/api/modules.html#the-module-wrapper)
- [Node.js ECMAScript Modules — Differences between ES modules and CommonJS](https://nodejs.org/api/esm.html#differences-between-es-modules-and-commonjs)
