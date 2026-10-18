---
tags: [palantir, foundry, quiver, dashboard, embedding, security]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Quiver 대시보드, 임베딩과 권한 전파"]
---

# Quiver 대시보드, 임베딩과 권한 전파

Quiver dashboard는 분석 결과를 read-only interactive view로 제공한다. Publish하면 분석에 의해 뒷받침되는 별도 Foundry resource가 생기며 분석도 저장된다. 분석의 Save, dashboard republish와 consumer의 version 선택은 다른 단계다.

## 구성, 버전과 권한

Dashboard는 분석에 여러 개 만들 수 있고 여러 canvas의 카드를 모을 수 있다. Dashboard에서 카드를 제거해도 분석에서 삭제되지는 않는다. 일반 row에는 최대 세 카드를 나란히 두고 parameter/metric cell은 여러 항목을 함께 담을 수 있다. Top-level tab은 페이지를 나누며 card tab은 chart 전환용이다.

Default는 report식 여백, compact는 가로 폭, stretch는 가로/세로 크기를 container에 맞춘다. Inactive tab은 렌더링/query를 줄이므로 큰 dashboard를 분리할 수 있다. 숨김이나 탭 분리를 보안 제어로 사용하지 않는다.

Publish resource는 저장 folder의 권한을 상속한다. Viewer는 dashboard를 볼 수 있다. 편집과 republish에는 dashboard와 backing analysis 양쪽의 Editor/Owner 권한이 필요하다. Dashboard editor 권한만 있으면 share는 가능해도 analysis를 저장해야 하는 republish는 할 수 없다.

Publish/republish마다 version이 생긴다. Consumer는 고정 version 또는 auto-update를 고를 수 있다. 최신 version을 자동 사용하면 같은 embedded app에서도 내용이 바뀔 수 있으므로 입력 schema와 결과 해석의 호환성을 확인한다. Published dashboard를 다른 analysis의 card로 import해 재사용할 수 있다.

## Read-time 제어의 경계

Restricted view, object/property security policy 등 row/column control은 viewer가 읽을 때 보이는 내용을 filter한다. 이 제어는 card export, screenshot과 downstream visual function output까지 그대로 연장되지 않는다. Downstream 데이터에도 보호가 필요하면 marking/Classification-based Access Control을 함께 구성해야 한다.

Dashboard Viewer 권한과 원천 데이터 제어를 같은 권한으로 합쳐 생각하지 않는다. Export/공유 경로를 설계할 때 실제로 전파되는 제어와 read-time 필터를 나누어 검토한다. 이 문서는 권한을 런타임으로 시험하지 않았다.

## 임베딩은 typed I/O 계약이다

Dashboard editor에서 입력/출력으로 노출할 card, 이름과 default를 정한다. 이름을 바꾸거나 타입을 바꾸면 consumer mapping을 확인한다. Host마다 지원 타입이 다르다.

| Host | 주요 mapping/제약 |
|---|---|
| Workshop | Boolean→Boolean, number→numeric, time→timestamp/date, object/object set은 같은 종류. Time range는 start/end string, time series는 backing object로 전달 |
| Notepad | Boolean/number/string은 string, time은 ISO string, range는 `ISO - ISO` string, object/set 지원, time series 미지원 |
| Carbon | string/object/object type만 전달. Boolean/number/time은 string, object set은 object type. Time range/time series 미지원 |
| Legacy object view | 기준 object는 지정 input-name으로 전달. 추가 scalar는 string 또는 string-list 첫 값, range는 time/relative range filter, string list 지원. 추가 object/set/series는 미지원 |

String list는 Notepad/Carbon에서 JSON array 형태의 string으로 전달한다. Carbon의 값이 없는 parameter는 empty 또는 object set의 base object type으로 기본화된다. Carbon은 `DASHBOARD_VERSION`으로 고정 version을 설정할 수 있다. Legacy object view에서 stretch를 쓰면 widget height가 필요하며 없으면 0px가 될 수 있다.

Notepad는 카드 copy-paste와 dashboard widget embed가 다르다. 여러 metric/parameter를 묶은 cell은 copy하지 못한다. Embed는 print/PDF/DOCX와 point-in-time 데이터 고정에 사용할 수 있으므로 문서의 최신값/고정값 상태를 확인한다.

## Marketplace 호환성

