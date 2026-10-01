---
tags: [testing, legacy, characterization-test, approval-test, mutation-testing]
status: done
verified_at: 2026-10-01
category: "테스트&품질(Testing&Quality)"
aliases: ["Legacy Code Testing", "레거시 테스트", "Characterization Test", "Approval Test", "Mutation Testing"]
---

# 레거시 코드의 특성화, 승인과 변이 테스트

기존 동작을 바꿔야 하는데 테스트가 부족하면, 먼저 변경의 영향을 관찰할 경계와 안전망을 만든다. 세 기법은 목적이 다르며 함께 사용할 수 있다.

| 기법 | 확인하는 것 | 한계 |
|---|---|---|
| Characterization Test(특성화 테스트) | 현재 입력에 대해 어떤 결과와 부작용이 발생하는가 | 현재 동작이 올바른 요구사항이라는 증거는 아니다 |
| Approval Test(승인 테스트) | 사람이 검토한 결과 기준선과 달라졌는가 | 잘못된 결과도 승인하면 고정된다 |
| Mutation Testing(변이 테스트) | 작은 코드 결함을 넣었을 때 테스트가 실패하는가 | 생성한 변이 밖의 결함이나 빠진 요구사항은 보장하지 않는다 |

## 특성화 테스트: 바꾸기 전에 현재 동작을 기록한다

