---
tags: [observability, logging, aws, opensearch, centralized-logging]
status: done
verified_at: 2026-07-15
category: "관측가능성(Observability)"
aliases: ["Centralized Logging with OpenSearch", "AWS OpenSearch 중앙 로깅"]
---

# AWS Centralized Logging with OpenSearch

Centralized Logging with OpenSearch는 AWS 서비스와 애플리케이션 로그의 수집, 처리, OpenSearch 색인, 대시보드 생성을 자동화하는 **배포형 AWS Solution**이다. Amazon OpenSearch Service 자체 기능이나 완전 관리형 단일 서비스가 아니라, CloudFormation으로 여러 AWS 리소스를 사용자 계정에 구성하는 참조 구현이다.

> [!warning] 현재 상태
> 2026-07-11 기준 최신 공식 표기는 v2.4.13이고, AWS는 이 솔루션을 **2026년 12월에 종료**할 예정이다. 기존 배포는 계속 동작하지만 이후 유지보수와 AWS API 변화 대응은 사용자가 맡는다. 따라서 신규 장기 표준으로 채택하기보다 구조 학습과 기존 배포 운영에 활용하고, 신규 설계에서는 AWS가 안내하는 CloudWatch unified data and telemetry와 직접 구성한 OpenSearch Ingestion 경로도 비교한다.

## 자동화하는 범위

- EC2와 EKS에 AWS for Fluent Bit 배포 또는 설정
- AWS 서비스 로그 위치 탐지와 수집 파이프라인 생성
- 로그 파싱, 정리, 보강과 OpenSearch index 설정
- 선택적 S3 또는 Kinesis Data Streams buffer 구성
- 처리 실패 로그를 위한 S3 Backup Bucket
- 지원 로그 유형의 dashboard template과 pipeline alarm
- 같은 Region의 다른 AWS account에서 로그 수집

OpenSearch domain은 자동으로 생성하지 않는다. 이미 존재하는 VPC domain을 솔루션에 import해 sink로 등록한다. Import는 데이터를 옮기는 작업이 아니라 domain metadata와 network 경로를 솔루션에 연결하는 작업이다.

## 제어 평면과 데이터 평면

두 평면을 구분해야 아키텍처를 오해하지 않는다.

### 제어 평면

| 구성요소 | 역할 |
|---|---|
| CloudFront와 S3 | 관리 웹 UI 배포 |
| Cognito 또는 OIDC | 콘솔 사용자 인증 |
| AppSync | 관리용 GraphQL API |
| DynamoDB | domain, source, pipeline 설정 저장 |
| Lambda | pipeline과 agent 관리 로직 |
| Step Functions와 CloudFormation | source별 stack 생성과 삭제 조정 |
| Systems Manager | EC2의 Fluent Bit 설치와 설정 관리 |

이 구성요소는 파이프라인을 **만드는 경로**다. 모든 로그 이벤트가 AppSync나 DynamoDB를 거치는 것은 아니다.

### 데이터 평면

소스와 processor 선택에 따라 실제 로그 경로가 달라진다.

```text
Application -> Fluent Bit -> [S3 | Kinesis | None]
            -> [Lambda | OpenSearch Ingestion] -> OpenSearch

AWS Service -> [S3 | CloudWatch Logs | Kinesis | service API]
            -> [EventBridge | SQS | Firehose]
            -> [Lambda | OpenSearch Ingestion] -> OpenSearch
```

실패 레코드는 S3 Backup Bucket으로 이동할 수 있지만 자동 복구되는 것은 아니다. 오류를 고친 뒤 범위를 정해 다시 처리해야 한다.

## 지원 소스와 경로

공식 지원 AWS 서비스는 CloudTrail, S3 access log, RDS와 Aurora MySQL log, CloudFront, ALB, WAF, Lambda, VPC Flow Logs, AWS Config다. 애플리케이션 로그 소스는 EC2 instance group, EKS, S3, Syslog다.

| 로그 유형 | 대표 경로 | 주의점 |
|---|---|---|
| ALB access log | ALB -> S3 -> processor -> OpenSearch | access logging은 opt-in이며 전달은 best effort다 |
| Lambda log | CloudWatch Logs -> Data Firehose -> S3 -> processor | 작은 레코드의 Firehose 과금 단위를 확인한다 |
| RDS/Aurora MySQL log | CloudWatch Logs 또는 service API -> S3 -> processor | engine 설정과 솔루션 버전에 따라 경로가 달라진다 |
| CloudFront real-time log | Kinesis Data Streams -> Lambda -> OpenSearch | 이 경로는 cross-account 수집 예외가 있다 |
| EC2와 EKS app log | Fluent Bit -> optional buffer -> processor | agent의 retry, buffer, drop도 감시한다 |

