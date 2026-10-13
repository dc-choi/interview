---
tags: [aws, waf, bot-control, cloudfront, security, ai-crawler]
status: done
verified_at: 2026-10-13
category: "Infrastructure - AWS"
aliases: ["AWS WAF Bot Control", "Bot Control", "WAF 봇 관리"]
---

# AWS WAF Bot Control

Bot Control은 요청을 보낸 봇을 식별해 label을 붙이고, 규칙에 따라 차단이나 CAPTCHA 같은 액션을 적용하는 유료 관리형 rule group(`AWSManagedRulesBotControlRuleSet`, 50 WCU)이다. 식별 결과(label)와 처리 정책(허용, 차단, 캐시)을 나눠 설계해야 허용할 봇과 막을 봇을 한 규칙에 섞지 않는다. WAF 규칙의 기본 구조와 관리형 규칙의 오탐 예외는 [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]]을 따른다.

2026-10-13 AWS WAF 개발자 가이드와 관리형 규칙 changelog 대조 기준이다. 개발자 가이드는 가장 최근 static version을 설명하므로 실제 web ACL이 쓰는 버전으로 규칙과 label을 다시 확인한다. 기본 버전이 바뀌는 배포는 changelog에 남지 않을 수 있으므로 현재 기본 버전은 `ListAvailableManagedRuleGroupVersions`의 `CurrentDefaultVersion`으로 확인한다.

## 보호 수준

| 수준 | 탐지 방식 | 주의점 |
|---|---|---|
| Common | 검색 엔진, scraping framework, 자동화 브라우저처럼 자기 신원을 밝히는 봇을 정적 요청 분석으로 식별한다. label을 붙이고 검증하지 못한 봇은 차단한다 | 신원을 밝히지 않는 봇은 이 수준만으로 잡기 어렵다 |
| Targeted | Common에 더해 browser interrogation, fingerprinting과 행동 휴리스틱으로 신원을 밝히지 않는 봇을 찾고 rate limit, CAPTCHA, background browser challenge로 완화한다 | 토큰을 쓰는 규칙이 많아 JavaScript와 모바일 SDK 통합을 권장한다 |

`TGT_ML_`로 시작하는 규칙은 사이트 트래픽 통계를 기계 학습으로 분석해 여러 IP에 분산된 협조 봇을 찾는다. 기본으로 켜져 있고 끌 수 있다. 의미 있는 기준선을 만드는 데 최대 24시간이 걸리므로 공격이 없을 때 켜 둔다.

Targeted 규칙과 rate-based rule은 둘 다 요청 속도를 제한하지만 성격이 다르다.

| 항목 | rate-based rule | Targeted Bot Control |
|---|---|---|
| 기준 | 사용자가 정한 임계값과 집계 키(IP, HTTP method, query string 등) | 과거 트래픽 기준선과 요청 토큰. 임계값은 조정할 수 없다 |
| 완화 지연(비교 문서 기준) | 보통 30~50초, 길면 몇 분 | 보통 10초 미만, 길면 몇 분 |
| 분산 공격 한계 | IP만으로 제한할 때 규칙 인스턴스당 최대 1만 개 IP | IP와 토큰을 합쳐 최대 5만 개 |
| 요금 | WAF 기본 요금에 포함 | Targeted Bot Control 요금에 포함 |

## 검증된 봇과 AI 봇

