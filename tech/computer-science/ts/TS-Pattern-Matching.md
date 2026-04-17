---
tags: [cs, typescript, pattern-matching, discriminated-union]
status: done
category: "CS - TypeScript"
aliases: ["TS Pattern", "TS Pattern Matching"]
---

# TypeScript 패턴 매칭 (ts-pattern)

`ts-pattern`은 **"더 멋진 if문"이 아니다**. 단순 분기를 대체하는 용도면 성능 손해 + 가독성 낮아질 뿐. 진짜 가치는 **Discriminated Union의 exhaustive 체크**와 **중첩 객체 구조 매칭**에 있다. 도구 선택 기준을 명확히 하지 않으면 "JS 기본 if·switch보다 느리네"로 끝남.

## ts-pattern이 안 맞는 경우

### 단순 if/else 대체
```ts
// ❌ 과설계
match(role)
  .with('admin', () => '관리자')
  .with('user',  () => '사용자')
  .exhaustive();

// ✅ 그냥 삼항이 낫다
role === 'admin' ? '관리자' : '사용자';
```

**벤치마크**: ts-pattern은 JS 네이티브 switch·if 대비 약 **99% 느림** (10억 ops/s vs 1.3억 ops/s). 핫 경로에서 단순 분기에 쓰면 성능 낭비.

### 작은 switch
```ts
switch (status) {
  case 'pending': return ...;
  case 'paid':    return ...;
  case 'failed':  return ...;
}
```
이건 JS switch가 충분. `ts-pattern` 필요 없음.

## ts-pattern이 진짜 빛나는 경우

### Discriminated Union + exhaustive 보장
```ts
type Event =
  | { type: 'click'; x: number; y: number }
  | { type: 'key'; code: string }
  | { type: 'scroll'; delta: number };

function handle(e: Event): string {
  return match(e)
    .with({ type: 'click' }, ({ x, y }) => `click@${x},${y}`)
    .with({ type: 'key' },   ({ code }) => `key=${code}`)
    .with({ type: 'scroll' }, ({ delta }) => `scroll=${delta}`)
    .exhaustive();   // ← 여기가 핵심
}
```

`.exhaustive()` 덕분에 새 event type 추가 시 **컴파일 에러**로 "처리 안 된 case 있음" 알림. 휴먼 에러 차단.

### JS 네이티브로 exhaustive 체크
`ts-pattern` 없어도 가능:
```ts
function handle(e: Event): string {
  switch (e.type) {
    case 'click': return `click`;
    case 'key':   return `key`;
    case 'scroll': return `scroll`;
    default:
      const _: never = e;   // ← 여기서 타입 에러면 case 누락
      throw new Error();
  }
}
```

`_: never` 패턴으로 exhaustive 강제 가능. **라이브러리 의존 없이** 같은 안전성.

### 중첩 패턴 매칭
```ts
match(response)
  .with({ status: 'success', data: { type: 'user', role: 'admin' } }, () => ...)
  .with({ status: 'success', data: { type: 'user', role: 'guest' } }, () => ...)
  .with({ status: 'error', code: P.number.gte(500) }, () => ...)
  .otherwise(() => ...);
```

중첩 구조·조건·범위 체크를 **선언적으로** 표현. JS switch로는 여러 중첩 if 조합이 필요 → 가독성 대폭 향상.

이게 ts-pattern의 진짜 이득. 평면 분기면 JS가 낫고, 구조적 매칭이 복잡해지면 ts-pattern이 이김.

## Discriminated Union 기본

ts-pattern과 exhaustive 체크의 기반.

```ts
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function handle<T>(r: Result<T>) {
  if (r.ok) {
    // r은 { ok: true, data: T }로 좁혀짐
    return r.data;
  } else {
    return r.error;
  }
}
```

- **공통 판별자 필드**(`ok`·`type`·`kind`) 로 분기
- TS 컴파일러가 **자동 좁히기(narrowing)**
- 모든 case 처리 안 하면 `never` 체크로 잡힘

## 선택 가이드

| 상황 | 도구 |
|---|---|
| 단순 boolean / 2~3개 enum | **if·삼항** |
| 값 기반 분기 5~10개 | **switch** + `never` exhaustive |
| 중첩 구조 매칭·범위 조건 | **ts-pattern** |
| JSX 안의 조건 렌더링 | 커스텀 `SwitchCase` 컴포넌트 또는 삼항 |
| 성능 크리티컬한 핫 경로 | **JS 네이티브** (if·switch) |

## JSX에서의 분기

React 등에서 JSX 안 조건 렌더링은 자주 등장. 옵션:

```tsx
// ❌ 삼항 중첩
{status === 'loading' ? <Spin /> :
 status === 'error'   ? <Err /> :
 status === 'done'    ? <View /> : null}

// 선언적 switch 컴포넌트
<SwitchCase value={status}>
  <Case when="loading"><Spin /></Case>
  <Case when="error"><Err /></Case>
  <Case when="done"><View /></Case>
</SwitchCase>

// ts-pattern
{match(status)
  .with('loading', () => <Spin />)
  .with('error',   () => <Err />)
  .with('done',    () => <View />)
  .exhaustive()}
```

렌더링 성능 벤치마크는 표면적 ops/sec와 다르게 나옴 — React 리렌더링 컨텍스트에선 **차이가 거의 없음**. 가독성·유지보수성 기준으로 팀 합의.

## 흔한 실수

- **모든 if/else를 ts-pattern으로** → 번들 크기·학습 비용 폭증
- **`.otherwise()` 남발** → 타입 안전성 포기. 가급적 `.exhaustive()`
- **discriminator 없는 Union에 매칭 시도** → 컴파일러가 좁히기 못 함. 항상 `type`·`kind` 같은 판별자 필드
- **벤치마크만 보고 거부** → 렌더링 성능과 ops/sec는 다름. 실제 context 측정 후 판단

## 면접 체크포인트

- ts-pattern이 "더 나은 if문"이 아닌 이유
- Discriminated Union의 exhaustive 체크 가치
- `never` 패턴으로 라이브러리 없이 exhaustive 강제
- 중첩 패턴 매칭이 ts-pattern의 진짜 가치
- 성능 벤치마크가 실무 의사결정의 전부가 아닌 이유
- 도구 선택 기준 (단순 분기·중첩 매칭·JSX)

## 출처
- [Toss Tech — ts-pattern은 더 멋진 if문이 아니다](https://toss.tech/article/ts-pattern-usage)

## 관련 문서
- [[Types-As-Proofs|Types as Proofs (exhaustive check)]]
- [[TypeScript-Type-Level-Programming|타입 레벨 프로그래밍]]
- [[Railway-Oriented-Programming|Railway-Oriented (Result·Discriminated Union)]]
