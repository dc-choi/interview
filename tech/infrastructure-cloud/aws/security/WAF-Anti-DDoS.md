---
tags: [aws, waf, ddos, anti-ddos, shield, security]
status: done
verified_at: 2026-10-14
category: "Infrastructure - AWS"
aliases: ["AWS WAF Anti-DDoS", "Anti-DDoS managed rule group", "AWSManagedRulesAntiDDoSRuleSet", "WAF L7 DDoS 관리형 규칙"]
---

# AWS WAF Anti-DDoS 관리형 규칙 그룹

`AWSManagedRulesAntiDDoSRuleSet`(50 WCU)은 보호 리소스마다 트래픽 기준선(baseline)을 만들고, 현재 트래픽이 기준선에서 크게 벗어나면 애플리케이션 계층(L7) DDoS 이벤트로 판단하는 유료 관리형 rule group이다. 이벤트 동안 요청에 의심 수준 label을 붙이고, 고른 민감도에 따라 Challenge(약한 완화)나 Block(강한 완화)을 적용한다. 사용자가 임계값과 집계 키를 정하는 rate-based rule과 달리 판정 기준이 기준선 편차와 요청별 의심 수준이다. web ACL 구조와 rate-based rule의 집계 범위는 [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]]을 따른다.

2026-10-14 AWS WAF 개발자 가이드, WAF API Reference, AWS Price List와 AWS 블로그 대조 기준이다. 개발자 가이드는 가장 최근 static version을 설명하므로 실제 web ACL이 쓰는 버전의 규칙과 label은 `DescribeManagedRuleGroup`으로 확인한다.

## WAF의 두 가지 DDoS 보호 수준

| 수준 | 대상 | 동작 | 추가 요금 |
|---|---|---|---|
| Resource-level DDoS protection | web ACL을 연결한 ALB | AWS 위협 인텔리전스로 알려진 악성 출처를 클라이언트 IP와 `X-Forwarded-For` 기준으로 호스트에서 걸러 속도를 제한한다. 기본 모드 Active under DDoS는 고부하나 DDoS 의심 상황에서만, Always on은 항상 동작한다 | 관리형 rule group 요금 없음 |
| Anti-DDoS 관리형 rule group | CloudFront, ALB와 WAF가 지원하는 다른 리소스 | 리소스별 기준선으로 새로운 공격 패턴을 탐지하고 민감도에 따라 Challenge와 Block을 적용한다 | 있음 |

- ALB에 이미 연결된 web ACL에는 resource-level 보호가 Active under DDoS 모드로 기본 활성화된다. 규칙, 로깅 대상, Firewall Manager 정책이 없고 기본 액션이 사용자 정의 헤더 없는 Allow인(구성이 없는) web ACL만 연결하면 WAF 요청 요금은 없지만 샘플 요청과 CloudWatch 지표도 나오지 않는다. 이 보호가 막은 요청은 `AWS/ApplicationELB`의 `LowReputationPacketsDropped`, `LowReputationRequestsDenied`로 본다.
- Bot Control, ATP, ACFP는 DDoS 보호용 rule group이 아니다. L7 DDoS는 이 rule group이나 Shield Advanced 자동 완화로 다룬다.

## 탐지와 label

label 네임스페이스는 `awswaf:managed:aws:anti-ddos:`이며 rule group 뒤에 평가되는 규칙과 CloudWatch label metric에서 쓸 수 있다. 전체 목록은 `DescribeManagedRuleGroup`의 `AvailableLabels`로 조회한다.

| label | 의미 |
|---|---|
| `event-detected` | 이벤트가 탐지된 리소스로 가는 모든 요청. 정상 요청에도 붙으므로 이 label만으로 공격 요청을 가려내지 않는다 |
| `ddos-request` | 이벤트 참여가 의심되는 출처의 요청. 확신 수준에 따라 `low-suspicion-ddos-request`, `medium-suspicion-ddos-request`, `high-suspicion-ddos-request`가 함께 붙는다 |
| `challengeable-request` | Challenge를 켰을 때 예외 정규식에 맞지 않는 `GET` 요청 |

