---
tags: [infrastructure, aws, healthomics, workflow, observability]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["AWS HealthOmics Workflows", "HealthOmics 워크플로 운영"]
---

# AWS HealthOmics 워크플로 운영

HealthOmics의 private workflow는 사용자가 정의한 분석 작업을 실행하는 기능이다. Workflow는 작업 정의, run은 그 정의의 한 번 실행, task는 실행 안의 개별 프로세스다. 유전체 분석을 클라우드로 옮길 때도 실행 성공과 분석 결과의 타당성은 별도로 검증한다.

## 기존 파이프라인을 옮길 때

워크플로 정의 언어는 WDL, Nextflow와 CWL을 지원한다. 기존 shell script를 그대로 등록하는 것으로 이전이 끝나지는 않는다. 입력, 출력과 작업 의존성을 워크플로로 표현하고 각 task가 요구하는 자원을 지정한다.

다음은 이전 검증을 위한 적용 제안이다.

1. 입력 자료와 도구 버전을 고정한 작은 기준 데이터를 정한다.
2. 기존 파이프라인과 새 workflow의 중간 산출물, 최종 결과를 비교한다.
3. 실패 task의 로그를 보고 정의와 실행 환경 문제를 분리한다.
4. 결과 동등성을 확인한 뒤 자원과 동시 실행 수를 조정한다.

AI로 정의 파일을 변환하더라도 결과 비교는 남는다. 특정 사례의 처리 시간이나 비용 절감률을 다른 데이터 크기와 파이프라인의 보장값으로 쓰지 않는다.

## 생성, 서열 설계와 구조 예측을 분리한다

2026-10-09 AWS의 공개 설계 사례와 HealthOmics 제품 자료 대조 기준이다. 단백질 설계 파이프라인은 하나의 모델 호출이 아니라 산출물이 다른 여러 작업의 연결로 볼 수 있다.

| 단계 예시 | 산출물과 다음 단계의 입력 |
| --- | --- |
| RFdiffusion 등으로 구조 생성 | 설계 조건을 반영한 구조 후보 |
| ProteinMPNN 등으로 서열 설계 | 구조 후보에 대응하는 아미노산 서열 |
| AlphaFold, ESMFold 등으로 구조 예측과 평가 | 후보의 예측 구조와 평가 결과 |

이는 공개된 파이프라인의 예시이며 모든 HealthOmics workflow의 필수 모델 조합이나 기본 내장 구성을 뜻하지 않는다. 후보마다 병렬 분기하거나 평가 뒤 다시 설계하는 흐름도 가능하므로, task의 입력과 출력 및 반복 조건을 명시한다.

재현성 점검에서는 결과에 사용한 입력, 모델 버전, 매개변수와 workflow 구성을 연결해 남긴다. 위 표의 예측 결과는 계산상 후보 선별 자료이며 실험실 검증 결과와 구분한다. 실행 완료, 예측 점수와 실제 실험 결과를 서로 다른 상태로 관리하는 것은 이 구분에서 도출한 운영 제안이다.

## 상태 이벤트와 업무 완료를 나눈다

HealthOmics는 run과 task의 상태 변화를 EventBridge로 전달한다. 완료, 실패와 취소 상태에 맞춰 후속 처리를 연결할 수 있지만, **HealthOmics에서 EventBridge로의 전달은 best effort**다. 이벤트 도착만을 유일한 완료 확인 경로로 두지 않는다.

운영 설계에서는 다음 경계를 둔다.

- 분석 요청과 HealthOmics 실행을 연결해 추적한다.
- 완료 이벤트를 받으면 `GetRun`으로 현재 상태를 확인하고 S3 결과를 검토한 뒤 업무 DB 반영과 알림을 수행한다.
- 이벤트가 오지 않은 장기 미완료 요청은 `GetRun` 조회로 보완한다.
- 재조회나 후속 처리 재시도에도 DB 반영과 알림이 중복되지 않도록 멱등성을 둔다.

이 절의 후속 처리 방식은 best effort 전달 특성에서 도출한 설계 제안이다. 서비스의 `COMPLETED` 상태가 애플리케이션 DB 반영이나 사용자 알림 성공까지 보장하지는 않는다.

## 로그로 원인과 자원 사용을 나눈다

기본적으로 run 로깅은 켜져 있지만 `StartRun`에서 `LogLevel=OFF`로 끌 수 있다. 실제 실행 설정을 확인한다.

| 로그 | 확인할 것 |
|---|---|
| Engine logs | 워크플로 엔진과 정의 파일 문제 |
| Run logs | 전체 상태와 task 시작, 종료, 파일 반입과 반출 |
| Task logs | 개별 작업이 출력한 진단 정보 |
| Run manifest logs | task 상태, 실패 이유, CPU와 메모리 예약량 및 사용량 |

Run manifest는 실행 완료 후 확인하고 자원 조정의 근거로 쓴다. Task 내부의 상세 정보는 코드가 실제로 남긴 로그에 달려 있다. 관리형 실행 환경이 업무 진단 정보를 자동으로 만들어 주지는 않는다.

Run group으로 동시 실행과 자원 사용에 상한을 둘 수 있다. 자원 최적화는 workflow가 안정된 뒤 진행하고, 작은 입력만으로 정한 자원량이 큰 입력에서도 충분한지 확인한다. 병렬 실행이 가능하다는 사실을 무제한 자원이나 일정한 처리 시간으로 해석하지 않는다.

## 출처

- [How Evolvere Biosciences performs macromolecule design on AWS — AWS HPC Blog](https://aws.amazon.com/blogs/hpc/how-evolvere-biosciences-performs-macromolecule-design-on-the-aws-cloud/)
- [Drug Discovery — AWS HealthOmics](https://aws.amazon.com/healthomics/drug-discovery/)
- [AWS HealthOmics, Private workflows in HealthOmics](https://docs.aws.amazon.com/omics/latest/dev/private-workflows.html)
- [AWS HealthOmics, Task lifecycle in a HealthOmics run](https://docs.aws.amazon.com/omics/latest/dev/workflow-run-tasks.html)
- [AWS HealthOmics, Using EventBridge with AWS HealthOmics](https://docs.aws.amazon.com/omics/latest/dev/eventbridge.html)
- [AWS HealthOmics, Get run information](https://docs.aws.amazon.com/omics/latest/dev/getinfo-about-runs.html)
- [AWS HealthOmics, Monitoring HealthOmics with CloudWatch Logs](https://docs.aws.amazon.com/omics/latest/dev/monitoring-cloudwatch-logs.html)
- [AWS HealthOmics, Run optimization for a private HealthOmics workflow](https://docs.aws.amazon.com/omics/latest/dev/workflows-run-optimize.html)

## 관련 문서

- [[EventBridge|상태 이벤트 라우팅]]
- [[CloudWatch|로그와 지표 관측]]
- [[S3|분석 입력과 출력 저장]]
- [[Cloud-Migration-Strategies|클라우드 전환 범위와 검증]]
