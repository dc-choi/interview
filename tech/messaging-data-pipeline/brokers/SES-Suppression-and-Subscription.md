---
tags: [messaging, aws, ses, email, suppression-list, unsubscribe]
status: done
verified_at: 2026-10-14
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["SES Suppression List", "SES 억제 목록", "SES List Management", "SES Subscription Management", "SES 구독 관리"]
---

# SES 억제 목록과 구독 관리

> 상위 문서: [[SNS-Email-SES|SNS 이메일 알림과 SES 선택]]

SES의 수신자 관리는 목적이 다른 두 장치로 나뉜다. 억제 목록(suppression list)은 hard bounce나 스팸 신고가 난 주소로 다시 보내지 않게 막아 발신 평판을 지킨다. 연락처 목록(contact list)과 구독 관리는 수신자가 주제별로 받을지 고르고 수신을 거부하게 한다. 앞의 것은 전달 가능성의 안전장치이고 뒤의 것은 수신자의 선택이다. 동작과 한도는 2026-10-14에 확인한 AWS 공식 문서 기준이다. 발신 도메인 인증과 평판 지표는 [[SES-Sender-Authentication|SES 발신 인증과 전달성 온보딩]]에서 다룬다.

## 억제 목록의 종류

| 목록 | 범위 | 동작 |
|---|---|---|
| global suppression list | SES 전체 | 최근 hard bounce 이력이 있는 주소. bounce subtype `Suppressed`로 나타난다 |
| account-level suppression list | 내 계정의 현재 리전 | 설정한 사유(`BOUNCE`, `COMPLAINT`)와 같은 사유로 등록된 주소로 보내면 SES가 요청은 받지만 전달하지 않는다. 알림의 `bounceSubType`이나 `complaintSubType`이 `OnAccountSuppressionList`로 온다 |
| configuration set 수준 설정 | configuration set별 | 별도 목록이 아니라 계정 수준 목록의 적용 사유를 재정의한다 |

- 2019-11-25 이후 SES를 시작한 계정은 계정 수준 목록이 bounce와 complaint 모두에 기본으로 켜져 있다. 그 이전 계정은 `PutAccountSuppressionAttributes`로 켠다.
- 설정한 사유에 따라 hard bounce나 complaint가 난 주소가 자동으로 들어가고, soft bounce는 들어가지 않는다. 계정 수준 목록을 쓰면 hard bounce 주소는 global suppression list에도 추가된다.
- global suppression list에만 있고 계정 수준 목록에 없는 주소로 보내면 SES는 전달을 시도하며, 다시 반송되면 bounce rate와 일일 발송 할당량에 포함된다.
- Gmail은 SES에 complaint 데이터를 주지 않는다. Gmail 웹에서 스팸으로 신고해도 계정 수준 목록에 자동으로 들어가지 않으므로 one-click 수신 거부와 Postmaster Tools 지표로 보완한다.
- 억제된 주소로 보낸 메일은 `Reputation.BounceRate`, `Reputation.ComplaintRate`에 들어가지 않는다. 하지만 일일 발송 할당량에는 포함되고 Send 이벤트로도 집계된다.
- 목록의 주소는 직접 지울 때까지 남는다. 계정 발송이 중지되면 SES가 90일 뒤 목록의 주소를 지우며, 그 전에 발송이 복구되면 지우지 않는다.
- 관리 API는 저장된 주소와 대소문자까지 같아야 찾는다. 발송은 대소문자가 달라도 같은 주소로 다룬다.
- 멀티 테넌시를 쓰면 tenant 수준 목록을 따로 둘 수 있고, 켜진 tenant는 계정 수준 목록 대신 그 목록을 쓴다.

## 직접 관리하기

```bash
# 개별 추가, 조회, 삭제 (reason: BOUNCE 또는 COMPLAINT)
aws sesv2 put-suppressed-destination --email-address user@example.com --reason BOUNCE
aws sesv2 get-suppressed-destination --email-address user@example.com
aws sesv2 delete-suppressed-destination --email-address user@example.com

# 목록 조회 (NextToken으로 다음 페이지, --start-date와 --end-date로 추가 시점 범위)
aws sesv2 list-suppressed-destinations
```

