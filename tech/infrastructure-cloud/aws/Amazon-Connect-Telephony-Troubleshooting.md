---
tags: [aws, amazon-connect, telephony, contact-center, troubleshooting, cloudwatch]
status: done
verified_at: 2026-11-15
category: "Infrastructure - AWS"
aliases: ["Amazon Connect Telephony Troubleshooting", "Amazon Connect 통화 실패 진단", "Connect 전화번호 이전"]
---

# Amazon Connect 통화 실패 진단과 전화번호 이전

Amazon Connect(현재 제품명은 Amazon Connect Customer이고, Amazon Connect는 여러 업무용 AI 솔루션군의 이름이 됐다)의 음성 통화는 번호, 흐름(flow), 인스턴스 설정, 상담원 권한, 국가 허용 목록, 동시 통화 한도와 통신사 경로가 모두 맞아야 연결된다. 통화가 실패하면 수신과 발신을 나누고, 어느 층에서 막혔는지 지표와 설정으로 좁힌다. 아래 값과 이름은 2026-11-15 AWS 공식 문서 기준이다.

## 수신 통화가 실패할 때

| 확인 순서 | 근거와 설정 |
|---|---|
| 번호가 게시된 흐름에 연결됐는가 | 번호는 흐름 없이도 확보(claim)할 수 있지만 동작하려면 흐름 연결이 필요하다. CloudWatch `AWS/Connect`의 `MisconfiguredPhoneNumbers`는 번호가 흐름에 연결되지 않아 실패한 통화 수다 |
| 인스턴스가 수신을 허용하는가 | 인스턴스 Telephony 설정의 Receive inbound calls with Connect Customer |
| 동시 통화 한도에 걸리지 않았는가 | Concurrent active calls per instance 기본값은 10(PSTN과 WebRTC 포함)이고 리소스 단위로 증설을 요청할 수 있다. 오래된 계정은 기본값보다 낮을 수 있다. 한도를 넘으면 발신자는 reorder tone(fast busy)을 듣는다 |
| 특정 통신사에서만 안 되는가 | 다른 통신사의 번호로 걸어 보고 통신사별 결과를 기록한다(계기 영상의 진단 안내) |

동시 통화 한도 관련 지표는 이름이 비슷해 혼동하기 쉽다.

- `ConcurrentCalls`: 흐름, 대기열, 상담원 처리, 발신을 포함한 현재 활성 음성 통화 수. 콜백 대기열의 콜백과 외부 전환은 한도에 세지 않는다.
- `ConcurrentCallsPercentage`: 한도 대비 사용률. 다른 채널의 비율 지표와 달리 100을 곱하지 않은 소수로 나온다(0.5는 50%).
- `CallsBreachingConcurrencyQuota`: 동시 통화 한도를 넘은 통화 수. Sum으로 본다.
- `ThrottledCalls`: 초당 통화 요청이 지원 한도를 넘어 거부된 통화 수. 문서는 동시 통화 한도 증설로 이 처리율도 올리라고 안내한다.

CloudWatch 지표는 1분마다 전송되고 2주 동안 보관되므로, 오래된 장애는 지표만으로 재구성하기 어렵다.

## 발신 통화가 실패할 때