변경할 코드의 호출부와 결과 소비자를 확인해, 내부 함수 변경의 영향이 드러나는 공개 경계를 찾는다. 반환값뿐 아니라 파일 쓰기, 저장 상태와 오류도 관찰 대상이다. 테스트하기 어려운 의존성은 [[Mock-Testing-Strategy-Isolation#레거시 의존성의 Subclass and Override Method|작은 대체 지점]]을 만들거나 외부에서 주입한다.

- 대표 입력과 경계값으로 현재 결과를 기록한다. 반복 실행에서 결과가 같은지도 확인한다.
- 낯선 동작은 바로 고치지 않는다. 기존 소비자가 의존하는지, 승인된 요구사항과 다른지 구분한다.
- 버그를 수정할 때는 현행 동작을 고정하는 테스트와 새 요구사항의 테스트를 의도적으로 구분한다.
- 안전망을 확보한 범위에서 구조를 바꾸고 매 단계 테스트를 실행한다. 구조 개선과 기능 변경을 한 번에 섞으면 차이의 원인을 찾기 어렵다.

## 승인 테스트 Approval Test

출력이 크거나 조합이 많으면 필드마다 assertion을 반복하기보다 읽을 수 있는 결과를 기준선으로 남길 수 있다. 실행 결과인 Received와 검토된 기준인 Approved를 비교하는 방식이다. 특성화 테스트가 목적이라면 승인 테스트는 그 결과를 비교하는 수단이 된다.

1. 검증할 공개 결과를 JSON, 표나 텍스트처럼 읽기 쉬운 표현으로 만든다.
2. 시각, 자동 ID와 출력 순서 등 비결정적 요소를 식별한다. 가능하면 입력이나 시계를 고정한다.
3. diff를 읽고 의미 있는 동작인지 확인한 뒤 기준선을 승인한다.
4. 이후 변경은 기준선과 비교하고, 의도한 변경만 검토 후 갱신한다.

실패한 결과를 자동으로 기준선에 덮어쓰면 회귀를 승인하게 된다. 정규화나 scrubber도 실제 오류를 지울 수 있으므로, 금액과 식별자 관계 같은 중요한 값은 보존하거나 별도 assertion으로 검증한다. ORM 엔티티 전체를 직렬화하면 순환 참조나 불필요한 필드 변경이 diff를 키울 수 있어, 검증 계약에 맞는 출력 모델을 사용한다.

### 조합 입력과 경계값

이름, 품질, 남은 날짜처럼 여러 축을 조합하면 누락된 분기를 발견하기 쉽다. 각 축에서 정상값뿐 아니라 `0`, 경계 바로 아래와 위, 빈 값 같은 사례를 선택한다. 분기 커버리지는 아직 실행하지 않은 경로를 찾는 신호다.

전체 조합 수는 각 축의 경우의 수를 곱한 만큼 늘어난다. 실행 비용이 크면 대표 조합이나 pairwise를 검토하되, 세 조건 이상이 함께 만드는 업무 규칙은 명시 사례로 남긴다. 파라미터화된 예제를 많이 실행하는 것과, 생성 입력에 대해 불변 성질을 검사하는 프로퍼티 기반 테스트는 구분한다([[Test-Fixture#테스트 데이터 준비 방식]]).

## 변이 테스트: 테스트가 결함을 잡는지 검사한다

라인이나 분기 커버리지 100%는 코드를 실행했다는 정보다. 결과를 단언하지 않거나 경계값을 놓치면 잘못된 코드도 통과한다. 변이 테스트는 `>=`를 `>`로 바꾸거나 반환값을 바꾸는 작은 변경을 만들고 기존 테스트를 다시 실행한다.

- **Killed**: 해당 변이 때문에 테스트가 실패했다.
- **Survived**: 변이를 실행한 테스트가 통과했다. 입력이 차이를 드러내는지, assertion이 결과를 관찰하는지 확인한다.
- **No coverage**: 변이가 생긴 위치를 실행한 테스트가 없다.
- **Equivalent mutation**: 허용된 관찰 범위에서 원래 코드와 같은 결과를 낸다. 살아남았다는 이유만으로 테스트 누락으로 단정하지 않는다.
- 타임아웃, 실행 오류와 무효 변이는 테스트 실패에 의한 검출과 구분한다.

조건 경계 변이가 살아남으면 정확히 경계인 입력을 넣고, 그 결과의 차이를 단언하는지 확인한다. assertion을 추가할 때는 변이 도구가 기대하는 값이 아니라 업무 규칙을 기준으로 삼는다.

변이 점수도 선택한 연산자와 대상 범위에 대한 지표다. 높은 점수가 정확성 증명은 아니다. 실행 횟수가 커지므로 중요한 규칙이나 변경된 범위부터 적용한다. 2026-10-01 PIT 공식 문서 기준으로 PIT는 Java/JVM의 바이트코드에 변이를 적용한다. 테스트 러너와 변이 도구는 역할이 다르므로, pytest나 JUnit 자체가 변이를 만드는 것으로 혼동하지 않는다.

## 적용 순서와 완료 판단

변경 위치와 관찰 경계 확인 → 현행 동작 기록 → 중요한 출력 기준선 검토 → 미실행 경로와 살아남은 변이 분석 → 작은 리팩토링 → 의도한 기능 변경 순으로 위험을 줄인다. 모든 코드에 같은 커버리지나 변이 점수 목표를 강제하기보다 변경 위험과 중요한 규칙을 기준으로 범위를 정한다.

완료를 판단할 때는 보존한 계약, 의도적으로 바꾼 동작, 실제 외부 연동을 검증한 범위와 아직 관찰하지 못한 경로를 함께 기록한다.

## 출처

- [Working Effectively with Legacy Code — Michael Feathers](https://www.objectmentor.com/resources/articles/WorkingEffectivelyWithLegacyCode.pdf)
- [ApprovalTests.Java — 공식 저장소](https://github.com/approvals/ApprovalTests.Java)
- [ApprovalTests.Java, Features](https://github.com/approvals/ApprovalTests.Java/blob/master/approvaltests/docs/Features.md)
- [PIT, Mutation Testing](https://pitest.org/)
- [PIT, Basic Concepts](https://pitest.org/quickstart/basic_concepts/)
- [인프런, 클린 코더스, 레거시코드에 테스트 추가를 위한 3가지 기법](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279463)
- [인프런, 클린 코더스, 레거시코드에 테스트 추가하는 또 하나의 방법 - Subclass and Override Method](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279466)
- [인프런, 클린 코더스, Vertical Slice 방식으로 GraphQL 어플리케이션을 TDD로 구현하기](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279469)

## 관련 문서

- [[Refactoring-In-Practice|레거시 리팩토링의 변경 안전망]]
- [[Mock-Testing-Strategy-Isolation|외부 의존성과 테스트 대체 지점]]
- [[TDD-Refactoring-Practice|TDD의 점진적 테스트와 구현]]
- [[Test-Fixture|테스트 데이터와 프로퍼티 기반 검증]]
- [[Deterministic-Test|결정적인 테스트]]
