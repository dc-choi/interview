---
tags: [cs, code-quality, immutability, oop]
status: done
category: "CS - 코드 품질"
aliases: ["Defensive Copy", "방어적 복사"]
---

# 방어적 복사 (Defensive Copy)

객체의 **내부 상태를 외부 참조로부터 보호**하는 기법. 생성자·getter·setter 경계에서 **원본과 참조를 끊은 복사본**을 주고받는다. 불변성·캡슐화의 핵심 도구.

## 왜 필요한가

참조 타입(객체·배열·컬렉션)은 **주소를 공유**한다. 따라서 외부가 내 객체의 참조를 잡고 있으면 **나 몰래 내부를 바꿀** 수 있다.

```
class Period {
  constructor(private start: Date, private end: Date) {
    if (start > end) throw new Error();
  }
}

const start = new Date('2026-01-01');
const end   = new Date('2026-12-31');
const period = new Period(start, end);

end.setFullYear(2000);   // ← 외부에서 end 수정
// 이제 period의 불변 조건(start <= end) 깨짐
```

Period는 "시작 ≤ 끝"이라는 **불변 조건**을 생성 시 검증했지만, 외부의 `end` 참조 수정으로 **조건이 사후에 깨짐**. 방어적 복사로 막을 수 있음.

## 두 적용 지점

### 1. 생성자 — 받은 객체를 복사해서 저장
```
class Period {
  private start: Date;
  private end: Date;

  constructor(start: Date, end: Date) {
    this.start = new Date(start);   // 복사
    this.end   = new Date(end);     // 복사

    if (this.start > this.end) throw new Error();   // 복사 후 검증
  }
}
```

### 2. Getter — 내부를 복사해서 반환
```
class Period {
  getStart(): Date {
    return new Date(this.start);   // 복사본 반환
  }
}

const p = period.getStart();
p.setFullYear(2000);   // 외부 복사본만 바뀌고 내부는 안전
```

## 검증 타이밍 — 복사 먼저, 검증 나중

순서를 바꾸면 **TOCTOU(Time-Of-Check Time-Of-Use)** 공격 노출:

```
// ❌ 위험
constructor(start: Date, end: Date) {
  if (start > end) throw new Error();      // 검증
  this.start = new Date(start);             // 복사 — 이 사이에 외부가 값 바꿀 수 있음
  this.end   = new Date(end);
}

// ✅ 안전
constructor(start: Date, end: Date) {
  this.start = new Date(start);             // 복사 먼저
  this.end   = new Date(end);
  if (this.start > this.end) throw new Error();  // 복사본으로 검증
}
```

멀티스레드·이벤트 루프 환경에서 경쟁 조건 방지.

## 얕은 복사 vs 깊은 복사

방어적 복사도 **깊이**를 선택해야 한다.

```
class Team {
  constructor(private members: Member[]) {
    this.members = [...members];    // 얕은 복사 — 배열만 새로, Member는 공유
  }
}

const m = new Member('dc');
const team = new Team([m]);
m.role = 'admin';   // 외부가 Member 직접 수정 → Team 내부에도 반영
```

얕은 복사는 **Top 수준만** 보호. Nested 객체는 여전히 공유. 완전한 불변성을 원하면:

1. **깊은 복사** (`structuredClone(obj)`·`lodash cloneDeep`)
2. **원시 타입으로 저장** (string·number로 변환)
3. **불변 자료구조 사용** (Immutable.js·`Object.freeze`)

## 컬렉션의 경우

```
class Team {
  private readonly _members: Member[];

  constructor(members: Member[]) {
    this._members = [...members];   // 방어적 복사
  }

  // ❌ 내부 배열 그대로 반환
  getMembersUnsafe() {
    return this._members;
  }

  // ✅ 복사본 반환
  getMembersCopy() {
    return [...this._members];
  }

  // ✅ 읽기 전용 뷰 반환 (JS)
  getMembersReadonly(): readonly Member[] {
    return Object.freeze([...this._members]);
  }
}
```

Java라면 `Collections.unmodifiableList()`, TS라면 `readonly` 타입. 외부는 수정 불가, 내부는 자유.

## 성능 비용

복사는 공짜가 아님:
- 작은 객체는 무시 가능
- 큰 배열·깊은 객체는 매 getter마다 복사하면 체감
- 성능 크리티컬 경로라면 **불변 자료구조**·**`readonly` 타입만**으로 충분할 수 있음

**측정 전에 최적화 금지**. 대부분 도메인에선 안전성 > 성능.

## JavaScript의 특수성

JS는 Java와 달리:
- **`Object.freeze`**: 얕은 동결. 중첩은 별도
- **`structuredClone()`**: Node 17+, 깊은 복사 표준
- **Spread·`Object.assign`**: 얕은 복사
- **`JSON.parse(JSON.stringify(x))`**: 간단 깊은 복사지만 함수·Date·Map·Symbol 손실

## 방어적 복사 vs 불변 객체

완전한 해결: **처음부터 불변 객체**.

```
// 불변
class ImmutablePeriod {
  readonly start: Date;
  readonly end: Date;

  constructor(start: Date, end: Date) {
    this.start = new Date(start);
    this.end   = new Date(end);
    if (this.start > this.end) throw new Error();
    Object.freeze(this);
  }

  withStart(newStart: Date): ImmutablePeriod {
    return new ImmutablePeriod(newStart, this.end);   // 새 인스턴스
  }
}
```

- 외부가 수정하려 해도 **frozen** → strict mode에서 에러
- 수정이 필요하면 **새 인스턴스 반환** (Value Object 패턴)
- 방어적 복사 필요성 자체가 줄어듦

Value Object·DDD·함수형 스타일에 자연스럽게 어울림.

## 언제 쓰는가

**반드시**:
- 불변 조건을 가진 엔티티 (기간·범위·금액)
- 생성자에서 받는 컬렉션·배열
- 외부 API에 노출되는 getter

**선택적**:
- 내부 전용 유틸 클래스 (방어 비용 > 이득)
- 이미 불변으로 설계된 객체

**안 씀**:
- 원시 타입 파라미터 (string·number — 값 복사)
- 성능 크리티컬 핫패스 (측정 후 결정)

## 흔한 실수

- 검증 전에 복사 안 하고 **참조 그대로 저장** → TOCTOU 공격
- 얕은 복사만 하고 **깊은 객체 공유** → 불변성 파괴
- `Object.freeze`를 **얕게** 쓰고 깊은 것으로 착각
- getter에서 내부 배열 **그대로 반환** → 외부 수정 가능

## 면접 체크포인트

- 방어적 복사가 해결하는 문제 (외부 참조 수정)
- 생성자·getter 두 지점에 적용하는 이유
- 검증보다 복사가 먼저여야 하는 이유 (TOCTOU)
- 얕은 복사와 깊은 복사 선택 기준
- Value Object·불변 객체로 가는 게 방어적 복사보다 나은 경우
- 컬렉션 getter에서 readonly·unmodifiable이 주는 이점

## 출처
- [매일메일 — 방어적 복사](https://www.maeil-mail.kr/question/146)

## 관련 문서
- [[Code-Quality-Criteria|코드 품질의 기준]]
- [[OOP-vs-Procedural-In-Practice|OOP vs 절차지향 실무 (Rich Domain Model)]]
- [[JS-Value-vs-Reference|JS 원시·참조·Call by Value]]
- [[Object-Property-Descriptor|Object 프로퍼티 디스크립터·불변성]]
