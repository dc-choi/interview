---
tags: [messaging, aws, ses, email, dkim, spf, dmarc, deliverability]
status: done
verified_at: 2026-10-14
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["SES Sender Authentication", "SES 발신 인증", "SES DKIM SPF DMARC", "SES 전달성 온보딩", "SES Deliverability Onboarding"]
---

# SES 발신 인증과 전달성 온보딩

> 상위 문서: [[SNS-Email-SES|SNS 이메일 알림과 SES 선택]]

SES로 보낸 메일이 받은편지함에 닿으려면 발송 코드보다 먼저 발신 identity를 검증하고 도메인 인증(DKIM, SPF, DMARC)을 갖춰야 한다. 메일함 사업자는 From 주소의 도메인이 인증되고 정렬됐는지로 스푸핑을 걸러 내며, 대량 발신자에게는 이를 의무로 요구한다. 그 위에 전용 IP, configuration set, 평판 지표 감시를 얹는다. sandbox 제약과 SMTP 연결 문제는 [[SNS-Email-SES|상위 문서]]에서 다룬다. 수치와 동작은 2026-10-14에 확인한 AWS, Google, Microsoft 공식 문서 기준이다.

## 발신 identity: 이메일 주소와 도메인

| 기준 | 이메일 주소 identity | 도메인 identity |
|---|---|---|
| 검증 방법 | 확인 메일의 링크를 누른다. 링크는 24시간 뒤 만료 | DNS에 DKIM 레코드를 게시한다. SES는 DKIM으로 도메인 소유를 검증 |
| 발신 범위 | 검증한 주소 하나. 주소는 대소문자를 구분 | 그 도메인과 모든 하위 도메인, 그 아래의 모든 주소 |
| 맞는 단계 | 빠른 시작과 sandbox 시험 | 운영 발송과 DMARC 정렬 |

- identity는 리전 단위다. 같은 도메인으로 여러 리전에서 보내면 리전마다 만들고 검증한다. 리전당 최대 10,000개까지 검증할 수 있다.
- 도메인 검증을 상속한 주소는 단순 발송에만 쓴다. 주소 단위로 configuration set을 쓰거나 위임 발송 정책을 붙이거나 도메인 설정을 재정의하려면 그 주소도 따로 검증한다.
- 도메인, 하위 도메인, 주소를 함께 검증하면 알림 같은 설정은 가장 세분화된 identity의 것이 적용된다.
- 상태는 `aws sesv2 get-email-identity --email-identity example.com`으로 본다. `VerifiedForSendingStatus`는 발신 가능 여부, `DkimAttributes.Status`는 DKIM 레코드 탐지 결과(`PENDING`, `SUCCESS`, `FAILED`, `TEMPORARY_FAILURE`, `NOT_STARTED`), `SigningEnabled`는 서명 여부, `Tokens`는 게시할 레코드의 재료다.

## DKIM: 도메인 검증이자 서명

DKIM은 발신 측이 개인키로 메일에 서명하고 수신 서버가 도메인 DNS에 게시된 공개키로 검증하는 방식이다. 검증에 성공하면 그 도메인 소유자가 승인한 메일이고 서명한 부분이 전송 중에 바뀌지 않았다는 근거가 된다. 서명은 헤더에 실려 메일을 따라가므로, 전달(forwarding)로 봉투 주소가 바뀌어 SPF가 깨져도 내용이 그대로면 DKIM은 유지된다.

| 방식 | 키와 DNS | 쓰는 경우 |
|---|---|---|
| Easy DKIM | SES가 키 쌍을 만들고, 사용자가 SES가 준 CNAME 3개를 DNS에 게시한다(DNS가 Route 53이면 SES가 레코드를 자동으로 만들 수 있다). 기본 2048비트, 1024비트 선택 가능 | 기본값 |
| BYODKIM | 직접 만든 1024~2048비트 RSA 키. selector 이름의 TXT에 공개키를 게시 | 키를 직접 관리해야 할 때 |
| DEED | 다른 리전 parent identity의 Easy DKIM 설정을 상속. 추가 DNS 작업 없음 | 여러 리전의 replica identity |
| 수동 서명 | raw 발송에 서명을 직접 넣는다. SES는 그 서명을 검증하지 않음 | 특수한 경우만 |

