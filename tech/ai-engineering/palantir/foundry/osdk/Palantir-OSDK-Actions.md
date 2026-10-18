---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# OSDK Action 실행, validation과 media 연결

Action은 미리 정의된 object/link 생성, 갱신과 삭제를 수행한다. 생성 타입의 parameter shape와 원본 Action submission criteria, user/service-user의 write 권한을 함께 확인한다. SDK compile과 validation-only 성공을 실제 저장 성공으로 보고하지 않는다.

## 언어별 실행 계약

TypeScript2는 client(Action).applyAction(parameters, options), 동일 Action 여러 parameter set은 batchApplyAction을 쓴다. `$validateOnly:true`와 `$returnEdits:true`는 동시에 사용할 수 없다. migration 문서는 실행 validation error가 throw된다고 명시하므로 일반 예제의 edits 분기만으로 모든 실패를 처리한다고 가정하지 않는다.

Python2는 client.ontology.actions와 ActionConfig의 mode/return_edits를 사용하고 response.validation.result를 문자열 VALID와 비교한다. ValidationResult는 enum이 아니라 Literal이다. batch_actions는 별도 BatchActionConfig/BatchApplyActionResponse다.

Java는 generated request builder와 validation visitor, ReturnEditsMode를 사용한다. generic 문서의 일부 parameter/options 설명에 aggregation 표현이 섞여 있으므로 실제 생성 request 타입과 in-platform 문서를 기준으로 한다.

## batch와 오류

세 언어 참조는 batch Action을 all-or-nothing으로 설명한다. 한 항목이 실패하면 batch의 edits가 적용되지 않으며 batch response는 edits이고 개별 validation 목록이 아니다. 이 계약을 서로 다른 batch 호출이나 webhook/외부 시스템까지 포함한 전역 transaction 보장으로 확대하지 않는다.

network timeout으로 결과가 불명확한 mutation은 즉시 같은 요청을 재전송하면 중복 위험이 있다. 원본 Action의 idempotency와 결과 조회를 확인한다. 이는 적용 설계 판단이며 공개 예제에 자동 dedup가 구현됐다는 뜻은 아니다.

## Function과 파일

TypeScript client(Function).executeFunction, Python client.ontology.queries, Java queries().execute().getReturnValue()는 선언된 함수 결과를 반환한다. read Query와 Ontology edit Action을 구분한다.

Python attachment upload는 Attachment instance를 반환한다. 업로드 후1시간 안에 Action이 object attachment property에 쓰지 않으면 content와 함께 삭제된다. 연결 전에는 업로더만 읽을 수 있다. upload 성공과 영구 연결 성공은 별개다.

Java media upload는 backing MediaSet에 먼저 저장한 뒤 반환 Media reference를 Action으로 object property에 연결한다. 다른 MediaSet으로 건너 연결할 수 없다. openStream은 닫아야 한다. Python media의 content/metadata/reference accessor와 TypeScript media reference를 같은 attachment RID API로 간주하지 않는다.

## 출처

- [Palantir, java-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/java-osdk)
- [Palantir, python-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/python-osdk)
- [Palantir, typescript-osdk](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk)
- [Palantir, typescript-osdk-migration](https://www.palantir.com/docs/foundry/ontology-sdk/typescript-osdk-migration)

## 관련 문서

- [[Palantir-OSDK]]
- [[Palantir-OSDK-Authentication]]
- [[Palantir-OSDK-Subscriptions]]
