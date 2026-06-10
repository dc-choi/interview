---
tags: [web, http, api, convention]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["API 시간 포맷", "JSON 키 네이밍"]
---

# API 컨벤션 — 시간, 네이밍, URI

## 시간 (Timestamp)

### 저장 형식
- **UTC로 저장** — 타임존 혼재의 근원 차단. DB는 `TIMESTAMP WITH TIME ZONE` 또는 UTC `DATETIME` 명시
- 로컬 시간 저장 금지 — 서버 이전, 멀티 리전 시 치명적

### API 전송 형식
- **ISO 8601** 권장 — `2026-04-17T17:00:00.000Z`
- `Z`가 UTC임을 명시 → 타임존 문서화 불필요
- 소수점 밀리초 포함 — 정렬, 정확성

```
✅ "2026-04-17T17:00:00.000Z"
❌ "2026-04-17 17:00:00"        (타임존 불명)
❌ "1745506800000"               (Unix timestamp — 사람이 못 읽음)
❌ "4/17/2026"                   (로컬 포맷, 모호)
```

### 특수 상황
- **생년월일, 공휴일** 같은 "날짜만" 값: `YYYY-MM-DD` (타임존 없음)
- **이벤트 시각 + 사용자 타임존**: UTC + 별도 `timezone` 필드

## JSON 키 네이밍

| 스타일 | 예 | 쓰는 곳 |
|---|---|---|
| **camelCase** | `firstName`, `createdAt` | **권장** — JS, Java, Kotlin, Swift 모두 익숙 |
| snake_case | `first_name`, `created_at` | Python, Ruby 생태계, 일부 구식 API |
| PascalCase | `FirstName` | C# 생태계 일부 |
| kebab-case | `first-name` | JS 변수로 불가 → 헤더, URL에만 |

팀에서 **하나로 통일**. camelCase가 프론트, 모바일과 자연스럽게 맞물려 가장 일반적.

## URI 컨벤션 (REST 기반)

```
/users                   ← 컬렉션, 복수형
/users/{id}              ← 개별, 경로 파라미터
/users/{id}/comments     ← 계층 최대 1단계
/users?role=admin        ← 필터는 쿼리스트링
/users?sort=-createdAt   ← 정렬 `-` 접두사로 내림차순
```

세부는 [[REST#URI 설계 규칙|REST URI 설계]] 참고.
