---
tags: [architecture, principles, coupling, distributed-system, connascence]
status: done
verified_at: 2026-11-13
category: "Architecture - 원칙"
aliases: ["Hidden Coupling", "숨은 결합", "Balanced Coupling", "Connascence", "Temporal Coupling", "Semantic Coupling", "Runtime Coupling"]
---

# 숨은 결합(Hidden Coupling)

결합은 시스템의 두 구성 요소 사이의 모든 의존이며, 그 의존을 어떻게 설계했는지가 한쪽의 변경이 다른 쪽의 변경을 강제할 가능성을 정한다. 강하게 결합된 시스템에서는 한 구성 요소의 변경이 그에 의존하는 다른 구성 요소의 변경을 요구한다.

이 문서는 서비스 사이의 호출선만으로는 드러나지 않지만 의미 공유, 실행 순서, 수명주기, 가용성으로 구성 요소를 함께 바뀌거나 함께 실패하게 만드는 의존을 숨은 결합이라는 묶음 용어로 부른다. 숨은 결합은 아래 출처가 정의한 용어가 아니라 이 문서의 분류 이름이다. 결합을 없애는 것이 목표가 아니라, 어떤 결합이 어디에 있는지 드러내고 비용이 감당되는 위치에 두는 것이 목표다. 코드 수준의 전통적 결합도 분류와 변경 관점의 정의는 [[Cohesion-Coupling|응집도와 결합도]]에서 다룬다.

## 결합을 보는 세 축

Balanced Coupling 모델은 결합을 통합 강도, 거리, 변동성의 세 차원으로 본다. 기존의 모듈 결합도 분류나 Connascence만으로는 구성 요소가 함께 바뀌는 모든 이유를 설명하지 못한다는 문제의식에서 나왔다.

### 통합 강도: 얼마나 많은 지식을 공유하는가

결합된 구성 요소는 서로에 대한 지식을 공유한다. 공유하는 지식의 종류에 따라 네 단계로 나눈다(강함에서 약함 순).

| 단계 | 공유하는 지식 | 예 | 성격 |
|---|---|---|---|
| 침투적(intrusive) | 비공개 인터페이스, 내부 DB, 구현 세부 | 다른 서비스의 내부 테이블을 직접 읽는다 | 모든 지식을 공유한다고 봐야 한다. 깨지기 쉽고 암묵적이며, 소유자가 그 통합을 모를 때 위험이 더 크다 |
| 기능적(functional) | 기능 요구사항 | 같은 업무 규칙을 프론트엔드와 백엔드에 중복 구현한다 | 극단은 지식의 중복이며 역시 암묵적일 수 있다 |
| 모델(model) | 업무 모델 | 여러 서비스가 같은 도메인 모델을 공유한다 | 모델이 바뀌면 결합된 구성 요소가 모두 바뀐다 |
| 계약(contract) | 통합 전용 계약 | Facade, Open-host service와 Published language, Anti-corruption layer, DTO | 가장 명시적이고 공유 지식이 가장 적다 |

### 거리: 함께 바꾸는 비용

거리는 결합된 구성 요소의 소스 코드가 얼마나 떨어져 있는지이며 함께 바꾸는 비용을 정한다. 메서드, 객체, 패키지, (마이크로)서비스, 시스템 순으로 멀어진다.

- 거리가 가까울수록 함께 테스트하고 배포해야 하는 수명주기 결합이 커진다. 모놀리스를 마이크로서비스로 나누며 말하는 분리는 대개 이 수명주기 의존을 끊는 일이다.
- 거리는 사회기술적이다. 서로 다른 팀이 소유한 두 서비스는 같은 팀이 소유한 경우보다 함께 바꾸는 비용이 크지만 수명주기 의존은 작다.
- 런타임 의존도 거리에 포함된다. 비동기 통합은 수명주기 결합을 더 줄인다.

### 변동성: 바뀔 가능성

변동성은 구성 요소가 애초에 바뀌어야 할 확률이다. 높을수록 설계의 결함이 더 아프게 드러난다. DDD의 하위 도메인 분류가 예측 단서가 된다. 핵심 하위 도메인이 가장 자주 바뀌고, 이미 해법이 있는 일반 하위 도메인과 단순한 지원 하위 도메인은 덜 바뀐다.

