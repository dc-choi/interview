---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
---

# REST source와 외부 코드 인증

현행 REST source는 webhook과 external transform/Function의 네트워크 및 secret 연결을 제공한다. built-in batch sync/export를 자동 제공하는 범용 extractor로 해석하지 않는다. 적어도 하나의 domain을 지정하고 기본 HTTPS 443 또는 별도 port를 맞춘다.

## 인증과 네트워크

2026-11-24 확인한 문서 기준이다. source 설정 표의 domain별 인증 선택지는 `None`, `Basic`, `Bearer Token`, `API Key` 네 가지이고, API key는 header와 query param 중 어디로 보낼지 고른다. 다음은 Palantir 문서에 없는 해석이다. API key를 query에 넣으면 URL 로그에 남을 수 있으므로 원본이 허용하는 transport와 secret 취급을 확인한다. REST API source 자체는 sync와 export를 지원하지 않고, 옛 `magritte-rest-v2` source는 Webhook 용도로 더 권하지 않으며, REST로 하는 sync와 export는 external transform으로 구현한다.

OAuth client credentials(RFC 6749 4.4절)는 source의 인증 선택지가 아니라 external transform 코드의 패턴으로 설명한다. token endpoint domain과 resource API domain을 모두 source에 넣고, `client_id`와 `client_secret`은 코드에 적지 않고 source의 additional secrets로 둔다. Palantir 문서는 token 요청이 `application/x-www-form-urlencoded` 본문에 반드시 넣어야 할 최소 파라미터로 `grant_type=client_credentials`, `client_id`, `client_secret`, 공백으로 구분한 `scope`를 들고, 예제는 받은 token을 resource 요청마다 `Authorization: Bearer` header에 넣는다. `audience`나 `resource` 같은 추가 파라미터를 요구하는 서버도 있다고 적는다. RFC 6749 기준으로는 `grant_type`만 필수이고 `scope`는 선택이며, 인증 서버는 HTTP Basic 클라이언트 인증을 지원해야 하고 client 자격 증명을 요청 본문에 넣는 방식은 선택(MAY)이며 권장하지 않는다. 따라서 Basic 방식만 받는 서버도 규격상 허용되므로 대상 서버가 받는 클라이언트 인증 방식을 먼저 확인한다. 대상이 Foundry API 자체면 Foundry 전용 token endpoint와 scope 절차를 따로 본다.

문서의 기본 예제는 응답의 `nextPageToken`이 없을 때까지 `pageSize=100`으로 페이지를 이어 읽고 결과를 dataset 하나로 쓴다. 문서는 오래 도는 transform이 중간에 token을 다시 받아야 할 수 있으니 token 응답의 `expires_in`을 보라고 하지만, 예제 자체는 token을 한 번만 받는다. 다음은 예제 코드에 보이는 범위만 읽은 해석이다(built-in client는 source의 인증서를 설정한 requests Session으로 설명되며 기본 timeout과 재시도는 문서에 없다). 예제 코드에는 만료 전에 token을 다시 받는 로직, 요청 timeout, 일시 오류 재시도가 보이지 않고, 전체 결과를 메모리에 모았다가 한 번에 쓰므로 중간에 실패하면 그때까지 읽은 페이지도 남지 않는다. 대량 수집에 쓸 때는 token 갱신, timeout, 재시도와 중간 결과 보존 방식을 따로 정한다.

NetSuite JWT assertion 예시는 ES256, kid/iss/aud/scope/rest_webservices, iat와 약 59분 exp, client assertion grant를 맞춘다. 설명은 `POST /account` endpoint를 가리키지만 코드는 계정마다 `/services/rest/record/v1/account/{account_id}`에 `PATCH`를 보낸다. token helper는 응답 상태를 검사하지 않고 바로 `access_token`을 꺼내며(기본 예제는 `raise_for_status()`를 부른다), update 결과는 상태 코드와 본문을 dataset에 기록만 할 뿐 실패를 예외로 올리지 않는다. 요청 본문을 f-string으로 이어 붙이므로 계정 이름에 큰따옴표나 역슬래시가 있으면 JSON이 깨지고, 입력값이 문자열을 닫고 다른 필드를 덧붙이면 유효한 JSON인 채로 의도하지 않은 필드까지 갱신을 요청할 수 있다. 적용할 때는 `json.dumps` 같은 직렬화와 실패 처리를 더하고, 서명과 token 획득 예제가 retry나 중복 write 방지까지 검증하지 않는다는 점을 함께 본다.

자체 서명 서버 인증서는 source에 추가하면 external transform의 built-in HTTPS client에는 보통 자동으로 들어간다. `REQUESTS_CA_BUNDLE` 환경 변수를 읽는 별도 Python client(문서 예는 `Office365-REST-Python-Client`)를 쓸 때만 기본 bundle과 source 인증서 bundle을 합친 파일로 그 변수를 덮어쓴다. TLS 검증 비활성화로 바꾸는 것과 다르다.

## Generic source

Generic connector는 Foundry worker의 코드에서 네트워크, secrets와 export markings를 묶어 쓴다. Python/TypeScript Functions, compute와 external transforms별 지원을 확인한다. code sidebar의 New connection 흐름을 Data Connection의 source 화면과 혼동하지 않는다.

REST로 변환하려면 단일 domain DNS 443 등 원문의 제한을 충족해야 한다. source에서 받은 credential 사용과 외부 API의 사용자 위임/앱 권한은 별도다.

## 코드의 성공 판단

예제가 response JSON을 반환했다고 전체 pagination, 오류 처리, retry나 외부 쓰기 완료가 보장되지 않는다. mutation은 원본 API의 idempotency/조건부 갱신을 확인하고 결과를 readback한다. read와 write 작업의 source 및 권한을 나누는 설계는 실제 제품 요구에 맞춰 판단한다.

## 출처

- [Palantir, rest-apis](https://www.palantir.com/docs/foundry/available-connectors/rest-apis)
- [Palantir, generic](https://www.palantir.com/docs/foundry/available-connectors/generic)
- [IETF, RFC 6749 Section 4.4 Client Credentials Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4)
- [IETF, RFC 6749 Section 2.3.1 Client Password](https://datatracker.ietf.org/doc/html/rfc6749#section-2.3.1)
- [Palantir, External transforms](https://www.palantir.com/docs/foundry/data-connection/external-transforms/)

## 관련 문서

- [[Palantir-Connector-Contracts]]
