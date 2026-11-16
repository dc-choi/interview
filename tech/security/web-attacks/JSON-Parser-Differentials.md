---
tags: [security, json, parser, go, interoperability]
status: done
verified_at: 2026-11-17
category: "Security - 웹 공격"
aliases: ["JSON Parser Differentials", "JSON 파서 해석 차이", "JSON 중복 키 공격", "Go encoding/json v2"]
---

# JSON 파서의 해석 차이와 엄격한 디코딩

같은 JSON 바이트열을 두 컴포넌트가 다르게 읽으면, 검사한 값과 실제로 쓰이는 값이 달라진다. 권한 검사는 게이트웨이나 검증 함수에서, 저장과 이후 인가는 다른 언어의 파서에서 하는 구조에서 특히 위험하다. 구조는 [[Archive-Parser-Differentials|아카이브 파서 해석 차이]]와 같고, 대상만 JSON 객체다.

## 해석이 갈리는 지점

RFC 8259는 객체 안 이름이 유일해야 한다고 `SHOULD`로만 정한다. 그래서 중복 이름을 만난 파서의 행동은 구현마다 다르다. 언어별 처리의 일반론은 [[Java-IO-Serialization-and-Data-Formats|Java 직렬화와 데이터 형식]]의 JSON 절에 있다.

| 입력의 모호성 | 갈리는 행동 | 생길 수 있는 결과 |
|---|---|---|
| 같은 이름이 두 번 | 앞의 값, 뒤의 값, 오류 | 검사와 사용이 서로 다른 값을 봄 |
| 대소문자만 다른 이름 | 정확히 일치만 인정, 대소문자 무시 | 한쪽에서만 같은 필드로 합쳐져 사실상 중복 이름이 됨 |
| 잘못된 UTF-8 | 대체 문자로 바꿈, 오류 | 서명이나 해시 대상과 해석한 문자열이 달라짐 |
| 모르는 필드 | 무시, 오류 | 한쪽만 아는 필드가 조용히 통과 |
| 큰 정수 | 정확히 보존, 부동소수로 반올림 | ID나 금액이 컴포넌트마다 다름 |

## 사례: CouchDB 권한 상승 (CVE-2017-12635)

CouchDB 1.7.0 이전과 2.x의 2.1.1 이전에서, `_users` 문서의 쓰기 검증은 JavaScript 기반 파서가, 내부 접근 함수는 Erlang 기반 파서가 읽었다. JavaScript는 중복 키 중 마지막 값을, Erlang 쪽 접근 함수는 첫 값을 골랐다.

- 공격자가 `roles` 키를 두 번 넣는다.
- 쓰기 승인에는 두 번째 `roles`가 쓰인다. 사용자가 스스로 역할을 줄 수 없게 하는 검사가 여기서 통과한다.
- 이후 요청의 인가에는 첫 번째 `roles`가 쓰인다. 첫 번째에 `_admin`을 넣었다면 관리자 권한을 얻는다.

수정은 Erlang 파서도 마지막 키를 고르도록 맞춘 것이다. 해법이 거부가 아니라 일치였다는 점에 주의한다. 같은 시스템 안 파서끼리는 같은 규칙을 쓰는 것이 최소 조건이고, 외부 입력에는 중복 자체를 거부하는 편이 더 안전하다(적용 제안).

## Go `encoding/json` v1과 v2

Go 1.27에서 `encoding/json/v2`와 `encoding/json/jsontext`가 정식 패키지가 됐다. v1은 호환성 약속 때문에 기본 동작을 바꿀 수 없어 새 메이저 버전을 옆에 두었다. v2 작업은 정식화까지 약 6년이 걸렸고 상당 부분을 Google 밖의 기여자가 만들었다.

| 동작 | v1 `encoding/json` | v2 `encoding/json/v2` (기본값) | v2에서 바꾸는 옵션 |
|---|---|---|---|
| 필드 이름 매칭 | 정확한 일치를 우선하되 대소문자 무시 매칭도 받음 | 대소문자 구분 | `MatchCaseInsensitiveNames`, 필드 태그 `case:ignore` |
| 중복 이름 | 허용 | 오류 | `jsontext.AllowDuplicateNames` |
| 잘못된 UTF-8 | 대체 문자(U+FFFD)로 조용히 바꿈 | 오류 | `jsontext.AllowInvalidUTF8` |
| nil slice 마샬링 | `null` | `[]` (nil map은 `{}`) | `FormatNilSliceAsNull`, `FormatNilMapAsNull` |

