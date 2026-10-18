---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Live inference v2의 인증, JSON shape와 오류

direct/objective live inference는 POST HTTP API이며 v2 multi-I/O를 새 구현에 쓴다. environment URL과 target deployment RID는 실제 Query tab의 curl에서 얻는다. JSON Content-Type과 Authorization: Bearer <token>을 보낸다. 공식 curl 일부의 Bearer 생략을 그대로 복사하지 않는다.

## 요청과 결과

endpoint는 /foundry-ml-live/api/inference/transform/<LIVE_DEPLOYMENT_RID>/v2다. request는 API input별 named field이고 table은 row object array다. response200도 output별 named field다.

```json
{"inference_data": [{"text": "입력"}]}
```

```json
{"output_data": [{"prediction": "결과"}]}
```

실제 field/type은 현재 deployed model API에서 가져온다. 여러 input/output도 각각 이름으로 전달한다. source 예제 일부의 trailing comma는 JSON 문법상 제거해야 한다.

v1은 objective에서만 남은 sunset single-I/O endpoint다. requestData/requestParams와 responseData/modelUuid를 쓰므로 v2 shape와 섞지 않는다. direct에는 v1을 적용하지 않는다.

## 실패 처리

| HTTP | 의미와 대응 |
|---|---|
|400|model exception 또는 API 불일치. response stacktrace와 schema를 확인한다.|
|422|JSON/요청 format 오류. payload를 수정한다.|
|429|환경별 rate limit. concurrency를 낮추고 backoff한다.|
|500|internal/deployment 오류. 운영자 조치가 필요할 수 있다.|
|503|unavailable,resource starvation/OOM/concurrency/restart 가능. backoff하며 자원/health를 확인한다.|

inference는 synchronous이며 오류가 돌려준 stacktrace에 민감 입력이 섞일 수 있어 접근/보관 범위를 점검한다. 이 문서는 실제 endpoint/token을 호출한 검증 기록이 아니다. API가 공통이어도 arbitrary model 내부 외부효과의 idempotency를 보장하지 않아 재시도 정책은 adapter 동작과 함께 정한다.

## 출처

- [Palantir, live-deployment-reference](https://www.palantir.com/docs/foundry/manage-models/live-deployment-reference)

## 관련 문서

- [[Palantir-Objective-Deployment-Operations]]
- [[Palantir-Direct-Model-Deployment]]
