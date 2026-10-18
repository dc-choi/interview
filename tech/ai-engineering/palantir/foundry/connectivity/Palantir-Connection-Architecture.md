---
tags: [palantir, data-connection, networking, integration]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 연결의 실행 위치와 네트워크 경로

Data Connection은 외부 시스템과 다른 Foundry의 데이터를 가져오고, export와 webhook으로 외부 쓰기를 연결하는 애플리케이션이다. 원천을 가능한 그대로 수집하고 변환 이력을 Foundry 안에 두는 것이 문서의 설계 원칙이다. 자동 재시도와 상태 감시는 실패 위험을 줄이는 기능이며 모든 외부 시스템의 무결성을 보장한다는 뜻은 아니다.

## Source, worker와 capability

Source는 외부 시스템의 위치와 인증 정보를 가진 연결이다. Connector는 시스템별 연결 방식이고, worker는 연산이 실행되는 위치다. Egress policy는 도달 가능한 대상과 경로를 정한다. Capability는 해당 연결에서 수행할 수집, export, 가상화와 요청 기능이다. Connector와 worker 조합마다 사용할 수 있는 capability가 다르다.

설정 순서는 네트워크 경로 확보, source 설정, capability 설정이다. 연결을 생성했다고 특정 테이블의 동기화가 시작되지는 않는다. Agent 설치는 네트워크 운영, source는 자격 증명과 경로, sync는 데이터 선택과 실행의 책임으로 나눈다.

| 구성 | 연산 위치 | 네트워크 | 자격 증명 저장 |
| --- | --- | --- | --- |
| Foundry worker + direct policy | Foundry의 격리 컨테이너 | Foundry에서 외부 시스템으로 직접 연결 | 플랫폼의 AES-256-GCM 암호화, 플랫폼 키 |
| Foundry worker + agent proxy | Foundry의 격리 컨테이너 | Agent가 Foundry로 WebSocket을 열어 private network 경로 제공 | 플랫폼의 AES-256-GCM 암호화, 플랫폼 키 |
| Legacy agent worker | 고객 agent host | Agent가 HTTPS로 작업을 poll하고 직접 실행 | 플랫폼의 AES-128-GCM 암호문, agent에 키 보관 |

Agent proxy는 터널 역할이며 해당 host에서 데이터 변환을 수행하는 구조가 아니다. 반대로 legacy agent worker는 host에서 작업을 수행한다. Worker와 경로를 하나의 선택지로 묶으면 이 차이를 놓친다. 현재 문서는 private network에 Foundry worker + agent proxy를 권고한다.

Agent proxy policy는 Rubix 기반 enrollment에만 제공된다고 Core concepts가 명시한다. 하나의 source에 direct와 agent proxy policy를 함께 붙여 인터넷의 인증 서비스와 내부 시스템을 모두 접근하는 구성도 가능하다. 이는 각 경로의 허용 목적지를 따로 통제해야 한다는 뜻이다.

## 가용성과 운영 책임

초기 설정 문서는 source에 복수 agent를 배정하면 건강한 agent에 ingestion을 배정하는 HA를 설명한다. 비슷한 host 두 대, 모든 관련 source의 동일한 agent 쌍, 겹치지 않는 업그레이드 창을 권고한다. 이 문서는 source 생성 뒤 agent 추가 시 자격 증명을 다시 입력한다고 설명하지만, 현재 worker 비교 문서는 Foundry worker의 중앙 자격 증명 관리에서는 재입력이 필요 없다고 구분한다. 초기 안내를 모든 worker에 일괄 적용하지 않는다. [Worker 비교](https://www.palantir.com/docs/foundry/data-connection/foundry-worker-vs-agent-worker)

HA의 작업 배정 설명을 실행 중인 작업의 무중단 이관이나 exactly-once 보장으로 확대하지 않는다. 외부 시스템 접근 권한, agent host 방화벽과 Foundry egress는 각각 확인해야 한다.

## 전송 보안과 과거 파일

Connection security 문서는 TLS 1.2/1.3 cipher suite를 제공하지만 실제 사용 가능 여부는 기반 Java 버전과 환경, 연결 출발점에 의존한다고 명시한다. 서버가 협상하는 suite를 source와 같은 네트워크 경로에서 확인해야 한다. 지원 목록에 있다는 사실과 조직의 현재 보안 정책상 권장되는지는 다른 판단이다.

취약점 스캐너가 agent host의 이전 버전 파일을 보고할 수 있다. 문서는 교체된 버전을 최대 30일 보관한 뒤 정리하며, 보안 수정은 새 버전과 업그레이드 창으로 전달한다고 설명한다. 이를 모든 탐지 결과의 오탐 판정으로 사용하지 않는다. 현재 로드되는 버전과 백업 파일을 구분한 다음 조치한다.

## 출처

- [Palantir, Data Connection](https://www.palantir.com/docs/foundry/data-connection/overview)
- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/data-connection/core-concepts)
- [Palantir, Architecture examples](https://www.palantir.com/docs/foundry/data-connection/architecture)
- [Palantir, Initial setup overview](https://www.palantir.com/docs/foundry/data-connection/initial-setup-overview)
- [Palantir, Connection security](https://www.palantir.com/docs/foundry/data-connection/connection-security)

## 관련 문서

- [[Palantir-Connection-Capability-Boundaries|Capability와 코드 사용의 경계]]
- [[Palantir-Data-Connectivity|데이터 연결]]

공식 문서 계약을 대조했으며 실제 source 생성, 연결 협상과 failover는 시험하지 않았다.
