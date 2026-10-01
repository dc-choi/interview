---
tags: [architecture, modeling, view-model, api-design, sdui]
status: done
category: "Architecture - 데이터 모델"
aliases: ["View Model Design", "뷰모델 설계", "ViewModel", "Server Driven UI", "SDUI"]
---

# 뷰모델 설계와 Server Driven UI

뷰모델은 화면(뷰)을 추상화해 그리는 데 필요한 정보를 정리한 모델이다. API가 JSON으로 데이터를 내려주는 것 자체가 이미 일종의 뷰모델이지만, 뷰를 추상화한다는 자각 없이 데이터만 내려주면 어떤 필드를 어떻게 보여줄지에 대한 결정이 클라이언트 코드에만 흩어진다. 서버와 클라이언트 사이의 응답은 계약이며, 뷰모델은 그 계약을 뷰의 관점에서 설계하는 방법이다. [[Software-Modeling|소프트웨어 모델링]]의 한 적용이다.

## 응답을 설계하는 세 가지 방식

| 방식 | 장점 | 단점 |
|---|---|---|
| 화면 전체에 특화된 데이터 | 호출 한 번으로 끝나 성능과 클라이언트 편의가 좋다 | 서버의 조합 코드가 늘고, 화면 요구사항이 바뀌면 서버와 클라이언트가 함께 바뀐다 |
| 도메인 모델을 내려 클라이언트가 조합 | 서버는 도메인 설계에 집중하고 클라이언트는 유연하게 조합한다 | 여러 API 호출로 성능이 불리하고 조합 부담이 클라이언트에 간다 |
| 뷰를 추상화한 뷰모델 | 컴포넌트 단위로 화면을 짜는 클라이언트에 맞고, 추상화 수준을 조절해 재사용과 명확성의 균형을 잡는다 | 뷰의 정보를 분해하고 렌더러를 만드는 설계 비용이 든다 |

화면별 응답을 조합하는 계층을 별도로 두는 방식은 BFF로 이어진다. [[Microservice-Edge-and-Composition-Patterns]]

## 하나의 모델, 여러 개의 뷰

같은 게시물 목록 데이터도 리스트 뷰와 카드 뷰로 다르게 그릴 수 있다. 뷰모델 설계는 하나의 모델에서 여러 뷰가 나올 수 있다는 관점에서 출발한다. 설계하려면 먼저 뷰가 가진 정보를 분해한다.

- **상태(State)**: 사용자에게 보여주는 값
- **구조(Structure)**: 레이아웃 구조. 테이블이면 컬럼, 행, 셀
- **동작(Action)**: 버튼을 눌렀을 때 무엇을 할지 같은 상호작용 정보
- **스타일(Style)**: 색상, 폰트, 크기, 정렬

네 요소는 서로 독립적이지 않아 조합해서 모델을 만든다.

## 추상화 수준 고르기: 테이블 예시

이름, 나이, 상태가 담긴 단순 배열은 추상화 수준이 높다. 어떤 필드를 컬럼으로 쓰고 어떤 순서와 형식으로 보여줄지 모두 클라이언트가 해석해야 하고, 테이블이 아닌 다른 뷰로도 해석될 수 있어 서버와 클라이언트 사이에 오해가 생길 여지가 있다. 좋은 모델은 재사용할 수 있으면서 오해의 여지를 줄이므로, 테이블 뷰모델이라면 여러 테이블에 쓰이는 데만 집중해 설계한다.

테이블 뷰에 필요한 정보는 생각보다 많다. 구조, 컬럼 정의와 순서, 컬럼 타입과 포맷, 값 표시 방법, 정렬, 페이지네이션, 셀 병합, 필터링, 선택, 드래그 앤 드롭 등이다. 이 정보는 대개 요구사항과 디자인 단계에서 이미 정해지는데, 서버 코드에는 데이터만 남고 나머지는 클라이언트 코드에만 존재하는 경우가 많다. 서버가 뷰모델로 이 정보를 가지면 요구사항 변경에 서버 쪽에서 대응할 수 있다.

단계적으로 구체화한다.

1. 구조 추가: `columns`(id, label, type)와 `rows`를 나눠 내려주면 클라이언트는 컬럼 목록, 순서, 타입을 알고 범용 테이블 렌더러 하나로 대부분의 테이블을 그린다.
2. 상태 구체화: 셀마다 원본 `value`와 보여줄 `displayValue`를 함께 둔다. 나이 32를 32로 보여줄지 32세로 보여줄지가 서버 계약에 담긴다. 정렬과 필터에는 `value`를, 화면에는 `displayValue`를 쓴다.
3. 동작과 스타일 추가: 컬럼별 `align`, `sortable`, 행별 스타일, 페이지네이션 정보를 더한다.

