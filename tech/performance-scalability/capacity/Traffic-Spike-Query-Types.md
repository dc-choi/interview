---
tags: [performance, scalability, spike, cache, search, case-study, fan-out, ddos]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["Traffic Spike Query Types", "트래픽 폭증 유형 (Repetitive vs Unique Query)", "예측 불가 트래픽 스파이크", "Request Amplification", "호출 증폭"]
---

# 예측 불가 트래픽 폭증 — Repetitive vs Unique Query

재난, 속보, 외부 서비스 장애처럼 시점을 예측할 수 없는 이벤트는 순간적으로 평소의 수 배에 달하는 트래픽을 만든다. 신년 자정 같은 예측 가능한 스파이크([[Capacity-Planning|캐퍼시티 플래닝]])와 달리 준비 기간이 없으므로, 평소의 인프라 구성 자체가 폭증을 흡수할 수 있는 구조여야 한다. 폭증하는 트래픽의 워크로드 성격(같은 요청의 반복인가, 서로 다른 요청의 총량 증가인가)에 따라 부하가 도달하는 계층이 다르다 — 이 구분이 계층별 캐퍼시티 차등 할당의 근거가 된다. 분산 구조에서는 뒤쪽 계층으로 갈수록 호출이 곱해져 부하가 커질 수 있고, 공격처럼 흡수하지 말고 걸러야 하는 폭증도 있다.

## 왜 어려운가 — 효율과 헤드룸의 트레이드오프

- 대용량 분산 시스템은 비용 효율을 우선으로 구성된다. 평소 트래픽 기준으로 최적화된 시스템은 외부 요인의 급증에 그만큼 취약해진다.
- 계층 구조 + 분산 구성에서는 **일부 영역의 장애가 나머지 영역으로 부하를 전가**한다. 특정 서버의 작은 장애도 전체 안정성에 영향을 줄 수 있다.
- 폭증 대비로 전체 인프라를 산술적으로 증설하면 실제 부하 증가폭보다 비용 증가가 더 크다. 따라서 전면 증설이 아니라 **구체적 취약점 단위의 세부 대응**이 필요하다.

## 두 가지 폭증 유형

| 구분 | Repetitive Query 증가 | Unique Query 증가 |
|---|---|---|
| 트리거 | 국가적 이슈 (재난, 속보, 탄핵 등) | 경쟁사, 외부 서비스 장애로 트래픽 유입 |
| 워크로드 | 특정 검색어에 동일, 유사 요청 집중 | 모든 검색어의 요청이 함께 증가 |
| 지속 시간 | 짧다 (이슈 소강과 함께 감소) | 외부 서비스 복구까지 장기화 가능 |
| 캐시 효과 | 캐시 히트율 급상승 → 결과 재활용 가능 | 캐시 재활용에 한계 |
| 부하 도달 계층 | 상단(통합, 캐시)에서 대부분 흡수, 하위 계층은 오히려 트래픽 감소 | 증가분이 하위 계층까지 대부분 전달 |
| 증가폭 예측 | 불가 (순간 수 배) | 가능 — 전체 서비스 사용자 수가 상한 |

### Repetitive Query — 캐시가 방파제

짧은 시간에 똑같은 검색어가 몰리면 이전 결과를 일정 시간 저장해 둔 캐시 계층의 히트율이 높아진다. 상단의 통합, 캐시 계층이 증가분을 감당하면 전체 계층이 함께 부하를 질 필요가 없고, 실제로 하위 계층은 평소보다 낮은 트래픽을 받기도 한다. 같은 키에 요청이 집중된다는 점에서 [[Hot-Key|Hot Key]] 문제와 같은 축이지만, 읽기 전용 결과의 재활용이라 캐시가 정확히 유리한 방향으로 작동하는 경우다.

### Unique Query — 상한 기반 사이징

