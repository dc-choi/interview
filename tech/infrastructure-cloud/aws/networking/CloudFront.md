---
tags: [infrastructure, aws, cloudfront, cdn, cache, edge]
status: done
category: "Infrastructure - AWS"
aliases: ["CloudFront", "AWS CloudFront", "Amazon CloudFront"]
verified_at: 2026-10-10
---

# Amazon CloudFront

AWS의 **CDN(Content Delivery Network) 서비스**. HTTP/HTTPS origin의 캐시 가능한 콘텐츠를 전 세계 Edge Location에서 제공하고, 캐시 miss는 Regional Edge Cache 또는 origin으로 전달한다.

## 핵심 구성 요소

| 용어 | 의미 |
|------|------|
| **Origin Server** | 캐싱 대상 원본 서버 (S3, ALB, EC2, 외부 서버) |
| **Custom Origin** | ALB, EC2, S3 website endpoint, 외부 서버처럼 HTTP(S)로 연결하는 origin |
| **Edge Location (PoP)** | viewer 요청을 처리하는 분산 캐시 지점 |
| **Regional Edge Cache** | Edge와 Origin 사이 중간 캐시. 동적 요청, 일부 메서드와 같은 경우 건너뜀 |
| **Distribution** | origin, cache behavior, 인증서와 도메인 설정을 묶는 배포 단위. 여러 origin과 alternate domain name 구성 가능 |
| **TTL** | 캐시 유효 시간. Distribution, Behavior 단위로 조정 |

## 콘텐츠 전달 흐름

```
사용자 → DNS → 지연시간 등을 바탕으로 선택된 Edge Location
                                  ├─ 캐시 hit → 즉시 응답
                                  └─ 캐시 miss → Regional Edge Cache
                                                 ├─ hit → 응답 + Edge 캐시
                                                 └─ miss → Origin 요청 → cache policy에 따라 응답 캐싱
```

- CloudFront는 AWS의 글로벌 네트워크와 캐시 계층을 사용하지만 실제 지연시간과 가용성 개선 폭은 viewer 위치, origin과 cache hit율로 측정
- AWS가 정한 지원 origin에서 CloudFront로 보내는 데이터 전송에는 별도 요금이 없으며, viewer 전송과 요청 요금은 선택한 플랜에 따름

### 영상의 인코딩, 패키징과 전달 경계

부분 검증(2026-10-13): CloudFront의 VOD와 live streaming 설명을 대조했다. CDN을 연결하는 것만으로 원본 영상의 인코딩과 패키징이 끝나지는 않는다.

- 스트리밍용 패키징은 영상, 음성과 자막의 segment 및 재생 순서를 설명하는 manifest를 만든다. CloudFront는 준비된 콘텐츠를 HTTP origin에서 받아 전달한다.
- VOD는 MediaConvert 같은 인코더로 재생용 파일을 만든 뒤 S3나 서버에 저장하고 CloudFront로 제공할 수 있다. 원본 업로드 성공, 변환 완료, 배포 경로의 재생 성공을 별도 단계로 확인한다.
- live와 VOD 모두 HTTP origin을 사용할 수 있다. 모든 미디어 서비스를 필수 구성으로 붙이지 않고 입력 방식, 변환과 저장 요구에 맞춰 앞단을 선택한다.

이 구분에서 도출한 운영 점검: 대표 플레이어에서 manifest와 segment 접근, 자막과 실제 재생을 확인한다. 객체가 존재하거나 CDN 요청이 성공했다는 사실만으로 최종 재생 품질을 판정하지 않는다.

### 개인화 광고의 manifest와 segment 캐시

2026-10-13 MediaTailor의 CloudFront 연동과 캐시 최적화 문서 대조 기준이다. 서버 측 광고 삽입(SSAI)에서는 개인별 광고 선택을 담은 manifest와 재사용 가능한 콘텐츠, 광고 segment를 나누어 처리한다.

