---
tags: [web, frontend, atomic-design, design-system, component, react]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Atomic Design", "아토믹 디자인", "컴포넌트 계층", "Pure Component Layering"]
---

# Atomic Design과 컴포넌트 계층 규칙

Atomic Design은 Brad Frost가 제안한 디자인 시스템 구성 방법으로, UI를 화학 비유의 다섯 단계로 나눠 작은 조각에서 화면까지 조립한다. 작은 단위부터 큰 단위로 컴포넌트를 쌓던 기존 관행에 공통 용어를 붙인 것에 가깝다. 단계 정의는 단순하지만 실제로 적용하면 경계가 애매한 지점이 계속 나와 팀마다 해석 규칙을 따로 정하게 된다. 이 문서는 단계 정의와 함께 그 해석 규칙의 예를 정리한다.

## 다섯 단계

| 단계 | 정의 | 재사용성 |
|---|---|---|
| Atom | 더 쪼개면 기능을 잃는 기본 요소. 레이블, 입력, 버튼 | 가장 높다 |
| Molecule | Atom 여러 개가 한 단위로 동작하는 단순한 묶음. 한 가지 일만 잘한다 | 높다 |
| Organism | Molecule과 Atom으로 이뤄진 복잡한 컴포넌트로 화면의 독립된 구획을 이룬다 | 여기부터 낮아진다 |
| Template | 컴포넌트를 레이아웃에 배치해 콘텐츠의 구조를 정한다. 실제 콘텐츠가 아니라 구조에 집중한 와이어프레임에 가깝다 | 레이아웃으로 재사용된다 |
| Page | 실제 대표 콘텐츠가 들어간 Template의 구체적 인스턴스. 디자인 시스템이 잘 작동하는지 검증하는 곳이다 | 보통 URL 하나에 하나 |

Brad Frost는 이 다섯 단계가 선형 절차가 아니라 여러 단계를 동시에 오가며 설계하게 하는 사고 모델이라고 강조한다. 색상, 폰트, 애니메이션 같은 디자인 토큰을 Atom에 넣을지는 팀이 정할 해석이다. 토큰과 스타일 경계는 [[React-Routing-and-Styling]]에 있다.

## 해석 규칙의 예

단계 정의는 범용성을 위해 핵심만 담고 있어, MVC가 구현마다 달라지듯 팀마다 경계를 다르게 긋는다. 아래는 하나의 합리적인 규칙 세트다. 맹목적으로 따르기보다 팀 구성원과 환경에 맞게 합의한다.

### Atom의 최대 범위

최소 범위는 HTML 요소나 속성 하나지만, 최대 범위도 정해야 한다. 여러 요소가 겹쳐 있어도 시각적으로 한 덩어리이고 한 가지 역할만 하면 Atom으로 본다. 아바타(이미지와 테두리와 상태 표시)나 아이콘 버튼이 그 예다. 역할별로 다른 버튼을 쓰는 디자인이라면 역할마다 Atom을 만들지, 하나의 Atom에 변형(variant)을 둘지 확장 가능성과 수정 빈도를 보고 정한다. 그래서 Atom을 잘 만들려면 서비스의 디자인 원칙을 이해해야 한다.

### Molecule과 Organism의 경계

크기나 복잡도로 나누면 흔들린다. 역할과 기능 요구사항으로 나눈다.

- Molecule: 데이터를 표시하고 이벤트를 받을 수 있지만 한 가지 역할만 한다. 날씨 위젯은 작아도, 주입받은 데이터가 어제 것인지 오늘 것인지 모르고 그대로 그리기만 한다면 Molecule이다.
- Organism: 사용자에게 의미 있는 기능 요구사항을 담는다. 광고 영역은 단순해 보여도 광고를 보여주고 주기적으로 교체한다는 요구사항을 가지면 Organism이다. 날씨를 실시간으로 갱신한다는 요구사항도 날씨 Molecule을 감싼 Organism이 맡는다.
- 그래도 결정하기 어렵다면 일단 한쪽에 두고 역할이 분명해지면 옮긴다.

### 순수 컴포넌트와 부수 효과 계층

네트워크 요청처럼 결과가 외부에 달린 부수 효과를 계층 아래로 퍼뜨리지 않는다.

