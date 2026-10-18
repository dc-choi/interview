---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Agent 권한, 업그레이드와 설치 이동

Agent 생성에는 Organization administrator, Data flows administrator 또는 Create agent workflow를 가진 custom role과 대상 project의 Editor/Owner가 필요하다. 2023-05-27 이전 enrollment의 역할 기반 생성 enforcement는 별도 opt-in 조건이 있다.

생성 후 보기/변경/삭제/worker 배정은 project 권한을 따른다. 생성 가능한 Editor가 download link 등 관리 작업까지 가능한 Owner라는 뜻은 아니다. agent를 저장할 project의 접근 범위를 함께 정한다.

## 업그레이드와 관측

upgrade window는 매주 반복되는 중단 허용 시간이며 새 버전이 있으면 coordinator가 그 안에서 재시작한다. 실행 중 job은 종료되고 새 job 시작도 일시 정지한다. window는 최소 60분이지만 실제 업그레이드가 60분 걸린다는 뜻은 아니다.

두 agent의 창을 겹치지 않게 두고 각각이 전체 workload를 감당하도록 구성한다. 이중 agent 자체를 평소 workload를 절반씩 나누는 용량 계획으로 쓰지 않는다. 단일 agent면 sync가 창 전에 끝나거나 창 종료 수분 뒤 시작하게 한다.

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

## 관련 문서

- [[Palantir-Connection-Operations]]
- [[Palantir-Agent-Worker-Runtime]]
- [[Palantir-Agent-Recovery]]