- 개인화된 HLS playlist와 DASH MPD에는 `CachingDisabled`를 적용하고, 개인화에 필요한 요청 정보는 origin request policy로 전달한다. 이 정책의 Minimum, Default, Maximum TTL은 모두 0이다.
- 콘텐츠와 광고 segment에는 별도 behavior와 캐시 정책을 둔다. manifest를 캐시하지 않는다는 이유로 미디어 바이트까지 모두 origin에서 받게 만들 필요는 없다.
- 이 경계를 모든 manifest에 일반화하지 않는다. SGAI의 일부 media playlist와 channel assembly는 별도의 캐시 지침을 따르므로 삽입 방식과 경로를 먼저 확인한다.

운영 검증 제안: 서로 다른 시청 세션으로 manifest의 광고 선택이 섞이지 않는지 확인하고, 같은 segment의 반복 요청에서는 캐시 적중을 별도로 측정한다. 재생 성공과 광고 개인화 성공을 같은 지표로 판정하지 않는다.

### 실시간 접근 로그와 플레이어 관측

부분 검증(2026-10-13): real-time access log 공식 문서의 전송과 수집 범위를 확인했다. 기존 요금제의 기능 제한도 함께 확인하고 적용한다.

- cache behavior별로 수집을 연결하고 sampling rate와 필요한 필드를 고른다. 로그는 Kinesis Data Streams로 전달되며, 이후 consumer나 Firehose로 분석 저장소에 보낼 수 있다.
- 로그 전달은 best effort다. sampling rate가 100이어도 지연이나 누락 가능성이 있어 전체 요청의 완전한 회계 기록으로 사용할 수 없다.
- `time-to-first-byte`와 `time-taken`은 서버에서 측정한 시간이다. 플레이어의 재생 시작과 버퍼링까지 같은 값으로 해석하지 않는다. CMCD 필드는 플레이어가 CloudFront에 해당 데이터를 보낸 경우에만 로그에 나타난다.

운영 적용 제안: CDN 요청 지표와 플레이어 이벤트의 식별자, 시각 및 수집 비율을 맞춰 비교한다. 서버 응답 성공과 사용자의 정상 시청은 서로 다른 확인 대상이다.

## Origin 접근 제어 — OAI vs OAC

일반 S3 bucket origin을 사용할 때 **버킷을 public으로 풀지 않고 CloudFront만 접근 허용**하는 메커니즘이다. S3 website endpoint는 custom origin으로 취급하므로 OAI와 OAC를 사용할 수 없다.

### OAI (Origin Access Identity) — 레거시

- Distribution마다 고유 Identity 부여, S3 버킷 정책의 `Principal`에 OAI ARN 명시
- 예시 버킷 정책:
```json
{
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity XXX" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::bucket-name/*"
}
```
- **한계**: OAC와 달리 모든 S3 Region, SSE-KMS와 동적 `PUT`/`DELETE` 요청을 완전하게 지원하지 않음

### OAC (Origin Access Control) — 2022+ 권장

- OAI의 제약 해소를 위한 후속 기능
- **모든 S3 Region과 SSE-KMS 지원**, 정책에서 허용한 동적 `PUT`/`DELETE` 요청을 SigV4로 서명 가능
- 흐름: 클라이언트 → CloudFront 수신 → 캐시 miss 시 **OAC 서명 프로토콜로 요청 서명** → S3 버킷 정책이 `aws:SourceArn` 조건으로 승인/거부
- 일반 S3 bucket origin의 신규 구성에는 OAC를 권장한다. OAI 기존 구성도 호환성을 확인해 마이그레이션

## 접근 제어 기능

### Geolocation Restriction (지리적 제한)

- Distribution 단위로 **Allowlist / Blocklist** 국가 지정
- 지정 국가 IP는 응답 거부 (라이선스, 규제, 차단 대응)

### Signed URL / Signed Cookie

- 인증된 사용자만 Distribution 접근 허용. **만료 시각, IP 범위** 지정 가능
- 사용 흐름: public key와 **trusted key group** 구성 → 백엔드가 대응 private key로 URL/쿠키 서명 → 클라이언트에 전달. AWS account key pair 방식은 레거시이므로 신규 구성에 권장하지 않음
- 용도: 유료 미디어 스트리밍, 멤버십 콘텐츠, 다운로드 토큰
- **Signed URL**: 단일 파일 접근. **Signed Cookie**: 다수 파일 묶음 (HLS, DASH 스트리밍)

## 캐시 제어 — TTL과 Cache Invalidation

### TTL

