---
tags: [architecture, oop, solid, contracts, refactoring]
status: done
category: "Architecture - OOP"
aliases: ["객체 설계의 변경 사례와 행동 계약"]
---

# 객체 설계의 변경 사례와 행동 계약

[[Object-Design-Principles|객체 설계 원칙]]을 실제 변경에 적용할 때는 클래스 수보다 변경의 전파와 행동 계약을 확인한다. 다음 징후는 리팩터링 후보를 찾는 도구이며 자동 분리 규칙은 아니다.

## SRP를 판단하는 구체적인 징후

- 목적을 한 문장으로 적고, 서로 다른 목적을 연결하는 접속사가 필요한지 살핀다.
- 메서드를 이름과 목적별로 묶고, 각 메서드가 사용하는 필드의 연결을 그려 본다. 서로 겹치지 않는 무리는 책임 분리 후보다.
- 객체의 종류에 따라 일부 필드만 초기화된다면 별도 변형이 한 클래스에 섞였는지 확인한다.
- 독립적으로 검증할 중요한 private 로직이 있다면 공개 범위를 넓히기 전에 책임 추출을 검토한다.
- DB, 외부 API, 콘솔처럼 다른 이유로 변하는 의존성은 핵심 규칙과 분리할 수 있다.

SRP에서 책임은 변경 이유를 가리킨다. GRASP에서 객체가 아는 것과 하는 것을 나누는 책임 할당과 연결되지만 같은 용법은 아니다. 필드 연결 그림만으로는 변경 이유를 알 수 없으므로 실제 요구사항과 함께 판단한다.

변경을 요구하는 액터는 개별 사용자나 코드 호출자와 같지 않다. 급여 계산 규정, 저장 방식과 보고서 형식을 결정하는 이해관계자 그룹이 서로 다른 이유로 변경을 요구한다면 그 책임이 한 클래스에 모였는지 확인한다. 같은 역할을 위해 함께 변하는 여러 메서드는 한 책임일 수 있다. 분리 후 기존 객체가 필요한 작업을 위임하는 facade가 될 수도 있다.

### 명령 값으로 양방향 의존을 끊는다

파서가 게임 객체를 호출하고 게임도 파서를 호출한다면 입력 해석과 실행이 서로 결합한다. 파서는 `Command` 값을 반환하고 게임은 그 값을 실행하도록 바꿀 수 있다. 고정된 명령 집합을 enum과 분기로 처리해도 된다. 값 반환만으로 필요한 경계가 생긴다면 명령마다 클래스와 상속 계층을 추가하지 않는다.

## 협력 대상의 내부 구조를 감추되 조회는 허용한다

디미터 법칙의 객체 수준 가이드는 자신, 메서드 인자, 직접 보유한 협력자와 메서드 안에서 생성한 객체를 중심으로 메시지를 보내라는 것이다. 반환된 객체를 따라 낯선 내부 구조를 탐색하면 중간 구조 변경이 호출자에 전파될 수 있다. 불변 값이나 컬렉션 연산까지 점 개수로 금지하는 규칙으로 쓰지 않는다.

조회인 `includes(date)`가 내부 일정을 재조정한다면 같은 상태에서 반복 조회한 결과와 이후 명령의 동작이 달라질 수 있다. 일정 조정 명령과 포함 여부 조회를 나누고, 의도한 변경을 호출 흐름에 드러낸다. CQS가 모든 상태 값을 외부에 노출하라는 뜻은 아니다. 객체 내부의 판단은 의도 메시지로 캡슐화하면서 필요한 순수 조회를 제공할 수 있다.

## DIP는 소스 의존 방향을 바꾸는 원칙이다

상위 수준 정책이 하위 수준 기술 세부에 직접 의존하지 않게 하고, 둘 모두 추상화에 의존하게 한다. 추상화의 계약도 기술 세부보다 정책의 요구를 표현해야 한다. 상위 수준은 폴더 위치나 변경 빈도만으로 정하지 않고 해결하려는 정책과 구현 수단을 구분한다.

