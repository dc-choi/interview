---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Decorator 패턴이란?"]
---

# Decorator 패턴이란?
기존 객체의 인터페이스를 확장하여 새로운 기능을 동적으로 추가하는 패턴. 상속과 달리 특정 인스턴스에만 적용 가능하다.

## 왜 쓸까?

### 런타임 기능 추가
실행 시점에 객체에 기능을 추가할 수 있어 유연하다.

### 상속 없이 기능 확장
Composition over Inheritance 원칙에 따라 상속의 경직성을 피한다.

### 데코레이터 조합
여러 데코레이터를 조합하여 다양한 기능 구성이 가능하다.

### OCP 준수
기존 코드를 수정하지 않고 기능을 추가할 수 있어 개방-폐쇄 원칙을 따른다.

## 핵심 개념

### Proxy와의 핵심 차이
Proxy는 기존 동작을 수정하거나 제어하며 인터페이스를 동일하게 유지한다. Decorator는 새로운 동작을 추가하며 인터페이스가 확장된다.

### 구현 방식

**Object Composition**

원본 객체를 감싸는 새 객체를 만들고 기존 메서드를 위임하면서 새 메서드를 추가한다.

**Object Augmentation (Monkey Patching)**

원본 객체에 직접 새 프로퍼티나 메서드를 추가한다. 구현이 단순하지만 원본 객체를 변경한다.

### 코드 예시: LevelUP 플러그인
```typescript
function levelSubscribe(db: any) {
  db.subscribe = (pattern: Record<string, any>, listener: Function) => {
    db.on('put', (key: string, val: any) => {
      const match = Object.keys(pattern).every(
        k => pattern[k] === val[k]
      )
      if (match) listener(key, val)
    })
  }
  return db
}
```

기존 db 객체에 subscribe라는 새로운 메서드를 추가한다. 원래 db 인터페이스의 모든 기능은 그대로 유지되면서 패턴 매칭 기반 구독 기능이 확장된다.

```typescript
const db = levelSubscribe(level('./db', { valueEncoding: 'json' }))

db.subscribe(
  { doctype: 'tweet', language: 'en' },
  (key: string, val: any) => console.log(val)
)
```

## 실 사용 사례
1. LevelUP 플러그인 시스템
2. TypeScript/NestJS 데코레이터: @Injectable, @Controller
3. Express 미들웨어: req/res 객체에 프로퍼티 추가
4. 로깅 데코레이터: 메서드 호출 전후 로그 추가
