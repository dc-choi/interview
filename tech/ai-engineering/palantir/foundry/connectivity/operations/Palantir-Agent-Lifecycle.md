---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-11-25
category: "AI엔지니어링(AIEngineering)"
---

# Agent 권한, 업그레이드와 설치 이동

Agent 생성에는 두 조건이 모두 필요하다. 하나는 **Create Data Connection agents** workflow를 포함한 조직 역할이다. Organization administrator와 Data flows administrator 역할에는 기본으로 들어 있고, custom role에 더할 수도 있다. 다른 하나는 agent를 저장할 Project의 Editor 또는 Owner 역할이다. 2023-05-27 이전에 프로비저닝된 enrollment는 이 workflow를 요구하지 않을 수 있고, 이런 enrollment의 문의는 Palantir Support가 받는다. 이때 **Change agent creation authentication method** workflow를 가진 사용자가 Control Panel에서 이 요구를 강제할 수 있으며, Organization administrator 역할에는 이 workflow가 기본으로 들어 있다.

생성 뒤 agent에 할 수 있는 일은 agent가 든 Project의 역할이 정한다. 아래는 기본 역할 기준이며 custom role을 쓰는 조직은 다를 수 있다. 상위 역할은 하위 역할의 권한을 모두 포함한다.

| Project 역할 | agent에 대한 권한 |
| --- | --- |
| Viewer | 상태, health, metric, 설정, event history와 upgrade window 보기 |
| Editor | Source에 배정, plugin과 driver 추가와 제거, 설정과 upgrade window 변경, 재시작과 중지, 삭제 |
| Owner | 인증서 추가와 제거, download link나 새 token 생성, secure tunnel initiator 배포 |

Project 역할이 Editor뿐이면 그 Project에 agent를 만들 수는 있지만 설치에 필요한 download link는 만들 수 없다. 따라서 기본 역할 기준으로는 생성과 설치를 한 사람이 끝내려면 Owner가 필요하다. Editor는 agent를 새 Source에 배정하고 설정을 바꿀 수 있으므로, agent가 든 Project의 Editor와 Owner는 agent 관리를 맡길 수 있는 사용자에게만 준다. Source와 plugin 쪽 권한은 [[Palantir-Data-Connection-Permissions|Data Connection 권한]]을 본다.

## 업그레이드와 관측

upgrade window는 매주 반복되는 중단 허용 시간이며 새 버전이 있으면 coordinator가 그 안에서 재시작한다. 실행 중 job은 종료되고 새 job 시작도 일시 정지한다. window는 최소 60분이지만 실제 업그레이드가 60분 걸린다는 뜻은 아니다.

원문은 모든 source에 agent를 둘 이상 배정하고 upgrade window를 엇갈리게 두라고 권하며, 한 agent가 업그레이드하는 동안 중단된 job은 짝 agent에서 재시도된다. 이 때문에 각 agent가 전체 workload를 감당하도록 구성하고, 이중 agent를 평소 workload를 절반씩 나누는 용량 계획으로 쓰지 않는다(이 문서의 설계 해석). 단일 agent면 sync가 창 전에 끝나거나 창 종료 수분 뒤 시작하게 한다.

OS memory/disk/load/CPU, heap/threads/uptime, queue/running job/duration/upload, heartbeat와 version stale time을 함께 본다. certificate expiration은 keystore/truststore에서 가장 먼저 만료되는 인증서까지의 시간이다. 만료됐으면 000ms, 인증서가 없으면 빈 그래프다.

version stale time은 현재 환경의 최신 release와 마지막 업데이트 시점 차이다. 새 release 직후 아직 upgrade window가 오기 전에 alert가 생길 수 있으므로 실행 실패라고 바로 결론 내리지 않는다. Data Health monitoring view에서 severity와 구독자를 구성한다.

## 재설치와 host 이동

공개 절차를 학습한 것이며 실제 agent를 중지, 이동하거나 삭제한 기록은 아니다. 재설치 전 기존 agent와 auto-restart를 멈추고 directory를 백업한다. `var/data/source-encryption-key`와 `.private`를 보존해 새 설치로 옮기지 않으면 기존 source credential을 재입력해야 한다.

같은 host의 directory 이동은 running sync 종료, 절대 경로(특히 Kerberos) 변경, UI/host 정지와 auto-restart 해제, 잔여 Java 확인, 이동, 재시작과 auto-restart 복원을 순서대로 수행한다. 5분 뒤 UI와 실제 sync를 확인한다.

새 host는 같은 OS 계열/architecture와 네트워크 조건이 필요하다. Linux→Windows나 x86→ARM 이동은 directory 복사 절차를 재사용하지 않고 새 install bundle을 얻는다. 외부 파일 참조도 옮기고 경로를 바꾼다.

## Windows와 cache

Linux가 권장되며 Windows agent의 table export는 지원하지 않는다고 현재 문서가 명시한다. Task Scheduler는 SYSTEM, 로그인과 무관한 실행, highest privileges, startup 3분 지연 및 5분 반복을 구성한다. 배치 파일의 Start in 경로는 상대 경로 때문에 필수다.

backup/cache는 사용하지 않는 이전 버전과 실행 중 directory를 구분한다. 기본 30일/최근 inactive 10개 보존과 저용량 정리가 있으며 maintenance window 밖에 정리한다. `init.sh status`로 현재 process directory를 확인하고 실행 중 파일을 지우지 않는다. host crash의 잔여 cache는 암호화되며 해당 process의 메모리 key는 사라진다는 원문 조건도 확인한다.

## 출처

- [Palantir, agent-configuration-reference](https://www.palantir.com/docs/foundry/data-connection/agent-configuration-reference)
- [Palantir, agents-troubleshooting](https://www.palantir.com/docs/foundry/data-connection/agents-troubleshooting)

## 관련 문서

- [[Palantir-Connection-Operations]]
- [[Palantir-Agent-Worker-Runtime]]
- [[Palantir-Agent-Recovery]]
- [[Palantir-Data-Connection-Permissions]]