서로 다른 요청의 총량이 늘면 캐시로 걸러지지 않아 하위 계층(개별 서비스, 저장소)까지 부하가 전달된다. 대신 최대 증가폭은 전체 서비스 사용자 수의 상한으로 예측할 수 있으므로, 하위 계층은 그 상한 기준 수 배의 여유로 사이징한다.

## 계층별 차등 캐퍼시티 할당

두 유형을 조합하면 전 계층 균등 증설이 아닌 차등 할당이 나온다.

- **상단 (통합, 캐시 계층)**: Repetitive Query 폭증 대비 — 수십 배 트래픽을 견디도록 할당. 캐시 히트로 요청당 비용이 낮아 상대적으로 저렴하게 큰 배수를 확보할 수 있다.
- **하단 (응용 계층 이하 개별 서비스)**: Unique Query 증가 대비 — 각각 수 배의 부하 증가를 견디도록 구성. 사용자 수 상한이 근거이므로 수십 배까지는 불필요.

인프라 할당만으로는 모든 유형의 문제를 해결할 수 없으므로, 이 위에 실시간 가용량 감시와 사전 경보 같은 유연한 대응 수단이 추가로 필요하다 — [[N-1-Capacity-Headroom|N-1 가용량 헤드룸 (최대가용배수 vs 부하증가배수)]].

## 호출 증폭 — 뒤쪽 계층일수록 요청이 늘 수 있다

분산 구조에서는 사용자 요청 하나가 계층을 지날 때마다 여러 호출로 갈라질 수 있다. 페이지 하나가 API 여러 개를 부르고, API가 내부 서비스 여러 개를, 서비스가 쿼리 여러 개를 실행한다. 모놀리식에서 큰 DB에 쿼리 한 번으로 끝나던 조회가 계층마다 나뉘면, 가장 뒤에 있고 확장 비용이 큰 저장소가 가장 많은 호출을 받을 수 있다.

계층별 도달 요청 수는 사용자 요청 수에 그 계층까지의 호출 배수를 곱하고, 앞선 캐시들의 miss 비율을 곱해 어림한다. 예를 들어 페이지 1건이 API 5건을 부르고 API마다 내부 호출이 6건이면 내부 계층은 페이지당 30건을 받는다. 앞단 캐시가 60%, 내부 캐시가 90%를 적중시키면 내부 서버에 닿는 호출은 30 × 0.4 × 0.1 = 1.2건이다. 재시도도 같은 방식으로 곱해진다 — [[Retry-Backoff-Jitter|계층형 재시도 증폭]].

- 계층마다 캐시 적중과 miss, 하위 서비스로 보낸 요청 수를 지표로 남긴다. 증폭이 커지는 구간을 이 지표로 찾는다.
- 호출 배수 자체는 화면 단위 API 통합과 일괄 조회로 줄인다 — [[Traffic-Scaling-Playbook|트래픽 스케일링 실전]].

## 캐시로 확장 공백을 메운다

자동 확장은 부하를 감지한 뒤 자원을 준비하므로, 그 사이의 급증은 이미 있는 여유 용량이 받아야 한다. AWS Well-Architected REL07-BP03은 추가 자원이 준비되는 동안 버스트를 처리할 헤드룸을 확장 정책에 두라고 하고, Games Industry Lens GAMEOPS03-BP05는 변동이 큰 트래픽에는 확장할 시간이 부족할 수 있어 사전 증설이 낫다고 설명한다. DB 계층의 수직 확장에는 중단이 따를 수 있다. Amazon RDS는 DB 인스턴스 클래스를 바꾸는 동안 중단이 생기고, Multi-AZ 구성으로 그 중단을 줄일 수 있다(2026-10-14 공식 문서 대조).

그래서 자동 확장이 걸린 계층마다 앞에 캐시를 두고, 확장이 따라오기 전의 요청을 캐시 적중으로 받아 내는 구성이 쓰인다(아래 커머스 사례). 이 구성이 버티는 조건과 약점은 다음과 같다.