- 대량 추가와 삭제는 S3에 CSV나 줄 단위 JSON을 올리고 `CreateImportJob`을 호출한다. 호출당 추가는 100,000건, 삭제는 10,000건까지이고 동시에 돌릴 수 있는 import 작업은 20개다. S3 버킷은 import하는 리전과 같아야 한다.
- sandbox에서는 억제 목록 관리 API와 bulk 작업이 막힌다. 계정 수준 목록을 켜는 설정은 sandbox에서도 할 수 있지만 `PutSuppressedDestination`과 `CreateImportJob`은 production access를 받은 뒤에 쓴다.
- 억제 목록은 반송과 불만의 기록이지 회원 DB의 수신 동의 상태를 대신하지 않는다. Bounce, Complaint 이벤트를 [[SNS]]나 EventBridge로 받아 회원 DB에도 반영하고, 처리기는 같은 이벤트를 두 번 받아도 결과가 같도록 만든다([[Idempotency-Key|멱등성 키]]).

## configuration set 수준 재정의

| 설정 | 이 configuration set으로 보낸 메일 |
|---|---|
| 재정의 안 함 (기본) | 계정 수준 설정을 그대로 따른다 |
| 재정의하고 억제 끔 | 계정 수준 억제를 전혀 쓰지 않는다 |
| 재정의하고 사유 지정 | 지정한 사유(bounce, complaint 또는 둘 다)만 적용한다. 지정하지 않은 사유는 global suppression list 동작으로 돌아간다 |

- 별도 목록이 생기는 것이 아니라 그 configuration set으로 보낸 메일에 대해 계정 수준 목록에 어떤 사유로 주소를 추가하고 적용할지를 바꾼다. 예를 들어 complaint만 지정하면 complaint 사유 주소만 막고, bounce 사유 주소는 계정 수준 목록으로 막지 않는다.
- API는 `PutConfigurationSetSuppressionOptions`이고 `SuppressedReasons`에 `BOUNCE`, `COMPLAINT`를 넣는다. 멀티 테넌시에서는 `SuppressionScope`로 tenant 목록과 계정 목록 중 하나를 고르며, `TENANT`로 두면 그 configuration set을 쓰는 모든 `SendEmail`과 `SendBulkEmail` 요청에 tenant 이름이 있어야 한다.
- bounce 억제를 끄는 재정의는 이미 hard bounce가 난 주소로 다시 보내 bounce rate를 올릴 수 있다. 도달 범위를 넓히려는 예외는 꼭 필요한 configuration set에만 두고, 결과를 Bounce 이벤트로 확인한다.

## 연락처 목록과 주제 (list management)

- contact list는 구독자 주소의 모음이고 topic은 그 안의 관심 주제다. AWS 계정당 contact list는 하나, list당 topic은 최대 20개다.
- topic마다 기본 구독 상태 `DefaultSubscriptionStatus`(`OPT_IN`, `OPT_OUT`)를 둔다. contact에는 topic별 선택 `TopicPreferences`, 전체 해지 여부 `UnsubscribeAll`, 임의 메타데이터를 담는 JSON `AttributesData`가 있다.
- 특정 topic의 수신자는 `ListContacts`의 `Filter`(`FilteredStatus: OPT_IN`, `TopicFilter`)로 뽑는다. `UseDefaultIfPreferenceUnavailable`이 true면 명시적 선택이 없는 contact에 topic 기본값을 적용하고, false면 명시적으로 선택한 contact만 본다.
- 기존 목록은 S3와 `CreateImportJob`으로 가져온다. 작업 하나에 contact 100만 건까지이고, contact list를 먼저 만들어 둔다.

```json
{
  "ContactListName": "Newsletter",
  "Topics": [
    {
      "TopicName": "TechNews",
      "DisplayName": "기술 소식",
      "Description": "주간 기술 소식",
      "DefaultSubscriptionStatus": "OPT_OUT"
    }
  ]
}
```

위 JSON을 `aws sesv2 create-contact-list --cli-input-json file://contact-list.json`으로 넘기고, contact는 `create-contact`로 `TopicPreferences`와 함께 만든다.

## 구독 관리와 수신 거부 링크

