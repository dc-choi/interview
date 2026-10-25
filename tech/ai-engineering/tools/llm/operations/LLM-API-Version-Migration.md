---
tags: [ai, llm, claude, api, versioning, sdk, migration]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM API Version Migration", "LLM API 버전 마이그레이션", "Claude API 2026-10-21", "anthropic-version"]
---

# LLM API 버전과 SDK 마이그레이션

LLM API의 날짜 기반 버전은 요청 형식과 응답 계약을 특정 시점의 규칙으로 고정하는 장치다. 모델 교체와는 별개의 축이며, SDK가 기본 버전을 대신 보내면 버전 전환이 SDK 업그레이드에 묶인다. 이 문서는 Claude API의 `2026-10-21` 버전을 사례로 버전 고정이 보장하는 범위, SDK 메이저 업그레이드의 위험과 마이그레이션 점검을 정리한다. 제공자 동작은 2026-10-26 Claude Platform 공식 문서 기준이다. 상위: [[LLM-Operations|LLM 선택, 서빙과 운영]].

## 날짜 기반 버전 고정이 보장하는 것

Claude API는 모든 요청에 `anthropic-version` 헤더를 요구하고, 공식 SDK는 이 헤더를 자동으로 넣는다. 같은 버전 안에서는 기존 입력 파라미터와 출력 파라미터가 유지된다. 다만 선택 입력 추가, 출력 값 추가, 특정 오류 유형의 발생 조건 변경, 스트리밍 이벤트 타입 같은 enum형 출력 값의 새 변형 추가는 같은 버전 안에서도 일어날 수 있다.

- **고정은 동결이 아니다**: 버전을 고정해도 응답에 새 필드와 새 enum 값이 들어올 수 있다. 모르는 값은 기본 분기로 보내고, 문서에 없는 동작에 기대지 않는다.
- **버전은 드물게 나왔다**: 초기 `2023-01-01`, 스트리밍 SSE 형식을 바꾼 `2023-06-01`에 이어 2026-10-21에 릴리스된 `2026-10-21`이 2023-06-01 이후 처음 나온 버전이다. 공식 문서는 가능하면 최신 버전을 쓰라고 권한다.
- **모델 단위 제약과 버전 단위 제약은 다르다**: Claude 4.7 이후 모델은 `2023-06-01`에서도 기본값이 아닌 `temperature`, `top_p`, `top_k`를 400으로 거부하고, 마지막 assistant 턴 프리필은 Claude 4.6 이후 모델에서 400이다. `2026-10-21`은 세 샘플링 파라미터를 모든 모델에서 제거해 기본값을 보내도 400을 낸다. 모델을 바꾸는 마이그레이션([[Claude-Opus-5]])과 API 버전을 바꾸는 마이그레이션을 따로 점검한다.

## 2026-10-21에서 바뀐 요청과 응답 계약

Messages API(`POST /v1/messages`), 토큰 카운트와 이 버전으로 만든 Message Batch의 각 요청에 적용된다.

| 변경 | 400이 나는 요청 | 계속 허용되는 것 | 조치 |
|---|---|---|---|
| assistant 턴의 문서 | `assistant` 메시지에 `document` 블록을 직접 둔다 | 다른 블록 안에 중첩된 문서(Claude가 반환한 web fetch 도구 결과 등) | 문서를 `user` 메시지로 옮긴다 |
| user 턴의 인용 | `user` 메시지의 `text` 블록에 비어 있지 않은 `citations` 배열을 넣는다(직접 또는 `search_result` 블록 안) | `assistant` 메시지 text 블록의 인용, 문서와 검색 결과의 `"citations": {"enabled": true}` 설정 | 해당 블록에서 `citations`를 뺀다 |
| 샘플링 파라미터 제거 | `temperature`, `top_p`, `top_k` 중 하나라도 보낸다(기본값 포함, 모든 모델) | 세 파라미터를 생략한 요청 | 파라미터를 지우거나 그 요청만 `2023-06-01`에 남긴다 |

