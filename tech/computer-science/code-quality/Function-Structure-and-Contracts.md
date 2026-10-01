---
tags: [code-quality, function, clean-code, refactoring, cqs]
status: done
category: "CS - 코드 품질"
aliases: ["함수 구조와 호출 계약", "Function Structure"]
---

# 함수 구조와 호출 계약

함수의 가독성은 길이만으로 정해지지 않는다. 호출자가 입력, 결과, 부수효과와 실패 조건을 예상할 수 있고, 본문이 이름으로 표현한 목적을 따라가는지가 기준이다.

## 한 가지 일은 추상화 수준으로 판단한다

주문 처리 함수가 검증, 결제, 저장을 차례로 호출해도 같은 수준의 사용 사례를 완성한다면 하나의 목적을 표현할 수 있다. 그 사이에 문자열 파싱이나 SQL 구성 같은 세부 구현이 끼어 있으면 무엇과 어떻게가 섞인다.

- 이름 붙은 단계가 의도를 설명하면 Extract Function/Method로 추출한다.
- 새 함수가 기존 문장을 같은 뜻으로 되풀이하고 탐색만 늘리면 추출을 멈춘다.
- 짧고 한 곳에서만 쓰는 검증은 그대로 둘 수 있다. 복잡한 조건에는 `canPublish` 같은 변수 이름만 붙여도 충분할 수 있다.
- 줄 수와 중첩은 점검 신호다. 함수 4줄, 모든 블록 추출 같은 일괄 기준으로 판단하지 않는다.

읽기 순서는 공개 진입점에서 세부 단계로 내려가게 배치할 수 있다. Step-Down Rule은 호출 흐름을 먼저 보여주는 관례이며 언어, 팀 규칙과 선언 순서의 제약보다 우선하지 않는다. 서로 함께 이해해야 하는 코드는 가까이 두고, 다른 단계는 빈 줄로 구분한다.

## 큰 함수의 지역 상태가 추출을 방해할 때

여러 지역 변수가 복잡하게 얽혀 작은 함수로 나누기 어려우면 계산 전체를 실행 객체로 옮길 수 있다. Method Object, Replace Function with Command는 이때 검토할 리팩터링이다.

1. 현재 동작을 고정할 대표 입력과 출력을 확보한다.
2. 함수의 입력과 지역 상태를 실행 객체 안으로 옮긴다.
3. 공유 상태를 사용하던 블록을 의미 있는 메서드로 나눈다.
4. 실제 책임이 드러나면 임시 이름을 고치고, 계산과 출력 등 다른 책임을 분리한다.

이는 인자를 0개로 만들기 위해 상태를 클래스 필드로 숨기는 기법이 아니다. 실행마다 바뀌는 상태를 재사용되는 서비스 필드에 옮기면 동시 호출이 간섭할 수 있다. 실행별 객체를 만들거나 지역 값과 명시적인 입력을 유지한다. 단순 함수 추출로 해결되면 별도 클래스를 만들지 않는다.

## 인자는 호출자의 구분 비용을 줄인다

같은 타입의 위치 인자가 늘어나면 순서를 바꿔도 오류를 찾기 어렵다. 같은 작업의 검색 조건이나 좌표는 이름 있는 프로퍼티를 가진 입력 객체로 묶는다. 관련 없는 값까지 하나의 거대한 옵션 객체에 넣으면 책임 혼합이 가려진다.

```typescript
interface ProductSearchInput {
  readonly query: string;
  readonly categoryId?: string;
  readonly page: number;
  readonly pageSize: number;
}
```

이 Vault의 사용자 선호는 일반 함수의 최상위 인자 최대 3개, 입력 객체와 배열의 `readonly`다. 객체 내부 프로퍼티 수를 제한하거나 DI 생성자에 같은 제한을 강제하는 뜻은 아니다. 기술적 호출 계약을 확인한 세부 기준은 [[Coding-Preferences-TypeScript]]에 둔다.

`render(true)`처럼 boolean이 서로 다른 작업을 선택한다면 `renderPreview()`와 `renderPublished()` 등 의도별 API를 검토한다. 단순한 상태 값이나 조건 자체를 표현하는 모든 boolean 인자가 나쁜 것은 아니다. 입력 객체를 출력 통로로 변경하기보다 계산 결과를 반환하면 부수효과를 찾기 쉽다.

## 명령과 조회의 약속

CQS(Command Query Separation)는 상태를 변경하는 명령과 관찰 가능한 상태를 바꾸지 않고 값을 돌려주는 조회를 구분한다. `get`, `find`, `is`로 이름 붙인 조회가 저장, 일정 조정이나 외부 알림을 숨기면 호출자가 순서와 재호출의 영향을 추적해야 한다.

조회가 관찰 가능한 상태를 바꾸지 않는다는 것과 같은 인자에 매번 같은 값을 반환한다는 것은 다르다. 다른 명령이나 외부 시스템이 상태를 바꾸면 조회 결과도 달라질 수 있다. CQS만으로 순수 함수나 결정성을 보장하지 않는다.

엄격한 CQS에서는 명령이 값을 반환하지 않는다. 다만 생성 ID 반환, 스택의 `pop`, 원자적인 조건부 갱신처럼 변경과 결과를 함께 제공하는 API가 더 적절할 수 있다. 두 호출로 나누면 중간 상태가 바뀔 수 있는지도 확인하고, 이름과 반환 계약에 변경을 드러낸다. 읽기와 쓰기 모델을 분리하는 CQRS는 더 큰 범위의 설계이며 같은 개념이 아니다.

