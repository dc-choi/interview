---
tags: [infrastructure, cloud, iaas, paas, saas, faas, serverless]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Cloud Service Models", "IaaS PaaS SaaS", "클라우드 서비스 모델"]
verified_at: 2026-10-13
---

# 클라우드 서비스 모델

같은 클라우드라도 **어디까지 사업자가 관리하고, 어디부터 사용자가 관리하는지**에 따라 계층이 나뉜다. 대체로 관리형 계층을 더 사용할수록 직접 운영할 범위가 줄지만, FaaS와 PaaS의 기능과 통제권을 일렬로 서열화할 수는 없다. 서비스 선택은 운영 책임과 위임 범위를 결정하는 일이다.

## 서버의 역할과 실행 위치

서버는 클라이언트에 서비스를 제공하는 소프트웨어 또는 그 소프트웨어를 실행하는 컴퓨터를 뜻한다. 웹 서버 프로그램과 물리 서버 장비를 같은 말로 부를 수 있으므로, 구성을 설명할 때 어느 쪽인지 구분한다. 서버라는 역할 자체가 특정 CPU나 데이터센터 입주를 필수로 뜻하지는 않는다.

가상 서버는 물리 장비 위에서 CPU, 메모리와 저장소 등의 자원을 할당받아 OS와 애플리케이션을 실행한다. 클라우드의 가상 서버도 물리 장비를 기반으로 하며, 그 장비를 사업자가 관리한다. 따라서 서버 역할, 물리/가상 실행 형태, IaaS/PaaS 같은 운영 책임 계층은 구분해서 설명한다.

예를 들어 EC2에 웹 애플리케이션을 올려도 게스트 OS 패치와 애플리케이션, 보안 그룹 설정은 고객의 책임이다. 요청을 처리하는 프로그램을 실행한 것과 운영 책임을 충족한 것은 다르다. 서비스 선택에서는 필요한 가용성과 복구 조건에 맞춰 어떤 책임을 직접 맡을지 확인한다.

## 추상화 계층

| 계층 | 사업자가 관리 | 사용자가 관리 | 대표 |
|---|---|---|---|
| **On-Premise** | — | 전부(하드웨어~앱) | 자체 데이터센터 |
| **IaaS**(Infra as a Service) | 물리 하드웨어, 네트워크, 가상화 | OS, 런타임, 앱, 데이터 | EC2, GCE, Azure VM |
| **PaaS**(Platform as a Service) | + OS, 런타임, 미들웨어 | 앱, 데이터 | Heroku, Elastic Beanstalk, App Engine |
| **FaaS**(Function as a Service) | + 앱 컨테이너 수명 | 함수 코드, 함수 설정, IAM, 이벤트 소스, 데이터 | AWS Lambda, Cloud Functions |
| **SaaS**(Software as a Service) | 전부 | 계정, 설정, 데이터만 | Gmail, Slack, Notion, Zoom |

일반적으로 서버리스는 FaaS, 관리형 서비스(DynamoDB, Aurora Serverless 등)를 포괄해 가리킨다.

## IaaS

가상 머신 단위로 **컴퓨팅, 스토리지, 네트워크**를 빌림.

- 사업자: 물리 서버, 가상화 하이퍼바이저, 네트워크 백본
- 사용자: **OS 선택, 설치, 패치**, 런타임, 앱, 보안 그룹, 로드밸런서 설정
- 장점: 온프레미스에 가까운 **통제권**, 제공되는 하드웨어와 OS 범위 안에서 폭넓은 워크로드 수용
- 단점: OS, 보안 패치, 모니터링까지 직접 책임

적합: 특수 커널 모듈, GPU 드라이버 필요, 레거시 앱의 lift and shift([[Cloud-Migration-Strategies|Rehost]]), 규제 요구로 세밀 통제 필요.

## PaaS

사업자가 **OS와 런타임을 포함한 실행 플랫폼**을 제공한다. 사용자는 코드, 빌드와 환경 설정을 관리하고, 플랫폼 업데이트 적용 방식은 상품별로 확인한다.

- 사업자: OS 패치, 런타임, 스케일링 기본, 로드밸런서
- 사용자: **소스 코드, 환경변수, 빌드 설정**
- 장점: 빠른 배포, 운영 부담 최소
- 단점: **특정 스택, 버전 강제**, 튜닝 한계, 벤더 종속

적합: 표준 웹 앱(Node.js/Python/Ruby), 초기 스타트업 프로토타입, 운영 인력 적은 팀.

## FaaS (서버리스 함수)