- `SendEmail`의 `ListManagementOptions`에 `ContactListName`과 `TopicName`(선택)을 넣으면 SES가 수신 거부를 관리한다. SMTP 인터페이스는 `X-SES-LIST-MANAGEMENT-OPTIONS: {contactListName}; topic={topicName}` 헤더를 쓴다.
- 본문에 `{{amazonSESUnsubscribeUrl}}` 자리표시자를 넣으면 SES가 수신 거부 URL로 바꾼다. HTML과 TEXT 본문에서만 바뀌고 앞의 두 번까지만 치환된다.
- SES는 `List-Unsubscribe`(RFC 2369)와 one-click용 `List-Unsubscribe-Post`(RFC 8058) 헤더를 넣고, 같은 헤더가 이미 있으면 덮어쓴다. 헤더와 본문 링크는 수신자가 한 명인 메일에만 붙는다. 헤더를 인식하지 않는 메일 클라이언트에서는 헤더 링크가 보이지 않는다.
- 본문 링크는 SES가 호스팅하는 페이지로 이어지고, 수신자는 topic별 `OPT_IN`, `OPT_OUT`을 바꾸거나 list의 모든 topic을 해지한다. 헤더 링크는 topic을 지정한 메일이면 그 topic만, 지정하지 않았으면 list의 모든 topic을 해지한다.
- 해지한 contact에게 그 topic으로 다시 보내면 SES는 전달을 시도하지 않고 `Permanent` bounce(subtype `UnsubscribedRecipient`)를 남긴다. 이 bounce는 평판에 영향을 주지 않고 억제 목록에도 추가되지 않는다. 해지 자체는 configuration set의 `Subscription` 이벤트로 받는다.
- 목록에 없는 주소로 `ListManagementOptions`를 붙여 보내면 contact가 자동으로 만들어진다.
- 비밀번호 재설정, 결제 확인 같은 거래 메일은 `ListManagementOptions`를 빼서 수신 거부 대상에서 제외한다.
- AWS 문서는 이 기능을 Easy DKIM 사용자에게 제공한다고 밝히며, SES로 넘기기 전에 메일을 직접 서명하면 SES가 수신 거부 링크를 넣을 수 없다.

## 설계 체크포인트

- 억제 목록, 구독 상태, 회원 DB의 수신 동의 중 무엇을 정본으로 둘지 정한다. AWS는 list management를 구독자 목록의 정본으로 두고, `UnsubscribedRecipient` 이벤트를 구독해 해지한 수신자에게 계속 보내지 않도록 권한다. 해지했거나 억제된 수신자에게 계속 보내면 SES 집행 관점에서 모범 사례를 따르지 않는 발신자로 보인다.
- 수신자를 To에 여러 명 넣으면 구독 헤더와 링크가 붙지 않고, 불만 알림에서 신고자를 특정하기도 어려워진다. 수신자마다 따로 보낸다.
- mailbox simulator의 `suppressionlist@`, `complaint@`, `bounce@` 주소로 억제와 이벤트 처리 경로를 시험한다. simulator의 bounce 주소는 억제 목록에 추가되지 않는다.

## 출처

- [Amazon SES, Using the Amazon SES account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
- [Amazon SES, Using configuration set-level suppression to override your account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list-config-level.html)
- [Amazon SES API v2, PutConfigurationSetSuppressionOptions](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_PutConfigurationSetSuppressionOptions.html)
- [Amazon SES API v2, GetSuppressedDestination](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_GetSuppressedDestination.html)
- [Amazon SES, Request production access (Moving out of the Amazon SES sandbox)](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [Amazon SES, Amazon SNS notification contents for Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html)
- [Amazon SES, Monitor email sending using Amazon SES event publishing](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html)
- [Amazon SES, Using list management](https://docs.aws.amazon.com/ses/latest/dg/sending-email-list-management.html)
- [Amazon SES, Using subscription management](https://docs.aws.amazon.com/ses/latest/dg/sending-email-subscription-management.html)
- [Amazon SES, Sending test emails in Amazon SES with the simulator](https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html)
- [SES Deep Dive Series Part 5: List and Subscription Management — Amazon Web Services](https://www.youtube.com/watch?v=5S5GuBUV1yU)

## 관련 문서

- [[SNS-Email-SES|SNS 이메일 알림과 SES 선택]]
- [[SES-Sender-Authentication|SES 발신 인증과 전달성 온보딩]]
- [[SNS|Amazon SNS]]
- [[Idempotency-Key|멱등성 키]]
