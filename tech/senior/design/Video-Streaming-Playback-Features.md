---
tags: [senior, system-design, video-streaming, ott, resume-playback, drm, live-to-vod]
status: done
verified_at: 2026-10-14
category: "시니어역량(SeniorEngineer)"
aliases: ["Video Streaming Playback Features", "Resume Playback", "Multi-DRM", "Live-to-VOD", "이어보기 설계", "멀티 DRM", "라이브 다시보기"]
---

# OTT 재생 기능 설계: 이어보기, 멀티 DRM, 라이브 다시보기

[[Video-Streaming-System-Design|주문형 비디오 스트리밍 시스템 설계]]가 처리, 제어, 미디어 전달 경로를 나눈다면, 이 문서는 그 위에 OTT가 더하는 세 기능을 다룬다. 세 기능은 지배적인 제약이 달라 먼저 정할 값도 다르다.

| 기능 | 지배적인 제약 | 먼저 정할 값 |
|---|---|---|
| 이어보기 | 재생 중 계속 들어오는 작은 덮어쓰기 | 보고 주기, 저장소, 경합 규칙 |
| 멀티 DRM | 기기마다 다른 key system과 암호화 scheme | 지원 기기 범위, 암호화 사본 수 |
| 라이브 다시보기 | 라이브 segment의 보존과 재사용 | playlist 계약, 보존 기간, 접근 제어 |

## 이어보기: 시청 위치를 기기 사이에서 잇는다

### 보고 주기가 정확도와 쓰기량을 함께 정한다

플레이어는 재생 중 주기 T마다 `(계정 또는 프로필, 콘텐츠, 재생 위치)`를 서버에 보낸다. 일시정지, 탐색, 종료처럼 위치가 확정되는 순간에도 보내지만, 앱 강제 종료나 네트워크 단절로 이 전송은 실패할 수 있으므로 주기 보고를 하한으로 둔다(설계 제안).

- 비정상 종료 때 잃는 시청 위치는 최대 T다. T를 줄이면 이어보기가 정확해지는 대신 쓰기가 그만큼 는다.
- 초당 쓰기 수는 대략 `동시 재생 수 / T`다. 동시 재생 28만에 T가 10초면 초당 약 2만 8천 건이고, T를 5초로 줄이면 약 5만 6천 건이 된다.
- 위치 기록은 같은 키를 계속 덮어쓰는 작은 쓰기다. 결제나 권한 원장의 트랜잭션 경로와 저장소를 분리한다.

### 쓰기 중심 저장소와 경합 규칙

Apache Cassandra 문서 기준으로 Cassandra는 쓰기를 append-only commit log와 memtable에 기록하고, memtable이 한도에 이르면 불변 SSTable로 flush한다. 쓰기 경로에 읽기 조회가 없어 쓰기 중심 워크로드에 맞지만 읽기 성능과 write amplification에서 비용을 치른다.

여러 기기가 같은 키에 쓰면 최종 위치를 정하는 규칙이 필요하다. Cassandra는 column마다 mutation timestamp를 두고 last write wins로 정한다. Timestamp는 클라이언트가 주거나, 없으면 coordinator 노드의 시계에서 온다. 문서는 정확성이 이 시계들에 달려 있다며 NTP 같은 시간 동기화를 요구한다.

- 기기 시계를 timestamp로 넘기면 시계가 앞선 기기의 오래된 위치가 실제로 더 나중의 위치를 이긴다.
- coordinator 시계에 맡기면 네트워크에서 늦게 도착한 이전 보고가 최신 위치를 덮을 수 있다.

설계 제안: timestamp의 출처를 명시한다. 서버가 재생 세션을 열 때 기준 시각을 발급하고, 클라이언트가 단조 증가 시계로 잰 경과 시간을 더해 timestamp로 보내면 기기 시계 오차를 피하면서 늦게 도착한 보고가 최신 위치를 덮지 않는다. 쓰기 전에 기존 값을 읽어 비교하면 쓰기 경로의 장점이 줄어든다. 두 기기가 같은 작품을 동시에 재생하면 위치가 번갈아 바뀌므로, 동시 시청 허용 여부는 이어보기가 아니라 재생 권한 단계의 정책으로 정한다.

### 원본 기록과 파생 데이터를 나눈다

위치 보고는 이어보기 외에도 시청 목록, 인기 콘텐츠와 추천의 입력이 된다. 원본 위치 저장소에 집계 질의를 돌리지 않고 배치나 스트림 집계로 조회용 저장소를 따로 만든다.

- 끝부분 근처 위치를 시청 완료로 볼 기준과 다음 회차로 넘기는 규칙을 제품 정책으로 정한다.
- 위치 동기화에 필요 없는 IP 같은 식별 정보는 받지 않거나 저장 전에 가린다.
- 다른 기기에 언제까지 반영돼야 하는지는 [[CAP-Theorem|CAP과 일관성 보장]]의 질문으로 정한다. 화면의 이어보기 행은 [[Recommendation-System-Industry-Media|미디어 추천 사례]]의 Continue Watching처럼 탐색 추천과 목적을 구분한다.