v2 문서는 대소문자 무시 매칭이 중복 이름이 생기는 또 다른 경로라고 설명한다. `role`과 `Role`이 v1에서는 같은 필드로 들어가지만 대소문자를 구분하는 다른 언어 파서에서는 별개의 키다.

### 성능과 마이그레이션

- **v1도 새 엔진 위에서 돈다.** Go 1.27의 v1은 v2를 v1 호환 옵션 전체(`DefaultOptionsV1`)로 호출하는 방식으로 구현된다. 마샬링과 언마샬링 동작은 보존되지만 오류 메시지 문구는 달라질 수 있다. `GOEXPERIMENT=nojsonv2`로 예전 구현으로 되돌릴 수 있으며, 이 선택지는 이후 릴리스에서 제거될 예정이다.
- **언마샬링이 빨라졌다.** Go 블로그의 v2 대 기존 v1 벤치마크에서 마샬링은 대체로 비슷하고 언마샬링은 최대 10배 개선을 보였다. 새 엔진 위의 v1에 대해 릴리스 노트는 언마샬링이 상당히 빨라졌다고만 쓴다. v1을 그대로 써도 Go 1.27로 올리면 언마샬링 속도는 좋아질 수 있지만, 느슨한 매칭 규칙은 그대로다.
- **엄격한 규칙은 import를 바꿔야 얻는다.** 위험이 낮은 첫 단계는 모든 호출을 v2로 옮기되 `DefaultOptionsV1`을 넘겨 동작을 유지하는 것이다. 그다음 옵션을 하나씩 v2 기본값으로 바꾸며 테스트한다.

```go
import (
	"encoding/json"
	jsonv2 "encoding/json/v2"
)

var u User
// 1단계: v2 API, v1 동작 유지
err := jsonv2.Unmarshal(data, &u, json.DefaultOptionsV1())
// 2단계: 기본값(대소문자 구분, 중복 이름과 잘못된 UTF-8 거부)
err = jsonv2.Unmarshal(data, &u)
```

## 방어 설계

1. **신뢰 경계에서 한 번, 엄격하게 파싱한다.** 중복 이름, 잘못된 UTF-8, 모르는 필드를 경계에서 거부하고, 이후 컴포넌트에는 다시 직렬화한 정규형만 넘긴다(적용 제안).
2. **검사와 사용이 같은 파싱 결과를 쓰게 한다.** 원문 바이트를 다시 파싱하는 경로가 있으면 차이가 다시 생긴다.
3. **이기종 구성의 파서를 목록으로 관리한다.** 게이트웨이, 서비스 언어, DB의 JSON 함수가 중복 이름과 대소문자를 어떻게 처리하는지 표로 남긴다.
4. **차이 테스트를 둔다.** 중복 키, 대소문자만 다른 키, 잘못된 UTF-8, 큰 정수를 각 컴포넌트에 넣어 결과를 비교한다.

## 면접 체크포인트

- 중복 키 하나로 권한 검사를 우회할 수 있는 이유를 검사와 사용의 분리로 설명할 수 있는가
- Go 1.27로 올리기만 해도 v1 코드의 보안 동작이 바뀌지 않는 이유를 말할 수 있는가
- 같은 시스템의 파서를 일치시키는 해법과 입력을 거부하는 해법의 차이를 설명할 수 있는가

## 출처

- [A new Go API for JSON — The Go Blog, Michael Pratt 외](https://go.dev/blog/jsonv2) — 2026-11-04 게시, 2026-11-17 대조
- [Go, Go 1.27 Release Notes](https://go.dev/doc/go1.27)
- [Go, encoding/json/v2 Migration Guide](https://go.dev/doc/jsonv2-migration)
- [Go Packages, encoding/json/v2](https://pkg.go.dev/encoding/json/v2) — 2026-11-17 go1.27.4 문서 기준
- [Go Packages, encoding/json](https://pkg.go.dev/encoding/json) — 2026-11-17 go1.27.4 문서 기준
- [Apache CouchDB CVE-2017-12635 and CVE-2017-12636 — The Apache CouchDB Blog](https://blog.couchdb.org/2017/11/14/apache-couchdb-cve-2017-12635-and-cve-2017-12636/)
- [CVE, CVE-2017-12635](https://www.cve.org/CVERecord?id=CVE-2017-12635)
- [IETF, RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259)

## 관련 문서

- [[Archive-Parser-Differentials|아카이브 파서 해석 차이]]
- [[Java-IO-Serialization-and-Data-Formats|Java 직렬화와 데이터 형식]]
- [[IDOR|IDOR와 접근 제어]]
