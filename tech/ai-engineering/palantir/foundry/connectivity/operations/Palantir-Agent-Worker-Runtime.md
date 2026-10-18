---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Legacy agent worker의 실행과 credential

현재 문서는 agent worker를 legacy로 분류하고 추가 개발은 기대하지 않지만 full support는 유지한다고 설명한다. 신규/기존 변경에는 Foundry worker를 권장한다. legacy를 즉시 미지원이라고 표현하지 않는다.

## job과 용량

capability Java code는 agent host에서 실행한다. source로 가는 네트워크는 host firewall/DNS/proxy를 설정하며 Foundry egress policy가 적용되는 경로가 아니다.

agent JVM heap 기본 1GB, host memory 권장은 16GB 이상이다. OS physical 사용량은 다른 process/off-heap까지 포함하고 agent heap metric과 다르다.

기본 최대 동시 sync는 16이며 이름과 달리 모든 source/capability가 공유한다. streaming, CDC, export, webhook과 legacy task도 한 quota를 쓴다. 한도에 닿으면 queue에서 기다린다. 여러 agent 중 job 시작 시 가능한 agent를 무작위로 배정한다.

각 agent가 전체 workload를 감당하도록 계획하고 webhook은 긴 sync에 막히지 않게 별도 agent를 검토한다. classpath conflict, job 간 메모리/disk 경합과 Use in code/virtual table/virtual media 미지원이 구조적 제약이다.

## upload와 driver

현행 신규 agent는 `uploadStrategy.type: data-proxy`로 Foundry API gateway를 쓴다. direct upload는 2024-06 이후 enrollment/신규 agent에 없으며 기존 host IP가 바뀌면 기존 설정의 작동 조건도 달라진다.

custom JDBC driver는 Palantir 서명이 필요하고 agent에 직접 추가한다. 동일 class의 여러 버전이나 shared classpath 충돌을 확인한다. Foundry worker의 unsigned-upload 계약과 구별한다.

## credential의 위치

browser에서 배정된 각 agent의 public key로 credential을 암호화한 뒤 Foundry에 저장하고 해당 agent의 private key로 메모리에서 복호화한다. agent 집합 변경 시 credential을 재입력해야 한다. fresh install link 재설치도 key 보존 없이는 자동 이전하지 않는다.

## mTLS keystore

기본 bootstrapper keystore/truststore는 restart 때 재생성된다. private key를 직접 추가하려면 default keystore를 별도 경로로 복사하고 keytool import 뒤 key password와 keystore password를 맞춘다.

Agent 탭은 `security.keyStore`, Explorer 탭은 `security.keyStorePath`와 각각의 password를 새 경로로 설정한다. 두 필드 이름이 다르다. Bootstrapper 설정 변경은 필요 없다는 원문 절차를 따르고 restart한다. 기본 파일만 수정하면 다음 restart 때 사라질 수 있다.

## 출처

- [Palantir, agent-worker](https://www.palantir.com/docs/foundry/data-connection/agent-worker)
- [Palantir, agent-worker-runtime](https://www.palantir.com/docs/foundry/data-connection/agent-worker-runtime)

## 관련 문서

- [[Palantir-Connection-Operations]]
- [[Palantir-Agent-Lifecycle]]
- [[Palantir-Agent-Proxy-TLS]]