커밋 빈도만으로 변동성을 판단하지 않는다. 나쁜 설계 때문에 잦은 변경이 생길 수 있고(우발적 변동성), 거의 바뀌지 않는 영역이 사실은 건드리기 위험해서 방치된 것일 수도 있다.

### 균형

| 통합 강도 | 거리 | 결과 |
|---|---|---|
| 낮음 | 멂 | 느슨한 결합 |
| 높음 | 가까움 | 높은 응집 |
| 낮음 | 가까움 | 낮은 응집. 방치하면 big ball of mud로 흐른다 |
| 높음 | 멂 | 강한 결합. 분산 모놀리스로 가는 단계 |

모델은 이를 `MODULARITY = STRENGTH XOR DISTANCE`, `BALANCE = (STRENGTH XOR DISTANCE) OR NOT VOLATILITY`로 요약한다. 지식을 많이 공유해도 바뀔 일이 거의 없는 구성 요소(예: 레거시)는 낮은 변동성으로 균형이 맞는다. 이 이진식은 설명을 위한 단순화다.

## 숨은 결합의 유형

| 유형 | 정의 | 드러나는 방식 |
|---|---|---|
| 의미적 결합 | 여러 구성 요소가 같은 개념의 의미를 공유한다 | 업무 용어의 정의가 바뀌면 그 의미를 공유한 구성 요소를 동시에 고쳐야 한다 |
| 시간적 결합 | 정해진 순서나 시간 간격으로 실행되어야 한다 | 호출 순서가 바뀌거나 지연이 생기면 결과가 틀어진다 |
| 침투적 결합 | 비공개 구현에 기대어 통합한다 | 소유자가 내부 구조를 바꾸면 모르는 소비자가 깨진다 |
| 수명주기 결합 | 개발, 테스트, 배포와 유지보수의 생애가 맞물린다 | 독립 서비스인데 함께 배포해야 한다 |
| 런타임 결합 | 한 구성 요소의 가용성이 다른 구성 요소의 가용성에 영향을 받는다 | 서비스 하나의 장애가 전체 장애로 번진다 |

### 의미적 결합

업무 의미(무엇이 정책(policy)인가, 언제 우대 고객인가)는 사업이 바뀌거나 이해가 깊어지면서 달라진다. SOAP 같은 통합 프로토콜의 의미처럼 기술적 의미도 공유된다. 공유 도메인 모델을 통한 결합은 통합 전용 인터페이스(계약 결합)를 통한 의미 공유보다 연쇄 변경이 일어나기 쉽다.

코드에서는 정적 connascence(이름, 의미, 위치 등)로 나타나며 대표가 Connascence of Meaning이다. 여러 구성 요소가 특정 값의 의미에 합의해야 하는 경우다.

- 테스트용 카드 번호 같은 매직 값이 검증 로직 여러 곳에 하드코딩되어 한 곳만 바꾸면 다른 곳이 틀어진다.
- 권한을 정수(2는 관리자)로 저장하고 호출부마다 `!= 2`로 비교한다.
- `None`을 조회 결과 없음과 DB 오류 양쪽에 반환해 `None`에 의미를 싣는다.
- `unit_cost = 49.95`처럼 통화 없는 금액을 주고받는다.

이름 있는 상수로 옮기면 의미 결합이 더 약한 이름 결합으로 바뀐다(상수를 정의한 세 번째 위치가 생기므로 이름 결합은 늘어난다). 없음을 `ObjectNotFound` 같은 명시적 객체로 반환하면 이름 결합으로, `Cost(49.95, 'USD')` 같은 값 타입을 쓰면 타입 결합으로 바뀐다. 원시 타입으로 복잡한 도메인을 표현하는 Primitive Obsession이 이 결합의 흔한 원인이다.

### 시간적 결합

순차 결합이라고도 하며 Connascence of Execution(실행 순서가 중요함)과 Connascence of Timing(실행 시점이 중요함)에 해당한다.

- 락은 코드베이스 전체에서 같은 순서로 획득하고 해제해야 한다.
- 특정 상태에서만 허용되는 연산이 있는 상태 기계는 `send()` 뒤에 `setSubject()`를 부르면 아무 일도 하지 않거나 잘못 동작한다. 두 호출이 서로 다른 스레드에 있으면 찾기도 고치기도 더 어렵다.

