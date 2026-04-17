---
tags: [senior, decision-making, framework, amazon, career]
status: done
category: "시니어역량(SeniorEngineer)"
aliases: ["One-Way vs Two-Way Door", "One way door vs Two way door", "아마존 의사결정 프레임"]
---

# One-Way Door vs Two-Way Door

"되돌릴 수 있는가"를 축으로 의사결정을 분류하는 프레임워크. Jeff Bezos가 2015년 주주 서한에서 제시했고, 지금은 Amazon의 주요 경영 원칙 중 하나. **빠른 실험과 신중한 결정을 구분해** 조직이 민첩성과 안정성을 동시에 갖게 한다. 개인 커리어 결정에도 그대로 적용된다.

## 두 문의 정의

| 축 | One-Way Door | Two-Way Door |
|---|---|---|
| 되돌림 | 불가·어려움 | 시도 후 복구 가능 |
| 실패 비용 | 큼 — 조직·사람·사용자에 장기 영향 | 작음 — 학습 후 원상 복구 |
| 의사결정 속도 | **신중·느리게** | **빠르게** |
| 의사결정 주체 | 상위 리더십 합의 | 실무자·팀 단위 |
| 예시 | 기업 매각·아키텍처 전면 교체·정책 변경 | 기능 베타 런칭·A/B 테스트·새 프로세스 실험 |

## 핵심 원칙

1. **대부분의 결정은 Two-Way Door** — 보수적으로 보면 One-Way처럼 보이는 것도 실제로는 복구 가능한 경우가 많다
2. **Two-Way Door를 One-Way처럼 다루면** — 조직은 느려지고 실험이 사라져 혁신 정체
3. **One-Way Door를 Two-Way처럼 다루면** — 회복 불가 손실. 특히 보안·인프라·브랜드
4. **판별 실수의 비용은 비대칭** — Two-Way를 늦게 결정하는 비용 < One-Way를 급히 결정하는 비용. 따라서 **불확실하면 One-Way로 가정**

## 판별 체크리스트

아래 질문에 **하나라도 Yes면 One-Way** 성격이 강해짐.

- 결정을 되돌리는 데 6개월+ 걸리는가?
- 외부 공개가 동반되어 되돌림이 브랜드·신뢰를 훼손하는가?
- 사용자 데이터·스키마·법적 계약이 영구 영향을 받는가?
- 되돌림 비용이 **연간 예산의 10% 이상**인가?
- 인력 대규모 투입·해고가 수반되는가?
- 레거시 시스템이 앞으로 **수년간 호환성**을 강요하는가?

모두 No면 Two-Way. **빨리 시작하고, 돌면서 배우는 편이 낫다**.

## Two-Way Door 확장 기법

"One-Way처럼 보이는 결정을 Two-Way로 재설계"하는 기법들.

### 가역적 설계

- **Feature Flag** — 배포 후에도 on/off로 실험 중단
- **Blue-Green·Canary** — 트래픽 전환으로 롤백 초단위
- **Shadow Traffic** — 프로덕션에 영향 없이 신 시스템 검증
- **Expand-Contract 스키마 변경** — DB 변경을 여러 배포로 쪼개 호환 유지 ([[Blue-Green]])

### 범위 축소

- 전사 전환 대신 **한 팀·한 지역·한 고객 세그먼트**부터
- 대규모 리팩터링 대신 **Strangler Fig 패턴**으로 점진 교체
- 6개월 프로젝트를 **2주 스프린트 + 체크포인트**로 쪼개기

### 빠른 검증

- **프로토타입·목업**으로 핵심 가설만 먼저 검증
- **User Research·설문·인터뷰**로 런칭 전 리스크 제거
- **A/B 테스트**로 일부 사용자에게만 노출

## 조직 레벨 적용

### 의사결정 속도 분리

- Two-Way: **Disagree and Commit** — 리더가 동의 안 해도 팀이 진행하게 허용
- One-Way: **Disagree and Escalate** — 합의까지 확장, 상위 승인 필수

### 역방향 신호

- "모든 결정에 전사 승인" = 조직이 Two-Way도 One-Way로 다루는 중
- "베타 기능이 한 번에 배포" = One-Way를 Two-Way처럼 다루는 중
- 둘 다 비건강 신호. 의사결정 경로 재설계 필요

## 커리어 결정에 적용

한기용 특강에서 강조된 포인트. 커리어의 많은 결정이 One-Way처럼 보이지만 실제로는 Two-Way.

### Two-Way로 볼 수 있는 것

- **첫 직장 선택** — 2~3년 후 옮길 수 있음
- **직무 전환** (개발↔기획, 백엔드↔데이터 등) — 실리콘밸리 회사는 내부 이동 흔함
- **해외 취업 시도** — 실패해도 국내 복귀 가능
- **기술 스택 선택** — 3~5년 주기로 바뀜
- **공부 vs 실전** — 공부하다 실전으로, 실전하다 공부로 전환 가능

### One-Way로 신중해야 할 것

- **평판을 깎는 퇴사 방식**(무단 퇴사·비방·IP 무단 반출)
- **법적·세금·비자 관련 계약**
- **큰 금융 결정**(스톡옵션 행사, 대출, 퇴직금 소진)
- **건강·관계 포기** — 돈·커리어로 회복 어려움

### 실용 원칙

- "내가 원하는 것을 하는지" 우선. Two-Way 결정은 **빨리 시작**
- 시작점이 종착역이 아니라는 점을 기억
- **99번 실패해도 1번만 붙으면 됨** — 이력서 제출·면접 시도 대부분 Two-Way
- 30% 기준만 채우고 JD 지원, 피드백으로 성장

## 실전 사례

- **아마존 AWS 서비스 출시** — 대부분 Two-Way로 분류해 **빠르게 베타 → 피드백 기반 개선** 사이클
- **신기능 런칭** — Feature Flag로 감싸서 Two-Way 성격 부여
- **조직 개편** — 연단위 One-Way 결정이지만, 파일럿 팀·기간 제한으로 Two-Way 요소 삽입
- **기술 부채 해소** — 전면 교체는 One-Way, Strangler Fig로 점진 교체는 Two-Way

## 흔한 함정

- **Two-Way를 무한 분석하다가 타이밍 놓침** — 빨리 시도하는 게 곧 학습
- **One-Way를 Two-Way처럼 대충 결정** — 장기 손실이 가장 큰 실수
- **판별 자체를 건너뜀** — 모든 결정을 같은 속도로 처리 → 속도와 신중함 둘 다 놓침
- **조직이 자주 "전사 합의"** — 실제 Two-Way가 많은데도 관료주의화

## 면접 체크포인트

- One-Way vs Two-Way의 한 문장 구분
- Two-Way를 One-Way처럼 다룰 때 조직이 치르는 비용
- Feature Flag·Blue-Green·Expand-Contract가 One-Way를 Two-Way로 전환하는 메커니즘
- "Disagree and Commit" vs "Disagree and Escalate" 적용 기준
- 커리어 결정에서 Two-Way로 재해석 가능한 예시 3가지 이상

## 출처
- Jeff Bezos — 2015 Amazon Shareholder Letter
- [[Han-Keeyong-Career-Seminar|한기용 특강 — 커리어 결정에의 적용]]

## 관련 문서
- [[Tech-Decision|기술 의사결정]]
- [[Architecture-Decision-Making|아키텍처 의사결정과 경제적 관점]]
- [[Blue-Green|Blue/Green 배포]]
- [[Legacy-Modernization-Strategies|레거시 현대화 전략]]
- [[RFC-Writing|RFC 작성]]
- [[Feature-Flag|Feature Flag 시스템]]
