---
tags: [infrastructure, data-center, power, ups, redundancy, reliability, uptime-tier]
status: done
verified_at: 2026-11-09
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Data Center Power Distribution", "데이터센터 전력 공급", "UPS", "무정전 전원 장치", "Uninterruptible Power Supply", "Uptime Tier", "티어 등급", "A/B 전원 경로"]
---

# 데이터센터 전력 공급과 이중화

서버 전원 장치는 입력 전력이 끊긴 뒤 짧은 시간만 출력을 유지하도록 만들어지므로 그 자체로 정전을 버틴다고 보지 않는다(해석). 데이터센터가 외부 정전에도 서버를 켜 두려면 건물 안의 전력 경로 전체가 끊김 없이 이어지도록 설계해야 한다. 이 문서는 수전에서 서버까지의 경로, UPS 방식과 배터리, 발전기 연계, 이중 경로와 Uptime Institute의 티어 구분을 다룬다. 효율 지표 PUE와 냉각은 [[Data-Center-Cooling|데이터센터 냉각과 PUE]], 서버 단위의 UPS와 발전기 호환성은 [[GPU-Server-Infrastructure#정전 대응은 UPS와 발전기의 연결까지 확인한다|GPU 서버 인프라의 정전 대응]]을 따른다.

## 전력은 여러 단계를 거쳐 서버에 닿는다

전형적인 구조에서 외부 전력은 다음 순서로 서버까지 간다. 시설마다 단계 수와 이름은 다르다.

1. **수전 설비와 차단기:** 전력망에서 높은 전압으로 전기를 받아들이고, 사고가 나면 전류를 끊어 고장이 번지지 않게 한다.
2. **변압기와 배전반:** 높은 전압을 건물에서 쓰는 전압으로 낮추고 여러 회로로 나눈다.
3. **UPS:** 외부 전력이 끊기거나 흔들려도 그 뒤 부하에 전력을 계속 공급한다.
4. **PDU와 랙 PDU:** 서버실 분전반(PDU)이 랙별로 나누고, 랙 뒤의 랙 PDU가 서버 전원 장치마다 콘센트를 준다.
5. **서버 전원 장치(PSU):** 교류를 부품이 쓰는 낮은 전압의 직류로 바꾼다.

이 사슬의 어느 한 지점이 끊기면 그 아래에 매달린 서버가 모두 멈춘다. 그래서 설계는 각 단계를 이중화하는 일과, 이중화한 두 경로가 아래에서 다시 한 점으로 합쳐지지 않게 하는 일로 나뉜다(해석).

## UPS 방식은 전환 공백과 상시 변환 여부로 나뉜다

2026-11-09 Vertiv 설명 자료 대조 기준이다.

| 방식 | 동작 | 배터리로 넘어갈 때 |
|---|---|---|
| 대기형(standby) | 평소에는 입력 전력을 그대로 넘기다 정전이 나면 배터리로 전환한다 | 약 6~8ms의 공백 |
| 라인 인터랙티브 | 평소 전압을 조정하며 넘기다 정전이 나면 배터리로 전환한다 | 약 4~6ms의 공백 |
| 이중 변환 온라인 | 입력 교류를 정류기로 직류로 바꿔 배터리와 인버터에 공급하고, 인버터가 다시 교류를 만들어 부하에 보낸다 | 전환 공백이 없다. 입력이 끊기면 정류기가 빠지고 배터리가 인버터를 계속 먹인다 |

이중 변환 방식은 부하가 늘 인버터 출력을 받으므로, Vertiv는 배터리로 넘어갈 때 출력 전압의 변화가 없다고 적는다. 대신 전력을 두 번 변환하므로 변환 손실이 생기고 그 손실은 열이 된다(해석). 손실 비율은 제품과 운전 모드에 따라 다르므로 제품 사양의 효율 값으로 확인한다. Vertiv는 대기형 설명에서 UPS가 배터리로 전환하는 횟수가 많을수록 배터리 수명이 짧아진다고 적는다.

세 방식은 쓰이는 규모도 다르다. Vertiv는 대기형을 1,500VA 미만 장치에, 라인 인터랙티브를 대개 5,000VA 미만의 랙 장착 용도에 두고, 이중 변환 온라인을 대형 데이터센터 보호에 가장 흔한 방식으로 설명한다. 같은 자료는 이중 변환이 발전기 연계에 필요한 주파수 조정을 제공한다고 적는다.

### 배터리는 발전기까지 다리를 놓는 시간만큼 둔다

UPS 배터리는 정전 전체를 버티는 장치가 아니라 발전기가 전력을 낼 때까지 공백을 메우는 장치로 설계하는 경우가 많다(해석). 버티는 시간은 부하와 배터리 노후도에 따라 달라지므로 시설마다 몇 분이라고 고정하지 않는다. 근거는 [[GPU-Server-Infrastructure#정전 대응은 UPS와 발전기의 연결까지 확인한다|GPU 서버 인프라의 정전 대응]]의 Eaton 자료 대조를 따른다.

Schneider Electric의 2022-08-30 자료는 1MW UPS에 6분 런타임을 주는 예시로 VRLA(밸브 조절식 납축전지)가 11,340kg 이상, 리튬이온이 2,767kg이라고 적는다. 같은 자료는 VRLA의 사용 수명을 3~5년으로 보고 10년에 두 번 교체가 흔하다고 하며, 리튬이온은 10년 이상이라 교체가 적거나 없을 수 있다고 적는다. 이 수치는 한 조건의 예시이고 모든 구성의 비율이 아니다.

배터리실 자체도 장애 원인이 된다. 2022년 판교 데이터센터 화재에서는 리튬이온 배터리와 일부 UPS의 물리적 분리가 불완전해 화재 열기 등이 UPS에 영향을 준 것으로 추정됐다. 배터리 화학, 배터리실과 UPS실의 분리, 그 위를 지나는 전력선 배치를 함께 검토한다. 사례 경위는 [[DR-Strategy|DR 전략]]의 판교 화재 절을 따른다.

## 발전기와 두 갈래 경로

정전이 길어지면 발전기가 전력을 이어받고, 전환 스위치가 UPS 입력을 전력망 쪽에서 발전기 쪽으로 돌린다. 발전기가 켜져 있어도 출력 전압과 주파수가 UPS의 허용 범위를 벗어나면 UPS가 배터리를 계속 소모하므로, 발전기 연계는 시험으로 확인한다. 상세는 [[GPU-Server-Infrastructure#정전 대응은 UPS와 발전기의 연결까지 확인한다|GPU 서버 인프라의 정전 대응]]을 따른다.

UPS와 발전기가 있어도 전력 경로가 하나뿐이면 그 경로의 UPS, 배전반이나 스위치 하나가 단일 장애점(SPOF)이 된다. 그래서 중요 시설은 A 경로와 B 경로를 따로 깐다.

- **각 경로가 전체 부하를 감당해야 한다:** 한쪽이 고장이나 점검으로 꺼지면 남은 쪽이 모든 부하를 받는다. 평소 두 경로에 부하를 나눠 걸고 있다면 한쪽만으로 감당할 수 있는 수준인지 확인한다. 같은 판단 틀은 [[N-1-Capacity-Headroom|N-1 가용량 헤드룸]]을 따른다.
- **경로는 장비 끝까지 분리되어야 한다:** 전원 장치가 둘인 서버는 하나를 A 경로, 하나를 B 경로의 랙 PDU에 꽂는다. 두 코드를 같은 PDU나 같은 회로에 꽂으면 그 PDU 하나가 다시 단일 장애점이 된다. 코드와 PDU 확인은 [[Server-Quotation-Checklist|서버 견적 검토]]의 전원 코드 절을 따른다.
- **감지와 제어도 실제 경로 상태를 봐야 한다:** 두 전력 경로를 깔아도 전환을 판단하는 감지 입력과 제어 논리가 실제 차단기 위치와 경로 상태를 반영하지 않으면 이중화가 동작하지 않을 수 있다(해석). 2026년 10월 Google Cloud 런던 리전(europe-west2)의 europe-west2-b 영역 데이터센터 정전에서는 정비로 격리한 feed B 차단기의 상류에 저전압 감지가 배선되어 있었고 PLC 논리가 차단기 위치를 확인하지 않아, feed A가 끊겼을 때 두 PLC 모두 발전기 기동 명령을 내지 않았고 UPS가 소진된 뒤 데이터 홀 전체가 정전됐다. 상세는 [[N-1-Capacity-Headroom|N-1 가용량 헤드룸]]의 사례 절을 따른다.

## Uptime 티어는 시설 기반의 대비 수준을 나눈다

Uptime Institute의 Tier Classification System은 개별 장비가 아니라 시설 전체의 기반 구조를 네 단계로 나눈다. 2026-11-09 Uptime의 Tiers 페이지, Tier Certification 페이지와 분류 체계 해설(2021년 4월 갱신판) 대조 기준이다.

| 티어 | 이름 | 공식 설명의 핵심 |
|---|---|---|
| Tier I | Basic Capacity | IT 전용 공간, UPS, 전용 냉각과 정전용 엔진 발전기를 갖춘다. 예방 정비와 수리에 시설 전체를 멈춰야 하고, 용량이나 배전 장애가 시설에 영향을 준다 |
| Tier II | Redundant Capacity Components | 전력과 냉각의 핵심 구성 요소를 중복으로 둔다. Tiers 페이지는 구성 요소를 멈추지 않고 뺄 수 있다고 적지만 Certification 페이지는 정비에 시설 전체 중단이 여전히 필요하다고 적어 두 공식 페이지의 표현이 다르다. 분류 체계 해설이 Tier III에서 중복 전달 경로를 더한다고 적는 점에 비추면, Tier II는 중복 구성 요소를 멈추지 않고 뺄 수 있어도 하나뿐인 전달 경로의 정비에는 중단이 필요하다고 읽힌다(해석) |
| Tier III | Concurrently Maintainable | 전력과 냉각에 중복 전달 경로를 더한다. 모든 용량 구성 요소와 배전 경로를 계획에 따라 빼도 운영에 영향이 없다. 다만 장비 고장이나 운영자 실수에는 여전히 노출된다 |
| Tier IV | Fault Tolerant | 독립되고 물리적으로 격리된 여러 시스템을 둔다. 개별 장비 고장이나 배전 경로 중단이 IT 운영에 영향을 주지 않는다 |

해석할 때 다음을 구분한다.

- **정비 중 무중단과 고장 중 무중단은 다르다:** Tier III는 계획된 정비를 견디는 수준이고, 예기치 않은 고장을 견디는 것은 Tier IV의 정의다.
- **가용률 수치가 아니다:** Uptime은 2009년에 연간 예상 다운타임 언급을 모두 지웠고 2021년 해설 기준 Topology 표준은 티어에 가용률 예측을 붙이지 않는다고 적는다. 티어를 99.9%나 99.99% 같은 보장값으로 옮기지 않는다. Tiers 페이지는 Tier IV 데이터센터가 Tier II보다 낫다는 뜻이 아니라고도 적는다.
- **인증은 Uptime만 한다:** Uptime은 자신이 티어를 공식 인증할 수 있는 유일한 기관이라고 적고, 티어 준수를 주장하는 것과 실제 검토를 받는 것은 다르다고 적는다. 제안서의 티어 III 수준 같은 표현은 인증과 구분한다.
- **설계 인증과 시설 인증은 별개다:** TCDD(Tier Certification of Design Documents)는 설계 문서 전체를 검토해 설계가 목표 티어를 충족하는지 본다. TCCF(Tier Certification of Constructed Facility)는 현장 방문과 실제 전원 차단 시험으로 설계대로 지어졌는지 확인한다. 운영 조직의 절차와 위험은 별도의 Operational Sustainability 평가가 다룬다.

## 데이터센터 장애의 원인은 전력 설비가 앞선다

Uptime Institute의 2026-05-13 연례 장애 분석 발표는 전력이 영향이 큰 장애의 가장 큰 원인으로 남아 있고, 그중 UPS, 전환 스위치와 발전기가 얽힌 장애가 주를 이룬다고 적는다. 사이트당 장애 발생률은 5년 연속 줄었지만 개선 속도는 느려졌다. 공개 보고된 장애에서는 외부 기반 시설 장애가 더 두드러지고, 광통신과 연결 장애도 늘고 있다고 적는다. 분석은 Uptime의 설문, 회원과 파트너의 정보, 뉴스와 소셜 미디어 등에 공개 보고된 장애 자료를 모은 것이므로 모든 시설의 평균으로 일반화하지 않는다.

이 결과는 이중화를 넣은 장비 자체가 장애 지점이 될 수 있다는 점을 보여 준다(해석). 장비를 더하는 것과 별도로 전환 시험, 배터리 상태 점검과 정비 절차가 필요하다.

## 적용 점검

- 입주하거나 도입하려는 시설의 전력 경로에서 UPS, 배전반, PDU와 랙 PDU 중 하나만 고장 나도 서버가 멈추는 지점이 있는가?
- UPS가 이중 변환 방식인지, 예상 부하에서 배터리 지속 시간이 발전기 전환 시간보다 충분히 긴지, 그 값을 언제 시험했는가?
- 두 전원 장치를 서로 다른 경로의 PDU와 회로에 꽂았고, 한쪽 경로만으로 전체 부하를 감당하는가?
- 시설의 티어 표현이 Uptime 인증인지, 설계 인증인지 시설 인증인지, 자체 주장인지 확인했는가?
- 배터리 화학과 배터리실 분리, 화재 시 선별 차단 체계를 확인했는가?

## 출처

- [YouTube, 동국시스템즈 IT 채널, 데이터센터는 전기를 어떻게 감당하나? 정전에도 서버가 안 꺼지는 이유 (IT 인프라 기초 5-1)](https://www.youtube.com/watch?v=4GIXPT5vBCk) — 2026-10-29 공개(전사 메타데이터 기준) 강의로 이 문서의 계기다. 한전 공급 전압 구간, 발전기 기동 시간, 연료 보유 시간, 2025년 정부 데이터센터 화재와 2026 조사의 PUE, 랙 밀도 수치는 이번 대조에서 1차 출처로 확인하지 못해 옮기지 않았다
- [Uptime Institute, Tiers](https://uptimeinstitute.com/tiers)
- [Uptime Institute, Tier Certification](https://uptimeinstitute.com/tier-certification)
- [Explaining the Uptime Institute's Tier Classification System (April 2021 Update) — Uptime Institute Journal](https://journal.uptimeinstitute.com/explaining-uptime-institutes-tier-classification-system/)
- [Uptime Announces Annual Outage Analysis Report 2026 — Uptime Institute](https://uptimeinstitute.com/about-ui/press-releases/uptime-announces-annual-outage-analysis-report-2026)
- [What are the different types of UPS systems — Vertiv](https://www.vertiv.com/en-emea/about/news-and-insights/articles/educational-articles/what-are-the-different-types-of-ups-systems/)
- [The impact on sustainability as an industry transitions to lithium-ion battery technology for UPS applications — Schneider Electric](https://www.se.com/au/en/about-us/newsroom/news/press-releases/the-impact-on-sustainability-as-an-industry-transitions-to-lithium-ion-battery-technology-for-ups-applications-630d5a3f6f51a0208607126f/)

## 관련 문서

- [[Data-Center-Cooling|데이터센터 냉각과 PUE]] — PUE 정의와 냉각 방식, 랙 전력 밀도
- [[GPU-Server-Infrastructure|GPU 서버 인프라]] — UPS와 발전기 호환성, 서버 전원 장치 이중화와 성능
- [[Server-Quotation-Checklist|서버 견적 검토]] — 전원 코드와 랙 PDU, A/B 경로 확인
- [[N-1-Capacity-Headroom|N-1 가용량 헤드룸]] — 한쪽 경로 상실 뒤 남은 용량과 제어 경로
- [[DR-Strategy|DR 전략]] — 판교 데이터센터 화재와 배터리실 분리
