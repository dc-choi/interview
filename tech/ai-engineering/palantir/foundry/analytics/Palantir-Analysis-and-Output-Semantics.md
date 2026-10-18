---
tags: [palantir, analytics, contour, quiver, reporting]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 분석 도구와 결과물"]
---

# Foundry 분석 도구와 결과물의 의미

분석 도구는 데이터의 형태, 반복할 계산과 결과를 소비할 업무로 고른다. Dataset 중심의 탐색과 Ontology의 현재 객체를 조작하는 업무는 결과를 저장하고 공유하는 의미가 다르다.

## 분석과 운영 앱의 경계

| 목적 | 도구와 선택 조건 |
|---|---|
| Tabular dataset 탐색 | Contour의 시각적 변환, 집계와 차트 |
| 객체 탐색과 집합 선택 | Object Explorer의 필터와 Object Set |
| Ontology와 시계열의 대화형 분석 | Quiver의 분석 카드, 시각화와 Action 연결 |
| Python/R/SQL 탐색과 모델 실험 | Code Workbook, 지속적인 개발 환경은 Code Workspaces |
| 업무별 화면과 여러 단계의 쓰기 | Workshop과 Ontology Action |

Contour와 Code Workbook에서 분석을 dataset으로 저장할 수 있다. 다만 운영 파이프라인은 Code Repositories의 버전 이력, branch, review와 check, incremental 계산을 고려한다. 탐색에서 한 번 성공한 계산을 그대로 운영 계약으로 간주하지 않는다.

Code Workbook의 계산 결과는 기본적으로 persist되지 않는다. 저장된 dataset과 메모리상 계산 결과는 후속 앱 접근과 다운로드 조건이 다르다.

## Object Set은 값의 snapshot이 아니다

Static Object Set은 선택한 primary key 목록을 보존한다. Dynamic Object Set은 필터 조건을 보존하므로 현재 데이터에서 조건에 맞는 객체가 바뀐다. Static도 객체의 모든 property 값을 동결한 snapshot이라는 뜻은 아니다. 보고서를 재현해야 한다면 집합의 멤버십과 값의 기준 시점을 별도로 정한다.

재사용 단위도 도구마다 다르다. Contour는 saved expression을, Quiver는 여러 카드를 묶은 visual function을, Code Workbook은 입력을 바꿔 실행할 template을 제공한다. 반복 계산을 추출할 때 호출자가 바꿀 입력과 고정할 논리를 구분한다.

## Dashboard, 보고서와 파일 export

Contour dashboard는 차트, 필터와 parameter를 공유하고 PDF로 내보낼 수 있다. Quiver dashboard는 읽기 화면에서도 상호작용할 수 있고 Object View, Workshop, Notepad와 Carbon에 넣을 수 있다. 자체 웹 UI가 필요하면 Code Workspaces의 Dash, Streamlit이나 Shiny 같은 경로를 검토한다.

Notepad는 분석 결과의 live/static embed와 설명을 결합한 보고서에 적합하다. Notepad 자체에서 분석 차트를 만드는 것은 아니다. Reports는 sunset 상태로 기존 보고서를 읽을 수 있지만 편집이 필요하면 Notepad로 이전하는 경로를 사용한다. 기존 보고서를 단순히 읽기 위해 모두 전환해야 한다는 뜻은 아니다.

확인일의 export 조건은 다음과 같다.

- Contour의 CSV/XLSX export는 최대 100,000행이다.
- Code Workbook의 CSV 다운로드는 persisted 결과를 대상으로 하며 기본 한도는 100,000행이다. Unpersisted 결과는 다운로드할 수 없다.
- Contour, Quiver와 Code Workbook은 차트를 이미지로 내보내는 경로가 있다. Notepad는 보고서 PDF에 적합하다.
- 일반 분석 안내의 Quiver aggregate 예시는 최대 50,000행을 다룬다. 다른 작업이나 backend의 모든 한도를 대표하는 숫자로 확대하지 않는다.

Quiver는 2023년 10월 Dataset/Materialization 경로를 추가해 Transform Table의 50,000행 join/transform 한도를 넘는 분석을 제공했다. Object Set을 dataset card로 변환하고 expression/window function과 join을 수행할 수 있다. 따라서 50,000행을 Quiver 전체의 한도로 읽지 않는다. Backing datasource와 계산 경로도 함께 확인한다.

외부 파일은 Foundry의 지속적인 권한 검사와 최신 데이터 조회를 벗어난 복사본이 된다. 공유 목적이 현재 상태의 상호작용인지, 특정 시점의 전달인지에 따라 앱 링크와 파일을 선택한다.

## 모델도 관리되는 분석 자산이다

Jupyter restricted outputs mode는 Restricted View를 임의 Python으로 분석하는 대신 dataset/model/telemetry log 등 artifact의 publish를 막는 경계다. 2025년 10월 안내에서는 toggle 변경에 restart가 필요하고 끌 때까지 유지됐다. `containers_sql`/magic의 Spark SQL 결과를 PyArrow로 받아 처리한다. Dash/Streamlit 배포도 사용자별 별도 app interface와 해당 사용자 권한으로 읽는다. 공용 website의 shared data cache와 같은 전제로 설계하지 않는다.

Foundry의 model은 추론 코드가 든 container만 가리키지 않는다. 계산 논리, lineage, version, security와 branch를 관리하는 자산이다. 실험 결과를 모델로 운영할 때는 학습 데이터, 실행 환경과 소비 앱의 계약까지 연결한다.

Insight workbook는 Filter/Link/Transform card로 분석 path를 만들고 단계를 끄거나 켜며 Object Set으로 publish한다. 2026년 3월 GA는 link traversal과 SQL의 link 없이 다른 type join을 구분하고 Action으로 create/update/delete하는 경로도 제공했다. Workbook 공유, published set의 동적 멤버십과 Action 실행 인가는 별개다.

## 출처

- [Palantir, Analytics overview](https://www.palantir.com/docs/foundry/analytics/overview)
- [Palantir, Types of analysis](https://www.palantir.com/docs/foundry/analytics/types-of-analysis)
- [Palantir, Datasets and object sets](https://www.palantir.com/docs/foundry/analytics/datasets-object-sets)
- [Palantir, Reusable logic](https://www.palantir.com/docs/foundry/analytics/reusable-logic)
- [Palantir, Dashboards](https://www.palantir.com/docs/foundry/analytics/dashboards)
- [Palantir, Reporting](https://www.palantir.com/docs/foundry/analytics/reporting)
- [Palantir, Exporting outputs](https://www.palantir.com/docs/foundry/analytics/exporting-outputs)
- [Palantir, Models](https://www.palantir.com/docs/foundry/analytics/models)
- [Palantir, October 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-10)
- [Palantir, October 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-10)
- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)

## 관련 문서

- [[Palantir-Foundry-Analytics|분석과 외부 BI 연결]]
- [[Palantir-Operational-Ontology|운영 Ontology]]
