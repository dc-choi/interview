---
tags: [ontology, vocabulary, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["온톨로지 통제 어휘", "Ontology Vocabulary"]
---

# 온톨로지 통제 어휘

문서의 태그와 카테고리 표기를 Topic과 Category 개념으로 묶는 통제 어휘다. 각 어휘 문서는 frontmatter `ontology_concepts`에 개념을 한 줄씩 선언하고, 색인은 이 선언으로 문서와 개념을 `tagged_with`, `in_category` 관계로 잇는다. 문서의 태그와 카테고리 값은 그대로 두고 표기의 통합과 상하위 관계는 이 어휘에서만 고친다.

## 목차

- [[Vocabulary-Categories]] — 문서 `category` 문자열의 Category 개념
- [[Vocabulary-AI]] — AI 모델, 에이전트, 검색 증강과 Palantir 제품의 Topic 개념
- [[Vocabulary-Frontend]] — 웹, React, Next.js, Expo와 React Native의 Topic 개념
- [[Vocabulary-Backend]] — Node.js, NestJS, Spring, JPA와 ORM의 Topic 개념
- [[Vocabulary-Data]] — 데이터베이스, 캐시, 검색, 메시징과 데이터 파이프라인의 Topic 개념
- [[Vocabulary-Infrastructure]] — 클라우드와 AWS, 컨테이너, 배포, 관측과 장애 대응, 네트워크, 보안의 Topic 개념
- [[Vocabulary-CS]] — 언어, 자료구조와 알고리즘, 운영체제, 프로그래밍 패러다임, 아키텍처와 테스트의 Topic 개념
- [[Vocabulary-Business]] — 제품, 마케팅, 커머스, 결제, 재무와 경제의 Topic 개념
- [[Vocabulary-Career]] — 구직과 면접, 성장, 시니어 역량과 회사의 Topic 개념

## 읽을 때의 주의

- 태그는 Topic뿐 아니라 Category의 label과 alias에도 대응한다. 태그 `security`, `observability`, `reliability`, `economics`, `job-search`, `salary-negotiation`은 같은 이름의 Category 개념에 연결되며(사용 426회), 같은 키의 Topic을 추가하면 충돌로 양쪽 모두 대응을 잃는다. `cat-security`의 alias `Security`와 `cat-observability`의 alias `Observability`를 지우면 이 태그들이 경고 없이 미대응이 된다.
- 한글 alias는 2026-11-19 기준 어떤 태그와도 대응하지 않는다. 태그가 모두 영문이기 때문이며, 한글 alias는 개념 질의의 입력 표현으로만 쓰인다.
- 한 태그가 Vault 안에서 여러 뜻으로 쓰이면 개념도 그 뜻들을 함께 담는다. 어휘는 같은 태그를 뜻에 따라 나눌 수 없다.

## 뜻이 섞인 개념

2026-11-19 검증 에이전트가 문서의 태그 줄, 경로와 제목으로 집계한 것이다. 숫자는 뜻별 문서 수이며 `retention`, `inheritance`, `querydsl`만 메인 세션에서 다시 확인했다. 이 개념들에는 뜻을 좁히는 alias나 `broader`를 추가하지 않는다. 정확도가 필요하면 소수 의미 문서의 태그를 고친다. 같은 날 소수 의미가 분명한 16개 문서의 태그를 고쳤고 표에 적었다. 고친 뒤의 문서 수는 다시 세지 않았다.

| 개념 | 섞인 뜻 |
| --- | --- |
| `retention` | 데이터 보존 8, 사용자 리텐션 4, 인력 유지 2. 뒤의 둘은 `user-retention`, `employee-retention`으로 고쳤다 |
| `marketplace` | Palantir와 AWS Marketplace 15, 일반 마켓플레이스 13 |
| `process` | OS 프로세스 6, 업무 절차와 Palantir Machinery 7 |
| `proxy` | 네트워크 프록시 8, Spring AOP, 디자인 패턴, JavaScript Proxy, 통계 대리 지표 8 |
| `framework` | 소프트웨어 프레임워크 8, 판단과 전략의 틀 7 |
| `session` | 웹 세션 10, 에이전트와 챗봇 세션 5 |
| `lambda` | AWS Lambda 10, Java 람다식 4 |
| `map` | Palantir Map 9, 자료구조와 타입 5 |
| `communication` | 소통 27, Expo SDK API 묶음 8 |
| `performance` | 성능 122, 업무와 사업 성과 3. 성과 평가와 OKR 문서 5건을 `work-performance`로 고쳤다 |
| `network`, `networking` | 두 개념으로 나뉘어 있다. `networking` 19건 중 17건은 컴퓨터 네트워크, 2건은 인맥 형성. 2건을 `professional-networking`으로 고쳤다 |
| `crypto` | 암호 21, 암호화폐 1. 1건을 `cryptocurrency`로 고쳤다 |
| `macro` | 거시경제 17, Rust 매크로 1. 1건을 `rust-macro`로 고쳤다 |
| `oracle` | Oracle Database 15, 가격 오라클 1. 1건을 `price-oracle`로 고쳤다 |
| `inheritance` | 객체 상속, CSS 상속, 관계형 supertype 매핑, 상속 재산이 섞여 `broader: oop`를 제거 |

같은 성격의 태그로 `supply-chain`, `growth`, `behavioral`, `organization`, `strategy`, `transaction`, `streaming`, `model`, `prototype`, `decorator`, `container`, `repository`, `agent`가 있다. `continuous-delivery`의 `broader: cicd`는 25건 중 24건이 Palantir Apollo 문서이고, `oauth`의 `broader: authorization`은 로그인과 신원 용도의 문서를 포함한다. 두 계층은 정의상의 포함 관계로 유지한다.

Expo와 Palantir 문서 묶음에만 쓰이는 태그(`development`, `updates`, `workflows`, `models`, `functions`, `connectors`)와 면접 폴더에만 쓰이는 태그(`tech`, `common`)는 label이 일반 주제처럼 보이지만 실제로는 그 묶음의 구분 표시다.

Java 라이브러리 Querydsl의 태그 `querydsl`(11건)과 OpenSearch Query DSL의 태그 `query-dsl`(6건)은 비교 키가 같아 한 개념으로 합쳐지므로 개념을 두지 않았다.

선언 형식은 [[Ontology-Schema]], alias와 `broader`를 고치는 기준은 [[Ontology-Curation#통제 어휘의 유지]]를 따른다.

상위: [[Development-Ontology]]
