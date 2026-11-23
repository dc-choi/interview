---
tags: [cs, robotics, humanoid, physical-ai, manufacturing, logistics, deployment]
status: done
category: "CS - 로보틱스"
aliases: ["범용 로봇의 현장 도입", "General-Purpose Robot Deployment", "휴머노이드 현장 도입", "Physical AI 도입 조건", "Humanoid Deployment"]
---

# 범용 로봇의 현장 도입: 배치 사례, 수치 읽기와 준비 조건

범용 로봇(휴머노이드와 다기능 이동 조작 로봇)을 공장과 물류센터에 들일지 판단할 때는 시연 영상보다 어떤 작업을, 어떤 계약으로, 얼마 동안 했는지를 본다. 이 문서는 2026년 11월까지 공개된 배치 사례, 자주 인용되는 벤치마크와 전망 수치를 읽는 법, 도입 준비 조건을 정리한다. 몸체와 제어의 설계는 [[Physical-AI-and-Liquid-Control|피지컬 AI와 리퀴드 제어]], 정책 학습과 평가는 [[Robot-Policy-Training-Pipeline|로봇 정책 학습과 평가 파이프라인]]에 있다.

## 공개된 배치의 작업 범위

| 사례 | 확인한 내용 | 기준 |
|---|---|---|
| BMW Spartanburg 공장과 Figure 02 | 2025년 10개월 동안 차체 공장에서 용접 공정에 판금 부품을 넣는 작업으로 BMW X3 3만 대 넘는 생산을 지원했다. BMW는 이를 완료한 파일럿으로, Figure는 11개월 배치로 표현한다. 후속 기종 Figure 03은 같은 공장의 물류 시퀀싱 작업에 들어간다 | BMW 보도자료(2026-06-25) |
| GXO Flowery Branch 물류센터와 Agility Digit | 토트를 10만 개 넘게 옮겼다. AMR에서 물건을 내려 컨베이어로 옮기고 토트를 다른 바닥 위치에 쌓는 작업을 했다 | Agility 발표(2025-11-20) |
| Toyota Motor Manufacturing Canada와 Agility Digit | 파일럿 뒤 RaaS(Robots-as-a-Service) 계약을 맺고 제조, 공급망과 물류 작업 지원에 배치한다. 생산 라인의 반복적이고 힘든 작업은 앞으로 검토할 대상으로 적었다 | Agility 보도자료(2026-02-19) |

- BMW와 GXO 사례는 사람이 하던 부품 투입과 반복 운반이다. TMMC는 보도자료가 구체 작업을 밝히지 않았다. 세 사례 어디에도 라인 전체를 맡았다는 서술은 없다.
- 같은 배치를 회사에 따라 파일럿, 상업 배치나 서비스 계약으로 부른다. 표현보다 기간, 작업 범위, 대수와 계약 형태를 확인한다(운영 제안).
- 서비스형 계약(RaaS)에서는 고객이 로봇을 사지 않고 가동 서비스로 쓰므로, 초기 투자 대신 이용료와 가동률 보장 조건을 비교하게 된다(해석).

## 벤치마크 수치는 무엇을 재는지부터 본다

Stanford AI Index 2026은 두 벤치마크를 함께 소개한다.

| 벤치마크 | 재는 것 | 보고된 수치 |
|---|---|---|
| RLBench | 통제된 시뮬레이션의 짧은 조작 과제. 18개 과제, 과제당 시연 100개 | 2026년 1월 기준 최고 방법(EquAct)의 평균 성공률 89.4% |
| BEHAVIOR-1K | 사람들이 로봇에게 맡기고 싶다고 답한 집안일 1,000개를 바탕으로, 시뮬레이션 가정 환경에서 하는 긴 이동 조작 과제 | 2025년 BEHAVIOR Challenge 최고 팀의 전체 과제 성공률 12.4%(Q-score 약 26%) |