- **적중률이 유지될 때만 뒤쪽 부하가 일정하다.** 요청마다 결과가 다른 조회는 적중률이 낮아 캐시가 도움이 되지 않는다. Unique Query 증가에서는 증가분이 대부분 뒤쪽 계층까지 간다.
- **캐시가 비거나 멈추면 뒤쪽 계층이 직격을 받는다.** 캐시를 믿고 하위 서비스와 DB를 줄여 두면, 트래픽 패턴 변화나 캐시 장애로 캐시가 비는 순간 요청이 몰린다. 캐시를 끈 상태로 부하 테스트를 해서 부하 차단, 하위 호출 상한, 오래된 데이터 응답 같은 보호 장치가 동작하는지 확인한다 — [[Cache-Decision|캐시 장애 대비]], [[Cache-Stampede|콜드 캐시와 요청 병합]].
- **프로세스 내부 캐시는 서버가 늘수록 miss도 는다.** 서버마다 캐시가 따로 있으면 하위 부하가 서버 대수에 비례하고, 새로 뜬 서버는 빈 캐시로 시작한다. 외부 캐시는 이 문제가 적지만 캐시 클러스터 자체가 증폭된 요청을 받으므로, 요청률과 메모리 한도의 선행 지표를 감시하고 미리 늘린다.

## 비정상 트래픽 — 흡수하지 않고 엣지에서 거른다

DDoS나 악성 봇처럼 정상 사용자와 무관한 폭증은 앞의 두 유형과 따로 다룬다. 서비스 사용자 수가 상한이 되지 않으므로 Unique Query처럼 상한으로 사이징할 수 없다. 확장으로 흡수하는 것도 대응 수단이지만, 그것만으로 버티면 가용성은 지켜도 비용이 공격 규모를 따라 늘어난다. AWS의 DDoS 대응 백서도 공격에 맞춰 인프라를 확장하며 생기는 불필요한 직접 비용을 피할 대상으로 든다.

- **VPC 안이 아니라 엣지에서 거른다.** CloudFront 같은 엣지 서비스는 SYN flood, UDP reflection 같은 인프라 계층 공격을 출발지 가까이에서 격리해 오리진에 닿지 않게 하고, L7 공격은 AWS WAF 규칙과 함께 거른다. 캐시하기 어려운 동적 콘텐츠도 CloudFront를 거치게 하면 지속 연결과 TTL 설정으로 오리진에 돌아가는 요청과 TCP 연결 수를 줄일 수 있다. 2026-10-14 백서 기준으로 CloudFront나 AWS WAF가 거부한 요청에는 CloudFront의 HTTP 요청 요금과 데이터 전송 아웃 요금이 부과되지 않는다. WAF 요금은 별개다. 2026-10-14 요금 페이지 기준 web ACL과 규칙의 월 요금에 더해 web ACL이 처리한 요청 수로 따로 과금한다.
- **캐시 우회 공격은 Unique Query처럼 움직인다.** 쿼리 문자열을 바꿔 CDN 캐시를 비켜 가는 cache-busting 공격은 매 요청을 오리진까지 보낸다. 평시 적중률로 공격 부하가 줄어든다고 가정하지 않는다. 캐시 키에는 결과를 바꾸는 쿼리 문자열만 넣고, 비정상 요청은 WAF 규칙으로 거른다 — [[Shield-WAF-NetworkFirewall|WAF 규칙과 L7 DDoS 대응]].
- **오리진은 CDN을 거친 요청만 받는다.** 엣지에서 걸러도 오리진에 직접 닿는 경로가 열려 있으면 우회된다. 백서는 VPC 안의 오리진이면 해당 CloudFront 배포만 요청을 보낼 수 있게 하라고 하며, CloudFront VPC origins를 권장 방식으로 든다(2026-10-14 백서 기준).
- **비용 보호는 보험이다.** Shield Advanced의 비용 보호는 공격으로 늘어난 확장 비용의 일부를 사후에 요청해 크레딧으로 보전받는 제한적 장치다(2026-10-14 Shield 문서와 백서 기준). 차단 설계를 대신하지 않는다 — [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]].