- cache behavior의 cache policy가 Origin의 `Cache-Control`과 함께 실제 TTL을 결정한다. 헤더가 없으면 Default TTL을 사용
- Min/Max/Default TTL을 behavior별로 지정. **Minimum TTL이 0보다 크면 `no-cache`, `no-store`, `private`에도 최소 TTL이 적용될 수 있음**

### 공개 SSR과 개인 응답의 캐시 경계

2026-10-13 cache key, managed cache policy와 cookie 문서 부분 대조 기준이다. 서버가 HTML을 렌더링한다는 사실만으로 캐시 가능 여부가 정해지지는 않는다. 같은 캐시 키의 요청에 같은 공개 응답을 돌려줘도 되는지가 기준이다.

- 적용 예시로 공개 상품 소개와 회원 주문 화면의 경로를 나눈다. 공개 화면도 언어, 사이트와 쿠키에 따라 응답이 달라지면 그 차이를 키에 반영하거나 캐시하지 않는다. 비로그인 상태만으로 동일 응답이라고 가정하지 않는다.
- 개인 응답을 공유 캐시에서 재사용하지 않을 설계라면 해당 경로에 `CachingDisabled`를 붙인다. 인증에 필요한 정보의 origin 전달은 별도 정책으로 확인한다. origin request policy에 쿠키를 넣는 것만으로 캐시 키가 분리되지는 않는다.
- 쿠키를 전달하는 구성에서는 origin의 `Set-Cookie`도 객체와 함께 캐시되어 캐시 hit에 재전송될 수 있다. 본문은 공유 가능하고 쿠키 헤더만 저장하지 않아야 할 때 `Cache-Control: no-cache="Set-Cookie"`를 검토한다. 이 지시자는 개인화된 본문을 공유해도 된다는 뜻이 아니다.

운영 검증 제안: 캐시가 비었을 때와 채워진 뒤에 익명 요청, 서로 다른 회원 요청을 교차시켜 본문과 `Set-Cookie`를 비교한다. 캐시 적중률을 높이기 전에 다른 사용자의 응답이 재사용되지 않는지 확인한다.

### 같은 URL의 미디어 변형과 캐시 키

2026-10-10 부분 검증: cache policy와 CloudFront 생성 헤더 문서를 대조했다. 같은 URL이라도 기기 유형에 따라 origin 응답이 달라지면 해당 차이를 캐시 키에 반영해야 변형을 따로 저장한다.

- `cache policy`는 캐시 키에 포함할 헤더, 쿠키와 쿼리를 정한다. `origin request policy`로 헤더만 전달하는 것은 캐시 분리와 다르다.
- 기기별 응답을 만들 때는 필요한 `CloudFront-Is-Mobile-Viewer` 등의 헤더를 캐시 정책에 넣을 수 있다. 한 기기가 mobile과 tablet에 동시에 해당할 수 있으므로 배타적 분류로 가정하지 않는다.
- 다음은 적용 점검 예시다. 같은 URL을 다른 기기 조건으로 반복 요청해 응답 변형과 캐시 적중을 대조한다. 응답을 바꾸지 않는 값까지 키에 넣으면 캐시가 잘게 나뉘므로 필요한 조건만 남긴다.

### Cache Invalidation

- TTL 만료 전 캐시 객체를 무효화한다. 전 세계 edge 반영에는 전파 시간이 걸릴 수 있음
- 경로 패턴 무효화: `/images/*`, `/index.html`, 전체 `*`
- **비용 주의**: Pay-as-you-go는 AWS 계정 전체에서 월 첫 1,000 path가 무료이고 이후 path당 과금. Flat-rate plan은 해당 플랜 조건 확인
- 배포 루틴에 매번 사용하지 말고 **파일명 해시 전략**과 병행 (배포 산출물은 해시 파일명, `index.html`만 invalidate)

### CMS의 게시 완료와 캐시 버전 갱신

CDN을 쓰는 CMS에서는 원본 게시와 사용자의 새 콘텐츠 수신을 나누어 확인한다. Storyblok은 CloudFront 기반 CDN에서 Content Delivery API 응답을 캐시하며, `cv` 쿼리 파라미터로 캐시 버전을 구분한다. 새 콘텐츠를 게시해도 이전 `cv`의 응답은 캐시에 남으므로 앱이 사용할 버전을 갱신해야 한다(2026-10-10 공식 문서 대조).

