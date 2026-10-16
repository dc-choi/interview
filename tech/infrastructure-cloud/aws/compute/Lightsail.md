---
tags: [aws, lightsail, vps, wordpress, cdn, hosting]
status: done
verified_at: 2026-10-14
category: "Infrastructure - AWS"
aliases: ["Amazon Lightsail", "Lightsail", "라이트세일", "Lightsail WordPress 이전"]
---

# Amazon Lightsail — 고정 요금 VPS와 WordPress 이전

Lightsail은 인스턴스(가상 사설 서버, VPS), 컨테이너 서비스, 관리형 데이터베이스, CDN distribution, 로드밸런서, 블록 스토리지, 고정 IP, DNS 관리와 스냅샷을 하나의 콘솔에서 예측 가능한 월 요금으로 제공한다. EC2처럼 인스턴스, 스토리지, 네트워크와 권한을 따로 조립하지 않고 블루프린트(OS나 애플리케이션 이미지)와 요금제를 골라 시작한다. AWS 계정과 자격 증명은 일반 콘솔과 같으므로 [[IAM-Best-Practices|IAM 모범 사례]]와 [[Budget-Alert|예산 알람]]의 계정 가드레일도 그대로 필요하다.

## 언제 Lightsail로 시작하나

2026-09-29 갱신된 AWS 결정 가이드 기준이다.

| 기준 | Lightsail | Elastic Beanstalk | EC2 |
|---|---|---|---|
| 맞는 경우 | 단순한 배포와 고정 월 요금. 개인 블로그, 소규모 웹사이트, MVP, 프로토타입 | 인프라 관리를 맡기고 애플리케이션 배포에 집중 | 인프라 전체 제어, 고성능, 맞춤 네트워크 |
| 확장 | 정해진 인스턴스 크기 범위 안의 단순한 확장 | 자동 확장 지원 | 세밀하게 구성하는 Auto Scaling |
| 구성 자유도 | 제한적 | 플랫폼 선택 범위 안에서 중간 | OS, 네트워크와 리소스 전체 |
| 요금 | 고정 월 요금 | 서비스 추가 요금 없이 사용한 하위 리소스 요금 | 사용량 기반 또는 약정. 관리하지 않으면 비싸질 수 있다 |

- 결정 가이드는 앞으로 고급 네트워크나 RDS, DynamoDB, Lambda 같은 서비스 통합이 필요해질 워크로드라면 EC2를 강하게 검토하라고 권한다.
- Lightsail 로드밸런서는 저용량 웹 트래픽용 HTTP/HTTPS 로드밸런서다. 결정 가이드는 시간당 5GB, 40만 연결까지로 설명한다. TCP나 UDP 부하 분산과 자동 확장이 필요하면 [[ELB|ELB]] 쪽을 본다.
- Lightsail에서 만든 리소스는 모두 Lightsail VPC 안에 있다. RDS 같은 다른 AWS 리소스에 사설 주소로 접근하려면 리전마다 VPC peering을 켜며, 연결 상대는 그 리전의 기본(default) VPC다. S3, CloudFront, DynamoDB는 peering 없이 쓸 수 있다.

초기 서비스에서 멀티 AZ EC2, ALB, 복제 구성의 RDS와 CloudFront를 처음부터 조립하면 운영할 구성 요소와 비용 항목이 트래픽보다 먼저 늘어난다. 요구가 작을 때는 같은 역할의 구성 요소를 묶어 둔 Lightsail로 시작하고 위 경계를 넘을 때 옮기는 순서를 검토할 수 있다(설계 판단).

## 요금에서 놓치기 쉬운 경계

2026-10-14 Lightsail 요금 페이지와 FAQ 기준이며 금액은 USD다. 금액과 무료 혜택은 바뀔 수 있으므로 적용 전에 다시 확인한다.

