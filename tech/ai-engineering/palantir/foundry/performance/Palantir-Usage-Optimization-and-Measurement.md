---
tags: [palantir, foundry, performance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Foundry 사용량 최적화와 측정

## 목표와 지배 비용

최적화 목표를 비용, 처리 지연이나 freshness 중 구체적인 값으로 정하고 Resource Management에서 지배 비용을 확인한다. Storage만 줄였는데 compute가 대부분인 전체 비용이 거의 변하지 않는 경우처럼 병목을 잘못 고르면 작업량 대비 이득이 작다.

일반적인 사용량 축은 compute, Ontology volume과 storage지만 계정 계약의 측정 기준은 다를 수 있다. Compute-seconds를 실제 금액이나 공통 단가로 곧바로 바꾸지 않는다.

| 사용 축 | 주요 영향 |
|---|---|
| Batch compute | 실제 작업 실행 시간, 로직, 병렬화와 빈도 |
| Interactive compute | 빠른 응답을 위한 idle capacity와 실제 query |
| Streaming compute | 메시지가 없더라도 수신 준비 상태를 유지하는 시간 |
| Ontology volume | object 수, property 크기와 link metadata |
| Storage | 현재 파일뿐 아니라 브랜치와 보존된 과거 transaction/view |

DELETE transaction은 view에서 파일을 빼지만 물리 파일을 지워 storage 사용량을 바로 줄이지 않는다. 보존 정책과 실제 삭제 경계를 따로 확인한다.

## 귀속과 동시 사용량

Project를 파이프라인 단계와 운영 책임에 맞춰 구성하면 계산/저장 비용을 원인별로 추적하기 쉽다. Project 생성 권한의 축소는 교육과 조직의 접근 모델을 고려할 운영 선택이며 모든 사용자에게 적용할 보안 규칙으로 일반화하지 않는다.

Resource queue는 묶인 project들의 동시 vCPU 사용 한도를 제어한다. 동시성 한도가 일정 기간의 총 소비량이나 금액 상한을 보장하는 것은 아니다.

## 빈도와 중복을 줄인다

APPEND와 incremental 처리는 이미 처리한 입력을 다시 계산하는 양을 줄인다. 새 파일만 추가한다는 입력 계약이 필요하며 수정/삭제까지 단순 append로 처리하지 않는다. SNAPSHOT의 이전 파일도 retention 전까지 역사에 남는다.

Data Lineage의 Schedule Count와 마지막 빌드 시각으로 중복 및 불필요한 주기를 찾는다. 한 데이터셋의 반복 빌드 책임을 가능하면 한 스케줄로 모으고 connecting build를 검토한다. 사용자가 요구하는 freshness를 먼저 지킨다.

업무일만 갱신, 입력 변경 이벤트, 실패 시 하류 중단과 재시도 간격은 낭비를 줄일 수 있다. 절감 비율은 작업별 compute 비중과 실제 주기에 달려 있다. Spark 리소스와 native 실행 조정은 이들 간단한 개선 뒤 남은 병목에 적용한다.

## 출처

- [Palantir Foundry, optimizing-pipelines](https://www.palantir.com/docs/foundry/optimizing-pipelines/)
- [Palantir Foundry, overview](https://www.palantir.com/docs/foundry/optimizing-pipelines/overview/)
- [Palantir Foundry, understand-compute](https://www.palantir.com/docs/foundry/optimizing-pipelines/understand-compute/)
- [Palantir Foundry, usage-optimization](https://www.palantir.com/docs/foundry/optimizing-pipelines/usage-optimization/)

## 관련 문서

- [[Palantir-Foundry-Performance]]
