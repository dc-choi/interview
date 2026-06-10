---
tags: [cs, typescript, validation, zod, typia, ajv, performance]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["검증 라이브러리 실무 선택 기준", "NestJS Zod 적용 팁"]
---

# Runtime 검증 라이브러리 — 실무 선택 기준과 통합 패턴

## 실무 선택 기준

| 상황 | 추천 | 이유 |
|---|---|---|
| 기존 Zod 코드 + 성능 필요 | **Zod AOT** | 코드 변경 0, 큰 성능 개선 |
| 최고 성능, 타입 중심 | **Typia** | 컴파일 타임 검증, 객체 성능 최강 |
| Set/Map 같은 JS 네이티브 타입 | **Zod AOT** | 유일 지원 |
| JSON Schema 표준 준수 | **Ajv** | 외부 시스템 연동, OpenAPI |
| 변환, 정제가 필수 | **Zod / Zod AOT** | `.transform()`, `.refine()` 지원 |
| 무효 입력이 다수 | **Ajv** | 에러 처리 효율 |
| 초기 진입, 팀 학습 쉬움 | **Zod** | 생태계, 문서 가장 풍부 |

## tRPC, React Hook Form 통합 예

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
- 폴백 발생 지점 (transform, refine 사용)
- CI 통합용 JSON 출력

## 자주 헷갈리는 포인트

- **TS 타입 = 런타임 검증이 아님** — 타입은 컴파일 타임에 사라짐. 외부 입력은 무조건 런타임 검증
- **Ajv의 JSON Schema ≠ TS 타입** — 자동 변환 도구(json-schema-to-typescript) 필요
- **Typia는 TS 변환기 세팅 필요** — `tsc` 플러그인, 번들러 설정 전제
- **Zod `.parse()`는 throw, `.safeParse()`는 결과 객체** — 선택 명확히
- **AOT는 만능 아님** — `.transform()`이 있으면 AOT 못하고 런타임 fallback
- **Set/Map을 JSON으로 표현 불가** — Ajv, Typia는 이 타입 지원 제한. Zod AOT만 네이티브
- **"가장 빠른 라이브러리" 고정 정답 없음** — 유효/무효 비율, 객체 크기, 타입 특성에 따라 다름

## NestJS에서 Zod 사용 팁

NestJS 공식 문서의 Zod Validation Pipe 예시는 **구버전 기준**. Zod v4에서 깨지는 부분 정리:

### v4에서 바뀐 점
- `ZodSchema` 타입은 **deprecated** → `ZodType`으로 교체
- 모듈 경로는 `'zod/v4'` (v3와 병행 설치 지원)

```ts
import { ZodType } from 'zod/v4';

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
- 단, **Zod v4 대응이 늦음** — 최신 Zod 쓰려면 수동 구성, 편의 우선이면 nestjs-zod + Zod v3 유지
- 라이브러리 업데이트 시점까지 수동 Pipe 쓰는 게 안전

v4의 성능 개선(파싱 속도 향상)이 탐나도, 프로덕션에선 **라이브러리 호환성, 안정성을 우선**하는 게 일반적.

## 면접 체크포인트

- TS 타입과 **런타임 검증의 차이**
- 4가지 라이브러리(Zod, Zod AOT, Typia, Ajv)의 **동작 원리와 차이**
- **컴파일 타임 검증 생성**이 왜 런타임보다 훨씬 빠른가
- **Zod AOT의 2단계 검증(Fast/Slow Path)** 원리
- **tRPC, React Hook Form** 같은 실무 통합 패턴
- 실무 선택 기준 4~5가지
- Set/Map, transform, 무효 입력 같은 **특수 케이스별 라이브러리 강점**
