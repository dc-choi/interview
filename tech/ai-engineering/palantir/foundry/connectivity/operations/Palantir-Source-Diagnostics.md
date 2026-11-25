---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-11-26
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

## 지연이 큰 구간의 처리량 조정

대역폭이 충분해도 인터넷 구간의 지연이 크면 ingest 처리량이 제한될 수 있다. 문서가 제시하는 조정은 고객 쪽 송신 host에서 TCP 혼잡 제어를 BBR로 바꾸고 TCP send buffer 상한을 늘리는 두 가지다. 대상 host는 secure tunnel이면 tunnel initiator, direct connection이면 인터넷에 노출된 host나 container이며, DB가 proxy 뒤에 있으면 proxy host다.

| 연결 방식 | BBR | send buffer |
| --- | --- | --- |
| Data Connection agent가 관리하는 secure tunnel | agent 설정의 Envoy YAML에 `optimizedTcpSendThroughput: true`를 넣고 agent 재시작 | 이 설정은 buffer를 바꾸지 않으므로 agent host에서 따로 늘린다 |
| Apollo가 관리하는 secure tunnel | initiator의 Apollo 설정에 같은 key를 `true`로 둔다 | 같은 설정이 16 MiB send buffer도 켠다 |
| Direct connection | DB나 proxy host에서 `net.ipv4.tcp_congestion_control=bbr` | 같은 host에서 따로 늘린다 |

문서의 안내는 secure tunnel과 direct connection에 한정되며 agent proxy policy와 agent worker 경로의 조정은 다루지 않는다. 표 첫 행의 agent 설정을 agent proxy 경로에도 적용된다고 넓히지 않는다.

Linux에서는 먼저 `sysctl net.ipv4.tcp_available_congestion_control` 출력에 `bbr`이 있는지 본다. send buffer는 `/proc/sys/net/ipv4/tcp_wmem`의 최소, 기본, 최대값을 기록해 둔 뒤 최대값이 16777216(16 MiB)보다 작을 때만 최소와 기본은 그대로 두고 최대값만 올린다. `sysctl -w`는 재부팅 뒤 사라지므로 systemd host는 `/etc/sysctl.d/` 파일로 영속화하고, BBR은 DB나 proxy 서비스를 재시작하고 다시 연결해야 적용될 수 있다.

적용 제안: 이 조정은 처리량이 ingest 속도를 제한할 때의 선택지이며 egress 차단, 인증서, 자격 증명 실패를 고치지 않는다. 연결 자체가 실패하면 이 문서의 연결, TLS, OAuth 진단부터 한다. 문서는 조정이 처리량을 개선할 수 있다고(may) 표현하므로 적용 전후 ingest 시간을 같은 조건에서 비교한다.

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