## 멀티 DRM: 하나의 암호화 자산을 기기별 key system으로 연다

### 기기마다 열 수 있는 DRM이 다르다

W3C Encrypted Media Extensions(EME)는 웹 페이지와 CDM(Content Decryption Module) 사이의 API다. CDM이 key system마다 형식이 다른 license 요청 메시지를 만들면 애플리케이션이 license 서버와 이를 주고받고, 받은 license를 `update()`로 CDM에 넘긴다. EME가 모든 구현에 요구하는 key system은 Clear Key뿐이라 쓸 수 있는 상용 DRM은 브라우저와 기기가 정한다.

| key system | 공식 문서로 확인한 지원 범위 |
|---|---|
| Widevine | Chrome, Firefox, Edge, Opera 브라우저, Android, Chromecast, Tizen과 webOS 스마트 TV. 데스크톱 Safari, tvOS와 Xbox는 미지원이고 iOS는 별도 클라이언트 라이브러리로 제공한다(2024-10-09 갱신 문서) |
| PlayReady | Windows, Xbox와 스마트 TV 같은 비 Windows 기기의 클라이언트 |
| FairPlay Streaming | Apple 플랫폼에 HLS로 전달하는 콘텐츠의 암호화, 키 교환과 재생 보호 |

지원 기기 목록에서 필요한 key system을 도출한다. Apple 기기의 HLS 재생에는 FairPlay가, Chrome과 Android에는 Widevine이, Widevine을 지원하지 않는 Xbox에는 PlayReady가 필요한 식이다.

### 공통 암호화로 사본 수를 줄인다

ISO/IEC 23001-7 Common Encryption은 여러 key system이 같은 미디어를 복호화할 수 있게 하는 암호화 방식이다. W3C의 EME용 MP4 stream format 문서는 `cenc`(AES-128 CTR)와 `cbcs`(AES-128 CBC) 두 scheme을 다루며, 스트림에는 SystemID마다 `pssh` box를 둘 수 있다. 문제는 클라이언트마다 받아들이는 scheme이 다르다는 점이다. 아래는 2026-10-14 공식 문서 대조 기준이다.

| 클라이언트 | `cenc` | `cbcs` | 근거 |
|---|---|---|---|
| Apple 기기의 FairPlay HLS | 쓰지 않음 | fMP4에서 사용 | FPS 암호화 method는 SAMPLE-AES여야 하고 fMP4의 SAMPLE-AES는 `cbcs`다. Apple 기기에는 SAMPLE-AES-CTR을 쓰지 않는다 |
| Widevine, Android 4.4~6.x | 지원 | 미지원 | Widevine 문서 |
| Widevine, Android 7 이상, Chrome, Firefox | 지원 | 지원 | Widevine 문서 |
| PlayReady 1.x~3.x 클라이언트 | 지원 | 미지원 | PlayReady 문서 |
| PlayReady 4.0 이상 클라이언트 | 지원 | 선택 지원, license 요청에서 알림 | PlayReady 문서 |

- `cbcs` 한 벌로 최신 Apple, Widevine 클라이언트와 CBC 지원을 알리는 PlayReady 4.x 클라이언트를 덮을 수 있다. 오래된 Android나 PlayReady 3.x 이하 기기까지 지원하려면 `cenc` 사본이 더 필요하고, 사본이 두 벌이면 저장량이 늘고 CDN cache도 갈라진다.
- PlayReady 문서는 한 콘텐츠를 CTR과 CBC로 함께 암호화할 때 같은 KID와 콘텐츠 키를 쓰지 말라고 한다. 두 license를 함께 받은 클라이언트가 동작하지 않고, 같은 키로 두 모드의 암호문을 얻은 공격자가 무단 복호화하기 쉬워지기 때문이다.
- Apple HLS 저작 명세는 Common Encryption으로 암호화한 영상에 1:9 encrypt:skip pattern(10% 부분 암호화)을 요구한다.

### 키와 license 경로

- 패키저는 콘텐츠 키를 DRM 키 제공자에게서 받는다. AWS의 SPEKE는 암호화기, 패키저와 DRM 키 제공자 사이의 통신 표준이며, 같은 키 제공자가 플레이어에 복호화용 license를 발급한다.
- license를 발급할 때 시청 권한을 다시 확인하는 흐름은 [[Video-Streaming-System-Design|기본 설계]]의 재생 경로를 따른다.
- PlayReady는 만료일, 보안 수준, 출력 제한 같은 정책을 강제할 수 있다. Apple HLS 저작 명세는 HD 해상도에 HDCP TYPE-0, HD를 넘는 해상도에 TYPE-1을 권장한다. 기기 보안 수준과 출력 보호에 따라 내줄 최대 화질을 license 정책과 함께 설계한다.
- FairPlay Streaming 운영 인증 정보는 Apple Developer Program 계정 소유자가 승인을 요청해야 한다. 소비자에게 스트리밍 서비스를 직접 제공하는 팀만 승인되고 콘텐츠 소유자를 대신하는 제3자 계정은 승인되지 않으므로, 출시 일정에 승인 기간을 넣는다.

