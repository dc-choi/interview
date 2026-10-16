---
tags: [senior, system-design, video-streaming, vod, cdn, encoding, live-ingest]
status: done
verified_at: 2026-09-30
category: "시니어역량(SeniorEngineer)"
aliases: ["Video Streaming System Design", "VOD System Design", "주문형 비디오 스트리밍 설계", "라이브 ingest"]
---

# 주문형 비디오 스트리밍 시스템 설계

주문형 비디오 서비스는 콘텐츠를 준비하는 처리 경로와 사용자의 재생을 제어하는 요청 경로, 대용량 미디어 바이트를 전달하는 경로를 분리해 설계한다. 세 경로는 부하 양상, 저장소, 실패 방식과 지연 목표가 다르다.

## 요구사항과 범위

- 사용자는 작품을 탐색하고 권한이 있는 콘텐츠를 여러 기기와 네트워크에서 끊김을 줄여 재생한다.
- 운영자는 소스 자산을 검증, 인코딩, 패키징한 뒤 완전한 버전만 공개하고 실패한 작업을 재처리한다.
- 이 문서는 VOD를 중심으로 다룬다. 실시간 방송은 [[#라이브 ingest는 저장 뒤 공개가 아니라 실시간 중계다|ingest 경로]]와 [[#영상 시점과 상호작용 메시지의 도착 시각을 구분한다|메타데이터 동기화]]를 비교하며, 초저지연 전송 전체의 설계는 범위 밖이다.

## 세 개의 plane

```text
처리 plane: 소스 자산 → 검증 → 비동기 인코딩/패키징 → 품질 확인 → publish
                                      │
제어 plane: 클라이언트 → 인증/권한 → 카탈로그/재생 정책 → manifest 위치와 접근 정보
                                      │
미디어 plane: 클라이언트 ← CDN/edge ← segment 객체 ← origin 저장소
```

| plane | 주된 책임 | 지연과 확장 기준 |
|---|---|---|
| 처리 | 자산을 재생 가능한 표현으로 만들고 공개 상태를 전환 | 완료 시간, queue backlog, 작업 실패율 |
| 제어 | 누가 무엇을 어떤 정책으로 볼 수 있는지 결정 | API p95, 권한 정확성, 가용성 |
| 미디어 | 이미 공개된 바이트를 반복 전달 | 동시 재생, egress, startup과 rebuffer |

카탈로그 API가 segment마다 호출되면 제어 plane이 대역폭과 동시 요청을 감당해야 한다. 반대로 CDN이 권한, 지역, 기기 정책을 독자적으로 판단하게 하면 정책 변경과 감사가 어려워진다. 재생 시작에 필요한 권한 결정과 서명된 접근 정보를 제어 plane에 두고, 반복되는 segment 전달은 media plane에 둔다.

## 자산 모델

- **source 또는 mezzanine**: 입수한 원본 자산이다. 변경하지 않는 버전 ID와 checksum을 부여한다.
- **representation 또는 rendition**: 코덱, 해상도, bitrate, 오디오와 자막 조합별 재생 가능 표현이다.
- **segment**: 표현을 작은 시간 구간으로 나눈 전송 객체다. 인코딩 병렬화를 위한 작업 chunk와 재생 segment는 길이와 목적이 다를 수 있다.
- **manifest**: 클라이언트가 선택할 표현과 segment 위치, 시간축을 읽는 재생 목록이다. 배포 도구의 manifest와 구분한다.
- **publish version**: manifest와 모든 참조 객체, 권한 정책의 호환성을 확인한 뒤 공개되는 불변 묶음이다.

작품 ID가 최신 publish version을 가리키게 하고 이전 version과 객체는 즉시 덮어쓰지 않는다. 이렇게 하면 재생 중인 클라이언트가 참조하던 segment를 잃지 않고, 공개 취소와 rollback도 포인터 전환으로 처리할 수 있다.

## ingest에서 공개까지

1. source를 durable storage에 저장하고 checksum, 계약된 길이, 트랙과 메타데이터를 검증한다.
2. 자산 version과 작업 ID를 만든 뒤 인코딩, 자막, 썸네일, DRM 패키징 같은 독립 작업을 비동기 queue로 보낸다.
3. 긴 영상을 시간 chunk로 나눠 병렬 인코딩한다. 작업은 `(assetVersion, profile, chunk)` 키로 멱등하게 만들고 결과를 별도 prefix에 쓴다.
4. package 단계가 segment와 manifest를 만들고, 품질 검사에서 A/V 동기, duration, codec 지원 범위, 누락 segment와 참조 무결성을 확인한다.
5. 모든 필수 representation과 객체가 준비됐을 때만 publish version을 원자적으로 활성화한다. 카탈로그 노출, CDN warm-up과 공개 상태는 이 version에 연결한다.

재시도는 임시 오류만 제한적으로 수행하고 영구 오류와 반복 실패는 DLQ와 운영자 검토로 보낸다. out-of-order 완료가 최신 publish version을 덮지 않도록 asset version과 상태 전이 조건을 저장소에서 확인한다.

### 관리형 영상 처리에 위임할 때의 공개 조건

작은 서비스는 처리와 미디어 전달을 관리형 서비스에 위임할 수 있다. Cloudflare Stream은 업로드, 저장, 인코딩과 전송을 제공한다. 애플리케이션은 영상 ID와 카탈로그의 연결, 공개 시점과 시청 권한을 계속 관리한다. 다음 상태 해석은 2026-10-13 공식 문서 대조 기준이다.

- **업로드 완료와 재생 가능을 구분한다.** 파일을 보냈다는 사실만으로 카탈로그를 공개하지 않고 처리 상태를 확인한다.
- **최소 화질과 전체 화질 완료를 구분한다.** `readyToStream: true`는 적어도 한 화질이 준비됐다는 뜻이다. 전체 화질 완료를 기다리는 정책이면 `status.state`가 `ready`이고 `status.pctComplete`가 수치상 100인지도 확인한다. 응답 예시는 진행률을 문자열로 표시하므로 숫자형이라고 가정하지 않는다.
- **완료 통지의 출처를 확인한다.** Stream webhook은 처리 성공이나 오류를 알린다. `Webhook-Signature`의 timestamp와 원본 body로 서명을 검증하고 허용 기간을 벗어난 요청을 거절한 뒤 상태에 반영한다.
- **재생 가능과 공개 승인을 분리한다.** 처리 성공은 서비스의 시청 자격을 뜻하지 않는다. 비공개 영상은 signed URL 요구 설정과 애플리케이션의 권한 확인을 함께 설계한다.

따라서 최소 화질부터 공개할지, 전체 화질을 기다릴지를 먼저 정하고 준비 중, 처리 실패, 공개 가능 상태를 따로 시험한다. 관리형 서비스를 붙인 재생 데모의 성공만으로 업로드 실패나 비공개 접근 제어까지 검증됐다고 판단하지 않는다.

### 요청 시 HLS를 생성할 때의 공개 경계

앞의 불변 publish version은 필요한 자산을 준비한 뒤 공개하는 기본 설계다. 요청을 받은 뒤 변환을 시작하고 재생 중에도 세그먼트를 추가하는 대안은 갱신 가능한 플레이리스트 계약을 별도로 설계해야 한다. 다음은 2026-10-14 RFC 8216의 4.3.3.4, 4.3.3.5와 6.2.1절을 대조한 내용이다.

- 클라이언트가 읽은 Media Playlist에 적힌 세그먼트는 즉시 다운로드할 수 있어야 한다. 아직 만들지 않은 파일의 주소를 먼저 공개하고 플레이어의 재시도로 복구될 것이라 가정하지 않는다.
- `EXT-X-PLAYLIST-TYPE:VOD`는 플레이리스트가 바뀌지 않는다는 계약이다. 생성 중 목록에 세그먼트를 계속 붙일 때 이 태그를 사용하지 않는다. `EVENT`는 기존 내용을 변경하거나 삭제하지 않고 뒤에만 추가할 수 있다.
- `EXT-X-ENDLIST`는 더 추가할 세그먼트가 없음을 나타낸다. 목록 갱신은 클라이언트 관점에서 원자적으로 이루어져야 한다.

설계 제안: 원본 버전과 변환 프로필로 중복 작업을 제어하고, 다운로드 가능한 세그먼트만 목록에 반영한다. 갱신 중 목록에 완성된 불변 목록과 같은 긴 캐시 정책을 적용하지 않는다. 첫 재생 시간뿐 아니라 인코더 중단, 동시 첫 요청과 CDN의 오래된 목록 때문에 생기는 재생 중단도 시험한다. 이번 대조는 프로토콜 계약 확인이며 실제 플레이어 시험은 수행하지 않았다.

AWS의 과거 온디맨드 사례를 적용할 때는 서비스 지원 시점도 확인한다. S3 Object Lambda는 2025-11-07부터 기존 사용 고객과 일부 APN 파트너로 제공 대상이 제한됐다. 신규 설계의 일반 전제로 두지 않고 호출 경로를 다시 고른다. 이 부분 검증으로 기존 본문 전체의 `verified_at`을 갱신하지 않는다.

## 재생 경로와 ABR

1. 클라이언트가 로그인, 작품 조회와 재생 시작을 요청한다.
2. 제어 plane이 entitlement, 지역, 기기 capability와 동시 시청 정책을 확인하고 재생 token 또는 signed URL/cookie와 manifest 위치를 반환한다. 접근 정보는 예상 재생 시간보다 길게 발급하거나 만료 전에 entitlement를 다시 확인해 갱신한다.
3. DRM 콘텐츠는 manifest의 key ID와 재생 token으로 license service에 사용 권한을 요청한다. License service는 entitlement를 다시 확인하고 만료 정책이 있는 license를 반환한다.
4. 클라이언트는 manifest를 읽어 지원 가능한 representation을 고르고 CDN edge에서 segment를 가져온다.
5. 플레이어는 측정한 처리량, buffer, decode capability와 실패를 바탕으로 다음 segment의 bitrate를 바꾼다. 이 adaptive bitrate, ABR 선택은 서버가 모든 segment를 중계하지 않아도 네트워크 변화에 대응하게 한다.
6. start, buffer, bitrate 변경, 오류와 종료 이벤트는 비동기로 수집해 QoE와 용량 계획에 쓴다.

representation 수를 많이 늘리면 네트워크 적응 선택지는 늘지만 인코딩 비용, 저장량, CDN cache 분산과 manifest 크기도 증가한다. 모든 콘텐츠와 기기에 하나의 고정 bitrate ladder를 강제하지 않고, 콘텐츠 복잡도와 지원 기기, 품질 목표에 맞는 profile 정책을 둔다.

## CDN과 edge 설계

- segment와 정적 manifest는 content version을 포함한 immutable key로 배포해 긴 TTL과 높은 cache hit를 노린다.
- 접근 제어 정보는 cache key를 불필요하게 사용자별로 조각내지 않도록 signed URL/cookie, edge authorization 또는 별도 검증 경로와 함께 설계한다.
- cache miss와 origin 장애를 분리해 관찰한다. CDN은 origin 부하를 줄이지만 인기가 낮은 콘텐츠, 새 version과 특정 지역의 miss를 없애지 않는다.
- origin, shield, 여러 edge 또는 CDN 경로의 failover는 media plane의 가용성을 높인다. 선택 전환이 재생 중 buffer를 고갈시키지 않는지 실제 플레이어로 시험한다.

Netflix Open Connect는 ISP 안이나 인터넷 교환 지점에 배치한 appliance가 인코딩된 파일을 HTTP/HTTPS로 전달하는 공개 사례다. 이는 edge delivery의 한 구현이며 모든 서비스가 자체 appliance를 운영해야 한다는 뜻은 아니다.

공개된 Open Connect 제어 plane은 파일 보유 여부, appliance 상태와 네트워크 인접성을 함께 보고 전달 대상을 정하며 콘텐츠 fill도 관리한다. 모든 파일을 모든 appliance에 복제하고 물리적으로 가장 가까운 한 대만 고르는 모델로 단순화하지 않는다.

## 용량을 산정하는 식

가정과 단위를 먼저 적고 평균이 아닌 피크, 지역, 기기와 bitrate 분포로 계산한다.

| 대상 | 1차 산식 | 추가로 확인할 값 |
|---|---|---|
| peak egress | `동시 재생 수 * 선택 bitrate` | ABR 분포, protocol overhead, failover headroom |
| source 저장량 | `sum(mezzanine 객체 크기)` | 자산 version, replica와 보존 기간 |
| 배포 자산 저장량 | `sum(재생 시간 * 모든 rendition bitrate / 8)` | 오디오, 자막, package overhead, replica와 보존 기간 |
| segment 객체 수 | `재생 시간 / segment 길이 * rendition 수` | 오디오와 자막 track, manifest와 thumbnail 객체 |
| encoding 처리량 | `도착률 * 자산당 encode 작업량` | chunk 병렬도, GPU/CPU 용량, queue wait, 재처리율 |

예상 동시 재생 수가 아니라 관측한 peak 동시성, 선택 bitrate percentile, 지역별 cache hit와 origin egress를 기준선으로 삼는다. 설계 변경 전후에는 같은 기간과 트래픽 slice에서 측정한다.

## 실패 경계와 검증

| 상황 | 안전한 동작 | 검증 지표 |
|---|---|---|
| 인코딩 작업 중단 또는 중복 | publish 전 상태를 유지하고 멱등 재시도 | 완료 지연 p95, DLQ, version 충돌 |
| 일부 rendition 누락 | 정책이 허용하면 낮은 profile만 공개, 아니면 공개 보류 | manifest 참조 무결성, 지원 기기별 재생 성공 |
| CDN miss 또는 edge 장애 | 다른 delivery 경로와 낮은 bitrate로 전환 가능한지 확인 | startup time, rebuffer ratio, edge hit, origin egress |
| 제어 plane 장애 | 새 재생과 권한 갱신은 fail closed, 이미 발급된 token과 license는 만료 정책을 따른다 | entitlement 오류, 재생 시작과 갱신 성공률 |
| 이벤트 유실 또는 지연 | 결제와 권한 원장은 이벤트 분석 경로와 분리하고 QoE 집계에는 late event와 중복을 허용한다 | event lag, dedup 비율, 집계 지연 |

최소 검증 묶음은 다음과 같다.

- 각 rendition을 실제 지원 기기 또는 동등한 player에서 재생하고 duration, A/V sync, 자막, DRM과 manifest 참조를 검사한다.
- cache miss, origin 장애, 느린 네트워크와 edge 경로 전환에서 startup time, rebuffer ratio, fatal playback error를 비교한다.
- 작품, 지역, 기기, codec, 앱 version별로 재생 성공률과 품질을 slice해 평균이 가리는 실패를 찾는다.
- publish와 rollback을 staging에서 반복해 이전 version 재생과 새 version 공개가 섞일 때의 계약을 확인한다.

## 라이브 ingest는 저장 뒤 공개가 아니라 실시간 중계다

VOD는 자산을 저장하고 처리를 마친 뒤 공개하지만, 라이브는 방송자가 보내는 스트림을 받는 즉시 변환해 시청자에게 흘려보낸다. 그래서 가용성의 초점이 저장소보다 **스트림을 어느 처리 거점에 붙이고, 거점에 문제가 생기면 어디로 보내는가**로 옮겨 간다. 2022년 Twitch가 공개한 ingest 구조가 한 사례다.

- **PoP**: 방송자는 RTMP나 WebRTC 같은 프로토콜로 가까운 PoP에 스트림을 보낸다. 공개 시점에 PoP는 전 세계 100곳 가까이였다. PoP의 media proxy가 스트림을 종단하고 속성을 뽑은 뒤 어느 origin으로 보낼지 라우팅 서비스에 묻는다.
- **origin**: PoP에서 받은 스트림은 자체 backbone을 타고 origin data center로 가고, origin이 transcoding 같은 계산 집약 변환과 시청자 쪽 배포를 맡는다. 공용 인터넷 구간을 줄여 시간에 민감한 영상 전송의 불안정을 피하고, 무거운 계산 자원은 origin에 모으는 역할 분담이다.
- **라우팅 서비스**: 각 origin의 compute 용량 변화(유지보수로 빠진 자원 포함)와 backbone link의 사용률, 가용성을 실시간 입력으로 받아 randomized greedy 알고리즘으로 경로를 정한다. origin에 문제가 생기면 새 스트림을 영향 없는 origin으로 자동 배정한다.
- **정적 설정의 한계**: 이전의 정적 proxy 설정에서는 각 origin을 지역 피크에 맞춰 키워야 했다. 전체 용량을 전역 피크 하나에 맞추는 편이 지역 피크의 합보다 작은데도 그렇게 할 수 없었고, 예상 못 한 급증과 장애 origin에도 대응하기 어려웠다. 동적 라우팅이 필요한 이유다.

공개 글은 새 스트림의 배정만 설명하고, 진행 중인 스트림을 다른 origin으로 옮기는 방식이나 시청자 쪽 edge가 같은 라우팅을 쓰는지는 밝히지 않는다. 설계에 옮길 때는 이 둘을 따로 정한다. 네트워크 상태에 따른 재생 화질 적응과 코덱 변환 세부는 이 절의 범위 밖이다.

### 라이브 ingest 풀의 실행 상태와 방송 수용 가능 상태

방송 시작에 맞춘 용량 준비에서는 VM 실행과 실제 스트림 수용 준비를 구분한다. 2026-10-14 AWS 공식 문서 기준, EC2 Auto Scaling의 launch lifecycle hook은 초기화 중 인스턴스를 대기시켜 애플리케이션 준비 뒤 로드밸런서에 등록하도록 구성할 수 있다. Hook은 준비 상태를 자동 판정하는 기능이 아니므로 초기화와 완료 통지는 별도로 구현한다.

라이브 ingest에 적용할 때는 다음을 점검한다(설계 제안).

- 송출 연결, 인코더 초기화와 실제 미디어 처리 확인까지를 준비 시간으로 측정한다. VM 기동 시간만으로 방송 시작 대기 시간을 약속하지 않는다.
- 동시 시청자 수와 동시 방송 수를 분리한다. 시청자 전달 용량과 ingest 및 변환 용량을 각각 산정하고, 방송 하나의 장애가 영향을 주는 범위를 정한다.
- 풀에서 인스턴스를 제거하기 전에 새 방송 할당을 중지하고 진행 중인 방송을 어떻게 종료하거나 복구할지 정한다. 종료 hook의 대기 시간에는 한계가 있으므로 방송 전체가 끝날 때까지 무기한 보호된다고 가정하지 않는다.

이 절은 라이브 ingest의 용량 준비 비교이며 관리형 영상 서비스 전체에 EC2 hook을 요구하는 것은 아니다. 실제 방송과 장애 전환 시험은 수행하지 않았고 기존 `verified_at`은 유지한다.

### 영상 시점과 상호작용 메시지의 도착 시각을 구분한다

부분 검증(2026-10-14): Amazon IVS Low-Latency Streaming의 timed metadata 문서를 대조했다. 영상 세그먼트에 ID3 태그로 메타데이터를 넣으면 플레이어가 그 재생 지점에 도달할 때 이벤트를 받는다. 시청자별 전송 지연이 달라도 **영상 안의 같은 시점**에 상품이나 퀴즈를 표시하는 방식이며, 모두의 벽시계 시각이 같다는 뜻은 아니다.

`PutMetadata`는 활성 스트림에만 삽입할 수 있고 정확한 삽입 시각은 보장하지 않는다. 녹화 영상에도 메타데이터가 남고 재생 시 이벤트가 발생한다. 적용 제안: 방송 중 쿠폰의 표시와 실제 발급을 분리하고, 다시보기에서 오래된 이벤트가 재생돼도 서버가 현재 유효 기간과 발급 조건을 확인하도록 한다. API 성공만으로 특정 프레임과의 정밀 동기화를 선언하지 않는다. 플레이어 시험은 수행하지 않았으며 기존 `verified_at`은 유지한다.

## Netflix 공개 사례를 읽는 경계

- 2024년 공개된 VES/Cosmos 사례는 비동기 workflow와 독립적인 media processing service, chunked encoding의 필요성을 보여 준다. 전체 내부 topology나 현재 운영 수치를 공개한 명세로 읽지 않는다.
- 2015년 per-title encode optimization은 콘텐츠 복잡도에 따라 bitrate ladder를 다르게 고르는 역사적 사례다. 현재 모든 서비스의 필수 codec, ladder나 품질 지표를 뜻하지 않는다.
- Hystrix 저장소는 maintenance mode임을 밝힌다. timeout, isolation, fallback, circuit breaker 원칙은 유효하지만 신규 설계에 특정 라이브러리를 기본값으로 두지 않는다.
- 같은 원문의 번역이나 재게시는 독립 확인 근거가 아니다. 2차 자료의 제품 수치와 특정 내부 stack은 기준 연도가 있는 1차 자료와 대조하고 확인되지 않으면 현재 설계의 전제로 쓰지 않는다.

## 출처

- [Amazon IVS, Embedding Metadata within a Video Stream](https://docs.aws.amazon.com/ivs/latest/LowLatencyUserGuide/metadata.html)
- [RFC Editor, RFC 8216: HTTP Live Streaming](https://www.rfc-editor.org/rfc/rfc8216)
- [Amazon S3, Amazon S3 Object Lambda availability change](https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazons3-ol-change.html)
- [Amazon EC2 Auto Scaling, Amazon EC2 Auto Scaling lifecycle hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)
- [Cloudflare Stream, Overview](https://developers.cloudflare.com/stream/)
- [Cloudflare Stream, Use webhooks](https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/)
- [Cloudflare Stream, Secure your Stream](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
- [Netflix Open Connect, Overview of Open Connect](https://openconnect.netflix.com/Open-Connect-Overview.pdf)
- [Netflix Open Connect](https://openconnect.netflix.com/)
- [The Making of VES: the Cosmos Microservice for Netflix Video Encoding — Netflix TechBlog](https://netflixtechblog.com/the-making-of-ves-the-cosmos-microservice-for-netflix-video-encoding-946b9b3cd300)
- [Per-Title Encode Optimization — Netflix TechBlog](https://netflixtechblog.com/per-title-encode-optimization-7e99442b62a2)
- [Netflix/Hystrix — GitHub](https://github.com/netflix/hystrix)
- [Ingesting Live Video Streams at Global Scale — Twitch Blog](https://blog.twitch.tv/en/2022/04/26/ingesting-live-video-streams-at-global-scale/)
- [Netflix 시스템 디자인, 한국어 번역 — Steemit, kormanocorp](https://steemit.com/krdev/@kormanocorp/43rbe8-netflix)
- [Understanding System Design of Netflix: Backend Architecture and Cloud Services — Medium, Nidhi Upreti](https://medium.com/@nidhiupreti99/understanding-system-design-of-netflix-backend-architecture-and-cloud-services-b077162e45bc)
- [인프런, Hong, CDN 서비스에 대한 시스템 디자인](https://www.inflearn.com/courses/lecture?courseId=336089&unitId=272613)

## 관련 문서

- [[System-Design-Interview|시스템 설계 인터뷰 대응]]
- [[System-Design-Quality-Attribute-Decision|시스템 설계 품질 속성과 의사결정 증거]]
- [[CDN|CDN]]
