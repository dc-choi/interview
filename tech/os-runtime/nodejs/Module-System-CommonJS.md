---
tags: [runtime, nodejs]
status: done
category: "OS & Runtime"
aliases: ["CommonJS", "CJS"]
---

# CommonJS 모듈 시스템

Node.js의 기본 모듈 시스템. 동기적 로딩 방식과 래핑 함수 기반의 스코프 격리가 특징이다.

## Revealing Module Pattern (모듈 시스템 이전)

JavaScript에 공식적인 모듈 시스템이 없던 시절, IIFE(즉시 실행 함수 표현식)를 활용해 스코프를 격리하고 캡슐화를 구현했다. 외부에 공개할 메서드만 객체로 반환하여 private/public 경계를 만드는 패턴이다.

```javascript
const counterModule = (() => {
    let count = 0; // private

    return {
        increment: () => ++count,
        decrement: () => --count,
        getCount: () => count,
    };
})();

counterModule.increment(); // 1
counterModule.increment(); // 2
counterModule.decrement(); // 1
counterModule.count; // undefined (private)
```

## CommonJS 내부 동작

모듈을 로드할 때 Node.js는 해당 파일의 코드를 다음과 같은 함수로 래핑한다:

```javascript
(function(exports, require, module, __filename, __dirname) {
    // 모듈 코드가 여기에 들어간다
});
```

이 래핑 덕분에 각 모듈은 자체 스코프를 가지며, exports, require, module, __filename, __dirname이 모듈 내에서 사용 가능해진다.

### require()의 6단계 해석 과정

1. **모듈명 → 절대 경로 변환**: 모듈 식별자를 파일 시스템의 절대 경로로 변환한다.
2. **캐시 확인**: require.cache에 해당 경로의 모듈이 이미 있는지 확인한다.
3. **메타데이터 객체 생성**: 새로운 module 객체를 생성한다 (id, exports, loaded, children 등).
4. **캐시에 등록 (순환 방지)**: 코드 실행 전에 먼저 캐시에 등록하여 순환 의존성 시 무한 루프를 방지한다.
5. **래핑 함수 내에서 코드 실행**: 위의 래핑 함수 안에서 모듈 코드를 실행한다.
6. **module.exports 반환**: 실행이 완료되면 module.exports를 호출자에게 반환한다.

### exports vs module.exports

exports는 module.exports의 참조(alias)이다. 초기 상태에서 exports === module.exports는 true이다. exports에 프로퍼티를 추가하는 것은 동작하지만, exports 자체를 재할당하면 module.exports와의 참조가 끊어져 의도대로 동작하지 않는다.

```javascript
// 동작함: 프로퍼티 추가
exports.hello = () => 'world';

// 동작하지 않음: 참조 끊김
exports = { hello: () => 'world' };

// 올바른 방법: module.exports 직접 할당
module.exports = { hello: () => 'world' };
```

### 동기적 로딩

require()는 블로킹 호출이다. 파일을 읽고, 파싱하고, 실행하는 모든 과정이 동기적으로 이루어진다. 이 때문에 서버 시작 시에는 문제가 없지만, 런타임 중 대량의 모듈을 동적으로 로드하면 이벤트 루프를 블로킹할 수 있다.

### 모듈 Resolution 순서

1. **파일 모듈**: `/`, `./`, `../`로 시작하면 파일 시스템 경로로 해석한다.
2. **코어 모듈**: `fs`, `path`, `http` 등 Node.js 내장 모듈은 항상 우선한다.
3. **패키지 모듈**: 위 두 경우에 해당하지 않으면 현재 디렉토리의 node_modules부터 루트까지 순차적으로 탐색한다.

### 캐싱

한 번 로드된 모듈은 require.cache에 캐시된다. 동일한 모듈을 다시 require()하면 캐시된 module.exports가 반환되므로 코드가 재실행되지 않는다. 이로 인해 모듈은 싱글턴처럼 동작한다. 순환 의존성도 캐시 덕분에 무한 루프 없이 처리된다.

### 순환 의존성

A 모듈이 B를 require하고, B가 다시 A를 require하는 상황에서는 A의 로딩이 아직 완료되지 않은 시점(loaded: false)에서의 불완전한 exports 객체가 B에게 반환된다. 이 때문에 B가 기대하는 A의 export가 아직 정의되지 않았을 수 있어, 순환 의존성 구조 자체를 피하는 것이 최선이다.

## 모듈 정의 패턴

CommonJS에서 모듈을 정의하는 대표적인 패턴들이다.

**Named exports**: 여러 기능을 개별적으로 내보낸다. 가장 일반적인 패턴이다.

```javascript
exports.parse = (str) => { /* ... */ };
exports.stringify = (obj) => { /* ... */ };
```

**Function export**: 단일 함수를 모듈의 진입점으로 내보낸다. 명확한 단일 책임을 표현한다.

```javascript
module.exports = (config) => { /* ... */ };
```

**Class export**: 클래스를 내보내어 사용자가 인스턴스를 생성하게 한다. 프로토타입 확장이 가능하다.

```javascript
module.exports = class Logger { /* ... */ };
```

**Instance export (싱글턴)**: 클래스의 인스턴스를 직접 내보낸다. require 캐싱으로 인해 싱글턴이 보장된다.

```javascript
module.exports = new Database();
```

**Monkey-patching (비권장)**: 다른 모듈의 exports를 런타임에 수정한다. 테스트 목적으로 간혹 사용되지만, 예측 불가능한 부작용을 초래하므로 권장되지 않는다.

## 관련 문서
- [[Module-System-ESM|ESM 모듈 시스템]]
- [[Module-System|모듈 시스템 인덱스]]
- [[Closure|클로저]]
- [[Scope|스코프]]