ALB 파일은 각 node가 보통 5분 주기로 만들지만 도착이 정확히 5분 안에 끝난다고 가정하면 안 된다. RDS도 general, slow, audit log가 자동 생성되는 것이 아니므로 parameter, option, export 설정부터 확인한다.

## S3, Kinesis, None 선택

애플리케이션 로그 생성 화면의 선택지는 S3, Kinesis Data Streams, None이다. Direct라는 표현은 현재 UI의 None에 해당하는 개념 설명이다.

| 선택 | 특성 | 선택 기준 |
|---|---|---|
| S3 | 분 단위 지연, 원본 보존과 대량 replay에 유리 | 비용과 내구성 우선 |
| Kinesis Data Streams | 초 단위 지연, retention 범위 안에서 replay | 실시간성과 지속 처리량 우선 |
| None | 가장 짧은 경로지만 OpenSearch 장애와 429가 source에 전파 | 로그량이 작고 유실 위험을 수용할 때만 |

공식 기본 flush 값은 버전에 따라 바뀔 수 있으므로 설계 계약으로 외우지 않는다. 중요한 값은 허용 지연, peak 처리량, buffer 보존 시간, 최대 backlog, replay 시간이다. 공통 원리는 [[Log-Pipeline]]을 따른다.

## OpenSearch Engine과 Light Engine

- **OpenSearch Engine**은 실시간에 가까운 full-text 검색과 반복적인 대화형 분석에 적합하다.
- **Light Engine**은 S3, Glue, Athena를 중심으로 구조화된 저빈도 로그를 SQL 방식으로 분석한다.

모든 로그를 OpenSearch hot storage에 넣는 대신 자주 검색하는 데이터만 OpenSearch에 두고, 장기 또는 저빈도 로그는 Light Engine이나 S3에 두는 방식으로 비용을 나눌 수 있다. 선택은 검색 빈도, 허용 지연, full-text 필요성, 보존 기간으로 결정한다.

Dashboard template도 engine별로 다르다. OpenSearch Engine은 pipeline 생성 시 `Sample dashboard`를 선택하면 OpenSearch Dashboards template을 만들고, Light Engine은 Grafana template을 사용한다.

## Account와 Region 경계

- Main account에 솔루션 콘솔과 분석 engine을 둔다.
- 같은 Region의 member account에서 AWS service와 application log를 수집할 수 있다.
- 다른 Region 수집은 자동화되지 않는다. S3 source는 Cross-Region Replication 후 manual mode로 연결할 수 있다.
- EC2와 EKS의 cross-Region 수집은 network와 agent를 직접 구성해야 한다.
- source, solution, domain의 VPC 연결과 IAM role 신뢰 관계를 함께 검증한다.

Cross-account 지원은 모든 경로가 같은 보장을 가진다는 뜻이 아니다. 소스별 예외와 Region 조건을 공식 지원 표에서 다시 확인한다.

## Domain과 dashboard 접근

Import할 domain은 현재 공식 가이드상 VPC 내부, fine-grained access control 활성화, OpenSearch 1.3 이상이어야 한다. 솔루션 VPC와 domain VPC가 다르면 automatic VPC peering 또는 직접 구성한 peering과 Transit Gateway 경로가 필요하다.

Access Proxy는 public network에서 OpenSearch Dashboards에 들어가야 할 때만 쓰는 선택 기능이다.

```text
DNS -> internet-facing ALB -> NGINX Auto Scaling Group -> OpenSearch Dashboards
```

- VPN이나 private network에서 domain VPC에 접근할 수 있으면 proxy가 필요 없다.
- 운영 환경은 소유한 domain, DNS record, ACM certificate를 사용한다.
- hosts 파일 수정과 private certificate 경고 무시는 workshop 편법이지 운영 패턴이 아니다.
- Access Proxy는 EC2, EBS, ALB 비용과 별도의 공격 표면을 추가한다.

## 안정적인 구축 순서