- 세 파라미터를 빼면 `temperature` 1.0을 포함한 기본값으로 샘플링한다. 기본값만 받던 Claude 4.7 이후 모델은 샘플링 방식이 이전과 같지만, Claude Sonnet 4.6처럼 다른 값을 받던 모델에서 `temperature`를 낮춰 얻던 일관성 효과는 사라지고 이를 대신하는 설정은 없다. Messages API 가이드는 세 파라미터를 빼고 프롬프트로 모델 동작을 이끌라고 안내한다.
- Admin API와 Claude Enterprise Analytics API는 이름이 바뀐 필드의 예전 이름을 더 이상 돌려주지 않는다(`roles`는 `role_ids`, `name`은 `display_name`, `actor.email`은 `actor.email_address` 등). API 키의 `workspace_id`는 없어지고 `scope`로 바뀌며 값의 의미도 다르다. 예전에는 Default Workspace에 묶인 키와 전체 워크스페이스 키가 모두 `null`이었지만, 새 버전의 `scope.workspace_id`는 Default Workspace의 실제 ID를 주고 전체 워크스페이스 키의 `scope`는 `{"type": "organization"}`이다. `null`을 Default Workspace로 해석하던 코드는 ID 비교로 바꾼다.
- 제공 범위: Claude API, Claude Platform on AWS, Google Cloud의 두 경로(Anthropic managed, Google managed)와 Microsoft Foundry에서 쓸 수 있고, Amazon Bedrock에서는 Claude 4.7 이후 모델만 지원한다. Bedrock의 이전 모델은 지금 쓰는 SDK 버전이나 지금 보내는 버전을 유지하고, 옮기려면 먼저 Claude 4.7 이후 모델로 바꾼다.

## SDK 메이저 업그레이드가 기본 버전을 바꾼다

2026-10-26 SDK 개요 기준, 클라이언트 SDK의 각 메이저 버전은 기본으로 하나의 API 버전을 보내고 새 API 버전마다 새 메이저가 나온다. 이전 SDK와 CLI는 `2023-06-01`을 보냈고, `2026-10-21`을 기본으로 보내는 첫 버전은 2026-10-21 릴리스 노트 기준 다음과 같다.

| 대상 | 첫 버전 | 업그레이드 때 확인할 점 |
|---|---|---|
| Python `anthropic` | 2.0.0 | `MessageParam`이 역할별 타입의 유니온이 되어 `MessageParam(...)` 호출은 `TypeError`를 낸다. dict 리터럴 메시지는 그대로 쓴다 |
| TypeScript `@anthropic-ai/sdk` | 1.0.0 | Bedrock, Vertex, Foundry, AWS, Google Cloud 플랫폼 패키지도 같은 업그레이드에서 v1로 올린다. 아니면 패키지 관리자가 이전 SDK 사본을 따로 설치한다 |
| Go | 2.0.0 | 모듈 경로가 `github.com/anthropics/anthropic-sdk-go/v2`로 바뀌어 import 경로를 고쳐야 하고 Go 1.25 이상이 필요하다 |
| C#, Java, PHP, Ruby | 13.0.0, 3.0.0, 1.0.0, 2.0.0 | PHP는 `composer update`만으로는 현재 버전 제약 안에 머물러 `composer require`로 올린다 |
| `ant` CLI | 2.0.0 | 예전 `go install` 경로는 오류나 경고 없이 최신 v1을 설치한다 |

- **의도치 않은 전환과 의도치 않은 잔류**: 메이저를 고정하지 않은 설치는 새 API 버전으로 넘어가고 샘플링 파라미터를 넘기던 호출이 깨진다. 새 SDK 타입에서 세 파라미터가 빠졌고, 타입을 우회해 보낸 요청은 400을 받는다. Python은 이보다 앞선 v1.0(2026-08-20)에서 이미 Messages 메서드의 세 파라미터를 뺐고, v1 마이그레이션 가이드는 이전 모델에 쓸 값을 `extra_body`로 보내고 배치는 요청의 `params`에 직접 넣으라고 안내했다. 그래서 샘플링 파라미터만 보면 Python v1.x에서 2.0.0으로 올릴 때 깨지는 지점은 타입 제거가 아니라, `extra_body`나 배치 요청의 `params`로 넣던 값이 `2026-10-21`에서 오류가 되는 것이다. 반대로 Go 모듈 경로나 플랫폼 패키지처럼 업그레이드가 일부만 적용되면 한 서비스 안에서 두 API 버전이 섞인다. 서비스별로 실제로 보내는 버전을 확인한다.
- **API 버전과 무관한 변경이 함께 온다**: 새 메이저는 API 키를 `X-Api-Key` 대신 `Authorization: Bearer`로 보내고(Claude API는 두 헤더를 모두 받고, Foundry 클라이언트는 예외), 클라이언트 하나가 자격 증명 하나만 쓰며(둘을 넘겼을 때의 처리는 클라이언트마다 다르다), 메시지 타입을 역할별로 나누고 라이선스를 MIT에서 Apache 2.0으로 바꾸는 등의 변경이 함께 들어왔다. `X-Api-Key`를 읽는 프록시, 게이트웨이, 로그 필터와 테스트 스텁은 SDK만 올려도 깨질 수 있다([[LLM-Gateway|LLM 게이트웨이]]).
- **헤더만 바꾸는 우회의 한계**: SDK는 기본 헤더나 요청별 헤더로 `anthropic-version`을 덮어쓸 수 있지만, 공식 문서는 타입 불일치와 정의되지 않은 동작이 생길 수 있다고 경고한다. 제거된 파라미터와 예전 필드명은 새 SDK 타입에서도 빠졌으므로 버전 전환은 SDK 메이저와 함께 한다.
- **어댑터는 조용히 무시할 수 있다**: C# SDK의 `IChatClient` 어댑터는 새 메이저에서 `ChatOptions.Temperature`, `TopK`, `TopP`를 무시한다. 오류 대신 설정이 사라지는 경로가 있으므로 출력 성향의 변화도 회귀 테스트로 확인한다.