토큰 상태 label(`awswaf:managed:token:accepted`, `rejected`, `absent` 등)도 함께 붙는다. rule group은 label을 붙여도 의심 요청마다 액션을 내리지는 않으므로, 의심 수준별 처리를 세밀하게 정하려면 rule group 뒤에 label match 규칙을 둔다. 예를 들어 오탐 부담이 큰 low 의심 요청은 차단 대신 요청량 제한으로 다루거나, 이벤트 중 `challengeable-request`가 없는 요청에 별도 정책을 적용한다.

## 규칙과 민감도

| 규칙 | 기본 액션 | 매칭 대상 |
|---|---|---|
| `ChallengeAllDuringEvent` | Challenge | 이벤트 중인 리소스로 가는 모든 `challengeable-request` 요청. Allow나 Count로만 override할 수 있고 Allow는 권장하지 않는다 |
| `ChallengeDDoSRequests` | Challenge | Challenge 민감도 이상의 의심 label이 붙은 `challengeable-request` 요청. 앞 규칙을 Count로 override했을 때만 평가된다 |
| `DDoSRequests` | Block | Block 민감도 이상의 의심 label이 붙은 요청 |

| 민감도 | 매칭하는 의심 수준 |
|---|---|
| LOW | high만 |
| MEDIUM | medium, high |
| HIGH | low, medium, high |

- API 기본값은 Challenge 민감도 `HIGH`, Block 민감도 `LOW`다. 정상 브라우저가 조용히 통과할 수 있는 Challenge는 넓게, 요청을 끊는 Block은 가장 확실한 요청에만 거는 조합이다. 도입 초기에는 Block 민감도를 LOW로 두고 로그를 보며 올린다.
- 기본 설정에서는 이벤트가 탐지되면 `ChallengeAllDuringEvent`가 모든 challengeable 요청에 Challenge를 걸기 때문에 Challenge 민감도가 쓰이지 않는다. 예상 밖 요청량 변화에 취약한 워크로드는 이 기본값을 유지하고, 덜 민감한 애플리케이션은 이 규칙을 Count로 바꾼 뒤 `ChallengeDDoSRequests`의 민감도로 범위를 조정한다.

## Challenge 예외 URI

Challenge interstitial은 HTML을 기대하는 클라이언트만 처리할 수 있다. 유효한 토큰이 없는 요청은 HTTP 202 Challenge 응답을 받고 원래 목적지로 가지 않으므로, interstitial을 처리하지 못하는 경로에서는 사실상 차단이 된다.

- 예외 정규식(`ExemptUriRegularExpressions`, 1~5개)에 맞는 요청에는 `challengeable-request`가 붙지 않아 두 Challenge 규칙이 평가되지 않는다. 이런 요청은 `DDoSRequests`로만 차단될 수 있다.
- 정규식은 scheme, query string, fragment를 뺀 host와 정규화한 path를 이은 문자열(예: `www.example.com/api/orders`)에 적용된다. 문자열이 host로 시작하므로 `^/api/`처럼 path 시작에 고정한 패턴은 맞지 않는다. 정규화로 빈 segment와 끝의 `/`가 지워져 `/api/`는 `/api`로 평가된다.
- 권장 시작값은 `\/api(\/|$)|\.(acc|avi|css|gif|jpe?g|js|mp[34]|ogg|otf|pdf|png|tiff?|ttf|webm|webp|woff2?)$`이다. API가 `/myapi/`나 `/apiv2/`처럼 다른 경로에 있으면 이 값으로는 맞지 않으므로 실제 경로로 고친다.
- 모바일 앱이나 HTML을 받지 않는 API 클라이언트는 WAF 애플리케이션 통합 SDK(JavaScript, Android, iOS)로 토큰을 미리 받게 하거나 해당 경로를 예외로 둔다.

## 배치와 설정

- scope-down statement를 쓰지 않는다. 관찰하는 요청이 줄면 기준선이 부정확해지고 이벤트 탐지가 약해진다. 비용을 줄이려고 검사 대상을 좁히는 [[WAF-Bot-Control|Bot Control]]과 반대다.
- Allow 규칙 바로 뒤, 다른 모든 규칙보다 앞에 둔다. 가능한 한 많은 트래픽을 관찰하게 하려는 배치다.
- API와 IaC에서는 `ManagedRuleGroupConfig`의 `AWSManagedRulesAntiDDoSRuleSet`에 `ClientSideActionConfig`를 반드시 넣는다. 그 안의 `Challenge.UsageOfAction`(`ENABLED`, `DISABLED`)이 필수이고, `ENABLED`면 예외 정규식도 필수다. 콘솔은 기본 정규식을 채워 주지만 API 요청에는 직접 넣어야 한다. 민감도를 생략하면 Block `LOW`, Challenge `HIGH`가 적용된다.
- `UsageOfAction`이 `DISABLED`면 `challengeable-request` label이 붙지 않고 두 Challenge 규칙이 평가되지 않는다. 이 설정은 규칙 사용 여부만 바꾸며, 액션 변경은 rule action override로 한다.