예를 들어 업무 객체는 필요한 `UserReader` 역할을 정의하고 SQL 구현이 이를 만족하게 한다. 실행 중에는 업무 객체가 SQL 구현을 호출하지만 소스에서는 SQL 구현이 정책의 역할에 의존할 수 있다. 외부 조립 코드가 구체 구현을 생성해 주입한다. 생성자 주입을 사용해도 인자의 타입이 구체 SQL 클래스라면 이 의존 방향은 그대로다.

## LSP는 예외뿐 아니라 정상 결과의 계약도 본다

하위 타입으로 교체해도 상위 타입을 사용하던 프로그램이 기대한 속성을 유지해야 한다. 사전조건을 강화하거나 사후조건을 약화하지 않고 불변식과 관찰 가능한 상태 변화도 보존해야 한다. 메서드 시그니처나 `implements` 성공만으로 이 계약을 보장할 수 없다.

가변 `Rectangle`의 계약이 `setWidth`는 높이를, `setHeight`는 너비를 바꾸지 않는다면, 두 값을 함께 바꾸는 `Square`는 대체할 수 없다. 너비 5를 설정한 뒤 높이 4를 설정하면 직사각형의 기대 면적은 20이지만 정사각형 구현은 16이 된다. 예외 없이 실행돼도 사후조건을 위반한다. 반면 크기 변경 연산이 없는 불변 `Shape`의 면적 계약은 두 도형이 함께 만족할 수 있다.

클라이언트가 하위 타입별로 검사하고 예외 처리해야 한다면 계약 불일치를 의심한다. 이 분기가 여러 호출자에 퍼지면 구현 추가 때마다 호출자가 바뀌어 OCP에도 영향을 준다. 모든 구현에 같은 계약 테스트를 적용하면 반례를 찾는 데 도움이 되지만 유한한 테스트 통과가 모든 입력에서의 대체 가능성을 증명하지는 않는다.

타입 검사나 다운캐스팅의 존재만으로 LSP 위반을 확정하지 않는다. 특정 능력이 필요한 경계에서 타입을 검증하는 작업과, 상위 타입의 약속을 지키지 못해 소비자가 구현별 예외 처리를 하는 작업은 다르다. 근무 시간 기록이 가능한 급여 방식에만 `addTimeCard`를 제공해야 한다면 별도 능력 역할로 좁히거나 사용 사례 경계에서 검증한다. 다른 급여 방식에 빈 메서드를 넣어 성공한 것처럼 넘기거나, 캐스팅만 추가해 원래 계약이 고쳐졌다고 보지 않는다.

## 반복되는 타입 분기를 한 변경 축으로 모은다

같은 타입 코드에 대한 `switch`가 요금 계산, 표시와 검증 등 여러 곳에 반복되면 새 타입을 추가할 때 모든 분기를 찾아야 한다. 타입별 행동을 같은 역할의 구현으로 옮기면 호출자는 역할에 메시지를 보내고 선택은 생성 경계에서 수행할 수 있다.

1. 기존 타입별 정상 결과, 경계값과 실패 동작을 고정한다.
2. 필요하면 생성 호출을 factory로 모아 구현 선택 지점을 만든다.
3. 행동을 타입별 구현으로 옮기고 각 구현에 필요한 상태만 함께 이동한다.
4. 호출자를 역할에 연결하고 불필요해진 타입 필드와 분기를 제거한다.
5. 사용처, 도달 조건과 대표 동작을 다시 확인한다.

커버리지에서 실행되지 않은 분기가 나왔다는 이유만으로 삭제하지 않는다. 미실행은 테스트가 그 경로를 다루지 않았다는 뜻일 수 있다. IDE의 unreachable/safe delete 판단도 정적 분석과 실제 호출 경계를 함께 확인한다.

