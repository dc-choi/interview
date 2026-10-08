---
tags: [senior, communication, culture, psychological-safety, failure, experimentation]
status: done
category: "Senior - 커뮤니케이션"
aliases: ["Failure Tolerant Culture", "실패에 관대한 문화", "심리적 안전", "Loon Shots", "빠른 실패"]
---

# 실패에 관대한 문화와 심리적 안전

새로운 시도를 두려움 없이 할 수 있는 환경은 빠른 실험과 학습의 전제다. **실패 자체가 아니라 실패에서 무엇을 배웠는지에 초점**을 두고 그 배움을 공유해 같은 실패가 반복되지 않게 한다. 그리고 이런 문화는 비난하지 않는 것만으로는 만들어지지 않는다.

## Loon Shots — 홀대받는 시도가 문샷을 만든다

초기에는 타당성이 약해 보이는 아이디어(Loon Shot)도 작은 보호 공간과 검증 기회를 주지 않으면 가치가 드러나기 전에 사라질 수 있다. 시도 횟수가 큰 성공을 보장하는 것은 아니므로 가설, 영향 범위, 중단 기준과 학습을 함께 둔다. 가역적 시도를 작게 내리는 의사결정은 [[One-Way-vs-Two-Way-Door|되돌릴 수 있는 문]].

## 비난 안 하기를 넘어 — 적극적 액션

대부분의 사람은 실패를 장려받기보다 추궁당하며 살아왔다. 그래서 비난하지 않는다는 소극적 태도만으로는 실패를 두려워하지 않는 문화가 생기지 않는다. 적극적 액션이 필요하다.

- **실패 공유 의식**: 자신의 실패 사례를 전사에 공유하는 행사(Failure Party 류)로 우리는 실패에 관대하다를 가시적으로 알린다.
- **반복된 메시지**: 리더와 문화 담당이 실패해도 괜찮다를 꾸준히 말로 새긴다.
- **배움의 추출**: 실패에서 배운 것을 기록, 공유해 재발을 막는다 — 비난 없는 회고(blameless postmortem)와 같은 축 ([[Engineering-Influence|엔지니어링 영향력]]).

## 실패를 허용한다는 말의 경계

실패를 허용한다는 말은 예방할 수 있었던 위험을 무시하거나 같은 사고를 반복해도 된다는 뜻이 아니다. 운영 사고와 가역적 실험을 구분하고 각각의 안전장치를 둔다.

- 운영 사고는 영향, 대응, 기여 원인과 재발 방지 행동을 비난 없이 기록한다.
- 실험은 가설, 성공과 중단 기준, 영향 범위와 롤백 방법을 시작 전에 정한다.
- 사람의 주의력에만 기대지 않고 설계, 도구와 절차를 고쳐 같은 조건의 재발 가능성을 낮춘다.
- 후속 행동에는 담당 범위와 확인 방법을 붙이고 실제 완료 여부까지 추적한다.

첫째, 셋째, 넷째 항목은 Google SRE의 비난 없는 포스트모템 원칙, 특히 기여 원인과 action item 및 시스템 개선을 참고했다. 둘째 항목은 작은 범위 노출, 평가와 롤백을 함께 두는 canary 배포 원칙을 일반 실험의 점검 항목으로 옮긴 것이다.

## 문화의 관성 — 설립부터, 그리고 비싸다

기존 보상, 평가와 발언 규범은 새 문화 메시지보다 오래 남을 수 있어 중간 전환에는 추가 비용이 든다. 다만 모든 조직에서 처음부터 만드는 편이 항상 쉽다고 단정하지 않는다. 현재 행동을 강화하는 제도를 확인하고, 리더의 말뿐 아니라 회의, 평가와 사고 대응 방식까지 일관되게 바꾼다.

## 심리적 안전 — 위계와 네임밸류를 낮추기

실패를 드러내고 의견을 내고 도전하려면 **심리적 안전(psychological safety)**이 깔려야 한다. 내가 못하는 사람으로 보일까, 이 말을 해도 될까 하는 걱정이 크면 입을 닫는다.

