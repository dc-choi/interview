---
tags: [architecture, design-pattern, modeling, condition-tree, composite, rule]
status: done
category: "Architecture & Design"
aliases: ["Condition Tree", "조건 트리", "Rule Tree", "데이터 기반 조건 평가"]
---

# 조건 트리

조건 트리는 AND, OR, NOT 같은 논리 연산과 단일 조건식을 트리로 표현해, 복잡한 조건을 코드가 아닌 데이터로 저장하고 런타임에 평가하는 모델이다. 쿠폰 노출 대상, 개인화 대상, 접근 권한, 기능 공개 대상처럼 조건이 자주 바뀌고 관리자가 직접 편집해야 하는 곳에 쓴다.

## 언제 필요한가

요구사항이 적을 때는 `if` 문이 가장 빠르다. 다음 요구가 생기면 조건을 코드 밖으로 꺼낸다.

- 다양한 상황별로 다른 조건을 평가해야 한다.
- 관리자가 개발자 없이 조건을 편집하고 싶어 한다.
- 배포 없이 런타임에 조건을 바꿔야 한다.
- 평가에 쓰는 데이터가 실시간으로 변한다.

조건을 코드로 조합하고 이름을 붙이는 것이 목적이면 [[Specification패턴이란|Specification 패턴]]으로 충분하다. 조건 트리는 같은 합성 구조를 데이터로 저장하고 해석한다는 점이 다르다.

## 조건을 추상화하는 방법

18세 이상이면서 첫 구매거나 VIP인 경우라는 문장은 조건식과 논리 연산자로 나뉜다.

- 조건식: `age >= 18`, `purchaseCount == 0`, `level == VIP`
- 논리 연산자: AND, OR
- 결합: `age >= 18 AND (purchaseCount == 0 OR level == VIP)`

연산자 우선순위와 괄호는 트리 구조로 표현한다. 수식 트리를 재귀로 계산하듯 조건 트리도 재귀로 평가한다.

```text
        AND
    ┌────┴──────────┐
(age >= 18)        OR
           ┌────────┴─────────┐
 (purchaseCount == 0)   (level == VIP)
```

- **Composite 노드**: AND, OR, NOT. 자식 노드를 가진다.
- **Leaf 노드**: 속성(attribute), 비교 연산자(operator), 값(value)으로 된 단일 조건식. 자식이 없다.

단순한 조건과 복잡한 조건을 같은 인터페이스로 다루는 [[Composite패턴이란|Composite 패턴]]이고, 트리를 해석해 결과를 내는 부분은 [[Interpreter패턴이란|Interpreter 패턴]]에 해당한다.

## 모델과 평가

```ts
type ComparisonOperator = 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN';
type LogicalOperator = 'AND' | 'OR' | 'NOT';

interface LeafCondition {
  readonly kind: 'LEAF';
  readonly attribute: string; // 허용된 속성 목록 안의 키
  readonly operator: ComparisonOperator;
  readonly value: unknown;
}

interface CompositeCondition {
  readonly kind: 'COMPOSITE';
  readonly logic: LogicalOperator;
  readonly children: readonly ConditionNode[];
}

type ConditionNode = LeafCondition | CompositeCondition;

/** 평가 시점에 속성 값을 제공한다. 없는 속성은 undefined를 돌려준다. */
type AttributeResolver = (attribute: string) => unknown;

const evaluate = (node: ConditionNode, resolve: AttributeResolver): boolean => {
  if (node.kind === 'LEAF') return evaluateLeaf(node, resolve);
  const results = node.children.map((child) => () => evaluate(child, resolve)); // 지연 평가
  if (node.logic === 'AND') return results.every((run) => run());
  if (node.logic === 'OR') return results.some((run) => run());
  return !results[0](); // NOT은 저장 전 검증에서 자식 1개를 보장한다
};
```

`AttributeResolver`가 속성 값을 평가 시점에 공급하므로 조건 트리는 데이터 출처를 모른다. 사용자 나이, 구매 횟수, 장바구니 내용처럼 비용이 다른 속성은 필요할 때만 조회하고, 같은 평가 안에서는 결과를 캐시한다. `every`와 `some`은 결과가 정해지면 남은 자식을 평가하지 않으므로, 싼 조건을 앞에 두면 비싼 조회를 줄일 수 있다.

## 설계 함정

