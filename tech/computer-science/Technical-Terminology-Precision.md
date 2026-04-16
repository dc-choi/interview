---
tags: [cs, terminology, rest, tdd, vo, unit-test, semantics]
status: done
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Technical Terminology Precision", "기술 용어의 엄밀성", "REST/TDD/VO 혼동"]
---

# 기술 용어의 엄밀성

같은 용어가 팀마다 다르게 쓰이면 협업 비용이 급등한다. "우리는 REST 쓴다"·"TDD로 개발했다"·"VO·단위 테스트"가 전부 사람마다 다른 의미. 엄밀하지 못한 용어는 **갈등·설계 혼란·면접 오해**의 주요 원인이다. 새 용어를 만나면 **창시자의 정의**를 찾는 습관이 핵심.

## 왜 엄밀성이 중요한가

- 팀 간 갈등 — 같은 단어를 다른 뜻으로 써서 의도가 어긋남
- 설계 실수 — "REST"라고 이름 붙인 API가 실제로는 이상한 규약으로 구성
- 면접 오해 — 지원자가 쓴 용어의 정의가 다르면 실력을 오판
- 학습 차단 — 같은 용어를 다른 맥락에서 만날 때 혼란(VO가 ORM·DDD에서 다름)
- 합의 실패 — 논쟁이 용어 자체의 정의 차이에서 비롯되면 해결 불가

## 대표적 혼동 4가지

### 1. REST vs HTTP API

- "우리는 REST API 쓴다" ≈ 실제로는 HTTP 기반 JSON API
- 창시자 **Roy Fielding**의 정의는 6가지 제약(Server-Client, Stateless, Cacheable, Layered, Code-on-Demand, **Uniform Interface** 포함 **HATEOAS**)
- 대부분의 "REST API"는 **HATEOAS를 충족하지 않음** → 엄격히는 REST 아님
- **Richardson Maturity Model**로 구분: Level 0~2가 대부분, Level 3 HATEOAS는 드묾
- 무난한 용어: **HTTP API, Web API**. "REST"라고 쓸 때는 어느 수준인지 명시
- 상세: [[REST|REST · RESTful API]]

### 2. TDD vs 테스트 코드 작성

- "TDD 코드 추가" 커밋 메시지가 **이미 운영되는 코드에 뒤늦게 테스트 추가**인 경우
- Kent Beck의 TDD 정의: **테스트 작성 → 통과 구현 → 리팩터링** 사이클
- 사후 테스트 추가는 그냥 "**테스트 코드 작성**" — TDD 아님
- 예외: 레거시 버그 수정·리팩터 전에 테스트 추가는 **TDD 사이클의 일부**로 해석 가능
- 용어 구분:
  - **TDD** — Red-Green-Refactor 사이클
  - **테스트 코드 작성** — 사후 추가 포함 일반 테스트 작성

### 3. 단위 테스트 vs JUnit 테스트

- "JUnit으로 쓴 건 다 단위 테스트"는 오해. JUnit은 **도구**, 단위 테스트는 **범위 개념**
- Spring Reference도 **단위 테스팅 vs 통합 테스팅** 구분. 둘 다 JUnit 사용
- 단위 테스트 정의: **실행 시점 기반 인프라 없이** 매우 빠르게 실행. 클래스·메서드 단위로 격리
- 통합 테스트: Spring 컨텍스트·DB·Mock 서버 등 **실행 환경**을 구성
- 구분 없이 "단위 테스트"라 쓰면 테스트 전략·CI 속도 논의가 혼란
- 상세: [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]

### 4. VO (Value Object) vs DTO / TO

- getter/setter만 있는 객체를 "VO"라 부르는 관행 → 실제로는 **DTO** 또는 **TO(Transfer Object)**
- Core J2EE Patterns 초판에 VO로 정의됐으나 **혼란 때문에 2판에서 TO로 변경**
- **진짜 VO(Martin Fowler·DDD)**:
  - **값에 의해 동등성 판단**(equals/hashCode가 모든 필드로 구성)
  - **불변(Immutable)**
  - 예: Money, Address, DateRange
