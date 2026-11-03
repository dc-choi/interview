---
tags: [semiconductor, chiplet, packaging, intel, infrastructure]
status: done
verified_at: 2026-10-30
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["반도체 첨단 패키징", "Semiconductor Advanced Packaging"]
---

# 반도체 첨단 패키징

첨단 패키징은 여러 die나 chiplet을 연결해 하나의 패키지에서 동작하게 하는 기술이다. 웨이퍼 공정의 미세화만으로 시스템을 설명하지 않고, die 사이 연결과 적층 구조도 함께 본다. 특정 지역의 웨이퍼 생산과 해당 제품의 패키징 준비 완료는 별도로 확인해야 한다.

## 연결 구조를 나눈다

2026-10-30 Intel의 제품 문서 기준이다. 같은 브랜드 안에서도 세대와 방식이 다르므로 Foveros라는 이름 전체를 하나의 적층 방식으로 취급하지 않는다.

| 기술 | 연결 방식 | 읽을 때 구분할 점 |
| --- | --- | --- |
| EMIB 2.5D | 패키지 기판에 넣은 silicon bridge로 die 사이를 연결 | logic-logic과 logic-HBM 연결에 사용하며, EMIB-T는 bridge에 TSV를 추가 |
| Foveros-S / Foveros-R 2.5D | 각각 silicon interposer / RDL interposer를 이용 | Foveros Direct의 직접 구리 접합과 구분 |
| Foveros Direct 3D | active base die 위에 chiplet을 수직 적층하고 Cu-to-Cu hybrid bonding으로 연결 | 기존 solder microbump를 쓰는 die-to-die 접합과 구분 |
| EMIB 3.5D | 한 패키지 안에서 EMIB와 Foveros를 결합 | 여러 3D stack을 함께 연결하는 구성에 사용 |

Foveros Direct 3D 기술 설명은 Intel Foundry 공정 노드에서 제공하는 방식으로 범위를 한정한다. 이를 어떤 파운드리에서 만든 die든 변경 없이 조립할 수 있다는 호환성 보장으로 읽지 않는다. 제품 이름, 공정 노드와 패키징 인터페이스를 함께 대조한다.

## EMIB와 CoWoS-L은 실리콘 연결부의 위치가 다르다

2026-11-03 Intel EMIB 기술 설명서와 TSMC CoWoS 제품 문서를 대조한 연결 구조다.

| 방식 | 고밀도 연결부와 배치 | 함께 읽을 구조 |
| --- | --- | --- |
| Intel EMIB | 작은 silicon bridge를 패키지 기판 안에 넣어 인접 die를 연결 | 기판의 cavity에 bridge를 접착제로 고정하고 절연층과 금속 배선층을 쌓는다 |
| TSMC CoWoS-L | RDL 기반 interposer에 LSI(Local Silicon Interconnect)를 결합 | LSI의 미세 구리 배선이 고밀도 die-to-die 연결을, interposer 앞뒤의 RDL이 신호와 전력 전달을 담당한다 |

EMIB는 bridge에 연결되는 영역에는 촘촘한 microbump pitch를, 나머지 die-core 영역에는 더 넓은 pitch를 사용할 수 있다. 패키지 전체에 같은 간격의 접점을 요구하는 구조로 이해하지 않는다. CoWoS-L도 작은 실리콘 연결부를 쓰지만, 이를 EMIB와 같은 기판 제조 공정으로 취급하지 않는다.

비교할 때는 실리콘 면적의 크기뿐 아니라 bridge가 들어가는 층, die의 접점 배치와 기판으로 이어지는 경로를 확인한다. 이는 구조를 읽는 점검 기준이다. 높이 정렬 허용오차, 열 변형과 조립 수율의 정량 비교는 이 자료만으로 확인하지 않았다.

## HBM의 base die와 패키지 기판을 구분한다

HBM은 DRAM die를 적층하고 TSV로 수직 연결하며, 아래쪽 base die는 GPU와 연결되는 역할을 한다. Base die는 기능을 가진 반도체 die이므로 패키지 기판이나 die 사이를 연결하는 interposer와 같은 부품으로 부르지 않는다.