객체의 상태를 꺼내 외부에서 대신 판단하는 흐름은 [[Object-Design-Principles|묻지 말고 시켜라와 디미터 법칙]]으로 점검한다. 필요한 조회를 모두 없애거나 컬렉션 체이닝을 점 개수로 금지하지 않는다.

## 시간적 결합은 API에 드러낸다

`open → process → close`처럼 호출 순서를 지켜야만 올바른 기능은 사용자가 단계를 빠뜨릴 수 있다. 시간적 결합(Temporal Coupling)을 줄이려면 수명 관리와 실제 작업을 구분한다.

- 완성된 유효 상태만 생성할 수 있다면 생성 시 필수 입력을 받는다. 필수 setter를 나중에 호출해야 하는 불완전한 상태를 피한다.
- 자원 해제는 언어의 수명 관리 기능이나 `try/finally`로 보장한다. 작업이 실패해도 해제해야 한다.
- 같은 열기와 닫기가 반복되면 기존 API나 작은 callback 기반 함수로 고정 흐름을 묶고, 달라지는 작업만 받는다.
- 여러 단계가 업무상 필요하면 이름, 상태 검사나 타입으로 전제 조건을 표현한다. 필요한 순서를 없앤 것처럼 숨기지 않는다.

여러 선택값이 있는 객체 생성에는 Builder가 도움이 될 수 있지만, TypeScript의 이름 있는 입력 객체로 충분하면 패턴을 추가하지 않는다. 필요한 호출 순서와 자원 범위가 줄었는지가 판단 기준이다.

## 부재, 오류와 특별한 경우를 구분한다

정상적인 조회 부재, 입력 오류, 업무 규칙 위반과 인프라 실패는 같은 결과가 아니다. 호출자가 무엇을 처리해야 하는지에 따라 반환 계약을 정한다.

- 단건 `findOne`의 정상 부재는 `null`, 목록 `findAll`의 정상 부재는 `[]`로 표현한다. 존재가 필수인 사용 사례는 호출부에서 확인해 업무 예외를 던진다.
- 입력과 권한 검증은 신뢰 경계에서 수행한다. 내부 전제와 테스트가 있다는 이유로 외부 입력 검증을 없애지 않는다.
- 업무 오류는 호출자가 구분할 수 있는 이름과 필요한 맥락을 담는다. 예외 메시지만으로 오류 종류를 판별하지 않는다.
- `try/catch`는 복구, 변환, 맥락 추가나 자원 관리가 필요한 범위에 둔다. try 본문 한 줄이나 모든 함수의 catch를 의무화하지 않는다.

Special Case는 특별한 경우도 공통 행동 계약으로 다루는 객체다. Null Object는 그중 부재에 대한 기본 행동을 제공하는 선택이다. 기본 동작이 업무적으로 안전하고 여러 호출부의 같은 분기를 줄일 때 유효하다. 필수 데이터 누락이나 발송 실패를 아무 일도 하지 않는 객체로 바꾸면 오류가 숨겨질 수 있으므로 명시적인 실패를 유지한다.

## 이름, 주석과 형식은 서로 보완한다

이름은 역할, 단위와 관찰 가능한 효과를 표현한다. 코드가 하는 일을 그대로 반복하는 주석과 오래된 주석은 고치거나 제거하되, 이유, 외부 제약과 변경하면 안 되는 계약은 남긴다. JSDoc의 입력과 반환 설명도 필요한 호출 계약을 전달한다. 주석이 있다는 사실만으로 나쁜 코드라고 판단하지 않는다.

팀 규칙을 코드 예시로 보여주고 formatter/linter로 반복 결정을 줄일 수 있다. 합의된 규칙과 결정 근거를 문서에 남기는 일도 유효하다. 코드가 모든 컨벤션 설명을 대신해야 하는 것은 아니다.

## 체크포인트

- 함수를 추출한 뒤 목적이 선명해졌는가, 따라갈 파일만 늘었는가?
- 입력 객체와 실행 상태의 소유자가 명확한가?
- 조회 이름과 실제 부수효과가 일치하는가?
- 정상 부재와 반드시 처리할 실패를 구분했는가?
- 호출 순서와 자원 해제가 성공, 실패 경로 모두에서 보장되는가?

## 출처

- [인프런, 클린 코더스, 강의 3. Function](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279441)
- [인프런, 클린 코더스, 강의 4. Function Part2](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279440)
- [인프런, 클린 코더스, 강의 5. Function Structure](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279442)
- [인프런, 클린 코더스, 강의 5. Function Structure Part2](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279443)
- [인프런, 클린 코더스, 강의 6. Form](https://www.inflearn.com/courses/lecture?courseId=336905&unitId=279444)
- [Command Query Separation — Martin Fowler](https://martinfowler.com/bliki/CommandQuerySeparation.html)
- [Tell Dont Ask — Martin Fowler](https://martinfowler.com/bliki/TellDontAsk.html)
- [Replace Function with Command — Martin Fowler](https://refactoring.com/catalog/replaceFunctionWithCommand.html)

## 관련 문서

- [[Object-Design-Principles|객체 설계 원칙과 리팩터링]]
- [[Object-Design-Principles-Change-and-Contracts|변경 사례와 행동 계약]]
- [[Beautiful-Code|아름다운 코드의 조건과 유지]]
- [[Coding-Preferences-TypeScript|TypeScript 코딩 선호]]
- [[Clean-Architecture-NestJS-CQRS|읽기와 쓰기 모델 분리]]
