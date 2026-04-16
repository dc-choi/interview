---
tags: [cs, typescript, validation, zod, typia, ajv, performance]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Runtime Validation Libraries", "Zod Typia Ajv", "런타임 검증"]
---

# Runtime 검증 라이브러리 — Zod · Typia · Ajv

TypeScript의 타입은 **컴파일 타임**에만 존재하므로, 외부 입력(API 요청·파일·DB·사용자)을 신뢰하려면 **런타임 검증**이 별도 필요하다. 주요 라이브러리인 Zod·Typia·Ajv는 동작 원리·성능·API가 모두 다르며, 선택이 프로젝트 성능·개발 경험을 좌우한다.

## 핵심 명제

- TS 타입은 런타임에 사라진다 → 외부 입력은 **런타임에 형상을 확인**해야 안전
- **Zod**: 런타임 해석형. API 풍부. 성능은 v4에서 개선됐지만 AOT 대비 느림
- **Typia**: 컴파일 타임에 TS 변환기가 **전용 검증 함수를 생성** → 런타임 오버헤드 최소
- **Ajv**: JSON Schema 기반. 표준성 높음. Set/Map 같은 JS 네이티브 타입 미지원
- **Zod AOT (Vite 플러그인)**: Zod 스키마를 빌드 타임에 컴파일해 50~60배 성능 향상

## 동작 원리 비교

| 라이브러리 | 검증 시점 | 구현 방식 |
|---|---|---|
| **Zod v3** | 런타임 | 스키마 트리를 매 호출마다 순회 |
| **Zod v4** | 런타임 | `new Function()`로 JIT 검증 함수 생성 |
| **Zod AOT** | 빌드 타임 | Vite 플러그인이 AST 분석 → 검증 함수 사전 생성 |
| **Typia** | 빌드 타임 | TS 변환기가 타입에서 검증 함수 생성 |
| **Ajv** | 런타임 (1회 컴파일) | JSON Schema → 검증 함수 컴파일 후 재사용 |

런타임 해석형이 느린 이유: 스키마를 매번 traverse. 컴파일형은 타입·스키마를 **코드로 변환**해 CPU 사이클 최소화.

## API 비교

### Zod — 메서드 체이닝

```ts
const User = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'editor']),
});

const result = User.parse(input);          // 실패 시 throw
const safe = User.safeParse(input);        // { success, data|error }
```

`.transform()`·`.refine()`·`.default()`·`.optional()` 등 풍부한 조합.

### Typia — 타입 레벨 태그

```ts
type User = {
  name: string & tags.MinLength<1> & tags.MaxLength<100>;
  email: string & tags.Format<'email'>;
  role: 'admin' | 'editor';
};

const result = typia.assert<User>(input);  // 컴파일 시 검증 함수 생성
```

타입 선언이 곧 스키마. `transform`·`refine`은 미지원.

### Ajv — JSON Schema

```ts
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    role: { type: 'string', enum: ['admin', 'editor'] },
  },
  required: ['name', 'email', 'role'],
};
const validate = ajv.compile(schema);       // 1회 컴파일
validate(input);                            // boolean 반환, 에러는 validate.errors
```

선언형 JSON. 조합성은 낮지만 **표준 JSON Schema 생태계**와 연동.

## 성능 벤치마크 (ops/sec 상대 비교)

| 시나리오 | Zod v3 | Zod v4 | Zod AOT | Typia | Ajv |
|---|---|---|---|---|---|
| 문자열 제약 | 8.3M | 5.6M | **10.6M** | 10.5M | 8.8M |
| 중간 객체 (유효) | 1.3M | 1.7M | 5.2M | **7.0M** | 4.8M |
| 중간 객체 (무효) | 365K | 63K | 471K | 2.1M | **4.7M** |
| 100 항목 대형 객체 | 8.6K | 11.6K | 627K | **808K** | 89K |
| Set(20개) | 980K | 461K | **7.6M** | — | — |

**관찰**:
- 원시형은 AOT 계열이 V8 한계까지 수렴 (~10.5M)
- 객체가 커질수록 AOT vs 런타임 해석형의 격차 급증 (최대 70배 이상)
- Typia가 객체 검증에서 약간 앞섬
- Zod AOT만 **Set/Map 네이티브 지원**
- Ajv는 **무효 입력 처리**가 빠름 (간결한 에러 포맷)

## Zod AOT (Vite 플러그인)의 Fast Path

Zod AOT는 2단계 검증으로 최적 성능 달성.

### Phase 1 — Fast Path (유효 입력 대부분)

