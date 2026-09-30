---
tags: [infrastructure, cloud, hosting, vercel, cloudflare, r2, s3, egress, dns, email]
status: done
verified_at: 2026-09-29
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Cloudflare vs Vercel Hosting", "1인 제품 호스팅 플랫폼 선택", "Vercel과 Cloudflare"]
---

# 1인 제품 호스팅 플랫폼 선택: Vercel과 Cloudflare

1인 개발자나 작은 팀이 웹 제품을 올릴 때 호스팅 플랫폼은 배포 편의만으로 고르면 나중에 약관, 도메인 운영과 트래픽 비용에서 다시 옮기게 된다. Vercel은 프런트엔드 프레임워크 배포 경험에 강하고, Cloudflare는 DNS, CDN, 보안, 엣지 실행과 스토리지를 한 계정에서 묶는 쪽에 강하다. 선택은 제품의 수익화 여부, 도메인과 이메일 운영, 정적 파일 트래픽, 백엔드와 DB 연동이라는 네 축으로 판단한다.

이 문서의 가격, 한도와 약관은 2026-09-29 공식 페이지 기준이다. 요금제는 자주 바뀌므로 결정 시점에 다시 확인한다.

## 판단 축

### 1. 무료 플랜의 상업 이용 조건

- **Vercel Hobby**: Fair Use Guidelines가 Hobby 팀을 비상업 개인 용도로 제한하고, 상업 이용에는 Pro 또는 Enterprise가 필요하다고 명시한다. 방문자 결제 처리, 제품이나 서비스 판매 광고, 사이트 제작이나 호스팅 대가 수령, 광고 게재가 상업 이용의 예이고, 기부 요청은 상업 이용에 해당하지 않는다.
- **Cloudflare**: Self-Serve Subscription Agreement에서 무료 플랜을 비상업으로 한정하는 조항은 확인하지 못했다. 다만 과도한 부하를 금지하고, 비엔터프라이즈 고객이 CDN으로 동영상이나 대용량 파일 비중이 큰 트래픽을 서빙하면 접근을 제한할 수 있다는 조항이 있다. 상업 이용 가능 여부는 약관 원문으로 직접 확인한다.
- **Cloudflare Workers Free**: 하루 100,000 요청과 호출당 CPU 10ms 한도가 있고, 정적 자산 요청은 무료이며 한도가 없다. 유료 플랜은 계정당 월 최소 5달러부터다.

광고나 결제가 붙는 순간 Vercel은 유료 전환이 전제가 된다. 수익화 전 실험 단계인지, 처음부터 판매할 제품인지로 첫 분기를 가른다.

### 2. DNS, 배포, CDN과 보안의 통합 관리

Cloudflare에 도메인 DNS를 두면 DNS 레코드, 프록시 CDN, TLS 인증서, 기본 보안 설정과 Pages, Workers 배포를 한 대시보드에서 관리할 수 있다. Vercel도 도메인과 CDN을 제공하지만, DNS와 보안 정책을 다른 곳에서 관리하면 설정 지점이 둘로 나뉜다. 대신 Cloudflare는 기능 표면이 넓어 처음 쓰는 사람에게 인터페이스가 복잡하게 느껴질 수 있다. DNS와 CDN 기본 개념은 [[DNS|DNS]], [[CDN|CDN]]을 참고한다.

### 3. 도메인 이메일

Cloudflare Email Routing은 커스텀 도메인 주소로 들어오는 메일을 검증된 목적지 주소나 Worker로 전달하는 **수신 전용** 기능이다. 공식 한도는 도메인당 라우팅 규칙 200개, 계정 전체 검증 목적지 주소 200개, 수신 메시지 25MiB다.

같은 도메인 주소로 메일을 **보내려면** 별도 발신 수단이 필요하다. Cloudflare의 Email Sending, Google Workspace 같은 메일 서비스, 트랜잭션 메일 서비스 중 하나를 고르고 SPF, DKIM, DMARC를 맞춘다. 개인 Gmail로 받는 것까지만 되고 그 주소로 답장이 안 되는 문제가 여기서 생긴다.

### 4. 오브젝트 스토리지와 egress

| 항목 | Cloudflare R2 Standard | Amazon S3 Standard (us-east-1) |
|---|---|---|
| 인터넷으로 나가는 전송 | 과금 없음 | 월 100GB(전 서비스, 전 리전 합산) 무료 뒤 첫 10TB는 GB당 0.09달러, 이후 구간별로 단가 하락 |
| 같은 리전 AWS 서비스로 전송 | 해당 없음 | 과금 없음 |
| 저장 | GB-월 0.015달러, 월 10GB 무료 | 별도 요금표 확인 |
| 요청 | Class A 백만 건당 4.50달러, Class B 백만 건당 0.36달러, 무료 할당 있음 | 요청 유형별 요금 |