- 범주 규칙(`Category*`)은 검증되지 않은 봇에만 Block을 적용한다. 검증된 봇에는 액션 없이 이름, 범주 label과 `bot:verified` label만 붙이며, signal 규칙도 검증된 봇에는 매칭되지 않는다.
- 예외는 `CategoryAI`다. 이 규칙은 IP 기반으로 검증된 봇까지 포함해 AI 봇에 Block을 적용한다. Version_4.0 이상을 명시적으로 선택한 web ACL에서는 아래 Web Bot Auth로 검증된 요청이 이 규칙에 매칭되지 않는다. WBA로 검증되지 않는 AI 크롤러나 에이전트까지 받아들일 사이트라면 `CategoryAI`를 Count로 override하고, 뒤에 `bot:category:ai`와 `bot:verified` label을 함께 확인하는 규칙으로 허용과 차단을 다시 정한다. Count로 바꿔도 label은 계속 붙는다. 사용자가 직접 호출하는 봇을 뜻하는 `bot:user_triggered:verified`는 미검증 봇처럼 취급되므로 허용 규칙을 짤 때 함께 판단한다.
- 봇 검증에는 WAF가 보는 요청 IP를 쓰며 Bot Control 자체의 IP 출처는 forwarded IP 설정으로 바꿀 수 없다. CloudFront, Akamai, Cloudflare와 Fastly의 IP 대역에서 온 요청은 Bot Control이 해당 CDN의 표준 클라이언트 IP 헤더를 자동으로 쓴다. 그 밖의 proxy나 load balancer를 거쳐 오는 검증된 봇은 Bot Control보다 앞에 forwarded IP 기반 허용 규칙을 둔다.
- 신원을 밝히지만 독립적으로 검증할 정보를 공개하지 않는 봇은 `bot:unverified`로 분류된다. 이런 서명은 위조될 수 있다.
- Web Bot Auth(WBA)는 요청 서명을 공개 키 디렉터리로 검증해 `bot:web_bot_auth:verified`, `invalid`, `expired`, `unknown_bot` label을 붙인다. static Version_4.0(2025-11-20)과 5.0은 CloudFront에서만 WBA를 지원하며, `verified` 요청에 `CategoryAI`와 `TGT_TokenAbsent`가 매칭되지 않는다. Version_6.0(2026-05-22)부터는 WBA 검증 봇을 모든 범주의 표준 검증 봇으로 취급해 범주 규칙 전체와 `TGT_TokenAbsent`가 매칭되지 않고, 상용 파티션의 리전 WAF에서도 쓸 수 있다. 이 버전들은 기본 버전의 동작을 바꾸지 않으므로 WBA를 쓰려면 해당 static version을 명시적으로 선택한다. 2026-10-13 changelog 기준 최신 static version은 6.1(2026-07-24)이다.

검색과 AI 답변 노출을 원하는 사이트는 도입 뒤 로그로 두 가지를 나눠 확인한다(운영 점검). 검색 엔진 범주 요청이 `bot:verified`로 통과하는지, 특히 자동 인식되지 않는 proxy나 load balancer 경로에서 검증에 실패해 미검증 봇으로 차단되지 않는지 본다. 그 밖의 AI 크롤러와 에이전트는 위 `CategoryAI` 결정대로 처리되는지 본다. 노출 측정은 [[AI-Search-Visibility|AI 검색 가시성 측정]]에서 다룬다.

## 도입 순서

1. rule group을 추가하면서 Override all rule actions를 Count로 둔다. 모든 규칙을 평가해 매칭만 세고 label은 계속 붙는다.
2. rule group을 기존 규칙과 rule group보다 뒤에 평가되도록 우선순위를 둔다. 기존 차단 규칙과 허용 규칙의 동작이 그대로 유지된다. 이미 ATP나 ACFP를 쓰고 있다면 아래 비용 순서(Bot Control, ATP, ACFP)와 함께 정한다.
3. 로그, 요청 샘플과 CloudWatch label metric으로 매칭 결과와 오탐을 확인한다. 로그에서 Count로 바꾼 규칙은 `action`이 count이고 `overriddenAction`에 원래 액션이 남는다.
4. 앞단 허용 규칙이나 scope-down statement는 label이 붙기 전에 평가되므로 IP나 헤더 같은 자체 조건으로 요청을 평가에서 뺀다. 앞단 Allow는 평가를 즉시 끝내므로 그 요청에는 Bot Control label이 붙지 않는다. label을 근거로 한 허용과 차단은 rule group 뒤의 label match 규칙에서 정한다. 테스트 뒤에도 관련 규칙은 Count로 두고 처리 결정은 사용자 규칙에 남기는 방식을 고를 수 있다.

## 비용 관리