- Easy DKIM CNAME 값의 hosted zone 부분은 리전과 identity에 따라 다르다. API 응답의 `DkimAttributes.SigningHostedZone`으로 확인하고, 레코드 이름은 콘솔이 준 그대로 쓴다. `abc123._domainkey.example.com`이 맞고 앞에 밑줄을 더한 `_abc123._domainkey.example.com`은 틀리다.
- DNS 반영에는 최대 72시간이 걸릴 수 있고 SES도 최대 72시간 동안 레코드를 찾는다. 그 뒤에도 검증되지 않으면 이름과 값 필드를 바꿔 넣었는지, DNS 제공자가 이름 뒤에 도메인을 자동으로 덧붙였는지부터 본다.
- DKIM은 From 주소의 도메인에만 설정하면 되고 Return-Path나 Reply-To 도메인은 대상이 아니다. 하위 도메인과 그 도메인의 주소 identity는 DKIM 설정을 상속한다. 주소 identity에서 서명을 끌 수는 있지만 평판과 스푸핑 위험 때문에 권장되지 않는다.
- Easy DKIM 키 길이는 24시간에 한 번만 바꿀 수 있다(그 기간의 첫 1024비트 하향은 예외). 전송 중인 메일의 검증이 이전 공개키에 기대기 때문이다.
- BYODKIM에서 Easy DKIM으로 옮기면 새 레코드가 확인될 때까지 서명 없이 나갈 수 있다. 하위 도메인을 거쳐 옮기거나 발송이 없는 시간에 바꾼다.

## SPF와 custom MAIL FROM

메일에는 수신자에게 보이는 From 주소와 반송을 받는 MAIL FROM(Return-Path, envelope sender) 주소가 따로 있다. SPF는 MAIL FROM 도메인의 TXT 레코드에 그 도메인으로 보낼 수 있는 서버를 적어 두고 수신 서버가 대조하는 방식이다.

- SES의 기본 MAIL FROM은 `amazonses.com`의 하위 도메인이다. SPF는 통과하지만 From 도메인과 정렬되지 않아 DMARC의 SPF 경로로는 인정받지 못한다.
- custom MAIL FROM은 검증된 identity(도메인 또는 주소)의 도메인 아래 하위 도메인(예: `bounce.example.com`)으로 정한다. 이 하위 도메인은 메일 발신이나 수신에 쓰지 않는다.
- DNS에는 MX 하나와 SPF TXT를 게시한다. MX가 여러 개면 설정이 실패하고, SES는 MX를 최대 72시간 동안 찾는다.

```text
bounce.example.com  MX   10 feedback-smtp.<region>.amazonses.com
bounce.example.com  TXT  "v=spf1 include:amazonses.com ~all"
```

- `~all`은 나열하지 않은 서버를 softfail로 처리하라는 뜻이다. softfail은 승인되지 않았을 가능성이 높다는 약한 판정이다. SPF 평가에서 DNS 조회를 부르는 항목은 10개로 제한되고 넘으면 permerror가 되므로, 발송 서비스마다 include를 계속 더하지 않는다.
- MX를 찾지 못했을 때의 동작은 둘 중 하나다. Use default MAIL FROM domain은 기본 `amazonses.com` 하위 도메인으로 바꿔 계속 보낸다(이때 SPF 정렬은 잃는다). Reject message는 `MailFromDomainNotVerified` 오류로 발송을 거부한다.

## DMARC: 정렬과 단계적 정책

SPF는 MAIL FROM 도메인만, DKIM은 서명 도메인만 확인하므로 어느 쪽도 수신자가 보는 From 주소를 직접 인증하지 않는다. DMARC는 둘 중 하나 이상이 From 도메인과 정렬된 채 통과하면 pass, 둘 다 실패하면 fail로 본다.

- **DKIM 정렬:** Easy DKIM으로 From 도메인을 서명한다. From 주소가 DKIM 서명 도메인의 하위 도메인이면(예: 부모 도메인의 DKIM 설정을 상속한 하위 도메인에서 발송) DMARC가 relaxed 정렬(`adkim=r` 또는 생략)이어야 한다.
- **SPF 정렬:** custom MAIL FROM이 필요하다. custom MAIL FROM은 하위 도메인이어야 하므로 `aspf=s`(strict)면 정렬에 실패한다. 기본값인 relaxed를 유지한다.
- **이메일 주소 identity만 쓰는 경우:** DKIM 식별자가 `amazonses.com`이 되어 From 도메인과 정렬되지 않고 DMARC에서 실패한다. 대량 발신자 요구사항을 맞추려면 도메인 identity로 옮긴다.

정책은 `_dmarc.<도메인>` TXT 레코드로 게시한다.

```text
_dmarc.example.com  TXT  "v=DMARC1;p=none;rua=mailto:dmarc-reports@example.com"
```

