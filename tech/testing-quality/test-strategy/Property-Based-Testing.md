---
tags: [testing, property-based-testing, hypothesis, specification]
status: done
verified_at: 2026-10-10
category: "테스트&품질(Testing&Quality)"
aliases: ["Property Based Testing", "속성 기반 테스트", "PBT"]
---

# 속성 기반 테스트

속성 기반 테스트(PBT)는 입력마다 기대값을 나열하는 대신, 정해진 전제에서 성립해야 할 규칙을 쓰고 생성한 여러 입력으로 반례를 찾는다. 입력 생성 전략과 결과를 판정할 속성을 함께 설계한다. 테스트 통과는 탐색한 범위의 증거이며 전체 입력에 대한 수학적 증명이 아니다.

## 예제, 생성 범위와 판정 규칙

예제 테스트는 알려진 경계와 과거 장애를 명시하기 좋다. PBT는 그 밖의 조합을 탐색한다. 둘을 함께 사용하며, 임의 객체를 만드는 [[Test-Fixture|무작위 fixture]]만으로 업무 규칙 검사가 완성되지는 않는다.

다음은 테스트 설계를 위한 예시다. 실제 서비스의 환불 정책을 뜻하지 않는다.

| 계약 | 생성할 입력 | 판정할 결과 |
| --- | --- | --- |
| 다른 거절 사유가 없고 구매 후 0~30일이면 승인 | 기간 안의 경과 일수와 유효한 주문 | 승인 결과 |
| 구매 후 30일을 넘으면 거절 | 기간 밖의 경과 일수 | 거절 결과와 사유 |
| 같은 요청의 재처리가 금액을 중복 차감하지 않음 | 동일 요청을 반복하는 호출 순서 | 잔액과 처리 횟수 |

기간 경계의 포함 여부, 기준 시간대와 부분 환불 조건부터 명세에 확정한다. 29일, 30일, 31일은 명시적 예제로도 남긴다. 생성기가 업무상 중요한 경계를 저절로 알아낸다고 가정하지 않는다. 왕복 변환은 허용한 입력에서 복원 결과를 비교하고, 멱등성은 반환값과 상태 변화 중 무엇이 같아야 하는지 정한다.

## Hypothesis의 입력 탐색과 실패 재현

2026-10-10 공식 문서 기준, Hypothesis에서는 사용자가 strategy로 생성 가능한 입력의 집합을 정하고 라이브러리가 그 안의 분포를 선택한다. 입력 종류를 과도하게 제한하면 버그를 일으키는 값도 탐색에서 빠질 수 있다.

- `max_examples`는 탐색 예산을 조정하는 설정이다. 100개를 실행했다는 사실이 전체 범위를 빠짐없이 검사했다는 뜻은 아니다.
- 실패한 생성 입력은 shrinking으로 단순화해 원인을 살피기 쉽게 만든다. 단순한 반례를 얻은 뒤에도 명세, 테스트와 구현 중 어디가 잘못됐는지 판단해야 한다.
- 로컬 example database는 발견한 실패의 재실행을 돕지만, 라이브러리나 테스트 변경으로 재사용되지 않을 수 있다.
- 반복 실행을 보장할 중요한 입력은 `@example`이나 별도 회귀 테스트로 남긴다. `@example`로 지정한 입력은 shrinking 대상이 아니다.
- `@reproduce_failure`의 blob은 Hypothesis 버전 사이에 안정적이지 않으므로 영구 회귀 사례를 대신하지 않는다.

운영 적용 제안: 실패 입력과 실행 환경을 보존하고, 시간과 외부 상태를 고정해 같은 실패를 재현한다. 구현을 그대로 복사한 판정식이나 예외가 나지 않는지만 확인하는 속성은 의도한 계약을 검증하는지 별도로 검토한다.

## 명세와 테스트를 연결한다

2026-10-10 Kiro 공식 문서의 PBT 통합은 IDE 기능으로 표시된다. EARS 형식 요구사항에서 검사할 속성을 추출하고 관련 요구사항과 작업을 연결한다. PBT 작업은 기본적으로 선택 사항이므로 생성된 작업 목록과 실제 실행 결과를 구분한다.

실패했을 때는 구현 수정, 테스트 수정, 요구사항 보완 중 어느 조치가 맞는지 검토한다. 테스트를 통과시키기 위해 합의한 계약을 자동으로 완화하지 않는다. 외부 서비스나 비결정적 동작에 의존하는 요구는 예제 기반 통합 테스트 등 다른 검증도 필요하다.

## 점검 질문

- 생성 범위에 유효한 경계값과 중요한 상태 조합이 들어 있는가?
- 판정 규칙이 구현 세부 대신 합의한 결과를 검사하는가?
- 실패 반례를 재현하고 회귀 테스트로 남길 수 있는가?
- 요구사항 변경 시 연결된 속성과 테스트를 함께 검토하는가?

## 출처

- [Kiro Docs, Correctness with Property-based tests](https://kiro.dev/docs/specs/correctness/)
- [Hypothesis, Domain and distribution](https://hypothesis.readthedocs.io/en/latest/explanation/domain.html)
- [Hypothesis, Configuring test settings](https://github.com/HypothesisWorks/hypothesis/blob/master/hypothesis/docs/tutorial/settings.rst)
- [Hypothesis, Replaying failed tests](https://hypothesis.readthedocs.io/en/latest/tutorial/replaying-failures.html)

## 관련 문서

- [[Test-Fixture|테스트 픽스처와 무작위 데이터]]
- [[Deterministic-Test|결정적 테스트]]
- [[Agent-Spec-Writing|에이전트 스펙 작성]]
- [[Agent-Test-Verification-Behavior|에이전트의 검증 행동]]