## 사례 — 검색 시스템의 실측 수치

수백 억 건 문서를 수집, 저장, 정제, 검색, 응용, 표현, 캐시, 통합 계층으로 나눠 처리하는 대규모 검색 시스템(일 억 단위 요청)의 기록:

- 규모 5.5 지진 발생 순간 평소 대비 약 4.2배 트래픽, 여진과 수능 연기 발표로 같은 날 약 1.6배 피크 2회 추가. 그날 하루 전체 트래픽은 평소보다 약 7.3% 증가에 그침 — 순간 배수와 일 총량의 괴리가 Repetitive Query의 짧은 지속시간을 보여준다.
- 유명인 사망 속보 시 최대 2.5배 트래픽이 저녁 내내 지속, 하루 전체 약 10.8% 증가.

## 사례 — 커머스의 캐시 앤 스케일과 엣지 필터링 (2018 발표 기준)

마이크로서비스와 분산 DB로 옮긴 커머스 서비스의 기록이다.

- 오픈 전 성능 테스트에서 뒤쪽 계층으로 갈수록 호출이 늘어, 상용 DB 같은 비싼 자원이 있는 백엔드를 훨씬 더 늘려야 하는 현상을 발견했다.
- 자동 확장이 걸린 모든 엔드포인트 앞에 캐시를 두었다(일부는 Amazon ElastiCache 기반 Redis). 이벤트와 DDoS 기간에 백엔드 캐시로 가는 요청은 급증했지만 백엔드 WAS가 받는 요청은 거의 일정했다.
- DDoS가 이어지며 평시의 최대 10배 이상 서버를 쓰게 되자, CloudFront, AWS WAF와 Shield Advanced로 VPC 바깥에서 거르는 방식을 더했고 유입 트래픽이 줄었다.

## 면접 체크포인트

- 갑작스러운 트래픽 폭증에 어떻게 대비하나 → 폭증의 워크로드 성격부터 구분. 동일 요청 반복(캐시로 상단 흡수)인지 총량 증가(하위 계층까지 전달, 단 사용자 수가 상한)인지에 따라 대응 계층이 다르다.
- 전 계층을 같은 배수로 증설하지 않는 이유 → 부하가 도달하는 깊이가 유형별로 다르므로, 상단 수십 배와 하단 수 배의 차등 할당이 비용 효율적.
- 캐시 히트율이 스파이크 때 오히려 올라가는 이유 → 요청 분포가 특정 키로 쏠리면 재활용률이 높아진다. 평시 히트율로 스파이크 상황을 추정하면 안 됨.
- 예측 가능 스파이크와의 차이 → 예측 가능하면 사전 사이클(계측, 계획, 개선, 검증)로 대비하고, 예측 불가면 평시 구조(계층별 헤드룸)로 흡수한다.
- 서비스를 잘게 나눈 뒤 DB 부하가 늘 수 있는 이유 → 계층마다 호출이 곱해지는 증폭. 계층별 호출 수와 캐시 miss를 지표로 보고, 화면 단위 통합과 계층별 캐시로 줄인다.
- 캐시로 뒤쪽 부하를 일정하게 유지하는 구조의 약점 → 적중률이 무너지는 순간(Unique Query, 캐시 장애, 콜드 스타트) 뒤쪽 계층이 직격을 받는다. 캐시를 끈 부하 테스트와 부하 차단으로 대비한다.
- DDoS를 자동 확장으로 버티면 되나 → 가용성은 지켜도 비용이 공격 규모를 따라간다. 엣지에서 거르고, 오리진은 CDN을 거친 요청만 받게 하며, 비용 보호는 보험으로 둔다.