- **없는 속성과 NOT**: 속성이 없을 때 Leaf를 거짓으로 처리하면 NOT 아래에서는 참이 된다. `NOT(level == VIP)` 조건에서 등급 정보를 못 읽은 사용자가 대상에 포함된다. 속성 없음을 거짓, 오류, 알 수 없음 중 무엇으로 볼지 정하고, 알 수 없음을 두면 NOT과 AND, OR에서 알 수 없음이 전파되는 3값 논리를 적용한다. 쿠폰이나 권한처럼 잘못 참이 되면 손실이 큰 곳은 알 수 없음을 거부로 수렴시킨다.
- **빈 AND**: 자식이 없는 AND는 공허하게 참이라 모든 사용자가 대상이 된다. AND와 OR는 자식 1개 이상, NOT은 정확히 1개를 저장 전에 검증한다.
- **타입 불일치**: 값을 문자열로 저장하고 타입 정보로 변환할 때, 실제 속성 값의 숫자 타입(정수와 장정수, number와 bigint)이나 날짜 표현이 다르면 비교가 항상 거짓이 된다. 속성 목록에 속성별 타입을 정의하고 저장과 평가 양쪽에서 같은 규칙으로 정규화한다.
- **자유 입력 속성**: 관리자가 임의의 속성 이름을 넣게 하면 오타가 조용히 거짓이 된다. 속성과 허용 연산자를 레지스트리로 제한하고 편집 화면에서 선택하게 한다.
- **깊이와 크기**: 재귀 평가에는 최대 깊이와 노드 수 제한을 둔다.

## 저장

관계형 DB에 저장하면 객체 트리와 테이블 사이의 불일치가 생기므로 저장용 엔티티를 따로 둔다.

| 방식 | 구조 | 고려점 |
|---|---|---|
| 인접 리스트 | 노드 하나당 한 행. `target_id`, `parent_id`, `node_type`, Leaf 필드, Composite 필드 | 대상의 노드를 한 번에 조회해 메모리에서 트리로 조립한다. 자식 순서가 평가 비용에 영향을 주므로 순서 컬럼을 둔다. 루트가 하나인지, 순환이 없는지 검증한다 |
| JSON 컬럼 | 대상마다 트리 전체를 JSON 문서 하나로 저장 | 조건 트리는 통째로 읽고 쓰는 경우가 많아 단순하다. 스키마 검증을 애플리케이션이나 DB 제약으로 걸고, 노드 단위 조회가 필요한지 확인한다. [[JSON-vs-Text-Column]] |

문서형 DB라면 트리를 문서로 그대로 저장할 수 있다.

## 운영

- **버전 관리**: 쿠폰이나 권한을 부여한 근거를 나중에 설명하려면 평가 당시 조건의 버전을 남긴다. 조건 변경은 수정보다 새 버전 생성으로 다루고 변경자와 시각을 기록한다.
- **평가 설명**: 어떤 Leaf 때문에 거짓이 됐는지 추적 결과를 남기면 고객 문의와 디버깅이 쉬워진다.
- **편집 안전장치**: 저장 전 검증과 함께 샘플 사용자에 대한 미리보기 평가를 제공한다.
- **캐시**: 자주 평가하는 대상의 트리는 버전 기준으로 캐시하고, 버전이 바뀌면 무효화한다.

## 룰 엔진과의 차이

| 축 | 조건 트리 | 룰 엔진 |
|---|---|---|
| 평가 단위 | 트리 하나가 불리언 하나를 낸다 | 수십에서 수천 개 규칙을 함께 평가한다 |
| 결과 | 참과 거짓. 후속 동작은 호출부가 정한다 | IF 조건이 맞으면 THEN 동작을 실행한다 |
| 필요한 개념 | 검증, 속성 공급, 버전 | 우선순위, 충돌 해소, 규칙 간 추론(chaining) |
| 맞는 상황 | 단일 판단을 관리자 화면에서 조정하고 즉시 결과가 필요할 때 | 규칙이 많고 서로 의존하거나 연쇄 추론이 필요할 때 |

조건 트리는 룰 엔진의 조건부만 떼어 낸 가벼운 모델이다. 대상 선택이 목적인 기능 공개는 [[Feature-Flag]]의 타기팅, 속성 기반 접근 제어는 [[Access-Control-Models]]의 ABAC와 같은 구조로 볼 수 있다.

## 체크포인트

- 조건을 코드 대신 데이터로 저장해야 하는 요구사항
- 조건식과 논리 연산자로 문장을 분해하고 트리로 표현하는 방법
- Composite, Interpreter, Specification 패턴과의 관계
- 없는 속성, 빈 AND, 타입 불일치가 만드는 잘못된 참
- 인접 리스트와 JSON 저장의 선택 기준, 조건 버전을 남기는 이유
- 조건 트리와 룰 엔진의 차이

## 출처

- [모델링 시리즈: 조건 트리 — kciter.so, kciter](https://kciter.so/posts/modeling-series-conditional-tree/)

## 관련 문서

- [[Specification패턴이란|Specification 패턴]]
- [[Interpreter패턴이란|Interpreter 패턴]]
- [[Composite패턴이란|Composite 패턴]]
- [[Software-Modeling|소프트웨어 모델링과 좋은 모델의 기준]]
- [[Feature-Flag|Feature Flag]]
- [[Access-Control-Models|접근 제어 모델]]
