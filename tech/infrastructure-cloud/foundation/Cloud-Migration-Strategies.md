---
tags: [infrastructure, cloud, migration, modernization, rehost, replatform, refactor, twelve-factor]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Cloud Migration Strategies", "클라우드 전환 전략", "클라우드 마이그레이션 전략", "7 Rs", "Rehost Replatform Refactor"]
verified_at: 2026-09-30
---

# 클라우드 전환 전략

클라우드 전환은 마이크로서비스 전환과 같은 말이 아니다. workload마다 어디로 옮기고 애플리케이션을 어디까지 바꿀지를 정하는 일이며, 모놀리스도 VM 이전, container화, managed service와 CI/CD 도입만으로 배포 속도와 탄력성을 상당히 얻을 수 있다. 서비스 분해는 그중 일부 workload에만 고르는 선택지다.

| 질문 | 다루는 문서 |
|---|---|
| workload를 어디로, 어느 수준까지 바꿔 옮길까 | 이 문서 |
| 옮기는 동안 기존 기능을 어떤 순서로 끊고 교체할까 | [[Legacy-Modernization-Strategies]] |
| 서비스로 나눌 준비가 됐는가 | [[Microservice-Readiness-and-Maturity]] |
| 옮긴 뒤 누가 무엇을 관리하나 | [[Cloud-Service-Models]] |

## 전환 유형: 같은 이름이 벤더마다 다른 범위를 가리킨다

2026-09-30 기준 AWS Prescriptive Guidance는 7 Rs, Microsoft Cloud Adoption Framework(CAF)는 8개 전략으로 나눈다.

| 하는 일 | AWS | Microsoft CAF | 바뀌는 범위 |
|---|---|---|---|
| 가치가 없는 workload 종료 | Retire | Retire | 없음 |
| 원래 환경에 유지 | Retain | Retain | 없음 |
| 서버를 그대로 옮김(lift and shift) | Rehost | Rehost | 코드 변경 거의 없음 |
| 가상화 platform째 클라우드의 같은 platform으로 옮기거나 다른 VPC, Region, account로 이동 | Relocate | 별도 항목 없음 | 구조 변경 없음 |
| 다른 제품이나 SaaS로 교체 | Repurchase(drop and shop) | Replace | 제품 교체 |
| managed service나 container로 옮기며 일부 최적화(lift, tinker and shift) | Replatform | Replatform | 코드 변경 적음 |
| 외부 동작은 유지하고 기술 부채를 줄이거나 클라우드에 맞게 코드 수정 | 별도 항목 없음. 변경 정도에 따라 Replatform이나 Refactor or re-architect | Refactor | 코드 |
| cloud-native 기능을 쓰도록 구조를 바꾸고 서비스를 분해 | Refactor or re-architect | Rearchitect | 구조 |
| cloud-native로 새로 개발 | 별도 항목 없음. Refactor or re-architect에 가까움 | Rebuild | 전면 재개발 |

- 강의를 비롯한 일부 자료는 container화, CI/CD와 수평 확장 준비를 Refactor라 부른다. 현재 AWS는 코드 변경 없이 VM을 container로 옮기는 일을 Replatform 사례로 들고, Microsoft CAF도 앱 container화를 Replatform 지표로 둔다. 계획서에는 전략 이름과 함께 바뀌는 범위(코드, 구조, 실행 platform)를 적어 견적과 책임 범위의 오해를 막는다.
- AWS 대규모 이전 가이드는 이전 중 현대화를 함께 하는 Refactor가 가장 복잡하다며 large migration에서는 권하지 않는다. rehost, relocate, replatform으로 먼저 옮기고 이전이 끝난 뒤 현대화하라고 권한다.
- 강사의 현장 경험으로는 대부분의 전환이 Rehost와 강의 기준 Refactor, Rearchitect 수준에서 끝나고 마이크로서비스 재개발(Rebuild)까지 가는 경우는 20% 정도다. 출처가 없는 경험치이므로 판단 근거로는 자체 portfolio 분석을 쓴다.

## 애플리케이션의 클라우드 성숙 단계

강의는 Pivotal 자료로 아래 4단계를 소개했다. 원 자료의 판정 기준은 확인하지 못했으므로 단계 이름보다 다음 절의 판정 질문으로 상태를 확인한다.