Marketplace templating은 visible card뿐 아니라 upstream dependency chain도 검증한다. Unsupported card, supported card의 unsupported configuration, unexpected error를 구분한다. Validation이 통과한 version을 publish해 product에 포함한다. 단순 화면 preview가 package compatibility 검증을 대신하지 않는다.

Time-series measure는 지원하지 않으며 직접 sensor object를 쓰는 대안이 있다. Pivot 뒤에 transform table이 있으면 data-dependent column을 피하고 aggregation label을 stable/unique하게 둔다. Downstream Selected Object Set의 selection은 packaging 전에 clear된다.

Dataset column 이름은 installation에서 자동 remap되지 않는다. Rename to API names 설정에 따라 property API name 또는 backing dataset column name이 원본과 맞아야 하며 다른 object type 설치에서 실패할 수 있다.

Installed dashboard에서 analysis를 생성하면 visible cards와 upstream dependencies가 복사된다. 생성 analysis는 installed resource와 분리되어 양쪽 수정이 자동 연동되지 않는다. Deprecated canvas template는 기존 사용/편집을 계속 지원하지만 새 공유 구성에는 dashboard를 권장한다.

## 적용 점검

배포 전에 consumer mapping, version 고정/자동 갱신, 양쪽 편집 권한, source read-time control과 export 보호를 각각 확인한다. 화면이 정상 렌더링되었다는 사실은 데이터 권한 전파나 다른 enrollment의 Marketplace 설치를 증명하지 않는다.

## 출처

- [Palantir Quiver, Quiver / Detailed card index / Action button](https://www.palantir.com/docs/foundry/quiver/card-action-button)
- [Palantir Quiver, Quiver / Card references / Writeback](https://www.palantir.com/docs/foundry/quiver/cards-index-writeback)
- [Palantir Quiver, Quiver / Dashboards / Add to a Carbon workspace](https://www.palantir.com/docs/foundry/quiver/dashboards-carbon)
- [Palantir Quiver, Quiver / Dashboards / Create a dashboard](https://www.palantir.com/docs/foundry/quiver/dashboards-create)
- [Palantir Quiver, Quiver / Dashboards / Use a dashboard within an analysis](https://www.palantir.com/docs/foundry/quiver/dashboards-in-analysis)
- [Palantir Quiver, Quiver / Dashboards / Add Quiver dashboard to a Marketplace product](https://www.palantir.com/docs/foundry/quiver/dashboards-marketplace)
- [Palantir Quiver, Quiver / Dashboards / Add to a Notepad document](https://www.palantir.com/docs/foundry/quiver/dashboards-notepad)
- [Palantir Quiver, Quiver / Dashboards / Embed in an Object View](https://www.palantir.com/docs/foundry/quiver/dashboards-object-view)
- [Palantir Quiver, Quiver / Dashboards / Overview](https://www.palantir.com/docs/foundry/quiver/dashboards-overview)
- [Palantir Quiver, Quiver / Dashboards / Publish and share a dashboard](https://www.palantir.com/docs/foundry/quiver/dashboards-publish-share)
- [Palantir Quiver, Quiver / Dashboards / Embed in a Workshop module](https://www.palantir.com/docs/foundry/quiver/dashboards-workshop)
- [Palantir Quiver, Quiver / Dashboards / Convert a canvas template [Deprecated] to a dashboard](https://www.palantir.com/docs/foundry/quiver/templates-convert-to-dashboard)

## 관련 문서

- [[Palantir-Quiver]]
- [[Palantir-Quiver-Analysis-and-Versioning|Quiver 분석 그래프와 버전 관리]]
- [[Palantir-Quiver-Object-Sets-and-Charts|Quiver 객체 집합, 탐색과 차트의 정확도]]
- [[Palantir-Quiver-Transform-Tables-and-Datasets|Quiver transform table과 dataset의 계산 계약]]
- [[Palantir-Quiver-Formula-and-Value-Contracts|Quiver 수식, 값 변환과 빈값 계약]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation|Quiver 시계열 보간, 시간창과 집계]]
- [[Palantir-Quiver-Events-Ranges-and-Reference-Profiles|Quiver 이벤트, 시간 범위와 기준 프로파일]]
- [[Palantir-Quiver-Regression-and-Forecasting|Quiver 회귀, 예측과 분포 해석]]
- [[Palantir-Quiver-Functions-AIP-and-Vega|Quiver 재사용 함수, AIP와 Vega의 경계]]