R2의 이점은 사용자에게 파일을 인터넷으로 직접 내려주는 트래픽이 클 때 가장 크다. 반대로 데이터를 같은 리전의 EC2, Lambda 같은 AWS 서비스에서만 읽는다면 S3의 리전 내 전송은 과금되지 않으므로 egress 차이가 사라진다. 프라이빗 서브넷에서 S3에 접근할 때는 NAT Gateway 처리 요금을 피하도록 Gateway Endpoint를 둔다. 또 S3 앞에 CloudFront를 두면 S3에서 CloudFront로 가는 전송은 과금되지 않지만 CloudFront 자체의 전송 요금이 붙는다. 비용 구조는 [[Egress-Cost|데이터 전송 비용]]을 참고한다.

S3 대비 최대 90% 절감 같은 수치는 인터넷 전송 비중이 큰 특정 사용 패턴의 결과다. 자기 트래픽의 전송 경로별 용량으로 다시 계산한다.

## 예시

- **광고가 붙은 개인 블로그**: 광고 게재가 상업 이용이므로 Vercel이면 Pro가 필요하다. Cloudflare Pages로 정적 배포하고 DNS와 이메일 수신 전달을 함께 두는 구성은 Cloudflare 약관과 한도를 확인한다는 전제에서 무료 범위에 들어올 수 있다.
- **이미지와 다운로드 파일이 많은 서비스**: 인터넷 전송량이 비용을 좌우하므로 R2 같은 egress 무과금 스토리지를 우선 비교한다. 동영상 위주라면 CDN 약관 제한과 전용 스트리밍 상품을 먼저 확인한다.
- **백엔드가 AWS에 있는 서비스**: 파일을 주로 서버가 처리한다면 같은 리전의 S3가 더 단순할 수 있다. 호스팅만 옮겨도 DB 연결 방식은 그대로 남는다.

## 트레이드오프와 한계

- 프레임워크 기능 지원 범위가 다르다. 특정 프레임워크의 서버 렌더링이나 이미지 최적화 기능이 엣지 런타임에서 동일하게 동작하는지 옮기기 전에 확인한다.
- DB 연동은 별도 검증 영역이다. 엣지 런타임에서 TCP 연결, 커넥션 풀과 지역 간 지연이 어떻게 되는지는 선택한 DB와 드라이버 기준으로 따로 확인해야 하며 이 문서는 다루지 않는다.
- 한 벤더에 DNS, CDN, 배포, 스토리지를 모으면 관리가 쉬워지는 대신 계정 장애나 정책 변경의 영향 범위도 커진다.
- 무료 한도와 가격은 공지로 바뀐다. 약관 위반 시 계정 정지 위험이 비용 절감보다 크다.

## 적용 점검

- 광고, 결제, 판매 링크처럼 상업 이용에 해당하는 요소가 있는가, 그렇다면 무료 플랜 약관이 허용하는가
- 도메인 메일을 받기만 하면 되는가, 그 주소로 보내기도 해야 하는가
- 월간 인터넷 전송량과 파일 크기 분포는 얼마인가, 전송이 AWS 리전 안에서 끝나는가
- DNS와 보안 정책을 어디에서 관리하고, 벤더를 옮길 때 무엇을 다시 설정해야 하는가
- 서버 렌더링, 이미지 최적화, DB 연결처럼 런타임 의존 기능을 이전 전에 검증했는가

## 출처

- [Vercel Docs, Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- [Cloudflare, Self-Serve Subscription Agreement](https://www.cloudflare.com/terms/)
- [Cloudflare Docs, Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Docs, Email Routing](https://developers.cloudflare.com/email-routing/)
- [Cloudflare Docs, Email Routing Limits](https://developers.cloudflare.com/email-routing/limits/)
- [Cloudflare Docs, R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [AWS, Amazon S3 Pricing](https://aws.amazon.com/s3/pricing/)
- [Vercel에서 Cloudflare로 이전 후기 — Threads, chamyworks](https://www.threads.com/@chamyworks/post/DcNn-dQkvM-)
- [스토리지는 Cloudflare R2 — Threads, catlovessubakba](https://www.threads.com/@catlovessubakba/post/DW-aobrElRk)

## 관련 문서

- [[Cloud-Service-Models|IaaS/PaaS/FaaS/SaaS]]
- [[Egress-Cost|데이터 전송 비용]]
- [[CDN|CDN]]
- [[DNS|DNS]]
- [[S3-Security-Cost|S3 보안과 비용]]