1. 종료 일정과 대안을 고려해 이 솔루션을 계속 쓸지 결정한다.
2. 일일 로그량, peak, 검색 기간, archive 기간, 허용 지연을 계산한다.
3. VPC, FGAC, encryption, ISM이 구성된 OpenSearch domain을 준비한다.
4. Cognito 또는 OIDC 방식으로 solution stack을 배포한다.
5. Domain을 import하고 processing network에서 HTTPS 연결을 검증한다.
6. 소스별 로그 생성을 먼저 활성화하고 원본 위치에서 실제 이벤트를 확인한다.
7. Service 또는 Application pipeline과 buffer, processor, dashboard를 만든다.
8. 식별 가능한 synthetic event를 보내 각 경계를 순서대로 확인한다.
9. source, agent, buffer, processor, OpenSearch, dashboard의 alarm을 연결한다.
10. 목적지 중단, parser 실패, replay, 삭제를 staging에서 연습한다.

## End-to-end 검증

대시보드가 비어 있다고 즉시 pipeline 실패로 판단하지 않는다.

- Source: ALB의 S3 object, RDS의 CloudWatch log 또는 service log가 생성됐는가
- Agent: Fluent Bit의 sent, retry, dropped record가 정상인가
- Buffer: S3 object나 Kinesis incoming record와 consumer lag가 보이는가
- Queue: SQS oldest age와 DLQ가 증가하는가
- Processor: loaded, failed, duration, throttle 지표가 정상인가
- Sink: 예상 index와 document count가 증가하고 mapping 오류나 429가 없는가
- Query: UTC event time, service, request path로 synthetic event를 찾을 수 있는가
- Dashboard: index pattern과 time range가 맞는가

Pipeline이 만든 리소스는 CloudFormation stack으로 관리되므로 AWS 콘솔에서 수동 수정하면 drift가 생긴다. 설정이 어긋난 pipeline은 개별 리소스를 고치기보다 pipeline을 삭제하고 다시 생성하는 편이 안전하다.

## 삭제와 비용 통제

Main stack을 먼저 삭제하면 pipeline stack이 사용하는 IAM role이 사라져 정리가 실패할 수 있다.

1. Application ingestion을 제거하고 EC2와 EKS agent를 중지한다.
2. Application pipeline과 Service pipeline을 삭제한다.
3. Access Proxy, pipeline alarm, 별도 network 연결을 삭제한다.
4. Domain을 solution에서 remove한다. 이 작업은 실제 domain을 삭제하지 않는다.
5. Producer의 log destination을 끄거나 바꾸고 solution 소유 S3 bucket을 보존 정책에 따라 비운다.
6. Main solution stack을 삭제한다.
7. OpenSearch domain, 잔여 S3 bucket, CloudWatch Logs group, Kinesis, snapshot은 각 수명주기에 따라 별도로 정리한다.

ALB 같은 producer가 사용하는 bucket을 먼저 삭제하면 계속 전달 실패가 발생한다. source의 log destination을 끄거나 바꾼 뒤 bucket을 정리한다. 고정된 일 비용을 재사용하지 말고 Region, 수집량, OpenSearch node와 storage, Firehose, Kinesis, Lambda 또는 OSI, S3, Access Proxy를 합산한다.

## 관련 문서

- [[Log-Pipeline|중앙 집중식 로그 파이프라인]]
- [[OpenSearch-Service|Amazon OpenSearch Service]]
- [[OpenSearch-Observability|OpenSearch 기반 통합 관측성]]
- [[OpenSearch-Index-Lifecycle|OpenSearch index lifecycle]]
- [[OpenSearch-Security-Production|OpenSearch 보안]]
- [[CloudWatch-Logs-Alarms|CloudWatch Logs와 Alarms]]
- [[PII-Masking|PII 마스킹]]
- [[Kinesis|Amazon Kinesis]]

## 출처

- [Centralized Logging with OpenSearch - AWS Solutions](https://docs.aws.amazon.com/solutions/centralized-logging-with-opensearch/)
- [Solution overview - AWS Documentation](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/solution-overview.html)
- [Architecture details - AWS Documentation](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/architecture-details.html)
- [Service log analytics pipeline - AWS Documentation](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/service-log-analytics-pipeline.html)
- [Application log analytics pipeline - AWS Documentation](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/application-log-analytics-pipeline.html)
- [Supported AWS services - AWS Documentation](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/supported-aws-services.html)
- [Getting started - AWS Documentation](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/getting-started.html)
- [Uninstall the solution - AWS Documentation](https://docs.aws.amazon.com/solutions/latest/centralized-logging-with-opensearch/uninstall-the-centralized-logging-with-opensearch.html)
- [AWS OpenSearch 기반 중앙집중식 로그 수집과 분석 - YouTube](https://www.youtube.com/watch?v=EIELtPoSMKI)
- [AWS OpenSearch 중앙 집중식 로그 수집 실습 - YouTube](https://www.youtube.com/watch?v=gXpen0pSdPE)