- **인스턴스 설정:** Telephony 설정의 Make outbound calls with Connect Customer가 켜져 있어야 한다.
- **상담원 권한:** 보안 프로필에 Make outbound calls(`OutboundCallAccess`) 권한이 있어야 한다. CCP 접근은 별도 권한(Access Contact Control Panel)이다.
- **발신 번호:** Connect는 익명 발신을 허용하지 않는다. 모든 대기열에 Outbound caller ID number를 설정해야 하고, 기본은 확보했거나 이전(port)해 온 번호다. 외부 번호는 지원 국가에서 소유 증빙과 Support 케이스로 활성화한 custom outbound caller ID로만 쓸 수 있다. quick connect나 number pad로 건 통화는 진행 중인 통화가 있으면 원래 대기열의 번호를, 없으면 상담원 라우팅 프로필의 발신 대기열 번호를 쓴다. 통화 중이 아닌 직접 발신은 outbound whisper flow의 Call phone number 블록으로 재정의할 수 있지만 통화 중 전환에는 적용되지 않는다. 대기열에 번호가 없으면 발신이 실패한다. 예외로 대기열 콜백(queued callback)은 유효한 발신 번호가 없으면 수신자에게 익명으로 표시된다.
- **번호 형식:** 번호는 E.164 형식(예: `+18005551212`)이어야 한다. 동적 발신 번호 속성이 E.164가 아니면 대기열 번호로 대체된다.
- **국가 허용 목록:** 발신 국가는 기본 거부 모델이다. US East, US West, Canada (Central), AWS GovCloud (US-West)에서 만든 인스턴스는 미국, 캐나다, 멕시코, 푸에르토리코, 영국으로, 서울 리전은 한국, 영국, 미국으로 기본 발신할 수 있다. 영국 휴대전화(`+447`)와 일본 일부 번호대(`+8170`, `+8180`, `+8190`)는 기본 허용되지 않을 수 있다. 다른 국가는 Support 케이스(Account and billing, Connect (Number Management), Country Allowlisting for Outbound Calls)로 요청한다. 기존 인스턴스는 한도가 바뀐 이력 때문에 목록이 다를 수 있다.
- **상대 번호 쪽 문제:** Connect 밖의 전화로 같은 번호에 걸어 봐서 안 되면 상대 통신사 쪽에서 조사해야 한다(계기 영상의 진단 안내).

## 전화번호를 다른 인스턴스로 옮기기

`UpdatePhoneNumber` API는 확보한 번호를 같은 리전의 다른 인스턴스나 traffic distribution group으로 옮긴다. `InstanceId`나 `TargetArn` 중 하나로 대상을 지정한다.

- 번호만 옮기고 번호의 흐름 설정은 옮기지 않는다. 옮긴 뒤 대상 인스턴스에서 올바른 흐름에 연결됐는지 확인해야 한다. 연결 전 수신 통화는 위의 흐름 미연결 실패가 된다.
- 결과는 비동기다. `DescribePhoneNumber`로 상태를 확인하며 `CLAIMED`(성공), `IN_PROGRESS`, `FAILED`가 있다. 흔한 실패 원인은 대상이 확보 가능한 번호 수 한도에 이른 경우이고, Phone numbers per instance 기본값은 10(증설 가능)이다.
- 권한은 두 층이다. 관리 웹사이트의 보안 프로필에는 `PhoneNumbers.Claim`, `PhoneNumbers.Edit` 등이 있고 이전 전용 항목은 없다. API로 옮길 때는 IAM에서 `connect:UpdatePhoneNumber` 액션을 허용해야 한다.

### 리전이나 계정이 다를 때

같은 리전과 계정 안에서는 `ListPhoneNumbersV2`로 번호를 찾고 `UpdatePhoneNumber`로 직접 옮긴다. 리전이나 계정이 다르면 AWS Support가 옮기며, 계정이 다르면 양쪽 계정에서 각각 케이스를 연다(Service는 Connect (Number Management), Category는 Phone Number Migration).

- Support가 수행하는 이전은 번호당 20~30분이 걸리고 그동안 통화가 차단되거나 실패할 수 있다. 일정은 월요일부터 금요일(현지 공휴일 제외)이다. `UpdatePhoneNumber`로 직접 옮길 때의 중단 시간은 API Reference와 Administrator Guide에 없다.
- 이전 시점에 그 번호가 어떤 대기열의 발신 번호로도 설정되어 있지 않아야 하며, 그렇지 않으면 이전이 막히거나 지연된다. 이전 뒤 대상 인스턴스 대기열의 발신 번호는 직접 다시 설정한다.
- 번호에 따라 이전이 불가능할 수 있다. 대상 흐름을 미리 게시하고 flow ARN을 Support에 주면 이전 때 연결해 줘 추가 중단을 줄인다. 공식 지원 시나리오는 같은 리전과 계정, 리전만 다름, 계정만 다름의 셋이며 둘 다 다른 경우는 명시돼 있지 않다.
- 계기 영상은 옮길 수 있는 번호 수 상한을 5개, 중단을 15~20분으로 말한다. 2026-11-15 공식 문서 기준으로는 대상 인스턴스의 Phone numbers per instance 기본값 10과 Support 이전의 20~30분이다.

### 같은 리전과 계정에서 직접 옮기는 순서

