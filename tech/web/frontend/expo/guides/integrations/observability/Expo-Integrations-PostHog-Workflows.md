---
tags: [expo, expo-integrations, observability]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["PostHog와 EAS Workflows progressive delivery"]
---

# PostHog와 EAS Workflows progressive delivery

EAS workflow에서 PostHog event/annotation/flag/metric gate/source map upload를 연결한다. Source map upload preset 외 feature_flag:read/write, query:read, annotation:write 권한이 recipe에 필요하다. GitHub push trigger에는 EAS project의 GitHub repository 연결도 필요하다.

## 함수와 dependency 계약

| function | 목적과 credential |
| --- | --- |
| eas/posthog_capture_event | event/properties/distinct_id. public key 사용, distinct_id 생략은 익명 event |
| eas/posthog_annotation | 현재 시각 release marker, annotation 권한 |
| eas/posthog_flag_rollout | flag/active/rollout_percentage로 exposure와 kill switch |
| eas/posthog_wait_for_metric | HogQL numeric result와 operator/threshold 비교, interval_seconds/timeout_seconds |
| eas/posthog_wait_for_query | query boolean=true까지 poll |
| eas/posthog_upload_sourcemaps | 같은 job disk의 directory upload |

capture 외 함수는 POSTHOG_CLI_API_KEY와 PROJECT_ID를 기본 사용하고 api_key override도 가능하다. update job은 추가 step을 붙일 수 없어 checkout/install 후 custom job에서 단일 platform eas update와 map upload를 연속 실행한다. 다른 job의 dist가 자동 공유된다고 가정하지 않는다. native build는 plugin이 upload한다.

## 배포 표시와 rollout state

update 후 capture event에 account.name/app.id/workflow.id와 publish.outputs.first_update_group_id를 넣는다. runtimeVersion은 updates_json을 fromJSON(...||'[]')해 platform result에서 읽는다. annotation은 release를 모든 chart 위에 표시한다. repository의 feature-rollout.json(flag, rollout_percentage)를 paths trigger로 읽어 job output에 노출하고 publish/read job 모두 끝난 뒤 flag를 켜면 code보다 flag가 먼저 켜지는 일을 피한다.

```yaml
error_gate:
  needs: [canary]
  steps:
    - uses: eas/posthog_wait_for_metric
      with:
        query: SELECT count() FROM events WHERE event = '$exception' AND timestamp > now() - INTERVAL 30 MINUTE
        operator: lte
        threshold: 5
        interval_seconds: 60
        timeout_seconds: 1800
roll_back:
  after: [error_gate]
  if: ${{ failure() }}
  steps:
    - uses: eas/posthog_flag_rollout
      with: { flag: new-checkout, active: false }
```

needs가 실패하면 if 평가 전에 downstream을 skip하므로 rollback은 after와 failure()를 사용한다. failure()는 run 전체 상태여서 workflow를 rollout/gate에 집중시킨다. timeout은 step 실패이며 ignore_error option이 없다.

## Gate가 증명하는 범위

조건이 한 번 맞으면 즉시 통과하며 deploy 직후 사용자도 error도 없을 때 low-error gate가 바로 통과할 수 있다. 먼저 adoption gate를 두고 현재 update ID/channel/runtime으로 scope한다. 단순 time window와 distinct user>=50만으로 신규 update 채택을 확인한 것은 아니다. 원문의 adoption/exception query는 release filter를 추가해야 정확한 rollout 판단에 쓸 수 있다. count threshold는 error rate와 다르므로 traffic 변화에 따른 분모를 고려한다.

channel rollout은 branch에 publish한 update와 같은 runtime-version으로 create하고 percent를 올린다. 성공 end의 republish-and-revert는 새 update를 모두에게 republish, 실패 revert는 기존 update로 돌아간다. flag rollback은 UI exposure 제어이며 channel revert와 다르다.

require-approval job의 승인 뒤 100% flag를 적용하고 event를 남길 수 있다. 수동 kill-switch에는 on trigger를 생략하고 workflow:run으로 실행한다. 자동 kill-switch는 gate timeout 실패 뒤 flag.active=false와 audit event를 보낸다. Slack job은 adoption 이후 webhook으로 알림을 보낼 수 있으나 이런 recipe가 문서 작업에서 외부 발송 권한을 주는 것은 아니다.

wait_for_query는 최근 smoke-test event를 기다리고 schedule cron은 야간 budget check를 독립 실행한다. native build→submit→capture는 submitted event를 기록할 뿐 store review 통과를 뜻하지 않는다. 각 query는 historical event가 통과시키지 않도록 time/current-run property를 필터링한다.

## 출처

- [Expo Documentation, PostHog recipes for EAS Workflows](https://docs.expo.dev/guides/using-posthog/recipes)

## 관련 문서

- [[Expo-Integrations-PostHog]]
- [[Expo-Integrations-Analytics]]