이벤트 트리거로 **함수 단위**로 실행. On-demand 실행은 보통 요청 수와 실행 시간에 따라 과금되지만, 프로비저닝된 동시성처럼 유휴 상태에서도 비용이 생기는 옵션과 연결 서비스 비용이 있을 수 있다.

- 사업자: 컨테이너 프로비저닝, 오토스케일, 장애 복구
- 사용자: **함수 코드, 함수 설정, IAM 권한, 이벤트 소스와 데이터**
- 장점: 자동 스케일, on-demand의 낮은 유휴 실행 비용
- 단점: [[AWS-Lambda|Cold Start]], 실행 시간 한도, 상태 비보유

적합: 이벤트 처리, 스케줄 배치, 불규칙 트래픽 API 백엔드.

자세한 구조, 운영 패턴: [[AWS-Lambda]]

## SaaS

완성된 소프트웨어를 **구독**해 사용.

- 사업자: 앱 포함 전 계층 운영
- 사용자: **계정, 설정, 데이터**만
- 장점: 설치, 운영, 유지보수 불필요, 즉시 사용
- 단점: 커스터마이즈 한계, 데이터 주권, 규정 이슈

적합: 협업, 생산성 도구, 인증(Auth0, Okta), 결제(Stripe).

## 책임 공유 모델 (Shared Responsibility)

보안은 사업자와 사용자가 공동으로 책임진다. 어디까지가 사업자 몫인지 계층과 상품마다 다르다.

| 영역 | On-Prem | IaaS | PaaS | FaaS | SaaS |
|---|---|---|---|---|---|
| 물리 보안 | 사용자 | 사업자 | 사업자 | 사업자 | 사업자 |
| 하이퍼바이저 | 사용자 | 사업자 | 사업자 | 사업자 | 사업자 |
| OS 패치 | 사용자 | **사용자** | 사업자 | 사업자 | 사업자 |
| 런타임 패치 | 사용자 | 사용자 | 사업자 | 사업자 | 사업자 |
| 앱 코드 | 사용자 | 사용자 | 사용자 | 사용자 | 사업자 |
| 데이터, 권한 | 사용자 | **사용자** | **사용자** | **사용자** | **사용자** |

사용자에게는 데이터 분류와 접근 권한 설정 등의 책임이 남는다. 실제 책임 분담은 선택한 서비스와 계약을 확인한다. 위 표는 계층별 개념도이며 개별 상품의 업데이트와 운영 계약을 대체하지 않는다.

## 서비스 선택 기준

- **통제권 vs 운영 부담 trade-off**
- **트래픽 패턴** — 상시 고부하 → IaaS/PaaS, spiky/이벤트 → FaaS
- **규제, 데이터 주권** — 특정 리전, 전용 인프라 요구면 IaaS, Private Cloud
- **팀 크기, SRE 역량** — 소규모 팀은 PaaS/FaaS로 기울수록 유리
- **비용 모델** — 고정 워크로드는 장기 약정 인스턴스가 Lambda보다 저렴한 지점이 있음

## 하이브리드, 멀티 레이어

실무에선 보통 **여러 모델 혼용**.

- 핵심 API는 IaaS/K8s, 비동기 작업은 FaaS, 인증은 SaaS(Auth0), 파일 저장은 관리형(S3)
- 같은 AWS 안에서도 EC2 + Lambda + RDS + S3 + Cognito를 한 애플리케이션에서 조합

## 여러 사이트를 한 서버에 둘 때의 경계

2026-10-09 공식 문서 기준으로, 사이트 수와 서버 수만으로 비용이나 안전성을 판단하지 않는다.

- **과금 단위:** 관리형 호스팅이 모두 사이트별 정액제인 것은 아니다. 예를 들어 Vercel Pro는 배포 권한 좌석, 부가 기능과 사용량을 함께 과금한다. 직접 운영도 인스턴스 외 저장소, 전송과 운영 시간을 포함해 비교한다.
- **요청 분기:** Nginx는 수신 IP와 포트에 맞는 서버 후보를 고르고 HTTP `Host`로 가상 서버를 선택할 수 있다. 이는 여러 사이트로 요청을 나누는 기능이며, 폴더나 `server` 블록만으로 프로세스, 데이터와 권한이 격리되는 것은 아니다.
- **운영 책임:** EC2에서는 게스트 OS 패치, 설치한 애플리케이션과 보안 그룹 설정을 사용자가 관리한다. 직접 운영한다는 사실만으로 관리형 서비스보다 안전하다고 판단하지 않는다.
- **장애와 복구:** 한 인스턴스에 의존한 사이트는 그 인스턴스 장애의 영향을 함께 받는다. 백업 보유와 복구 완료는 다르므로 코드, 데이터와 실행 환경을 복원해 허용 중단 시간과 데이터 손실 목표를 검증한다. 스냅샷 하나로 일정한 복구 시간이 보장되지는 않는다.