- **시간 단위 과금:** 요금제는 시간당 과금하고 월 요금을 상한으로 둔다. 가장 저렴한 공용 IPv4 Linux 요금제는 월 5달러(메모리 0.5GB, vCPU 2개, SSD 20GB, 전송 1TB)이고 IPv6 전용 요금제는 월 3.50달러다.
- **중지해도 과금:** 인스턴스와 관리형 DB는 삭제할 때까지 중지 상태에서도 요금이 쌓인다. 쓰지 않는 자원은 필요한 스냅샷을 남기고 삭제해 정리한다.
- **전송 허용량:** 들어오는 전송과 나가는 전송이 모두 인스턴스 허용량을 소모한다. 허용량을 넘으면 인터넷, 다른 리전, 또는 공용 IP를 거쳐 같은 리전 AWS 리소스로 나가는 전송에만 초과 요금이 붙는다. 사설 IP로 같은 리전의 Lightsail 인스턴스, 관리형 DB와 AWS 리소스에 보내는 전송은 허용량을 넘어도 과금되지 않는다. 허용량은 같은 리전, 같은 요금제(bundle)의 인스턴스끼리 합산되고 인스턴스를 지웠다 다시 만들어도 그 달 사용량은 초기화되지 않는다. 서울 리전 초과 요금은 GB당 0.13달러다. 뭄바이, 시드니, 자카르타, 말레이시아, 홍콩, 상파울루 요금제의 허용량은 다른 리전의 절반이다.
- **고정 IP:** 인스턴스에 연결된 동안은 요금이 없지만 연결하지 않은 채 1시간을 넘기면 시간당 0.005달러가 붙는다. IPv6 전용 인스턴스에는 붙일 수 없고 리전당 기본 할당량은 5개(조정 가능)다.
- **DNS:** Lightsail DNS 관리에는 별도 요금이 없고 계정당 DNS 영역을 6개까지(조정 불가) 만든다. 월 300만 쿼리를 넘으면 100만 쿼리당 0.40달러다. 레코드 TTL은 60초로 고정된다. 도메인이 더 많거나 지원하지 않는 레코드 유형이 필요하면 [[Route53|Route 53]]을 쓴다.
- **그 밖의 고정 요금:** 관리형 DB 표준 요금제는 월 15달러부터이고, 고가용성 요금제는 다른 AZ에 DB 인스턴스와 스토리지를 하나 더 두므로 표준의 두 배다. 로드밸런서는 월 18달러이며 인증서 관리를 포함한다. CDN 요금제는 50GB 2.50달러, 200GB 10달러, 500GB 35달러다. 스냅샷은 GB-월 0.05달러이고 같은 인스턴스의 이후 스냅샷은 바뀐 부분만 과금한다.
- **무료 혜택:** Lightsail FAQ는 인스턴스, DB, 컨테이너, CDN, 객체 스토리지의 단기 무료 체험이 신규 고객에게 더 이상 제공되지 않고 AWS Free Tier 크레딧으로 대체됐다고 적는다. 같은 FAQ의 DB 문항과 결정 가이드의 CDN 설명에는 이전 무료 혜택 문구가 남아 있어 표현이 엇갈린다. 실제 혜택은 가입 시점의 Free Tier 조건과 청구서로 확인한다([[AWS-Pricing|AWS 요금 구조]]).

## 블루프린트 선택과 Bitnami 패키지 일정

2026-10-14 Lightsail 문서 기준이다.

- Bitnami가 패키징한 블루프린트는 2026-05-19부터 새 버전이 나오지 않는다. WordPress, WordPress Multisite, LAMP, Nginx, Node.js는 2026-11-19부터, Joomla, Magento, MEAN, Drupal, GitLab, Redmine, Ghost, Django, PrestaShop은 2027-05-19부터 새 인스턴스를 만들 때 고를 수 없다.
- 기존 인스턴스는 계속 실행되고 기존 스냅샷으로 새 인스턴스를 만드는 것도 그 뒤에 가능하다. 실행 중인 인스턴스의 OS와 애플리케이션 업데이트, 보안 패치는 고객 책임이다.
- 새 인스턴스에는 Lightsail이 패키징한 블루프린트(WordPress, WordPress Multisite, LAMP, Nginx, Node.js)를 권장한다. 두 패키지는 파일 경로와 명령이 다르다. `wp-config.php`는 Lightsail 패키지가 `/var/www/wp-config.php`, Bitnami 패키지가 `/opt/bitnami/wordpress/wp-config.php`에 두고, Apache 재시작은 각각 `sudo systemctl restart apache2`와 `sudo /opt/bitnami/ctlscript.sh restart apache`다. 따라 하는 가이드가 어느 패키지 기준인지 먼저 확인한다.