- `p=none`은 처리 지시 없이 보고만 받는 모니터링 모드, `p=quarantine`은 실패 메일을 스팸함으로, `p=reject`는 수신 거부를 요청한다. `rua`는 집계 보고서를 받을 주소이며 보고 주기는 사업자마다 다르고 보통 하루 단위다.
- 하위 도메인부터 `none`으로 시작해 보고서에서 정렬되지 않은 정상 발신원(외부 발송 서비스 등)을 찾아 고친 뒤 `quarantine`, `reject` 순으로 올린다. 준비 없이 강한 정책을 걸면 정상 메일도 전달되지 않을 수 있다.

## 대형 메일함의 대량 발신자 요구사항

| 사업자 | 대상 | 인증 요구 | 그 밖의 요구 |
|---|---|---|---|
| Gmail (2024-02-01 시행) | 개인 Gmail 계정으로 하루 5,000건 이상 보내는 발신자. 같은 기본 도메인의 하위 도메인은 합산하고, 한 번 해당하면 계속 대량 발신자로 본다 | SPF, DKIM, DMARC(`p=none` 허용). From 도메인이 SPF나 DKIM 도메인과 정렬 | 마케팅과 구독 메일의 one-click 수신 거부와 본문의 수신 거부 링크(거래 메일 제외), Postmaster Tools 스팸률 0.30% 미만(0.10% 미만 유지 권장). 수신 거부 요청은 48시간 안 처리를 권장하며, 지키지 않으면 전달 문제 지원 대상에서 빠진다. 2025년 11월부터 미준수 트래픽에 일시 또는 영구 거부를 포함한 집행 강화 |
| Outlook.com (outlook.com, hotmail.com, live.com 소비자 서비스) | 같은 From 도메인으로 하루 5,000건을 넘게 보내는 도메인 | SPF와 DKIM 모두 통과, DMARC `p=none` 이상이며 SPF나 DKIM 중 하나 이상(가능하면 둘 다) 정렬 | 2025-05-05부터 미준수 메일을 `550; 5.7.515`로 거부. 작동하는 수신 거부 링크, 목록 정리, 수신 동의 확인 권고 |

- SES에서는 도메인 identity와 Easy DKIM으로 DKIM 정렬을, custom MAIL FROM으로 SPF 정렬을 맞춘다. one-click 수신 거부는 SES 구독 관리가 `List-Unsubscribe`, `List-Unsubscribe-Post` 헤더를 넣어 지원한다([[SES-Suppression-and-Subscription|SES 억제 목록과 구독 관리]]).
- 기준 수치와 시행 시점은 사업자 정책이라 바뀔 수 있으므로 대량 발송 전에 각 사업자 문서를 다시 확인한다.

## 발송 인프라: 전용 IP와 configuration set

| 기준 | 공유 IP (기본) | 전용 IP (standard) | 전용 IP (managed) |
|---|---|---|---|
| 준비 | 바로 사용 | AWS Support 요청, 수동 warm-up | opt-in과 1회 설정. SES가 ISP별로 자동 warm-up |
| 평판 | SES가 관리하는 공유 평판 | 내 발송 습관이 결정. IP pool로 메일 유형별 분리 | 내 평판. ISP별 평판을 추적해 발송을 조절 |
| 맞는 발송 패턴 | 양과 관계없이 사용 가능. 적은 양과 불규칙한 양에 특히 적합 | 많고 꾸준한 양 | 많은 양. 불규칙해도 자동 확장 |
| IP 주소 | 알 수 없고 바뀔 수 있음 | 고정 | 발송량에 따라 늘고 줆 |
| 비용 | 기본 요금에 포함 | IP당 월 추가 요금 | 월 고정 요금과 메시지당 요금 |

- 큰 양을 꾸준히 보낼 계획이 없으면 공유 IP를 쓴다. 대부분의 ISP는 충분한 양을 받은 IP의 평판만 추적하므로, 전용 IP라면 평판을 쌓을 ISP마다 한 달에 한 번 이상 24시간 안에 수백 건을 보내야 한다. 발송이 불규칙한데 전용 IP가 필요하면 managed가 맞다.
- configuration set은 발송에 적용하는 규칙 묶음이다. event destination으로 Send, Delivery, Bounce, Complaint, DeliveryDelay, Reject, Open, Click, Subscription 같은 이벤트를 CloudWatch, Data Firehose, SNS, EventBridge 등에 보낸다.
- 전용 IP pool을 configuration set에 연결해 마케팅 메일과 거래 메일을 다른 pool로 보내면, 마케팅 캠페인이 평판을 떨어뜨려도 비밀번호 재설정 같은 거래 메일의 평판은 분리된다.
- 발송 요청에 configuration set을 지정하지 않으면 identity의 default configuration set이 적용되고, 요청에 지정하면 그것이 우선한다.