- Java JEP 169 Value Objects도 getter/setter 덩어리가 아님
- 혼동 회피:
  - 값 전달용 플랫 객체 → **DTO** (Request/Response DTO)
  - 값 동등성 기반 불변 도메인 객체 → **VO**
- 상세: [[VO-DTO|VO와 DTO]], [[DTO-Layering]]

## 용어 엄밀성을 지키는 습관

### 1. 창시자·표준을 찾기

- 용어를 만든 **원저자의 글**을 읽음
- 표준 문서(RFC·W3C·Martin Fowler·Uncle Bob·Kent Beck)가 기준
- 한국어 블로그·동영상은 **2차 자료** — 원전 대조 필수

### 2. 영어 자료 검색

- 한국 개발자가 만든 용어가 아니라면 **영어로 검색**
- Google 1페이지에서 Wikipedia·공식 문서 찾기
- 번역 과정에서 의미가 뒤틀린 경우 다수

### 3. 무난한 대체 용어 쓰기

- 논란 있는 용어는 **피하거나 맥락 설명**
- "REST" → "HTTP API" / "Web API"
- "TDD" → "테스트 코드 작성"(사후 추가일 때)
- "단위 테스트" → "통합 테스트" 또는 "격리 단위 테스트" 명시

### 4. 회사 내부 용어 vs 범용 용어 구분

- 큰 회사에 다니면서 **사내 은어**를 외부에서도 쓰는 실수
- 예: 네이버 "QP(Quality Practice)"를 외부에서 QA처럼 쓰는 경우
- 이직·컨퍼런스·외부 블로그 글에서 특히 주의

## 용어 정리 예시: ORM/JPA 생태계

ORM·JPA 맥락은 혼동 용어가 많다.

- **Entity** — JPA가 관리하는 영속 객체. 단순 POJO 아님
- **DTO** — 계층 간 데이터 전달용. Entity와 구분
- **VO** — 값 동등성 불변 객체. Entity와 다름
- **Domain Model** — 비즈니스 규칙을 가진 풍부한 객체. Entity일 수도 아닐 수도
- **Record** (Java 16+) — 간결한 VO 선언 문법

이 5가지를 섞어 쓰면 코드 리뷰가 전쟁.

## 팀에 엄밀성을 도입하는 방법

- **용어집(Glossary) 문서**를 팀 위키에 유지
- 새 용어를 쓸 때 **정의 링크** 첨부
- PR·설계 리뷰에서 **"여기서 REST는 어떤 의미?"** 같은 확인 질문 권장
- 신규 입사자 온보딩에 **팀 용어 해설** 포함
- 회의 후 회의록에 **핵심 용어 정의** 기록

## 흔한 함정

- **"다들 그렇게 쓰니까 맞음"** — 통용이 정확성을 보장하지 않음
- **본인이 쓰는 용어의 정의를 한 번도 찾아본 적 없음** — 학습의 구멍
- **창시자 원문 대신 블로그 요약만** — 2차 자료의 오역·축약 반복
- **모든 용어를 엄밀히** — 과도한 엄밀성은 소통 마비. 합의가 된 맥락에서는 축약 OK

## 면접 체크포인트

- REST·RESTful·HATEOAS의 관계를 설명할 수 있는가
- TDD와 "테스트 코드 작성"의 차이
- 단위 테스트 vs 통합 테스트의 정의(실행 시점 인프라 유무)
- VO와 DTO의 **동등성·불변성** 기준 차이
- 본인이 쓰는 용어의 **원저자·표준**을 1~2개 인용할 수 있는가
- 팀 내 용어집이 있는가, 있다면 본인이 기여한 게 있는가

## 출처
- [네이버 D2 — 백엔드 개발자를 꿈꾸는 학생개발자에게](https://d2.naver.com/news/3435170)
- Martin Fowler — ValueObject, DataTransferObject
- Kent Beck — *Test Driven Development: By Example*

## 관련 문서
- [[REST|REST · RESTful API]]
- [[VO-DTO|VO와 DTO]]
- [[DTO-Layering|DTO 레이어 스코프]]
- [[TDD-BDD|TDD · BDD]]
- [[Service-Layer-Testing|서비스 레이어와 테스트 경계]]
- [[Code-Quality-Criteria|코드 품질의 기준]]
