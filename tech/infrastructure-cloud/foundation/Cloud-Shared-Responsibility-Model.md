---
tags: [infrastructure, cloud, security, shared-responsibility, iaas, paas, saas]
status: done
verified_at: 2026-11-15
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Cloud Shared Responsibility Model", "공동 책임 모델", "책임 분담 모델"]
---

# 클라우드 공동 책임 모델

클라우드로 옮겨도 보안과 운영 책임이 모두 사업자에게 넘어가지 않는다. 사업자와 고객이 책임을 나누며, 경계는 IaaS, PaaS, SaaS 같은 서비스 모델과 개별 서비스마다 달라진다. 어느 모델에서도 데이터, 계정과 접근 설정은 고객에게 남는다. 계층별 개념도는 [[Cloud-Service-Models#책임 공유 모델 (Shared Responsibility)|서비스 모델의 책임 표]]에 있고, 이 문서는 경계를 읽는 방법과 판단 기준을 다룬다.

## 정의와 사업자별 표현

2026-11-15 각 사업자 공식 문서 대조 기준이다.

- **AWS:** 사업자 몫을 클라우드 자체의 보안(security of the cloud), 고객 몫을 클라우드 안의 보안(security in the cloud)으로 나눈다. AWS는 서비스를 운영하는 하드웨어, 소프트웨어, 네트워크와 시설을 지키고, 고객 책임은 고객이 고른 서비스에 따라 정해진다.
- **Microsoft Azure:** 배포 유형과 관계없이 고객에게 남는 책임으로 데이터(분류, 보호, 암호화 결정, 데이터 거버넌스 준수), 엔드포인트, 계정, 접근 관리(RBAC, MFA, 조건부 접근)를 든다. 책임 표에서 고객 데이터, 구성과 설정, ID와 사용자는 모든 열에서 고객 몫이고, 클라이언트 기기는 SaaS에서만 공유로 바뀐다.
- **Google Cloud:** 사업자는 바탕 네트워크와 인프라를, 고객은 접근 정책과 데이터를 늘 책임진다고 설명한다. 여기에 Google Cloud를 더 안전하게 만드는 책임을 지고, 기본값이 안전한 시작 구성, 권고와 보험 연계로 고객과 계속 협력한다는 공동 운명(shared fate) 개념을 더한다.

표현은 달라도 큰 틀은 비슷하다. 아래층(시설, 물리 장비, 가상화)은 사업자가, 그 위에 고객이 올리고 설정한 것은 고객이 맡는다.

## 서비스 모델과 개별 서비스의 경계

- **IaaS:** AWS는 EC2를 IaaS로 분류하고 게스트 OS 관리(업데이트와 보안 패치), 고객이 설치한 애플리케이션, 인스턴스별 보안 그룹 설정을 고객 몫으로 적는다.
- **PaaS와 추상화 서비스:** S3, DynamoDB 같은 추상화 서비스는 AWS가 인프라, OS와 플랫폼을 운영하고 고객은 엔드포인트로 데이터를 다룬다. 그래도 데이터 관리(암호화 선택 포함), 자산 분류, IAM 권한 설정은 고객 몫이다. Azure는 PaaS에서 OS를 사업자가 맡고 애플리케이션과 네트워크 제어를 공유로 표시한다.
- **SaaS:** 애플리케이션 운영까지 사업자가 맡지만, 사용자와 권한 같은 설정과 데이터는 고객이 정한다.
- **FaaS:** 서버 준비와 확장은 사업자가 맡지만 패치 책임은 런타임 관리 방식에 따라 갈린다. AWS Lambda 이벤트 함수 기준으로 Auto 모드는 관리형 런타임 갱신을 AWS가 적용한다. Function update 모드는 고객이 함수를 정기적으로 갱신해야 그때 런타임 갱신이 들어가고, Manual 모드는 런타임 버전을 직접 최신으로 옮기거나 다른 모드로 되돌리는 일이 고객 몫이다. 컨테이너 이미지 함수에서는 최신 베이스 이미지로 다시 빌드해 배포하는 일이 고객 몫이다. AWS는 Manual 모드를 호환성 문제 때의 임시 롤백 용도로만 쓰라고 권한다.

같은 종류의 서비스도 사업자마다 다른 모델로 분류한다. 저장소 서비스를 예로 들면 Microsoft는 Azure Storage(Blob 포함 서비스군)를 PaaS 예로, Azure Disk Storage를 IaaS 예로 들고 Google은 Cloud Storage를 IaaS로 분류한다. Google은 GKE도 PaaS로 분류한다. 컨테이너를 올리는 관리형 실행 환경을 업계에서 CaaS라고 부르기도 하지만, 그 분류 이름만으로 책임 경계가 정해지지 않는다. 모델 이름보다 그 서비스의 책임 문서에서 어느 층부터 고객 몫인지를 확인한다.

## 설정 오류와 고객 몫

- 미국 NSA는 2020년 1월 클라우드 취약점 안내서에서 클라우드 자원의 잘못된 설정을 가장 흔한 클라우드 취약점으로 꼽고, 서비스 정책 실수와 공동 책임에 대한 오해에서 자주 생긴다고 설명했다. 안내서 PDF는 직접 열람하지 못해(403) 공개 사실은 CISA 알림으로, 이 두 문구는 보도에 실린 원문 인용으로 확인했다.
- 이전 전 위험 평가도 고객 몫이다. 미국 통화감독청(OCC)은 2020년 8월 Capital One에 8천만 달러의 민사 제재금을 부과했다. 보도자료가 든 사유는 상당한 IT 운영을 퍼블릭 클라우드로 옮기기 전에 효과적인 위험 평가 절차를 갖추지 못했고 결함을 제때 고치지 못했다는 것이며, 설정 오류나 침해 사고를 사유로 적지는 않았다.
- 사업자가 아래층을 지켜도 고객이 접근 권한을 넓게 열면 보호되지 않는다. 그래서 이전 계획에는 서비스별 고객 책임 목록, 최소 권한, 설정 변경 감시와 IaC 기반의 반복 가능한 구성을 함께 넣는다([[IaC|IaC]]).

## SLA도 같은 경계를 따른다

EC2를 다루는 Amazon Compute SLA(최종 갱신 2022-05-25 표기, 2026-11-15 확인)는 실행 중인 인스턴스를 모두 2개 이상 AZ에 동시에 둔 경우의 리전 수준 월 가용률 99.99%와 인스턴스 수준 99.5%를 상업적으로 합리적인 노력의 목표로 두고, 미달하면 고객이 AWS Support Center에 청구해 서비스 크레딧을 받는다. 다만 고객의 행동이나 미조치, 고객의 장비, 소프트웨어나 기타 기술로 생긴 불가용은 SLA 적용에서 뺀다. 가용률 숫자를 볼 때는 고객 몫의 장애가 그 숫자에 들어가지 않는다는 점을 함께 읽는다. SLA와 SLO의 관계는 [[SLI-SLO|SLI와 SLO]]에서 다룬다.

## 이식성과 종속

NIST SP 800-146(2012년 5월)은 모델마다 이식성 문제가 다르게 나타난다고 설명한다.

- **IaaS로 들이기:** 고객이 OS를 고를 수 있어 기존 애플리케이션과의 호환성을 높게 유지할 수 있다. 다만 특수 하드웨어 지원이 필요한 애플리케이션은 이식 후보로 이상적이지 않다(7.4.3).
- **IaaS 사이 이동:** 가상 머신과 디스크 저장소는 기존 표준과 가까워 일부 이식 시나리오를 표준 용어로 표현할 수 있다. 그래도 장치 인터페이스 같은 낮은 수준의 세부가 드러나 사업자 간 인터페이스 차이가 장애물이 된다(8.3.3).
- **PaaS:** 독자 언어와 런타임을 요구하면 새 애플리케이션 개발 단계부터 이식성이 문제가 된다. 표준 언어를 써도 파일, 큐, 해시 테이블 같은 플랫폼 서비스 인터페이스가 사업자마다 크게 다를 수 있다. 일반화한 인터페이스로 감싸면 비용이 들고 사업자 고유 기능 활용이 제한되기 쉬운 최소 공통분모 문제가 생긴다(6.4.1).
- **SaaS:** 데이터 내보내기와 가져오기 형식이 서로 완전히 호환되지 않을 수 있고, 오래 쌓은 워크플로와 업무 규칙, UI와 애플리케이션 설정, 스크립트, 확장과 부가 기능이 사업자에 묶여 쉽게 옮기지 못할 수 있다(5.4.3).

SP 800-146은 2012년 기준이라 개별 서비스의 현재 내보내기 기능을 보장하지 않는다. 이전 계획의 접근 방식은 [[Cloud-Migration-Strategies|클라우드 전환 전략]]에서 이어진다.

## 무엇을 맡길지 고르는 질문

1. **직접 손대야 하는 범위:** 특정 OS 버전이나 커널 설정이 필요하면 IaaS 쪽이, 어느 조직이나 비슷하게 쓰는 메일과 일정 관리는 SaaS가 맞는 편이다.
2. **그 층을 맡을 사람:** 가상 서버를 빌리면 OS 패치와 보안 설정을 챙길 담당이 필요하다. 담당이 적으면 위쪽 서비스가 부담을 줄인다.
3. **나중에 옮기는 비용:** 위 이식성 항목을 기준으로 데이터 형식과 플랫폼 의존을 확인한다.
4. **사람의 시간까지 넣은 비용:** 요금표만 비교하지 않고 직접 관리하는 층의 운영 시간을 더한다. FaaS 요금 구조의 예로 AWS Lambda 이벤트 함수는 요청 수와 실행 시간(1ms 단위, 할당 메모리에 따라 단가가 다름)으로 과금한다(2026-11-15 가격 페이지 기준).

실무에서는 하나만 고르기보다 업무마다 섞는 경우가 많다. 메일은 SaaS, 웹사이트는 PaaS, 오래된 업무 프로그램은 IaaS 가상 서버에 두는 식이며, 섞을수록 서비스별 고객 책임 목록을 따로 관리해야 한다.

## 체크포인트

- 고른 서비스마다 사업자 책임 문서에서 고객 몫의 시작 층을 확인했는가
- 데이터 분류, 계정, 접근 정책과 엔드포인트를 모델과 관계없이 고객 몫으로 계획했는가
- SLA 제외 조항이 고객 몫의 장애를 빼는지 확인했는가
- 같은 이름의 모델이라도 사업자마다 분류가 다르다는 점을 감안했는가
- 이전 전에 위험 평가와 설정 감시 체계를 갖췄는가

## 출처

- [AWS, Shared Responsibility Model](https://aws.amazon.com/compliance/shared-responsibility-model/)
- [Microsoft Learn, Shared responsibility in the cloud](https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility)
- [Google Cloud, Shared responsibilities and shared fate on Google Cloud](https://docs.cloud.google.com/architecture/framework/security/shared-responsibility-shared-fate)
- [AWS Lambda, Understanding the shared responsibility model for Lambda runtime management](https://docs.aws.amazon.com/lambda/latest/dg/runtime-management-shared.html)
- [NSA, Mitigating Cloud Vulnerabilities](https://media.defense.gov/2020/Jan/22/2002237484/-1/-1/0/CSI-MITIGATING-CLOUD-VULNERABILITIES_20200121.PDF) — 2026-11-15 PDF 직접 열람 실패(403), 아래 보도의 원문 인용으로 두 문구만 확인
- [NSA Releases Guidance on Mitigating Cloud Vulnerabilities — CISA](https://www.cisa.gov/news-events/alerts/2020/01/24/nsa-releases-guidance-mitigating-cloud-vulnerabilities)
- [NSA Offers Cloud Security Mitigation Guidance for Top Vulnerabilities — Virtualization Review, David Ramel](https://virtualizationreview.com/articles/2020/02/05/nsa-guidance.aspx)
- [OCC Assesses $80 Million Civil Money Penalty Against Capital One — OCC](https://www.occ.gov/news-issuances/news-releases/2020/nr-occ-2020-101.html)
- [AWS, Amazon Compute Service Level Agreement](https://aws.amazon.com/compute/sla/)
- [AWS Lambda, Pricing](https://aws.amazon.com/lambda/pricing/)
- [NIST, SP 800-146 Cloud Computing Synopsis and Recommendations](https://csrc.nist.gov/pubs/sp/800/146/final)
- [YouTube, 동국시스템즈 IT 채널, IaaS, PaaS, SaaS, 어디까지 맡기나 (IT 인프라 기초 7-2)](https://www.youtube.com/watch?v=vqIiDC3vOg0) — 2026-11-05 공개 강의, 계기 자료. 선택 질문, 혼용 예시와 CaaS 설명은 강의의 설명이고, 서버리스 패치 서술은 Lambda 문서로 교정했으며 2019년 사건 수치는 옮기지 않음

## 관련 문서

- [[Cloud-Service-Models|클라우드 서비스 모델]]
- [[Cloud-Definition-and-Deployment-Models|클라우드 컴퓨팅의 정의와 배포 모델]]
- [[Cloud-Migration-Strategies|클라우드 전환 전략]]
- [[IaC|IaC]]
- [[AWS-Lambda|AWS Lambda]]
