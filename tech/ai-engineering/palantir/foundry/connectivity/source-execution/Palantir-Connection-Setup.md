---
tags: [palantir, data-connection, agent, networking]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Agent 설치와 Source 연결 검증

Agent 설치, Source 생성과 sync 설정은 서로 다른 작업이다. Agent가 Foundry에 연결됐다고 원천 시스템 접근이나 데이터 수집까지 성공한 것은 아니다.

## Host와 네트워크

Agent 설치 가이드는 전용 host에서 하나의 agent를 실행하도록 권고한다. 다른 업무와의 동거를 피하고, 한 host의 여러 agent는 지원하지 않는다. Linux RHEL 8 이상 또는 Ubuntu 22.04 이상, CPU 4개, RAM 16GB, `/opt`의 SSD 여유 공간 500GB를 권장한다. 이 수치는 모든 workload의 처리 성능 보장이 아니다.

번들 JDK는 Linux x86-64용이다. ARM에서는 별도 JDK와 launcher의 `javaHome` 설정이 필요하며, 문서는 이 구성을 권장하지 않고 향후 지원되지 않을 수 있다고 설명한다.

Agent는 Foundry로 outbound 연결을 시작한다. Agent host의 egress와 Foundry ingress의 허용 IP를 모두 맞춰야 한다. Agent에서 원천으로 가는 경로도 별도로 열려 있어야 한다. 외부 원천 시스템이 Foundry로 직접 outbound를 열어야 한다는 뜻은 아니다.

설치 가이드의 `curl -s` 예시는 `--fail` 없이 종료 코드를 확인한다. 따라서 예시의 성공 표시만으로 HTTP 성공 응답이나 agent 정상 상태까지 증명할 수는 없다. 이는 명령 구조에서 도출한 검증상의 주의점이다.

## 재시작과 운영 책임

`${AGENT_MANAGER_DIR}/service/bin/auto_restart.sh`는 cron 기반 자동 재시작을 설정한다. Agent를 의도적으로 중지할 때는 이 설정도 해제해야 한다. 재시작을 구성하지 않으면 프로세스 충돌이나 host 재부팅 이후 가용성을 운영자가 복구해야 한다.

설치 문서의 file/process/stack 제한과 잠긴 메모리 설정은 host 운영 정책과 함께 검토한다. 안내 수치를 복사하는 작업과 해당 host의 보안 및 용량 검증을 구분한다. Agent 자원은 Project 권한과 업그레이드 창을 포함해 관리한다.

## Source 생성과 인증

현재 Source 설정 문서는 새 Source에 Foundry worker를 사용하는 절차를 제공한다. 네트워크가 직접 연결되면 direct egress를, private network 경로가 필요하면 agent proxy를 사용한다. Egress 정책 구성에는 Information Security Officer 역할이 필요하며, Source 생성 자체는 조직의 역할 기반 설정에 따라 `Create Data Connection sources` 권한을 요구할 수 있다.

원천에는 필요한 범위만 허용한 전용 service account를 쓰고, Source마다 별도 Project를 두는 구성을 권고한다. 자격 증명, egress와 driver는 연결 계약의 일부다. JDBC Source는 필요한 driver와 class를 지정하며, driver 요구를 legacy agent에만 한정하지 않는다.

서버 인증서는 신뢰할 서버를 확인하고, client certificate는 mTLS에서 클라이언트를 증명한다. Foundry worker의 인증서는 Source의 Certificates card에서 관리한다. Legacy agent worker는 agent 쪽 인증서 설정을 사용하므로 두 경로를 혼합하지 않는다.

Source preview로 연결을 검증하고 실패하면 terminal 및 egress 로그를 확인한다. 연결 성공 이후에도 sync의 schema, 데이터 선택과 실행 결과를 별도로 검증한다.

## 과거 direct connection 문서의 적용 경계

`set-up-direct-connection`은 본문에서 오래된 역사적 문서라고 명시한다. Managed SaaS와 컨테이너 가용성에 관한 당시 조건을 현재 모든 enrollment의 제한으로 사용하지 않는다. 현재 설정은 `set-up-source`를 기준으로 확인한다. 과거 문서의 dedicated service account, 네트워크 허용 범위와 Project 분리 원칙은 현재 문서와 대조해 적용한다.

## 출처

- [Palantir, Set up an agent](https://www.palantir.com/docs/foundry/data-connection/set-up-agent)
- [Palantir, Set up a source](https://www.palantir.com/docs/foundry/data-connection/set-up-source)
- [Palantir, Set up a direct connection, historical documentation](https://www.palantir.com/docs/foundry/data-connection/set-up-direct-connection)

## 관련 문서

- [[Palantir-Connection-Architecture|실행 위치와 네트워크]]
- [[Palantir-Agent-Proxy-and-Migration|Proxy 통제와 이전]]
- [[Palantir-Data-Connectivity|데이터 연결]]

공식 문서 본문을 대조했다. 실제 host 설치, 인증서 교환과 source preview는 실행하지 않았다.
