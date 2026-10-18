---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Asana, HubSpot과 Slack의 권한과 증분

Asana는 개인 PAT와 service-account PAT를 구별한다. 장기 연동은 계정 수명/권한이 유지되는 service account를 검토한다. table 선택을 비우면 전체 선택으로 작동할 수 있으므로 필터의 빈값 의미를 확인한다.

Asana identifier는 English/underscore 형태, preview가 필요한 조건과 SQL92 형태의 AND/OR row filter를 확인한다. incremental은 단조 증가 열의 `>` 조건이다.

## HubSpot

private app token은 Super Admin의 생성 권한과 table별 scope를 맞춘다. authentication 성공만으로 모든 table이 보인다고 가정하지 않는다. scope가 부족하거나 계정 등급 변화로 scope를 잃으면 일부 table이 누락될 수 있다.

rotate-and-expire-later 경로는 이전 token이 7일 동안 남는 조건을 확인한다. 오래된 API key 방식은 원문이 안내하는 2022 sunset 이후 private app으로 옮기는 역사적 migration 정보로 읽는다.

## Slack Beta

bot token과 설치된 app을 사용한다. scope 추가 후에는 reinstall이 필요하다. 읽기 ingestion만이면 write scope를 추가할 필요가 없다. users, channels/groups/IM/MPIM 목록과 각 history scope를 채널 유형에 맞춘다.

permission뿐 아니라 bot을 해당 channel에 추가해야 한다. Messages와 thread의 MessageReplies가 다르므로 하나의 table로 모든 대화를 읽었다고 간주하지 않는다.

incremental CreatedTime은 이전 max 이상의 `>=` 조건으로 경계 중복이 가능하다. 외부 ID/시각을 기준으로 후속 dedup를 설계한다. Beta의 enrollment availability와 API rate limit 변화는 실제 workspace에서 다시 확인한다.

## 출처

- [Palantir, asana](https://www.palantir.com/docs/foundry/available-connectors/asana)
- [Palantir, hubspot](https://www.palantir.com/docs/foundry/available-connectors/hubspot)
- [Palantir, slack](https://www.palantir.com/docs/foundry/available-connectors/slack)

## 관련 문서

- [[Palantir-Connector-Contracts]]