Storyblok에서는 access token의 TTL을 설정하지 않았다면 space의 `version`을 최신 `cv`로 사용할 수 있다. 토큰 TTL을 설정한 경우 두 값은 같지 않을 수 있으므로 stories, datasources 또는 datasource entries 응답에서 `cv`를 가져온다. 이는 CMS의 버전 계약이며 CloudFront의 Minimum TTL 설정과 같은 옵션이 아니다.

게시 webhook이나 polling으로 버전 변경을 감지하고, 앱 자체 캐시에도 갱신을 연결한다. 게시 직후 space 버전 반영에 지연이 있을 수 있으므로 webhook 수신만으로 새 응답이 준비됐다고 판정하지 않는다. 이 확인 절차는 캐시 동작에서 도출한 운영 기준이며, API 캐시 무효화를 CloudFront 전체 경로 무효화와 동일시하지 않는다.

## 비용 — Price Class

Edge Location 리전마다 단가가 달라 **사용 지역을 제한해 비용 절감** 가능.

| Price Class | 사용 리전 | 성능 | 비용 |
|------------|----------|------|------|
| **Price Class All** | 모든 CloudFront edge | 가장 넓은 지역 커버리지 | 사용 위치별 단가 적용 |
| **Price Class 200** | AWS가 정의한 대부분의 지역 | 제외 지역 viewer는 허용된 다른 edge로 라우팅될 수 있음 | All보다 비용 범위 축소 가능 |
| **Price Class 100** | AWS가 정의한 제한된 저비용 지역 | 제외 지역 viewer의 지연시간이 늘 수 있음 | 가장 제한된 커버리지 |

추가 요금 포인트:
- Pay-as-you-go는 요청 수와 viewer 아웃바운드 전송량, 위치별 단가를 중심으로 계산
- **지원되는 AWS origin → CloudFront 데이터 전송은 별도 요금 없음**. 구체적인 서비스와 예외는 최신 요금표 확인
- CloudFront flat-rate Free Plan은 현재 월 100GB 전송과 100만 요청을 포함하지만 계정, distribution 자격과 최신 플랜 조건을 운영 전 확인
- Pay-as-you-go invalidation 무료량은 계정 전체 1,000 path/월

### Flat-rate plan의 적용 경계

2026-10-07 공식 요금제 문서 기준이다. 정액제는 배포 하나와 연결된 기능을 묶는 방식이므로, 월 전송량뿐 아니라 필요한 기능과 기존 연결 리소스가 해당 tier에 맞는지 비교한다.

- 플랜의 사용 허용량을 초과해도 초과 요금은 없지만, 상당한 초과 사용이 지속되거나 한 달 사용량이 이례적으로 높으면 전달 성능이 조정될 수 있다. 더 적거나 먼 edge에서 제공될 수 있으므로 무제한 성능 보장으로 해석하지 않는다.
- WAF가 차단한 요청과 차단된 DDoS 트래픽은 허용량에서 제외된다. 정상 트래픽의 증가와 차단 트래픽을 구분해 tier를 선택한다.
- 현재 real-time access logs, continuous deployment와 staging distribution 등은 정액제에서 지원하지 않는다. 필요한 기능이면 pay-as-you-go를 유지하고, 전환하려면 해당 기능을 제거한 뒤 호환성을 확인한다.
- 플랜이 포함하는 범위 밖의 요금은 남는다. 예를 들어 Lambda@Edge 호출은 별도 과금될 수 있다. origin 처리 비용까지 고정됐다고 계산하지 않는다.
- 유료 플랜은 배포를 비활성화해도 요금이 발생한다. 취소는 현재 결제 주기 말에 적용되고 이후 pay-as-you-go로 전환된다. 배포 삭제도 플랜 취소가 적용된 뒤 가능하다. Free 플랜 취소는 즉시 적용된다.

## 보안 통합