```ts
type ColumnType = 'TEXT' | 'NUMBER' | 'DATE';
type Align = 'LEFT' | 'CENTER' | 'RIGHT';
type FilterType = 'EQUAL' | 'NOT_EQUAL' | 'IN' | 'BETWEEN' | 'LIKE' | 'GREATER_THAN' | 'LESS_THAN';

interface TableViewModel<T> {
  readonly columns: readonly ColumnDefinition[];
  readonly rows: readonly TableRow<T>[];
  readonly sortable: boolean;
  readonly pagination?: Pagination;
  readonly state: TableState;
}

interface ColumnDefinition {
  readonly id: string; // 컬럼 식별자
  readonly label: string; // 헤더에 표시할 이름
  readonly type: ColumnType;
  readonly align: Align;
  readonly sortable: boolean;
}

interface TableRow<T> {
  readonly cells: readonly TableCell<T>[];
  readonly style?: { readonly backgroundColor?: string };
}

interface TableCell<T> {
  readonly columnId: string;
  readonly value: T | null; // 정렬, 필터에 쓰는 원본 값
  readonly displayValue?: string; // 화면에 보여줄 값
}

interface Pagination {
  readonly page: number;
  readonly totalPage: number;
  readonly pageSize: number;
}

interface TableState {
  readonly sorting?: readonly { readonly columnId: string; readonly direction: 'ASC' | 'DESC' }[];
  readonly filters?: readonly { readonly columnId: string; readonly type: FilterType; readonly value: unknown }[];
}
```

모델은 데이터 구조 정의라 구현이 어렵지 않고, 클라이언트는 이 모델을 해석하는 렌더러를 한 번 만든다. 모든 기능을 처음부터 추상화할 필요는 없고 필요한 만큼 확장한다. 응답 DTO를 어느 계층에서 만들지는 [[DTO-Layering]]을 따른다.

## Server Driven UI

여러 뷰모델과 그 렌더러를 모두 갖춰 서버가 화면 구성까지 정해 내려주면 SDUI가 된다. SDUI는 뷰모델의 모음이자 추상화 수준이 가장 구체적인 끝이다. 예를 들어 Airbnb의 Ghost Platform은 화면 레이아웃, 섹션 배치, 섹션별 데이터, 사용자 상호작용 시의 동작까지 하나의 백엔드 응답으로 웹, iOS, Android를 동시에 제어하고, 세 플랫폼이 하나의 GraphQL 스키마를 공유한다.

- **장점**: 스토어 심사와 사용자 업데이트를 거쳐야 하는 클라이언트 배포 없이 서버 변경만으로 UI를 바꿀 수 있어 A/B 테스트와 개인화가 쉽다. 여러 플랫폼의 화면을 한 곳에서 맞춘다.
- **비용**: 클라이언트가 해석할 자유가 거의 없고 서버가 정한 대로 그린다. 컴포넌트 규칙을 엄격히 관리하고 전담할 사람이 없으면 오히려 생산성이 떨어진다. 로딩 시간, 오류 처리, 사용자 상호작용 설계도 서버 계약 안에서 다시 풀어야 한다.
- **호환성**: 이미 배포된 구버전 클라이언트가 모르는 컴포넌트를 받을 수 있으므로, 알 수 없는 컴포넌트의 대체 처리와 클라이언트 버전별 응답 제어를 계약에 포함한다. [[Backward-Compatibility-Design]]

도입 전에 화면 변경 빈도, 플랫폼 수, 전담 조직 여부를 따져 필요한 추상화 수준까지만 올린다.

## 체크포인트

- 화면 특화 응답, 도메인 모델 응답, 뷰모델의 장단점
- 뷰를 상태, 구조, 동작, 스타일로 분해하는 방법
- 추상화 수준이 높은 응답이 오해를 낳는 이유와 `value`, `displayValue` 분리
- SDUI의 장점과 운영 비용, 구버전 클라이언트 호환 처리

## 출처

- [모델링 시리즈: 뷰모델 — kciter.so, kciter](https://kciter.so/posts/modeling-series-view-model/)
- [A Deep Dive into Airbnb's Server-Driven UI System — The Airbnb Tech Blog, Ryan Brooks](https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5)

## 관련 문서

- [[Software-Modeling|소프트웨어 모델링과 좋은 모델의 기준]]
- [[DTO-Layering|DTO 레이어 스코프]]
- [[VO-DTO|VO와 DTO]]
- [[Microservice-Edge-and-Composition-Patterns|마이크로서비스 엣지와 조합 패턴 (BFF)]]
- [[Backward-Compatibility-Design|하위 호환성 설계]]