## 도입과 운영

1. 공격이 없는 평상시에 켠다. 기준선은 정상 트래픽으로 만들어야 하므로 인위적인 시험 트래픽보다 운영 부하를 반영한 트래픽을 쓴다. 공격 중에 추가했다면 Count 모드로 켜며, 공격 트래픽이 기준선을 왜곡하므로 공격이 끝난 뒤 기준선을 만드는 데 보통 평소의 2~3배 시간이 걸린다.
2. 스테이징에서 먼저 시험하고, 운영에서는 Override all rule actions를 Count로 둔다. 모든 규칙이 평가되고 label도 붙으며, 로그의 `ruleGroupList`에서 `action`은 count, `overriddenAction`에 원래 액션이 남는다.
3. 로그와 label metric으로 정상 요청이 Challenge 대상이 되는 경로를 찾아 예외 정규식을 넓힌다.
4. label match 규칙으로 처리 결정을 정한 뒤, 실제로 완화할 규칙만 Count를 해제한다. 관련 규칙은 Count로 두고 처리 결정을 사용자 규칙에 남기는 방식도 고를 수 있다.

기준선 형성은 분 단위, 완화 반응은 초 단위다(2026-07 AWS 발표 기준). 아래 Shield Advanced L7 자동 완화의 기준선이 24시간에서 30일 걸리는 것과 대비된다.

## 요금

2026-10-14 AWS Price List(us-east-1) 기준이며 리전과 시점에 따라 다르다.

- WAF 기본 요금에 더해 rule group 하나에 월 $20(시간 단위 일할)과 처리 요청 100만 건당 $0.15가 붙는다.
- 규칙이 Count가 아닌 상태로 완화하는 동안 DDoS로 탐지된 요청에는 요금을 받지 않는다. 계속 Count로 두면 보호와 이 감면을 모두 받지 못한다.
- Shield Advanced 보호 리소스는 이 rule group의 월정액이 없고, payer account 기준 월 500억 요청까지 구독에 포함된다.

## Shield Advanced 자동 완화와의 관계

2026-10-14 AWS Shield 개발자 가이드와 AWS Security Blog(2026-10-05 갱신본) 기준이다.

- 2026-03-26부터 이 rule group이 HTTP request flood 방어의 기본 해법이 되어 Shield Advanced의 L7 자동 완화(Layer 7 Auto Mitigation)를 대체한다. 기존 Shield Advanced 고객은 L7 자동 완화를 계속 쓸 수 있지만 아래 자동 전환 대상 web ACL은 전환일 전에 AWS Support로 opt-out해야 유지되고, 신규 고객은 AWS Support에 요청해야 쓸 수 있다.
- L7 자동 완화는 150 WCU rule group을 추가하고 기준선을 만드는 데 24시간에서 30일이 걸린다.
- 2026-10-25부터 조건을 충족한 web ACL에 이 rule group이 자동으로 추가되며 기존 Block 또는 Count 모드를 이어받는다. 대상은 이 rule group을 아직 쓰지 않고 opt-out하지 않은 web ACL 가운데 L7 자동 완화를 켠 보호 리소스가 하나이거나, 여러 보호 리소스의 자동 완화 설정이 모두 같은 것이다. 전환은 한 작업에서 L7 자동 완화를 끄고 rule group이 넘겨받는 방식이다. 조건에 맞지 않는 web ACL은 자동 전환되지 않고 전환 준비 기간에 무료로 붙던 Anti-DDoS 지표와 label도 이날 끝나므로 2027-01-28까지 직접 옮긴다. 자동 전환된 rule group은 민감도 LOW, Challenge 꺼짐 상태이므로 Challenge와 예외 정규식은 따로 설정한다.
- 2027-01-29부터 L7 자동 완화는 성능 개선과 우선 지원을 받지 않는다. IaC는 Shield 자동 대응 설정을 지우고 WAF managed rule group statement를 더한 뒤 실제 상태와 맞춘다.

