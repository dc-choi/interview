---
tags: [performance, scalability, spike, cdn, streaming, drm, auto-scaling, spot, case-study]
status: done
verified_at: 2026-10-14
category: "성능&확장성(Performance&Scalability)"
aliases: ["Media Event Traffic", "미디어 공개 트래픽", "영상 공개와 중계 트래픽", "라이브 중계 트래픽 급증"]
---

# 미디어 공개와 중계 이벤트 트래픽

영상 공개, 스포츠 중계, 공연 생중계처럼 많은 사용자가 같은 시각에 재생을 시작하는 워크로드다. 부하가 두 겹으로 온다. 재생 직전의 짧은 구간에는 앱 진입, 로그인, 재생 권한과 라이선스 요청이 한꺼번에 몰리고, 재생이 이어지는 동안에는 CDN이 동시 시청 수에 비례하는 대역폭을 계속 전달한다. 공개 시각을 아는 이벤트는 계층마다 미리 용량을 확보한다. 시각이나 규모를 예상하지 못한 급증은 캐시와 평시 여유 용량이 먼저 받고 자동 확장이 뒤따른다.

일반적인 사전 대비 사이클은 [[Capacity-Planning|캐퍼시티 플래닝]], 재생 경로의 구조는 [[Video-Streaming-System-Design|주문형 비디오 스트리밍 설계]]를 따른다. 이 문서는 미디어 이벤트에서 부하가 걸리는 지점과 지점별 산정 방법을 다룬다.

## 부하가 걸리는 지점

| 지점 | 부하의 모양 | 먼저 확인할 한계 |
|---|---|---|
| CDN | 동시 시청 수와 비트레이트에 비례하는 지속 대역폭 | 배포별 전송률과 요청률 quota, CDN 계약 용량 |
| 로드밸런서와 API | 앱 진입, 로그인, 재생 시작 요청의 순간 급증 | 자동 확장이 따라오는 데 걸리는 시간 |
| 재생 시작 의존성 | 재생 시작 때 부르는 라이선스와 접근 정보 발급(라이선스는 갱신과 키 교체 때 반복될 수 있다) | 공개 직후의 재생 시작률, 외부 업체의 용량 |
| 재생 중 주기 호출 | 동시 재생 제한용 heartbeat 같은 반복 요청 | 동시 세션 수 / 호출 간격 |
| 처리 경로 | 편성 시각에 몰리는 변환 작업 | 관리형 변환 서비스의 동시 작업 한도 |

## CDN에서 먼저 차는 한도는 요청당 크기가 정한다

2026-10-14 CloudFront quota 문서 기준으로 배포 하나의 기본 한도는 데이터 전송률 150 Gbps, 초당 요청 250,000건이며 지원 케이스로 증설을 요청한다. CloudFront flat-rate 요금제에 가입한 배포에는 이 두 한도가 적용되지 않는다.

