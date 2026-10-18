---
tags: [palantir, data-connection, agent-proxy, migration]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Agent proxy 통제와 worker 이전

Agent proxy는 Foundry worker가 private network에 접근하는 경로다. Legacy agent worker처럼 host에서 capability를 실행하는 방식과 구분한다. 아래는 공식 문서 계약이며 실제 네트워크 설정이나 이전을 수행한 기록은 아니다.

## 통제 계층의 편집 권한

Source에 설정한 hostname과 port로만 proxy 연결을 허용하는 통제는 필수다. 다른 대상으로 연결하면 문서상 HTTP 403을 반환한다. 그러나 source에 agent를 배정할 수 있는 사용자가 다른 목적지의 source를 만들 수 있다면 이 통제만으로 agent host의 모든 reachable system을 보호하지 못한다. 문서는 그 권한을 가진 사람을 해당 네트워크 접근에 신뢰해야 한다고 설명한다.

추가로 Foundry의 agent CIDR/port allowlist, host 로컬 allowlist와 host 방화벽을 둔다. Foundry allowlist는 agent resource owner, 로컬 파일은 SSH 접근 주체가 편집한다. 로컬 `agentProxyConfig/agentProxyConfig.yml`과 부모 경로는 agent가 쓰지 못하게 해야 한다. 파일이 존재하는데 agent가 수정 가능한 상태면 proxy 기능을 실행하지 않는다고 명시한다.

연결 풀의 기본값은 `maxConnections: 300`, `coreConnections: 20`이다. 문서의 설정 예시 250/100은 기본값이 아니다. 동시 연결이 많은 connector의 pool exhaustion을 조사할 때 외부 시스템 제한과 함께 확인한다. [Agent proxy configuration](https://www.palantir.com/docs/foundry/data-connection/agent-proxy)

## Worker 이전의 실제 변경

Foundry worker는 capability별 컨테이너를 사용하므로 agent JVM heap을 공동으로 경쟁하는 구조에서 벗어난다. 비교 문서의 성능과 안정성 설명은 설계상 장점이며 모든 워크로드의 실측 개선을 보장하지 않는다. Agent proxy를 사용하면 사내 agent가 연결을 시작하는 네트워크 모델은 유지되지만 연산과 자격 증명 관리 위치가 달라진다.

이전 wizard에는 건강한 기존 agent와 egress 정책 관리 권한이 필요하다. 대표 agent에서 secret과 인증서, 필요하면 JDBC driver를 가져오고 새 egress policy를 지정한다. 인증서는 agent 전체 설정 대신 source에 적용한다. 수동 전환에서는 secret 자동 이전이 없으므로 다시 입력해야 한다.

이전 완료 시 실행 중 sync/export/task는 종료된다. 예약 작업은 다음 일정부터 새 worker에서 실행하지만 비예약 작업은 수동으로 재시작해야 한다. 따라서 이전 가능하다는 사실을 무중단 전환으로 설명하지 않는다.

## 30일 복귀 창

문서는 이전 후 30일 동안 이전 agent worker 설정으로 되돌릴 수 있다고 설명한다. 복귀는 자격 증명을 포함한 연결 설정을 이전 시점으로 돌리므로 그 이후 변경이 사라진다. 비예약 작업 재시작도 필요하다.

다만 이전 후 성공적으로 시작된 작업은 복귀해도 migrated settings로 완료될 때까지 실행된다고 명시한다. 복귀 버튼을 누른 순간 모든 실행이 옛 설정으로 통일된다고 가정하지 않는다. 예약 작업은 다음 실행에서 이전 설정을 사용한다.

문서는 기존 agent worker를 legacy이지만 fully supported로 설명한다. 새로운 capability 개발이 Foundry worker 중심이라는 설명과 기존 작업의 즉시 지원 종료를 구분한다.

## 실패를 나누어 확인한다

- `UnknownHostException`: source의 egress policy와 실제 endpoint 접근 경로를 확인한다.
- `Driver class not found`: 해당 JDBC source에 driver가 올라갔는지 확인한다.
- `PKIX path building failed`: source에 필요한 인증서가 적용됐는지 확인한다.
- Source subtype을 해석하지 못하는 오류: connector의 인증서, proxy와 driver 같은 의존 설정을 확인한다.

위 항목은 공식 문제 해결 제안이며 해당 오류의 모든 원인을 단정하는 규칙은 아니다.

## 출처

- [Palantir, Agent proxy configuration reference](https://www.palantir.com/docs/foundry/data-connection/agent-proxy)
- [Palantir, Foundry worker vs. agent worker](https://www.palantir.com/docs/foundry/data-connection/foundry-worker-vs-agent-worker)

## 관련 문서

- [[Palantir-Connection-Architecture|실행 위치와 네트워크]]
- [[Palantir-Data-Connectivity|데이터 연결]]
