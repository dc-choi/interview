---
tags: [cs, typescript, validation, zod, typia, ajv, performance]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Zod Typia Ajv 동작 원리 비교", "런타임 검증 API 비교"]
---

# Runtime 검증 라이브러리 — 동작 원리와 API 비교

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

런타임 해석형이 느린 이유: 스키마를 매번 traverse. 컴파일형은 타입, 스키마를 **코드로 변환**해 CPU 사이클 최소화.

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

`.transform()`, `.refine()`, `.default()`, `.optional()` 등 풍부한 조합.

### Typia — 타입 레벨 태그

```ts
type User = {
  name: string & tags.MinLength<1> & tags.MaxLength<100>;
  email: string & tags.Format<'email'>;
  role: 'admin' | 'editor';
};

const result = typia.assert<User>(input);  // 컴파일 시 검증 함수 생성
```

타입 선언이 곧 스키마. `transform`, `refine`은 미지원.

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