## 출처

- [지진에도 흔들리지 않는 네이버 검색 시스템 1편 — 네이버 검색 공식블로그](https://blog.naver.com/naver_search/221149578068)
- [AWS All-in 그리고 그 이후 (롯데닷컴) — Amazon Web Services Korea](https://www.youtube.com/watch?v=BgnX32apZfg)
- [Caching challenges and strategies — Amazon Builders' Library](https://builder.aws.com/content/3K9TeXp6strMiJ4vhakpRD7BQWO/caching-challenges-and-strategies)
- [AWS Well-Architected Framework, REL07-BP03 Obtain resources upon detection that more resources are needed for a workload](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_adapt_to_changes_proactive_adapt_auto.html)
- [AWS Games Industry Lens, GAMEOPS03-BP05 Pre-scale infrastructure required to support peak requirements](https://docs.aws.amazon.com/wellarchitected/latest/games-industry-lens/gameops03-bp05.html)
- [AWS 공식 문서, Settings for DB instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ModifyInstance.Settings.html)
- [AWS Best Practices for DDoS Resiliency, Abstract](https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/aws-best-practices-ddos-resiliency.html)
- [AWS Best Practices for DDoS Resiliency, Mitigation techniques](https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/mitigation-techniques.html)
- [AWS Best Practices for DDoS Resiliency, Amazon EC2 with Auto Scaling (BP7)](https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/amazon-ec2-with-auto-scaling-bp7.html)
- [AWS Best Practices for DDoS Resiliency, Web application delivery at the edge (BP1)](https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/web-application-delivery-at-the-edge-bp1.html)
- [AWS Best Practices for DDoS Resiliency, Application layer attacks](https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/application-layer-attacks.html)
- [AWS Best Practices for DDoS Resiliency, Protecting your origin (BP1, BP5)](https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/protecting-your-origin-bp1-bp5.html)
- [AWS 공식 문서, Increase the proportion of requests that are served directly from the CloudFront caches (cache hit ratio)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-hit-ratio.html)
- [AWS WAF Pricing](https://aws.amazon.com/waf/pricing/)
- [AWS 공식 문서, AWS Shield Advanced capabilities and options](https://docs.aws.amazon.com/waf/latest/developerguide/ddos-advanced-summary-capabilities.html)

## 관련 문서

- [[N-1-Capacity-Headroom|N-1 가용량 헤드룸]] — 인프라 할당 위에 얹는 실시간 임계 상황 감시 (시리즈 2편)
- [[Capacity-Planning|캐퍼시티 플래닝]] — 예측 가능한 스파이크의 사전 대비 사이클 (상보 관계)
- [[Traffic-Scaling-Playbook|트래픽 스케일링 실전]] — 증설 없는 병목 최적화
- [[Multi-Level-Cache|멀티레벨 캐시]] — 계층별 캐시 흡수의 일반 구조
- [[Hot-Key|Hot Key]] — 특정 키 집중의 저장소 관점
- [[Cache-Strategies|Cache 전략]]
- [[Scale-Up-vs-Out|Scale Up vs Scale Out]]
- [[SRE|SRE]] — 예측 불가 이벤트의 비상 대응 체계
- [[Retry-Backoff-Jitter|재시도와 백오프]] — 계층마다 곱해지는 재시도 증폭
- [[Cache-Decision|캐시 도입 판단]] — 캐시 장애 때 DB 보호와 캐시 없는 부하 측정
- [[Cache-Stampede|Cache Stampede]] — 콜드 캐시와 요청 병합
- [[Auto-Scaling|EC2 Auto Scaling]] — 예약 확장과 instance warmup
- [[Shield-WAF-NetworkFirewall|Shield, WAF, Network Firewall]] — 엣지 차단 계층, L7 DDoS 규칙과 비용 보호