통합 강도 모델은 시간적 결합을 기능적 결합의 가장 낮은 단계로 본다. 실행 순서 제약이 있다는 것은 두 구성 요소가 구현하는 업무 기능이 가깝다는 신호다. 함수 수준의 대응은 [[Function-Structure-and-Contracts#시간적 결합은 API에 드러낸다|시간적 결합은 API에 드러낸다]]에서 다룬다.

### 침투적 결합과 공유 데이터

AWS Well-Architected는 공유 DB나 그 밖의 강하게 결합된 저장소로 데이터를 공유하면 강한 결합이 되살아나고 확장을 막는다고 보고 이를 안티패턴으로 둔다. 통합 강도 모델은 내부 DB를 침투적 결합의 예로 든다. 이를 적용하면 다른 서비스의 테이블을 직접 읽는 소비자에게는 소유 서비스의 스키마 변경과 공유 DB 자체의 장애나 부하가 번질 수 있다. 소유권과 API 위임은 [[Microservice-Data-Ownership-and-Queries|데이터 소유권]]에서 다룬다.

### 수명주기 결합

수명주기 결합은 거리로 표현되며 거리가 짧을수록 커진다. 팀 배치도 거리의 일부라 구성 요소를 다른 팀에 맡기면 수명주기 결합이 더 줄어든다. 통합 강도로 보면 여러 서비스가 함께 쓰는 도메인 모델 라이브러리는 모델 결합이어서 모델 변경이 동시 수정과 동시 배포로 이어질 수 있다. 공유 스키마는 성격에 따라 갈린다. 다른 서비스의 내부 DB 스키마에 기대면 침투적 결합이고, 통합 전용으로 공개한 스키마(Published language)는 계약 결합이다. 이 구분은 통합 강도 분류를 적용한 해석이다. 하위 호환 계약으로 변경을 흡수하는 방법은 [[Backward-Compatibility-Design|하위 호환성 설계]]에서 다룬다.

### 런타임 결합

한 서비스의 장애가 시스템 전체를 내리는 것이 높은 런타임 결합의 신호다. 연쇄 장애는 resilience 패턴으로 줄인다.

- Retry(지수 백오프), Timeout, Fail Fast
- Circuit Breaker, Bulkhead, Fallback
- 비동기 처리(메시지 버스로 작업 생성과 실행을 분리), Rate Limiting

AWS Well-Architected의 느슨한 결합 권고는 즉시 응답이 필요 없고 요청 접수 확인으로 충분한 상호작용을 비동기로 바꾸고, 구성 요소를 직접 연결하는 대신 SQS 같은 큐, Kinesis 같은 스트림이나 Step Functions 같은 내구성 있는 중간 계층으로 통합하라고 한다. 장애 조치나 비동기 처리 능력 없이 계층 사이에서 API를 직접 호출하는 것과 back pressure를 무시하는 것을 안티패턴으로 든다. 큐를 쓰더라도 대부분의 hard real-time 시스템에서는 임계 시간(흔히 수 초)을 넘긴 요청을 클라이언트가 이미 포기한 stale 요청으로 보고 처리하지 않도록 권한다. 외부 연동의 구체적인 패턴은 [[External-Service-Resilience|외부 서비스 회복탄력성]]에서 다룬다.

런타임 결합을 줄이면 구성 요소 사이 거리가 늘어난다. 거리가 늘면 공유 지식(통합 강도)도 줄여야 균형이 맞는다. 프로세스만 나누고 공유 모델과 내부 테이블 의존을 그대로 두면 강한 결합이 먼 거리에 놓여 분산 모놀리스로 가는 상태가 된다.

## 찾는 법

다이어그램의 호출선 대신 변경과 장애가 어디까지 번지는지 묻는다.

- 이 값이나 용어의 의미를 다른 구성 요소도 알고 있는가 (의미)
- 실행 순서나 시간 간격을 가정하는가 (시간)
- 다른 쪽의 내부 테이블, 비공개 API나 구현 세부를 읽는가 (침투)
- 같은 업무 규칙이 두 곳에 구현되어 있는가 (기능 중복)
- 함께 테스트하고 함께 배포해야 하는가 (수명주기)
- 상대가 내려가거나 느려지면 함께 실패하는가 (런타임)
- 다이어그램에 없는 공유 자원, 예를 들어 같은 DB의 용량이나 공통 로그와 모니터링 경로를 나눠 쓰는가 (런타임 결합의 정의를 적용한 점검 질문이다. 한 구성 요소의 가용성이 다른 구성 요소에 영향을 받는지 확인한다)

## 트레이드오프와 판단

- 통합 강도가 높아도 거리가 가까우면 응집이다. 함께 바뀌는 것은 가까이 두고, 멀리 떨어뜨린 것은 계약으로만 통합한다.
- 결합을 없앤다고 생각하기보다 더 약한 형태로 바꾼다고 본다. 매직 값을 상수로 바꾸면 의미 결합이 이름 결합으로 바뀔 뿐 결합은 남는다.
- 변동성이 낮은 영역의 강한 결합은 정리 비용보다 이득이 작을 수 있다. 변동성이 높은 핵심 영역부터 결합을 다시 배치한다.
- 비동기화와 서비스 분리는 런타임과 수명주기 결합을 줄이지만 처리 지연, 순서와 중복 대응 같은 새 비용을 만든다([[Event-Driven-Architecture|이벤트 기반 아키텍처]]).
- Connascence 같은 지표는 불완전한 측정이다. 결합의 종류를 부르는 어휘를 개발자에게 준다는 점이 가장 중요한 이점 중 하나로 꼽힌다.

## 면접 체크포인트

- 다이어그램상 독립된 두 서비스가 함께 바뀌거나 함께 실패하는 이유를 결합 유형으로 설명할 수 있는가
- 통합 강도 네 단계(침투, 기능, 모델, 계약)와 각 단계의 예
- 강도, 거리, 변동성으로 응집, 느슨한 결합, 분산 모놀리스를 구분하는 방법
- 시간적 결합(락 순서, 상태 기계)과 런타임 결합(동기 호출 사슬의 가용성 의존)의 차이
- 공유 DB가 결합을 되살리는 이유와 대안
- 런타임 결합을 줄이는 패턴과, 거리를 늘린 뒤 공유 지식도 줄여야 하는 이유

## 출처

- [Balanced Coupling — coupling.dev, Vlad Khononov](https://coupling.dev/)
- [Integration Strength: How Much Knowledge Is Shared — coupling.dev, Vlad Khononov](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/)
- [Distance in Software Coupling: The Cost of Change — coupling.dev, Vlad Khononov](https://coupling.dev/posts/dimensions-of-coupling/distance/)
- [Volatility: Predicting Change in Software Coupling — coupling.dev, Vlad Khononov](https://coupling.dev/posts/dimensions-of-coupling/volatility/)
- [Balancing Coupling: A Formula for Modular Design — coupling.dev, Vlad Khononov](https://coupling.dev/posts/core-concepts/balance/)
- [Semantic Coupling — coupling.dev, Vlad Khononov](https://coupling.dev/posts/related-topics/semantic-coupling/)
- [Temporal Coupling — coupling.dev, Vlad Khononov](https://coupling.dev/posts/related-topics/temporal-coupling/)
- [Lifecycle Coupling — coupling.dev, Vlad Khononov](https://coupling.dev/posts/related-topics/lifecycle-coupling/)
- [Runtime Coupling — coupling.dev, Vlad Khononov](https://coupling.dev/posts/related-topics/runtime-coupling/)
- [What is Connascence? — connascence.io](https://connascence.io/)
- [Connascence of Meaning — connascence.io](https://connascence.io/meaning.html)
- [Connascence of Execution — connascence.io](https://connascence.io/execution.html)
- [Connascence of Timing — connascence.io](https://connascence.io/timing.html)
- [AWS Well-Architected Framework, REL04-BP02 Implement loosely coupled dependencies](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_prevent_interaction_failure_loosely_coupled_system.html)

## 관련 문서

- [[Cohesion-Coupling|응집도와 결합도]]
- [[Software-Boundaries|소프트웨어의 경계]]
- [[Function-Structure-and-Contracts|함수 구조와 호출 계약]]
- [[Microservice-Data-Ownership-and-Queries|마이크로서비스 데이터 소유권]]
- [[Modular-Monolith|모듈러 모놀리스]]
- [[Microservice-Service-Decomposition|마이크로서비스 서비스 분해]]
- [[Backward-Compatibility-Design|하위 호환성 설계]]
- [[External-Service-Resilience|외부 서비스 회복탄력성]]
- [[Event-Driven-Architecture|이벤트 기반 아키텍처]]
