---
tags: [palantir, api, metadata, stats]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry local API와 metadata 수집"]
---

# Local API와 metadata workflow

HTTP 성공, 비동기 완료와 데이터 반영은 다르다. 아래는 공식 2024년 code-example의 패턴과 소스 대조 결과이며 실제 runtime이나 내부 service endpoint의 현재 production 지원은 확인하지 않았다. 구현에는 최신 public API/SDK 계약을 우선 대조한다.

## Row count는 queue 후 polling한다

Stats는 RID/branch별 POST로 계산을 시작하며 응답은 resolved view이지 count가 아니다. Batch 조회는 요청 순서대로 결과를 반환한다. 큰 목록을 나누고 미완료만 다시 읽는다. ABSENT/PENDING/RUNNING은 결과 대기, FAILED는 실패다. SUCCEEDED의 rowCount도 wrapper이며 `exactValue.value`는 decimal string이다.

Build stats는 best effort라 build 성공에도 count가 없을 수 있다. Missing count를 0으로 해석하지 않는다. Concurrent build가 있으면 계산한 view와 소비 view도 맞춘다. Schema 집계는 `(name,type)` 쌍으로 하고 RID→path 조회와 Project import reference를 데이터 복제/접근 허가와 혼동하지 않는다.

## 진단과 쓰기의 재시도를 나눈다

Ping은 endpoint 도달성이지 로그인/data 권한이나 전체 건강 증거가 아니다. OSS direct aggregate 예제는 production용이 아닌 debugging으로 명시된다. Accuracy/speed mode와 bucket cap을 검증한다.

Connect retry만으로 HTTP status 오류가 자동 예외가 되지는 않는다. Timeout/status/JSON을 확인하고 response 없는 exception에서 response status를 읽지 않는다. Source에는 `data`/`source_data` 혼용, scheme 누락과 payload/timestamp 문제가 있다. Action 반복 요청의 새 UUID도 업무 재시도 멱등성을 보장하지 않는다. UI network의 legacy payload를 public API 계약으로 사용하지 않는다.

File upload는 원본 binary bytes와 octet-stream 계약을 지킨다. 예제처럼 newline/carriage return을 삭제하면 CSV row 경계가 깨질 수 있다. File path/branch/transaction과 실제 bytes 반영을 확인한다.

## 외부 API 증분은 cursor 수명이다

Credential/EgressPolicy와 previous output cursor/date로 다음 구간을 읽을 수 있다. 그러나 예제는 initial snapshot의 last_date/next_link_url, empty previous output, page 반복과 실패 시 cursor commit을 완성하지 않는다. Paging 설명만으로 전수 수집을 판정하지 않는다.

첫 실행/replay 시작점, 날짜 경계/timezone/late update, 모든 page와 cursor/data의 atomic 저장을 정한다. 응답 전체를 log하지 말고 필요한 식별 상태만 남긴다. Source가 갱신되는 동안 page 사이 누락/중복을 검증한다. `ctx.is_incremental`은 외부 상태 의미를 자동 구현하지 않는다.

## 출처

- [Palantir, Local metadata operations](https://www.palantir.com/docs/foundry/code-examples/dataset-metadata-operations-local-environment)
- [Palantir, Local Foundry API examples](https://www.palantir.com/docs/foundry/code-examples/foundry-apis-local-environment)
- [Palantir, External transform example](https://www.palantir.com/docs/foundry/code-examples/external-transforms-transforms)

## 관련 문서

- [[Palantir-Incremental-Transactions-and-Compaction|증분 상태]]
- [[Palantir-Network-Egress-and-Private-Connectivity|외부 API 접근]]
- [[Palantir-Action-Observability-and-Recovery|Action 복구]]
