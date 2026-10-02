---
tags: [nestjs, workflow, signal, compensation]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Workflow의 대기, signal과 보상"]
---

# NestJS Workflow의 대기, signal과 보상

Workflow의 대기는 worker memory를 유지하지 않고 instance의 wait와 deadline을 DB에 저장한다. worker가 다시 실행하면 이전 step 결과와 대기 결과를 journal에서 복원한다.

## Signal과 deadline 경쟁

`WorkflowSignal<Payload>(name)`으로 이름/타입을 공유한다. `ctx.waitForSignal(waitName, signal, { key, timeout, match })`는 payload 또는 timeout의 null을 반환한다. signal correlation key는 정확히 일치하며 key 없는 wait는 key 없는 signal만 받는다. match는 replay마다 실행되는 pure predicate다.

`WorkflowClient.signal(signal, payload, { key, id, transaction })`은 durable signal을 저장한다. instance 시작 뒤 도착한 signal은 wait에 먼저 도착해도 나중에 받을 수 있고 instance별로 한 번 소비한다. 같은 signal name/id는 한번 저장되며 duplicate는 최초 signalId와 `created: false`를 반환한다. id를 생략한 일반 retry는 별도 signal row를 만들 수 있다.

timeout 뒤 기록된 signal은 worker가 오랫동안 꺼져 있었어도 timer에게 진다. wait의 timeout은 처음 그 wait에 도달한 시점부터 계산한다. provider가 보낸 `occurredAt`을 무조건 deadline 판정 시간으로 믿는 계약이 아니다.

`ctx.waitForAny(name, { delivered: ctx.signalWait(...), timedOut: ctx.timer('3d') })`는 조건을 같이 저장하고 winner의 key/value를 journal에 기록한다. timer 값은 null이다. 여러 ready signal은 먼저 기록된 signal이 이기며 winner만 소비한다. 여러 waitForSignal을 Promise.all로 기다리면 각각 journal되고 한 번 park할 수 있다.

## Sleep와 instance timeout

`ctx.sleep(name, '7d')` 또는 `{ until: Date | epochMilliseconds }`는 wakeAt까지 park한다. 실행은 deadline보다 일찍 시작하지 않지만 polling/부하로 늦을 수 있다. 계산한 until은 journaled value를 기반으로 한다.

workflow decorator/start의 timeout은 instance에 deadline을 저장한다. sleep/wait보다 이 deadline이 빠르면 그때 깨운다. 실행 중 step은 먼저 끝나고 다음 ctx 호출에서 timeout을 처리한다. compensation은 그 deadline에 제한되지 않는다. `result()`의 대기 timeout은 caller의 wall-clock이고 instance는 계속 실행된다.

## Compensation과 commit point

완료 step의 `compensate(result, context)`는 이후 failure/cancel 때 역순으로 실행된다. parallel step도 완료 시간의 역순이 아니라 step 호출 순서의 역순이다. engine은 병렬 sibling을 끝낸 뒤 완료한 효과의 compensation을 다룬다. compensation 자체도 journal/retry/idempotency 계약을 가진다.

`ctx.commit(name)`은 현재까지의 compensation을 버리는 point of no return이다. 배송이 끝난 뒤 리뷰 메일에 실패했다고 결제를 환불하면 안 되는 흐름에 사용한다. commit 이후 추가한 step의 compensation은 이후 실패 때 여전히 실행 가능하다. 이 호출은 DB transaction의 COMMIT 명령이 아니며 workflow journal의 업무 경계다.

`ctx.fail(reason)`은 workflow에서 실패를 선언한다. step callback 안에서는 ctx.fail 대신 NonRetryableStepError를 던진다. definition/replay mismatch는 잘못된 코드로 compensation을 호출하지 않도록 별도 실패 경로다.

## Child workflow

`executeChild(workflow, input)`은 child를 시작하고 결과를 기다린다. `startChild()`는 handle을 반환하며 handle.result 또는 waitForAny 조건으로 기다릴 수 있다. child 시작/결과 모두 journal된다.

기본 child ID는 parent ID, workflow name과 count에서 정한다. 병렬 branch는 호출 순서가 달라질 수 있으므로 데이터 기반 ID를 직접 준다. child failure/cancel/terminate는 ChildWorkflowFailedError로 parent에 전달하며 필요한 경우 대체 흐름을 catch한다.

parentClose 기본 cancel은 남은 child를 취소하고 compensation을 실행한다. terminate는 compensation 없이 종료, abandon은 계속 실행이다. child는 기본 parent priority를 이어받는다.

## Cancellation의 의미

cancel은 flag를 쓰며 parked instance를 즉시 깨우고 running instance는 다음 ctx 호출에서 멈춘다. 다른 worker는 lease renewal에서 flag를 확인한다. 현재 step이 끝난 뒤 완료 compensation을 실행하므로 즉시 외부 effect를 중단한다는 의미가 아니다.

terminate는 compensation 없이 cancelled로 끝내며 error 이름은 WorkflowTerminatedError다. cancel 이후 terminate는 대체할 수 있지만 terminate 이후 cancel은 거부된다. 지원 route의 업무 상태 검사와 workflow commit 경계를 함께 설계한다. 이미 배송 signal이 도착했어도 workflow가 소비하고 commit에 도달하기 전 cancel이 적용될 수 있다.

## 출처

- [NestJS Documentation, Durable workflows](https://docs.nestjs.com/reliability/workflows)

## 관련 문서

- [[NestJS-Workflows-Replay-and-Steps]]
- [[NestJS-Workflows-Operations-and-Schedules]]
- [[NestJS-Webhooks-Verification-and-Inbox]]
