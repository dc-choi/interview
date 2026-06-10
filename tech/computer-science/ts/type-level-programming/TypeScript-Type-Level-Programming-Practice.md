---
tags: [cs, typescript, type-system, type-level]
status: done
category: "CS - TypeScript"
aliases: ["타입 레벨 프로그래밍 실용", "타입 레벨 함정과 면접 체크포인트"]
---

# TypeScript 타입 레벨 프로그래밍 — 실용 예시와 함정

## 실용 예시: API 응답 타입 검증

```
type ApiResponse<T> = 
  | { ok: true; data: T }
  | { ok: false; error: string }

type Unwrap<R> = R extends { ok: true; data: infer D } ? D : never

type User = Unwrap<ApiResponse<{ id: number }>>   // { id: number }
```

타입 수준에서 응답을 **"성공 데이터만 추출"** 하는 유틸리티.

## 실용 예시: 라우터 타입

```
type ExtractParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : Path extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {}

type Params = ExtractParams<'/users/:id/posts/:postId'>
// { id: string; postId: string }
```

Express, React Router 경로 문자열에서 **파라미터 타입 자동 추출**. 실제로 라이브러리(hono, ts-rest)가 이런 방식으로 엔드-투-엔드 타입 안전성 제공.

## 흔한 함정

### 재귀 깊이
```
type Build<N extends number, Acc extends any[] = []> =
  Acc['length'] extends N ? Acc : Build<N, [...Acc, any]>

type X = Build<1000, []>   // "Type instantiation is excessively deep"
```
100 근처가 실용 한계.

### `any`와 동등성
`Equal<T, U>`를 완벽히 구현하기 어려움. `any`가 모든 타입과 동시에 같고 다름 → 엣지 케이스.

### 성능
복잡한 타입 계산은 **IDE 반응 속도** 저하. 라이브러리 작성자가 아니면 적당히.

## 언제 쓰는가

- **라이브러리, 프레임워크 API** 설계 — 엔드유저에게 타입 안전성 제공
- **코드 생성 대체** — 타입으로 검증, 변환을 표현
- **API 경로, 스키마 타입화** — 문자열 기반 DSL의 타입 안전성

애플리케이션 코드 대부분은 **기본 타입 + Generic + 조건부** 정도로 충분. 과용하면 코드 읽는 사람이 타입 해독에 시간 소모.

## 면접 체크포인트

- TypeScript 타입 시스템이 튜링 완전하다는 의미
- Distributive Conditional Type의 동작 방식
- `infer` 키워드의 패턴 매칭 역할
- Mapped Type으로 `Partial`, `Readonly`, `Pick` 구현
- Template Literal Types의 실용 예
- 재귀 조건부 타입의 한계 (깊이, 성능)