- 개인의 자신감은 챌린지와 피드백 참여에 영향을 줄 수 있지만, 질문과 우려 제기는 숙련도나 현재 성과와 무관하게 안전해야 한다. 심리적 안전을 개인이 1인분을 증명한 뒤 얻는 자격으로 만들지 않는다.
- 하드스킬 편차로 생긴 위계, 네임밸류에 대한 오해(유명함과 실력은 별개)는 안전감을 깎는다. 이를 낮추는 적극적 장치가 필요하다 — 실패를 캐주얼하게 공유하는 자리, 위계를 평평하게 만드는 활동.
- 문제 제기 자체를 기여로 인정하는 문화와 같은 뿌리다 ([[Team-Contribution-Culture|팀 기여 문화]], [[Toxic-Org-Detection|독성 조직 판별]]). 안전한 1:1 경청도 그 토대다 ([[Trusted-Advisor-Listening|신뢰받는 조언자의 경청]]).

## 침묵을 해석하고 발언을 요청하는 방법

회의에서 반대 의견이 나오지 않았다는 사실만으로 모두 동의했거나 문제가 없다고 판단하지 않는다. 무능하거나 부정적인 사람으로 보일까 걱정해 질문과 우려를 숨길 수 있고, 말하지 않은 정보는 리더에게 관측되지 않는다. 반대로 말수가 적다는 사실만으로 안전감 부족을 확정할 수도 없다. Google의 팀 연구에서는 외향성이 팀 효과성과 유의하게 연결되지 않았으며, 이 결과를 다른 조직에 그대로 일반화할 수는 없다.

리더가 먼저 할 행동은 다음과 같다.

1. 업무에 아직 모르는 부분이 있으며 함께 배워야 한다는 맥락을 설명한다.
2. 자신의 판단도 틀릴 수 있음을 인정하고 구성원의 관찰과 질문을 요청한다.
3. 다른 의견을 제시하거나 실수를 드러낸 사람을 망신 주거나 처벌하지 않는다. 품질 기준과 수행 책임은 별도로 분명하게 유지한다.

적용 예시로 설계 검토에서 빠진 위험과 아직 확인하지 못한 가정을 묻고, 제기된 우려를 검증할 항목으로 정리할 수 있다. 목표는 발언량을 늘리는 것이 아니라 판단에 필요한 정보가 안전하게 드러나게 하는 것이다. 이 예시는 학습 문제로 업무를 설명하고 질문을 요청하는 원칙을 설계 검토에 적용한 방법이다.

## 시니어, 리더 체크포인트

- 실패를 추궁하는가, 배움을 추출, 공유하는가
- 비난 안 함에 그치는가, **적극적 의식**(공유 행사, 반복 메시지)이 있는가
- 위계, 네임밸류로 입을 닫게 만드는 요인이 있는가
- 리더 본인이 실패를 먼저 드러내는가
- 시도의 빈도를 막는 절차, 분위기가 없는가
- 침묵을 동의로 간주하지 않고 미확인 가정과 우려를 구체적으로 요청하는가
- 운영 사고와 가역적 실험을 구분하고 각각 재발 방지와 중단 기준을 두는가

## 관련 문서

- [[One-Way-vs-Two-Way-Door|되돌릴 수 있는 문 vs 없는 문]] — 빠른 실패의 의사결정
- [[Engineering-Influence|엔지니어링 영향력]] — 비난 없는 회고
- [[Team-Contribution-Culture|팀 기여 문화]] — 문제 제기자를 비판하지 않음
- [[Toxic-Org-Detection|독성 조직 판별 프레임]] — 안전을 깨는 신호
- [[Trusted-Advisor-Listening|신뢰받는 조언자의 경청]] — 심리적 안전의 1:1 토대
- [[Burnout-Sustainable-Pace|번아웃과 지속 가능한 페이스]] — 닫힌 입을 여는 안전
- [[DRI-Delegation-Culture|DRI와 권한 위임 문화]] — 실험과 짝을 이루는 위임
- [[Org-Scaling-Culture-Dilution|조직 급성장과 문화 희석]] — 규모가 키우는 안전감 하락

## 출처

- [Leading in Tough Times: HBS Faculty member Amy C. Edmondson on Psychological Safety — Harvard Business School](https://www.hbs.edu/recruiting/guides-and-stories/leading-in-tough-times)
- [Understand team effectiveness — Google re:Work](https://rework.withgoogle.com/intl/en/guides/understand-team-effectiveness)
- 실패에 관대한 문화와 심리적 안전 — 개인 블로그 회고
- 사피 바칼, 룬샷(Loon Shots) — 도서
- [Google SRE Book, Postmortem Culture: Learning from Failure](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE Workbook, Postmortem Culture: Learning from Failure](https://sre.google/workbook/postmortem-culture/)
- [Google SRE Workbook, Canarying Releases](https://sre.google/workbook/canarying-releases/)