## 마이그레이션 점검

공식 가이드의 순서는 버전 전환, 깨지는 변경에 맞춘 코드 수정, `2026-10-21`에 대한 테스트이며 SDK 업그레이드와 코드 수정을 함께 배포하라고 안내한다. 아래는 이 순서를 운영 점검으로 옮긴 것이다.

- **제거된 파라미터를 검색한다**: 코드뿐 아니라 설정 파일, 프롬프트 템플릿의 요청 옵션, 공통 래퍼의 기본값, 직렬화된 배치 요청과 `extra_body` 같은 우회 필드에서 `temperature`, `top_p`, `top_k`를 찾는다. 같은 방식으로 `assistant` 메시지의 `document`, `user` 메시지의 `citations`, Admin API의 예전 필드명을 찾는다(rate-limit 목록의 `group_type` 쿼리 파라미터와 API 키 목록의 `workspace_id` 필터는 바뀌지 않는다). SDK 타입에서 세 파라미터가 빠졌으므로 정적 타입 검사가 일부를 잡지만, 동적으로 조립한 요청은 실행해야 드러난다.
- **버전을 명시해 고정한다**: SDK를 쓰면 의존성 명세와 lock 파일에서 메이저를 고정하고, 직접 HTTP를 호출하면 헤더 값을 설정으로 관리한다. 요청 로그에 보낸 버전을 남기면 혼재를 찾기 쉽다.
- **요청 단위로 나눠 옮긴다**: 기본값이 아닌 샘플링 값에 의존하는 경로는 `2023-06-01`에 남길 수 있다. Amazon Bedrock에서 Claude 4.7보다 앞선 모델을 부르는 경로는 모델을 바꾸기 전까지 지금 쓰는 SDK 메이저와 지금 보내는 버전을 유지한다(위 제공 범위 항목). 그 경로는 이전 SDK 메이저나 버전을 직접 지정하는 HTTP 호출로 분리하고(Python v1.x는 공식 가이드가 안내한 `extra_body` 경로이며 이 문서에서 실행 검증하지 않았다), 남긴 경로의 목록과 이유를 기록한다. 2026-10-26 확인한 공식 문서에는 `2023-06-01`의 지원 종료 일정이 없다.
- **회귀 테스트를 돌린다**: 문서 첨부, 인용, 검색 결과, 배치와 토큰 카운트를 포함한 대표 요청을 새 버전으로 실행해 400이 없는지 보고, 낮은 `temperature`에 기대던 경로는 출력 분산과 품질을 이전 결과와 비교한다. 배치는 요청별 검증이 비동기라 생성 응답이 아니라 배치 처리가 끝난 뒤 결과의 `errored` 항목(`invalid_request_error`)으로 확인한다.
- **400은 재시도하지 않는다**: `2026-10-21`에서 샘플링 파라미터의 400은 모든 모델에서 나고(`2023-06-01`에서 Claude 4.7 이후 모델이 내는 400은 모델 단위라 폴백 대상에 따라 결과가 다르다), 문서와 인용 규칙도 모델이 아니라 API 버전의 요청 규칙이다. 재시도나 모델 폴백으로 풀리지 않으므로 오류 본문과 `request-id`(배치는 `custom_id`와 결과의 오류 객체)를 남기고 요청을 고친다([[LLM-Failure-Handling-Classification|실패 분류]]).

## 트레이드오프