보고서 요약은 이를 로봇이 실제 집안일의 12%만 성공한다고 표현하지만, 두 수치는 서로 다른 벤치마크와 방법의 결과이고 둘 다 시뮬레이션이다. 같은 모델이 시뮬레이션에서 89.4%, 실제 가정에서 12%를 냈다는 sim-to-real 비교로 읽지 않는다. 이 차이가 보여 주는 것은 짧고 통제된 과제와 길고 다양한 과제 사이의 거리다(해석). 실제 장비의 성공률은 [[Robot-Policy-Training-Pipeline#평가는 시뮬레이터의 폐루프 실행으로 한다|시뮬레이터 평가]]와 별도로 잰다.

## 확산 전망을 읽을 때

- **Gartner(The Robot Report 2026-01-28 보도 기준):** 2028년까지 휴머노이드 개념 검증(현재 200개 가까이) 가운데 실험 단계를 넘는 회사는 100곳 미만, 공급망과 제조에서 실제 생산에 들어가는 회사는 20곳 미만일 것으로 본다. 대부분의 배치는 통제된 환경에 머물 것으로 보고, 작업 특화 로봇보다 몇 배 비싸면서 처리량과 가동률이 낮다는 점과 배터리 제약을 이유로 든다. 바퀴나 비인간형 배치를 쓴 다기능(polyfunctional) 로봇이 공급망 운영에 더 맞을 수 있다고 본다. Gartner 원문은 접근이 막혀 보도로만 확인했고 발표일은 확인하지 못했다.
- **Goldman Sachs(2024-02-27):** 2035년 휴머노이드 시장을 380억 달러, 출하를 140만 대로 전망했고, 대당 제조원가가 전년의 5만~25만 달러에서 3만~15만 달러로 내렸다고 적었다. 이후 Goldman이 이 전망을 개정했는지는 확인하지 못했다.

로봇 운용비가 인건비와 같아지는 가격 동등(price parity)을 확산의 계기로 보는 관점은 비교 단위를 맞춰야 쓸 수 있다. 로봇 쪽에는 구입가나 이용료뿐 아니라 통합, 프로그래밍, 정비와 가동률 손실이 들어가고, 사람 쪽에는 근무 시간과 대체 가능한 작업 범위가 들어간다(해석). 자동화 원가를 정하는 변수는 [[Robot-Manufacturing-and-Serviceability#조립 자동화의 경제성|조립 자동화의 경제성]]과 같다.

## 도입 준비 조건

로봇 한 대나 모델 하나를 들이는 것으로 끝나지 않는다. 작업에 맞는 하드웨어와 지능의 조합 위에 다음 단계가 이어진다(운영 제안).

| 단계 | 확인할 것 |
|---|---|
| 하드웨어와 지능 | 몸체, 엔드이펙터와 작업 수행 모델이 대상 작업에 맞는가 |
| 데이터 | 학습용 데이터를 현장에서 모으고 정제하는 경로가 있는가 |
| 시뮬레이션 | 투입 전에 가상 환경에서 검증하는가([[Digital-Twin|디지털 트윈]]) |
| 평가 | 성능 측정 방법과 합격 기준을 정했는가 |
| 연계 | MES, 생산 설비와 물류 반송 시스템에 연결되는가 |
| 배치 | 현장 구축, 시운전과 안정화 기간을 잡았는가 |
| 유지보수 | 모니터링, 예지 보전과 원격 진단이 있는가([[Robot-Manufacturing-and-Serviceability#정비성은 현장 복구 경로의 설계다|정비성]]) |

삼성SDS 발표는 품종이나 공정이 바뀌면 다시 학습해야 해 작업 전환이 아직 유연하지 않다는 점을 한계로 든다. 이 한계는 설계 변경이 잦은 공정일수록 자동화의 경제성이 나빠진다는 원가 구조와 같은 방향의 제약이다(해석). 통제된 반복 공정은 고정 자동화가 더 단순하고 안전할 수 있다는 관점은 [[Physical-AI-and-Liquid-Control#판단과 반사를 계층으로 나눈다|판단과 반사의 계층]]에 있다.

## 사례: 삼성SDS의 로보틱스 전환 발표 (2026년 9월 발표 기준)

삼성SDS는 25년간의 제조 자동화(MES, 물류 반송, 설비 자동화)를 기반으로 범용 로봇이 비정형 물리 작업을 맡는 전환을 내세우고, 로봇 운용 플랫폼(fleet 운용과 데이터 플라이휠), 10개사가 참여하는 파트너 생태계와 도입 방법론을 묶어 현장 실증 중이라고 발표했다. 위 준비 조건 표의 단계 구성은 이 발표의 생태계 구성(하드웨어와 지능에 여섯 기술을 더한 구조)을 점검 항목으로 옮긴 것이다.

발표가 근거로 든 수치와 사례 가운데 다음은 1차 자료와 다르거나 1차 자료로 확인되지 않는다.

- 89.4%와 12%를 같은 모델의 시뮬레이션과 실제 가정 결과로 제시했지만, 원 보고서에서는 서로 다른 두 시뮬레이션 벤치마크의 수치다.
- 토트 10만 개 이상 처리를 Amazon 실적으로 적었지만 이를 뒷받침하는 1차 자료는 확인하지 못했다. 같은 수치는 Agility 발표에서 GXO Flowery Branch 물류센터의 Digit 실적으로 나온다.
- BMW 사례를 파일럿이 아닌 유료 상업 배치로 묶었지만 BMW는 완료한 파일럿으로 표현한다. Toyota 북미 공장의 조립 라인 투입은 어느 배치를 가리키는지 발표 자료에 표시가 없다. Agility와 TMMC의 계약을 가리킨다면 보도자료는 제조, 공급망, 물류 작업 지원으로 적고 라인 작업은 검토 대상으로 둔다. 같은 발표의 파트너 소개는 Walden Robotics가 Toyota 북미 공장에서 실제 생산을 수행했다고 적는데 이 주장은 1차 자료로 확인하지 못했다.
- 발표는 2035년 380억 달러와 가격 동등이 확산의 계기라는 주장에 Goldman Sachs를 출처로 붙였다. 함께 제시한 대당 1만 5천~2만 달러 하락에는 출처 표기가 없고, 이 수치와 운용비, 인건비의 동등 시점은 Goldman의 2024 원문에서 찾지 못했다.

## 이해 확인

- 시뮬레이션 벤치마크 두 개의 성공률 차이를 sim-to-real 차이로 읽으면 무엇을 잘못 판단하게 되는가?
- 파일럿, 상업 배치와 RaaS 계약을 비교할 때 표현 대신 확인할 네 가지는 무엇인가?
- 휴머노이드의 가격 동등을 계산할 때 로봇 쪽 원가에 구입가 말고 무엇을 넣어야 하는가?

## 출처

- [AI Index Report 2026, Chapter 2: Technical Performance — Stanford HAI](https://hai.stanford.edu/assets/files/ai_index_report_2026_chapter_2_technical.pdf) — 2026-11-23 장 요약 문구와 2.7절의 RLBench, BEHAVIOR-1K 정의와 수치 대조.
- [Inside the AI Index: 12 Takeaways from the 2026 Report — Stanford HAI](https://hai.stanford.edu/news/inside-the-ai-index-12-takeaways-from-the-2026-report) — 2026-11-23 실제 집안일 12% 요약 문구 확인.
- [BMW Group advances the use of Physical AI in production with Figure 03 project in Spartanburg — BMW Group](https://www.press.bmwgroup.com/global/article/detail/T0458778EN/bmw-group-advances-the-use-of-physical-ai-in-production-with-fig) — 2026-06-25. 2026-11-23 Figure 02의 기간, 작업, 생산 지원 대수, 파일럿 표현과 Figure 03의 후속 작업 대조.
- [Digit Moves Over 100,000 Totes in Commercial Deployment — Agility Robotics](https://www.agilityrobotics.com/content/digit-moves-over-100k-totes) — 2025-11-20. 2026-11-23 현장과 작업 대조.
- [Agility Robotics Announces Commercial Agreement with Toyota Motor Manufacturing Canada — Agility Robotics](https://www.agilityrobotics.com/content/agility-robotics-announces-commercial-agreement-with-toyota-motor-manufacturing-canada) — 2026-02-19. 2026-11-23 파일럿 뒤 RaaS 계약, 배치 목적과 라인 작업 검토 문구 대조.
- [Gartner predicts fewer than 20 companies will deploy humanoids at scale by 2028 — The Robot Report](https://www.therobotreport.com/gartner-predicts-fewer-than-20-companies-will-deploy-humanoids-at-scale-by-2028/) — 2026-01-28 보도. 2026-11-23 이 기사가 전한 Gartner 전망 수치, 이유와 다기능 로봇 관점 확인. Gartner 원문은 HTTP 403으로 열람하지 못해 발표일은 확인하지 못했다.
- [The global market for humanoid robots could reach $38 billion by 2035 — Goldman Sachs](https://www.goldmansachs.com/insights/articles/the-global-market-for-robots-could-reach-38-billion-by-2035) — 2024-02-27. 2026-11-23 시장 규모, 출하 대수와 제조원가 범위 대조.
- [Samsung SDS Robotics Transformation — 삼성SDS REAL Summit 2026 발표 자료, 삼성SDS](https://image.samsungsds.com/kr/real/2026/assets/uploads/sessionPDF/AX%EC%A0%84%EB%9E%B5_1-3_Samsung%20SDS%20Robotics%20Transformation_%EB%B0%B0%EC%88%9C%EB%AF%BC%EC%83%81%EB%AC%B4_%EB%B0%B0%ED%8F%AC%EB%B3%B8.pdf) — 2026년 9월 발표. 현재 한계, 확산 계기, 도입 단계 구성과 회사 사례. 파트너 10개사의 개별 소개는 제품 소개라 옮기지 않았고, Walden Robotics의 Toyota 공장 생산 주장만 미확인으로 적었다.

## 관련 문서

- [[Physical-AI-and-Liquid-Control|피지컬 AI와 리퀴드 제어]]
- [[Robot-Policy-Training-Pipeline|로봇 정책 학습과 평가 파이프라인]]
- [[Robot-Manufacturing-and-Serviceability|로봇 제작과 정비성]]
- [[Digital-Twin|디지털 트윈]] — 투입 전 가상 검증과 가상 시운전
- [[Warehouse-Operations-Simulation|물류센터 운영 시뮬레이션]]
- [[Robotics|로보틱스]]
