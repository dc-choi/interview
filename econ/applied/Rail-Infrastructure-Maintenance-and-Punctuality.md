---
tags: [econ, applied, infrastructure, public-investment, rail]
status: done
verified_at: 2026-11-17
category: "Economics"
aliases: ["철도 인프라 유지보수와 정시율", "Rail Infrastructure Maintenance and Punctuality", "인프라 유지보수 이연", "철도 정시율 지표"]
---

# 철도 인프라 유지보수와 정시율 읽기

공공 인프라는 새로 까는 투자와 이미 깐 자산을 유지하는 투자로 나뉜다. 유지보수가 밀리면 고장과 지연이 쌓이고, 뒤늦게 투자를 늘리면 공사 자체가 한동안 운행을 더 막을 수 있다. 철도는 이 과정을 정시율, 투자액과 망 구성 지표로 관측할 수 있는 사례다.

## 1. 유지보수 이연의 mental model

다음은 이 문서의 해석이며 특정 국가의 예산 결정을 실증한 결과가 아니다.

- **비용과 결과의 시차**: 유지보수를 줄인 해에는 운행이 바로 멈추지 않는다. 비용 절감은 당장 보이고, 노후화의 대가는 몇 년 뒤 고장, 지연과 사고 위험으로 나타난다. 그래서 재정이 빠듯할 때 신규 사업보다 눈에 덜 띄는 유지보수가 먼저 줄어들기 쉽다.
- **누적되는 부채**: 미뤄 둔 정비는 사라지지 않고 쌓인다. 회계상 부채로 잡히지 않아도, 나중에 한꺼번에 처리해야 하는 일감이라는 점에서 소프트웨어의 기술 부채와 비슷하다.
- **회복의 비용**: 쌓인 정비를 따라잡으려면 선로를 막고 공사해야 하므로, 투자 확대 초기에는 서비스 지표가 오히려 나빠질 수 있다. 아래 독일 사례에서 DB는 이 경로로 정시율 하락을 설명한다.

## 2. 정시율은 정의부터 확인한다

같은 정시율이라도 기준 시간, 측정 지점과 제외 대상에 따라 값이 달라진다.

- **집계 단위와 기준 시간**: Deutsche Bahn(DB) 공개 페이지의 운행 정시율은 모든 중간 정차와 종착 정차 가운데 예정 도착 시각보다 6분 미만(5분 59초까지) 늦은 정차의 비율이다(2026-11-17 확인, 월별 값의 최신은 2026년 10월). 열차 단위가 아니라 정차 단위다. 2012년 DB 설명 자료는 도착이나 출발 기준으로 측정 지점 한 곳에서라도 한도를 넘으면 정시가 아닌 열차로 센다고 적었으므로, 같은 회사의 정시율도 시기별 산정 방식을 확인한다.
- **연간 값**: DB 2026-03-27 실적 발표에 따르면 2025년 DB 장거리 열차의 60.1%가 목적지에 정시 도착해 2024년 62.5%보다 낮아졌다. 발표는 이 연간 값의 산정 방식을 밝히지 않아, 위의 정차 단위 정의로 계산했는지는 확인하지 못했다.
- **취소 열차의 처리**: 운행 정시율이 취소된 열차를 어떻게 다루는지는 DB 공개 페이지에서 확인하지 못했다. 같은 페이지는 장거리 운영사(DB Fernverkehr)에 한해 승객 기준 정시율(Reisendenpünktlichkeit)도 싣는데, 예약한 목적지에 예정보다 14분 59초 이내로 도착한 승객의 비율을 연결 성공과 실패, 운행 취소와 대체 열차를 반영해 계산한다. 운행 취소가 늘 때는 운행 정시율만 보지 않고 승객 기준 지표와 취소 규모를 함께 본다.
- **원인 구성**: DB의 2012년 자료는 지연 영향이 운영사, 인프라와 외부 요인에서 대략 3분의 1씩 온다고 설명했다. 이후의 원인별 비율은 DB 1차 자료에서 확인하지 못했으므로, 지연의 몇 퍼센트가 인프라 때문이라는 수치는 출처와 연도를 따로 확인한다.

기준 시간은 나라와 운영사마다 다를 수 있으므로 국가 간 정시율을 그대로 비교하지 않는다. 장거리와 전체 열차, 연간과 일부 기간의 값도 구분한다.

## 3. 투자를 늘려도 지표는 늦게 회복된다

DB의 2026-03-27 실적 발표는 2025년 총투자를 약 220억 유로, 그중 인프라에 약 190억 유로로 적고, 2026년에는 연방정부와 DB가 인프라에 230억 유로 이상을 투자한다고 밝혔다. 같은 발표는 기록적인 인프라 투자 등에 따른 많은 공사 구간이 2025년 정시율을 끌어내렸고, 노선 전면 개량(Generalsanierung)을 2036년까지 늘려 잡은 것도 인프라 상태와 정시율의 회복을 늦춘다고 밝혔다.

DB의 2025-09-09 발표에 따르면 연방정부는 인프라 특별기금의 기간에 맞춘 전면 개량 일정을 확정했다. 2026년과 2027년에 각각 4개 노선, 2028년부터 2036년까지 약 29개 노선을 순차 개량한다. 독일 철도에 배정된 특별기금 총액은 정부 1차 자료로 확인하지 못했다.

DB의 설명에 따르면 이 사례에서는 투자액 증가와 서비스 개선 사이에 시차가 있다. 투자 발표를 볼 때는 공사로 막히는 구간과 기간, 대체 운행 계획, 개량이 끝난 구간의 지표를 따로 확인한다.