모든 `switch`를 제거하는 것이 목적은 아니다. 고정된 작은 명령 집합이나 입력을 구현으로 매핑하는 한 곳의 분기는 명확할 수 있다. 타입별 행동이 실제로 반복되고 독립적으로 바뀔 때 다형성의 비용이 보상되는지 본다. OCP의 보호 대상은 관찰된 변경 축이며, 예상하지 못한 새 책임에는 기존 경계를 고칠 수 있다.

## 상속 계층에 독립적인 변화 축을 섞지 않는다

구체 부모 메서드를 하위 클래스가 계속 덮어쓴다면 부모 알고리즘과 계약을 실제로 공유하는지 점검한다. 구체 메서드 재정의 자체가 LSP 위반인 것은 아니다. 추상 메서드 구현은 확장 지점이고, 기존 동작 재정의는 부모가 보장하던 결과와 상태 변화를 별도로 확인해야 한다.

파싱 방식 m개와 저장 방식 n개를 한 상속 계층으로 결합하면 조합마다 클래스를 만드는 m×n 구조가 생길 수 있다. `Parser`와 `Storage` 역할을 분리해 합성하면 역할 구현 수를 m+n으로 줄일 수 있지만 구성 조합과 검증 비용까지 없어지지는 않는다. 단순 위임만 하는 별도 클래스가 책임을 더 명확히 하지 않는다면 새 계층 없이 기존 객체가 두 역할을 조립할 수 있다.

## ISP는 소비자의 기대에 따라 역할을 나눈다

인터페이스 오염은 구현체가 제공할 수 없거나 소비자가 쓰지 않는 연산이 함께 묶인 상태다. 아이템 이동용 `Carrier`에 `find`, `remove`, `add`를 모두 요구하면 추가만 가능한 지도가 빈 `remove`를 구현하게 된다. 이동 코드가 지도를 삭제 가능한 대상으로 받으면 행동 계약이 깨지고, 삭제 연산의 인자 변경도 지도 구현까지 전파된다.

- `Source`는 `find`, `remove`로 아이템을 내주는 역할이다.
- `Target`은 `add`로 아이템을 받는 역할이다.
- 양쪽 역할이 필요한 `Carrier`는 두 역할을 함께 제공한다.

이동은 `Source`와 `Target`을 각각 받고, 삭제는 `Source`만 받으며 지도는 `Target`만 구현한다. 한 객체가 여러 역할을 제공할 수 있으므로 역할을 나눈다고 반드시 객체도 각각 나눌 필요는 없다. 인터페이스 변경 이유는 소비자의 기대에서 찾는다.

CLI가 입력을 직접 기다리는 방식과 GUI가 이벤트를 받는 방식도 다르다. GUI에 의미 없는 `input()`을 강제하기보다 입력과 출력 역할을 나누고 실제로 필요한 출력 계약만 공유한다. 무관한 소비자의 요구 때문에 구현 클래스가 바뀌는지 확인하면 분리 효과를 평가할 수 있다.

역할은 구현 클래스의 모든 메서드를 복사하기보다 소비자가 필요한 계약으로 정의한다. 인터페이스를 좁히면 불필요한 소스 의존과 테스트 준비가 줄지만 재컴파일, 재배포의 범위는 언어와 빌드, 배포 단위에 달려 있다. 타입 수준 분리만으로 독립 배포가 보장되지는 않는다.

## 변경 비용의 징후를 구분한다

| 징후 | 관찰할 문제 | 먼저 확인할 근거 |
|---|---|---|
| 경직성(Rigidity) | 한 변경을 완료하려면 연결된 여러 모듈을 함께 고쳐야 함 | 변경에 따라가는 소스 의존 |
| 취약성(Fragility) | 수정 의도와 무관한 기능이 깨짐 | 공유 상태, 숨은 계약과 회귀 사례 |
| 이동 곤란(Immobility) | 필요한 기능만 다른 맥락에서 쓰기 어려움 | DB, UI 등 불필요한 의존과 분리 비용 |
| 점성(Viscosity) | 설계를 지키는 경로보다 임시 우회가 쉬워짐 | 긴 빌드와 테스트, 도구 및 모듈 구조 |
| 불필요한 복잡성 | 확인되지 않은 미래 변화 때문에 현재 이해 비용이 늘어남 | 쓰이지 않는 확장 지점과 실제 요구사항 |

