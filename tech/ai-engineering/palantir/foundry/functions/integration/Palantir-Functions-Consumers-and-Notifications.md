---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Workshop, Pipeline Builder와 알림의 함수 사용

## 같은 함수라도 소비자의 계약이 다르다

Workshop function-backed variable은 의존 변수 변경에 따라 재계산하지만 같은 입력 결과를 cache할 수 있다. 데이터만 바뀐 경우 자동으로 새 결과가 된다고 가정하지 않고 recompute 설정/이벤트를 확인한다. 함수 기반 table column은 객체를 key로 하는 map이며 custom struct로 여러 컬럼을 돌려줄 수 있다.

Deployed Python은 repository 한 버전만 실행한다. v0/v1 함수를 한 release에 같이 담아 소비자를 점진 이동할 수 있지만 새 deployment 버전으로 바꾸는 시점의 중단과 모든 소비자 참조 갱신은 별도로 필요하다. Running/Stopped/Upgrading 상태를 먼저 확인한다.

Automate Function effect는 비동기 최대 4시간을 지원하지만 edit 배열을 반환해도 Ontology에 적용하지 않는다. 변경이 필요하면 Action 경계를 사용한다. Slate의 로컬 JavaScript function과 Foundry function은 다른 기능이며, Quiver에서는 지원되는 object set/plot/value/time-series 결과 계약을 선택한다.

## Pipeline Builder Python UDF

Python UDF는 sidecar에서 행마다 실행한다. DataFrame 전체를 인자로 받거나 반환하지 않는다. scalar 또는 struct 반환이 새로운 컬럼이 되며 struct는 후속 field extraction으로 나눈다. Ontology 타입 입력/출력 함수는 import 목록에 나타나지 않을 수 있다.

UDF에서 FoundryClient/OSDK로 Ontology를 직접 조회하면 EnvironmentNotConfigured가 발생한다. 빌드 사이 데이터 통제 누락을 막는 경계다. 필요 데이터는 dataset join으로 공급하거나 적절히 허용한 external source로 연결한다. source는 pipeline code import 설정이 필요하다. 일반 함수 preview 권한을 UDF로 옮겼다고 가정하지 않는다.

## 알림

함수는 수신자와 notification 내용을 계산한다. 실제 전송은 Action의 알림 효과가 맡는다. platform 요약, email의 headless HTML, URL/object/RID link target을 구분한다. Python의 Notification object-type generic과 User/Group/Principal 계약도 맞춘다.

개발 preview는 수신자의 실제 권한을 모두 검사하지 않으므로 성공해도 Action 전송에서 실패할 수 있다. 수신자 ID를 데이터에서 찾는 것과 전달할 본문을 수신자가 볼 수 있는지는 별도 검사다.

## 출처

- [Palantir, use-functions](https://www.palantir.com/docs/foundry/functions/use-functions)
- [Palantir, python-functions-workshop](https://www.palantir.com/docs/foundry/functions/python-functions-workshop)
- [Palantir, python-functions-builder](https://www.palantir.com/docs/foundry/functions/python-functions-builder)
- [Palantir, configure-notifications](https://www.palantir.com/docs/foundry/functions/configure-notifications)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
