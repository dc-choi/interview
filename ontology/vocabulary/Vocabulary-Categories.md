---
tags: [ontology, vocabulary]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["카테고리 어휘", "Vocabulary Categories"]
ontology_concepts:
  - {id: cat-ai-engineering, type: Category, label: "AI엔지니어링(AIEngineering)", aliases: [AI Engineering]}
  - {id: cat-architecture-design, type: Category, label: "아키텍처&설계(Architecture&Design)", aliases: ["Architecture & Design"]}
  - {id: cat-architecture-evolution, type: Category, label: "Architecture - 진화", broader: cat-architecture-design}
  - {id: cat-architecture-principles, type: Category, label: "Architecture - 원칙", broader: cat-architecture-design}
  - {id: cat-architecture-data-model, type: Category, label: "Architecture - 데이터 모델", aliases: ["Architecture - Data Model"], broader: cat-architecture-design}
  - {id: cat-architecture-oop, type: Category, label: "Architecture - OOP", broader: cat-architecture-design}
  - {id: cat-architecture-ddd-hexagonal, type: Category, label: "Architecture - DDD, Hexagonal", broader: cat-architecture-design}
  - {id: cat-ci-cd, type: Category, label: "CI/CD&배포(CI/CD&Delivery)", aliases: ["CICD&배포(CICD&Delivery)"]}
  - {id: cat-computer-science, type: Category, label: "CS&프로그래밍(CS&Programming)"}
  - {id: cat-cs-javascript, type: Category, label: "CS - JavaScript", broader: cat-computer-science}
  - {id: cat-cs-typescript, type: Category, label: "CS - TypeScript", broader: cat-computer-science}
  - {id: cat-cs-fundamentals, type: Category, label: "CS - 기초", broader: cat-computer-science}
  - {id: cat-cs-algorithm, type: Category, label: "CS - 알고리즘", broader: cat-computer-science}
  - {id: cat-cs-data-structure, type: Category, label: "CS - 자료구조", broader: cat-computer-science}
  - {id: cat-cs-code-quality, type: Category, label: "CS - 코드 품질", broader: cat-computer-science}
  - {id: cat-cs-functional, type: Category, label: "CS - 함수형 프로그래밍", broader: cat-computer-science}
  - {id: cat-cs-c, type: Category, label: "CS - C", broader: cat-computer-science}
  - {id: cat-cs-robotics, type: Category, label: "CS - 로보틱스", broader: cat-computer-science}
  - {id: cat-cs-cpp, type: Category, label: "CS - C++", broader: cat-computer-science}
  - {id: cat-cs-kotlin, type: Category, label: "CS - Kotlin", broader: cat-computer-science}
  - {id: cat-cs-java, type: Category, label: "CS - Java", broader: cat-computer-science}
  - {id: cat-data-storage, type: Category, label: "데이터&저장소(Data&Storage)", aliases: ["Data & Storage"]}
  - {id: cat-data-storage-rdb, type: Category, label: "Data & Storage - RDB", aliases: ["Database - RDBMS"], broader: cat-data-storage}
  - {id: cat-data-storage-nosql, type: Category, label: "Data & Storage - NoSQL", broader: cat-data-storage}
  - {id: cat-data-storage-cache-kv, type: Category, label: "Data & Storage - Cache & KV", broader: cat-data-storage}
  - {id: cat-database-orm, type: Category, label: "Database - ORM", broader: cat-data-storage}
  - {id: cat-finops, type: Category, label: "비용&운영(FinOps)"}
  - {id: cat-infrastructure-cloud, type: Category, label: "인프라&클라우드(Infrastructure&Cloud)", aliases: ["Infrastructure & Cloud"]}
  - {id: cat-infrastructure-aws, type: Category, label: "Infrastructure - AWS", broader: cat-infrastructure-cloud}
  - {id: cat-infrastructure-container, type: Category, label: "Infrastructure - Container", aliases: ["Infrastructure - 컨테이너"], broader: cat-infrastructure-cloud}
  - {id: cat-infrastructure-foundation, type: Category, label: "Infrastructure - 클라우드 기초", broader: cat-infrastructure-cloud}
  - {id: cat-infrastructure-network, type: Category, label: "Infrastructure - 네트워크", aliases: ["Infrastructure - Network"], broader: cat-infrastructure-cloud}
  - {id: cat-messaging-pipeline, type: Category, label: "메시징&파이프라인(Messaging&Pipeline)", aliases: ["Messaging & Data Pipeline"]}
  - {id: cat-messaging-patterns, type: Category, label: "Messaging - 패턴", broader: cat-messaging-pipeline}
  - {id: cat-messaging-brokers, type: Category, label: "Messaging - 브로커", aliases: ["Messaging - Brokers"], broader: cat-messaging-pipeline}
  - {id: cat-messaging-delivery-guarantees, type: Category, label: "Messaging - 배달 보장", broader: cat-messaging-pipeline}
  - {id: cat-messaging-cdc-outbox, type: Category, label: "Messaging - CDC, Outbox", broader: cat-messaging-pipeline}
  - {id: cat-observability, type: Category, label: "관측가능성(Observability)", aliases: [Observability]}
  - {id: cat-os-runtime, type: Category, label: "OS & Runtime", aliases: ["OS&런타임(OS&Runtime)"]}
  - {id: cat-os-nestjs, type: Category, label: "OS & Runtime - NestJS", aliases: ["OS - Runtime - NestJS"], broader: cat-os-runtime}
  - {id: cat-os-nodejs, type: Category, label: "OS - Node.js", aliases: ["OS & Runtime - Node.js"], broader: cat-os-runtime}
  - {id: cat-os-jvm, type: Category, label: "OS - JVM", broader: cat-os-runtime}
  - {id: cat-os-fundamentals, type: Category, label: "OS - 기초", broader: cat-os-runtime}
  - {id: cat-os-runtime-models, type: Category, label: "OS - 런타임", broader: cat-os-runtime}
  - {id: cat-performance-scalability, type: Category, label: "성능&확장성(Performance&Scalability)"}
  - {id: cat-reliability, type: Category, label: Reliability, aliases: ["안정성엔지니어링(Reliability)"]}
  - {id: cat-security, type: Category, label: "보안(Security)", aliases: [Security]}
  - {id: cat-security-crypto, type: Category, label: "Security - 암호", broader: cat-security}
  - {id: cat-security-auth, type: Category, label: "Security - 인증", broader: cat-security}
  - {id: cat-security-network, type: Category, label: "Security - 네트워크 보안", broader: cat-security}
  - {id: cat-security-web-attacks, type: Category, label: "Security - 웹 공격", broader: cat-security}
  - {id: cat-senior, type: Category, label: "시니어역량(SeniorEngineer)", aliases: [Senior Engineer Capabilities]}
  - {id: cat-senior-decision-making, type: Category, label: "Senior - 의사결정", broader: cat-senior}
  - {id: cat-senior-communication, type: Category, label: "Senior - 커뮤니케이션", broader: cat-senior}
  - {id: cat-senior-outcomes, type: Category, label: "Senior - 성과", broader: cat-senior}
  - {id: cat-senior-code-review, type: Category, label: "Senior - 코드 리뷰", broader: cat-senior}
  - {id: cat-senior-design, type: Category, label: "Senior - 설계", broader: cat-senior}
  - {id: cat-testing-quality, type: Category, label: "테스트&품질(Testing&Quality)", aliases: ["Testing & Quality"]}
  - {id: cat-web, type: Category, label: "웹&네트워크(Web&Network)"}
  - {id: cat-web-network, type: Category, label: "Web - 네트워크", broader: cat-web}
  - {id: cat-web-http, type: Category, label: "Web - HTTP", broader: cat-web}
  - {id: cat-web-realtime, type: Category, label: "Web - 실시간", broader: cat-web}
  - {id: cat-business-product, type: Category, label: "비즈니스&제품(Business&Product)"}
  - {id: cat-economics, type: Category, label: Economics}
  - {id: cat-economics-financial-markets, type: Category, label: "Economics - Financial Markets", broader: cat-economics}
  - {id: cat-growth, type: Category, label: "Growth & Fit", aliases: ["Fit - 성장"]}
  - {id: cat-growth-learning, type: Category, label: "Growth - 학습", broader: cat-growth}
  - {id: cat-growth-career-stages, type: Category, label: "Growth - 커리어 단계", broader: cat-growth}
  - {id: cat-growth-habits, type: Category, label: "Growth - 습관", broader: cat-growth}
  - {id: cat-growth-community, type: Category, label: "Growth - 커뮤니티", broader: cat-growth}
  - {id: cat-growth-hiring-market, type: Category, label: "Growth - 채용 시장", broader: cat-growth}
  - {id: cat-growth-antipatterns, type: Category, label: "Growth - 안티패턴", broader: cat-growth}
  - {id: cat-growth-soft-skills, type: Category, label: "Growth - 소프트스킬", broader: cat-growth}
  - {id: cat-interview, type: Category, label: "Interview - Fit"}
  - {id: cat-interview-retrospective, type: Category, label: "Interview - Fit - Retrospective", aliases: [면접 회고], broader: cat-interview}
  - {id: cat-interview-answers, type: Category, label: "Interview - 내 답변 마스터"}
  - {id: cat-interview-prep, type: Category, label: "Interview - 준비", aliases: ["Interview - 준비 가이드", 면접 준비]}
  - {id: cat-domain-research, type: Category, label: 도메인 조사}
  - {id: cat-job-search, type: Category, label: Job Search, aliases: ["Fit - 구직", 이직 준비]}
  - {id: cat-job-search-resume, type: Category, label: "Job Search - 이력서", broader: cat-job-search}
  - {id: cat-job-search-process, type: Category, label: "Job Search - 프로세스", broader: cat-job-search}
  - {id: cat-job-search-companies, type: Category, label: "Job Search - 회사 이해", broader: cat-job-search}
  - {id: cat-salary-negotiation, type: Category, label: Salary Negotiation}
  - {id: cat-seminar, type: Category, label: "Fit - 세미나"}
  - {id: cat-seminar-meetups, type: Category, label: "Seminar - 밋업", aliases: [밋업], broader: cat-seminar}
  - {id: cat-seminar-companies, type: Category, label: "Seminar - 회사", broader: cat-seminar}
  - {id: cat-seminar-career, type: Category, label: "Seminar - 커리어", broader: cat-seminar}
---

# 카테고리 어휘

문서 frontmatter의 `category` 문자열을 Category 개념에 잇는 매핑 층이다. 같은 분류의 다른 표기는 `aliases`에 두어 모든 문자열이 정확히 한 개념으로 풀리게 하고, 상위 분류는 `A - B` 표기와 폴더 인덱스가 밝힌 경우에만 `broader`로 잇는다. 새 카테고리 문자열은 해당 개념의 `aliases`에 넣거나 개념 한 줄을 추가한다.

상위: [[Ontology-Vocabulary]]
