---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Legacy REST extractor의 상태와 반복 제어

`magritte-rest-v2`는 역사적 legacy plugin 문서다. 신규 REST source의 내장 sync 기능으로 해석하지 않는다. source, call, extractor와 저장 상태를 조합해 API 결과를 dataset으로 옮긴다.

## 요청과 응답

source/auth headers를 분리하고 `authExpiration`을 원본 token 수명 이하로 둔다. 여러 source를 쓰면 call의 source attribute를 명시한다. 기본 유효 status는 200/201/204, retry 기본 0이다.

`body`와 `formBody`는 다른 전송 방식이다. binary 또는 100MB 넘는 응답은 disk cache 경로를 검토한다. responses/rows 처리와 작은 수 MB 응답, 3분 미만의 짧은 streaming 접근은 서로 다른 메모리/시간 조건을 따른다.

## 반복과 상태

pagination/doWhile의 기본 반복 상한은 50이다. `checkConditionFirst`는 처음 조건을 검사하는 while과 최소 한 번 실행하는 do-while의 차이를 만든다. API의 next page와 종료값을 해당 extractor 출력에 연결한다.

iterable parallel 실행은 순서나 state update 순서를 보장하지 않는다. delay나 부작용을 반복 간 순서에 의존시키지 않는다. datePeriod는 day 이상 단위 조건을 따르고 timeOffset의 DateTime/Duration 연산은 DST 조정을 자동 보장하지 않는다.

## extractor와 조건

JSON field가 없거나 null이면 기본 실패이며 별도의 허용 flag가 필요하다. JSON pointer와 wildcard, array의 순서를 구별한다. NDJSON은 마지막 줄과 append 종료 null 조건을 맞춘다.

XML XPath, HTML CSS, regex/substring, status/cookie, array와 Java.lang 기반 cast는 각 입력 형식과 변환 가능 타입을 확인한다. available과 nonempty는 다르며 regex/not/and/binary 조건이 누락값 처리에 미치는 영향을 확인한다. current-time expression은 UTC 기준이다.

실패를 null/빈 배열로 허용하는 옵션은 원본 데이터가 없다는 사실과 같지 않다. 상태가 어느 call 뒤 갱신되는지, retry 시 같은 외부 요청이 반복되는지를 확인한 뒤 checkpoint와 부작용을 설계한다.

## 출처

- [Palantir, magritte-rest-v2](https://www.palantir.com/docs/foundry/available-connectors/magritte-rest-v2)

## 관련 문서

- [[Palantir-Connector-Contracts]]