- **HTTPS / HTTP/2 / HTTP/3** 기본 지원
- alternate domain name에 ACM 인증서를 연결할 때는 **us-east-1(N. Virginia)** 리전에서 발급 또는 import. 기본 CloudFront 도메인은 기본 인증서를 사용할 수 있음
- **AWS WAF 연동** — L7 공격 필터
- **AWS Shield Standard 자동 포함** — L3/L4 DDoS 방어 (Advanced는 유료)
- **Field-Level Encryption** — 민감 필드만 추가 암호화하여 Origin까지 전달

## Edge Compute — CloudFront Functions vs Lambda@Edge

| 항목 | CloudFront Functions | Lambda@Edge |
|------|----------------------|-------------|
| 실행 위치 | Edge (최말단) | Regional Edge |
| 언어 | JavaScript runtime 2.0 (ES5.1 준수, ES6 이후 일부 기능 지원) | Node.js, Python |
| 실행 시간 | submillisecond 용도, compute utilization 제한 | viewer와 origin event 모두 최대 30초 |
| 메모리 | 2MB | viewer event 128MB, origin event 최대 10GB |
| 용도 | 헤더 조작, URL 재작성, 간단한 인증 | 이미지 가공, A/B 테스트, 복잡한 인증, SSR |
| 요금 | 매우 저렴 | 상대적으로 비쌈 |

## 정적 사이트 패턴 — S3 + CloudFront

자세한 SPA 배포, OAC 설정, Error Response 처리는 [[CDN]] 참조. 핵심만 요약:

- 일반 S3 bucket의 Public Access 차단 → CloudFront만 OAC로 접근. S3 website endpoint에는 OAC 사용 불가
- ACM 인증서는 us-east-1 발급
- SPA route 대응: asset과 실제 권한 오류를 제외한 client-side route만 viewer-request에서 `/index.html`로 rewrite. 모든 403/404 일괄 200 변환은 피함
- `index.html`은 `no-cache`, 해시 파일명 자산은 `max-age=31536000, immutable`

## 403 오류 — 거부한 계층부터 찾기

2026-10-08 공식 오류 처리와 HTTPS 문서 확인 기준이다. 응답 코드만으로 CloudFront, WAF와 origin 중 거부한 주체를 확정할 수 없다.

1. **도메인과 프로토콜:** DNS만 연결하지 말고 distribution의 alternate domain name도 확인한다. `HTTPS only` behavior에 HTTP로 요청하면 403이므로 먼저 HTTPS로 재현한다.
2. **viewer 정책:** 지리적 제한, signed URL/cookie의 필요 여부를 확인한다. 서명이 필요한 behavior에 서명 없이 접근하면 거부된다.
3. **WAF:** distribution과 origin의 Web ACL에서 해당 요청을 차단한 규칙을 찾는다. 원인 확인을 위해 전체 WAF를 해제하는 방식은 피한다.
4. **origin:** custom origin 로그와 허용된 직접 요청으로 비교한다. S3 REST origin은 OAC/OAI와 버킷 정책, 객체 경로와 존재 여부를 확인한다. 비공개 origin은 직접 요청 자체가 거부될 수 있으므로 인증 조건이 다른 403을 같은 원인으로 단정하지 않는다.

`Redirect HTTP to HTTPS`도 모든 HTTP 요청을 리디렉션하지는 않는다. GET/HEAD는 301, HTTP/1.1 이상의 POST/PUT/DELETE/OPTIONS/PATCH는 307이며, 뒤의 메서드를 HTTP/1.0으로 보내면 403이다. 장애를 없애려고 HTTP 허용 범위를 넓히기 전에 요청 프로토콜과 정책을 맞춘다.

## Origin failover의 메서드와 요청별 전환

2026-10-13 공식 origin failover 문서 대조 기준이다. 기본 origin 우선순위 방식에서는 primary와 secondary 두 origin을 그룹으로 묶고 cache behavior에 연결한다. 캐시 hit는 캐시에서 응답하고, miss는 먼저 primary로 보낸다.