실무 적용 시에는 사이트 개수보다 메모리, CPU, DB 부하, 동시 요청과 허용 장애 범위를 측정한다. 이 절은 구성 검토 기준이며 특정 서버의 수용량을 실측한 결과가 아니다.

## 작은 팀과 작은 예산의 단계별 선택

2026-10-14 AWS 공식 문서 대조 기준이며, 이 절만 추가 대조했다. 단계 구분과 우선순위는 운영 판단의 기준이며 특정 서비스의 우열을 정한 결과가 아니다.

**초기(MVP):** 사람, 시간과 돈이 가장 부족한 단계라 학습 비용을 줄이는 선택을 먼저 한다.

- 익숙한 런타임과 DB를 PaaS나 단순한 VM 구성에 올려 출시 속도를 확보한다. 처음부터 마이크로서비스나 함수로 잘게 나누면 기능보다 배포, 로그와 권한 경로를 먼저 설계하게 되기 쉽다.
- 접근 패턴이 아직 바뀌는 동안에는 관계형 DB가 유연하다. AWS는 DynamoDB 스키마를 자주 쓰는 쿼리에 맞춰 설계하고, 답해야 할 질문을 알기 전에는 설계를 시작하지 말라고 안내한다. JOIN이 없어 비정규화를 전제로 하고, 테이블의 기본 키 값만 고유하며 GSI 키 값은 중복될 수 있다.
- 소개 페이지 같은 정적 사이트는 S3와 CloudFront로 분리한다. 캐시가 응답한 만큼 오리진이 직접 처리할 요청이 줄어든다.

**작은 예산의 상시 운영:** 고정비를 낮추고 간헐적인 부하를 사용량 과금 서비스로 넘긴다.