## WordPress 사이트 이전 흐름

1. **새 인스턴스:** 리전과 AZ, WordPress 블루프린트와 요금제를 골라 만든다. 관리자 사용자 이름은 `user`이고 초기 비밀번호는 인스턴스에 저장된다. Lightsail 패키지는 콘솔의 `Retrieve default password`가 여는 CloudShell에서, Bitnami 패키지는 SSH에서 `cat ~/bitnami_application_password`로 확인한다.
2. **콘텐츠 이동:** 기존 사이트의 `도구 > 내보내기`에서 WXR(WordPress eXtended RSS) XML 파일을 받는다. 글, 페이지, 사용자 정의 글 유형, 댓글, 사용자 정의 필드, 카테고리, 태그, 사용자 정의 분류와 사용자가 들어간다. 새 사이트의 `도구 > 가져오기 > WordPress`에서 가져오기 도구를 설치해 실행하고, 작성자를 기존 사용자에 연결하거나 새 사용자로 만들며, 첨부 파일은 `Download and import file attachments`를 선택해 가져온다. 내보내기 대상에 테마와 플러그인은 없으므로 새 사이트에서 따로 설치하고 활성화한다. 파일이 크면 서버 메모리가 부족해 가져오기가 실패할 수 있고 실패해도 일부 콘텐츠가 생성될 수 있으므로 결과를 원본과 대조한다.
3. **고정 IP:** 기본 공용 IPv4는 인스턴스를 중지했다 시작하면 바뀐다. DNS 레코드나 distribution origin이 이 주소를 바라보면 연결이 끊기므로 도메인을 연결하기 전에 고정 IP를 붙인다. 고정 IP는 다른 인스턴스로 옮겨 붙일 수 있어 인스턴스를 교체할 때 DNS를 고치지 않아도 된다.
4. **DNS:** Lightsail DNS 영역을 쓰려면 기존 DNS의 레코드(MX 포함)를 영역에 먼저 모두 옮긴 뒤 등록 기관에서 이름 서버를 Lightsail 이름 서버로 바꾼다. 전파에는 몇 시간이 걸릴 수 있고 도메인 갱신과 결제는 계속 등록 기관에서 한다. 기존 DNS 호스팅을 유지하는 선택지도 있다.
5. **인스턴스의 HTTPS:** Lightsail 패키지 WordPress의 `Set up your website` 흐름은 도메인, DNS, 고정 IP와 Let's Encrypt 인증서를 한 번에 구성하고 HTTP 요청을 HTTPS로 리디렉션한다. 설정 중에는 22, 80, 443 포트가 열려 있어야 하고 최대 15분이 걸린다. 인증서는 60~90일마다 자동 갱신된다.

## Distribution(CDN)을 앞에 둘 때

Lightsail distribution은 CloudFront와 같은 엣지 서버와 IP 대역을 쓴다. origin으로 인스턴스, 컨테이너 서비스, 로드밸런서나 버킷 하나를 지정한다.

- **캐시와 origin 프로토콜:** WordPress origin에는 `Best for WordPress` 캐시 동작을 고른다. origin protocol을 `HTTPS only`로 바꾸면 distribution과 인스턴스 사이도 암호화되지만 인스턴스가 HTTPS를 제공해야 한다.
- **인증서:** 사용자 지정 도메인에는 distribution용 Lightsail 인증서를 만들며 인증서 하나에 도메인을 10개까지 넣는다. Lightsail이 검증 레코드 추가를 먼저 시도하고, 실패하면 인증서에 표시된 CNAME 레코드를 각 도메인의 DNS에 직접 추가한다. 인증서는 검증일부터 13개월 유효하고 자동 재검증에 같은 CNAME을 쓰므로 지우지 않는다. 인증서의 도메인을 다른 distribution(다른 AWS 계정과 CloudFront 포함)이 쓰고 있으면 인증서를 만들어도 붙일 수 없다.
- **도메인 연결:** 검증된 인증서를 붙여 custom domain을 켠다. distribution 하나에 동시에 쓰는 인증서는 하나다. apex 도메인은 Lightsail DNS의 A 레코드에서 distribution을 고르는 alias로, 하위 도메인은 distribution 기본 도메인을 가리키는 CNAME으로 연결한다.
- **WordPress의 HTTPS 판단:** WordPress의 `is_ssl()`은 `$_SERVER['HTTPS']`가 `on`이나 `1`인지, 그 값이 없으면 서버 포트가 443인지로 HTTPS 여부를 판단한다. distribution이 HTTPS를 종료하고 origin에 HTTP로 요청하면 이 판단이 거짓이 된다. 공식 가이드는 `wp-config.php`의 `WP_SITEURL`과 `WP_HOME`을 도메인으로 고정하고, viewer 요청의 프로토콜을 담는 `CloudFront-Forwarded-Proto` 헤더(PHP의 `HTTP_CLOUDFRONT_FORWARDED_PROTO`)가 `https`이면 `$_SERVER['HTTPS']`를 `on`으로 두게 한 뒤 Apache를 재시작한다. 이 설정이 없으면 HTTPS 페이지 안의 스타일시트와 스크립트 주소가 HTTP로 만들어질 수 있고, 브라우저는 이런 혼합 콘텐츠 요청을 차단한다. 편집 전에 스냅샷과 파일 백업을 남긴다.