## 라이브 다시보기: 이미 만든 segment를 VOD로 다시 묶는다

### 미리 만든 segment를 HTTP 객체로 전달한다

HLS는 playlist와 media segment를 URI로 가리키고 HTTP로 전달하는 것을 기본으로 한다(RFC 8216 2절). 라이브 패키저가 segment 파일을 객체 저장소에 쓰고 CDN이 이를 일반 HTTP 객체로 전달하면, 스트리밍 서버가 요청 시점에 영상을 잘라 보내는 방식보다 전달 경로가 단순해진다. 대신 라이브 segment가 저장소에 남아 저장량과 객체 수가 늘어난다.

- segment 객체 수는 `방송 시간 / segment 길이 * rendition 수`다. Apple 명세가 권장하는 6초 segment에 rendition 5개면 24시간 채널 하나가 하루 7만 2천 개를 만들고, 오디오와 자막 트랙은 따로 더해진다.
- 보존 기간과 삭제 규칙을 채널과 프로그램 단위로 처음부터 정한다.

### 라이브 playlist의 세 계약

RFC 8216 기준이다.

- 일반 라이브 playlist에는 `EXT-X-ENDLIST`가 없고, 서버는 앞쪽 segment부터 순서대로 목록에서 뺄 수 있다. 다만 남은 길이가 target duration의 세 배보다 짧아지게 빼면 안 되고, 클라이언트는 끝에서 target duration 세 배 이내의 segment에서 재생을 시작하지 않아야 한다.
- `EXT-X-PLAYLIST-TYPE:EVENT`는 segment를 끝에만 추가할 수 있다. Apple 명세는 고정 시점에서 시작해 segment를 지우지 않는 playlist에 EVENT 표시를 요구한다. 진행 중인 방송을 처음부터 보거나 되감는 경로에 맞는다.
- `VOD` 타입 playlist는 바뀌지 않는다. `EXT-X-ENDLIST`는 더 추가할 segment가 없다는 표시이며, EVENT에 ENDLIST가 붙으면 클라이언트는 목록을 다시 읽지 않아도 된다.

그래서 segment를 보존하면 다시보기를 빨리 여는 일은 재인코딩이 아니라 playlist 생성 문제가 된다. 방송 중에는 이미 만든 segment를 가리키는 EVENT playlist를 내주고, 방송이 끝나면 ENDLIST를 붙이거나 프로그램 구간만 담은 VOD playlist를 공개한다. 24시간 채널에서 프로그램 구간을 자를 때는 segment의 첫 sample을 절대 시각에 대응시키는 `EXT-X-PROGRAM-DATE-TIME`을 기준으로 삼을 수 있다. 다시보기는 라이브 인코딩 설정을 그대로 물려받으므로 VOD 화질 기준이 다르면 별도 인코딩을 둔다(설계 제안).

### 관리형 대안: MediaPackage v2 live-to-VOD

2026-10-14 AWS 문서 기준 MediaPackage v2의 harvest job은 라이브 스트림의 지정 구간을 VOD 자산으로 추출해 S3에 저장한다.

- endpoint는 암호화 여부와 관계없이 HLS, DASH 또는 CMAF를 제공해야 한다. 시작 시각은 과거이면서 endpoint의 startover window 안이어야 하고, 끝 시각은 미래일 수 있어 진행 중인 스트림도 harvest할 수 있다.
- 자산 하나의 최대 길이는 24시간이고, 기본 한도로 channel group당 활성 harvest job은 10개다.
- 여러 manifest에 들어간 segment는 중복을 제거해 S3에 한 번만 옮긴다. 대상 bucket은 harvest하는 MediaPackage와 같은 리전에 있어야 한다.

### 접근 제어와 공개 조건

- CloudFront 문서는 HLS 영상의 모든 파일처럼 여러 제한 파일에 접근을 줄 때 signed cookie를 쓰는 경우로 든다([[CloudFront]]).
- Apple HLS 저작 명세는 media segment URL을 완전히 고정하지 말고 기기별로 발급하거나 시간에 따라 바꾸라고 권장한다.
- 라이브 권리와 다시보기 권리가 다를 수 있으므로 공개 전에 권리 메타데이터를 확인한다(설계 제안).

## 사례: 국내 OTT의 단계적 이관 (2018 발표 기준)