| 단계 | 강의 설명 | 강의가 짝지은 전환 | 현재 벤더 용어로 가까운 것(추정) |
|---|---|---|---|
| Cloud Ready | 레거시를 거의 바꾸지 않고 IaaS VM에 올림 | Rehost | Rehost |
| Cloud Friendly | 12 Factor에 맞춰 하드웨어 의존을 줄이고 수평 확장 가능 | Refactor | Replatform, 일부 Refactor |
| Cloud Resilient | 중앙 모니터링, tracing, managed DB 같은 플랫폼 서비스를 쓰고 front와 back을 REST API로 분리 | Rearchitect | Replatform에서 Rearchitect 사이 |
| Cloud Native | 마이크로서비스 | Rebuild | Rearchitect, Rebuild |

container와 Kubernetes 도입만으로도 확장성, 배포 용이성과 탄력성을 어느 정도 얻으므로 모든 애플리케이션이 마지막 단계까지 갈 필요는 없다. 한 번에 이상적인 구조로 가지 않고 조직 성숙도에 맞춰 중간 단계를 거친다.

## 수평 확장이 가능한가: 판정 질문

Rehost한 앱을 여러 instance로 늘리면 로컬 상태가 바로 장애가 된다. 12 Factor 원문에서 자주 걸리는 항목을 판정 질문으로 쓴다.

- **설정**: 환경마다 달라지는 값을 code 상수가 아니라 외부 설정으로 분리했는가(III. Config, code와 설정의 엄격한 분리).
- **상태**: process가 stateless, share-nothing인가. 12 Factor는 sticky session을 위반으로 보고 session을 만료 기능이 있는 저장소(Redis, Memcached)에 두라고 한다. process의 메모리와 filesystem은 짧은 단일 transaction cache로만 쓰고 지속할 데이터와 업로드 파일은 backing service에 둔다(VI. Processes, [[Scale-Up-vs-Out]]).
- **로그**: log file을 앱이 직접 관리하지 않고 event stream으로 내보내 수집 계층이 모으게 했는가(XI. Logs).
- **서드파티 제품**: license가 host나 고정 IP에 묶이거나 clustering을 지원하지 않는 제품이 수평 확장을 막지 않는가.

## 전환 절차

1. **목록화와 Assessment**: workload마다 비즈니스 영향도, 기술 난이도와 조직 역량을 보고 전략 후보를 제안한다. Microsoft CAF는 workload별 business driver를 먼저 정하고 compliance, 보안, 운영 제약과 충돌하는 선택지를 지운 뒤 business와 기술 이해관계자가 함께 확정하라고 한다.
2. **결정**: 최종 선택은 회사가 한다. 서비스 분해(Rearchitect, Rebuild)로 정한 대상만 DDD와 서비스 경계 설계 같은 추가 학습이 필요하고, 나머지는 container, CI/CD와 관측 같은 platform 수준 패턴으로 충분한 경우가 많다.
3. **레퍼런스 아키텍처**: 클라우드 벤더가 전략별로 제공하는 레퍼런스 아키텍처(모놀리스 구성, Kubernetes 활용, 모니터링 연동)를 출발점으로 쓰되 비용과 보안 경계는 자체 조건으로 다시 검증한다.
4. **단계 이동**: 이전과 현대화를 한꺼번에 하지 않는다. 옮긴 뒤 재평가해 다음 단계로 간다. 기능 단위 교체 전술은 [[Legacy-Modernization-Strategies]], 반복 가능한 환경 구성은 [[IaC]]가 받친다.

## AI가 만든 이전 계획의 검증 경계

2026-10-07 AWS Transform 공식 문서 확인 기준. 자동화는 인벤토리 분석, 애플리케이션 묶음과 이전 순서 제안을 돕지만, 계획 생성과 실제 전환 성공은 다른 결과다.

- **Move group**은 의존성 때문에 함께 옮겨야 할 애플리케이션 묶음이다. 공유 DB나 메시지 큐뿐 아니라 업무 중요도, RPO/RTO와 운영 책임도 입력한다.
- **Wave**는 하나 이상의 move group을 묶은 실행 단위다. 일정과 위험에 따라 순서를 정하고, 새 의존성이 발견되면 계획을 다시 검토한다.
- 서버 이전은 인벤토리 확인, 복제, 테스트 인스턴스 검증과 최종 cutover를 나눈다. EC2 타입, 네트워크와 라이선스 설정의 추천값도 검토 대상이다.
- 승인 대상 배포는 AWS Transform의 승인 절차를 거친다. 생성된 계획이나 채팅 응답만으로 운영 환경이 바뀌었거나 검증을 통과했다고 판단하지 않는다.

