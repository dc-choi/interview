---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# source 연결, TLS와 OAuth 진단

source Preview로 연결을 확인하고, Explore는 되지만 특정 sync만 실패하면 sync 설정과 실행 단계를 분리해 조사한다. Foundry worker의 policy/host/port/protocol과 실제 network egress log를 대조한다. agent worker면 host online과 원본 네트워크도 확인한다.

## terminal의 증거 범위

source terminal은 같은 connectivity 설정으로 dig/curl/netcat/openssl을 실행한다. agent proxy policy에서 dig가 10.238.0.X 같은 virtual IP를 반환할 수 있다. 이는 routing 주소이며 agent가 실제 원본을 resolve/reach했다는 증거가 아니다. 원래 hostname/port로 HTTP/TLS 연결을 확인한다.

curl은 connect timeout을 두고 HTTP 응답 상태와 원본을 확인한다. openssl은 SNI와 CA chain/mTLS 조건을 맞춘다. handshake 출력만으로 애플리케이션 인가나 모든 certificate 검증이 성공했다고 확대하지 않는다.

UI에 설정한 certificate는 terminal에 자동 포함되지 않는다. 필요하면 CAfile/client cert/key를 terminal에서 별도로 제공해 시험한다. terminal 성공과 connector certificate/credential이 올바르다는 사실도 구별한다.

## 로그와 도구

build log의 Network egress logs filter와 Control Panel의 egress policy Observability에서 실제 차단/허용을 확인한다. Job tracker는 실행 stage와 JDBC `_data-ingestion.log`를 제공한다.

Debug with AI FDE는 Foundry worker source와 AIP-enabled enrollment 조건이다. source/policy를 context로 받아 같은 log와 live tool로 조사한다. 제안된 수정과 실제 적용/검증을 구별한다.

## TLS 인증서

PKIX/SSLHandshakeException은 source가 신뢰할 CA/certificate를 확인하는 출발점이다. server certificate는 공개 certificate로, client mTLS는 certificate/private key pair로 구성한다. self-signed chain 오류는 network가 가능한 곳에서 전체 chain을 가져와 확인한다.

Foundry worker는 source certificate 설정, agent worker는 agent truststore를 사용한다. TLS1.0/1.1은 현재 Palantir 미지원/비권장이라는 계약을 따른다. legacy 임시 허용은 Agent와 Explorer의 tlsProtocols에 현대 protocol도 유지해야 하며 source가 갱신되면 되돌린다. 이를 일반적인 보안 권장으로 제시하지 않는다.

## outbound OAuth

비대화형 schedule/automation 전에 호출 사용자가 interactive authorization을 한 번 완료해야 한다. HTTP401이면 user authorization, outbound app Enabled와 필요한 scope를 확인한다.

`Credentials expired and no refresh handler provided`는 외부 refresh token이 만료/폐기돼 재authorization이 필요한 경우다. interactive UI에서 같은 outbound app workflow를 실행한다.

`Resolved source credentials are not present on the Source`는 outbound app 미설정 또는 authorized user identity 미해결을 확인한다. domain OAuth2 설정과 authenticated end-user 호출을 확인하며 service account로 같은 위임 credential이 자동 생긴다고 가정하지 않는다.

## 출처

- [Palantir, troubleshooting](https://www.palantir.com/docs/foundry/data-connection/troubleshooting)

## 관련 문서

- [[Palantir-Connection-Operations]]
- [[Palantir-Agent-Proxy-TLS]]
- [[Palantir-Sync-Failure-Diagnosis]]