- primary가 지정한 실패 상태 코드를 반환하면 secondary로 다시 요청한다. 연결 실패는 failover 코드에 `503`, 응답 timeout은 `504`가 설정되어 있어야 전환한다.
- 전환 대상 메서드는 `GET`, `HEAD`, `OPTIONS`다. `OPTIONS`는 behavior의 캐시 대상 메서드에도 포함해야 한다. `POST`와 `PUT` 같은 쓰기 요청에는 이 전환이 적용되지 않는다.
- 직전 요청이 secondary로 전환됐어도 다음 cache miss는 다시 primary를 시도한다. 한 번의 실패로 이후 트래픽 전체를 secondary에 고정하는 방식이 아니다.
- 연결 timeout과 시도 횟수는 전환 대기 시간에 영향을 준다. 장애 전환 설정만으로 즉시 복구를 보장하지 않는다.

운영 검증 제안: 캐시 miss에서 primary 연결 실패, 응답 지연과 지정 상태 코드를 나누어 재현하고, GET과 POST의 결과를 구분한다. 쓰기 API의 복구 경로와 중복 처리 방지는 별도로 설계한다. 이 절은 문서 대조이며 실제 장애 전환 시험 결과는 아니다.

## 시험, 면접 체크포인트

- **CDN의 두 가지 효과**: 지리적 근접성(지연 ↓) + Origin 부하 분산
- Origin 종류: AWS Origin (S3, ALB, API Gateway) vs Custom Origin (외부 HTTP)
- **OAI vs OAC** — 일반 S3 bucket origin 신규 구성은 OAC. OAC는 SSE-KMS, SigV4와 동적 요청 지원
- **Signed URL vs Signed Cookie** — 단일 vs 다수 파일, HLS/DASH는 Cookie
- **Geolocation Restriction** — Allowlist/Blocklist
- **TTL vs Cache Invalidation** — 무효화는 비용 발생, 파일명 해시 병행
- **Price Class** 3종과 트레이드오프
- **CloudFront Functions vs Lambda@Edge** 선택 기준 (실행 위치, 언어, 시간, 용도)
- alternate domain name용 ACM 인증서는 **us-east-1**에서 준비
- 지원되는 AWS origin → CloudFront 전송은 별도 데이터 전송 요금 없음, Shield Standard 포함

## 출처
- [AWS 공식 문서, Understand the cache key](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/understanding-the-cache-key.html)
- [AWS 공식 문서, Use managed cache policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
- [AWS 공식 문서, Cache content based on cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Cookies.html)
- [AWS 공식 문서, Control origin requests with a policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html)
- [AWS 공식 문서, Set up basic CloudFront integration with MediaTailor](https://docs.aws.amazon.com/mediatailor/latest/ug/cloudfront-basic-setup.html)
- [AWS 공식 문서, Caching optimization for CDN and MediaTailor integrations](https://docs.aws.amazon.com/mediatailor/latest/ug/cdn-optimize-caching.html)
- [AWS 공식 문서, Video on demand and live streaming video with CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/on-demand-streaming-video.html)
- [AWS 공식 문서, Use real-time access logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html)
- [AWS 공식 문서, Optimize high availability with CloudFront origin failover](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html)
- [Storyblok, Caching](https://www.storyblok.com/docs/concepts/caching)
- [AWS 공식 문서, Control the cache key with a policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html)
- [AWS 공식 문서, Add CloudFront request headers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-cloudfront-headers.html)
- [AWS 공식 문서, HTTP 403 status code (Permission Denied)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/http-403-permission-denied.html)
- [AWS 공식 문서, Require HTTPS for communication between viewers and CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-viewers-to-cloudfront.html)
- AWS SAA C03 학습 자료 — CloudFront
- [AWS 공식 문서, CloudFront flat-rate pricing plans](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html)
- [AWS 공식 문서, CloudFront Functions JavaScript runtime 2.0](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-javascript-runtime-20.html)
- [AWS 공식 문서, CloudFront Functions와 Lambda@Edge 비교](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html)
- [AWS 공식 문서, OAC로 S3 origin 접근 제한](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [AWS 공식 문서, Signed URL trusted signer](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html)
- [AWS 공식 문서, CloudFront cache expiration](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)

## 관련 문서
- [[CDN|CDN 일반 개념, S3+CloudFront 정적 배포]]
- [[S3|S3 (Origin, OAC, Transfer Acceleration)]]
- [[EC2|EC2/ALB/Route 53]]
- [[AWS-Lambda|Lambda@Edge]]
- [[VPC|VPC]]
- [[IAM|IAM (Signed URL, OAC 정책)]]
