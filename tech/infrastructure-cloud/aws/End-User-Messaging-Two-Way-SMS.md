---
tags: [aws, sms, sns, iam, kms, amazon-connect]
status: done
verified_at: 2026-10-15
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["AWS Two-Way SMS", "양방향 SMS 수신 장애", "End User Messaging 양방향 SMS"]
---

# AWS 양방향 SMS 수신과 권한 경계

AWS End User Messaging SMS의 양방향 메시징은 고객이 보낸 SMS 본문을 Amazon SNS topic 또는 Amazon Connect 인스턴스로 전달한다. 발신 성공과 수신 경로의 정상 동작은 별개다. 수신 장애는 번호의 지원 조건, 목적지 설정과 목적지별 권한을 나누어 확인한다.

## 지원 조건부터 확인한다

- 국가와 번호 유형의 양방향 SMS 지원 여부를 공식 지원표에서 확인한다. 콘솔에 활성화 옵션이 없으면 애플리케이션 코드보다 이 조건을 먼저 본다.
- Connect를 목적지로 쓰려면 해당 AWS 리전의 SMS 지원 여부도 확인한다. 국가별 통신 지원과 AWS 리전 지원은 다른 조건이다.
- Simulator 번호는 Connect 목적지를 지원하지 않는다. Connect 연동에는 지원되는 일반 번호를 사용한다.
- 양방향 MMS는 지원하지 않는다. 발신 MMS에 대한 응답 SMS를 받을 수 있다는 사실과 구분한다.

### 발신자, 검증된 수신자와 양방향 번호를 구분한다

Sender ID는 발신자를 표시하는 문자 기반 이름이며 양방향 SMS를 지원하지 않는다. Sender ID로 알림이나 인증 문자를 보냈다는 사실은 그 ID로 회신을 받을 수 있다는 뜻이 아니다. 회신이 필요하면 해당 국가와 번호 유형의 양방향 지원을 따로 확인한다.

Sandbox의 **verified destination number**는 시험 문자를 받을 수 있도록 인증한 수신 번호다. 발신용 리소스나 SNS 수신 목적지를 만드는 절차가 아니다. 실제 번호 인증에는 활성 상태이며 해당 국가와 인증 채널을 지원하는 origination identity가 필요하다. Simulator 번호로 실제 수신 번호를 인증할 수는 없다.

인증 절차는 `create-verified-destination-number`로 수신 번호를 등록하고, `send-destination-number-verification-code`로 코드를 보낸 뒤, `verify-destination-number`로 받은 코드를 제출하는 순서다. 완료 상태는 `VERIFIED`다. Sandbox에서는 인증한 수신 번호 최대 10개에만 보낼 수 있으며, production에서는 이 수신 번호 사전 인증이 필요하지 않다. 국가별 발신 규칙과 양방향 지원 조건까지 해제되는 것은 아니다.

2026-10-15 발신과 수신 리소스의 구분, sandbox 인증 절차와 기존 목적지별 권한을 공식 문서와 대조했다. 실제 계정의 발신자 등록이나 송수신 성공을 확인한 결과는 아니다.

## SNS 목적지의 두 권한 방식

| 설정 방식 | 확인할 정책 |
| --- | --- |
| Two-way channel role에 IAM 역할 지정 | 신뢰 정책이 `sms-voice.amazonaws.com`의 `sts:AssumeRole`을 허용하는지, 역할 권한이 대상 topic의 `sns:Publish`를 허용하는지 확인 |
| SNS topic policy 사용 | topic의 리소스 정책이 `sms-voice.amazonaws.com`의 `sns:Publish`를 허용하는지 확인 |

공식 IAM 역할 예시는 신뢰 정책에 `aws:SourceAccount` 조건을 둔다. SNS FIFO topic은 이 수신 경로에서 지원하지 않는다. 범용 SNS 발행이 된다는 이유로 양방향 SMS와도 호환된다고 판단하지 않는다.

### 암호화 topic은 KMS도 대조한다

SNS 발행 권한과 암호화 키 사용 권한은 다른 검사다.

- IAM 역할 방식의 공식 예시는 `kms:Decrypt`, `kms:GenerateDataKey*`와 SNS topic의 encryption context, `aws:CalledViaLast` 조건을 사용한다.
- topic policy 방식은 대칭 KMS 키와 SMS 서비스의 키 사용을 허용하는 key policy가 필요하다. 공식 예시는 `aws:SourceAccount`, `aws:SourceArn`으로 호출 출처를 제한한다.
- 자신의 관리자 권한으로 보낸 테스트 메시지만으로 서비스 주체의 권한을 확인했다고 보지 않는다. 실제 수신 경로가 사용하는 역할과 키를 대조한다.

## Connect 목적지는 역할과 번호 연결을 구분한다

Connect 전달 역할의 권한은 `connect:SendChatIntegrationEvent`다. 신뢰 주체는 SNS가 아니라 `sms-voice.amazonaws.com`이며, 공식 예시는 `aws:SourceAccount` 조건을 포함한다.

양방향 SMS 활성화와 Connect로 번호를 가져오는 절차는 구분된다. 공식 콘솔 절차에는 목적지 인스턴스를 고르고 번호를 import하는 단계가 있다. 수신이 안 되는 문제와 Connect에 번호 자체가 보이지 않는 문제를 같은 실패로 취급하지 않는다.

## 운영 점검 순서

다음은 위 설정 경계를 적용한 진단 순서다.

1. 번호의 국가, 유형, 양방향 활성화와 목적지 종류를 확인한다.
2. 실제 목적지와 설정한 topic 또는 Connect 대상이 일치하는지 확인한다.
3. 선택한 권한 방식에 맞춰 신뢰 정책과 작업 권한을 대조한다.
4. SNS 암호화를 쓴다면 키 종류와 키 정책까지 확인한다.
5. 목적지에 도착한 뒤의 구독 소비나 상담 흐름 실패는 상위 수신 권한 문제와 분리한다.

이 문서는 공식 설정과 정책 예시를 대조한 것이며 실제 계정의 SMS 송수신을 시험한 결과는 아니다.

## 출처

- [AWS, Two-way SMS messaging in AWS End User Messaging SMS](https://docs.aws.amazon.com/sms-voice/latest/userguide/two-way-sms.html)
- [AWS, Add a destination phone number while in the AWS End User Messaging SMS sandbox](https://docs.aws.amazon.com/sms-voice/latest/userguide/verify-destination-phone-number.html)
- [AWS, SMS/MMS and Voice sandbox in AWS End User Messaging SMS](https://docs.aws.amazon.com/sms-voice/latest/userguide/sandbox.html)
- [AWS, Set up two-way SMS messaging for a phone number](https://docs.aws.amazon.com/sms-voice/latest/userguide/two-way-sms-phone-number.html)
- [AWS, IAM policies for Amazon SNS topics](https://docs.aws.amazon.com/sms-voice/latest/userguide/two-way-sms-iam-policy.html)
- [AWS, Topic policies for Amazon SNS topics](https://docs.aws.amazon.com/sms-voice/latest/userguide/two-way-sms-iam-policy-auto.html)
- [AWS, IAM policies for Connect Customer](https://docs.aws.amazon.com/sms-voice/latest/userguide/two-way-connect-iam-policy.html)

## 관련 문서

- [[SNS|SNS]]
- [[IAM|IAM 정책과 역할]]
- [[KMS|KMS 키와 권한]]
- [[Amazon-Connect-Conversation-Continuity|Connect 대화 연속성]]