- Atom, Molecule, Organism, Template은 props로만 데이터를 받는 순수 컴포넌트로 둔다. 전역 상태 저장소에서 직접 읽지도 않는다. 외부 없이 독립적으로 렌더링되므로 Storybook 같은 도구로 테스트하기 쉽다.
- Page가 데이터를 가져와 아래로 주입한다.
- 모든 페이지에 공통으로 필요한 데이터(어느 페이지에서나 보이는 인기 목록)까지 Page가 매번 가져오면 Page의 책임이 과해진다. 순수 컴포넌트를 감싸 데이터 조회나 전역 상태 연결을 추가하는 부수 효과 허용 계층(Wrapped)을 따로 두면 책임을 나눌 수 있다.

이는 상태 없는 표현 컴포넌트와 상태를 가진 컨테이너를 나누던 패턴과 같은 발상이다. 그 패턴을 널리 알린 Dan Abramov는 Hooks로 상태 로직을 임의의 분할 없이 분리할 수 있게 된 뒤로는 모든 컴포넌트를 이렇게 나누길 더는 권하지 않고, 필요 없이 교조적으로 강제하는 것을 경계한다. 계층 분리는 테스트성과 재사용이 실제로 필요한 곳에 적용하고, 로직 재사용은 커스텀 Hook으로도 풀 수 있다. 서버 컴포넌트를 쓰는 프레임워크에서는 데이터를 가져오는 위치 자체가 달라지므로 규칙을 그 구조에 맞춰 다시 정한다. [[React-Application-Design]]

### Template의 범위

- Template 안에 Template을 중첩하기보다 Page에서 여러 Template을 조합한다.
- Page 전체가 아니라 화면 일부의 구조도 Template으로 만들 수 있다. 메신저 앱이라면 작업 공간 목록, 채널 목록, 대화 영역을 각각 Template으로 두고 Page에서 조합한다.

### 반복되는 목록

- 목록 항목이 다른 곳에서 재사용되지 않으면, 목록 전체를 Organism으로 만들고 항목은 그 Organism 폴더 안의 내부 컴포넌트로 둔다. 내부 컴포넌트는 밖에서 가져다 쓰지 않는다.
- 항목이 여러 곳에서 재사용되면 항목을 Molecule이나 Organism으로 독립시키고 반복 배치는 Template이 맡는다.

### 모달, 툴팁, 팝오버

사용자 상호작용으로 나타나는 컴포넌트는 내용이 복잡해 하위 계층이 상위 계층을 품는 역전이 생기기 쉽다. 순수 컴포넌트는 열기 이벤트와 표시할 슬롯만 받고, 모달의 상태와 내용은 부수 효과 계층에서 주입한다. 모달 틀 자체는 구조를 정하는 역할이라 Template 계층에 둔다. DOM 위치와 쌓임 순서 문제는 포털로 문서 최상위에 렌더링해 해결한다.

```tsx
interface ItemActionsProps {
  readonly onOpen: () => void;
  readonly modal: React.ReactNode; // 부수 효과 계층이 주입한다
}

const ItemActions = ({ onOpen, modal }: ItemActionsProps) => (
  <div>
    <button type="button" onClick={onOpen}>상세 보기</button>
    {modal}
  </div>
);
```

## 체크포인트

- 다섯 단계의 정의와 재사용성이 단계마다 달라지는 이유
- Molecule과 Organism을 크기가 아니라 역할과 기능 요구사항으로 나누는 기준
- 순수 컴포넌트와 부수 효과 계층을 나누는 이점과, 컨테이너 분리를 교조적으로 강제할 때의 비용
- 재사용 여부에 따라 목록 항목을 배치하는 방법
- 모달을 주입 방식으로 다루는 이유

## 출처

- [Effective Atomic Design — kciter.so, kciter](https://kciter.so/posts/effective-atomic-design/)
- [Atomic Design, Chapter 2 — Brad Frost](https://atomicdesign.bradfrost.com/chapter-2/)
- [Presentational and Container Components — Medium, Dan Abramov](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)

## 관련 문서

- [[React-Application-Design|React application 설계]]
- [[React-Routing-and-Styling|React Router와 styling 경계]]
- [[React-Core-Mental-Model|React 핵심 멘탈 모델]]
- [[View-Model-Design|뷰모델 설계와 Server Driven UI]]
- [[Visual-Hierarchy|시각적 위계]]
