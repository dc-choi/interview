---
tags: [fit, interview, spacemap, domain]
status: done
category: "Interview - Fit"
company: "스페이스맵 (SpaceMap / 아스트로원)"
aliases: ["SpaceMap STM Domain", "스페이스맵 STM·SSA 도메인 브리프"]
---

# 스페이스맵 STM·SSA 도메인 브리프

> 모든 차수 공통. **핵심 프레임**: 우주 도메인은 학습 대상, **데이터 파이프라인은 전이 자산**. "STM을 공부해보니 결국 *다중 소스 수집 + 무거운 연산 분리 + 시계열 서빙*이라 제 경험과 골격이 같더라"가 면접 톤. ⚠️ 전문가인 척 금지 — 용어는 알되 실제 구조는 역질문으로 되묻기.

## 1. 스페이스맵이 하는 일

- **SDA/STM** (Space Domain Awareness / Space Traffic Management) — 위성·우주물체를 추적·예측해 **충돌 위험을 계산하고 회피 의사결정을 지원**. 항공관제(ATM)의 우주판(단, 직접 통제권은 없고 경보·조정 중심).
- **실시간 정보 서비스** — Safety·Intelligence·Optimization 축으로 민·군 우주자산 운용 지원.
- **'42 Talks'** — 위성 충돌위험 상황을 논의하는 **실시간 협업 플랫폼** (운영자 다자 협업). → 윤회 Hocuspocus 실시간 협업과 동형 구조.
- 미 우주군·우주청 과제, 방산혁신기업 100, AMOS 컨퍼런스 발표(CEO CEO).

## 2. 외워갈 핵심 용어 (자연스럽게 1~2개만 흘리기)

| 용어 | 뜻 |
|---|---|
| **TLE** (Two-Line Element) | NORAD 표준 궤도요소 포맷. **SGP4** 해석적 전파기와 함께 사용. 정밀도 낮으나 보편적 |
| **Ephemeris** | 시간별 정밀 위치·속도 상태벡터 (CCSDS OEM 표준). 시계열 데이터 |
| **OD** (Orbit Determination) | 관측(레이더·광학)으로 궤도 추정. 최소자승 / 칼만필터 |
| **Propagation** | 미래 위치 예측. **SGP4**(해석·빠름·저정밀) vs **수치전파**(중력·대기항력·SRP 힘모델, 정밀·고비용 CPU 바운드) |
| **Conjunction Screening** | 카탈로그 전 객체쌍 근접 스크리닝. 순진하면 **O(N²)** → 필터로 프루닝 |
| **CDM** (Conjunction Data Message) | CCSDS 충돌 이벤트 메시지 — **TCA**(최근접시각)·miss distance·공분산·**Pc** |
| **Pc** (Probability of Collision) | miss distance + 결합 공분산으로 산출. 임계(예 1e-4) 초과 시 회피기동 검토 |
| **Catalog** | 추적 객체 카탈로그 (공개 ~수만 개, 메가컨스텔레이션·파편으로 급증) |
| **space-track.org** | 美 우주군 공개 카탈로그. 상용(LeoLabs 등)·자체 센서·운영자 ephemeris도 소스 |

## 3. STM 데이터 흐름 = 수집·처리 파이프라인 (= JD 정중앙)

```
다중 소스(레이더/광학/space-track/운영자)  →  수집 어댑터  →  큐 버퍼
  → OD/전파 워커(CPU 바운드, 무거움)  →  충돌 스크리닝(O(N²) 프루닝)
  → Pc 계산 → conjunction 이벤트  →  ① 서빙 API  ② 임계초과 경보  ③ 42 Talks 협업
원천(append-only 시계열) + 카탈로그(객체별 최신 상태) 저장 분리
```

## 4. ⭐ 본인 경험 → STM 매핑 (면접 핵심 무기)

