---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Strategy 패턴이란?"]
---

# Strategy 패턴이란?
로직을 "전략"이라는 별도의 상호 교환 가능한 객체로 추출하여, 런타임에 알고리즘을 교체할 수 있게 하는 패턴

## 왜 쓸까?

### if-else 체인 없이 알고리즘을 교체
조건문으로 분기하는 대신, 전략 객체를 주입하여 알고리즘을 선택한다.

### 새 전략 추가 시 기존 코드 수정 불필요 (OCP)
기존 Context나 다른 전략을 수정하지 않고 새로운 Concrete Strategy만 추가하면 된다.

### 전략 객체를 독립적으로 테스트 가능
각 전략은 독립된 객체이므로 단위 테스트가 쉽다.

### 관심사 분리
Context는 "무엇을" 할지, Strategy는 "어떻게" 할지를 담당한다.

## 핵심 개념

### 구조
Context + Strategy Interface + Concrete Strategies
- Context: 전략을 사용하는 객체. 전략을 런타임에 교체 가능
- Strategy: 알고리즘의 공통 인터페이스
- Concrete Strategy: 실제 알고리즘 구현

### Template Method와의 차이
| 항목 | Strategy | Template Method |
|------|----------|-----------------|
| 관계 | has-a (합성) | is-a (상속) |
| 변경 시점 | 런타임 | 컴파일타임 |
| 유연성 | 높음 | 낮음 |

### 코드 예시: 멀티포맷 Config
```typescript
interface ConfigStrategy {
  deserialize(data: string): Record<string, any>
  serialize(data: Record<string, any>): string
}

const jsonStrategy: ConfigStrategy = {
  deserialize: (data) => JSON.parse(data),
  serialize: (data) => JSON.stringify(data, null, 2)
}

const iniStrategy: ConfigStrategy = {
  deserialize: (data) => { /* INI 파싱 로직 */ },
  serialize: (data) => { /* INI 직렬화 로직 */ }
}

class Config {
  private data: Record<string, any> = {}

  constructor(private strategy: ConfigStrategy) {}

  async read(filePath: string) {
    const raw = await fs.readFile(filePath, 'utf-8')
    this.data = this.strategy.deserialize(raw)
  }

  async save(filePath: string) {
    await fs.writeFile(filePath, this.strategy.serialize(this.data))
  }
}
```

## 실 사용 사례
1. Passport.js: LocalStrategy, GoogleStrategy, JWTStrategy
2. 결제 시스템: 카드/계좌이체/간편결제 전략
3. 압축: gzip/brotli/deflate 전략
4. 정렬: 데이터 크기에 따라 다른 정렬 알고리즘
5. WMS 피킹: 주문·단품·배치·총량 피킹 4종 (추상 `BasePickingStrategy` + 각 concrete에서 `createInstruction()`·`filterOrders()` 구현)

## 실전 도입 시점

전략 패턴은 **조건문이 3개 이상으로 늘어날 때** 도입을 고민. 2개면 단순 if-else가 더 읽기 좋음. 함정:

- **모든 if-else를 Strategy로**: 과설계. 한 번만 쓰는 분기는 그냥 if
- **전략 간 공통 로직 반복**: 추상 클래스에 Template Method로 끌어올리거나 합성으로 공유
- **Strategy 주입을 잊고 Context에서 직접 new**: DI 이점 사라짐 — 팩토리나 DI 컨테이너로 주입

"디자인 패턴은 만능 해법이 아니라 상황에 따른 선택" — 명확한 이유가 없으면 도입하지 말고, 도입 후 오버헤드가 크면 과감히 되돌릴 것.

## 출처
- [jminc00 — 전략 패턴 구현 예제 (WMS 피킹 리팩토링)](https://jminc00.tistory.com/100)