## 평판 지표와 감시

SES는 계정의 bounce rate와 complaint rate 등을 기준으로 발송 검토(under review)와 발송 중지(pause)를 결정한다. spamtrap 적중과 수동 조사(manual investigation)에서 드러난 문제도 검토나 중지 사유가 된다.

| 지표 | 권장 유지 | 검토 대상 | 발송 중지 가능 |
|---|---|---|---|
| Bounce rate | 2% 미만 | 5% 이상 | 10% 이상 |
| Complaint rate | 0.1% 미만 | 0.1% 이상 | 0.5% 이상 |

- bounce rate에는 검증하지 않은 도메인으로 보낸 hard bounce만 들어가고 mailbox full 같은 일시 실패는 빠진다. complaint rate는 피드백 루프로 SES에 불만을 전하는 사업자로 보낸 메일만으로 계산한다. 둘 다 고정 기간이 아니라 계정별 대표 발송량(representative volume)으로 계산하므로 콘솔 통계로 정확히 재현할 수 없다.
- CloudWatch의 `Reputation.BounceRate`, `Reputation.ComplaintRate`에 경보를 건다. AWS 경보 안내의 임계값(bounce 0.05, complaint 0.001)은 검토 진입 기준과 같으므로, 검토 전에 대응하려면 권장 유지선(bounce 2%)에 가까운 값으로 경보를 하나 더 둔다.
- 계정 단위 발송 중지에는 EventBridge 이벤트가 없다. 자동화는 `GetAccount` 응답의 `EnforcementStatus`를 주기적으로 읽는다. `GetAccountSendingEnabled` 값은 사용자가 직접 켜고 끈 상태라 집행에 따른 중지를 반영하지 않는다.
- Virtual Deliverability Manager(VDM)는 계정 단위로 켜는 기능이다(콘솔 온보딩 마법사 또는 API v2 `PutAccountVdmAttributes`). 대시보드는 계정, ISP, 발신 identity, configuration set, tenant 수준의 전달 데이터를 보여 준다. advisor는 SPF, DKIM, DMARC, BIMI 레코드가 없거나 형식이 틀린 경우, DKIM 키가 2048비트보다 짧은 경우, ISP별 complaint rate가 높은 경우를 권고로 띄우며 `ListRecommendations` API로도 읽을 수 있다.
- Gmail은 SES에 complaint 데이터를 주지 않으므로 SES complaint rate로는 Gmail 수신자의 스팸 신고를 볼 수 없다. Gmail 쪽 스팸률과 평판은 Google Postmaster Tools에서 확인한다.

## 출시 전 시험과 처리량

mailbox simulator는 실제 수신자 없이 결과를 재현한다. sandbox에서도 쓸 수 있고 일일 발송 할당량, 평판 지표, VDM 지표에 반영되지 않는다. 다만 최대 발송 속도 제한은 받고 요금은 일반 발송과 같다.

| 주소 (`@simulator.amazonses.com`) | 결과 |
|---|---|
| `success` | 수신 서버가 받아들인다. delivery 알림 |
| `bounce` | SMTP 550 5.1.1 hard bounce. 억제 목록에는 추가되지 않음 |
| `ooto` | 수신 뒤 부재중 자동 응답 |
| `complaint` | 수신 뒤 스팸 신고 |
| `suppressionlist` | global suppression list에 있는 주소처럼 hard bounce |

- 주소의 로컬 부분에 `bounce+label1`처럼 라벨을 붙여 반송을 원래 발송과 짝짓는 처리(VERP 포함)를 시험한다. 바이러스 거부(Reject)는 전용 주소가 없어 EICAR 시험 파일을 첨부해 확인하며, 이때는 할당량에 포함되고 요금도 붙는다.
- 처리량은 최대 발송 속도 안에서만 늘릴 수 있다. API는 요청 한 번으로 발송하지만 SMTP는 EHLO, MAIL FROM, RCPT TO, DATA, QUIT 같은 여러 왕복을 거치므로 대량 발송은 API가 유리하다. API에서는 HTTP 연결을 재사용하고, 여러 스레드나 프로세스로 동시에 보내고, 같은 리전의 EC2처럼 SES endpoint 가까이에서 실행한다. 한 장비의 동시 연결 수가 한계면 장비를 나눈다.

## 온보딩 순서

