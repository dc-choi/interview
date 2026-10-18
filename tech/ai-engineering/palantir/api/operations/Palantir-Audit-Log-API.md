---
tags: [palantir, foundry, api, audit, observability]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 감사 로그 API"]
---

# 감사 로그 파일 목록과 본문 수집

Audit API는 조직의 로그 파일 목록을 조회한 다음 파일 ID로 내용을 받는 두 단계다. 목록 응답 자체가 개별 audit event의 본문은 아니다. 조직 RID, 파일 ID와 실제 내려받은 파일의 수집 상태를 구별한다.

## 조직 범위의 목록 요청

`GET /api/v2/audit/organizations/{organizationRid}/logFiles`는 `data`에 파일 ID 목록, 추가 페이지가 있으면 `nextPageToken`을 반환한다. OAuth2 operation scope는 `api:audit-read`다. scope와 해당 조직의 감사 자료를 읽을 실제 권한은 함께 확인한다.

| 인자 | 계약 |
|---|---|
| `organizationRid` | 필수 path parameter |
| `startDate` | 첫 요청에서 pageToken이 없으면 필수 |
| `endDate` | 포함 경계의 마지막 날짜, 생략 시 종료 날짜 없음 |
| `pageSize` | 요청한 페이지 크기, 실제 응답 수와 다를 수 있음 |
| `pageToken` | 첫 요청은 생략, 후속 요청은 이전 nextPageToken 사용 |

schema에서 `startDate.required`가 false인 이유는 후속 pageToken 요청에서 생략할 수 있기 때문이다. 전체 선택 인자로 해석하고 최초 요청에서도 빼면 `MissingStartDate`가 발생한다. 필드의 required flag와 설명에 있는 조건부 필수 규칙을 함께 읽어야 한다.

`endDate`를 생략하면 반환 token으로 이후의 새 로그를 계속 polling할 수 있다. 일반 paging의 token은 단기 순차 사용을 위한 값이므로 장기 재시작의 영구 checkpoint라는 보장으로 확대하지 않는다. 수집 재개 범위와 이미 받은 파일을 추적하는 방식은 연동 측에서 정한다. 이는 두 계약을 함께 적용한 운영 설계다.

목록의 실제 건수가 pageSize보다 작아도 `nextPageToken`이 있으면 다음 페이지를 조회한다. 응답의 `data`와 token은 optional schema이므로 field 존재만을 고정적으로 전제하지 않는다. endpoint가 반환한 continuation 상태에 따라 종료/계속을 판단한다.

## 파일 내용을 별도로 받는다

`GET /api/v2/audit/organizations/{organizationRid}/logFiles/{logFileId}/content`는 같은 `api:audit-read` scope를 요구한다. organizationRid와 logFileId 모두 필수이고 별도 query parameter나 request body는 없다.

반환 body는 binary format이다. JSON 객체로 강제 파싱하는 공통 HTTP wrapper를 그대로 적용하지 않는다. 이 endpoint 명세는 파일 내부 event schema, 압축 형식이나 다운로드 이후의 검증 방식을 확정하지 않으므로 이름만으로 특정 포맷을 가정하지 않는다.

목록 조회와 파일 내려받기는 별도 요청이다. 파일 ID를 발견한 사실을 본문 수집 완료로 기록하지 않는다. 연동 설계에서는 파일 ID, 다운로드 결과와 후속 파싱/적재 결과를 나누어 추적한다. 마지막 항목은 수집 파이프라인의 점검이며 API가 적재까지 수행한다는 뜻은 아니다.

## 오류를 단계별로 처리한다

- `ListLogFilesPermissionDenied`: token의 감사 파일 목록 권한을 확인한다.
- `MissingStartDate`: 최초 요청의 조건부 필수 인자를 채운다.
- `GetLogFileContentPermissionDenied`: 해당 조직/파일을 내려받을 권한을 확인한다. 오류 문맥에 organizationRid와 logFileId가 제공된다.
- 인증, throttling과 body 없는 오류는 [[Palantir-API-Client-Contract]]의 공통 처리를 따른다.

이 기록은 공식 endpoint 명세를 대조한 결과이며 조직의 실제 audit log 조회, 다운로드나 보관 정책을 시험하지 않았다.

## 출처

- [Palantir, log-file-basics](https://www.palantir.com/docs/foundry/api/audit-v2-resources/log-files/log-file-basics)

- [Palantir, List Log Files](https://www.palantir.com/docs/foundry/api/audit-v2-resources/log-files/list-log-files)
- [Palantir, Get Log File Content](https://www.palantir.com/docs/foundry/api/audit-v2-resources/log-files/get-log-file-content)

## 관련 문서

- [[Palantir-API]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Security-and-Governance]]
