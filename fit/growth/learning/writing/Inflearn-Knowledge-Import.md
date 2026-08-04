---
tags: [growth, learning, documentation, inflearn, tracker]
status: todo
category: "Growth - 학습"
aliases: ["Inflearn Knowledge Import", "인프런 지식 문서화 트래커"]
---

# 인프런 지식 문서화 트래커

인프런 MCP가 현재 계정에 노출한 92개 수강권의 내용을 재사용 가능한 지식 문서로 통합하는 작업 대기열이다. 이 트래커의 완료는 강의 수강이나 숙련 완료를 뜻하지 않는다. 강의 원문을 보존하는 저장소도 아니며, 기존 vault에서 빠진 개념을 확인하고 출처 중립적으로 보강했는지를 추적한다.

## 처리 원칙

- 강의별 원문 요약 파일을 만들지 않고 같은 개념의 기존 문서를 먼저 보강한다.
- 여러 주제의 강의는 기술 카테고리별 문서로 나눠 반영한다.
- 강의 구현체가 현재 기술 축과 다르면 원리를 보존하되 예시는 NestJS와 TypeORM 기준으로 번역한다.
- 변동 가능한 제품, 보안과 표준 주장은 공식 1차 출처로 다시 확인한 문서만 verified_at을 갱신한다.
- 각 강의는 커리큘럼 확인, lecture 본문 수집, 기존 문서 대조, 문서 반영, 링크와 형식 검증을 모두 마쳐야 통합 완료다.
- 접근 실패는 완료로 간주하지 않고 실패 단계와 재시도 결과를 남긴다.

## 인벤토리 기준

- 조회일: 2026-08-04
- 수강권: 92개
- 커리큘럼 조회 성공: 92개
- 커리큘럼 조회 실패: 0개
- 확인된 lecture 단원: 4,880개
- quiz 등 기타 단원: 607개
- 커리큘럼에 표시된 총 영상 시간: 약 869시간. runtime이 0인 단원이 있어 실제 합계의 하한이다
- 현재 통합 완료: 89개. 원문 전문 미확보 3개는 Course 327754, 327527, 330462이며 최종 재감사 결과를 아래에 기록했다. GraphQL, HTTP, Node.js/NestJS, JavaScript/TypeScript/Java/C++/JSP/React, PostgreSQL, MySQL/Oracle/SQL/JPA/Spring Data/Querydsl/MyBatis, Redis/Kafka, AWS, V8/Deno, Docker/Kubernetes, Git/GitHub, 네트워크, 운영체제/컴퓨터 구조, 자료구조/알고리즘, 객체지향/함수형/디자인 패턴, 동시성, Spring MVC/JDBC/Security/AOP/헥사고날, 마이크로서비스/분산 트랜잭션, 커머스 도메인, DB 모델링/설계/성능/운영, 시스템 설계, 배포, 테스트, 브라우저 DOM/CSS, 프로덕트 디자인 협업, 이력서, 취업/이직, 선착순 이벤트와 재고 동시성 문서군에 통합했다

## 강의 대기열