## 키우거나 EC2로 옮길 때

- **같은 Lightsail 안에서:** 인스턴스, 블록 스토리지 디스크와 DB는 스냅샷으로 더 큰 요금제의 새 리소스를 만들어 키운다. 원본보다 작은 요금제로는 만들 수 없다. 고정 IP를 새 인스턴스로 옮기면 DNS를 바꾸지 않고 전환할 수 있다.
- **EC2로 내보내기:** 인스턴스 스냅샷을 내보내면 EC2에 AMI와 EBS 스냅샷이 생기고, 붙어 있던 블록 스토리지 디스크마다 EBS 스냅샷이 더 생긴다. 같은 리전으로만 내보내므로 다른 리전이 필요하면 Lightsail에서 스냅샷을 먼저 복사한다. 관리형 DB, 컨테이너 서비스, distribution, 로드밸런서, 고정 IP와 DNS 레코드는 내보낼 수 없고, FAQ 기준 Django, Ghost, cPanel & WHM 인스턴스 스냅샷도 제외된다.
- **내보내기 비용과 권한:** 내보내기 기능 자체에는 요금이 없지만 EC2 이미지와 원본 Lightsail 스냅샷이 각각 과금되고, Lightsail에 남겨 둔 리소스는 삭제할 때까지 계속 과금된다. IAM 사용자가 내보내려면 Lightsail 서비스 연결 역할을 만들 권한이 필요하다.

## 흔한 실수

- 고정 IP 없이 도메인과 distribution을 연결해 재시작 뒤 접속과 origin 연결이 끊긴다
- 인스턴스를 중지하면 요금이 멈춘다고 보고 방치한다
- 인스턴스에서 떼어 낸 고정 IP를 남겨 둬 과금된다
- Bitnami 기준 가이드의 경로와 명령을 Lightsail 패키지 인스턴스에 그대로 쓴다
- 이름 서버를 바꾸기 전에 MX 같은 기존 레코드를 옮기지 않아 메일이 끊긴다
- 인증서 검증용 CNAME을 정리하다 지워 재검증이 실패한다
- 전송 허용량이 인스턴스마다 따로라고 보고 같은 리전, 같은 요금제 합산과 초과 과금 범위를 놓친다

## 체크포인트

- Lightsail, Elastic Beanstalk, EC2를 고르는 기준과 Lightsail을 떠날 신호(고급 네트워크, 다른 AWS 서비스 통합, 자동 확장)
- 전송 허용량을 소모하는 방향과 실제 과금되는 방향의 차이
- 고정 IP가 DNS와 distribution origin을 안정시키는 이유
- CDN이 TLS를 종료할 때 애플리케이션이 원래 요청의 프로토콜을 알아내는 방법

## 출처

