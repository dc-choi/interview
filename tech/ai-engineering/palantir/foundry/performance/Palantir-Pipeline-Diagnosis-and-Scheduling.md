---
tags: [palantir, foundry, performance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 파이프라인 실패와 스케줄 진단

## 실패 범위를 먼저 나눈다

빌드 실패, 큐 대기, 실행 중 병목과 스케줄 미발생은 서로 다른 문제다. 최근 성공 실행과 실패 실행의 입력 크기/스키마, 변환 코드, 라이브러리 버전, 스케줄 버전과 플랫폼 영향 범위를 비교한다. 코드 비교 화면이 가져온 라이브러리 변경까지 보여 주지는 않으므로 저장소 커밋과 의존성도 확인한다.

영향을 줄이는 재실행과 원인 규명은 목적을 분리한다. 스케줄의 Run Now를 사용하면 해당 스케줄의 설정과 실행 이력을 연결하기 쉽다. 개별 작업 재실행은 재현 범위를 좁히는 데 유용하지만 전체 파이프라인 재빌드의 비용과 하류 영향을 대신 설명하지 못한다.

Debug job은 당시 입력과 모듈을 재현하는 수단이다. 실행 취소 전에 driver 로그를 내려받고 필요한 실행기 스냅샷을 수집한다. 취소 후 로그를 복구할 수 있다고 가정하지 않는다. 실행 중 JVM 메모리 histogram은 GC를 유발하므로 진단 자체도 성능에 영향을 준다.

## 스케줄 상태의 해석

| 관찰 | 먼저 확인할 조건 |
|---|---|
| 실행 기록에 실패 빌드 존재 | 작업 로그, 스케줄 token mode에 따른 권한 |
| Ignored 기록 | 대상이 이미 최신인지, 대상 선택과 build type이 올바른지 |
| 기대한 시각의 기록 없음 | pause, trigger 설정, 입력 이벤트와 transaction commit |
| 일부 데이터셋만 빌드 | stale인 대상만 실행했는지, connecting build의 브랜치별 연결 대상 |
| 재시도 횟수 부족 | 재시도 가능한 실패인지, 관리자 최대 횟수 제한 |
| trashed input/output | 복원하거나 하류 의존성과 함께 스케줄/변환을 수정 |

외부 API 호출이나 sync의 실제 변화는 입력 최신성 판정에 드러나지 않을 수 있다. 이런 경우 Force Build를 검토하지만 전체 스케줄의 기본 선택으로 쓰면 불필요한 계산이 늘어난다.

Project scoped 스케줄 편집에는 대상 Edit, trigger 데이터셋 View와 scope project Edit가 필요하다. 보기와 편집/삭제/일시 중지는 같은 권한 검사가 아니다. 일부 데이터셋의 권한을 잃으면 저장 전에 그 대상을 제거해야 할 수도 있다.

## 스트림의 별도 복구 경계

시작 직후 반복 실패는 사용자 로직을, 일시적인 재시작은 인프라를 조사할 단서지만 시간만으로 원인을 확정하지 않는다. 로그, 새 입력, null/타입/산술 처리와 인프라 상태를 함께 대조한다.

start transaction RID가 현재 입력 view에 없으면 새 SNAPSHOT 등의 입력 경계를 확인한다. 스트림이 이미 내보낸 행은 실행 취소로 되돌아가지 않는다. 재배포와 replay는 checkpoint, 시작 위치와 중복 처리 계약을 검토한 뒤 결정한다.

## 출처

- [Palantir Foundry, debug-job](https://www.palantir.com/docs/foundry/optimizing-pipelines/debug-job/)
- [Palantir Foundry, debug-pipeline](https://www.palantir.com/docs/foundry/optimizing-pipelines/debug-pipeline/)
- [Palantir Foundry, debug-stream](https://www.palantir.com/docs/foundry/optimizing-pipelines/debug-stream/)
- [Palantir Foundry, troubleshoot-ooms](https://www.palantir.com/docs/foundry/optimizing-pipelines/troubleshoot-ooms/)
- [Palantir Foundry, troubleshoot-schedules](https://www.palantir.com/docs/foundry/optimizing-pipelines/troubleshoot-schedules/)

## 관련 문서

- [[Palantir-Foundry-Performance]]