두 한도 중 무엇이 먼저 차는지는 요청당 평균 크기로 정해진다. 기본 한도의 경계는 150 Gbps / 250,000 rps = 요청당 약 75 KB다. 평균 5 Mbps 스트림을 3만 명이 동시에 보면 30,000 × 5 Mbps = 150 Gbps로 기본 전송률 한도에 이른다. 세그먼트 길이를 6초로 가정하면 세그먼트 하나는 약 3.75 MB로 경계보다 훨씬 크고, 이때 세그먼트 요청은 초당 약 5,000건으로 요청 한도의 2% 수준이다. 이런 구성에서는 전송률 한도에 먼저 닿는다. 피크 대역폭은 [[Video-Streaming-System-Design#용량을 산정하는 식|peak egress 산식]]으로 구하고, 증설 요청에 걸리는 시간을 공개 일정에 넣어 미리 요청한다.

요청당 크기를 줄이는 구성에서는 요청률도 함께 계산한다. RFC 8216은 라이브 클라이언트가 세그먼트와 별도로 Media Playlist를 주기적으로 다시 받게 한다. 2026-10-14 IETF 초안(draft-pantos-hls-rfc8216bis-22) 기준 저지연 HLS는 미디어를 더 작은 partial segment로 나눠 전달하고, 서버가 지원하면 클라이언트는 다음 playlist 갱신을 기다리는 blocking 요청으로 새 partial segment를 확인한다. 짧은 partial segment, 잦은 playlist 요청과 저비트레이트 rendition이 겹치면 요청 한도가 먼저 찰 수 있다.

CDN 계약이 보장 용량과 증설 절차를 정하는 경우도 있다. 아래 사례의 이전 CDN은 보장 용량을 넘는 행사마다 사전 증설 요청이 필요했고 일정 수준 이상은 불가능했다. 어떤 CDN이든 상한이 어디서 정해지는지와 증설에 걸리는 시간을 먼저 확인한다.

## 진입 계층은 자동 확장보다 먼저 몰린다

공개 알림을 받은 사용자는 거의 같은 시각에 앱을 열고 로그인과 재생 시작을 요청한다. CDN 한도를 늘려도 앱 진입 API가 응답하지 못하면 재생은 시작되지 않는다.

- **로드밸런서:** ALB는 트래픽에 따라 자동으로 확장한다. 2026-10-14 문서는 갑작스럽고 이례적인 트래픽이 예정된 이벤트와 짧은 기간 예측하기 어려운 급증에 LCU 예약을 고려하라고 한다. 예약 뒤에도 트래픽에 따른 확장은 계속되며 용량이 예약한 최소값 아래로는 내려가지 않는다. 예약은 최소 100 LCU이고, 필요한 양은 부하 테스트나 과거 `PeakLCUs`의 분당 `Sum`으로 산정한다 — [[ELB#LCU 예약으로 급증 전에 최소 용량 확보|ELB LCU 예약]].
- **API 서버:** 예약 증설로 공개 전에 늘린다. 예약 실행 지연, 인스턴스 준비 시간과 행사 전 축소 방지는 [[Auto-Scaling#예정된 급증은 준비 완료 시각에서 역산한다|예약 증설의 준비 시각 역산]]을 따른다.

### 공개 일정을 증설의 입력으로 쓴다

EC2 Auto Scaling의 scheduled action은 지정한 시각에 그룹의 원하는 용량과 필요하면 최소, 최대 용량을 바꾼다. 일회성과 반복 일정이 모두 가능하다. 다른 조정 작업이 이미 예약된 시각에 action을 만들면 거부되고, 그룹당 125개까지 만들 수 있다. 실행은 보통 몇 초 안에 되지만 예정 시각보다 최대 2분 늦을 수 있다. 만든 뒤에는 이름을 뺀 설정을 고칠 수 있다(2026-10-14 문서 대조).

설계 제안: 공개 시각이 정해지는 곳(예약 공개 기능이 있는 CMS)에서 증설 action과 원복 action을 함께 만든다. 별도 캘린더를 주기적으로 읽어 그룹을 갱신하는 방식(아래 사례)도 동작하지만, 공개 시각이 바뀌면 두 일정이 어긋날 수 있다. 일정을 바꾸거나 취소할 때 action도 함께 고치거나 지우고, 원복 action이 실제로 실행됐는지 확인한다.

### 이벤트 용량을 Spot으로 채울 때

이벤트용 증설분은 몇 시간만 쓰므로 Spot이 후보가 된다. Mixed instances policy는 한 Auto Scaling 그룹에서 On-Demand와 Spot을 함께 쓴다. 다음은 2026-10-14 EC2 Auto Scaling과 EC2 문서 대조 기준이다.

- `OnDemandBaseCapacity`는 On-Demand로 채워야 하는 최소 용량이며 그룹이 커질 때 먼저 시작된다. 기본값은 0이다.
- `OnDemandPercentageAboveBaseCapacity`는 기본 용량을 넘는 부분의 On-Demand 비율이다. 20이면 On-Demand 20%, Spot 80%이고 기본값 100이면 On-Demand만 쓴다.
- Spot 할당 전략은 중단 가능성이 낮으면서 가격이 낮은 풀을 고르는 `price-capacity-optimized`가 권장값이다. API에서 지정하지 않을 때의 기본값 `lowest-price`는 가격만 보므로 중단이 잦을 수 있다. 여러 인스턴스 유형과 AZ를 허용하면 고를 수 있는 Spot 풀이 늘어난다.
- EC2 문서에서 Spot 중단 통지는 중지나 종료 2분 전에 오지만 best effort로 발행된다. Mixed instances 문서는 무상태 웹 서버와 API 엔드포인트를 Spot에 맞는 워크로드의 예로 든다.

설계 제안: 이벤트 동안 서비스를 유지하는 데 꼭 필요한 대수는 `OnDemandBaseCapacity`로 두고 그 위의 여유분만 Spot으로 채운다. 할당 전략을 명시하고, 공개 직전에 Spot을 원하는 대수만큼 얻지 못할 때의 대응을 정해 둔다. 계정 할당량과 실제 가용 용량의 구분은 [[Capacity-Planning#할당량, 실제 용량과 준비 완료를 따로 확인한다|캐퍼시티 플래닝]]을 따른다.

## 재생 시작 때 부르는 경로는 공개 직후에 한꺼번에 몰린다

주로 재생을 시작할 때 부르는 경로는 평소 부하가 작아 용량 계획에서 빠지기 쉽다. 공개 직후에는 이 경로의 요청률이 재생 시작률을 따른다.

- **DRM 라이선스:** W3C Encrypted Media Extensions(2017 Recommendation)에서 라이선스 교환은 애플리케이션이 통제한다. `generateRequest()`가 초기화 데이터로 새 라이선스 요청(`license-request`) 메시지를 만들고, 기존 라이선스의 갱신은 별도의 `license-renewal` 메시지다. 라이선스 요청은 세그먼트를 받을 때마다가 아니라 주로 재생 시작과 갱신 때 생기므로, 라이선스 서버의 부하는 재생 시작률과 갱신 주기를 따른다. 30만 명이 공개 뒤 1분 안에 재생을 시작하면 라이선스 요청은 평균 초당 약 5,000건이다. 라이브에서 키를 주기적으로 교체(key rotation)하는 구성도 확인한다. EME에서 세션 안의 키 교체 방식은 키 시스템에 따라 다르다. 교체 때 라이선스 서버를 다시 부르는 구성이면 교체마다 동시 시청 수에 비례한 요청이 더해지므로, 교체 주기와 키 전달 방식을 업체와 확인한다.
- **접근 정보 발급:** CloudFront 문서는 HLS 영상의 모든 파일처럼 여러 제한 파일에 접근하게 할 때 signed cookie를 쓰라고 한다. 쿠키는 앱 진입이나 재생 시작 때 API가 발급하므로 세그먼트마다 API를 부르지 않는 대신, 발급 API가 앱 진입이나 재생 시작 빈도만큼 요청을 받는다. 이 API도 공개 전 증설 범위에 넣는다 — [[CloudFront|CloudFront]].
- **외부 업체:** 라이선스 서버를 외부 업체가 운영하면 공개 일정과 예상 재생 시작률을 미리 공유하고 부하 시험 범위에 넣는다.

## 재생 중 주기 호출은 동시 세션 수가 곧 요청률이다

유료 영상의 동시 재생 기기 수를 제한하려면 서버가 지금 재생 중인 기기를 알아야 한다. 클라이언트가 정해진 간격으로 재생 상태를 보고하고(heartbeat) 서버가 세션 상태를 캐시에 두는 방식이 쓰인다(아래 사례).

- 부하는 동시 세션 수 / heartbeat 간격이다. 동시 시청 30만 명이 30초마다 보고하면 이벤트 내내 초당 1만 건이 API와 캐시에 들어온다. 간격을 줄이면 정책 반영은 빨라지지만 부하도 그만큼 는다.
- 세션 상태를 만료 시간이 있는 키로 두면(Redis `SET`의 `EX` 옵션) heartbeat가 끊긴 기기의 세션은 만료로 정리된다. Redis는 만료 시간이 지난 키를 자동으로 지운다.
- heartbeat마다 `EX`를 붙여 다시 쓴다. 만료 옵션 없이 `SET`으로 덮어쓰면 기존 만료 시간이 사라져 키가 지워지지 않는다.
- 설계 제안: 만료 시간을 heartbeat 간격보다 길게 잡아 보고가 한두 번 늦어도 재생이 끊기지 않게 한다.

## 처리 경로도 편성 시각에 몰린다

방송 클립처럼 편성 시각에 맞춰 만드는 콘텐츠는 변환 작업도 같은 시각에 몰린다. 2026-10-14 AWS Elemental MediaConvert 문서 기준이다.

- 리전별로 계정 전체 on-demand 큐의 동시 작업 수와 큐 하나의 동시 작업 수가 각각 service quota이고, 큐마다 동시 작업 수 설정은 두 quota 안에서 정한다.
- 한도까지 처리 중이면 새 작업은 `SUBMITTED` 상태에 머물고, 작업이 끝날 때마다 우선순위로 다음 작업을 고른다.
- 급한 작업은 높은 우선순위로 넣을 수 있지만 이미 처리 중인 작업이 끝나야 시작한다. 동시 작업 수를 작게 잡은 별도 큐에 급한 작업만 넣으면 그만큼의 자원을 비워 두는 대신 바로 처리할 수 있다.

## 예상하지 못한 급증은 캐시와 평시 여유 용량이 먼저 받는다

속보처럼 시각을 모르거나, 예정된 중계라도 규모를 예상하지 못한 급증에는 이벤트별 사전 증설을 하지 못한다. 같은 기사나 영상으로 요청이 몰리면 CDN 캐시 적중률이 높아져 대부분을 앞단이 받는다. 로그인, 재생 권한, 라이선스와 쿠키 발급처럼 캐시되지 않는 경로는 급증분을 그대로 받으므로, 자동 확장이 따라올 때까지 평시 여유 용량으로 버텨야 한다. 앞의 ALB 문서도 짧은 기간 예측하기 어려운 급증을 LCU 예약을 고려할 상황으로 든다. 캐시가 무너지는 조건과 확장 공백을 메우는 여유 용량은 [[Traffic-Spike-Query-Types#캐시로 확장 공백을 메운다|예측 불가 트래픽 폭증]]을 따른다.

## 사례 — 방송사와 팬 플랫폼의 AWS 운영 (2020 발표 기준)

방송사 디지털 플랫폼(KBS)의 기록이다.

- 캐시 없이 웹, API 서버와 DB로 모든 요청이 전달되던 구성 앞에 CloudFront를 두었다. 사용자 트래픽의 90% 이상을 캐시가 처리해 서버와 DB 부하를 10분의 1 이하로 줄였다.
- 2019년 9월 기사 한 건으로 뉴스 사이트 동시 접속이 평소 3,000~4,000에서 1~2분 사이에 11만 이상으로 뛰었다. 이전 데이터센터 구성이 감당하던 동시 접속은 3만 정도였다. 캐시가 약 90%를 받고 API 서버는 2대에서 8대로 자동 확장했으며, 저녁에 트래픽이 평소로 돌아오자 다시 2대로 줄었다.
- 이전 CDN 서비스는 평시 최대 120 Gbps가 보장됐고, 그보다 많은 트래픽이 예상되는 행사는 최소 일주일 전에 요청해 장비를 증설해야 했으며 200 Gbps 이상은 불가능했다. CloudFront로 옮긴 뒤 2019년 9월 축구 국가대표 평가전 중계에는 시청자가 몰릴 것을 예상하지 못해 사전 준비를 하지 않았다. 최대 트래픽은 300 Gbps에 이르렀지만 실시간 대응 없이도 문제가 없었다. 발표는 배포 구성이나 quota 증설 여부를 밝히지 않으므로, 이 결과를 CloudFront에 한도가 없다는 뜻으로 읽지 않는다.
- 저녁 메인 뉴스 시간에는 본사와 지역국이 동시에 클립을 만들어 동시 변환 작업이 30개를 넘었다. 기존 물리 변환기로 대기 없이 처리하려면 30대 이상과 작업 큐 구현이 필요한 규모였는데, MediaConvert의 동시 처리와 큐로 대기 없이 처리했다.

팬 플랫폼(beNX)의 영상 공개 대비 기록이다.

- 장애 지점을 CloudFront 한도, 로드밸런서 용량, EC2 사용률 세 곳으로 보고 대비했다. CloudFront 전송률은 최대 720 Gbps까지 발생했고, 기본 한도를 넘는 트래픽이 예상되면 지원 요청으로 한도를 늘려야 한다고 정리했다.
- 로드밸런서는 자동 확장이 순간 급증에 한 박자 늦으므로, 예상 트래픽을 산정해 지원 요청으로 미리 증설(pre-warming)해 두라고 정리했다. 2026-10-14 문서 기준 ALB는 LCU 예약으로 최소 용량을 직접 확보할 수 있다.
- 담당자가 Google 캘린더에 영상 공개 일정을 등록하면 주기적으로 실행되는 Lambda 함수가 다가오는 일정을 확인해 Auto Scaling 그룹의 인스턴스 수를 늘렸다. 증설분은 자체 도구로 만든 launch template과 On-Demand, Spot 비율 설정으로 Spot을 써서 비용을 최대 60% 넘게 줄였다.
- 재생 시작 순간에 사용자가 몰리자 DRM 서버의 응답이 느려지다가 시청이 불가능해진 일이 있었다. DRM 서버는 외부 업체를 쓰는 경우가 많으므로 대규모 공개 일정은 업체에도 미리 공유해 준비하게 하라고 권했다.
- 앱이 API 서버에 접속하면 API 서버가 CloudFront signed cookie를 발급했다. 로그인은 4대까지 허용하되 유료 영상의 동시 재생은 1대로 제한했는데, CloudFront에서 제어하기 어려워 백엔드가 맡았다. 클라이언트가 약속된 API를 일정 간격으로 호출하고 현재 시청 정보는 Redis 같은 캐시 서버에 두었다.

## 면접 체크포인트

- 영상 공개 이벤트를 어떻게 대비하나 → 지점별로 나눠 산정한다. CDN은 대역폭과 quota, 진입 계층은 로드밸런서 사전 용량과 예약 증설, 재생 시작 의존성은 시작률, 주기 호출은 동시 세션 수 / 간격이다.
- CDN이 세그먼트를 전달하면 서버는 괜찮은가 → 재생 시작마다 부르는 API와 라이선스 서버는 시작률만큼 부하를 받는다. 평소 부하가 작아 계획에서 빠지기 쉽고, 외부 업체가 운영하면 일정 공유가 필요하다.
- 영상 트래픽에서 요청률과 대역폭 중 무엇이 먼저 차나 → 요청당 평균 크기로 정해진다. CloudFront 기본 한도의 경계는 요청당 약 75 KB다. 5 Mbps 스트림의 6초 세그먼트(약 3.75 MB)는 이보다 훨씬 커서 대역폭이 먼저 차고, 이 가정에서 150 Gbps는 초당 약 5,000 요청이다. 저지연 HLS의 짧은 partial segment, 잦은 playlist 요청과 저비트레이트 rendition은 요청당 크기를 줄이므로 요청률도 따로 계산한다.
- 이벤트 증설 비용을 줄이려면 → 꼭 필요한 대수는 On-Demand 기본 용량으로 두고 여유분을 Spot으로 채운다. 할당 전략을 명시하고, 2분 중단 통지는 best effort라는 점과 Spot 확보 실패 대응을 함께 설명한다.

## 출처

- [이제는 말할 수 있다: KBS, beNX의 AWS 활용법 (AWS Cloud Week) — Amazon Web Services Korea](https://www.youtube.com/watch?v=3ysM21zaPcY)
- [Amazon CloudFront, Quotas](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html)
- [Amazon CloudFront, Decide to use signed URLs or signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html)
- [Elastic Load Balancing, Capacity reservations for your Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/capacity-unit-reservation.html)
- [Amazon EC2 Auto Scaling, Scheduled scaling for Amazon EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html)
- [Amazon EC2 Auto Scaling, Auto Scaling groups with multiple instance types and purchase options](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html)
- [Amazon EC2 Auto Scaling, Allocation strategies for multiple instance types](https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html)
- [Amazon EC2 Auto Scaling API Reference, InstancesDistribution](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html)
- [Amazon EC2, Spot Instance interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [AWS Elemental MediaConvert, Working with on-demand queues](https://docs.aws.amazon.com/mediaconvert/latest/ug/working-with-on-demand-queues.html)
- [W3C, Encrypted Media Extensions (2017 Recommendation)](https://www.w3.org/TR/2017/REC-encrypted-media-20170918/)
- [RFC Editor, RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216)
- [IETF, HTTP Live Streaming 2nd Edition (draft-pantos-hls-rfc8216bis-22)](https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-22)
- [Redis, SET](https://redis.io/docs/latest/commands/set/)
- [Redis, EXPIRE](https://redis.io/docs/latest/commands/expire/)

## 관련 문서

- [[Capacity-Planning|캐퍼시티 플래닝]] — 예측 가능한 스파이크의 사전 대비 사이클과 할당량 확인
- [[Traffic-Spike-Query-Types|예측 불가 트래픽 폭증]] — 캐시가 받는 급증과 계층별 여유 용량
- [[Video-Streaming-System-Design|주문형 비디오 스트리밍 설계]] — 처리, 제어, 미디어 plane과 egress 산식
- [[CloudFront|CloudFront]] — signed URL과 cookie, 캐시 제어
- [[ELB|ELB]] — LCU 예약과 용량 산정
- [[Auto-Scaling|EC2 Auto Scaling]] — scheduled action과 준비 시각 역산
- [[EC2-Cost|EC2 비용 모델]] — Spot과 Capacity Reservations
- [[Notification-Broadcast-System|대규모 알림 시스템]] — 공개 알림 발송이 만드는 진입 급증
- [[Virtual-Waiting-Room-Architecture|가상 대기열 아키텍처]] — 입장 자체를 제어해야 하는 이벤트