| STM 단계 | 성격 | 내 카드 |
|---|---|---|
| 관측·TLE·CDM 다중 소스 수집 | 이질 소스·시계열·append-only | **다중 소스 어댑터**(시솔 15개 택배사 통합), IoT 다중 디바이스 수집. **멱등성 키(객체ID+epoch)로 중복 관측 차단** |
| 궤도 전파·충돌 스크리닝 | **CPU 바운드·O(N²)·무거움** | **EventBridge/SQS 워커 분리** + CPU 바운드 별도 워커풀 + **큐 깊이 기반 오토스케일** + 백프레셔. (Tech-JD #5 그대로) |
| 카탈로그(객체별 최신 상태) | 조회 핫패스 | **복합 인덱스 `(object_id, epoch DESC)` 1탐색** — IoT `(device_number, created_at)` 99.3% 카드 동형 |
| ephemeris 이력 | 대용량 시계열 | append-only + **BRIN 인덱스·파티셔닝**(PostgreSQL). Tech-JD #3 |
| Pc·conjunction 서빙 + 경보 | 읽기 최적화 + 알림 | Read Replica·REST + **임계 초과 시 알림**(트라이포드 IoT 이상징후 알림톡/이메일 = conjunction 경보와 동형) |
| 42 Talks 실시간 협업 | 다자 실시간 | 이벤트 아키텍처로 연결 (실시간 pub/sub는 약점 — 솔직 인정 + 학습) |
| 충돌 경보 신뢰성 | "조용히 틀리면 위성 손실" | **Grafana SLO 관측**, 정합성 우선. B2G/방산 신뢰성 직결 |

## 5. 예상 질문 + 답변 골격

**Q. 위성 충돌 위험을 실시간 계산하는 파이프라인을 설계한다면?**
> 가정 명시 → "카탈로그 N개, 관측이 다중 소스에서 시계열로 유입, 스크리닝 주기가 있다고 가정." → 수집 어댑터 → 큐 → **전파·스크리닝 워커(CPU 바운드 분리)** → Pc → 임계초과 conjunction 이벤트 → 서빙·경보. → 되묻기: "실제 카탈로그 규모와 스크리닝이 배치인지 실시간 스트림인지 궁금합니다." (트라이포드 IoT 파이프라인이 같은 골격)

**Q. 수만 개 객체 전수 비교는 O(N²)인데?**
> 1차 **apogee-perigee 필터**로 궤도 고도 안 겹치는 쌍 제거 → 시간窓·공간 분할(공간 그리드/인덱싱)로 후보 축소 → 남은 후보만 정밀 Pc 계산 → 분산 워커 병렬. "전수 계산을 줄이는 프루닝 + 무거운 연산 워커 분리"가 핵심.

**Q. 관측이 늦게 도착하면(late arrival)?**
> 시계열 공통 이슈. **이벤트 시각(epoch) 기준 처리 + 워터마크**, 늦은 관측은 OD 재실행 트리거. (Tech-JD #5 late arrival 답변 재사용)

**Q. 데이터 정합성이 왜 그렇게 중요한가?**
> 충돌 경보 **오탐 = 불필요한 연료 소모 회피기동 / 미탐 = 위성 손실**. 둘 다 치명. "조용히 틀리면 안 되는" 도메인이라 멱등성·정합성·감사 추적을 수집 단계부터.

## 6. 회사 특이 역질문 (STM 실체 확인)

- 추적 **카탈로그 규모**(객체 수)와 관측 소스 — 자체 센서인가요, space-track·상용 데이터인가요?
- 충돌 스크리닝은 **정기 배치**인가요 **실시간 스트림**인가요? 주기는?
- 가장 무거운 연산은 — **수치 궤도전파**인지, 스크리닝인지, Pc 계산인지?
- 전파 엔진은 자체 구현인가요, 오픈소스(Orekit 등)인가요? SGP4만인가요 수치전파도?
- **Python ↔ TypeScript 역할 분담** — 연산은 Python, 서빙·42 Talks는 TS 식인가요?
- 데이터 저장은 시계열 DB인지 PostgreSQL인지 — ephemeris 이력은 어떻게 보관하나요?

## 7. 톤 주의

- **STM 전문가인 척 X**. "공부해보니 골격이 제 파이프라인 경험과 같더라" 프레임.
- 우주 물리(궤도역학 수식)는 모르면 솔직히 — **"연산 엔진의 정확성은 도메인 전문가 영역, 저는 그 연산을 안정적으로 수집·분산·서빙하는 백엔드를 책임지겠다"**.
- 용어는 흘리되 과시 X. 1~2개 자연스럽게(conjunction screening·Pc·시계열 catalog).

## 관련 문서

- [[Interview-Prep-SpaceMap-1st|1차 면접 TOC]] · [[Interview-Prep-SpaceMap-Tech-JD|JD 기반 기술 질문 #5 파이프라인]] · [[Interview-Prep-SpaceMap-Cheatsheet|치트시트]]
</content>
