---
tags: [infrastructure, data-center, cooling, pue, power, gpu, liquid-cooling]
status: done
verified_at: 2026-11-03
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Data Center Cooling", "데이터센터 냉각", "PUE", "Power Usage Effectiveness", "전력 사용 효율", "액체 냉각", "Direct Liquid Cooling", "침지 냉각", "액침 냉각"]
---

# 데이터센터 냉각과 PUE

IT 장비가 쓴 전력은 결국 대부분 열로 바뀐다. 데이터센터는 받은 전력을 IT 장비와, 그 장비를 돌리는 데 필요한 냉각, 배전과 조명 같은 설비에 나눠 쓴다. GPU 랙의 전력 밀도가 오르면서 냉각 방식은 배전과 함께 한 랙에 장비를 얼마나 넣을 수 있는지와, 같은 수전 용량에서 IT 장비에 전력을 얼마나 줄 수 있는지를 좌우하는 주요 요인이 됐다(해석). 이 문서는 PUE의 정의와 계산, 공기와 액체 냉각의 차이, 방식별 적용 조건을 다룬다. 서버 단위의 전력, 랙 하중과 정전 대응은 [[GPU-Server-Infrastructure#서버에서 랙으로 검토 범위를 넓힌다|GPU 서버 인프라]]를 따른다.

## PUE는 시설 전체 에너지를 IT 에너지로 나눈 값이다

The Green Grid는 PUE를 데이터센터 전체 시설 에너지와 IT 장비 에너지의 비율로 정의한다.

```text
PUE = 전체 시설 에너지 / IT 장비 에너지
```

값은 1.0부터 무한대까지 가능하고, 1.0에 가까울수록 IT 장비 밖에서 쓰는 에너지가 적다.

- **오버헤드는 냉각만이 아니다:** 전체 시설 에너지에는 칠러, 냉각탑, 펌프, CRAH와 CRAC 같은 냉각 설비뿐 아니라 UPS, 스위치기어, 발전기, PDU, 배터리와 IT 장비 밖의 배전 손실, 조명 같은 부하가 들어간다. 그래서 PUE 1.5는 IT 장비가 1을 쓸 때 냉각에만 0.5를 더 쓴다는 뜻이 아니라 이 비IT 부하 전체가 0.5라는 뜻이다. The Green Grid는 IT와 냉각 에너지만으로 PUE를 계산하는 것을 정식 사용법이 아니라고 적는다.
- **전력이 아니라 에너지 지표다:** 보고에는 1년 동안 측정한 평균 PUE를 쓰라고 권하고, 15분 이하 간격의 연속 측정을 권장 관행으로 든다. 시설 에너지는 수전 계량기에서, IT 에너지는 UPS 출력, PDU 출력이나 IT 장비 입력 중 정한 측정 수준에서 잰다.
- **다른 시설과 단순 비교하지 않는다:** The Green Grid는 공개된 PUE 값만으로 서로 다른 데이터센터를 비교하는 것을 대체로 권하지 않는다. 표준화된 방식으로 보고하고 연식, 위치, 부하율과 규모를 함께 고려하면 비교에 쓸 수 있다고 본다.

Uptime Institute의 2025년 조사에서 응답자의 연간 PUE 가중평균은 1.54였다. 2007년 2.50에서 2014년 1.65로 빠르게 낮아진 뒤 6년째 거의 변하지 않은 값이다. 냉각 방식을 구분하지 않은 응답 시설 전체의 평균이며, 같은 조사에서 최근 5년 안에 가동한 시설은 1.48, 20MW 이상 시설은 1.44였다. Uptime은 PUE가 시설의 물 사용이나 IT 효율을 다루지 않는다고 적는다.

### 같은 수전 용량에서 IT에 줄 수 있는 전력

IT 전력은 시설 전력을 PUE로 나눠 어림한다. 100MW를 받는 시설이라면 PUE 1.5에서 약 66.7MW, 1.2에서 약 83.3MW, 1.05에서 약 95.2MW다. 1.5에서 1.05로 낮추면 IT에 쓸 수 있는 전력이 약 43% 늘어나는 계산이다. 이 계산을 용량 계획에 쓸 때는 다음을 구분한다.

- **보고 값과 피크:** 보고용 PUE는 보통 연평균 에너지 비율이고 수전 용량은 순간 전력의 상한이다. 용량 계획은 연평균 PUE가 아니라 피크나 설계 조건의 값으로 계산한다(해석).
- **IT 전력과 GPU 대수:** IT 전력에는 GPU 외에 CPU, 네트워크와 스토리지가 들어간다. IT 전력의 증가율을 GPU 대수의 증가율로 바로 옮기지 않는다.
- **팬 전력의 경계:** ASHRAE 2021 백서는 서버 냉각 팬이 서버와 같은 UPS 전원을 쓴다고 적으므로 팬 전력은 IT 쪽에서 계량된다. 액체 냉각으로 팬 전력이 줄면 IT 에너지가 줄어 PUE가 덜 개선되거나 오히려 오를 수 있다(해석). The Green Grid도 IT 에너지 감소에 맞춰 총에너지가 조정되지 않으면 PUE가 올라갈 수 있다고 적는다. 냉각 방식은 PUE만이 아니라 총에너지와 처리량으로 비교한다(운영 제안).

## 공기와 액체는 같은 부피로 나르는 열이 다르다

ASHRAE TC 9.9는 물의 열용량이 공기의 3,500배를 넘는다고 적는다. NIST의 25°C, 1기압 물성으로 계산해도(건조 공기는 질소, 산소, 아르곤의 표준 조성을 가정) 부피당 열용량은 1K당 1m³에 물이 약 4,169kJ, 건조 공기가 약 1.19kJ로 약 3,500배다. 질량당 비열로는 약 4배이므로, 차이의 대부분은 밀도에서 나온다. 공기로 같은 열을 옮기려면 훨씬 많은 부피를 움직여야 하고 그만큼 팬과 공조 설비의 부담이 커진다(해석).

| 방식 | 열을 옮기는 경로 | 적용 조건과 한계 |
|---|---|---|
| 공랭 | 냉각한 공기를 서버 팬으로 통과시키고, 데워진 공기를 공조 설비로 다시 식힌다 | ASHRAE 2019 백서는 일부 공랭 제품이 40~50kW까지 다루지만 팬 전력이 늘고 냉각 효율이 떨어지는 대가가 따른다고 적는다. Uptime 2025 조사에서 시설별 대표(최빈) 랙 밀도의 평균은 9kW에 조금 못 미쳤고 30kW 이상 고밀도 시설을 빼면 7.5kW였으며, 응답자의 80% 이상이 30kW를 넘는 랙이 없다고 답했다. 냉각 방식을 구분한 값은 아니다 |
| 후면 도어 열교환기(RDHx) | 랙 뒷문의 열교환기가 서버 배기 공기의 열을 물로 옮긴다. 공기를 거치는 간접 수랭이다 | 기존 공랭 IT 장비를 그대로 쓸 수 있지만, 전통적인 방식은 랙까지 시설 냉수 공급이 필요하다. OCP 백서는 냉수가 랙까지 배관된 시설에서 랙당 약 10kW의 추가 냉각 용량을 준다고 본다 |
| 콜드플레이트 직접 액체 냉각(DLC) | 발열 부품에 붙인 콜드플레이트 안의 액체가 공기를 거치지 않고 열을 가져간다 | 콜드플레이트가 없는 부품은 공랭으로 남는다. NVIDIA DGX GB 사용자 가이드는 컴퓨트 트레이의 CPU와 GPU에 붙은 콜드플레이트로 액체를 흘리고, 네트워크와 스토리지 장치 같은 나머지 부품은 공기로 식힌다고 적는다 |
| 단상 침지 | IT 장비를 액체에 직접 담그고, 액체는 상이 바뀌지 않은 채 열을 옮긴다 | 아래 침지 공통 조건을 따른다 |
| 2상 침지 | 액체가 열을 받아 기체로 증발하고, 식으면서 다시 액체로 응축하며 열을 옮긴다 | 아래 침지 공통 조건을 따른다 |

OCP는 직접 액체 냉각을 공기를 중간 매체로 쓰지 않고 액체가 열을 가져가는 방식으로 넓게 정의해 침지도 포함한다. 위 표의 DLC는 콜드플레이트 방식만 가리킨다. 침지에는 합성 탄화수소, 천연과 합성 에스터, 불소계 유체가 주로 쓰인다(OCP). ASHRAE 2021 백서는 침지 도입 전에 재료 호환성 평가와 보증 영향 평가를 하라고 권한다.

ASHRAE 2021 백서는 액체 냉각으로 PUE를 1.1 미만까지 낮출 수 있다고 적지만 방식별 값을 정하지 않는다. Uptime도 기후 조건이 냉각 시스템의 선택을 제약한다고 적는다. PUE는 열 방출 설비와 기후의 영향을 크게 받으므로 냉각 방식 이름만으로 PUE를 정하지 않는다(해석).

## GPU 랙의 전력 밀도

2026-11-03 NVIDIA 공식 문서 기준이다. 같은 세대도 시스템 구성에 따라 전력 한도가 다르다.

| 대상 | 공식 수치 |
|---|---|
| H100 SXM | 최대 700W(설정 가능) |
| Blackwell, Blackwell Ultra | 기술 블로그의 최대 TGP는 각각 최대 1,200W, 1,400W. DGX B200 사용자 가이드의 전원 표는 동작하는 PSU 수에 따라 GPU당 전력 한도를 1,000W 또는 800W로 적고(nvidia-smi 보고 기준), 시스템 최대 전력을 14.3kW로 적는다 |
| GB200 NVL72 랙 | 제품 페이지는 액체 냉각 랙 규모 설계로 소개하고, DGX GB 랙 규모 시스템 사용자 가이드는 NVL72 랙 소비 전력을 약 120kW로 적는다 |
| Vera Rubin | 45°C 공급 온도의 단상 직접 액체 냉각을 적는다. 이번에 대조한 NVIDIA 공식 자료에는 GPU 전력 수치가 없다 |
| 차세대 랙 | 2025-05-20 NVIDIA 800VDC 아키텍처 글은 2027년부터 1MW IT 랙을 지원하겠다는 계획이며, 랙이 200kW를 넘으면 기존 54V 랙 내 배전이 물리적 한계에 부딪히기 시작한다고 적는다. 출하된 사실이 아니라 계획이다 |

NVIDIA가 침지 냉각을 공식 지원하거나 인증하지 않는다는 주장은 이번 대조에서 NVIDIA 공식 문구로 확인하지 못했다. 공식 자료로 확인되는 것은 GB200 NVL72의 콜드플레이트 방식과 Vera Rubin의 단상 직접 액체 냉각이다.

## 열이 성능에 주는 영향

NVML은 GPU 클럭이 요청값보다 낮아진 이유를 나눠 보고한다. 온도가 최대 작동 온도를 넘지 않도록 소프트웨어가 클럭을 낮추는 SW Thermal Slowdown, 하드웨어 보호가 코어 클럭을 절반 이하로 낮추는 HW Thermal Slowdown, 설정된 전력 한도를 넘지 않도록 하는 SW Power Cap, 전원 장치 같은 외부 신호에 의한 HW Power Brake가 있다. 클럭 저하로 처리량이 떨어졌다면 냉각 부족인지 전력 한도인지 이 사유로 먼저 나눈다(운영 제안). 사용률 지표 해석은 [[GPU-Server-Infrastructure#GPU 사용률을 작업 성과와 연결한다|GPU 사용률과 작업 성과]]를 따른다.

## 적용 점검

- 장비의 최대 전력과 실제 부하, 랙당 전력과 냉각 방식이 설치 시설의 수전, 배전과 냉각 용량에 맞는가?
- PUE를 비교할 때 측정 기간(연평균인지), 측정 지점, 기후와 부하율이 같은가? 냉각 방식을 바꾼 뒤에는 PUE와 함께 총에너지를 봤는가?
- 액체 냉각을 도입하면 공랭으로 남는 부품의 열, 시설 쪽 냉각수 조건, 재료 호환성과 보증 조건을 확인했는가?
- GPU 클럭이 낮아졌다면 온도, 전력 한도와 외부 신호 중 어느 사유인지 확인했는가?

## 출처

- [데이터센터 더 안 짓고도 GPU를 더 돌리는 방법 — 티타임즈TV (YouTube)](https://www.youtube.com/watch?v=unOa1sbDNRU) — 2026-10-24 계기 자료. 냉각 방식별 PUE 값, 시장 규모 전망, 업체 전략과 NVIDIA의 침지 냉각 인증에 대한 주장은 1차 출처로 확인하지 못해 옮기지 않았다
- [PUE: A Comprehensive Examination of the Metric — The Green Grid](https://datacenters.lbl.gov/sites/default/files/WP49-PUE%20A%20Comprehensive%20Examination%20of%20the%20Metric_v6.pdf) — White Paper #49, LBNL 호스팅 사본. 정의, 포함 부하, 측정 기간과 비교 조건
- [Uptime Institute Global Data Center Survey 2025 — Uptime Institute](https://datacenter.uptimeinstitute.com/rs/711-RIA-145/images/2025.Annual.Survey.Report.pdf) — 연간 PUE 가중평균, 랙 밀도와 기후 조건
- [Water-Cooled Servers: Common Designs, Components, and Processes — ASHRAE TC 9.9](https://www.ashrae.org/File%20Library/Technical%20Resources/Bookstore/WhitePaper_TC099-WaterCooledServers.pdf)
- [Emergence and Expansion of Liquid Cooling in Mainstream Data Centers — ASHRAE TC 9.9](https://www.ashrae.org/File%20Library/Technical%20Resources/Bookstore/Emergence-and-Expansion-of-Liquid-Cooling-in-Mainstream-Data-Centers_WP.pdf) — 팬 전원, PUE 1.1 미만, 침지 도입 전 평가
- [Open Compute Project, Immersion Requirements Rev 2.10](https://www.opencompute.org/documents/ocp-acs-immersion-requirements-rev-2-1-pdf/)
- [Evaluating the Limits of Door Heat Exchanger Solutions Optimized for Open Rack V3 — Open Compute Project](https://www.opencompute.org/documents/acs-door-hx-whitepaper-final-230419-pdf/)
- [NIST Chemistry WebBook, Thermophysical Properties of Fluid Systems](https://webbook.nist.gov/chemistry/fluid/) — 25°C, 1기압의 물과 질소, 산소, 아르곤 물성으로 부피당 열용량 계산
- [NVIDIA, H100 GPU](https://www.nvidia.com/en-us/data-center/h100/)
- [NVIDIA, GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/)
- [Inside NVIDIA Blackwell Ultra: The Chip Powering the AI Factory Era — NVIDIA Technical Blog](https://developer.nvidia.com/blog/inside-nvidia-blackwell-ultra-the-chip-powering-the-ai-factory-era/)
- [NVIDIA DGX B200 User Guide, Introduction to NVIDIA DGX B200 Systems](https://docs.nvidia.com/dgx/dgxb200-user-guide/introduction-to-dgxb200.html)
- [NVIDIA DGX GB Rack Scale Systems User Guide, Hardware](https://docs.nvidia.com/dgx/dgxgb200-user-guide/hardware.html)
- [Inside the NVIDIA Vera Rubin Platform: Six New Chips, One AI Supercomputer — NVIDIA Technical Blog](https://developer.nvidia.com/blog/inside-the-nvidia-rubin-platform-six-new-chips-one-ai-supercomputer/)
- [NVIDIA 800 VDC Architecture Will Power the Next Generation of AI Factories — NVIDIA Technical Blog](https://developer.nvidia.com/blog/nvidia-800-v-hvdc-architecture-will-power-the-next-generation-of-ai-factories/)
- [NVIDIA NVML API Reference, Clocks Event Reasons](https://docs.nvidia.com/deploy/nvml-api/api/group__nvmlClocksEventReasons.html)

## 관련 문서

- [[GPU-Server-Infrastructure|GPU 서버 인프라]] — 서버와 랙의 전력, 정전 대응과 GPU 사용률
- [[Server-Quotation-Checklist|서버 견적 검토]] — 전원 코드와 랙 PDU
- [[AI-Infrastructure-Capital-Cycle|AI 인프라 투자 사이클]] — 데이터센터 전력 소비와 투자 구조