1. 일일 발송량, 초당 발송량, 메일 유형(거래, 마케팅), 전용 IP 필요 여부, 발신 도메인을 정한다.
2. 발송 리전에 도메인 identity를 만들고 Easy DKIM CNAME을 게시한다.
3. custom MAIL FROM의 MX와 SPF TXT, `_dmarc` TXT(`p=none`)를 게시한다.
4. production access를 신청한다. 주된 메일 유형(마케팅 또는 거래)과 웹사이트 URL을 적고, 명시적으로 요청한 사람에게만 보내며 bounce와 complaint 처리 절차가 있음을 확인한다. 첫 응답은 96시간 안에 오고 sandbox 상태는 리전마다 따로다.
5. configuration set과 event destination, 평판 경보, VDM을 설정하고 mailbox simulator로 반송과 불만 처리 경로를 시험한다.
6. 억제 목록과 구독 관리를 설정한다([[SES-Suppression-and-Subscription|SES 억제 목록과 구독 관리]]).
7. DMARC 보고서를 보며 정책을 `quarantine`, `reject`로 올린다.

## 출처

- [Amazon SES, Creating and verifying identities in Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html)
- [Amazon SES, Authenticating Email with DKIM in Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim.html)
- [Amazon SES, Easy DKIM in Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy.html)
- [Amazon SES API v2, DkimAttributes](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_DkimAttributes.html)
- [Amazon SES API v2, GetEmailIdentity](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_GetEmailIdentity.html)
- [Amazon SES, Using a custom MAIL FROM domain](https://docs.aws.amazon.com/ses/latest/dg/mail-from.html)
- [Amazon SES, Complying with DMARC authentication protocol in Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html)
- [Amazon SES, Request production access (Moving out of the Amazon SES sandbox)](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [Amazon SES, Dedicated IP addresses for Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/dedicated-ip.html)
- [Amazon SES, Using configuration sets in Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/using-configuration-sets.html)
- [Amazon SES, Monitor email sending using Amazon SES event publishing](https://docs.aws.amazon.com/ses/latest/dg/monitor-using-event-publishing.html)
- [Amazon SES, Amazon SES Sending review process FAQs](https://docs.aws.amazon.com/ses/latest/dg/faqs-enforcement.html)
- [Amazon SES, Creating reputation monitoring alarms using CloudWatch](https://docs.aws.amazon.com/ses/latest/dg/reputationdashboard-cloudwatch-alarm.html)
- [Amazon SES, Virtual Deliverability Manager for Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/vdm.html)
- [Amazon SES, Virtual Deliverability Manager advisor](https://docs.aws.amazon.com/ses/latest/dg/vdm-advisor.html)
- [Amazon SES, SES deliverability](https://docs.aws.amazon.com/ses/latest/dg/vdm-ses-deliverability.html)
- [Amazon SES API v2, PutAccountVdmAttributes](https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_PutAccountVdmAttributes.html)
- [Amazon SES, Using the Amazon SES account-level suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)
- [Amazon SES, Sending test emails in Amazon SES with the simulator](https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html)
- [Amazon SES, Increasing throughput with Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/troubleshoot-throughput-problems.html)
- [IETF RFC 7208, Sender Policy Framework (SPF) for Authorizing Use of Domains in Email, Version 1](https://www.rfc-editor.org/rfc/rfc7208)
- [Gmail Help, Email sender guidelines](https://support.google.com/a/answer/81126)
- [Gmail Help, Email sender guidelines FAQ](https://support.google.com/a/answer/14229414)
- [Microsoft Support, Fix NDR error 550 5.7.515 in Outlook.com](https://support.microsoft.com/en-us/outlook/fix-ndr-error-550-5-7-515-in-outlook-com)
- [Strengthening Email Ecosystem: Outlook's New Requirements for High-Volume Senders — Microsoft Defender for Office 365 Blog](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730)
- [An Overview of Bulk Sender Changes at Yahoo/Gmail — AWS Messaging Blog](https://aws.amazon.com/blogs/messaging-and-targeting/an-overview-of-bulk-sender-changes-at-yahoo-gmail/)
- [SES Deep Dive Series Part 2: Identity Verification and Domain Management — Amazon Web Services](https://www.youtube.com/watch?v=6ujgb_oR1Ok)
- [SES Deliverability learning series: Onboarding your email solution to Amazon SES — Amazon Web Services](https://www.youtube.com/watch?v=ypOK8xi6OJs)

## 관련 문서

- [[SNS-Email-SES|SNS 이메일 알림과 SES 선택]]
- [[SES-Suppression-and-Subscription|SES 억제 목록과 구독 관리]]
- [[DNS|DNS 레코드 (TXT, MX, CNAME)]]
- [[Route53|Route 53 (SES 레코드 자동 게시)]]
- [[CloudWatch-Logs-Alarms|CloudWatch Logs와 알람]]
