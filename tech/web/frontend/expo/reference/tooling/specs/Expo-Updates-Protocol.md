---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Updates v1 요청과 선택 계약"]
---

# Expo Updates v1 요청과 선택 계약

## 프로토콜 범위

Expo Updates v1은 서버가 여러 플랫폼의 앱에 update와 directive를 전달하는 HTTP 규약이다. Update는 manifest와 그 안에 참조된 asset들의 묶음이며 directive는 클라이언트 동작을 지시하는 메시지다. 자체 update 서버를 구현할 때도 동일한 호환성, 무결성과 로컬 선택 계약이 필요하다.

앱은 로컬 update DB에서 필터를 충족하는 가장 최근 update를 선택한다. 새 update 응답을 받으면 manifest와 필요한 asset을 저장하고 응답의 필터와 서버 지정 헤더를 갱신한다. 서버의 최신 응답과 즉시 실행되는 앱 버전은 다운로드, 저장과 실행 정책 때문에 구분한다.

## GET 요청

| 헤더 | 계약 |
| --- | --- |
| `expo-protocol-version` | v1 요청 값은 `1` |
| `expo-platform` | `ios` 또는 `android`; 다른 플랫폼에 서버는 400/404 응답 권고 |
| `expo-runtime-version` | 클라이언트 빌드의 네이티브 구성과 호환되는 runtime 식별자 |
| 서버 지정 헤더 | 이전 응답이 저장을 지시한 헤더를 후속 update 요청에 포함 |
| `accept` | `application/expo+json`, `application/json`, `multipart/mixed` 협상 |
| `expo-expect-signature` | 서명 검증 설정 시 필요한 SFV 사전, `sig`, `keyid`, `alg` 사용 |

runtimeVersion은 앱의 표시 버전이나 update ID와 다르다. 서버는 요청의 모든 제약을 충족하는 update 중 생성 시각이 가장 최신인 것을 선택해야 한다. 동일 조건을 만족하는 후보 사이에서는 요청 헤더나 IP 등으로 선택할 수 있다.

## 응답 형식

JSON 응답은 manifest 한 개를 전달하며 directive를 지원하지 않는다. `multipart/mixed`는 manifest, extensions, directive part를 선택적으로 담는다. 지원하지 않는 형식이나 호환되지 않는 protocol 요청에는 406 응답을 권고한다. JSON만 요청했는데 최신 응답이 directive인 경우도 이 제약에 해당한다.

Part 순서는 고정하지 않는다. 각 part는 `content-disposition`의 `name`으로 구분하고 JSON content type을 지정한다. 빈 multipart는 새 update/directive가 없는 no-op이며 헤더는 계속 처리한다. part가 없을 때 204와 빈 body를 사용할 수 있다.

## 응답 헤더와 로컬 상태

`expo-protocol-version: 1`, `expo-sfv-version: 0`을 사용한다. `expo-manifest-filters`는 manifest의 `metadata`를 검사하는 사전이다. 필터에 있는 key의 metadata 값은 **없거나 같은 경우** 통과한다. 필터 key가 모두 존재해야 한다는 조건으로 바꾸면 규약이 달라진다.

`expo-server-defined-headers`는 후속 update 요청에 넣을 헤더 사전이다. 필터와 서버 지정 헤더는 각각 새 응답에 의해 덮어쓸 때까지 저장한다. manifest 캐시는 오래된 update 선택을 피하도록 짧게 두며 `private, max-age=0`이 권고된다.

`expo-signature`는 서명 값 `sig`와 선택적인 `keyid`, `alg`를 전달한다. 알고리즘은 신뢰하는 인증서의 정의와 일치해야 한다. multipart에서는 해당 manifest/directive part에 서명 헤더를 둔다.

## 구현 확인

- 요청 조건과 로컬 필터를 서버/클라이언트 양쪽에서 일관되게 처리한다.
- JSON, multipart와 204를 구분하고 빈 body를 malformed manifest로 오인하지 않는다.
- 필터와 후속 요청 헤더를 update 저장 상태와 함께 보존한다.
- signature 검증 실패나 asset 실패를 사용 가능한 update로 처리하지 않는다.

manifest, asset 불변성 및 서명 검증 순서는 [[Expo-Updates-Protocol-Assets]]에서 이어진다. 헤더 직렬화는 [[Expo-Structured-Field-Values]]를 함께 확인한다.

## 출처

- [Expo Documentation, Expo Updates v1](https://docs.expo.dev/technical-specs/expo-updates-1)

## 관련 문서

- [[Expo-Specifications]]

- [[Expo]]
