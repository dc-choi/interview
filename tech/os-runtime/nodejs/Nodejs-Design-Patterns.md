---
tags: [nodejs, runtime, design-pattern, singleton, factory, builder, prototype]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Node.js Design Patterns", "Node.js 디자인 패턴", "Creational Patterns in Node.js"]
---

# Node.js 생성 패턴 (Singleton · Factory · Builder · Prototype)

GoF 생성(Creational) 패턴이 Node.js 환경에서 어떻게 적용되는지. 자바스크립트는 프로토타입 기반 객체 모델 + 모듈 캐싱이라는 특성 덕분에 **클래식한 GoF 구현을 그대로 옮기면 과설계**가 되는 경우가 많다. 언어·런타임이 이미 제공하는 기능을 먼저 고려해야 한다.

## 1. Singleton

**정의**: 애플리케이션 전역에서 **단 하나의 인스턴스**만 존재하도록 보장하는 패턴.

**Node.js에서의 특수성**: CommonJS/ESM **모듈 캐싱**이 사실상 싱글톤을 기본 제공한다. `require()`로 같은 모듈을 여러 번 불러도 캐시된 동일 exports 객체가 반환된다.

```js
// db.js
class DatabaseConnection {
  constructor() { this.pool = createPool(); }
  query(sql) { ... }
}
module.exports = new DatabaseConnection();

// 다른 파일
const db = require('./db'); // 항상 같은 인스턴스
```

**주의할 점**:
- 모듈 캐시 키는 **해석된 경로** 기준. 심볼릭 링크·모노레포에서 경로가 달라지면 별도 인스턴스 생성
- ESM은 명세상 "한 번만 평가"가 보장되지만 런타임에 따라 캐시 구현 차이 존재
- **테스트 어려움** — 전역 상태라 테스트 간 누수. 주입형(생성자 파라미터) 구조가 더 유연
- **멀티 프로세스(cluster·PM2)** 에서는 프로세스별 싱글톤 → 프로세스 간 상태는 Redis 등 외부 저장소로

**언제 쓰나**: DB 커넥션 풀, 로거, 설정 객체. 공유 상태가 필요하고 동시성 이슈가 작은 자원.

## 2. Factory

**정의**: 객체 생성 로직을 **별도 함수/클래스에 위임**해, 호출자가 구체 클래스를 몰라도 원하는 객체를 받게 한다.

```js
function createTransport(type) {
  switch (type) {
    case 'http':  return new HttpTransport();
    case 'ws':    return new WsTransport();
    case 'kafka': return new KafkaTransport();
    default: throw new Error(`Unknown transport: ${type}`);
  }
}

const transport = createTransport(process.env.TRANSPORT ?? 'http');
```

**효과**:
- 호출자가 `new`를 직접 쓰지 않음 → 구체 타입 변경에 열려 있음
- 생성 전 조건 검증, 캐시, 풀링 같은 교차 관심사를 한 곳에서 처리
- NestJS의 `@Module({ providers: [{ provide: X, useFactory: ... }] })`가 대표 예

**변형**:
- **Abstract Factory**: 연관된 여러 객체군을 같이 만들어야 할 때
- **Static Factory Method**: 클래스의 `static create()` — 생성자 오버로딩 대체

## 3. Builder

**정의**: **여러 선택 파라미터를 가진 복잡한 객체**의 생성 과정을 메서드 체이닝으로 단계화.

```js
class QueryBuilder {
  #select = '*';
  #from;
  #where = [];
  select(cols)  { this.#select = cols; return this; }
  from(table)   { this.#from = table;  return this; }
  where(cond)   { this.#where.push(cond); return this; }
  build() {
    return `SELECT ${this.#select} FROM ${this.#from}` +
      (this.#where.length ? ` WHERE ${this.#where.join(' AND ')}` : '');
  }
}