## 체크포인트

- 공격이 없는 평상시 운영 트래픽으로 기준선을 만들었는가
- scope-down 없이 Allow 규칙 바로 뒤에 두었는가
- API, 정적 파일, 모바일 앱 경로가 host를 포함한 문자열 기준으로 예외 정규식에 실제로 맞는가
- 기본 설정이면 이벤트 중 모든 challengeable 요청이 Challenge된다는 점을 알고 `ChallengeAllDuringEvent`의 액션을 정했는가
- Count 시험 뒤 실제로 완화할 규칙의 Count를 해제했는가
- Shield Advanced를 쓴다면 자동 전환 뒤 Challenge 설정과 IaC 상태를 맞췄는가

## 출처

- [AWS WAF, Distributed Denial of Service (DDoS) prevention rule group](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-anti-ddos.html)
- [AWS WAF, Adding the Anti-DDoS managed rule group to your protection pack](https://docs.aws.amazon.com/waf/latest/developerguide/waf-anti-ddos-rg-using.html)
- [AWS WAF, Distributed Denial of Service (DDoS) prevention](https://docs.aws.amazon.com/waf/latest/developerguide/waf-anti-ddos.html)
- [AWS WAF, Resource-level DDoS protection for Application Load Balancers](https://docs.aws.amazon.com/waf/latest/developerguide/waf-anti-ddos-alb.html)
- [AWS WAF, Testing and deploying Anti-DDoS](https://docs.aws.amazon.com/waf/latest/developerguide/waf-anti-ddos-deploying.html)
- [AWS WAF, Best practices for intelligent threat mitigation in AWS WAF](https://docs.aws.amazon.com/waf/latest/developerguide/waf-managed-protections-best-practices.html)
- [AWS WAF, CAPTCHA and Challenge action behavior](https://docs.aws.amazon.com/waf/latest/developerguide/waf-captcha-and-challenge-actions.html)
- [AWS WAF, Client application integrations in AWS WAF](https://docs.aws.amazon.com/waf/latest/developerguide/waf-application-integration.html)
- [AWS WAF, Automating application layer DDoS mitigation with Shield Advanced](https://docs.aws.amazon.com/waf/latest/developerguide/ddos-automatic-app-layer-response.html)
- [AWS WAF API Reference, AWSManagedRulesAntiDDoSRuleSet](https://docs.aws.amazon.com/waf/latest/APIReference/API_AWSManagedRulesAntiDDoSRuleSet.html)
- [AWS WAF API Reference, ClientSideAction](https://docs.aws.amazon.com/waf/latest/APIReference/API_ClientSideAction.html)
- [AWS WAF API Reference, ClientSideActionConfig](https://docs.aws.amazon.com/waf/latest/APIReference/API_ClientSideActionConfig.html)
- [AWS WAF, AWS WAF metrics and dimensions](https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html)
- [AWS Price List Bulk API, AWS WAF offer file (us-east-1)](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/awswaf/current/us-east-1/index.json)
- [Introducing new application layer (L7) DDoS protections for AWS WAF and AWS Shield Advanced customers — AWS Networking & Content Delivery Blog](https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-the-aws-waf-application-layer-ddos-protection/)
- [AWS Shield Advanced is embracing the AWS WAF Anti-DDoS managed rule group: what changes and how to prepare — AWS Security Blog](https://aws.amazon.com/blogs/security/aws-shield-advanced-is-embracing-the-aws-waf-anti-ddos-managed-rule-group-what-changes-and-how-to-prepare/)
- [Configure application layer DDoS Protections with AWS WAF — Amazon Web Services](https://www.youtube.com/watch?v=ON9CfQwKkWM)

## 관련 문서

- [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]] — rate-based rule 집계, CAPTCHA와 Challenge, 관리형 규칙 예외
- [[WAF-Bot-Control|WAF Bot Control]] — 봇 분류와 유료 검사 비용 관리
- [[CloudFront|CloudFront]]
- [[ELB|ALB]]
- [[Cognito|Amazon Cognito]] — threat protection과 WAF의 역할 분담
