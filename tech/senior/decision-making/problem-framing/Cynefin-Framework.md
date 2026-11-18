---
tags: [senior, decision-making, problem-framing, cynefin, complexity, sense-making]
status: done
category: "Senior - 의사결정"
aliases: ["Cynefin Framework", "Cynefin", "커네빈", "커네빈 프레임워크", "문제 유형 판별", "Complicated vs Complex"]
---

# Cynefin 프레임워크 — 방법을 고르기 전에 상황의 종류를 가린다

맞는 방법도 다른 종류의 문제에 쓰면 실패한다. 런북으로 끝날 고장에 실험을 설계하거나, 사람과 관계가 얽혀 적응하는 문제에 체크리스트를 들이미는 식이다. Cynefin(커네빈)은 Dave Snowden이 1999년 IBM Global Services에서 시작한 의사결정 지원 프레임워크로, 행동을 고르기 전에 지금 어떤 종류의 상황에 서 있는지를 가리게 한다. Cynefin은 환경과 경험의 여러 얽힌 요인을 뜻하는 웨일스어다.

## 다섯 영역

| 영역 | 원인과 결과 | 접근 순서 | 실천 | 예 |
|---|---|---|---|---|
| Clear(명확, 초기 이름 simple, 이후 obvious) | 분명하다. X를 하면 Y를 기대할 수 있다 | 감지 → 분류 → 대응 | 모범 사례(best practice) | 런북이 있는 알려진 오류, 정해진 배포 절차 |
| Complicated(난해) | 분석이나 전문 지식이 필요하고 맞는 답이 여럿이다 | 감지 → 분석 → 대응 | 좋은 실무(good practice) | 느린 쿼리의 실행 계획 분석, 세무와 계약 검토 |
| Complex(복잡) | 지나고 나서야 추론할 수 있고 정해진 정답이 없다 | 탐색 → 감지 → 대응 | 창발적 실천(emergent practice) | 신제품의 시장 반응, 팀 문화의 변화, 정체된 경력 |
| Chaotic(혼돈) | 사후에도 추론하기 어렵다 | 행동 → 감지 → 대응 | 새로운 실천(novel practice) | 전면 장애나 보안 침해가 번지는 중 |
| Confusion(혼란, 초기 이름 disorder) | 어느 영역에 속하는지 모른다 | 상황을 쪼개 부분마다 나머지 네 영역에 배정 | 없음 | 판별하기 전의 모든 문제 |

## 판별 질문

1. **체크리스트로 해결되는가:** 그렇다면 Clear다. 이미 있는 답을 적용하고 넘어간다. 창의성을 발휘할 곳이 아니다.
2. **체크리스트로는 안 되지만 전문가는 답을 낼 수 있는가:** Complicated다. 분석을 사거나 빌린다. 혼자서는 어려워도 알 수 있는 문제다.
3. **전문가도 추측만 할 수 있고, 대상이 순환하고 적응하며 반응하는가:** Complex다. 완성된 해법을 계획하는 대신, 실패해도 안전한(safe-to-fail) 작은 실험 몇 개를 설계해 검토일을 두고 움직임을 만든 것을 키운다. 왜 효과가 있었는지 끝내 모른 채 효과 있는 실험만 남는 것도 이 영역에서는 정상적인 결말이다.
4. **지금 불타고 있는가:** Chaotic이다. 분석보다 안정화가 먼저다. 어떤 행동이든 먼저 해 피해를 멈추고 질서를 세운 뒤 무슨 일이 있었는지 정리한다([[Incident-Commander|장애 대응 리딩]]).

판별을 건너뛰면 자기에게 익숙한 방식을 모든 문제에 쓰게 되기 쉽다. 반복되는 문제 몇 개에 같은 방식(더 촘촘한 계획, 더 많은 노력)을 쓰고 있었다면 판별부터 다시 한다. 문제 하나에 영역이 섞여 있으면 부분으로 쪼개 따로 판별한다.

## Clear와 Chaotic 사이의 절벽

Snowden과 Boone(2007)은 성공이 안주를 낳으면 Clear 영역에서 Chaotic 영역으로 파국적으로 떨어질 수 있다고 본다. 두 영역의 경계는 완만한 경사가 아니라 접힘(fold)으로 그려진다. 오래 문제없던 수동 운영 절차, 아무도 다시 보지 않는 의존성처럼 일상 업무로 취급해 온 영역은 경고 없이 무너질 수 있으므로, 잘 돌아가는 절차도 주기적으로 전제를 점검한다.

