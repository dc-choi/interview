---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Agent Manager, Bootstrapper와 source의 proxy/TLS

agent는 Foundry와 내부 source의 두 방향으로 통신한다. 인증서와 proxy 설정을 어느 process/연결에 적용하는지 나눈다. Agent Manager를 host에서 bootvisor라고 부르는 것과 agent worker job을 구별한다.

## proxy 세 계층

Agent Manager의 `var/conf/runtime.yml`은 service-discovery의 magritte-coordinator 아래 `proxy-configuration.hostAndPort`와 optional credentials를 둔다. Bootstrapper는 coordinator의 `proxyConfiguration.host`, port와 optional credentials를 설정한다. 두 proxy는 Foundry coordinator 연결용이며 source 연결을 대신하지 않는다.

source로 나가는 agent JVM proxy는 Bootstrapper의 agent.jvmArguments에 http/https proxyHost/proxyPort를 설정한다. host 앞에 `http://`를 넣지 않고 값을 따옴표로 감싸지 않는다. `http.nonProxyHosts`는 `host1|*.host2` 형식의 제외 범위를 다룬다.

JVM proxy는 agent 전체 outbound 요청에 영향을 주므로 가능하면 source별 proxy를 사용한다. 변경 저장 뒤 restart가 필요하다. Foundry worker의 egress policy와 legacy agent host의 proxy를 같은 정책으로 이해하지 않는다.

## 인증서와 truststore

server CA는 원본 신뢰를 위한 공개 certificate이며 private key를 받지 않는다. mTLS client identity는 certificate와 private key pair다. 공개 CA가 아닌 내부/self-signed CA는 chain을 구성하고 provider와 fingerprint를 대조한다.

Agent certificate UI에는 chain 하나를 통째로 넣지 않고 각 certificate를 따로 추가한다. PEM 줄바꿈은 유지하고 trailing newline 조건을 확인한다. 변경 뒤 restart해야 한다. 최초 TLS-inspection proxy CA가 없으면 설치 bundle을 받기 전에 추가해야 한다.

TLS-inspected host에서 Manager의 최초 연결이 안 되면 현재 영어 문서의 bundled `jdk/amazon-corretto*` keytool과 `var/security/truststore.jks`를 사용해 root CA를 수동으로 신뢰시킬 수 있다. 이후 agent 프로세스에도 UI로 같은 CA를 넣는다. 예전 번역의 `jdk/zulu*` 경로를 현재 install에 그대로 적용하지 않는다.

## host override

agent 9.2446.0 이상은 hostname→IP override를 지원한다. private IP만 있는 source는 설명적인 placeholder domain을 만들고 source/egress에는 domain을 사용하며 agent 경계에서 private IP로 해석한다.

override는 agent 전체 연결의 DNS에 적용되고 일반 DNS보다 우선한다. 저장 뒤 restart한다. source terminal에서 agent-proxy virtual IP가 보인다고 원본 host의 실제 DNS나 도달성을 검증한 것으로 보고하지 않는다.

## 출처

- [Palantir, agent-configuration-reference](https://www.palantir.com/docs/foundry/data-connection/agent-configuration-reference)
- [Palantir, troubleshooting](https://www.palantir.com/docs/foundry/data-connection/troubleshooting)

## 관련 문서

- [[Palantir-Connection-Operations]]
- [[Palantir-Agent-Recovery]]
- [[Palantir-Source-Diagnostics]]
