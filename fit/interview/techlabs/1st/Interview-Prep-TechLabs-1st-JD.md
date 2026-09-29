---
tags: [fit, interview, techlabs]
status: active
category: "Interview - Fit"
aliases: ["TechLabs Interview Prep 1st JD", "테크랩스 1차 JD와 회사 분석"]
---

# 테크랩스 1차 JD와 회사 분석

> [[Interview-Prep-TechLabs-1st|메인 문서]]로 돌아가기. 회사 사실은 공개 JD와 공식 사이트, 보도로 확인한 것만 적고 출처를 단다. 확인되지 않은 조직, 트래픽, 기술 구현은 확인 질문으로 남긴다.

## 1. 공개된 회사 개요

| 항목 | 확인한 내용 | 출처 |
| --- | --- | --- |
| 회사 정의 | 헬스케어, 뷰티, 라이프스타일 분야의 웰니스 플랫폼 기업으로 소개한다. 미용 의료 섹터 마케팅 서비스와 운세 서비스 점신을 운영한다고 적었다. | 공개 JD |
| 콘텐츠플랫폼사업부 | 운세 앱 점신을 서비스한다. JD는 누적 다운로드 1,900만 건 이상과 국내 1위를 회사 주장으로 적었다. 명리학 데이터 고도화, 역술인 상담과 O2O 서비스도 소개한다. | 공개 JD |
| 광고플랫폼사업부 | JD는 국내 1위 SSP 사업부로 소개하고, 광고 집행부터 수익 최적화까지 Full-stack 광고 플랫폼을 제공한다고 적었다. | 공개 JD |
| 애드테크 제품 | 공식 사이트는 DSP, SSP, Full Stack Ad Server를 아우르는 마케팅 테크 솔루션을 제공한다고 설명한다. 인벤토리 관리 플랫폼 COMPASS와 애드서버 리포트 조회 플랫폼 Insight를 소개한다. | [테크랩스 공식 사이트, PLATFORM DEV.](https://www.techlabs.co.kr/platform-x) |
| 애드테크 이력 | 2023년 애드테크 기업 애드오피를 흡수합병했다고 보도됐다. 기사 기준 애드오피는 DSP와 SSP 분야의 프로그래매틱 광고 기술을 가진 회사로 소개됐다. | [이투데이, 2023-05-02](https://www.etoday.co.kr/news/view/2245534) |
| 럭키버스 | 점신의 운세 콘텐츠를 통합한 오퍼월 기반 참여형 콘텐츠다. 이용자가 콘텐츠를 이용하며 광고를 시청하고 리워드를 적립하는 구조로 소개됐다. 2025-09-11 토스 미니앱 출시 보도가 있고 하나머니 적용 보도도 있다. | [이투데이, 2025-09-11](https://www.etoday.co.kr/news/view/2505454), [이투데이, 하나머니 적용](https://www.etoday.co.kr/news/view/2488945) |
| 럭키버스 제휴 확장 | 2026-06-12 NH올원뱅크에 럭키버스 서비스를 제공한다는 보도 제목을 확인했다. 본문 세부는 원문으로 재확인하지 못했으므로 제목 이상의 내용은 말하지 않는다. | [네이트 뉴스, 2026-06-12](https://m.news.nate.com/view/20260612n28641) |
| 재무 | JD에 2025년 매출 923억, 영업이익 73억, 2024년 매출 978억, 영업이익 105억이 적혀 있다. 회사가 공개 JD에 기재한 수치이며 감사보고서와 대조하지 않았다. | 공개 JD |
| 근무지 | 서울 강남구 강남대로84길 13, 5~9층. | 공개 JD, 공식 사이트 |

### 확인하지 못한 것 (면접에서 질문으로만 다룬다)

- 백엔드 조직 구성, 럭키버스와 애드테크 백엔드가 같은 팀인지, 이 포지션의 담당 영역
- 실제 사용 언어와 프레임워크 비율, Kafka와 Kubernetes의 사용 여부
- 광고 이벤트 규모, 트래킹 파이프라인 구조, 정산 주기와 정산 대상
- 럭키버스 제휴 플랫폼 연동 방식과 리워드 지급 구조의 내부 구현

JD의 국내 1위 표현은 회사의 자기 소개다. 면접 답변에서 이를 근거로 규모를 추정하거나 되풀이하지 않는다.

## 2. 포지션 정보

| 항목 | 확인한 내용 | 출처 |
| --- | --- | --- |
| 포지션 | 백엔드 개발자, 팀원, 정규직(시용기간 3개월) | 공개 JD, 트래커 원문 검증 기록 |
| 경력 | 상세 본문은 2년 이상 백엔드 개발 경험. 2026-09-29 트래커 원문 검증 기록은 공고 요약을 2~5년으로 기록했다. | 공개 JD, 트래커 |
| 학력 | 대졸(4년) 이상 | 트래커 원문 검증 기록 |
| 근무 | 주 5일, 10:00~19:00, 대면 근무지 기준 | 공개 JD |
| 채용 절차 | 서류, 실무자 면접(대면), 최종합격. 포지션과 상황에 따라 실무과제와 임원면접이 추가될 수 있다. | 공개 JD |
| 마감 | 2026-10-28 | 트래커 원문 검증 기록 |

### 주요 업무

1. 럭키버스 백엔드 서비스 개발과 운영
2. 애드테크 솔루션의 백엔드 서비스 개발과 운영
3. 광고 데이터 분석, 트래킹, 정산 시스템 개발과 최적화
4. 사업팀 요청사항 처리와 시스템 개선

### 핵심 키워드

Java와 Spring Boot MVC, MySQL 설계와 운영, RESTful API, 광고 트래킹과 정산, 오퍼월 리워드, 사업팀 협업. 우대 쪽은 AWS, Redis, 메시지 큐, 컨테이너, IaC와 CI/CD다.

## 3. 자격요건과 내 경험 매칭

| 자격요건 | 매칭 | 근거 (이력서) | 보강할 점 |
| --- | --- | --- | --- |
| 2년 이상 백엔드 개발 | 강 | 이썸테크(2020.09~2021.02), 시솔지주(2022.06~2023.05), 트라이포드랩(2024.02~2026.05), 키노라이츠(2026.06.29~2026.09.15, 이력서 재직중 표기는 수정 필요) | 요약 필드가 2~5년이면 연차 표현이 상한 경계가 된다. 산정 기준은 [사용자 확정 필요] |
| Java, Spring Boot 등 MVC 패턴 기반 웹 개발 | 중 | 이썸테크에서 Java, Spring MVC, MyBatis, Oracle로 대시보드와 API 개발, JSP와 JDBC를 Spring과 MyBatis로 마이그레이션. 멋사 Java 백엔드 7기에서 Java, Spring 과제와 팀 프로젝트, 카카오테크 캠퍼스 Spring 백엔드 멘토 | 최근 2년 반의 상용 운영은 NestJS와 TypeScript다. Spring Boot 상용 서비스를 운영한 경험처럼 말하지 않는다. NestJS도 Controller, Service, Repository와 DI를 쓰는 구조라 설계 판단은 옮겨진다는 점을 근거로 든다 |
| MySQL과 관계형 RDBMS 설계, 운영 | 강 | 복합 인덱스로 슬로우 쿼리 99.3% 개선, SubQuery 기반 단일 쿼리로 API 응답속도 90% 향상, RDS Read Replica로 응답속도 40% 개선, DB Lock으로 동시 요청 정합성 확보, Oracle 스키마 설계, MongoDB에서 MySQL로 마이그레이션 | 각 수치의 측정 조건과 본인 기여를 한 문장씩 준비 |
| Git과 형상관리 | 강 | Jenkins와 GitHub Actions CI/CD, 코드 리뷰 문화 정착(멋사), 팀 AI 협업 규약, 개인 프로젝트 온톨로지 MCP의 Git 스냅샷 기반 재현 색인(R10) | 브랜치 전략과 리뷰 규칙을 예시로 말할 수 있게 |
| HTML, CSS, JavaScript 기본 | 중 | TypeScript 백엔드 실무, 42서울 과정 | 프론트엔드 실무는 없다. 브라우저 렌더링과 CORS, 쿠키 수준까지만 말한다 |
| RESTful API 설계와 개발, 논리적 사고 | 강 | Express와 NestJS API 개발, FIDO 서버 WebAuthn 명세 분석 후 설계, 외부 API 연동 | 상태 코드, 멱등성, 페이지네이션 기준 복습 |

## 4. 우대사항과 내 경험 매칭

| 우대사항 | 매칭 | 근거 | 답변 원칙 |
| --- | --- | --- | --- |
| AWS(EC2, RDS, S3, CloudWatch 등) | 강 | EC2, ECS, ECR, RDS, S3, SQS, EventBridge, SNS, CloudWatch, Lambda, Route 53. 단일 NGINX에서 CloudFront, ELB, ECS(Fargate)로 전환 | 서비스 이름보다 선택 이유와 운영 판단으로 말한다 |
| NoSQL, 캐시 DB(Redis, DynamoDB) | 중 | Redis, MongoDB 사용(이력서 Skills), 외부 메타데이터 초기 적재 캐시 경험 | DynamoDB 실무는 없다. Redis 운영 규모를 과장하지 않는다 |
| React, Vue 등 프론트엔드 | 약 | 실무 경험 없음 | 인정하고 API 계약과 협업 방식으로 대체 |
| 메시지 큐(RabbitMQ, Kafka 등) | 중 | EventBridge와 SQS 기반 발주 자동화, DLQ와 멱등 소비. Kafka 도입 한계를 고려해 관리형 큐를 선택 | Kafka와 RabbitMQ 운영 경험은 없다. 선택 기준의 전이로 답한다 |
| Docker, Kubernetes | 중 | Docker 멀티스테이지로 이미지 909MB에서 513MB, 배포 3분 10초에서 2분 20초. ECS Fargate 운영 | Kubernetes 운영 경험은 없다 |
| Linux 서버 인프라 관리 | 중강 | Amazon Linux 2, Ubuntu, Nginx, 리눅스마스터 2급, 42서울 시스템 프로그래밍 | 대규모 서버 관리 경험처럼 말하지 않는다 |
| Terraform, CloudFormation 등 IaC | 약 | 이력서에 IaC 경험 기재 없음 | 인정하고 콘솔 수동 변경의 위험과 IaC 도입 판단 기준으로 답한다 |
| CI/CD 구축과 운영 | 강 | Jenkins 파이프라인으로 배포 속도 50% 단축(시솔지주), GitHub Actions, 멋사에서 NCP 기반 Docker와 GitHub Actions 파이프라인 | 배포 롤백과 검증 게이트까지 말한다 |

## 5. 기술 스택 비교

| JD 스택 | 내 경험 | 판정 |
| --- | --- | --- |
| Java | 이썸테크 실무, 멋사 과정, 멘토링. 최근 주력은 TypeScript | 유사, 보강 필요 |
| Spring Boot, Spring MVC | Spring MVC 실무(이썸테크), Spring Boot와 Spring Data JPA, Spring Batch는 이력서 Skills 기재 | 유사, 상용 운영은 보강 필요 |
| JPA, Querydsl | 이력서 Skills 기재. 상용에서는 Prisma, Sequelize | 유사 |
| MySQL | 트라이포드랩, 시솔지주 실무 | 동일 |
| Redis | 사용 경험 | 동일에 가까움 |
| Kafka, RabbitMQ | SQS, EventBridge | 유사, 운영 경험 없음 |
| Docker, Kubernetes | Docker, ECS Fargate | Docker 동일, Kubernetes 없음 |
| AWS | 광범위한 사용 | 동일 |
| IaC | 없음 | 없음 |
| React, Vue | 없음 | 없음 |

## 관련 문서

- [[Interview-Prep-TechLabs-1st|메인 문서]]
- [[Interview-Prep-TechLabs-1st-Service|서비스 맥락 질문]]
- [[Interview-Prep-TechLabs-1st-Tech-JD|JD 기반 기술 질문]]
