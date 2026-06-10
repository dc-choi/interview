---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Proxy 패턴이란?"]
---

# Proxy 패턴이란?
다른 객체(Subject)에 대한 접근을 제어하는 대리 객체. 원본 객체의 동작을 가로채서 검증, 캐싱, 로깅 등의 부가 기능을 수행한다.

## 왜 쓸까?

### 데이터 검증
Subject 접근 전 유효성 검사를 수행하여 잘못된 입력을 차단한다.

### 보안
권한 확인 후 접근을 허용하여 민감한 리소스를 보호한다.

### 캐싱
반복 접근 시 결과를 재사용하여 성능을 향상시킨다.

### 지연 초기화
실제 사용 시점까지 무거운 객체의 생성을 지연한다.

### 로깅
메서드 호출을 기록하여 디버깅과 모니터링을 지원한다.

### 원격 객체 표현
네트워크 너머의 객체를 로컬 객체처럼 사용할 수 있게 한다.

## 핵심 개념

### 구현 방식 3가지

**1. Object Composition (객체 합성)**

Subject를 래핑하는 새 객체를 생성하고 모든 메서드를 수동으로 위임한다. 안전하지만 메서드가 많으면 번거롭다.

**2. Object Extension (Monkey Patching)**

Subject 객체를 직접 수정한다. 구현이 단순하지만 원본을 변경하므로 부작용 위험이 있다. Subject가 여러 곳에서 공유되는 경우 주의가 필요하다.

**3. ES2015 Proxy 객체**

JavaScript 내장 Proxy로 동적 프로퍼티 접근을 가로챈다. handler trap으로 get, set, has, deleteProperty, apply, construct 등을 지원한다. 가장 유연하고 강력한 방식이다.

### 코드 예시: 안전한 계산기
```typescript
const safeCalculatorHandler: ProxyHandler<Calculator> = {
  get: (target, property) => {
    if (property === 'divide') {
      return function () {
        const divisor = target.peekValue()
        if (divisor === 0) throw new Error('Division by 0')
        return target.divide()
      }
    }
    return (target as any)[property]
  }
}

const calculator = new Proxy(new Calculator(), safeCalculatorHandler)
```

원본 Calculator의 divide 메서드를 가로채서 0으로 나누기를 방지한다. 나머지 메서드는 원본 그대로 동작한다.

### Change Observer 패턴

ES Proxy의 set 트랩으로 상태 변경을 감지하여 리스너에게 통지한다. 리액티브 프로그래밍의 기반이 되는 패턴이다.

```typescript
function createObservable<T extends object>(target: T, observer: (change: any) => void): T {
  return new Proxy(target, {
    set(obj, prop, value) {
      if (value !== (obj as any)[prop]) {
        observer({ prop, prev: (obj as any)[prop], curr: value })
      }
      ;(obj as any)[prop] = value
      return true
    }
  })
}
```

프로퍼티 값이 변경될 때마다 observer 콜백이 호출되어 변경 전후 값을 확인할 수 있다.

## Proxy vs Decorator 차이

| 항목 | Proxy | Decorator |
|------|-------|-----------|
| 목적 | 기존 동작 수정/제어 | 새로운 동작 추가 |
| 인터페이스 | 동일하게 유지 | 확장됨 |

## 실 사용 사례
1. mikro-orm: 엔티티 지연 로딩
2. NestJS LazyModuleLoader: 모듈 지연 초기화
3. Vue.js 3: 리액티비티 시스템 (ES Proxy 기반)
4. MobX: observable 상태 관리