단일 불린 표현식 체인으로 조기 반환:
```
typeof input === 'object' && input !== null && typeof input.name === 'string'
  && input.name.length >= 1 && input.name.length <= 100 && ...
```
할당·에러 수집 없음 → V8 JIT 최적화 극대화.

### Phase 2 — Slow Path (무효 입력)

표준 에러 수집 검증으로 상세 정보 제공. 무효 빈도가 낮을 때 더욱 효율.

### 자동 변환 과정

1. 정규식 필터링으로 검증 호출 후보 찾기
2. export 검사로 스키마 객체 수집
3. IR(중간 표현) 생성
4. AST 기반 소스 교체로 원본 스키마를 래퍼로 치환

**장점**: 기존 Zod 코드에 **변경 없이** 50~60배 가속. `Object.create()` 래퍼로 원본 API 호환성 유지.

## 실무 선택 기준

| 상황 | 추천 | 이유 |
|---|---|---|
| 기존 Zod 코드 + 성능 필요 | **Zod AOT** | 코드 변경 0, 큰 성능 개선 |
| 최고 성능 · 타입 중심 | **Typia** | 컴파일 타임 검증, 객체 성능 최강 |
| Set/Map 같은 JS 네이티브 타입 | **Zod AOT** | 유일 지원 |
| JSON Schema 표준 준수 | **Ajv** | 외부 시스템 연동·OpenAPI |
| 변환·정제가 필수 | **Zod / Zod AOT** | `.transform()`·`.refine()` 지원 |
| 무효 입력이 다수 | **Ajv** | 에러 처리 효율 |
| 초기 진입·팀 학습 쉬움 | **Zod** | 생태계·문서 가장 풍부 |

## tRPC · React Hook Form 통합 예

```ts
// tRPC (Zod + Zod AOT 자동 최적화)
const router = t.router({
  createUser: t.procedure
    .input(UserSchema)              // ← 자동 AOT 컴파일
    .mutation(({ input }) => db.users.create(input)),
});

// React Hook Form
const { register } = useForm({
  resolver: zodResolver(UserSchema),   // AOT 컴파일된 스키마
});
```

## `check` 명령으로 AOT 커버리지 진단

```bash
npx zod-aot check src/schemas.ts --fail-under 80 --json
```

- 컴파일 가능한 스키마 비율
- Fast Path 적합성
- 폴백 발생 지점 (transform·refine 사용)
- CI 통합용 JSON 출력

## 자주 헷갈리는 포인트

- **TS 타입 = 런타임 검증이 아님** — 타입은 컴파일 타임에 사라짐. 외부 입력은 무조건 런타임 검증
- **Ajv의 JSON Schema ≠ TS 타입** — 자동 변환 도구(json-schema-to-typescript) 필요
- **Typia는 TS 변환기 세팅 필요** — `tsc` 플러그인·번들러 설정 전제
- **Zod `.parse()`는 throw, `.safeParse()`는 결과 객체** — 선택 명확히
- **AOT는 만능 아님** — `.transform()`이 있으면 AOT 못하고 런타임 fallback
- **Set/Map을 JSON으로 표현 불가** — Ajv·Typia는 이 타입 지원 제한. Zod AOT만 네이티브
- **"가장 빠른 라이브러리" 고정 정답 없음** — 유효/무효 비율·객체 크기·타입 특성에 따라 다름

## 면접 체크포인트

- TS 타입과 **런타임 검증의 차이**
- 4가지 라이브러리(Zod·Zod AOT·Typia·Ajv)의 **동작 원리와 차이**
- **컴파일 타임 검증 생성**이 왜 런타임보다 훨씬 빠른가
- **Zod AOT의 2단계 검증(Fast/Slow Path)** 원리
- **tRPC·React Hook Form** 같은 실무 통합 패턴
- 실무 선택 기준 4~5가지
- Set/Map·transform·무효 입력 같은 **특수 케이스별 라이브러리 강점**

## 출처
- [dev.to @wakita181009 — Zod vs Typia vs Ajv, Vite 플러그인](https://dev.to/wakita181009/zod-vs-typia-vs-ajv-i-built-a-vite-plugin-that-makes-zod-60x-faster-with-zero-code-changes-1poc)

## 관련 문서
- [[TypeScript-AST|TypeScript와 AST (컴파일러 파이프라인)]]
- [[tech/computer-science/ts/타입스크립트(TS)|타입스크립트]]
- [[Types-As-Proofs|Types as Proofs]]
- [[Railway-Oriented-Programming|Railway-Oriented Programming]]
