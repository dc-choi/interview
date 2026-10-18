---
tags: [palantir, workshop, ontology, application, action, event, authorization]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Workshop Applications", "팔란티어 워크숍 애플리케이션"]
---

# Palantir Workshop의 업무 애플리케이션

Workshop은 Ontology 객체를 읽고 사용자의 판단과 Action을 연결하는 업무 앱 구성 도구다. 객체와 관계는 데이터, variables는 화면 상태와 계산, widgets는 표현과 입력, events는 상호작용을 담당한다. 업무 쓰기는 Action으로, 객체 기반 계산은 Function으로 연결한다. [Workshop overview](https://www.palantir.com/docs/foundry/workshop/overview)

2026-10-16 공식 문서 대조 기준이며 실제 앱의 권한, 데이터 반영과 성능을 시험한 결과는 아니다. 아래 업무 예시는 설명을 위한 설계다.

## Object set에서 업무 변경까지 연결한다

고장 신고 처리 앱을 만든다면 다음과 같이 구성할 수 있다.

| 단계 | 구성 | 의미 |
|---|---|---|
| 조회 대상 | 미처리 신고 Object set | 어떤 업무 객체를 다룰지 결정 |
| 탐색 | 상태/위치 필터와 Object Table | 대상 목록 축소 |
| 선택 | 선택 신고를 담는 variable | 상세와 계산의 공통 입력 |
| 계산 | Function-backed variable | 유사 사례 수나 추천 결과 표시 |
| 상호작용 | 버튼과 Action form | 담당자와 처리 사유 입력 |
| 변경 | 담당자 배정 Action | 서버의 조건에 따라 객체 변경 |
| 후속 화면 | 제출 성공 이벤트 | 필요한 변수 재계산과 다음 화면 이동 |

단순한 화면 필터와 영속적인 업무 상태를 나눠야 한다. 선택한 행을 바꾸는 것은 앱 상태 변경이며 담당자 배정은 Ontology 변경이다. Workshop의 Action은 생성, 수정, 삭제와 링크 연결 같은 업무 변경을 재사용한다. [Actions](https://www.palantir.com/docs/foundry/workshop/actions-overview)

## Variables는 화면의 데이터 흐름을 정의한다

Object set variable은 타입이나 다른 object set에서 시작해 속성 필터와 관계 탐색으로 범위를 정한다. 집계, object property, Function과 variable transformation 등으로 다른 변수 값을 계산할 수 있다. Variable lineage graph는 변수와 위젯의 의존 관계를 보여 준다. [Variables](https://www.palantir.com/docs/foundry/workshop/concepts-variables)

변수는 보이는 widget이나 필요한 의존값이 요구할 때까지 계산을 미룰 수 있다. 숨긴 탭의 계산을 늦출 수 있지만 layout visibility를 계산하는 등 숨겨진 상태에도 값이 필요하면 계산될 수 있다. 따라서 화면 숨김을 데이터 접근 차단이나 함수 미실행 보장으로 취급하지 않는다.

계산값의 재계산 시점은 자동, 이벤트 시점 등 지원 설정에 따라 정한다. 자주 바뀌는 선택값에 비싼 함수를 연결하면 사용자 조작마다 비용이 생길 수 있다. 의존성과 갱신 필요성을 함께 확인한다.

## 이벤트 순서는 계산 완료 대기를 뜻하지 않는다

Geopoint/geoshape variable은 string cast, 위도/경도 추출, geohash/MGRS 변환으로 지도 입력과 표시를 연결한다. Pivot의 stacked row grouping, banded row나 header 색은 표현 설정이며 object set의 인가/집계 정의를 바꾸지 않는다. Object List drag order도 primary-key array로 보관하는 화면 상태이며 Action으로 따로 저장하지 않으면 영속적인 업무 순서가 아니다. 아래 항목은 2025년 8~9월 추가 기능의 상태/표현 경계다.

Events는 설정한 순서대로 실행되지만 앞 이벤트가 유발한 downstream 계산이 끝날 때까지 기다리지 않는다. Set variable value는 현재 source 값을 target에 즉시 복사하므로 다음 이벤트는 바뀐 target을 보지만 그 target에 의존하는 다른 변수는 아직 이전 값일 수 있다. [Events](https://www.palantir.com/docs/foundry/workshop/concepts-events)

예를 들어 `선택 신고 변경 → 추천 담당자 재계산 → 추천값을 입력에 복사`를 같은 클릭에 연속 연결하면 마지막 복사가 이전 추천값을 사용할 수 있다. 문서는 downstream 갱신 완료를 강제로 기다리는 기능을 지원하지 않으며, 이런 의존이 필요하면 별도의 사용자 이벤트로 나누도록 안내한다.

Action 후 이동이나 새로고침은 일반 클릭 순서에 기대지 않고 제출 lifecycle에 연결한다. Workshop은 제출 시작과 제출 성공 시점의 이벤트를 제공한다. [Action lifecycle events](https://www.palantir.com/docs/foundry/workshop/actions-use)

## Action form의 기본값과 서버 인가는 다르다

Action 정의에서 form이 생성되고, Workshop variable을 Action 파라미터의 기본값으로 연결할 수 있다. 선택된 신고를 대상 객체로 채우고 담당자와 사유를 입력받는 구성이 이에 해당한다. 기본값을 설정한 필드는 Visible, Hidden 또는 Disabled로 표시할 수 있다. [Use Actions in Workshop](https://www.palantir.com/docs/foundry/workshop/actions-use)

Hidden과 Disabled는 이 form의 표시와 편집 경험을 제어한다. 다른 앱이나 API에서도 제출될 수 있는 Action의 인가를 대신하지 않는다. 누가 어떤 대상 상태에서 배정할 수 있는지는 Action 제출 조건과 데이터 권한으로 검사한다. 이 구분은 UI 설정과 서버 실행 계약에서 도출한 설계 원칙이다. 서버 권한의 자세한 계약은 [[Palantir-Actions-and-Functions]]에서 다룬다.

## Function-backed variable은 조회와 계산 경로다

함수는 지표, 복잡한 object set과 Function-backed Action에 재사용한다. Metric Card의 수치를 함수로 계산하는 것과 함수를 통해 객체를 변경하는 것은 다른 사용 경로다. 후자는 Action으로 연결한다. [Functions on objects](https://www.palantir.com/docs/foundry/workshop/functions-overview)

Function-backed variable은 입력을 함수에 매핑하고 반환값을 위젯에 표시한다. 함수 선택에는 release version 태그가 필요하다. 같은 입력의 결과는 캐시될 수 있으므로 원천 데이터 변경 뒤 같은 입력으로 다시 열었다는 이유만으로 재계산을 가정하지 않는다. 필요한 recompute 동작과 이벤트를 설정한다. [Use functions in Workshop](https://www.palantir.com/docs/foundry/workshop/functions-use)

서버에서 필터와 집계를 수행할 수 있으면 전체 객체를 가져와 메모리에서 세기보다 필요한 결과만 반환하는 편이 적합하다. 이는 공식 예제의 v1과 v2/Python 비교에서 설명한 성능 접근이며 모든 언어의 한계를 동일시하는 규칙은 아니다.

Outbound OAuth가 필요한 함수는 Workshop에서 직접 호출할 때 대화형 인증창을 띄울 수 없어, 사용자가 아직 승인하지 않았다면 실패할 수 있다. 인증창이 필요하면 Function-backed Action으로 감싸는 경로를 사용한다. 이것을 일반 함수에 쓰기 권한이 자동 부여된다는 뜻으로 해석하지 않는다.

## 모듈 접근과 업무 자원 접근을 따로 확인한다

기본적으로 모듈을 열려면 Viewer, 편집하려면 Editor와 해당 Organization/Marking 조건이 필요하다. 모듈을 열 수 있다는 사실이 안의 객체, Action과 Function 사용을 허용하지는 않는다. 이들은 별도 권한을 갖는다. Check access 패널은 모듈과 추가 자원 요구를 확인하는 도구다. [Permissions in Workshop](https://www.palantir.com/docs/foundry/workshop/concepts-permissions)

행/열 정책은 사용자가 읽는 값을 제한하지만 export, Action 쓰기와 downstream 함수까지 같은 필터를 전파하지 않는다. 목적지와 로그에 필요한 보안도 설계한다. Button 숨김과 서버 호출 거부를 서로 다른 검증 대상으로 두는 이유다.

## Module interface는 모듈 사이의 상태 계약이다

Core Object View는 object type 생성 뒤 prominent property의 base type에 맞는 media/time-series/map과 standard property/link 탐색을 기본 제공한다. 2026년 2월 GA에서 custom view를 만든 뒤에도 core/custom을 전환할 수 있었다. 자동 생성 화면의 완전한 layout과 사용자가 볼 수 있는 데이터 범위는 별개다.

Markdown text input은 rich/raw 표시를 바꿔도 output string에 Markdown을 저장한다. Saved color는 참조하는 section/page 전체에 적용되고 background 밝기에 따라 widget theme이 바뀐다. 2026년 2월 추가된 표현 기능이므로 string의 후속 렌더링과 소비 화면을 함께 확인한다.

Module interface는 외부에 노출한 variables의 집합으로 부모 모듈 매핑과 URL 초기화에 사용한다. 여러 object type의 공통 속성과 링크를 정의하는 Ontology interface와 다른 개념이다. 변수에 external ID를 주고 module interface를 활성화해 노출한다. [Module interface](https://www.palantir.com/docs/foundry/workshop/module-interface)

부모와 자식이 interface variable을 매핑하면 부모의 변수 정의가 사용되고 자식의 정의는 무시된다. 자식 이벤트가 공유값을 바꿔 다른 모듈이 반응할 수 있다. 따라서 단순 입력 복사인지 공유 상태인지 먼저 구분한다.

URL 파라미터는 모듈을 처음 로드할 때 값을 초기화한다. 로드 후 URL 문자열을 바꾸는 것만으로 변수 값이 동적으로 바뀌지는 않는다. 런타임 변경에는 events를 사용한다. External ID와 전달 타입을 바꾸면 기존 링크와 embedding 호출부에 영향이 있는지 확인한다. 마지막 문장은 인터페이스 계약에서 도출한 변경 점검이다.

## 저장한 버전과 사용자가 보는 버전을 구분한다

Saved version과 published version은 다를 수 있다. 사용자는 publish한 안정 버전을 보고 개발자는 별도 저장을 이어갈 수 있지만 Automatically publish when saving을 켜면 저장이 곧 발행이다. Revert는 과거 이력을 지우는 작업이 아니라 과거 내용을 새 최신 버전으로 저장한다. [Publishing and versioning](https://www.palantir.com/docs/foundry/workshop/versions)

적용 시에는 다음을 나눠 시험한다. 아래는 실행 권고이며 현재 통과 기록이 아니다.

- 허용/거부 사용자에게 모듈, 객체 조회와 Action 제출이 각각 기대대로 동작하는가?
- 변수 의존 계산 중 빠른 연속 클릭이 이전 값의 제출로 이어지지 않는가?
- 성공 후 재계산이 실제 변경을 표시하고 실패 후에도 성공 화면으로 이동하지 않는가?
- 부모/자식 모듈 매핑과 기존 URL이 발행 버전에서도 유효한가?
- UI 버전과 호출한 함수/Action 버전이 대응하는가?

Workshop usage metrics는 successful Action submission과 layout view의 aggregate count이며 특정 user의 activity로 귀속하지 않는다. 2026년 3월 Action count는 기본 제공, page/tab/overlay는 granular metrics opt-in 후 최대 24시간이 필요했고 Main의 view mode에서만 수집했다. 7/30/90일 창의 이전 동기간 비교를 unique user, 실패율이나 모든 branch 사용량으로 해석하지 않는다.

Property security pill은 정보 표시이며 숨겨도 서버 policy 평가는 유지된다. 2026년 5월 Object/Property List와 Object Table 지원에서 property의 낮은 classification만 보이더라도 object의 높은 classification 접근이 필요할 수 있었다. Pill의 문구를 사용자의 전체 접근 요구 목록으로 해석하지 않는다.

Variable lineage의 expand/collapse/clear와 undo/redo는 graph 탐색 상태다. 2026년 6월 표시의 page/overlay legend는 보이는 node만 포함하므로 목록 부재로 미사용을 확정하지 않는다. Per-variable computation time으로 비싼 재계산과 upstream 변경을 조사하되 graph를 지우는 동작과 실제 변수 삭제를 구분한다.

Widget mount와 unmount는 독립 설정이다. 2026년 7월 eager mount는 초기 load를 늘려 다음 화면을 준비하고 Never unmount는 custom iframe의 local state를 유지하는 대신 session memory를 사용했다. Delay until on-screen/Unmount when off-screen과 layout 기본값도 구분한다. 광범위하게 유지하기 전 profiler로 재방문 latency와 browser memory를 비교하며 숨김을 인가 경계로 사용하지 않는다.

Interface-based Object Set은 공통 property/link를 기준으로 필터/탐색하고 새 implementing type을 같은 workflow에 포함한다. 2026년 10월 core widget 지원에서 미지원 widget는 implementing object type 기반 property 선택으로 fallback했다. Map/Pivot/Gantt 확대는 당시 계획이었다. 지원 알림과 각 widget의 property binding을 확인하며 module interface와 구분한다.

## 출처

- [Palantir, Workshop overview](https://www.palantir.com/docs/foundry/workshop/overview)
- [Palantir, Variables](https://www.palantir.com/docs/foundry/workshop/concepts-variables)
- [Palantir, Events](https://www.palantir.com/docs/foundry/workshop/concepts-events)
- [Palantir, Actions overview](https://www.palantir.com/docs/foundry/workshop/actions-overview)
- [Palantir, Use Actions in Workshop](https://www.palantir.com/docs/foundry/workshop/actions-use)
- [Palantir, Functions on objects](https://www.palantir.com/docs/foundry/workshop/functions-overview)
- [Palantir, Use functions in Workshop](https://www.palantir.com/docs/foundry/workshop/functions-use)
- [Palantir, Permissions in Workshop](https://www.palantir.com/docs/foundry/workshop/concepts-permissions)
- [Palantir, Module interface](https://www.palantir.com/docs/foundry/workshop/module-interface)
- [Palantir, Publishing and versioning](https://www.palantir.com/docs/foundry/workshop/versions)
- [Palantir, August 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-08)
- [Palantir, September 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-09)
- [Palantir, February 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-02)
- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)
- [Palantir, May 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-05)
- [Palantir, June 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-06)
- [Palantir, July 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-07)
- [Palantir, October 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-10)

## 관련 문서

- [[Palantir-Operational-Ontology|업무 Ontology]]
- [[Palantir-Actions-and-Functions|Action과 Function 실행 계약]]
- [[Palantir-Security-and-Governance|보안과 거버넌스]]
- [[Palantir-AIP-Logic-and-Evaluation|AIP Logic과 평가]]