- 트래픽이 적은 서버는 [[EC2-Compute#T 시리즈 CPU 크레딧 시스템|버스터블 인스턴스]]가 저렴하다. 계정 기본값을 바꾸지 않았다면 T8i, T4g, T3a와 T3는 Unlimited로 시작해(Dedicated Host의 T3는 Standard) 크레딧이 떨어져도 느려지지 않는 대신 24시간 평균 사용률이 baseline을 넘으면 추가 요금이 붙고, Standard로 시작하는 T2는 크레딧이 떨어지면 baseline으로 내려간다. `CPUCreditBalance`(Unlimited는 `CPUSurplusCreditBalance`도)에 경보를 걸고 운영 전 부하 시험으로 평균 사용률을 확인한다. AWS 문서의 us-east-1 Linux 예시에서 t3.large는 평균 CPU 42.5%를 넘으면 m5.large보다 비싸다. AWS는 T3가 계속 100%로 버스트하면 같은 크기 M5의 약 1.5배를 낸다고 설명한다.
- 작은 인스턴스의 CPU를 쓰는 주기 작업(외부 API 수집, 지표 조회)은 함수로 옮기고 정적 콘텐츠는 CDN 캐시로 넘겨, 인스턴스가 핵심 요청에 크레딧을 쓰게 한다.
- 가끔 도는 배치는 S3 업로드 이벤트로 Lambda를 호출하고 결과를 SNS로 알리는 식으로 상시 서버 없이 구성한다. S3 이벤트 알림은 최소 한 번 전달되고 보통 수 초 안에 오지만 1분 이상 걸릴 수 있다. 함수가 트리거 조건에 맞는 위치에 결과를 쓰면 자신을 다시 호출하므로 입력과 출력 경로를 나눈다([[AWS-Lambda-Operations-Exam#실무 패턴|Lambda 실무 패턴]]).
- 단기 분석은 중단을 견딜 수 있으면 Spot 인스턴스로 돌리고, 결과를 S3에 남긴 뒤 환경을 지운다. Spot은 회수 2분 전에 중단 알림을 받는다.

**성장 단계:** 사용자, 개발자와 리소스가 늘면 초기의 임시 구성을 모범 사례로 옮긴다.

- 비운영과 운영을 별도 계정으로 나눈다([[IaC#규모가 커질 때의 Terraform 구성 분할|환경 분리]]). 넓게 시작한 IAM 권한은 CloudTrail 활동 기반 정책 생성(IAM Access Analyzer)과 마지막 사용 정보로 좁힌다. 민감 데이터에 대한 명시적 Deny는 어떤 Allow보다 우선해 권한을 좁히기 전의 보호 장치가 되지만, 그 자체가 최소 권한은 아니다.
- 콘솔 로그인, access key 생성과 AWS 유지보수 일정은 이벤트로 알림을 받는다([[CloudTrail-Config#EventBridge로 계정 활동과 유지보수 알림 받기|운영 알림]]). PoC 때 남긴 보안 예외는 요구사항을 충족한 뒤에도 남기 쉬우므로 단계를 넘어갈 때마다 남은 예외와 정리 계획을 기록한다(운영 제안).

## 서버리스가 뜻하는 것

- "서버가 없다"가 아니라 **사용자가 서버를 관리하지 않는다**
- FaaS + 관리형 DB(DynamoDB, Aurora Serverless) + API Gateway 조합
- 장점: 운영 인력 최소, 자동 스케일
- 단점: 벤더 종속, Cold Start, 장시간 실행 제약, 특정 워크로드에서 비용 역전

## 흔한 오해

- "SaaS는 항상 싸다" — 시트 단위 누적되면 자체 호스팅보다 비싸지는 변곡점 존재
- "IaaS가 가장 자유롭다 = 가장 좋다" — 운영 부담이 경쟁력을 갉아먹을 수 있음. 스타트업은 PaaS, SaaS부터
- "FaaS로 모든 걸 해결" — RDB 커넥션 폭주, 장시간 실행, 콜드 스타트로 부적합 워크로드 존재
- "퍼블릭 클라우드면 보안은 사업자 책임" — 책임 공유 모델 미숙지

## 면접 체크포인트

- IaaS/PaaS/FaaS/SaaS의 계층 구분과 누가 무엇을 관리하는지
- 서버리스가 지칭하는 실제 범위(FaaS + 관리형 서비스)
- 책임 공유 모델 — 데이터, IAM은 사용자 몫
- Lambda(FaaS)와 EC2(IaaS) 선택을 가르는 트래픽, 비용, 제약 기준
- 하이브리드 아키텍처가 실무 기본인 이유
- 작은 예산에서 버스터블 인스턴스와 사용량 과금 서비스를 조합할 때 확인할 것(크레딧 모드, 손익분기 사용률, S3 이벤트 루프)

## 출처

2026-10-13 부분 검증: 서버의 하드웨어/소프트웨어 의미, 클라우드 가상 서버의 물리 기반과 EC2 책임 분담을 대조했다. 기존 가격과 개별 서비스 설정의 검증 범위는 각 절에 적힌 기준을 유지한다.

- [MDN, Server](https://developer.mozilla.org/en-US/docs/Glossary/Server)
- [What is a Cloud Server? — AWS](https://aws.amazon.com/what-is/cloud-server/)
- [AWS, Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [Vercel, Pro Plan](https://vercel.com/docs/plans/pro-plan)
- [Nginx, How nginx processes a request](https://nginx.org/en/docs/http/request_processing.html)
- [AWS, Disaster recovery options in the cloud](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [AWS Lambda, Configuring provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [Amazon DynamoDB, NoSQL design for DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html)
- [Amazon DynamoDB, Best practices for modeling relational data in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-relational-modeling.html)
- [Amazon DynamoDB, Using Global Secondary Indexes in DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
- [Amazon CloudFront, Caching and availability](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ConfiguringCaching.html)
- [Amazon EC2, Key concepts for burstable performance instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html)
- [Amazon EC2, Unlimited mode concepts for burstable instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances-unlimited-mode-concepts.html)
- [Amazon S3, Amazon S3 Event Notifications](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html)
- [Amazon EC2, Spot Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html)
- [AWS IAM, Security best practices in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS IAM, How AWS enforcement code logic evaluates requests](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html)
- [스타트업 관점에서 본 AWS 선택과 집중 — Amazon Web Services Korea](https://www.youtube.com/watch?v=rkr8ToCiiL0)
- [일본 시골 개발자의 AWS 활용기 — Amazon Web Services Korea](https://www.youtube.com/watch?v=9oBS8X7TNEQ)

## 관련 문서

- [[AWS서비스(AWSServices)|AWS]]
- [[AWS-Lambda|AWS Lambda, 서버리스 FaaS]]
- [[Docker|Docker]]
- [[IaC|IaC]]
- [[Load-Balancer|Load Balancer]]
- [[Cloud-Migration-Strategies|클라우드 전환 전략]]
