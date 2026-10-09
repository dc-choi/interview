---
tags: [messaging, aws, sns, ses, email, notification]
status: done
verified_at: 2026-09-30
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["SNS Email vs SES", "SNS 이메일과 SES", "Amazon SES", "SES vs SNS"]
---

# SNS 이메일 알림과 SES 선택

> 상위 문서: [[SNS|Amazon SNS]]

둘 다 이벤트를 메일로 알릴 수 있어 비슷해 보이지만 수신자 모델이 다르다. SNS는 topic을 구독하고 확인까지 마친 endpoint에만 전달하는 Pub/Sub이고, 이메일은 여러 전달 프로토콜 중 하나다. SES는 이메일만 다루는 서비스로, 구독 없이 주소로 보내고 도메인으로 오는 메일을 받아 처리할 수도 있다. 누가 받는지, 얼마나 보내는지, 반송과 수신 거부를 누가 책임지는지로 고른다. 제약과 수치는 2026-09-30에 확인한 AWS 문서 기준이다.

## 비교

| 기준 | SNS Email, Email-JSON 구독 | SES |
|---|---|---|
| 수신자 조건 | topic 구독 뒤 수신자가 확인 메일의 링크로 구독을 확인해야 전달. 미확인 구독은 48시간 뒤 삭제 | 구독 없이 주소로 발송. From, Source, Sender, Return-Path에 쓰는 identity(주소나 도메인)는 검증 필요 |
| 용도 제한 | 내부 시스템 경보용이며 마케팅 메시지용이 아님. 본문 커스터마이즈 불가. Standard topic만 직접 구독 | 트랜잭션 메일과 마케팅 메일 모두 대상 |
| 발송 제약 | email endpoint당 초당 10건을 넘으면 구독이 확인 대기 상태로 정지되고, 30일 안에 다시 확인하지 않으면 삭제 | 신규 계정은 리전별 sandbox. 검증된 주소와 mailbox simulator로만, 24시간 200건, 초당 1건. production access 승인 뒤 임의 수신자에게 발송 |
| 수신 처리 | 없음 | 수신 지원 리전에서 receipt rule로 S3 저장, Lambda 호출, SNS 발행, bounce 응답, header 추가, WorkMail 연동 |
| 반송과 불만 | bounce가 난 주소는 7일간 전달 억제 | bounce와 complaint 처리 체계가 발송의 전제. 알림 메일, SNS topic, event publishing으로 받음 |

## 선택 기준

- 운영자 경보처럼 수신자가 적고 고정이면 SNS 이메일 구독이 가장 단순하다. 서버 과부하 임계치 초과 같은 운영 알림이 여기에 맞는다.
- 결제 성공, 배송 상태, 댓글 알림처럼 회원 개인에게 가는 메일과 뉴스레터, 재입고와 할인 안내 같은 대량 메일은 SES로 보낸다. 이를 SNS topic 구독으로 만들면 회원마다 구독 확인이 필요하고 본문도 꾸밀 수 없으며, AWS 문서가 밝힌 용도(내부 경보)와도 어긋난다.
- 받은 메일을 처리해야 하면 SES 수신을 쓴다. receipt rule로 원문을 S3에 저장하고 Lambda나 SNS action으로 DB 적재, 휴대폰 알림 같은 후속 처리를 잇는다. 후속 처리는 재시도로 중복 실행될 수 있으므로 멱등하게 만든다 ([[Idempotency-Key|멱등성 키]]).
- 두 서비스 모두 Lambda와 이어 붙일 수 있고, 함께 쓰는 경우가 흔하다. SES의 반송, 불만과 수신 이벤트를 SNS topic으로 받아 여러 소비자에게 fan-out하는 식이다.

## SES 도입 시 확인할 운영 요건

- 일정에 identity 검증과 production access 요청을 넣는다. sandbox 상태는 리전마다 따로라서 발송 리전을 바꾸면 다시 확인한다.
- production access 신청에서 명시적으로 요청한 사람에게만 보내고 bounce와 complaint를 처리하는 절차가 있음을 확인받는다. 수신 동의와 수신 거부 처리는 발송 기능과 함께 설계한다.
- bounce와 complaint 알림을 설정하지 않으면 SES가 Return-Path(없으면 Source) 주소로 알림 메일을 전달한다. 알림을 SNS topic이나 event publishing으로 받아 발송 대상 제외와 중단 판단을 자동화한다. 여러 방식을 함께 켜면 같은 이벤트를 여러 번 받는다.
- 메일 수신은 SES가 수신을 지원하는 리전에서만 쓸 수 있으므로 리전을 고르기 전에 AWS General Reference의 수신 endpoint 목록을 확인한다.

## SMTP 연결과 발송 실패를 나누어 확인한다

이 절은 2026-10-09 AWS 공식 문서 기준이다. SMTP를 지원하는 기존 애플리케이션은 SES SMTP endpoint에 연결할 수 있다. 연결 성공, 인증 성공과 발신 권한 확인을 별도 단계로 다룬다.