| 순서 | Course ID | 강의 | Lecture | 기타 | 문서화 상태 |
|---:|---:|---|---:|---:|---|
| 1 | 340490 | [개발자 개념 장착 - 프로그래밍 개발에 필요한 필수 개념과 핵심 이론정리](https://www.inflearn.com/courses/lecture?courseId=340490) | 29 | 0 | 기존 문서 통합 완료 |
| 2 | 341963 | [카카오 면접관이 알려주는 문서기반의 프레임워크 통신 패턴을 위한 GraphQL](https://www.inflearn.com/courses/lecture?courseId=341963) | 16 | 3 | 기존 문서 통합 완료 |
| 3 | 326283 | [얄팍한 GraphQL과 Apollo](https://www.inflearn.com/courses/lecture?courseId=326283) | 14 | 4 | 기존 문서 통합 완료 |
| 4 | 336276 | [가장 쉬운 Node.js - by 얄코](https://www.inflearn.com/courses/lecture?courseId=336276) | 32 | 2 | 기존 문서 통합 완료, 쿠폰 안내 1건 본문 없음 |
| 5 | 329894 | [실습으로 배우는 선착순 이벤트 시스템](https://www.inflearn.com/courses/lecture?courseId=329894) | 16 | 3 | 기존 문서 통합 완료 |
| 6 | 328995 | [재고시스템으로 알아보는 동시성이슈 해결방법](https://www.inflearn.com/courses/lecture?courseId=328995) | 18 | 3 | 기존 문서 통합 완료, 소스코드 1건 본문 없음 |
| 7 | 341698 | [2,000++억건 데이터를 다루는 실리콘 밸리 AI 개발자의 PostgreSQL](https://www.inflearn.com/courses/lecture?courseId=341698) | 39 | 7 | 기존 문서 통합 완료, 커뮤니티 안내 1건 본문 없음 |
| 8 | 325381 | [AWS(Amazon Web Service) 입문자를 위한 강의](https://www.inflearn.com/courses/lecture?courseId=325381) | 49 | 9 | 기존 문서 통합 완료, 최신성 교정 |
| 9 | 332466 | [빠르게 알아보는 Javascript V8엔진](https://www.inflearn.com/courses/lecture?courseId=332466) | 20 | 4 | 기존 문서 통합 완료, 자료 1건 본문 없음 |
| 10 | 341151 | [10,000장의 이력서를 본 기술이사의 이력서 가이드](https://www.inflearn.com/courses/lecture?courseId=341151) | 59 | 5 | 기존 문서 통합 완료 |
| 11 | 331036 | [그림으로 쉽게 배우는 네트워크](https://www.inflearn.com/courses/lecture?courseId=331036) | 56 | 6 | 기존 문서 통합 완료, 최신성 교정 |
| 12 | 329927 | [그림으로 쉽게 배우는 자료구조와 알고리즘 (심화편)](https://www.inflearn.com/courses/lecture?courseId=329927) | 48 | 8 | 기존 문서 통합 완료 |
| 13 | 339423 | [10,000++억의 데이터를 다루는 카카오 면접관의 MySQL](https://www.inflearn.com/courses/lecture?courseId=339423) | 45 | 7 | 기존 문서 통합 완료, 첨부 자료 1건 본문 없음, 최신성 교정 |
| 14 | 334899 | [시니어 면접관이 알려주는 개발자 취업과 이직 한방에 해결하기 [실전편]](https://www.inflearn.com/courses/lecture?courseId=334899) | 22 | 3 | 기존 문서 통합 완료 |
| 15 | 334892 | [시니어 면접관이 알려주는 개발자 취업과 이직 한방에 해결하기 [이론편]](https://www.inflearn.com/courses/lecture?courseId=334892) | 23 | 4 | 기존 문서 통합 완료 |
| 16 | 331869 | [Backend 멀티쓰레드 이해하고 통찰력 키우기](https://www.inflearn.com/courses/lecture?courseId=331869) | 21 | 3 | 기존 문서 통합 완료, 자료 링크 1건 본문 없음 |
| 17 | 336073 | [토비의 클린 스프링 - 도메인 모델 패턴과 헥사고날 아키텍처 Part 1](https://www.inflearn.com/courses/lecture?courseId=336073) | 43 | 7 | 기존 문서 통합 완료, 최신성 교정 |
| 18 | 340204 | [제미니의 개발실무 - 커머스 백엔드 레거시와 AI 활용편](https://www.inflearn.com/courses/lecture?courseId=340204) | 37 | 8 | 기존 문서 통합 완료, AI/커머스 불변식 교정 |
| 19 | 340524 | [김영한의 실전 데이터베이스 - 설계 2편, 실무에서 반드시 마주치는 9가지 설계 패턴](https://www.inflearn.com/courses/lecture?courseId=340524) | 87 | 9 | 기존 문서 통합 완료, 9개 설계 패턴/최신성 교정 |
| 20 | 339108 | [제미니의 개발실무 - 커머스 백엔드 기본편](https://www.inflearn.com/courses/lecture?courseId=339108) | 44 | 13 | 기존 문서 통합 완료, PDF/프로젝트 자료 1건 본문 없음 |
| 21 | 336089 | [빈둥대던 취준생의 취업 이야기와 서버 최적화 및 시스템 디자인](https://www.inflearn.com/courses/lecture?courseId=336089) | 20 | 4 | 기존 문서 통합 완료, 강의 자료 1건 본문 없음 |
| 22 | 334085 | [비전공자도 이해할 수 있는 Docker 입문/실전](https://www.inflearn.com/courses/lecture?courseId=334085) | 82 | 9 | 기존 문서 통합 완료, 최신성 교정 |
| 23 | 326598 | [AWS(Amazon Web Service) 중/상급자를 위한 강의](https://www.inflearn.com/courses/lecture?courseId=326598) | 57 | 11 | 기존 문서 통합 완료, AWS 공식 최신성 교정 |
| 24 | 328412 | [Microservice 이해(with MSA패턴)](https://www.inflearn.com/courses/lecture?courseId=328412) | 30 | 4 | 기존 문서 통합 완료, 개념 경계 교정 |
| 25 | 332731 | [마이크로서비스 디자인 패턴 완벽 가이드](https://www.inflearn.com/courses/lecture?courseId=332731) | 118 | 18 | 기존 문서 통합 완료, 실습/퀴즈 13건 본문 없음, 최신성 교정 |
| 26 | 335130 | [시스템 디자인 첫걸음: 면접에서 돋보이는 백엔드 아키텍처 설계하기](https://www.inflearn.com/courses/lecture?courseId=335130) | 20 | 6 | 기존 문서 통합 완료, 수업 자료 1건 본문 없음 |
| 27 | 337778 | [주문시스템으로 알아보는 분산트랜잭션](https://www.inflearn.com/courses/lecture?courseId=337778) | 46 | 2 | 기존 문서 통합 완료, 소스코드 1건 본문 없음, 최신성 교정 |
| 28 | 338886 | [김영한의 실전 데이터베이스 - 설계 1편, 현대적 데이터 모델링 완전 정복](https://www.inflearn.com/courses/lecture?courseId=338886) | 83 | 11 | 기존 문서 통합 완료, SQL 소스 1건 본문 없음, 모델링 원칙 교정 |
| 29 | 338212 | [김영한의 실전 데이터베이스 - 기본편](https://www.inflearn.com/courses/lecture?courseId=338212) | 84 | 12 | 기존 문서 통합 완료, SQL 소스 1건 본문 없음, MySQL 8.4 교정 |
| 30 | 338473 | [5천억건이 넘는 금융 데이터를 처리하는 토스 개발자에게 배우는 MySQL](https://www.inflearn.com/courses/lecture?courseId=338473) | 24 | 6 | 기존 문서 통합 완료, 24개 본문/MySQL 8.4/Spark/Debezium 교정 |
| 31 | 333745 | [Real MySQL 시즌 1 - Part 2](https://www.inflearn.com/courses/lecture?courseId=333745) | 13 | 1 | 기존 문서 통합 완료, MySQL 8.4 교정 |
| 32 | 333931 | [Real MySQL 시즌 1 - Part 1](https://www.inflearn.com/courses/lecture?courseId=333931) | 13 | 1 | 기존 문서 통합 완료, MySQL 8.4 교정 |
| 33 | 336546 | [커머스 서비스로 배우는 NestJS 실전 개발 (w. Prisma, Docker, Redis, Kafka)](https://www.inflearn.com/courses/lecture?courseId=336546) | 22 | 3 | 기존 문서 통합 완료, TypeORM 번역/Redis/Kafka 교정 |
| 34 | 336658 | [오브젝트 - 설계 원칙편](https://www.inflearn.com/courses/lecture?courseId=336658) | 33 | 5 | 기존 문서 통합 완료, 개념 경계 교정 |
| 35 | 334416 | [오브젝트 - 기초편](https://www.inflearn.com/courses/lecture?courseId=334416) | 31 | 5 | 기존 문서 통합 완료, 자료 1건 본문 없음, 개념 경계 교정 |
| 36 | 334495 | [떠먹여주는 객체지향 디자인 패턴  - by 얄코](https://www.inflearn.com/courses/lecture?courseId=334495) | 33 | 1 | 기존 문서 통합 완료, 패턴 경계 교정 |
| 37 | 324019 | [함수형 프로그래밍과 JavaScript ES6+ 응용편](https://www.inflearn.com/courses/lecture?courseId=324019) | 48 | 6 | 기존 문서 통합 완료, 48개 본문/ECMAScript/결제 대사 안전성 교정 |
| 38 | 325633 | [모던 자바스크립트(ES6+) 심화](https://www.inflearn.com/courses/lecture?courseId=325633) | 80 | 15 | 기존 문서 통합 완료, 80개 본문/ECMAScript/Fetch/XHR/Worker 최신성 교정 |
| 39 | 324642 | [모던 자바스크립트(ES6+) 기본](https://www.inflearn.com/courses/lecture?courseId=324642) | 94 | 17 | 기존 문서 통합 완료, 94개 본문/현행 ECMAScript/Unicode/Weak collection 교정 |
| 40 | 247815 | [함수형 프로그래밍과 JavaScript ES6+](https://www.inflearn.com/courses/lecture?courseId=247815) | 71 | 10 | 기존 문서 통합 완료, 70개 본문/ECMAScript/Promise/동시성 교정, 자료 1건 본문 없음 |
| 41 | 330452 | [한 입 크기로 잘라먹는 타입스크립트(TypeScript)](https://www.inflearn.com/courses/lecture?courseId=330452) | 64 | 10 | 기존 문서 통합 완료, 최신성 교정 |
| 42 | 336749 | [만들면서 쉽게 배우는 컴퓨터 구조](https://www.inflearn.com/courses/lecture?courseId=336749) | 68 | 9 | 기존 문서 통합 완료, 표준/구현 차이 교정 |
| 43 | 327754 | [이펙티브 타입스크립트 스터디](https://www.inflearn.com/courses/lecture?courseId=327754) | 16 | 0 | 부분 통합, 최종 재감사 0/16 본문, 공개 chapter와 공식 문서만 반영, 전문 대조 불가 |
| 44 | 328284 | [제대로 파는 Git & GitHub - by 얄코](https://www.inflearn.com/courses/lecture?courseId=328284) | 61 | 0 | 기존 문서 통합 완료, 최신성 교정 |
| 45 | 327501 | [갖고노는 MySQL 데이터베이스 by 얄코](https://www.inflearn.com/courses/lecture?courseId=327501) | 23 | 5 | 기존 문서 통합 완료, 최신성/SQL 의미 교정 |
| 46 | 329966 | [타입스크립트의 모든 것](https://www.inflearn.com/courses/lecture?courseId=329966) | 65 | 9 | 기존 문서 통합 완료, 64개 본문/TypeScript 7.0/Node/NestJS/React/Deno 교정, 1건 본문 없음 |
| 47 | 328188 | [그림으로 쉽게 배우는 운영체제](https://www.inflearn.com/courses/lecture?courseId=328188) | 44 | 8 | 기존 문서 통합 완료, 표준/구현 경계 교정 |
| 48 | 328971 | [그림으로 쉽게 배우는 자료구조와 알고리즘 (기본편)](https://www.inflearn.com/courses/lecture?courseId=328971) | 25 | 3 | 기존 문서 통합 완료, 개념 경계 교정 |
| 49 | 324398 | [자바스크립트 중고급: 엔진 핵심](https://www.inflearn.com/courses/lecture?courseId=324398) | 50 | 7 | 기존 문서 통합 완료, 50개 본문/현행 execution context/scope/this/prototype 교정 |
| 50 | 324235 | [자바스크립트 비기너: 튼튼한 기본 만들기](https://www.inflearn.com/courses/lecture?courseId=324235) | 112 | 14 | 기존 문서 통합 완료, 112개 본문/현행 ECMAScript/타입 변환/Array/JSON/Date 교정 |
| 51 | 332506 | [김영한의 실전 자바 - 기본편](https://www.inflearn.com/courses/lecture?courseId=332506) | 98 | 12 | 기존 문서 통합 완료, 97개 본문/Java SE 26/참조/생성/상속/OCP 교정, 소스 1건 본문 없음 |
| 52 | 326029 | [따라하며 배우는 TDD 개발 [2023.11 업데이트]](https://www.inflearn.com/courses/lecture?courseId=326029) | 48 | 7 | 기존 문서 통합 완료, 46개 본문/Jest 30/Express 5/NestJS 테스트 교정, 자료 2건 본문 없음 |
| 53 | 329605 | [넓고 얕게 외워서 컴공 전공자 되기](https://www.inflearn.com/courses/lecture?courseId=329605) | 31 | 5 | 기존 문서 통합 완료, 31개 본문/CS/컴파일/동시성/알고리즘 경계 교정 |
| 54 | 327273 | [탄탄한 백엔드 NestJS, 기초부터 심화까지](https://www.inflearn.com/courses/lecture?courseId=327273) | 71 | 9 | 기존 문서 통합 완료, 71개 본문/NestJS/TypeORM/AWS/AdminJS 교정 |
| 55 | 324109 | [자바 ORM 표준 JPA 프로그래밍 - 기본편](https://www.inflearn.com/courses/lecture?courseId=324109) | 56 | 9 | 기존 문서 통합 완료, 54개 본문/Jakarta Persistence 3.2/Hibernate 7.4/JPQL 교정, 2건 본문 없음 |
| 56 | 327527 | [따라하며 배우는 NestJS](https://www.inflearn.com/courses/lecture?courseId=327527) | 60 | 0 | 최종 접근 불가, app/direct 각 60/60 `not_found`, 단원 제한 검색 0건, 본문 추정 안 함 |
| 57 | 328553 | [React + API Server 프로젝트 개발과 배포 (CI/CD)](https://www.inflearn.com/courses/lecture?courseId=328553) | 8 | 1 | 기존 문서 통합 완료, 배포/보안 경계 교정 |
| 58 | 326485 | [10주완성 C++ 코딩테스트 \| 알고리즘 코딩테스트](https://www.inflearn.com/courses/lecture?courseId=326485) | 249 | 9 | 기존 문서 통합 완료, 246개 본문/C++/STL/완전 탐색/누적 합/Fenwick/LIS/graph/DP 교정, 교안 3건 본문 없음 |
| 59 | 324591 | [스프링 시큐리티](https://www.inflearn.com/courses/lecture?courseId=324591) | 64 | 0 | 기존 문서 통합 완료, 자료 2건 본문 없음, Spring Security 7.1 교정 |
| 60 | 325969 | [스프링 핵심 원리 - 기본편](https://www.inflearn.com/courses/lecture?courseId=325969) | 65 | 9 | 기존 문서 통합 완료, 64개 본문/Spring 7.0.8/Boot 4.1.0 교정, PPT 자료 1건 본문 없음 |
| 61 | 325630 | [스프링 입문 - 코드로 배우는 스프링 부트, 웹 MVC, DB 접근 기술](https://www.inflearn.com/courses/lecture?courseId=325630) | 28 | 5 | 기존 문서 통합 완료, 28개 본문/Spring Boot 4.1/MVC/JDBC/JPA 테스트 교정 |
| 62 | 326277 | [모든 개발자를 위한 HTTP 웹 기본 지식](https://www.inflearn.com/courses/lecture?courseId=326277) | 41 | 7 | 기존 문서 통합 완료, 자료 2건 본문 없음, RFC 최신성 교정 |
| 63 | 40164 | [테스트주도개발(TDD)로 만드는 NodeJS API 서버](https://www.inflearn.com/courses/lecture?courseId=40164) | 60 | 8 | 기존 문서 통합 완료, HTTP 통합 테스트 경계 교정 |
| 64 | 182992 | [자바 스프링 프레임워크(renew ver.) - 신입 프로그래머를 위한 강좌](https://www.inflearn.com/courses/lecture?courseId=182992) | 27 | 4 | 기존 문서 통합 완료, 강의자료 1건 본문 없음, 최신성 교정 |
| 65 | 182835 | [자바 프로그래밍 입문 강좌 (renew ver.) - 초보부터 개발자 취업까지!!](https://www.inflearn.com/courses/lecture?courseId=182835) | 29 | 4 | 기존 문서 통합 완료, 28개 본문/Java SE 26/언어/객체/I/O 교정, 강의자료 1건 본문 없음 |
| 66 | 182737 | [실전 JSP (renew ver.) - 신입 프로그래머를 위한 강좌](https://www.inflearn.com/courses/lecture?courseId=182737) | 21 | 2 | 기존 문서 통합 완료, 20개 본문/Jakarta Servlet 6.1/Pages 4.0/JDBC 교정, 강의자료 1건 본문 없음 |
| 67 | 34982 | [오라클 데이터베이스 11g 프로그래밍 기초 (상)](https://www.inflearn.com/courses/lecture?courseId=34982) | 24 | 0 | 기존 문서 통합 완료, 23개 본문/Oracle 26ai/ISO SQL 교정, 강의자료 1건 본문 없음 |
| 68 | 337730 | [토비의 클린 스프링 - 도메인 모델 패턴과 헥사고날 아키텍처 Part 2](https://www.inflearn.com/courses/lecture?courseId=337730) | 48 | 8 | 기존 문서 통합 완료, 최신성 교정 |
| 69 | 343202 | [김영한의 실전 데이터베이스 - 성능 최적화, 실행 계획과 인덱스 완전 정복](https://www.inflearn.com/courses/lecture?courseId=343202) | 104 | 15 | 기존 문서 통합 완료, MySQL 8.4 실행 계획/인덱스 교정 |
| 70 | 343428 | [Docker가 쉬워지는 운영체제 이야기](https://www.inflearn.com/courses/lecture?courseId=343428) | 45 | 7 | 기존 문서 통합 완료, 최신성 교정 |
| 71 | 340962 | [금융 인프라를 운영하는 Toss 개발자의 Docker](https://www.inflearn.com/courses/lecture?courseId=340962) | 23 | 5 | 기존 문서 통합 완료, 최신성 교정 |
| 72 | 340716 | [금융 인프라를 운영하는 Toss 개발자의 Kubernetes](https://www.inflearn.com/courses/lecture?courseId=340716) | 29 | 5 | 기존 문서 통합 완료, 최신성 교정 |
| 73 | 338233 | [디자인 프로세스 제로투원 : Figma로 기획부터 디자인, 딜리버리까지](https://www.inflearn.com/courses/lecture?courseId=338233) | 6 | 1 | 기존 문서 통합 완료, 최신성/개념 경계 교정 |
| 74 | 326674 | [스프링 MVC 1편 - 백엔드 웹 개발 핵심 기술](https://www.inflearn.com/courses/lecture?courseId=326674) | 72 | 7 | 기존 문서 통합 완료, 71개 본문/Servlet/MVC/dispatch/binding/SSR 교정, PPT 1건 본문 없음 |
| 75 | 327260 | [스프링 MVC 2편 - 백엔드 웹 개발 활용 기술](https://www.inflearn.com/courses/lecture?courseId=327260) | 129 | 11 | 기존 문서 통합 완료, 128개 본문/Thymeleaf/검증/세션/오류/변환/업로드 교정, 소스 1건 본문 없음 |
| 76 | 327901 | [스프링 핵심 원리 - 고급편](https://www.inflearn.com/courses/lecture?courseId=327901) | 125 | 13 | 기존 문서 통합 완료, 124개 본문/ThreadLocal/template/callback/proxy/AOP/pointcut/self-invocation 교정, 소스 1건 본문 없음 |
| 77 | 330459 | [스프링 부트 - 핵심 원리와 활용](https://www.inflearn.com/courses/lecture?courseId=330459) | 107 | 9 | 기존 문서 통합 완료, 105개 본문/내장 서버/자동 구성/외부 설정/Actuator/metric 교정, 자료 2건 본문 없음 |
| 78 | 328723 | [스프링 DB 1편 - 데이터 접근 핵심 원리](https://www.inflearn.com/courses/lecture?courseId=328723) | 57 | 7 | 기존 문서 통합 완료, 57개 본문/JDBC/커넥션 풀/트랜잭션/예외 교정 |
| 79 | 328990 | [스프링 DB 2편 - 데이터 접근 활용 기술](https://www.inflearn.com/courses/lecture?courseId=328990) | 88 | 11 | 기존 문서 통합 완료, 86개 본문/JDBC/MyBatis/JPA/Querydsl/transaction test 교정, 자료 2건 본문 없음 |
| 80 | 336672 | [김영한의 실전 자바 - 고급 3편, 람다, 스트림, 함수형 프로그래밍](https://www.inflearn.com/courses/lecture?courseId=336672) | 99 | 13 | 기존 문서 통합 완료, 98개 본문/lambda/함수형 interface/Stream/Collector/Optional/병렬 처리 교정, 소스 1건 본문 없음 |
| 81 | 331070 | [실무 중심!  FE 입문자를 위한 React](https://www.inflearn.com/courses/lecture?courseId=331070) | 70 | 14 | 기존 문서 통합 완료, 69개 본문/React/Hook/Router/상태/API/폼 교정, 자료 1건 본문 없음 |
| 82 | 334977 | [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/courses/lecture?courseId=334977) | 101 | 13 | 기존 문서 통합 완료, 100개 본문/charset/I/O/file/socket/HTTP/reflection/annotation 교정, 소스 1건 본문 없음 |
| 83 | 334352 | [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/courses/lecture?courseId=334352) | 118 | 13 | 기존 문서 통합 완료, 117개 본문/thread/JMM/monitor/lock/BlockingQueue/atomic/executor 교정, 소스 1건 본문 없음 |
| 84 | 333308 | [김영한의 실전 자바 - 중급 1편](https://www.inflearn.com/courses/lecture?courseId=333308) | 103 | 10 | 기존 문서 통합 완료, 102개 본문/Object/String/래퍼/enum/시간/중첩 클래스/예외 교정, 소스 1건 본문 없음 |
| 85 | 333482 | [김영한의 실전 자바 - 중급 2편](https://www.inflearn.com/courses/lecture?courseId=333482) | 93 | 10 | 기존 문서 통합 완료, 92개 본문/generic/List/Set/Map/hash/iterator/sort 교정, 소스 1건 본문 없음 |
| 86 | 330462 | [Do it! 알고리즘 코딩테스트 with JAVA](https://www.inflearn.com/courses/lecture?courseId=330462) | 60 | 0 | 최종 접근 불가, app/direct 각 60/60 `not_found`, 단원 제한 검색 0건, 본문 추정 안 함 |
| 87 | 324214 | [실전! 스프링 부트와 JPA 활용2 - API 개발과 성능 최적화](https://www.inflearn.com/courses/lecture?courseId=324214) | 24 | 4 | 기존 문서 통합 완료, 24개 본문/DTO/fetch join/collection/OSIV/Hibernate 7.4 교정 |
| 88 | 324474 | [실전! 스프링 데이터 JPA](https://www.inflearn.com/courses/lecture?courseId=324474) | 32 | 5 | 기존 문서 통합 완료, 32개 본문/Spring Data JPA 4.1/repository/query/projection 교정 |
| 89 | 324476 | [실전! Querydsl](https://www.inflearn.com/courses/lecture?courseId=324476) | 41 | 6 | 기존 문서 통합 완료, 41개 본문/조건/조인/projection/동적 query/bulk/repository/paging 교정 |
| 90 | 324119 | [실전! 스프링 부트와 JPA 활용1 - 웹 애플리케이션 개발](https://www.inflearn.com/courses/lecture?courseId=324119) | 36 | 7 | 기존 문서 통합 완료, 36개 본문/JPA 관계/변경 감지/웹 binding/주문 불변식/동적 검색 교정 |
| 91 | 328275 | [ES6 문법과 함께하는 모던 Javascript(자바스크립트) 고급 Part.3](https://www.inflearn.com/courses/lecture?courseId=328275) | 24 | 2 | 기존 문서 통합 완료, 24개 본문/DOM/XSS/event/CSS 호환성 교정 |
| 92 | 36175 | [오라클 데이터베이스 11g 프로그래밍 기초 (하)](https://www.inflearn.com/courses/lecture?courseId=36175) | 18 | 0 | 기존 문서 통합 완료, 17개 본문/Oracle 26ai/PL/SQL/운영 교정, 강의자료 1건 본문 없음 |

## 커리큘럼 재시도 결과

- 최초 실패한 6개 강의를 저속 순차 재시도해 모두 복구했다. 현재 커리큘럼 미확보 강의는 없다.

## 본문 미제공 단원

- 초기 단건 미제공 자료는 Course/unit `332466/196057` 수업 자료, `336276/312015` 쿠폰 안내, `328995/125484` 소스 코드, `341698/440749` 커뮤니티 안내, `331869/178834` 자료 링크, `339423/374856` 용어 첨부, `336089/272616` 강의 자료, `335130/306283` 수업 자료, `334416/238244` 통합본이다. 모두 반복 조회에서 `not_found`였고 나머지 본문 19, 31, 17, 38, 20, 44, 19, 19, 30개는 각 과정 정본에 반영했다.
- Course 332731은 118개 중 105개 lecture 본문을 조회했다. unit 307048, 307049, 307050, 290751, 307054, 307055, 307056, 290753, 307057, 290754, 307058, 290755, 307059는 두 MCP 경로 모두 `not_found`였으며 퀴즈 또는 실습 실행 단원이다. 인접한 개념 단원 본문은 확보했다.
- Course 337778, unit 359916, 소스코드: runtime 0인 자료 단원이며 MCP가 `not_found`로 응답했다. 나머지 45개 lecture 본문을 조회했다.
- Course 182992, unit 13710, spring 강의자료: runtime 0인 자료 단원이며 MCP가 `not_found`로 응답했다. 나머지 26개 lecture 본문을 조회했다.
- Course 327754는 이전 snapshot에서 Inflearn 본문 1/16만 확인됐고, 최종 재감사에서는 app/direct 경로 0/16 `not_found`, unit 제한 검색도 0건이었다. 강사의 공개 원본 영상 16개와 62개 chapter를 unit에 매칭했지만 자막 전문은 0/16이어서 내용을 추정하지 않았다. 정확한 chapter 주제와 공식 TypeScript 문서만 부분 통합했으며 전문 대조는 불가능하다.
- Course 339108, unit 354224, 강의 PDF 자료 및 프로젝트: runtime 0인 자료 단원이며 MCP가 `not_found`로 응답했다. 나머지 43개 lecture 본문은 조회와 문서 대조를 마쳤다.
- Course 326277, unit 61389와 66784, 수업자료: 영상 본문이 없는 자료 단원이며 반복 조회에도 `not_found`였다. 나머지 39개 lecture 본문은 조회와 RFC 대조를 마쳤다.
- Course 338886, unit 347693, SQL 소스 파일: runtime 0인 자료 단원이며 MCP가 `not_found`로 응답했다. 나머지 82개 lecture 본문은 조회했고 설치 안내 2개를 제외한 80개 기술 단원을 정본에 연결했다.
- Course 338212, unit 328868, SQL 소스 파일: runtime 0인 자료 단원이며 MCP가 `not_found`로 응답했다. 나머지 83개 lecture 본문은 조회했고 설치 안내 2개를 제외한 81개 기술 단원을 정본에 연결했다.
- Course 324591, unit 150449와 150450, 강의 자료/소스: 반복 조회에도 `not_found`였다. 나머지 62개 lecture 본문은 Spring Security 7.1 정본에 연결했다.
- Course 247815, unit 16563, 강의자료: runtime 0인 자료 단원이며 MCP가 `not_found`로 응답했다. 나머지 70개 lecture 본문은 ECMAScript 함수/이터러블/Promise/동시성 정본에 연결했다.
- Course 325969, unit 55692, 객체 지향 설계와 스프링 PPT 자료 다운로드: 반복 조회에도 `not_found`였다. 나머지 64개 lecture 본문은 Spring Core 설계/컨테이너/등록/스코프 정본에 연결했다.
- Course 327527은 최종 재감사에서 app/direct 경로 모두 lecture 60/60 `not_found`였고, 11개 section별 unit 제한 검색도 양쪽 모두 0건이었다. transient 429는 저속 재시도로 제거했으며 PDF/XML/GitHub 자료 3개와 영상 57개를 추정하지 않았다. 공식 TypeORM 문서로 확인 가능한 폐기 API 교정만 기존 정본에 반영했다.
- Course 326029, unit 59948 도표 PDF와 56514 소스 코드: 반복 조회에도 `not_found`였다. 나머지 46개 lecture 본문은 Jest/Express/NestJS 테스트 정본에 연결했다.
- Course 34982, unit 4651 강의자료: 반복 조회에도 `not_found`였다. 나머지 23개 lecture 본문은 Oracle/SQL/PL/SQL 정본에 연결했다.
- Course 36175, unit 5051 강의자료: 반복 조회에도 `not_found`였다. 나머지 17개 lecture 본문은 PL/SQL/cursor/trigger/tablespace/권한/index/window function 정본에 연결했다.
- Course 182835, unit 13676 강의자료: 반복 조회에도 `not_found`였다. 나머지 28개 lecture 본문은 Java language/object/library/I/O 정본에 연결했다.
- Course 182737, unit 13653 강의자료: 반복 조회에도 `not_found`였다. 나머지 20개 lecture 본문은 Servlet/JSP/HTTP 상태/JDBC 정본에 연결했다.
- Course 324109, unit 203903과 203904: 반복 조회에도 `not_found`였다. 나머지 54개 lecture 본문은 JPA persistence context/mapping/association/cascade/value type/JPQL 정본에 연결했다.
- Course 329966, unit 136816 ts-node extends 옵션 주의: 두 MCP 경로에서 반복 조회에도 `not_found`였다. 나머지 64개 lecture 본문은 TypeScript compiler/type/decorator/Node/NestJS/React/Deno 정본에 연결했다.
- Course 330462은 최종 재감사에서 app/direct 경로 모두 lecture 60/60 `not_found`였고, 10개 section별 unit 제한 검색도 양쪽 모두 0건이었다. transient 응답은 표적 재시도로 `not_found`를 확인했으며 커리큘럼 제목만으로 내용을 추정하지 않았다.
- Course 326674, unit 72011 웹 애플리케이션 이해 PPT: runtime 0인 자료 단원이며 반복 조회에도 `not_found`였다. 나머지 71개 lecture 본문은 Servlet/MVC/DispatcherServlet/binding/SSR 정본에 연결했다.
- Course 327260, unit 83250 강의 소스 코드: runtime 0인 자료 단원이며 반복 조회에도 `not_found`였다. 나머지 128개 lecture 본문은 Thymeleaf/form binding/메시지/검증/세션 인증/filter/interceptor/오류 응답/변환/파일 업로드 정본에 연결했다.
- Course 330459, unit 148060 강의 소스 코드와 unit 150543 Spring Boot 소개 PPT 자료: runtime 0인 자료 단원이며 반복 조회에도 `not_found`였다. 나머지 105개 lecture 본문은 embedded server/executable JAR/starter/auto-configuration/external config/profile/Actuator/Micrometer/Prometheus/Grafana/custom metric 정본에 연결했다.
- Course 328990, unit 114613 강의 소스 코드와 unit 114721 PPT 자료: 반복 조회와 대체 경로에서도 `not_found`였다. 나머지 86개 lecture 본문은 data access strategy/JDBC/MyBatis/JPA/Spring Data JPA/Querydsl/transaction test 정본에 연결했고 두 자료 unit은 접근 실패 기록으로만 남겼다.
- Course 332506, unit 194630 강의 소스 코드: 반복 조회에도 `not_found`였다. 나머지 97개 lecture 본문은 Java 참조/초기화/생성/캡슐화/static/final/상속/다형성/OCP 정본에 연결했다.
- Course 333308, unit 212458 강의 소스 코드: 세 차례 조회에서 모두 `not_found`였다. 나머지 102개 lecture 본문은 Object/equality/불변성/String/wrapper/Class/System/Random/enum/date-time/중첩 클래스/예외 정본에 연결했다.
- Course 331070, unit 264270 전체강의자료와 실습코드: 두 MCP 경로에서 반복 조회에도 `not_found`였다. 나머지 69개 lecture 본문은 React mental model/state/effect/routing/state management/server state/form 정본에 연결했다.
- Course 327901, unit 94405 강의 소스 코드: 반복 조회에도 `not_found`였다. 나머지 124개 lecture 본문은 method trace/ThreadLocal/template/strategy/callback/proxy/decorator/Spring AOP/pointcut/self-invocation 정본에 연결했다.
- Course 336672, unit 275318 강의 소스 코드: 세 차례 조회에서 모두 `not_found`였다. 나머지 98개 lecture 본문은 lambda/method reference/함수형 interface/Stream/Collector/Optional/parallel stream 정본에 연결했다.
- Course 333482, unit 216043 강의 소스 코드: 세 차례 조회에서 모두 `not_found`였다. 나머지 92개 lecture 본문은 generic/array와 linked list/List/Set/Map/hash/stack/queue/iterator/sort 정본에 연결했다.
- Course 326485, unit 100289, 100290, 237952의 알고리즘 교안 3건: 세 차례 조회에서 모두 `not_found`였다. 나머지 246개 lecture 본문은 C++/STL/자료구조/완전 탐색/누적 합/Fenwick tree/greedy/LIS/graph/DP 정본에 연결했다.
- Course 334977, unit 244406 강의 소스 코드: app/direct MCP 경로의 반복 조회에서 모두 `not_found`였다. 나머지 100개 lecture 본문은 charset/I/O/file/socket/HTTP/reflection/annotation 정본에 연결했다.
- Course 334352, unit 232311 강의 소스 코드: 세 차례 조회에서 모두 `not_found`였다. 나머지 117개 lecture 본문은 thread lifecycle/JMM/monitor/lock/condition/BlockingQueue/atomic/concurrent collection/executor 정본에 연결했다.

## 최신성 교정 기록

- Cloud/container: Course 325381, 326598, 334085, 343428, 340962와 340716을 AWS/Docker/Kubernetes 공식 문서에 맞춰 교정했다. S3 일관성, Lambda 제한, Step Functions/X-Ray/Cognito/CloudFormation, container와 VM 경계, image digest, OCI, probe/Gateway API와 Istio 비용을 조건과 버전이 드러나게 정리했다.
- Web/network/CS: Course 328275, 331070, 329605, 331036, 326277, 326485, 334352, 336749, 328188, 329927와 328971을 React/DOM/HTML/CSS, RFC, ISA, OS, C++/STL, Java concurrency, 언어 runtime과 알고리즘 정의에 맞췄다. function component/Hooks/Effect/key/state snapshot, CRA 종료와 Vite/framework, Router/Redux Toolkit/Recoil archive/SWR, node/attribute/property와 XSS sink, NodeList, event path/delegation/isTrusted, transition/vendor prefix, CIDR/HTTP, byte/문자, CPU/저장장치, process/VM/IPC, AOT/JIT, thread lifecycle/JMM/monitor/lock/BlockingQueue/atomic/executor, 동시성/병렬성, pointer/array decay/signed overflow/shift, 완전 탐색/누적 합/Fenwick tree/greedy/LIS/graph/DP와 점근 표기의 경계를 분리했다.
- Database: Course 34982, 36175, 338473, 339423, 327501, 333931, 343202, 340524와 338886을 Oracle 26ai/ISO SQL, MySQL 8.4, Spark/Debezium과 관계형 이론에 맞췄다. 11g 설치와 현재 환경, Oracle SQL/PL/SQL/cursor/trigger/tablespace/권한/index/window function, 설정 변경/buffer pool/change buffer, compression/job queue/polyglot, CDC ordering, DDL/FK/redo, 실행 계획/통계/join, soft delete/EAV/JSON과 key/관계 모델링의 과도한 일반화를 제거했다.
- Architecture/distribution/commerce: Course 324109, 324119, 324214, 324474, 324476, 328990, 327273, 336073, 337730, 328412, 332731, 337778, 340204와 339108을 공식 Jakarta Persistence/Hibernate/Spring Data JPA/Querydsl/MyBatis/NestJS/TypeORM/Spring, Reactive Manifesto와 메시징/결제 자료로 검증했다. persistence context/mapping/association/cascade/JPQL, 관계 편의 method/변경 감지/web binding/order invariant/dynamic search, API DTO/fetch join/collection query/OSIV, repository/save/query method/paging/custom fragment/auditing/projection/Specification/QBE, Querydsl predicate/join/subquery/function/projection/dynamic query/bulk/custom repository, data access strategy/transaction test, file upload/S3, MongoDB populate/AdminJS, 포트/ORM 경계, MSA 준비도, Saga/TCC/Outbox, 상품/장바구니/주문/부분 취소/정산 불변식을 선택 조건과 실패 복구 중심으로 정리했다.
- Language/OOP/tooling: Course 182835, 332506, 333308, 333482, 334977, 336672, 324235, 324398, 325633, 324642, 324019, 247815, 329966, 330452, 334416, 336658, 334495와 328284를 Java SE, ECMAScript/HTML/Fetch/TypeScript/Git 공식 문서와 GoF 개념 경계에 맞췄다. Java type/object/reference/initialization/construction/encapsulation/static/final/inheritance/polymorphism/OCP/Object contract/불변성/String/wrapper/enum/date-time/nested class/exception/generic/collection/lambda/Stream/Optional/charset/I/O/file/socket/HTTP/reflection/annotation, JS type/coercion/control flow/Array/JSON/Date/execution context/scope/function object/arguments/this/prototype/closure, Unicode/Object/iterator/Symbol/collection/Class/async, 함수 합성/concurrency, TypeScript 7.0 compiler/narrowing/decorator/Node/NestJS/React/Deno, 책임 주도 설계/SOLID, pattern/Git 운영을 분리했다.
- Spring/testing/deployment: Course 182737, 326029, 326674, 327260, 327901, 328723, 330459, 325630, 325969, 182992, 40164와 328553을 현재 Jakarta Servlet/Pages, Spring MVC/Boot/JDBC/AOP, Jest/Express/NestJS, HTTP test와 배포/보안 문서에 맞췄다. Servlet/JSP/HTTP 상태/JDBC, Front Controller/DispatcherServlet/mapping/binding/message converter/SSR/PRG, Thymeleaf/form validation/session/error/conversion/upload, DataSource/connection pool/transaction/exception translation, embedded server/executable JAR/starter/auto-configuration/external config/profile/Actuator/metric, method trace/ThreadLocal/template/callback/proxy/BeanPostProcessor/advice/pointcut/self-invocation, 객체 설계/IoC/DI/Bean lifecycle, JPA, test double/HTTP/실제 DB 경계, transaction test의 false positive, CRA 종료, immutable artifact/rollback, Actions 공급망, Vite env와 CORS 경계를 보강했다.
- Product collaboration: Course 338233의 workflow, artifact별 SSOT, handoff와 design system을 공식 Figma 문서로 확인하고 조직 규모별 고정 처방과 Dev Mode가 명세를 대체한다는 단정을 제거했다.

## 완료 판정

- [x] 92개 강의의 커리큘럼 조회 또는 실패 원인 기록
- [x] MCP가 제공한 모든 접근 가능한 lecture 본문 조회와 `not_found` 재시도
- [x] 본문을 확보한 89개 강의의 기존 문서 커버리지 대조
- [x] 확보한 본문의 누락 개념 반영과 출처 연결
- [x] 기술 최신성, 위키링크, 200줄 제한, PII와 표기 규칙 검증
- [x] 통합 결과에서 수강 진도와 지식 숙련을 분리해 보고
- [ ] MCP 미제공 3개 강의의 전문 확보, 외부 접근 상태가 바뀌어야 진행 가능

## 관련 문서

- [[Dev-Writing|글쓰기와 기술 블로그]]
- [[AI-Handicap-Learning|AI를 학습 난이도 조절 도구로]]
- [[MCP|Model Context Protocol]]