테스트 작성의 어려움은 숨은 의존을 찾는 신호지만 모든 문제의 원인이 설계인 것은 아니다. 환경과 피드백 주기도 확인한다. 인터페이스나 클래스 수를 늘리기보다 실제 변경 사례를 전후로 적용해 영향 범위가 줄었는지 평가한다.

## 출처

- 즐거운 학습, [클린 코더스 강의 12. SOLID Foundation](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279451)
- 즐거운 학습, [클린 코더스 강의 13. SRP](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279452)
- 즐거운 학습, [클린 코더스 강의 14.1. OCP](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279453)
- 즐거운 학습, [클린 코더스 강의 14.2. LSP](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279454)
- 즐거운 학습, [클린 코더스 강의 14.3. ISP](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279455)
- 즐거운 학습, [클린 코더스 강의 15.1. DIP](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279456)
- 즐거운 학습, [클린 코더스 강의 15.2. SOLID Case Study](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279457)
- 즐거운 학습, [Repeated Switch를 Polymorphic하게 리팩터링하기](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279468)
- [The Single Responsibility Principle — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html)
- [Replace Conditional with Polymorphism — Martin Fowler](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html)
- 조영호, [5-1. 단일 책임 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=276707)
- 조영호, [5-2. 단일 책임 원칙을 위한 가이드](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=276759)
- 조영호, [5-3. 클래스 나누기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=276628)
- 조영호, [5-4.테스트 관점에서 분리하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=279249)
- 조영호, [5-5. 의존성을 기준으로 분리하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=279485)
- 조영호, [9-4. 책임 정리하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283708)
- 조영호, [8-1. 새로운 요구사항 추가하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283697)
- 조영호, [6-1. 디미터 법칙과 묻지 말고 시켜라 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=280443)
- 조영호, [6-2. 명령 쿼리 분리 원칙으로 부수효과 관리하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=280444)
- 조영호, [8-6. 아이템 이동 로직 개선하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283702)
- 조영호, [7-1. 외부 의존성과 테스트](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283470)
- 조영호, [7-2. 의존성 역전 원칙 - 상위 수준과 하위 수준](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283585)
- 조영호, [7-3. 의존성 역전 원칙 - 추상화와 세부 사항](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283691)
- 조영호, [7-4. 의존성 개선하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283692)
- 조영호, [9-5. 실행 환경 확장하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283709)
- 조영호, [8-4. 리스코프 치환 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283700)
- 조영호, [1-2. 학습 방법](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=290806)
- 조영호, [8-5. 리스코프 치환 원칙을 위한 가이드](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283701)
- 조영호, [9-6. 중복 코드 제거하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=285460)
- 조영호, [9-1. 더 많은 요구사항 추가하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=287785)
- 조영호, [9-2. 인터페이스 분리 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283706)
- 조영호, [9-3. 인터페이스 분리하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283707)
- 얄팍한 코딩사전 (얄코), [SOLID 원칙](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=236069)

- [Northeastern Demeter Project, Law of Demeter](https://www2.ccs.neu.edu/research/demeter/demeter-method/LawOfDemeter/LawOfDemeter.htm)
- [Liskov, Wing, A Behavioral Notion of Subtyping](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf)

## 관련 문서

- [[Responsibility-Driven-Design|책임 주도 설계와 GRASP]]
- [[OOP|객체지향 기본]]
- [[Function-Structure-and-Contracts|함수 구조와 호출 계약]]