아래 운영 순서는 위 문서를 조합한 제안이며 `UpdatePhoneNumber` 직접 이전에만 해당한다.

1. 대상 인스턴스에 흐름을 먼저 게시하고 번호 한도의 여유를 확인한다. 원본 인스턴스 대기열에서 이 번호를 발신 번호로 쓰는 설정을 해제한다(Support 이전에서는 공식 요구 사항이고, API 직접 이전에서 거부되는지는 문서로 확인하지 못했다).
2. 통화가 적은 시간에 `UpdatePhoneNumber`를 호출하고 `DescribePhoneNumber`로 `CLAIMED`가 될 때까지 확인한다.
3. 대상 인스턴스에서 흐름을 연결하고 시험 통화로 수신과 `MisconfiguredPhoneNumbers`를 확인한다. 대상 인스턴스 대기열에 이 번호를 발신 번호로 다시 설정한다.

## Support 케이스에 넣을 정보

계기 영상은 통화 실패 문의에 발신 번호, 수신 번호, 최근 48시간 안의 contact ID, 시간대를 포함한 시각과 증상 설명을 넣으라고 안내한다. 공식 문서로 대조하지 않은 운영 관행이다.

## 체크포인트

- 수신 실패에서 `MisconfiguredPhoneNumbers`, `CallsBreachingConcurrencyQuota`, `ThrottledCalls` 중 무엇이 오르는지 먼저 본다.
- 발신 실패에서 인스턴스 설정, 보안 프로필, 대기열 발신 번호, E.164 형식, 국가 허용 목록을 순서대로 확인한다.
- 번호를 옮긴 뒤 흐름 연결과 발신 대기열 설정을 함께 다시 확인한다.

## 출처

- [Amazon Connect API Reference, UpdatePhoneNumber](https://docs.aws.amazon.com/connect/latest/APIReference/API_UpdatePhoneNumber.html)
- [Amazon Connect API Reference, PhoneNumberStatus](https://docs.aws.amazon.com/connect/latest/APIReference/API_PhoneNumberStatus.html)
- [Amazon Connect Administrator Guide, Move a Connect Customer phone number across instances](https://docs.aws.amazon.com/connect/latest/adminguide/move-phone-number-across-instances.html)
- [Amazon Connect Administrator Guide, Get a local toll-free or DID Connect Customer phone number](https://docs.aws.amazon.com/connect/latest/adminguide/get-connect-number.html)
- [AWS service reference information, connect.json](https://servicereference.us-east-1.amazonaws.com/v1/connect/connect.json)
- [Amazon Connect Administrator Guide, Monitoring your instance using CloudWatch](https://docs.aws.amazon.com/connect/latest/adminguide/monitoring-cloudwatch.html)
- [Amazon Connect Administrator Guide, Service quotas](https://docs.aws.amazon.com/connect/latest/adminguide/amazon-connect-service-limits.html)
- [Amazon Connect Administrator Guide, Update instance settings](https://docs.aws.amazon.com/connect/latest/adminguide/update-instance-settings.html)
- [Amazon Connect Administrator Guide, Security profile permissions](https://docs.aws.amazon.com/connect/latest/adminguide/security-profile-list.html)
- [Amazon Connect Administrator Guide, Set up outbound caller ID](https://docs.aws.amazon.com/connect/latest/adminguide/queues-callerid.html)
- [Amazon Connect Administrator Guide, Countries you can call by default](https://docs.aws.amazon.com/connect/latest/adminguide/country-code-allow-list.html)
- [How do I troubleshoot call failures from an Amazon Connect instance? — Amazon Web Services](https://www.youtube.com/watch?v=ufgQTmdEh_4) — 2025-12-27 공개 Knowledge Center 영상, 계기 자료
- [How do I migrate phone numbers from one Amazon Connect instance to another? — Amazon Web Services](https://www.youtube.com/watch?v=EX2kUiGdck8) — 2025-12-30 공개 Knowledge Center 영상, 계기 자료

## 관련 문서

- [[Amazon-Connect-Conversation-Continuity|Amazon Connect 대화 연속성과 채팅 복원]]
- [[End-User-Messaging-Two-Way-SMS|양방향 SMS 수신]]
- [[CloudWatch|CloudWatch]]
