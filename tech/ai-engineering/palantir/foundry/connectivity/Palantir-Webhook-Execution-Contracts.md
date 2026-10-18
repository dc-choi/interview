---
tags: [palantir, webhooks, functions, oauth]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Webhook의 외부 효과와 함수 계약

Data Connection webhook은 Foundry에서 외부로 나가는 요청이다. 외부에서 Foundry로 들어오는 요청은 listener로 구분한다. Webhook은 하나의 Source에 연결하고, 입력을 요청에 매핑한 뒤 응답을 typed output으로 추출한다.

## 요청 구성과 외부 효과

하나의 webhook에 여러 요청을 순서대로 넣고 이전 응답을 다음 요청에 사용할 수 있다. 다만 여러 write API 요청은 일반적으로 허용하지 않는다. 요청 간 transaction을 보장할 수 없기 때문이다. 동적인 개수의 요청과 전후 처리는 external function으로 구성할 수 있지만, 이것이 외부 시스템과 Ontology 사이의 원자성을 추가하지는 않는다.

Read API webhook은 query와 Ontology edit function에서 사용할 수 있다. Write API는 Ontology edit function에서 사용한다. 인증 token을 받는 POST처럼 반복해도 업무 상태를 바꾸지 않는 요청은 의미를 검토한 뒤 Read API로 지정할 수 있다. HTTP 메서드 이름을 바꾸거나 안전하다고 표시한다고 실제 외부 효과가 없어지지는 않는다.

Action의 입력 mapping 함수가 `undefined`를 반환하면 webhook을 발사하지 않는 구성이 가능하다. Attachment 입력은 agent worker Source에서 지원하지 않는다. 응답의 nested key나 0부터 시작하는 array index로 값을 추출하고, 전체 응답을 String으로 받을 수도 있다. String output의 비문자열은 JSON 문자열로 변환되고, Record output의 문자열은 JSON 파싱을 시도하며, Integer/Long은 Double로 변환할 수 있다.

## 한도와 실행 위치

Webhook timeout 기본값은 20초, 최대값은 180초다. 동시 실행 수와 기간별 실행 수를 별도로 제한한다. Timeout 오류는 외부 변경의 rollback 증거가 아니므로 재시도 전 외부 결과를 확인하는 설계가 필요하다.

Legacy agent worker는 받은 순서대로 task를 실행하므로 대형 sync 뒤에 짧은 webhook이 대기할 수 있다. Setup 가이드는 이 경로에 전용 agent를 권장한다. 현재 기본 권고는 Foundry worker와 필요한 egress policy다. Setup의 IP-only 대상에 대한 sunset proxy runtime 안내는 현재 proxy 정책 지원과 별도로 확인해야 한다.

## Function으로 공개하기

Webhook을 Ontology function으로 게시하면 Workshop, OSDK, 다른 Functions와 function-backed Action에서 재사용할 수 있다. 게시 활성화 이후 webhook version은 function version으로도 게시된다. 문서는 이 작업을 되돌릴 수 없으며 게시된 function을 삭제할 수 없다고 명시한다.

TypeScript v1은 Source와 webhook을 functions repository에 가져오는 흐름을 제공한다. TypeScript v2와 Python에서 webhook을 사용하려면 먼저 webhook function으로 게시한 뒤 OSDK로 호출한다. External Functions 문서의 임의 TypeScript API 호출 제한은 이 webhook 경로의 설명이다. 다른 Functions API 호출 기능의 지원까지 이를 근거로 일괄 부정하지 않는다.

## OAuth와 이력

Authorization code grant는 outbound application을 사용해 실행 사용자에게 인증을 요구한다. Redirect URI는 해당 enrollment의 callback과 정확히 일치해야 한다. 이 지원을 outbound application 인증을 지원하지 않는 external transform에 그대로 적용하지 않는다.

Client credentials grant는 token endpoint 호출 후 받은 token으로 업무 API를 호출한다. Microsoft Graph 예시는 `login.microsoftonline.com`과 `graph.microsoft.com` 양쪽 domain과 egress를 구성한다. Webhook에서는 여러 domain을 사용할 수 있지만, 다중 domain REST Source를 Python transform에 가져오는 것은 별도 제한을 받는다.

응답은 기본적으로 6개월 저장된다. 실행자와 `webhooks:read-privileged-data` 권한자는 전체 응답을 볼 수 있으므로 token endpoint의 응답 저장을 끄는 것이 공식 권고다. Secret이 Source UI에서 숨겨져도 code import를 허용한 저장소의 Editor는 secret을 읽을 수 있다는 별도 권한 계약을 함께 적용한다.

## Legacy task 구분

`magritte-rest-v2`와 Salesforce task 방식은 역사적 참고 자료다. Legacy REST task는 `calls`와 Handlebars 기반 body를 쓰며, 기본 safe method는 GET/OPTIONS/HEAD다. Retryable status 기본 목록은 비어 있고, 외부 시스템이 변경되지 않았음을 나타내는 status 기본값은 400~431이다. 이는 connector의 판정 규칙이며 모든 외부 API의 실제 효과를 증명하지 않는다.

Legacy REST webhook의 extractor는 JSON만 허용한다고 설명한다. 이 제약을 최신 REST request builder의 전체 body 형식으로 확대하지 않는다. Salesforce는 최신 REST API Source로 이전하도록 권고한다.

## 출처

- [Palantir, Webhooks overview](https://www.palantir.com/docs/foundry/data-connection/webhooks-overview)
- [Palantir, Webhooks setup](https://www.palantir.com/docs/foundry/data-connection/webhooks-setup)
- [Palantir, Webhooks configuration reference](https://www.palantir.com/docs/foundry/data-connection/webhooks-reference)
- [Palantir, External Functions](https://www.palantir.com/docs/foundry/data-connection/external-functions)
- [Palantir, Microsoft Graph API webhook](https://www.palantir.com/docs/foundry/data-connection/webhooks-microsoft-graph-api)

## 관련 문서

- [[Palantir-Data-Connection-Permissions|실행과 이력 권한]]
- [[Palantir-External-Transforms-Governance|외부 연산의 export 통제]]
- [[Palantir-Data-Connectivity|데이터 연결]]

본문과 예제의 계약을 확인했다. Webhook 실행, 외부 변경과 function 게시를 수행하지 않았다.