지상파 방송사 합작 OTT가 AWS 행사에서 공개한 이관 과정이다. 수치와 구성은 발표 당시 발표자가 밝힌 값이며 현재 운영 상태를 뜻하지 않는다.

- IDC의 3계층 구조(.NET, MS SQL, 서버 16대)는 동시 접속이 늘자 DB 잠금과 서버 장애가 되풀이됐고, 서버 증설에 약 한 달이 걸렸다. 국내 클라우드를 거쳐 AWS로 옮겼다.
- PC 웹은 .NET 서버 렌더링, 모바일은 Java REST API로 같은 기능을 따로 구현해 파라미터, 페이징과 응답이 어긋났다. REST API 하나와 클라이언트 렌더링으로 합치고 Swagger 명세에서 서버 코드를 생성해 입출력을 고정했다([[API-Documentation|API 문서화]]의 Spec-First).
- 이어보기는 플레이어가 10초마다 HTTP로 위치를 보내고 IP는 받지 않는 방식이었다. 월 8TB를 약 18대의 Cassandra 클러스터가 받고, Spark로 집계한 결과를 MongoDB에 넣어 인기 콘텐츠와 시청 목록에 썼다.
- 2015년 국제 야구 대회 한일전 생중계에서 동시 접속 28만, 네트워크 피크 약 551Gbps를 기록했고 플랫폼 CPU는 20% 이하였다.
- 자체 헤드엔드는 Widevine, PlayReady, FairPlay를 함께 지원했다. 라이브도 TS segment를 S3에 쌓고 CloudFront로 전달해, 방송 시작 5분 뒤부터 VOD처럼 볼 수 있는 퀵VOD를 제공했다. 대가로 S3 사용량이 늘었다.
- 2018년 3.0에서는 API를 약 160개 마이크로서비스로 나눠 Kubernetes에 올리고 circuit breaker와 로컬 캐시를 표준화했다. 기능 하나씩 배포할 수 있게 되면서 기능을 낼 때마다 전체를 다시 QA하던 부담이 줄었다.

## 판단 체크포인트

- 이어보기 보고 주기를 정할 때 잃어도 되는 시청 위치와 그 주기의 초당 쓰기량을 함께 제시하는가
- 기기 간 위치 경합을 timestamp의 출처(기기 시계, 서버 시계)까지 포함해 설명하는가
- 지원 기기 목록에서 필요한 key system과 `cenc`, `cbcs` 사본 수를 도출하고, 두 모드에 같은 키를 쓰지 않는가
- 라이브 다시보기를 재인코딩이 아니라 segment 보존과 playlist 계약으로 설명하고 보존 비용을 산정하는가

## 출처

- [RFC Editor, RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216)
- [Apple Developer, HTTP Live Streaming (HLS) authoring specification for Apple devices](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices)
- [Apple Developer, FairPlay Streaming](https://developer.apple.com/streaming/fps/)
- [W3C, Encrypted Media Extensions](https://www.w3.org/TR/2017/REC-encrypted-media-20170918/)
- [W3C, ISO Common Encryption Protection Scheme for ISO Base Media File Format Stream Format](https://www.w3.org/TR/eme-stream-mp4/)
- [Google Widevine, Widevine DRM Overview](https://developers.google.com/widevine/drm/overview)
- [Microsoft PlayReady, PlayReady Content Encryption Modes](https://learn.microsoft.com/en-us/playready/packaging/content-encryption-modes)
- [Microsoft PlayReady, PlayReady Overview](https://learn.microsoft.com/en-us/playready/overview/overview)
- [AWS SPEKE, What is Secure Packager and Encoder Key Exchange?](https://docs.aws.amazon.com/speke/latest/documentation/what-is-speke.html)
- [AWS Elemental MediaPackage v2, Creating live-to-VOD assets with MediaPackage](https://docs.aws.amazon.com/mediapackage/latest/userguide/live-to-vod.html)
- [Amazon CloudFront, Decide to use signed URLs or signed cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-choosing-signed-urls-cookies.html)
- [Apache Cassandra Documentation, Storage Engine](https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html)
- [Apache Cassandra Documentation, Dynamo](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [국내 미디어 고객사의 AWS 활용 사례 - POOQ 서비스, 콘텐츠연합플랫폼 — Amazon Web Services Korea](https://www.youtube.com/watch?v=gZ3z87v6_rI)

## 관련 문서

- [[Video-Streaming-System-Design|주문형 비디오 스트리밍 시스템 설계]]
- [[CDN|CDN]]
- [[CloudFront|CloudFront]]
- [[CAP-Theorem|CAP과 일관성 보장]]
- [[NoSQL-Overview|NoSQL 개요]]
- [[Recommendation-System-Industry-Media|미디어 추천 사례]]
- [[API-Documentation|API 문서화]]