1. **리전과 자격 증명:** 발송 리전의 endpoint와 그 리전용 SMTP 자격 증명을 함께 설정한다. SMTP 비밀번호는 AWS secret access key와 다르다. 임시 AWS 자격 증명에서 변환한 SMTP 자격 증명은 지원하지 않는다.
2. **TLS 방식과 포트:** STARTTLS는 25, 587, 2587에서 연결한 뒤 TLS로 전환한다. TLS Wrapper는 465, 2465에서 처음부터 TLS를 사용한다. SES SMTP 연결에는 TLS가 필요하므로 포트만 바꾸지 말고 클라이언트의 암호화 방식도 맞춘다.
3. **연결 시간 초과:** EC2는 기본적으로 포트 25의 발신 트래픽을 제한한다. 다른 지원 포트를 사용하거나 제한 해제를 요청한다. 방화벽과 outbound 경로도 함께 확인한다.
4. **인증과 발신 허용:** `535 Authentication Credentials Invalid`는 SMTP 자격 증명을 확인할 문제다. `554 Access denied`는 `ses:SendRawEmail` 권한을, `554 Message rejected: Email address is not verified`는 해당 리전의 identity 검증을 확인한다. Sandbox에서는 수신자 검증 조건도 남는다.

연결 시간 초과를 비밀번호 변경으로, identity 검증 실패를 포트 변경으로 해결하려 하지 않는다. 먼저 실패 단계와 응답 코드를 좁힌다. SMTP의 4xx 응답은 대기 시간을 늘려 재시도하고, 5xx 응답은 요청이나 설정을 바로잡은 뒤 다시 시도한다. SDK의 자동 재시도 설명을 SMTP 클라이언트의 동작으로 간주하지 않는다. AWS SDK는 HTTPS 인터페이스를 사용한다.

## 소프트 바운스와 전달 지연을 구분한다

이 절은 2026-10-09 AWS 공식 알림 스키마 대조 기준이다. SES가 발송 요청을 수락한 뒤 수신 서버로 전달하는 단계의 실패이며, 앞 절의 애플리케이션과 SES 사이 SMTP 오류와 구분한다.

- **재시도 중:** 일시적인 수신 서버 문제에는 SES가 일정 기간 재전달을 시도한다. 이때의 지연을 관측하려면 configuration set의 event publishing에서 `DeliveryDelay`를 수집한다. `deliveryDelay.delayType`, 수신자별 진단과 `expirationTime`으로 원인과 재시도 종료 예정 시각을 확인한다.
- **재시도 종료:** `Bounce` 알림의 `bounceType: Transient`는 일시적 원인이지만 SES가 해당 메일의 재전달을 중단한 결과다. 이 알림을 재시도 진행 중이라는 뜻으로 해석하지 않는다. `Permanent`는 영구 반송이므로 발송 목록에서 제외한다.
- **원인별 대응:** `bounceSubType`이 `MailboxFull`이면 사서함 상태를, `MessageTooLarge`이면 크기를, `ContentRejected`나 `AttachmentRejected`이면 본문이나 첨부를 확인한다. Transient라도 같은 내용을 즉시 반복 발송하면 해결된다는 뜻은 아니다.

Identity의 SNS 알림은 `notificationType`, event publishing은 `eventType`을 사용한다. 처리기는 한 알림의 여러 수신자를 다루고, SES가 부여한 `mail.messageId`로 원래 발송과 연결한다. SNS 알림의 순서와 묶음 크기는 보장되지 않으므로 수신 순서만으로 최종 상태를 덮어쓰지 않는다.

## 출처

- [Amazon SNS, Email subscription setup and management](https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html)
- [Amazon SES, Request production access (Moving out of the Amazon SES sandbox)](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [Amazon SES, Email receiving with Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/receiving-email.html)
- [Amazon SES, Receipt rule action options](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action.html)
- [Amazon SES, Setting up event notifications](https://docs.aws.amazon.com/ses/latest/dg/monitor-sending-activity-using-notifications.html)
- [Amazon SES, Using the Amazon SES SMTP interface to send email](https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html)
- [Amazon SES, Obtaining Amazon SES SMTP credentials](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html)
- [Amazon SES, Connecting to an Amazon SES SMTP endpoint](https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html)
- [Amazon SES, Amazon SES SMTP issues](https://docs.aws.amazon.com/ses/latest/dg/troubleshoot-smtp.html)
- [Amazon SES, Amazon SNS notification contents for Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/notification-contents.html)
- [Amazon SES, Contents of event data that Amazon SES publishes to Amazon SNS](https://docs.aws.amazon.com/ses/latest/dg/event-publishing-retrieving-sns-contents.html)
- [인프런, Sungmin Kim, SNS란?](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=83507)
- [인프런, Sungmin Kim, SES VS SNS](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=83508)

## 관련 문서

- [[SNS|Amazon SNS]]
- [[Fan-Out-Architecture|Fan-out 아키텍처]]
- [[Idempotency-Key|멱등성 키]]
- [[LocalStack-Integration-Test|LocalStack 통합 테스트 (SES 발신자 검증 준비)]]