다음은 이 절차를 적용한 검증 질문이다. 인벤토리에 없는 배치와 외부 연동은 없는가. 테스트 인스턴스에서 핵심 업무와 데이터 정합성이 유지되는가. 전환 실패 때 기존 환경으로 돌아갈 조건을 정했는가. 자동화율과 소요 시간만으로 이 질문의 답을 대신하지 않는다.

## 가상화 플랫폼 유지와 재해복구 설계

2026-10-07 Nutanix NC2와 AWS 재해복구 공식 자료 대조 기준. 애플리케이션 재작성 범위를 줄이는 선택과 복구 목표를 충족하는 선택은 따로 검증한다.

Nutanix Cloud Clusters(NC2)는 AWS의 bare-metal 인스턴스에서 Nutanix 소프트웨어를 실행하는 배포 모델이다. 기존 가상화 플랫폼을 유지하며 이동하는 선택지로 검토할 수 있다. 애플리케이션 리팩터링을 줄일 수 있어도 대상 워크로드의 호환성, 네트워크 연결과 보안 정책을 검증하는 절차가 사라지지는 않는다.

| 복구 구성 | 평상시 유지할 것 | 복구 때 확인할 것 |
|---|---|---|
| 작은 pilot-light 클러스터 | 복구용 데이터와 최소 클러스터 | 필요한 노드 용량 확보, 확장과 애플리케이션 기동 |
| 원격 저장소 기반 복구 | 스냅샷과 복원에 필요한 구성 | 클러스터 생성, 데이터 복원과 애플리케이션 기동 |

NC2는 작은 클러스터 또는 원격 EBS/S3 저장소를 활용하는 복구 선택지를 제공한다. 구체적인 지원 구성은 제품 버전에 맞춰 확인한다. AWS의 일반적인 DR 분류에서도 backup/restore, pilot light와 warm standby는 평상시 실행 자원과 복구 시 추가 작업이 다르다. 제품의 구성을 이름만으로 특정 RTO에 대응시키지 않는다.

설계 검토에서는 허용 데이터 손실인 RPO와 복구 시간인 RTO를 먼저 정한다. 데이터 복제 지연뿐 아니라 자원 확보, 복원, 의존 서비스, 트래픽 전환과 업무 검증까지 훈련에 포함한다. 컴퓨팅 대기를 줄여도 저장소와 복제 비용은 남으며, 발표 사례의 절감률이나 복구 시간을 다른 환경의 보장값으로 쓰지 않는다.

## VMware 유지와 운영 책임

2026-10-09 Amazon EVS 공식 문서 대조 기준. Amazon Elastic VMware Service(EVS)는 사용자의 VPC 안에서 EC2 bare-metal 인스턴스에 VMware Cloud Foundation(VCF)을 실행하는 선택지다. 기존 VMware 워크로드를 유지하는 이전과 애플리케이션을 다른 플랫폼으로 바꾸는 현대화를 분리할 수 있다.

EVS는 환경 배포를 자동화하지만 VCF 운영 전체를 AWS가 대신 맡는다는 뜻은 아니다. 직접 관리하거나 AWS 파트너의 관리 서비스를 선택할 수 있다. 특히 Self-deployed 모드에서는 고객이 VCF 설치, 패치와 업그레이드, 인증과 접근 제어, 보안 모니터링을 맡는다.

이전 설계에는 VCF 운영 담당자, 라이선스, 네트워크 연결, 백업과 복구의 책임을 함께 적는다. 파트너에게 맡기는 경우에도 계약한 범위와 고객에게 남는 작업을 구분한다. 이는 운영 책임을 구체화하기 위한 점검 기준이며, 특정 파트너의 제공 범위를 보장하는 목록은 아니다.

## 서비스 개시 전 운영 준비를 검증한다

인프라 이전 완료와 사용자를 받는 준비 완료는 다르다. 2026-10-09 AWS Countdown Premium 안내는 아키텍처 검토, 준비도 평가, 실행 절차서와 예정된 이벤트 지원을 설명하며, 이전 계획부터 리허설, cutover와 사후 분석까지 다룬다. 지원 상품 이용 자체가 애플리케이션의 성능이나 복구 성공을 증명하지는 않는다.

다음은 이를 적용한 운영 준비 점검 예시다.

