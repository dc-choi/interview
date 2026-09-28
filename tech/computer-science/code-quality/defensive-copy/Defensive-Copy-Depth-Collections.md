---
tags: [cs, code-quality, immutability, oop]
status: done
verified_at: 2026-09-28
category: "CS - 코드 품질"
aliases: ["방어적 복사 깊이와 컬렉션", "Defensive Copy Depth"]
---

# 방어적 복사 — 복사 깊이, 컬렉션, 성능

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

1. **깊은 복사** (`structuredClone(obj)`, `lodash cloneDeep`). 단, `structuredClone`은 prototype 체인과 `#` private 요소를 복제하지 않는다(TypeScript `private` 한정자 속성은 런타임에 일반 속성이라 복제된다). 그래서 `Member` 같은 클래스 인스턴스는 prototype 메서드가 없는 일반 객체로 돌아오고, 화살표 함수 field처럼 열거 가능한 문자열 key 속성에 함수 값이 있으면(중첩 포함) `DataCloneError`를 던진다. 열거 불가능하거나 Symbol key인 속성은 복제 대상이 아니라 조용히 빠진다. 클래스 인스턴스는 생성자나 복사 메서드로 명시적으로 복사
2. **원시 타입으로 저장** (string, number로 변환)
3. **불변 자료구조 사용** (Immutable.js, `Object.freeze`)

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
- 큰 배열, 깊은 객체는 매 getter마다 복사하면 체감
- 성능 크리티컬 경로라면 **불변 자료구조**, **`readonly` 타입만**으로 충분할 수 있음

**측정 전에 최적화 금지**. 대부분 도메인에선 안전성 > 성능.

## JavaScript의 특수성

JS는 Java와 달리:
- **`Object.freeze`**: 얕은 동결. 중첩은 별도
- **`structuredClone()`**: Node 17+, 깊은 복사 표준. 내장 객체를 상속하지 않은 클래스 인스턴스는 prototype과 `#` private 요소 없이 일반 객체로 복제되고(`Map`, `Array`, `Date`, `Error` 상속은 그 내장 타입으로 복제, `Promise` 상속은 `DataCloneError`), 열거 가능한 문자열 key 속성에 함수 값이 있으면 `DataCloneError`를 던짐
- **Spread, `Object.assign`**: 얕은 복사
- **`JSON.parse(JSON.stringify(x))`**: 간단 깊은 복사지만 함수, Date, Map, Symbol 손실

## 출처

- [MDN, The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#things_that_dont_work_with_structured_clone)
- [HTML Standard, StructuredSerializeInternal](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializeinternal)
- [Node.js Documentation, Globals: structuredClone](https://nodejs.org/api/globals.html#structuredclonevalue-options)
