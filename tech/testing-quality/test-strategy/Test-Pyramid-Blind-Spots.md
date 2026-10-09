---
tags: [testing, smoke-test, deployment, infra, contract-test]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Test Pyramid Blind Spots", "초록불이 못 잡는 것"]
---

# 초록불이 못 잡는 것 — 테스트의 사각지대

[[Test-Pyramid|테스트 피라미드]]의 각 층이 전부 통과해도 남는 결함 영역. 배포와 인프라 경계, 그리고 서비스 간 계약의 부재.

## 배포, 인프라 경계

유닛 테스트가 전부 통과해도 실제 환경에서 한 건도 동작하지 않을 수 있다. 목을 아무리 정교하게 짜도 검증되지 않는 결함이 배포와 인프라 경계에 있기 때문이다 — 스키마 드리프트와 배포 이미지 파일 누락 같은 마이그레이션 계열 결함(기전은 [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 DB]] 참조), 정규식이 노이즈 있는 실제 데이터에서도 안전한지, 배포 환경변수가 코드가 기대하는 값으로 설정돼 있는지. 이런 결함은 실제 인프라에 붙여 실제 데이터를 한 번 흘려보는 스모크 실행에서만 드러난다. 머지 전 유닛 그린은 로직의 증거일 뿐 동작의 증거가 아니다.

로컬 실행 성공도 마찬가지로 문법 오류가 없다는 확인에 가깝다. 로컬 DB의 열 건과 운영의 수십만 건은 메모리와 성능 특성이 다른 세상이고, 환경 변수와 커넥션 풀 설정 하나로도 동작이 갈린다. 정상 입력 하나(해피 패스)만 확인한 것을 개발 완료라고 부르지 않는다 — 컨테이너로 실행 환경을 맞추고, 모의 데이터를 운영 규모로 쌓고, 제한된 리소스와 네트워크 지연과 동시 요청 아래에서 견디는지까지가 검증이다.

## 계약 부재가 만드는 초록불

서비스나 컴포넌트 간 계약이 없을 때의 전형적 증상: 생산자가 만들지 않는 키를 소비자가 참조하면 폴백만 타는 죽은 코드가 되고, 반대로 생산자가 공들여 만드는 값은 아무도 읽지 않는다 — 양쪽 유닛 테스트는 각자 초록불이다. 소비자가 실제로 읽는 필드가 무엇인지 계약으로 명시해야 이 불일치가 드러난다. 계약 검증의 계층과 도구는 [[Test-Pyramid|테스트 피라미드]]의 Contract Test 절 참조.

## 구현과 기대값이 같은 오해를 공유하는 경우

테스트 오라클은 결과가 맞는지 판정하는 기준이다. 구현의 현재 출력을 그대로 기대값으로 쓰면, 그 출력이 요구사항과 달라도 테스트는 통과한다. AI가 구현과 테스트를 함께 생성할 때도 이 위험을 확인해야 한다.

24개 Java 저장소를 대상으로 한 LLM 오라클 연구에서는 생성된 단언이 의도한 동작보다 실제 구현을 따르는 경향이 관찰됐다. GPT-3.5-turbo, GPT-4o-mini, DeepSeek V3, Codestral을 사용한 실험 범위의 결과이며, 모든 최신 모델이나 언어의 결함 탐지율로 일반화하지 않는다(arXiv:2410.21136v2, 2026-10-05 개정본).

다음은 이 한계를 적용한 검토 절차다.

1. 기대값의 근거를 요구사항, API 계약과 인수 조건에 연결한다. 구현을 다시 설명한 문서만으로 기준을 대신하지 않는다.
2. 경계값과 실패 입력에서 기대 결과를 먼저 계산한다. 예를 들어 무료 배송 조건이 `주문 금액 >= 기준액`이면 기준액 바로 아래, 같은 값, 바로 위를 나누어 확인한다.
3. 별도 검토자가 같은 기준으로 단언을 점검한다. 검토자를 분리했다는 사실이나 서로의 동의만으로 정확성을 보장하지 않는다.

기존 동작을 보존하는 [[Legacy-Code-Testing|특성화 테스트]]는 현재 출력의 기록 자체가 목적일 수 있다. 요구사항 충족 검사와 구분하고, 알려진 오류를 고칠 때는 승인된 새 기대값을 기준으로 삼는다. 에이전트에게 검증을 지시하는 구체적인 실패 패턴은 [[Agent-Test-Verification-Behavior|에이전트 검증 행동]]에서 다룬다.

## 출처
- [Can we find bugs using LLM-generated oracles? — Michael Konstantinou 외, arXiv v2](https://arxiv.org/html/2410.21136v2)
- [유닛 테스트 209개를 통과한 PR인데, 실제로 돌려보니 저장이 한 건도 안 됐다 — velog](https://velog.io/@donghoong2/OCR-WORKER-%EC%9C%A0%EB%8B%9B-%ED%85%8C%EC%8A%A4%ED%8A%B8-209%EA%B0%9C%EB%A5%BC-%ED%86%B5%EA%B3%BC%ED%95%9C-PR%EC%9D%B8%EB%8D%B0-%EC%8B%A4%EC%A0%9C%EB%A1%9C-%EB%8F%8C%EB%A0%A4%EB%B3%B4%EB%8B%88-%EC%A0%80%EC%9E%A5%EC%9D%B4-%ED%95%9C-%EA%B1%B4%EB%8F%84-%EC%95%88-%EB%90%90%EB%8B%A4)
- [테스트는 다 초록불이었다 — 아무도 안 읽는 값이었고, 마스킹도 안 걸릴 뻔했다 — velog](https://velog.io/@donghoong2/OCR-WORKER-%ED%85%8C%EC%8A%A4%ED%8A%B8%EB%8A%94-%EB%8B%A4-%EC%B4%88%EB%A1%9D%EB%B6%88%EC%9D%B4%EC%97%88%EB%8B%A4-%EA%B7%BC%EB%8D%B0-%EC%95%84%EB%AC%B4%EB%8F%84-%EC%95%88-%EC%9D%BD%EB%8A%94-%EA%B0%92%EC%9D%B4%EC%97%88%EA%B3%A0-%EB%A7%88%EC%8A%A4%ED%82%B9%EB%8F%84-%EC%82%AC%EC%8B%A4-%EC%95%88-%EA%B1%B8%EB%A6%B4-%EB%BB%94%ED%96%88%EB%8B%A4)
- [로컬에서만 잘 된다고 말하는 개발자에게 — Team Grit](https://teamgrit.co/article/490)

## 관련 문서
- [[Test-Pyramid|Practical Test Pyramid]]
- [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 데이터베이스]]
- [[Classicist-vs-Mockist-Testing|Classicist vs Mockist, Test Double]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