- 개시 전에 예상 동시 요청과 핵심 업무 흐름으로 부하를 재현하고, 용량 한계와 외부 의존성 병목을 확인한다.
- 오류율, 응답 시간과 데이터 정합성의 통과 기준, 전환 중단 조건과 복구 담당자를 정한다.
- 장애 알림이 실제 담당자에게 도달하는지, 실행 절차서대로 우회하거나 복구할 수 있는지 연습한다.
- 개시 중에는 기술 지표와 업무 성공 지표를 함께 보고, 종료 후 예상과 실제 차이를 다음 절차에 반영한다.

과거 발표의 지원 플랜 포함 여부나 고객 사례의 처리량을 현재 계약 조건과 자체 시스템의 보장값으로 옮기지 않는다.

## 흔한 실수

- 전략 이름만 합의하고 바뀌는 범위를 적지 않아 견적, 일정과 책임이 어긋난다.
- Rehost 뒤 local session과 local file 의존이 남아 auto scaling이나 다중 instance에서 로그인 풀림과 파일 유실이 난다.
- 이전과 서비스 분해를 동시에 시작해 원인을 분리하기 어려운 장애와 일정 지연을 만든다.
- lift and shift를 끝으로 보고 right-sizing과 managed service 전환 같은 후속 최적화를 미룬다.

## 면접 체크포인트

- 클라우드 전환과 마이크로서비스 전환을 구분하는 이유
- Rehost, Replatform, Refactor, Rearchitect의 범위 차이와 벤더별 용어 차이
- 대규모 이전에서 이전과 현대화를 분리하는 이유
- 수평 확장 전에 확인할 12 Factor 항목(설정, stateless, 로그)

## 출처

- [AWS, What is Amazon Elastic VMware Service?](https://docs.aws.amazon.com/evs/latest/userguide/what-is-evs.html)
- [AWS, Getting started with Amazon Elastic VMware Service](https://docs.aws.amazon.com/evs/latest/userguide/getting-started.html) — 2026-10-09 EVS 배포와 Self-deployed 모드의 운영 책임을 대조했다.
- [AWS Countdown Premium — AWS](https://aws.amazon.com/premiumsupport/aws-countdown/) — 2026-10-09 운영 준비 지원 범위를 대조했다. 점검 목록은 적용 예시이며 기존 전환 전략 전체를 재검증한 기록은 아니다.
- [Nutanix Cloud Clusters (NC2) on AWS — Nutanix](https://www.nutanix.com/library/datasheets/nc2-on-aws)
- [Nutanix Cloud Platform for AWS — Nutanix](https://www.nutanix.com/en_gb/products/nutanix-cloud-clusters/aws)
- [AWS, Disaster recovery options in the cloud](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [AWS, Build migration plan](https://docs.aws.amazon.com/transform/latest/userguide/transform-vmware-review-groupings-and-waves.html)
- [AWS, Migrate servers](https://docs.aws.amazon.com/transform/latest/userguide/transform-vmware-migrate-servers.html)
- [비즈니스 혁신 가속화를 위한 AI기반 클라우드 마이그레이션과 현대화 — Amazon Web Services Korea](https://www.youtube.com/watch?v=U09lkoLDMsE)
- [AWS Prescriptive Guidance, About the migration strategies](https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html)
- [Microsoft Learn, Select your cloud migration strategies](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/plan/select-cloud-migration-strategy)
- [The Twelve-Factor App, III. Config](https://12factor.net/config)
- [The Twelve-Factor App, VI. Processes](https://12factor.net/processes)
- [The Twelve-Factor App, XI. Logs](https://12factor.net/logs)
- [인프런, han jeong heon, Application Modernization유형과 클라우드 전환 프로세스](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104443)
- [인프런, han jeong heon, 마이크로서비스 성숙도](https://www.inflearn.com/courses/lecture?courseId=328412&unitId=104438)

## 관련 문서

- [[Legacy-Modernization-Strategies|레거시 시스템 현대화 전략]]
- [[Microservice-Readiness-and-Maturity|마이크로서비스 준비도와 성숙도]]
- [[Cloud-Service-Models|클라우드 서비스 모델]]
- [[Scale-Up-vs-Out|Scale Up vs Scale Out]]
- [[IaC|IaC]]
- [[AWS-SAA-C03-Pitfalls-Management|AWS 이전 서비스 함정 (MGN, DMS)]]
