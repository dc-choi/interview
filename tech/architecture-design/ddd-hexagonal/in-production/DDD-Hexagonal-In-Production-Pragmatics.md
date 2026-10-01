---
tags: [architecture, ddd, hexagonal, bounded-context, spring, production]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["DDD 헥사고날 실용주의", "헥사고날 적용 판단 기준"]
---

# DDD + Hexagonal — 외부 통합과 실용주의 판단

## 외부 시스템 통합 — 보조 패턴

### Anti-Corruption Layer (ACL)

외부 API의 데이터 구조를 도메인에 직접 들이지 않고, **우리 도메인 언어로 번역하는 어댑터**를 둔다. 외부 API 스키마 변경이 도메인을 흔들지 않게 하는 방어막.

### 다중 프로바이더 + 폴백 (Circuit Breaker)

같은 기능(예: 신주소 조회)을 여러 외부 프로바이더로 분산할 때 패턴:
- 각 프로바이더는 `adapter/outbound`에 독립 구현
- 호출 순서를 클라이언트가 선택하거나 설정으로 정함 (`providers=KAKAO,NAVER,SKT`)
- 각 호출에 **Circuit Breaker** 두어 장애 전파 차단
- 모두 실패 시 graceful degradation (캐시된 값 / 기본값)

## 실용주의 — 과잉 설계를 피하는 판단

순수주의를 그대로 따르면 보일러플레이트가 폭발한다. 상황별 타협 기준:

| 원칙 | 현실적 타협 |
|---|---|
| 모든 유스케이스는 인터페이스 | 경계 계약 역할이 없는 내부 협력 객체라면 생략 가능 |
| 프레임워크 종속 금지 | `@Transactional` 같은 선언적 TX는 사용 — 실무 가치가 더 큼 |
| DTO는 application 바깥 | 단순 케이스에선 엔티티를 컨트롤러까지 노출하기도 |
| 모든 외부 호출에 port | 교체 가능성, 테스트 필요성이 분명한 곳에만 |

구현이 하나여도 여러 어댑터와 테스트가 소비하는 Provided 포트는 공개 계약으로서 가치가 있다. 구현 개수만으로 지우지 않고, 서비스 분리와 리팩터링 때 호출자를 보호하는 경계인지 판단한다.

**원칙보다 중요한 건 팀이 합의한 기준을 일관되게 적용하는 것.**

## 적용 / 비적용 매트릭스

| 적합한 경우 | 부적합한 경우 |
|---|---|
| 수년간 유지보수할 코어 서비스 | 일회성 프로젝트, PoC |
| 도메인 규칙이 복잡하고 자주 변함 | CRUD 위주 단순 API |
| 다양한 채널(REST, gRPC, Kafka) 동시 지원 | 단일 채널만 쓰는 작은 서비스 |
| 팀이 DDD 개념에 익숙하거나 학습 의지 있음 | 팀 숙련도 낮고 일정 타이트 |
| 외부 API가 여러 개, 자주 바뀜 | 외부 의존성 단순 |

작게 시작한 서비스가 도메인 복잡도를 넘으면 헥사고날로 이주. **처음부터 다 만들지 말고, 통증이 보일 때 적용**.

## 면접 체크포인트

- DDD와 Hexagonal이 **각각 해결하는 문제**를 구분해 설명할 수 있는가
- **Aggregate가 트랜잭션 경계**임을 설명할 수 있는가
- **빈약한 도메인 모델**의 증상과 해소 방법 (Tell, Don't Ask)
- **바운디드 컨텍스트 간 통신**의 원칙 (직접 DB 공유 금지, 이벤트/공개 API)
- **Anti-Corruption Layer**가 왜 필요한가
- 언제 **Usecase 인터페이스를 생략**해도 되는가 — 과잉 설계 판단 기준
- 이 구조가 **맞지 않는 상황**도 분명히 말할 수 있는가 (성숙도 시그널)

공개 포트에 대한 테스트는 구현 클래스를 바꾸어도 같은 행동 계약을 확인하도록 돕는다. 인터페이스를 추가했다는 사실만으로 테스트가 안정해지는 것은 아니므로 구현 순서나 내부 호출 횟수에 불필요하게 결합하지 않는다.

## 출처

- [헥사고날 아키텍처의 사실과 오해 (1)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=291178)
- [회원 애플리케이션 서비스 구현](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=301666)
- [회원 애플리케이션 서비스 테스트 (1)](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=306030)
- [회원 애플리케이션 기능 추가](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=306690)
- [MemberApi와 웹 단위 테스트](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=314630)
