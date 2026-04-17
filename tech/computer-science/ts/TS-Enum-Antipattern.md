---
tags: [cs, typescript, enum, antipattern]
status: done
category: "CS - TypeScript"
aliases: ["TS Enum", "TypeScript Enum Antipattern"]
---

# TypeScript enum — 쓰지 말아야 할 이유와 대안

TS의 `enum`은 처음 배울 땐 "Java처럼 타입 안전한 상수 모음"으로 보이지만, 실제론 **JS로 컴파일되는 과정에서 예상치 못한 부작용**을 낳는다. `as const` 객체·Union Type이 대부분 상황에서 더 낫다.

## enum의 4가지 문제

### 1. 런타임 JS로 변환되면서 양방향 매핑이 남음
숫자형 enum은 컴파일 결과에서 `{0: 'ADMIN', ADMIN: 0}` 양방향 맵 생성.
```
enum Role { ADMIN, USER }
// → { 0: 'ADMIN', 1: 'USER', ADMIN: 0, USER: 1 }
```
`Object.values(Role)`이 숫자·문자열 모두 반환 → 순회 로직 버그.

해결책: 문자열 enum (`Role.ADMIN = 'ADMIN'`) 또는 `const enum` — 하지만 const enum은 babel·isolatedModules와 호환 문제.

### 2. 리터럴로 직접 쓸 수 없음
```
function setRole(r: Role) { ... }
setRole('ADMIN');     // ❌ 에러
setRole(Role.ADMIN);  // ✅ OK
```
외부 API·JSON에서 온 문자열을 그대로 못 씀. **항상 enum 값으로 변환** 필요 → 쓸모없는 wrapping.

### 3. Tree-Shaking 방해
enum은 **IIFE로 컴파일** → 번들러가 죽은 코드 제거 어려움. 100개 값 중 1개만 써도 100개 모두 번들에 포함.

### 4. 런타임 객체가 생성됨
타입만 쓰고 싶은데 **JS 런타임에 실제 객체**가 살아 있음. 순수 타입 개념을 원할 땐 타입 시스템 밖으로 새는 것.

## 대안 1: `as const` 객체 (권장)

```
const Role = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

type Role = typeof Role[keyof typeof Role];
// "ADMIN" | "USER"
```

**장점**:
- 런타임이 **평범한 객체** — 양방향 매핑 없음
- 값을 **리터럴 그대로 사용 가능** (`'ADMIN'`)
- **Tree-shaking 친화적** (단순 객체 프로퍼티)
- 타입 추론이 정확히 `'ADMIN' | 'USER'`

**단점**: 타입 정의를 **별도로 추출**해야 함 (`type Role = ...`). enum처럼 이름과 타입이 자동으로 같은 이름으로 묶이진 않음.

## 대안 2: Union Type

```
type Role = 'ADMIN' | 'USER';
```

**장점**:
- 가장 단순·가벼움
- 런타임 코드 0

**단점**:
- 순회·역탐색 불가 (런타임 값 없음)
- 값 추가 시 여러 곳 수정

## enum을 써도 OK인 경우 (드묾)

- 순수 내부 코드 (외부 API·JSON 교환 없음)
- 번들 크기에 민감하지 않은 Node.js 백엔드
- `const enum`을 쓰되 빌드 체인이 지원

실무에선 **대부분 `as const` 객체가 더 나은 선택**.

## 비교 요약

| 요소 | `enum` | `as const` 객체 | Union Type |
|---|---|---|---|
| 런타임 객체 | ✅ (양방향 map) | ✅ (단순 객체) | ✗ |
| 리터럴 사용 | ✗ | ✅ | ✅ |
| Tree-shaking | ✗ (IIFE) | ✅ | N/A |
| 순회 가능 | 버그 있음 | ✅ | ✗ |
| 타입 선언 | 자동 | 수동(typeof+keyof) | 자동 |

## 면접 체크포인트

- enum이 JS로 컴파일될 때 생기는 양방향 매핑
- enum 값이 tree-shaking되지 않는 이유 (IIFE)
- `as const` 객체 + `typeof + keyof` 패턴으로 enum 대체
- Union Type vs `as const` 선택 기준
- `const enum`의 호환성 문제

## 출처
- [velog @miinhho — TypeScript의 enum은 악마일까](https://velog.io/@miinhho/TypeScript-%EC%9D%98-enum-%EC%9D%80-%EC%95%85%EB%A7%88%EC%9D%BC%EA%B9%8C)
- [Techeer — TypeScript enum 타입 사용해도 될까](https://blog.techeer.net/typescript-enum-%ED%83%80%EC%9E%85-%EC%82%AC%EC%9A%A9%ED%95%B4%EB%8F%84-%EB%90%A0%EA%B9%8C-b73ea380d61d)

## 관련 문서
- [[Types-As-Proofs|Types as Proofs]]
- [[MySQL-Enum-Antipattern|MySQL ENUM 안티패턴 (DB 측면)]]
- [[TypeScript-AST|TypeScript 컴파일 파이프라인]]
