---
tags: [cs, memory, dram, semiconductor, 3d-dram]
status: done
verified_at: 2026-11-17
category: "CS - 기초"
aliases: ["DRAM 셀과 3D DRAM", "DRAM Cell and 3D DRAM", "셀 적층형 3D DRAM", "2T0C DRAM"]
---

# DRAM 셀과 3D DRAM

DRAM 칩은 데이터를 저장하는 셀 어레이와 셀을 고르고 신호를 읽어 밖으로 보내는 주변 회로(periphery)로 나뉜다. 두 영역 모두 트랜지스터를 쓰지만 요구 특성이 다르다. 그래서 로직 공정 기술이 DRAM에 어디까지 쓰일 수 있는지, 3D DRAM이 무엇을 쌓는지를 판단할 때 셀과 주변 회로를 나눠 봐야 한다.

## 1T1C 셀과 주변 회로

- **셀:** 전하를 담는 커패시터 하나와 읽기/쓰기 때 커패시터에 접근하는 트랜지스터 하나(1T1C)가 일반적인 구조다. 저장한 전하는 시간이 지나며 새므로 주기적으로 읽어 다시 채우는 refresh가 필요하다([[Sequential-Logic-and-Memory#RAM 기술과 시스템 역할|RAM 기술과 시스템 역할]]).
- **셀 트랜지스터의 요구:** 켜졌을 때는 충분한 전류를 흘리고 꺼졌을 때는 누설을 아주 작게 막아야 한다. 로직에서도 누설은 전력 문제지만, DRAM 셀에서는 누설이 데이터 유지 시간과 refresh 빈도에 직접 연결된다.
- **읽기:** 셀의 커패시터와 비트라인이 전하를 나누며 작은 전압 차이가 생기고, 센스 앰프가 이를 0과 1로 판별할 만큼 키운 뒤 셀의 전하를 다시 복원한다. 비트라인의 부하가 크면 같은 전하에서도 읽을 신호가 작아지므로 커패시터, 배선과 읽기 회로를 함께 설계한다.
- **주변 회로:** 행과 열을 고르는 디코더와 드라이버, 센스 앰프, 입출력 회로다. 일부는 일반 디지털 로직에 가깝고, 센스 앰프는 짝을 이루는 소자의 특성이 잘 맞아야 하며, 셀 선택 회로에는 상대적으로 높은 전압을 견뎌야 하는 부분이 있다.

### 커패시터를 줄이기 어려운 이유

정전 용량은 전극 면적이 넓을수록, 유전율이 높을수록, 절연막이 얇을수록 커진다. DRAM은 바닥 면적을 줄이면서 필요한 정전 용량을 지키려고 커패시터를 높게 세워 표면적을 늘리고, 고유전율 재료와 얇은 막을 조합해 왔다. 막이 너무 얇으면 누설이 늘고, 구조가 높고 가늘수록 깊은 식각과 균일한 증착이 어려워진다. 이 때문에 로직 공정 이름의 nm 숫자와 DRAM 세대 이름을 그대로 비교해 제조 능력의 우열을 정할 수 없다. 셀 면적 표기(4F², 6F²)와 비트당 비용의 관계는 [[Sequential-Logic-and-Memory#DRAM 셀 면적과 제조 비용|DRAM 셀 면적과 제조 비용]]을 본다.

## 로직 공정 기술이 들어가는 자리

HKMG(High-K Metal Gate)는 트랜지스터 게이트 절연막을 고유전율 재료로, 게이트 전극을 금속으로 바꿔 얇은 절연막의 누설을 줄이는 기술이다. Intel은 2007년 45nm 프로세서에 Hafnium 기반 HKMG를 처음 적용했다. Samsung은 2018년 GDDR6에 HKMG 공정을 메모리 업계 처음으로 도입했다고 밝혔고, 2021년 HKMG 기반 DDR5(512GB 모듈)를 개발하며 얇아진 절연막의 누설을 줄이고 전력도 약 13% 덜 쓸 것이라고 발표했다(비교 기준은 밝히지 않았다).

- 이 사례는 로직에서 먼저 쓴 게이트 기술을 DRAM 트랜지스터에 가져온 예다. Samsung 발표는 적용 위치를 밝히지 않지만, imec은 오늘날 DRAM의 평면형 주변 트랜지스터가 대부분 HKMG를 쓴다고 설명한다. 셀 어레이 전체를 로직과 같은 방식으로 만든다는 뜻으로 확대하지 않는다.
- 같은 고유전율이라는 말도 위치가 다르다. 커패시터의 고유전율 재료는 전하를 더 담기 위한 것이고, 게이트 절연막의 고유전율 재료는 트랜지스터 전류 제어와 누설 억제를 위한 것이다.

### 열 처리 순서라는 제약

기존 DRAM 흐름에서는 주변 트랜지스터를 메모리 소자보다 먼저 만든다. imec은 그래서 주변 트랜지스터가 이후 셀 형성의 550~600°C 열처리를 몇 시간 동안 견뎌야 한다고 설명한다. 로직에서 잘 동작한 트랜지스터라도 이 열을 거친 뒤 특성이 변하면 설계대로 동작하지 않는다. imec은 열에 안정적인 주변 트랜지스터를 연구하면서, 주변 회로를 별도 웨이퍼에 만들어 웨이퍼 본딩으로 셀 어레이와 붙이는 선택지도 제시한다.

## 셀과 주변 회로를 따로 만들어 붙이기

NAND에는 이미 적용 사례가 있다. Kioxia의 CBA(CMOS directly Bonded to Array)는 CMOS 주변 회로와 셀 어레이를 서로 다른 실리콘 웨이퍼에서 만든 뒤 구리 직접 접합으로 붙인다. 기존 CMOS-under-array 구조에서는 셀 어레이 형성의 열이 CMOS 성능을 제한했는데, Kioxia는 분리로 칩 면적을 줄이고 성능을 높일 수 있다고 설명한다. Kioxia는 이를 218층 BiCS8에 적용했다.

DRAM에서도 SK hynix는 2025년 VLSI 발표의 장기 로드맵에서 4F² VG(Vertical Gate)와 3D DRAM을 미래 DRAM의 축으로 제시했고, 4F² 셀에 회로부를 셀 영역 아래에 두는 웨이퍼 본딩을 결합하는 방안을 설명했다. 이는 로드맵이며 양산 일정이나 수율을 확인한 자료가 아니다.

분리에는 대가가 있다. 접합 공정과 비용이 늘고, 연결부의 정렬과 접합 뒤 전기적 안정성을 확보해야 한다. 또한 저장부와 제어부를 따로 만들어 붙였다고 해서 셀 자체가 여러 층이 된 것은 아니다.

## 3D DRAM이 쌓는 것

| 구분 | 무엇이 입체가 되는가 | 얻는 것 |
| --- | --- | --- |
| 높은 커패시터 | 셀 하나의 커패시터 | 셀 하나의 정전 용량 |
| 수직 채널, VG 셀 | 셀 접근 트랜지스터의 방향 | 셀 하나의 바닥 면적 축소 |
| 셀 적층형 3D DRAM | 저장 셀 자체를 칩 안에서 여러 층으로 배치 | 같은 바닥 면적의 셀 수 |
| HBM | 완성된 DRAM 다이를 TSV로 쌓음 | 패키지의 용량과 넓은 인터페이스 |

셀 적층형 3D DRAM과 HBM은 다른 층위다. 둘은 조합될 수 있으므로 3D DRAM이 나온다고 HBM이 사라진다고 볼 근거는 없다([[HBM-Stack-and-Base-Die|HBM 적층과 베이스 다이]]). 층을 늘려 셀 수가 늘어도 각 층의 셀을 고르는 배선의 저항과 부하가 커지거나 외부 연결이 그대로면 대역폭은 같은 비율로 늘지 않는다.

첨단 로직도 입체 구조를 만든다. TSMC N2는 1세대 나노시트 트랜지스터를 쓰며 2025년 4분기에 양산을 시작했다. 다층 재료의 선택적 식각, 입체 구조 위의 균일한 막 형성과 웨이퍼 접합 같은 공정 역량이 셀 적층에도 쓰일 수 있다는 것은 접점에 대한 설명이며, 특정 3D DRAM 구조에 그대로 옮겨진다는 근거는 아니다. DRAM은 가공 뒤 구조가 전하를 오래 유지하고 층마다 안정적으로 읽고 써야 하므로 막 두께, 가공 조건과 공정 순서를 그 목표에 맞춰 다시 개발해야 한다.

### 커패시터 없는 셀 후보

imec의 IGZO(인듐 갈륨 아연 산화물) 기반 2T0C 셀은 읽기 트랜지스터와 쓰기 트랜지스터를 두고 별도 저장 커패시터를 없앤다. 읽기 트랜지스터의 기생 정전 용량이 저장 소자 역할을 맡는다. IGZO는 누설이 매우 작고 비교적 낮은 온도에서 증착할 수 있어 층을 쌓는 구조의 후보로 연구된다. 높은 커패시터의 제조 부담은 줄지만, imec은 신뢰성(문턱 전압이 이동하는 PBTI 등)을 업계 채택의 핵심 우려로 든다. 3D DRAM이라는 이름만으로 셀 재료, 구조와 공정 난도를 정할 수 없는 이유다.

## 제품화의 기준: 쓸 수 있는 용량의 비용

시제품 셀 하나가 동작하는 것과 제품은 다르다. 깊은 구조를 식각할 때 위아래 모양 차이나 막 두께 편차가 생기면 셀 특성이 흩어지고, 평균이 좋아도 전하가 빨리 새는 일부 셀을 찾아내야 한다. 온도별 데이터 유지 시험, 불량 셀의 여분 셀 대체와 오류 관리 회로까지 갖춰야 고객이 쓸 수 있는 제품이 된다. 층수가 늘어 셀이 많아져도 공정 단계와 검사 시간이 늘고 쓸 수 없는 영역이 많아지면 비트당 비용이 오른다. 층수보다 실제 사용 가능한 용량을 어떤 비용으로 안정적으로 공급하는지를 본다.

## 사례: 파운드리의 3D DRAM 검토 보도(2026-11)

The Information은 2026-11-06 TSMC가 NVIDIA의 요청으로 셀 적층형 3D DRAM 생산을 검토하고 있다고 익명 소식통을 인용해 보도했다. TSMC는 시장 소문에 답하지 않는다고 했고, 다른 매체에는 핵심 IC 파운드리 사업과 로직 IC 산업에 기술과 용량을 제공하는 데 집중한다고 답했다. eeNews Europe는 이 답이 내부 검토를 명시적으로 배제하지 않았다고 읽었고, Tom's Hardware는 기사 제목에서 부인으로 규정했다. 2026-11-17 기준 개발, 계약과 양산은 공식 발표로 확인되지 않았다.

이런 소식은 위의 구분으로 읽는다.

- HBM4 베이스 다이 같은 로직 다이를 만드는 일과 DRAM 저장 셀을 만드는 일은 범위가 다르다.
- 셀 구조에 관한 특허나 연구 발표가 있더라도 그것과 수율, 원가를 갖춘 양산 능력은 다르다.
- 새 공장과 제품 개발, 고객 검증에는 시간이 걸려 단기 수급 대응 수단으로 보기 어렵고, 투자 결정 시점과 물량이 나오는 시점의 수급은 달라질 수 있다. 공급 계약, 증설과 납품의 구분은 [[Memory-Semiconductor-Cycle|메모리 반도체 사이클]]을 본다. 연산 칩, 메모리와 패키징을 한 업체에 맡길수록 공급자 이름은 늘어도 단계별 의존은 커질 수 있다.

## 확인 질문

- DRAM 셀 트랜지스터와 주변 회로 트랜지스터의 요구 특성이 왜 다른가?
- 셀과 주변 회로를 다른 웨이퍼에서 만들면 무엇을 얻고 무엇을 새로 감당하는가?
- 셀 적층형 3D DRAM과 HBM의 적층은 각각 무엇을 쌓는가?

## 출처

- [Samsung Develops Industry's First HKMG-Based DDR5 Memory — Samsung Semiconductor Newsroom](https://news.samsungsemiconductor.com/global/samsung-develops-industrys-first-hkmg-based-ddr5-memoryideal-for-bandwidth-intensive-advanced-computing-applications/) — 2021-03-25, GDDR6의 2018년 HKMG 도입, 누설 감소와 전력 약 13% 감소 예상
- [Intel's Fundamental Advance in Transistor Design Extends Moore's Law — Intel Newsroom](https://www.intel.com/pressroom/archive/releases/2007/20071111comp.htm) — 2007-11-11, 45nm Hafnium 기반 HKMG
- [A technology platform for thermally stable DRAM peripheral transistors — imec](https://www.imec-int.com/en/articles/technology-platform-thermally-stable-dram-peripheral-transistors) — 2025-05-20, 주변 트랜지스터의 HKMG, 선제작과 550~600°C 열처리, 별도 웨이퍼 본딩 선택지
- [Disrupting the DRAM roadmap with capacitor-less IGZO-DRAM technology — imec](https://www.imec-int.com/en/articles/disrupting-dram-roadmap-capacitor-less-igzo-dram-technology) — 2025-03-25, 2T0C 셀과 읽기 트랜지스터의 기생 정전 용량, IGZO의 낮은 누설과 저온 증착, 신뢰성 우려
- [Development of CMOS directly Bonded to Array (CBA) Technology for 3D Flash Memory — KIOXIA](https://www.kioxia.com/en-jp/rd/technology/topics/topics-64.html) — 2024-03-14, 별도 웨이퍼 제작과 Cu 직접 접합, 면적과 성능, BiCS8 218층
- [SK hynix Presents Future DRAM Technology Roadmap at IEEE VLSI 2025 — SK hynix Newsroom](https://news.skhynix.com/en/SK-hynix-presents-future-dram-technology-roadmap-at-ieee-vlsi-2025/) — 2025-06-10, VG와 3D DRAM 로드맵, 4F² 셀과 웨이퍼 본딩
- [TSMC, 2nm Technology](https://www.tsmc.com/english/dedicatedFoundry/technology/logic/l_2nm) — N2 나노시트와 2025년 4분기 양산, 2026-11-17 확인
- [TSMC 3D DRAM report linked to Nvidia draws response — eeNews Europe](https://www.eenewseurope.com/en/tsmc-3d-dram-nvidia-report-response/) — 2026-11-10, The Information 보도 내용과 TSMC 답변. 원보도와 Reuters 기사는 직접 열람하지 못함
- [TSMC denies exploring 3D DRAM at Nvidia's request — Tom's Hardware](https://tomshardware.com/pc-components/dram/tsmc-denies-exploring-3d-dram-at-nvidias-request-advanced-memory-tech-is-still-years-from-market-viability) — 기사 제목의 해석만 확인, 본문은 열람하지 못함
- [엔비디아가 TSMC에 D램까지? 3D D램 생산 검토 보도 — YouTube, 안될공학](https://www.youtube.com/watch?v=z0Iiy44eaIw) — 2026-11-08, 셀과 주변 회로의 구분과 제품화 관점. 영상의 SK hynix 2024 5층 연구, Samsung 2024 본딩 연구와 TSMC 특허 내용은 공식 자료로 확인하지 못해 싣지 않음

## 관련 문서

- [[HBM-Stack-and-Base-Die|HBM 적층과 베이스 다이]]
- [[Sequential-Logic-and-Memory|순차 논리회로와 메모리]]
- [[Semiconductor-Advanced-Packaging|반도체 첨단 패키징]]
- [[Memory-Semiconductor-Cycle|메모리 반도체 사이클]]