| 선택 | 얻는 것 | 잃는 것 |
|---|---|---|
| 최신 버전과 SDK 메이저를 따라간다 | 공식 권장 경로, 이후 SDK 릴리스 | 메이저마다 API 계약과 SDK 계약 변경을 함께 흡수한다 |
| 이전 버전과 이전 메이저에 머문다 | 샘플링 값을 받는 모델에서 기존 출력 성향 유지 | 2026-10-26 확인한 SDK 개요와 Python, TypeScript SDK 문서에는 이전 메이저의 유지 기간이 없고 업그레이드 부채가 쌓인다 |
| 경로별로 버전을 나눈다 | 영향이 큰 경로만 늦출 수 있다 | 버전 혼재를 관리하고 경로마다 테스트한다 |

날짜 기반 버전은 깨지는 변경을 한 번에 모아 개발자가 전환 시점을 고르게 한다. 대신 버전이 늘수록 공존 기간 운영과 폐기 정책이 필요해진다([[API-Versioning-Design|API 버저닝 설계]]).

## 면접 체크포인트

- Claude API의 날짜 기반 버전이 같은 버전 안에서 보장하는 것(기존 입력과 출력 유지)과 보장하지 않는 것(선택 입력과 출력 값 추가, 오류 조건 변경)을 구분할 수 있는가
- 모델 단위 제약(Claude 4.7 이후의 기본값 아닌 샘플링 값 거부)과 버전 단위 제약(`2026-10-21`의 세 파라미터 제거)을 나눠 설명할 수 있는가
- SDK 메이저가 기본 버전 헤더를 정하는 구조에서 의존성 범위, lock 파일, Go 모듈 경로와 플랫폼 패키지가 만드는 전환과 잔류 위험을 말할 수 있는가
- 제거된 파라미터 검색, 버전 명시 고정, 요청 단위 분리, 회귀 테스트의 순서를 설계할 수 있는가
- 이 변경의 400을 재시도나 모델 폴백으로 처리하지 않는 이유를 말할 수 있는가
- 인증 헤더 변경처럼 API 버전과 무관한 SDK 변경이 프록시와 게이트웨이를 깨는 경로를 짚을 수 있는가

## 출처

- [Claude Platform Docs, Versions](https://platform.claude.com/docs/en/api/versioning) — 같은 버전 안의 보존과 변경 범위, 버전 이력과 제공 범위, 2026-10-26 대조
- [Claude Platform Docs, Migrating to API version 2026-10-21](https://platform.claude.com/docs/en/api/migration-2026-10-21) — 업그레이드 순서, 깨지는 변경, SDK와 CLI 변경, Bedrock 제약, 2026-10-26 대조
- [Claude Platform release notes — Claude Platform Docs](https://platform.claude.com/docs/en/release-notes/overview) — 2026-10-21 항목의 API 버전과 SDK, CLI 버전, 2026-08-20 Python v1.0의 샘플링 파라미터 제거
- [Claude Platform Docs, Using the Messages API](https://platform.claude.com/docs/en/build-with-claude/working-with-messages) — 샘플링 파라미터의 모델 단위와 버전 단위 400, 프리필 400
- [Claude Platform Docs, SDKs, CLI, and libraries](https://platform.claude.com/docs/en/cli-sdks-libraries/overview) — SDK 메이저와 기본 API 버전의 관계, 2026-10-26 대조
- [Claude Platform Docs, Python SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/python) — Default headers와 Semantic versioning
- [Claude Platform Docs, TypeScript SDK](https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript) — Default headers와 Semantic versioning
- [anthropic-sdk-python Releases — GitHub, anthropics](https://github.com/anthropics/anthropic-sdk-python/releases) — v2.0.0의 새 API 버전 지원 항목, 2026-10-26 확인
- [anthropic-sdk-python MIGRATION.md — GitHub, anthropics](https://github.com/anthropics/anthropic-sdk-python/blob/main/MIGRATION.md) — v1의 샘플링 파라미터 제거와 `extra_body` 안내, 2026-10-26 대조

## 관련 문서

- [[LLM-Operations|LLM 선택, 서빙과 운영 (상위 인덱스)]]
- [[Claude-Opus-5|Claude Opus 5 (모델 교체 때의 샘플링 파라미터, 프리필 400과 기본값 변화)]]
- [[LLM-Failure-Handling-Classification|LLM 실패 분류 (400을 영구 실패로 다루는 기준)]]
- [[LLM-Gateway|LLM 게이트웨이 (호환 계층과 캐시 키의 인증 헤더)]]
- [[API-Versioning-Design|API 버저닝 설계 (버전 수, 공존 기간과 폐기 정책)]]
- [[API-Versioning|API 버저닝 메커니즘 (헤더 버저닝과 중간 계층의 헤더 제거)]]
- [[Version-Upgrade-Difficulty|버전 업그레이드의 난이도 구조 (오류 없이 동작만 바뀌는 변경)]]