아래는 pay-as-you-go 요금 기준이다. CloudFront flat-rate 요금제는 포함 기능과 조건이 다르므로 [[CloudFront#Flat-rate plan의 적용 경계|CloudFront flat-rate 요금제]]와 해당 요금제 문서를 따른다.

- Bot Control은 web ACL 평가에서 자신에게 도달한 모든 요청을 검사하고, 평가한 요청 수에 따라 비용이 늘어난다.
- scope-down statement나 앞단 규칙으로 검사 대상을 줄인다. IP reputation과 geo 차단처럼 저렴한 규칙을 앞에 두면 그 규칙이 차단한 요청은 유료 검사에 도달하지 않는다.
- 지능형 위협 완화 rule group을 여러 개 쓰면 Bot Control, ATP, ACFP 순서로 둔다.
- CloudFront에 연결한 web ACL은 캐시 조회보다 먼저 평가된다. CloudFront 문서는 WAF 규칙이 적용된 뒤 Lambda@Edge viewer request가 실행되고, viewer request는 캐시에 객체가 있는지 확인하기 전에 실행된다고 설명한다. 따라서 이 구성에서 캐시는 origin 부하를 줄이지만 WAF가 검사하는 요청 수를 줄이지 않는다(문서 동작에서 도출). 반면 origin ALB에 연결한 리전 web ACL은 캐시 hit 요청을 받지 않으므로 캐시가 그 web ACL의 검사량을 줄인다.

## label을 헤더로 넘겨 캐시와 origin 처리를 나누기

- 비차단 액션(Allow, Count, CAPTCHA, Challenge)과 기본 액션 Allow에서 요청에 사용자 헤더를 넣을 수 있다. CAPTCHA와 Challenge는 요청 토큰이 유효해 평가가 계속될 때만 해당한다. 헤더 이름에는 `x-amzn-waf-`가 붙고, 같은 이름이면 마지막으로 매칭된 규칙의 헤더만 남는다. 헤더는 검사가 끝난 뒤 들어가므로 뒤 규칙이 그 헤더를 검사할 수 없다.
- 외부 요청이 같은 접두사로 헤더를 위조하지 못하도록 `x-amzn-waf-`로 시작하는 헤더가 이미 있는 요청을 차단하는 규칙을 앞에 둔다.
- dynamic label interpolation은 요청 헤더, 응답 헤더와 응답 본문의 값에 `${namespace:}` 문법으로 label 값을 넣는다. label 하나가 매칭되면 그 label의 끝 값, 여러 개면 namespace를 뺀 값의 쉼표 목록, 없으면 빈 문자열이 된다. 문자열 값 하나에 placeholder는 10개까지이며, 직접 만든 label은 web ACL 문맥이 붙은 fully-qualified namespace로 참조해야 한다.
- CloudFront 앞단 WAF가 넣은 헤더는 CloudFront의 캐시 키 계산과 CloudFront Functions에서 쓸 수 있다. cache policy와 애플리케이션 코드에는 `x-amzn-waf-`가 붙은 최종 이름을 쓴다. 예를 들어 검증된 검색 엔진 범주 요청을 별도 캐시 키로 나눠 edge 캐시에서 응답하게 할 수 있다. 봇에게 사용자와 다른 본문을 주는 구성이라면 검색 엔진 정책을 따로 확인한다.
- 여러 label이 쉼표 목록으로 들어간 값이나 봇 이름을 그대로 캐시 키에 넣으면 캐시가 잘게 나뉜다. 특정 label match 규칙에서 `search`, `ai`, `other` 같은 소수의 고정 값을 넣거나 CloudFront Functions에서 값을 정규화한 뒤 키에 쓰고, 값별 적중률을 측정한다(설계 제안). 앞단 Allow로 통과시킨 요청에 헤더가 필요하면 그 Allow 규칙에서 직접 헤더를 넣는다.

## 지리 조건과 사이트별 정책

- geo match 문은 매칭 여부와 관계없이 국가와 지역 label을 붙인다. label은 규칙 평가가 끝날 때 붙으므로 그 label로 매칭하는 규칙은 별도로 둔다. 위치는 MaxMind GeoIP 데이터로 판정하며 국가와 IP 유형에 따라 정확도가 다르다.
- CloudFront geo restriction이 거부한 요청은 WAF로 전달되지 않는다. 지리 조건을 다른 조건과 결합하려면 CloudFront geo restriction 대신 WAF geo match를 쓴다.
- 일반 distribution은 distribution마다 web ACL 하나를 연결한다. multi-tenant distribution은 공통 web ACL에 더해 tenant별 web ACL로 추가 통제를 하거나 공통 설정을 override할 수 있다. tenant web ACL이 공통 설정을 override하므로 공통으로 필요한 규칙이 tenant 쪽에서 빠지지 않았는지 확인한다(설계 점검).

## 배치와 도구의 경계

- WAF를 연결한 ALB가 CloudFront origin이면 두 가지를 설정한다. CloudFront는 기본적으로 origin 요청에서 쿠키를 지우므로 `aws-waf-token` 쿠키를 ALB로 전달하게 한다. 또 브라우저가 보는 도메인은 CloudFront라서 토큰 도메인과 보호 리소스의 도메인이 어긋나므로 CloudFront distribution 도메인을 web ACL의 token domain 목록에 넣는다. 토큰 쿠키를 캐시 키에 넣으면 클라이언트마다 값이 달라 캐시 적중률이 떨어지므로 origin request policy로만 전달하는 방식을 검토한다(설계 제안).
- 새 콘솔의 protection pack은 기능상 web ACL과 다르지 않으며 API 수준에서는 표준 WAFv2 web ACL로 구현된다. 이름이 바뀌었다고 자동 방어 기능이 더해지지 않는다.
- 로그를 분석해 IP set을 갱신하던 Security Automations for AWS WAF 솔루션은 2026년 12월 은퇴 예정이다. 배포는 계속 동작하지만 이후 유지보수와 API 변경 대응은 고객 책임이 되므로, 관리형 규칙과 네이티브 rate-based rule 같은 WAF 기본 기능으로 옮길 계획을 세운다.

## 체크포인트

- AI 범주 봇을 받아들일지 정하고 `CategoryAI`의 기본 차단을 그 결정에 맞게 바꿨는가
- 자동 인식되지 않는 proxy나 load balancer를 거쳐 들어오는 검증된 봇의 허용 경로가 있는가
- scope-down과 앞단 저비용 규칙으로 유료 검사 대상을 줄였는가
- `x-amzn-waf-` 위조 헤더를 막는 규칙이 있는가
- CloudFront geo restriction으로 거부한 요청이 WAF 로그에 남지 않는다는 점을 알고 선택했는가

## 출처

- [AWS WAF, AWS WAF Bot Control rule group](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-bot.html)
- [AWS WAF, AWS Managed Rules changelog](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-changelog.html)
- [AWS WAF, Options for rate limiting in rate-based rules and targeted Bot Control rules](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rate-limiting-options.html)
- [AWS WAF, Testing and deploying AWS WAF Bot Control](https://docs.aws.amazon.com/waf/latest/developerguide/waf-bot-control-deploying.html)
- [AWS WAF, Best practices for intelligent threat mitigation in AWS WAF](https://docs.aws.amazon.com/waf/latest/developerguide/waf-managed-protections-best-practices.html)
- [AWS WAF, Inserting custom request headers for non-blocking actions](https://docs.aws.amazon.com/waf/latest/developerguide/customizing-the-incoming-request.html)
- [AWS WAF, Dynamic label interpolation](https://docs.aws.amazon.com/waf/latest/developerguide/waf-dynamic-label-interpolation.html)
- [AWS WAF, Geographic match rule statement](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-geo-match.html)
- [AWS WAF, Using AWS WAF with Amazon CloudFront](https://docs.aws.amazon.com/waf/latest/developerguide/cloudfront-features.html)
- [AWS WAF, Required configuration for Application Load Balancers that are CloudFront origins](https://docs.aws.amazon.com/waf/latest/developerguide/waf-tokens-with-alb-and-cf.html)
- [AWS WAF, Working with the updated console experience](https://docs.aws.amazon.com/waf/latest/developerguide/working-with-console.html)
- [AWS WAF, Using forwarded IP addresses in AWS WAF](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-forwarded-ip-address.html)
- [AWS WAF API Reference, ListAvailableManagedRuleGroupVersions](https://docs.aws.amazon.com/waf/latest/APIReference/API_ListAvailableManagedRuleGroupVersions.html)
- [Amazon CloudFront, How Lambda@Edge works with requests and responses](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-event-request-response.html)
- [Amazon CloudFront, CloudFront events that can trigger a Lambda@Edge function](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-cloudfront-trigger-events.html)
- [AWS Solutions, Security Automations for AWS WAF](https://docs.aws.amazon.com/solutions/security-automations-for-aws-waf/)
- [Do more with AWS WAF labels using dynamic label interpolation — AWS Security Blog](https://aws.amazon.com/blogs/security/do-more-with-aws-waf-labels-using-dynamic-label-interpolation/)
- [AWS EDGE Innovation Spotlight: Kingfisher — Amazon Web Services](https://www.youtube.com/watch?v=-XgM1uOKWAg)

## 관련 문서

- [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]] — web ACL 구조, 관리형 규칙 예외, CAPTCHA와 Challenge
- [[CloudFront|CloudFront]] — 캐시 키 정책, geo restriction
- [[Rate-Limiting|Rate Limit 정책 설계]] — 계층별 요청 제한
- [[AI-Search-Visibility|AI 검색 가시성 측정]]
