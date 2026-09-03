---
tags: [cs, typescript, validation, zod, typia, ajv, performance]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["검증 라이브러리 실무 선택 기준", "NestJS Zod 적용 팁"]
verified_at: 2026-09-03
---

# Runtime 검증 라이브러리 — 실무 선택 기준과 통합 패턴

## 실무 선택 기준

| 상황 | 추천 | 이유 |
|---|---|---|
| 기존 Zod v4.5 코드 + 성능 필요 | **Zod 내장 컴파일** | `z.compile()` 또는 `zod/compile`로 같은 스키마 API를 유지하며 측정 후 적용 |
| 타입 중심 검증 | **Typia** | TypeScript 타입에서 검증 코드를 생성, 변환기 설정 필요 |
| Set/Map 같은 JS 네이티브 타입 | **Zod, Typia** | `z.set`, `z.map`과 Typia의 네이티브 타입 검증을 쓸 수 있음 |
| JSON Schema 표준 준수 | **Ajv** | 외부 시스템 연동, OpenAPI |
| 변환, 정제가 필수 | **Zod** | `.transform()`, `.refine()` 지원 |
| 초기 도입 | **Zod** | 스키마와 타입 추론을 한 정의에서 관리 |

## tRPC, React Hook Form 통합 예

```ts
// 애플리케이션 진입점에서, 스키마 모듈보다 먼저 실행한다. Zod v4.5+
import 'zod/compile';

// tRPC
const router = t.router({
  createUser: t.procedure
    .input(UserSchema)
    .mutation(({ input }) => db.users.create(input)),
});

// React Hook Form
const { register } = useForm({
  resolver: zodResolver(UserSchema),
});
```

## Zod v4.5의 내장 컴파일

```ts
import { z } from 'zod';

const UserSchema = z.object({ id: z.string(), name: z.string() });
const CompiledUserSchema = z.compile(UserSchema);

CompiledUserSchema.parse({ id: '1', name: 'Mark' });
```

- `z.compile()` 결과는 원래 스키마와 같은 API를 사용한다.
- `import 'zod/compile'`은 이후 만들어진 스키마를 첫 parse 시 자동 컴파일한다.
- 성능 이득과 초기 컴파일 비용은 스키마, 유효/무효 입력 비율, 호출 빈도에 따라 측정한다. 비동기 refinement는 `z.validateAsync()`처럼 비동기 경로를 사용한다.

## 자주 헷갈리는 포인트

- **TS 타입 = 런타임 검증이 아님** — 타입은 컴파일 타임에 사라짐. 외부 입력은 무조건 런타임 검증
- **Ajv의 JSON Schema ≠ TS 타입** — 스키마를 별도로 관리하거나 변환 도구의 지원 범위를 검토
- **Typia는 TS 변환기 세팅 필요** — `tsc` 플러그인, 번들러 설정 전제
- **Zod `.parse()`는 throw, `.safeParse()`는 결과 객체** — 선택 명확히
- **Set/Map은 JSON 표현이 아님** — HTTP JSON 경계에서는 배열이나 객체로 변환 규칙을 먼저 정한다. Zod와 Typia는 런타임의 `Set`, `Map`을 검증할 수 있다
- **"가장 빠른 라이브러리" 고정 정답 없음** — 유효/무효 비율, 객체 크기, 타입 특성에 따라 다름

## NestJS에서 Zod 사용 팁

NestJS의 기존 Pipes 문서에는 사용자 정의 Zod Pipe 예시가 있고, 현재 Validation 문서에는 Standard Schema 호환 라이브러리를 위한 `StandardSchemaValidationPipe`도 있다. Zod v4를 직접 쓸 때는 공개 기반 타입 `ZodType`을 사용한다.

### v4에서 바뀐 점
- 현재 패키지 루트 `zod`는 Zod v4를 내보내며, 이전 호환 경로 `zod/v4`도 유지된다
- Zod v4 스키마는 Standard Schema 호환 파이프에 직접 전달할 수 있다

```ts
import { ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType) {}

  transform(value: unknown) {
    return this.schema.parse(value);  // 실패 시 ZodError
  }
}
```

### nestjs-zod 라이브러리
- DTO를 Zod 스키마로 정의 + 자동 Validation Pipe 연동
- nestjs-zod 5.x의 README상 peer 범위는 Zod `^3.25.0 || ^4.0.0`이다
- 프로젝트가 지원 범위 안의 버전을 쓰는지 확인하고 수동 Pipe와 nestjs-zod 중 팀에 맞는 통합 방식을 고른다

컴파일 성능을 적용하기 전에 프로덕션 스키마, 오류 형식, 통합 라이브러리 호환성을 함께 확인한다.

## 면접 체크포인트

- TS 타입과 **런타임 검증의 차이**
- 3가지 라이브러리(Zod, Typia, Ajv)의 **동작 원리와 차이**
- Zod v4.5의 **스키마 컴파일**과 Typia의 **타입 기반 코드 생성** 차이
- **tRPC, React Hook Form** 같은 실무 통합 패턴
- 실무 선택 기준 4~5가지
- Set/Map, transform, 무효 입력 같은 **특수 케이스별 라이브러리 강점**

## 출처

- [Zod, Zod 4.5](https://zod.dev/blog/zod-4-5)
- [Zod, Versioning](https://zod.dev/v4/versioning)
- [Zod, Maps and Sets](https://zod.dev/api#maps)
- [Typia, validate](https://typia.io/docs/validators/validate/)
- [Ajv, Getting started](https://ajv.js.org/guide/getting-started)
- [NestJS, Validation](https://docs.nestjs.com/techniques/validation)
- [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod/blob/main/README.md)