## 4. 망 구성 지표: 전기화와 고속철도

Eurostat의 철도 노선 통계(rail_if_line_tr)에서 전기화 노선 길이를 전체 노선 길이로 나눈 비율이다. 비율은 공표된 길이(km)로 계산한 값이다.

| 지역 | 연도 | 전기화 비율(계산) |
|---|---|---|
| EU 27개국 | 2024 | 약 57.7% (Eurostat 뉴스는 57.6%로 표기) |
| 이탈리아 | 2024 | 약 72.7% |
| 스페인 | 2024 | 약 67.3% |
| 프랑스 | 2024 | 약 61.0% |
| 독일 | 2021 | 약 54.6% (2022~2024 값 없음) |
| 영국 | 2024 | 약 39.0% |

전기화 비율이 낮다는 사실만으로 노후하다고 단정하지 않는다. 운행 밀도가 낮은 지선은 전기화 비용 대비 효과가 작을 수 있다.

**고속철도 길이.** Eurostat은 설계속도 250km/h 이상의 노선을 고속철도로 집계하며, 2023년 자료에서 스페인 3,190km, 프랑스 2,748km, 독일 1,163km, 이탈리아 1,097km로 스페인이 EU에서 가장 길다. 중국 국가철도그룹은 14차 5개년 계획 기간(2021~2025)에 고속철도 운영 거리가 3.79만km에서 5.04만km로, 전체 철도망이 14.63만km에서 16.5만km로 늘었다고 밝혔다(신화통신 보도). 중국 수치의 고속철도 정의가 Eurostat과 같은지는 확인하지 않았으므로 두 값을 같은 기준의 비교로 쓰지 않는다.

다음은 이 문서의 해석이다. 망을 늦게 깔면 처음부터 최신 설계를 쓸 수 있지만, 이후 유지보수 투자가 따라가지 않으면 같은 노후화 경로를 밟을 수 있다. 새 망이라는 사실만으로 안전과 정시성을 판단하지 않고 개통 이후의 유지보수 투자와 운행 지표를 함께 본다.

## 5. 점검 질문

- 이 정시율은 몇 분 기준이며, 취소와 중도 운행 중단을 어떻게 처리하는가?
- 투자 발표액은 신규 건설과 유지보수 중 어디에 얼마인가? 공사로 막히는 구간과 기간은 공개됐는가?
- 지표 악화가 노후화 때문인가, 개량 공사 때문인가? 같은 기간 공사 구간 수를 함께 보는가?
- 국가 간 비교에서 통계의 연도, 정의와 노선 범위가 같은가?

## 출처

- [Deutsche Bahn, Pünktlichkeitswerte](https://www.deutschebahn.com/de/konzern/konzernprofil/zahlen_fakten/puenktlichkeitswerte-1187696) — 정차 단위 운행 정시율과 승객 기준 정시율의 정의, 월별 값, 2026-11-17 확인
- [Deutsche Bahn, Themendienst Pünktlichkeit](https://www.deutschebahn.com/resource/blob/1170754/fba6b918410fff5a6640bcab87205c52/Themendienst-Puenktlichkeit-data.pdf) — 2012년 4월 설명 자료, 측정 지점 기준과 지연 원인의 대략적 구성
- [Deutsche Bahn: Schritt nach vorn bei Umsatz und operativem Ergebnis — Deutsche Bahn](https://www.deutschebahn.com/resource/blob/13792052/bdef59b876537ee9fb47f0e2c59f9270/DB-Presseinformation-Bilanz-2025-data.pdf) — 2026-03-27 발표, 2025년 장거리 정시율 60.1%, 투자액, 공사 구간과 정시율의 관계
- [Generalsanierung: Bund bestätigt mit der Branche abgestimmten neuen Zeitplan der DB InfraGO AG — Deutsche Bahn](https://www.deutschebahn.com/de/presse/pressestart_zentrales_uebersicht/Generalsanierung-Bund-bestaetigt-mit-der-Branche-abgestimmten-neuen-Zeitplan-13507196) — 2025-09-09 발표, 연도별 개량 노선 수
- [Eurostat, Length of railway lines by number of tracks and electrification of lines (rail_if_line_tr)](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/rail_if_line_tr) — API 원본 데이터, 전기화 노선과 전체 노선 길이, 2026-11-17 조회
- [41% of EU railway lines have 2 or more tracks — Eurostat](https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260309-1) — 2026-03-09 뉴스, 2024년 EU 전기화 비율 57.6%
- [EU high-speed rail lines grew to 8 556 km in 2023 — Eurostat](https://ec.europa.eu/eurostat/de/web/products-eurostat-news/w/ddn-20250206-1) — 2025-02-06 뉴스, 고속철도 정의와 2023년 국가별 노선 길이
- [全国铁路营业里程达到16.5万公里 — 新华社](https://www.news.cn/politics/20260104/007d178b02bd4566a65b777f8c8e2e5a/c.html) — 2026-01-04 보도, 국가철도그룹 업무회의 발표 인용, 14차 5개년 계획 기간의 고속철도와 전체 철도망 증가

## 관련 문서

- [[Reading-Economic-Indicators|경제지표 캘린더 읽는 법]] — 지표의 정의와 개정치를 먼저 확인하는 원칙
- [[Hidden-Infrastructure-Markets|보이지 않는 B2B 인프라 시장]] — 인프라 수요와 장기 계약 구조
- [[General-Purpose-Technology-Productivity|범용 기술의 생산성 지연과 J커브]] — 기존 설비 위에 새 기술을 얹을 때의 지연
- [[Economics-Systems-Mapping|경제와 분산시스템 매핑]]
