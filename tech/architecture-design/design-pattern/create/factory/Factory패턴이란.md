---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Factory 패턴이란?"]
---

# Factory 패턴이란?
객체 생성 로직을 캡슐화하여, 클라이언트가 구체적인 클래스를 알 필요 없이 객체를 생성할 수 있게 하는 패턴

## 왜 쓸까?

### 생성 로직과 사용 로직의 분리
객체를 만드는 코드와 사용하는 코드를 분리하면 각각 독립적으로 변경할 수 있다.

### 런타임 조건에 따른 객체 생성
조건에 따라 서로 다른 타입의 객체를 반환할 수 있다. 호출자는 반환된 객체의 구체적 타입을 알 필요가 없다.

### 클로저를 활용한 private 멤버 구현
new 키워드 없이 팩토리 함수로 객체를 생성하면, 클로저를 통해 외부에서 접근할 수 없는 private 멤버를 만들 수 있다.

### 코드 재사용과 유연성 향상
생성 로직을 한 곳에 모아두면 변경 시 영향 범위가 줄어든다.

## 핵심 개념

### 기본 Factory
```typescript
function createImage(name: string) {
  if (name.match(/\.jpe?g$/)) {
    return new ImageJpeg(name)
  } else if (name.match(/\.gif$/)) {
    return new ImageGif(name)
  } else if (name.match(/\.png$/)) {
    return new ImagePng(name)
  } else {
    throw new Error('Unsupported format')
  }
}
```

파일 확장자에 따라 다른 이미지 객체를 반환한다. 호출자는 createImage('photo.jpg')만 호출하면 되고, 내부적으로 어떤 클래스가 사용되는지 알 필요가 없다.

### 클로저를 활용한 Private 멤버
```typescript
function createPerson(name: string) {
  const privateProperties: Record<string, unknown> = {}

  return {
    setName(n: string) { privateProperties.name = n },
    getName() { return privateProperties.name as string }
  }
}
```

privateProperties는 반환된 객체의 메서드를 통해서만 접근 가능하다. 외부에서 직접 접근할 수 없으므로 진정한 캡슐화를 달성한다.

### 환경별 Factory
```typescript
function createProfiler(label: string) {
  if (process.env.NODE_ENV === 'production') {
    return {
      start() {},
      end() {}
    }
  }

  const startTime = process.hrtime()
  return {
    start() { /* 타이머 시작 */ },
    end() {
      const diff = process.hrtime(startTime)
      console.log(`[${label}] ${diff[0]}s ${diff[1] / 1e6}ms`)
    }
  }
}
```

프로덕션에서는 아무 동작도 하지 않는 no-op 프로파일러를 반환하고, 개발 환경에서는 실제 시간을 측정하는 프로파일러를 반환한다. 호출 코드는 환경을 신경 쓸 필요가 없다.

## 실 사용 사례
1. Node.js 코어: http.createServer(), fs.createReadStream(), Buffer.from()
2. 데이터베이스 드라이버: 설정에 따라 다른 DB 어댑터 생성
3. 로거: 환경에 따라 다른 로깅 전략 적용