## 시스템 사고와의 관계

루프, 저량, 지연과 원형으로 구조를 그리는 [[Systems-Thinking|시스템 사고]] 도구는 사람과 지연이 얽혀 적응하는 Complex 영역의 반복 문제를 읽는 데 특히 쓸모 있다. 원인이 분명한 고장에는 과하고 체크리스트가 더 빠르다. 실험의 강도를 확신과 위험으로 정하는 방식은 [[Problem-Discovery#구현 강도는 확신과 위험으로 정한다|문제 발견의 구현 강도]], 되돌릴 수 있는지로 결정 속도를 나누는 방식은 [[One-Way-vs-Two-Way-Door|가역성 기반 의사결정]]과 함께 쓴다.

## 한계

- 공식 설명은 Cynefin을 방법이나 모형이 아닌 의사결정 지원 프레임워크로 두고, 영역을 사분면으로 보는 것을 오해로 꼽는다. 축이 있는 2x2 분류표처럼 쓰면 원래 의도와 어긋난다.
- 어렵고 혼란스럽다, 더 엄밀한 기초가 필요하다, 다루는 맥락이 좁다, known, knowable, sense, categorize 같은 용어가 모호하다는 비판이 있다.
- 영역 이름이 판마다 바뀌어(simple에서 obvious를 거쳐 clear, disorder에서 confusion) 자료마다 표기가 다르다.
- 판별은 그 시점의 해석이다. 이해가 쌓이면 같은 문제가 Complex에서 Complicated로 옮겨 갈 수 있다.

## 체크포인트

- [ ] 방법을 고르기 전에 이 문제가 어느 영역인지 물었는가
- [ ] Complex 문제에 완성된 계획과 확정 일정을 요구하고 있지 않은가
- [ ] 실험마다 검토일과 증폭, 중단 조건이 있는가
- [ ] 불타는 상황에서 분석보다 안정화를 먼저 하는가
- [ ] 오래 문제없던 Clear 영역의 절차와 전제를 주기적으로 점검하는가

## 출처

- [YouTube, Ideas To Thrive, Think In Systems: The Skill Most People Never Learn (Full Course)](https://www.youtube.com/watch?v=t1xKo4spo3s) — 2026-08-06 공개, 2026-11-18 음성 인식 전사 전체 확인. 체크리스트, 전문가, 실험, 안정화의 네 판별 질문과 절벽 비유의 출처. 전사의 Sinophon, cinephan은 Cynefin으로 교정
- [Cynefin framework — Wikipedia](https://en.wikipedia.org/wiki/Cynefin_framework) — 2026-11-18 기원(1999, IBM Global Services), 영역별 인과와 접근, 실천 유형, 명칭 변경, 접힘과 안주, Snowden과 Boone(2007)의 safe-to-fail 실험 인용, 비판 대조
- [About the Cynefin framework — The Cynefin Company](https://thecynefin.co/about-us/about-cynefin-framework/) — 2026-11-18 이름의 뜻과 sense-making 설명 대조. 영역 이름과 접근 순서는 이 페이지에 없었다
- [Cynefin — Cynefin.io](https://cynefin.io/wiki/Cynefin) — 2026-11-18 의사결정 지원 프레임워크라는 정의, 사분면 오해, 1999년 첫 언급 대조
- [A Leader's Framework for Decision Making — Harvard Business Review, David J. Snowden, Mary E. Boone](https://hbr.org/2007/11/a-leaders-framework-for-decision-making) — 2007년 11월호. 2026-11-18 서지만 확인했고 본문은 열람하지 못해 Wikipedia의 인용으로 대조

## 관련 문서

- [[Systems-Thinking|시스템 사고의 기본 어휘]] — Complex 영역의 반복 문제를 그리는 도구
- [[System-Archetypes|시스템 원형]] — Complex 영역에서 자주 나타나는 구조
- [[Problem-Discovery|문제 발견]] — 확신과 위험에 따른 구현 강도
- [[One-Way-vs-Two-Way-Door|One-Way vs Two-Way Door]] — 가역성에 따른 결정 속도
- [[Incident-Commander|장애 대응 리딩]] — Chaotic 상황의 안정화 우선
- [[Problem-Response-Patterns|문제 대응의 세 가지 패턴]] — 조치 뒤의 실제 결과 분류
- [[Planning-Under-Uncertainty|불확실성 아래의 계획]] — 완성된 계획을 기다리지 않는 개인 계획