- [Amazon Lightsail, What is Amazon Lightsail?](https://docs.aws.amazon.com/lightsail/latest/userguide/what-is-amazon-lightsail.html)
- [AWS Decision Guides, Amazon Lightsail, AWS Elastic Beanstalk, or Amazon EC2?](https://docs.aws.amazon.com/decision-guides/latest/decision-guides/lightsail-elastic-beanstalk-ec2.html) — 2026-09-29 갱신본
- [AWS, Amazon Lightsail Pricing](https://aws.amazon.com/lightsail/pricing/)
- [Amazon Lightsail, Billing and account management](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html)
- [Amazon Lightsail, Data transfer in Lightsail](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-data-transfer-allowance.html)
- [AWS General Reference, Amazon Lightsail endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/lightsail.html)
- [Amazon Lightsail, View and manage IP addresses for Lightsail resources](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-public-ip-and-private-ip-addresses-in-amazon-lightsail.html)
- [Amazon Lightsail, Static IP addresses in Lightsail](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-static-ip-addresses-in-amazon-lightsail.html)
- [Amazon Lightsail, Networking FAQ](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-networking.html)
- [Amazon Lightsail, Create a DNS zone to manage domain records for Lightsail instances](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-how-to-create-dns-entry.html)
- [Amazon Lightsail, Connect Lightsail resources to AWS services using VPC peering](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-how-to-set-up-vpc-peering-with-aws-resources.html)
- [Amazon Lightsail, Blueprints packaged by Bitnami](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-bitnami-blueprints.html)
- [Amazon Lightsail, Launch and configure a WordPress instance](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-quick-start-guide-wordpress.html)
- [Amazon Lightsail, Obtain the default application username and password for Lightsail Bitnami instances](https://docs.aws.amazon.com/lightsail/latest/userguide/log-in-to-your-bitnami-application-running-on-amazon-lightsail.html)
- [Amazon Lightsail, Serve web content globally with Lightsail content delivery distributions](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-content-delivery-network-distributions.html)
- [Amazon Lightsail, Configure WordPress with a Lightsail content delivery network](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-configure-wordpress-for-distribution.html)
- [Amazon Lightsail, Configure WordPress with a Lightsail content delivery network (Bitnami)](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-configure-wordpress-for-distribution-bitnami.html)
- [Amazon Lightsail, Secure Lightsail CDN distributions with SSL/TLS certificates](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-create-a-distribution-certificate.html)
- [Amazon Lightsail, Validate SSL/TLS certificates for Lightsail distributions](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-validating-a-distribution-certificate.html)
- [Amazon Lightsail, Serve content with custom domains for your Lightsail distribution](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-enabling-distribution-custom-domains.html)
- [Amazon Lightsail, Upsize a Lightsail instance, storage, or database from snapshots](https://docs.aws.amazon.com/lightsail/latest/userguide/how-to-create-larger-instance-from-snapshot-using-console.html)
- [Amazon Lightsail, Export Lightsail snapshots to Amazon EC2](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-exporting-snapshots-to-amazon-ec2.html)
- [Amazon Lightsail, Export Lightsail resources to Amazon EC2](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-export-to-ec2.html)
- [Amazon CloudFront, Add CloudFront request headers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-cloudfront-headers.html)
- [WordPress Developer Resources, is_ssl()](https://developer.wordpress.org/reference/functions/is_ssl/)
- [WordPress Documentation, Tools Export Screen](https://wordpress.org/documentation/article/tools-export-screen/)
- [WordPress Developer Resources, Import](https://developer.wordpress.org/advanced-administration/wordpress/import/)
- [MDN, Mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)
- [Amazon Lightsail로 워드프레스 웹 사이트 이전하기 — Amazon Web Services Korea](https://www.youtube.com/watch?v=3d0Y0GGtSPI) — AWS Builders 온라인 시리즈 발표
- [AWS 사용자의 10가지 실수, 이것만은 피하세요! — Amazon Web Services Korea](https://www.youtube.com/watch?v=XBhC1QCmrbA) — AWS Builders 온라인 시리즈 발표

## 관련 문서

- [[compute|AWS 컴퓨팅 서비스]]
- [[EC2|EC2]]
- [[Elastic-Beanstalk|Elastic Beanstalk]]
- [[CloudFront|CloudFront]]
- [[Route53|Route 53]]
- [[ACM|ACM]]
- [[Certificate-Lifecycle-Management|인증서 수명 주기 관리]]
- [[AWS-Pricing|AWS 요금 구조]]
- [[Single-Host-SPA-API-Deployment|단일 호스트 배포]]