2026-11-04 대조한 SK hynix의 2024-04-19 발표는 HBM3E까지 자체 기술로 base die를 만들었고, HBM4에는 TSMC의 첨단 로직 공정을 도입할 계획이라고 설명한다. 목적은 제한된 면적에 기능을 더 넣고 고객의 성능과 전력효율 요구에 맞춘 HBM을 만드는 것이었다. 이 과거 발표의 계획을 현재 제품의 양산 완료나 고객별 채택 증거로 바꾸지 않는다.

두 회사의 협력에는 HBM과 CoWoS 통합 최적화도 포함됐다. 따라서 검토할 때 메모리 적층, base die의 설계와 제조, GPU와 HBM을 묶는 패키징을 나눠 본다. 파운드리 공정 채택 사실만으로 설계 소유권, 구체적 GPU 기능의 이전이나 후공정 외주 물량을 확정할 수는 없다. 고객별 마진과 공급사 주가의 변화도 이 기술 발표가 입증하지 않는다.

## 생산시설과 제품 준비 완료를 구분한다

Intel은 2024-01-24 뉴멕시코 Rio Rancho의 Fab 9 개장을 발표했고, Fab 9와 Fab 11x를 자사의 3D 첨단 패키징 양산 거점으로 설명했다. 이는 해당 시설과 기술 역량의 근거다. 개별 외부 고객 제품의 양산 승인, 생산 물량과 납기를 입증하는 자료는 아니다.

제품별 검토에서는 다음을 확인한다(검토 기준).

- 사용할 die의 공정, 패키징 방식과 실제 제조 거점이 명시됐는가.
- 시설 개장, 제품 검증과 고객 제품 양산을 서로 다른 단계로 확인했는가.
- 연결 대역폭과 전력뿐 아니라 패키지 전체의 열, 검사와 수율 조건을 확인했는가.
- 패키징 기술의 피크 수치를 실제 서버의 응답 지연이나 처리량으로 바꾸지 않았는가.

공식 제품 설명과 시설 개장 발표를 대조한 문서다. 특정 고객의 공급 경로, 경쟁사의 미래 증설 일정, 양산 수율과 성능은 검증하지 않았다. 장비에서 측정한 결과도 아니다.

## 출처

- [SK하이닉스, TSMC와 손잡고 HBM 기술 리더십 강화 — SK hynix](https://news.skhynix.co.kr/skhynix-tsmc-hbm4-mou/) — 2024-04-19 발표. 2026-11-04 영문 공식 본문과 한국어 검색 발췌로 base die의 역할, HBM3E까지의 자체 기술과 HBM4 공정 협력 계획 확인. 한국어 페이지 직접 열람은 403 응답이었다. 기존 패키징 절의 확인일은 유지.
- [Intel, EMIB Technology Brief](https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2025-07/emib-product-brief.pdf) — 2026-11-03 1쪽 본문의 bridge 매립 절차와 영역별 bump pitch 설명 대조. 기존 기술과 시설 절의 확인일은 유지.
- [TSMC, CoWoS](https://3dfabric.tsmc.com/english/dedicatedFoundry/technology/cowos.htm) — 2026-11-03 CoWoS-L의 RDL 기반 interposer, LSI와 신호 및 전력 배선 구조 대조.
- [Intel, Advanced Packaging Innovations](https://www.intel.com/content/www/us/en/foundry/packaging.html) — 2026-10-30 EMIB, Foveros-S/R, Foveros Direct와 EMIB 3.5D 연결 구조 대조.
- [Intel, Foveros Direct 3D Technology Brief](https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2025-11/foveros-direct-3d-tech-brief.pdf) — 1쪽의 Intel Foundry 공정 범위와 Cu-to-Cu hybrid bonding 대조.
- [Intel Opens Fab 9 in New Mexico — Intel](https://www.intel.com/content/www/us/en/newsroom/news/intel-opens-fab-9-new-mexico.html) — 2024-01-24 발표, 2026-10-30 시설 위치와 양산 거점 설명 대조.

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]]
- [[GPU-Inference-Hardware|추론용 GPU 선택]]
- [[인프라&클라우드(Infrastructure&Cloud)|인프라와 클라우드 지도]]