const sql = new QueryBuilder().select('id, name').from('users').where('age >= 18').build();
```

**효과**:
- 생성자 파라미터가 6개가 넘어가거나 선택 파라미터가 많을 때 가독성 ↑
- **불완전한 상태로 객체가 노출되지 않음** — `build()` 호출 전까지 미완성
- TypeScript + fluent API와 궁합

**Node.js/JS에서의 대안**: 옵션 객체 리터럴이 더 간단할 때가 많다.
```js
new HttpClient({ baseUrl, timeout: 3000, retries: 3 });
```
선택 파라미터가 적고 순서 독립적이면 Builder보다 간결. **조건부 구성**(예: where가 0~N개)에는 Builder가 유리.

## 4. Prototype

**정의**: 기존 객체를 **청사진**으로 삼아 복제하여 새 객체를 생성. 클래스를 거치지 않고 런타임 객체로부터 직접 파생.

**JavaScript의 본질적 모델**: 언어 자체가 프로토타입 기반이다. `Object.create(proto)` 또는 `class`의 `prototype` 체인이 이 패턴의 구현.

```js
const Connection = {
  init(host) { this.host = host; return this; },
  connect() { console.log(`connecting to ${this.host}`); },
};

const c1 = Object.create(Connection).init('a.example.com');
const c2 = Object.create(Connection).init('b.example.com');
// c1, c2는 동일한 메서드를 공유(참조) — 메모리 효율
```

**효과**:
- 공통 메서드를 여러 인스턴스가 **참조 공유** → 메모리 효율
- 동적으로 프로토타입을 바꿔 행위를 런타임에 교체 가능

**클래스 vs 프로토타입**: 현대 JS에서는 `class`로 선언해도 내부적으로 프로토타입을 쓰지만, 명시적 `Object.create`가 필요한 경우는 드물다(mixin·다중 상속 우회 정도). 자세한 배경은 [[JavaScript-Prototype-Philosophy|JS가 프로토타입을 선택한 이유]].

## 언제 어떤 패턴을 쓰는가

| 상황 | 추천 패턴 |
|---|---|
| 앱 전역에서 단 하나의 커넥션·설정 | Singleton(모듈 캐싱) |
| 환경/설정에 따라 다른 구체 객체 생성 | Factory |
| 선택 파라미터가 많고 조건부 구성 | Builder |
| 공통 행위를 공유하며 경량 인스턴스 다수 생성 | Prototype(또는 class) |
| 단순 불변 데이터 | 객체 리터럴 + `Object.freeze` |

## 과설계 주의

- **Factory를 남발**하면 아무것도 숨기지 않는 `createX` 함수가 난립 → 단순 `new`보다 가치가 없음
- **Singleton을 기본**으로 삼으면 테스트·분산 환경에서 금방 한계. 주입형 + IoC 컨테이너(NestJS·tsyringe)가 기본
- **Builder를 옵션 객체 대신** 무조건 쓰면 보일러플레이트만 증가

## 면접 체크포인트

- Node.js 모듈 캐싱이 Singleton을 대체하는 이유
- 모듈 캐시가 "프로세스별"이라는 한계와 멀티 프로세스 대응(Redis 등)
- Factory와 단순 `new`의 가치 차이(교체 가능성·교차 관심사)
- Builder가 옵션 객체보다 유리한 상황(조건부·미완성 상태 보호)
- Prototype 패턴과 JavaScript 프로토타입 체인의 관계

## 출처
- [yceffort — Node.js의 4가지 디자인 패턴](https://yceffort.kr/2021/01/nodejs-4-design-pattern)

## 관련 문서
- [[tech/architecture-design/design-pattern/디자인패턴이란|디자인 패턴이란]]
- [[JavaScript-Prototype-Philosophy|JS가 프로토타입을 선택한 이유]]
- [[tech/computer-science/js/Prototype-OOP|Prototype 기반 OOP]]
- [[Module-System|Node.js 모듈 시스템]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
