---
tags: [cs, typescript, validation, zod, typia, ajv, performance]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["검증 라이브러리 성능 벤치마크", "Zod AOT Fast Path"]
---

# Runtime 검증 라이브러리 — 성능 벤치마크와 Zod AOT

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
할당, 에러 수집 없음 → V8 JIT 최적화 극대화.

### Phase 2 — Slow Path (무효 입력)

표준 에러 수집 검증으로 상세 정보 제공. 무효 빈도가 낮을 때 더욱 효율.

### 자동 변환 과정

1. 정규식 필터링으로 검증 호출 후보 찾기
2. export 검사로 스키마 객체 수집
3. IR(중간 표현) 생성
4. AST 기반 소스 교체로 원본 스키마를 래퍼로 치환

**장점**: 기존 Zod 코드에 **변경 없이** 50~60배 가속. `Object.create()` 래퍼로 원본 API 호환성 유지.
