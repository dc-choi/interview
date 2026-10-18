---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Agent 번역 alias와 역사적 migration 범위

아래 10개 영어 canonical 주소는 확인일 본문을 확보하지 못해 공개 한국어 alias 본문을 읽었다. 모든 페이지에 AIP 번역이 검증되지 않았다는 경고가 있다. 번역을 현재 영어 계약을 직접 확인한 근거로 취급하지 않는다. 실제 최신 설정은 [[Palantir-Agent-Lifecycle]], [[Palantir-Agent-Proxy-TLS]], [[Palantir-Agent-Worker-Runtime]]과 해당 영어 source를 우선한다.

## 권한, monitoring과 certificate

agent-permissions는 조직 역할+project Editor/Owner, 생성 후 project 기반 접근을 설명한다. 번역의 그룹 관리자 표현은 현재 영어의 Organization administrator와 대조하고 제품 UI 명칭으로 추정해 통일하지 않는다.

agent-monitoring은 OS/heap/queue/heartbeat와 earliest certificate expiry를 설명한다. 예전 UI의 Metrics→Monitoring 경로와 현재 Data Health monitoring view 경로가 다를 수 있다. 번역의 예전 monitoring link를 현재 기능 증거로 보지 않는다.

add-certificates는 custom truststore면 UI가 자동 관리하지 않는 조건, 인증서를 PEM export 후 UI로 옮기고 default `var/conf/trustStore.jks`로 복귀하는 migration을 설명한다. `jdk/zulu*`는 번역의 예전 설치 경로이며 현재 영어의 Corretto 경로와 다르다.

## driver와 proxy

add-drivers는 signed JAR, driver class당 하나, restart 필요와 license 때문에 모든 driver를 bundle하지 않는 이유를 설명한다. agent-worker 한정 조건이며 현행 Foundry worker가 unsigned driver를 받는 계약까지 금지하는 규칙이 아니다.

proxy-configuration은 Manager runtime.yml과 Bootstrapper proxy가 coordinator용이며 source JVM proxy와 다르다는 점을 설명한다. http:// 없는 host와 agent 전체 outbound 영향도 확인했다. 현재 영어의 nonProxyHosts/egress policy와 함께 읽는다.

## upgrade와 설치

automatic-upgrades는 최소 60분 weekly window, job 종료와 두 agent 창 분산을 설명한다. installing-on-windows는 SYSTEM/최고 권한/5분 반복과 Start in 경로를 안내하지만 현재 영어의 startup 3분 지연/table-export 미지원 같은 추가 조건을 모두 담지는 않는다.

move-agent-directory는 running sync 종료, 절대 경로 수정과 stop/move/start를 설명한다. 현재 영어에 추가된 auto-restart 해제/복원과 source encryption key 보존까지 이 짧은 번역 절차가 대신하지 않는다.

## switching과 Rubix

switching-source-runtime은 source detail에서 direct-cloud migration을 시작하고 healthy representative agent로 secret/driver를 가져와 egress를 구성하는 예전 workflow다. egress 생성 권한, UnknownHost/driver missing/PKIX 오류를 구별하고 되돌릴 수 있다고 설명한다. 실제 현재 UI에서 실행 검증한 결과는 아니다.

rubix-migration은 Palantir-provisioned AWS agent를 2023-08까지 옮기는 역사적 Upgrade Assistant 변화다. 고객 하드웨어의 agent까지 전부 폐지한다는 현재 정책으로 읽지 않는다. Rubix 미지원 enrollment 제외와 자체 host agent 대안도 원문에 있다.

번역은 direct connection이 주간 agent maintenance를 제거한다는 장점을 설명하지만 현재 streaming worker의 주기적 restart까지 사라지는 무중단 보장으로 확대하지 않는다. 각 workflow/runtime의 현재 중단 조건을 함께 확인한다.

## 출처

- [Palantir, agent-monitoring (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/agent-monitoring/)
- [Palantir, agent-permissions (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/agent-permissions/)
- [Palantir, add-certificates (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/add-certificates/)
- [Palantir, add-drivers (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/add-drivers/)
- [Palantir, automatic-upgrades (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/automatic-upgrades/)
- [Palantir, switching-source-runtime (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/switching-source-runtime/)
- [Palantir, move-agent-directory (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/move-agent-directory/)
- [Palantir, installing-on-windows (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/installing-on-windows/)
- [Palantir, proxy-configuration (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/proxy-configuration/)
- [Palantir, rubix-migration (한국어 기계번역)](https://palantir.com/docs/kr/foundry/data-connection/rubix-migration/)

## 관련 문서

- [[Palantir-Connection-Operations]]
