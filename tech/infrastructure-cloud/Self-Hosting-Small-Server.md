---
tags: [self-hosting, homelab, podman, systemd, operations]
status: done
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Small Server Self Hosting", "소형 서버 셀프호스팅"]
---

# 소형 서버 셀프호스팅: 서비스 수보다 운영 범위

셀프호스팅은 사용자가 서비스의 배포, 데이터와 복구를 책임지는 운영 방식이다. 구독 비용과 추천 알고리즘에 대한 통제를 줄일 수 있지만, 장애와 업데이트의 책임도 가져온다.

## 작은 장비에 맞추는 선택

단일 바이너리와 SQLite 기반 애플리케이션은 구성요소 수를 줄이는 출발점이 될 수 있다. 미디어 변환, 카메라 분석과 동시 접속처럼 피크 자원을 쓰는 기능은 가벼운 웹 서비스와 구분한다. 서비스 개수만으로 CPU나 RAM 요구량을 계산하지 않는다.

네이티브 실행과 컨테이너 중 어느 쪽이 더 단순한지는 패키지, 의존성 충돌과 업데이트 방식에 따라 달라진다. 한 호스트의 전체 장애 범위는 컨테이너를 나눠도 공유한다.

## N100 사례와 확인 수준

2026-10-15 GeekNews 입력은 N100, RAM 16GB 미니 PC에서 28개 서비스(네이티브 17개, Podman 11개)를 systemd로 관리한 개인 운영 사례를 소개한다. Jellyfin 전환에서 시작해 사진, 음악과 재무 관리로 확장했고, VPN 외에는 인터넷에 직접 공개하지 않으며 낮은 영상 해상도와 단순한 도구를 선호했다는 내용이다.

원문 제목과 URL은 식별했지만 2026-10-16 본문 접근이 실패했다. 수치와 구체적 운영 방식은 제공 발췌 수준으로 보존하며 재현 가능한 용량 기준으로 쓰지 않는다. 후속으로 원문 전체, 백업 방식과 피크 자원 사용을 확인한다.

## 4G USB 동글 사례: 자원 한도가 정하는 운영 범위

2026-11-07 개인 블로그는 약 10달러짜리 4G USB 동글(OpenStick, RAM 512MB 중 약 450MB 사용 가능, Cortex-A53 4코어 1GHz, eMMC 4GB)에 Debian, systemd와 Podman을 올려 DNS 차단(AdGuard Home 약 40MB), 경량 모니터링 두 종, RSS 리더와 AI 에이전트 harness를 운영한 사례를 소개한다. 외부 접속은 포트를 열지 않고 Cloudflare Tunnel을 쓰며, 그 대가로 NSA가 모든 활동을 들여다볼 수 있을지도 모른다는 단점은 홈랩에서 감수할 만하다고 봤다.

같은 글이 밝힌 한계도 운영 기준이 된다. DNS 차단은 모든 요청을 막지 못하고, AI 에이전트 harness는 사실상 root shell이며, 기능이 겹치는 모니터링 도구는 정리 대상이다. 전력, eMMC 마모와 열 관리는 다루지 않았으므로 장기 운영 근거로 쓰지 않는다.

## SaaS 대체 후보의 운영 계약 확인

같은 기능을 제공하는 후보라도 복구 방식, 지원 주체와 배포 에디션은 다를 수 있다. 다음은 2026-10-21 공식 문서와 프로젝트 저장소로 확인한 사례다. 기능 동등성이나 절약액을 검증한 비교표는 아니다.

| 후보 | 확인한 운영 경계 | 도입 전에 확인할 것 |
|---|---|---|
| Immich | DB 백업에는 사진과 영상이 없으므로 미디어 파일도 함께 백업해야 한다. DB에는 파일 경로와 사용자 메타데이터가 있다 | DB와 미디어를 함께 복원하는 절차, 별도 백업 도구와 보관 위치 |
| Vaultwarden | 공식 Bitwarden 서버와 별개인 호환 구현이다. 문제 보고는 Vaultwarden 채널로 하며 웹 금고는 HTTPS가 필요하다 | 클라이언트 호환성, TLS 구성, 파일과 DB 백업 및 지원 책임 |
| n8n | 자체 호스팅 여부와 기능 에디션은 별도 선택이다. Community와 유료 에디션을 구분하며 저장소의 라이선스에도 Enterprise 파일과 그 외 코드의 구분이 있다 | 필요한 기능의 에디션, 사용할 버전의 라이선스와 운영 담당자 |

자체 호스팅 가능이나 소스 공개만으로 전체 기능, 공급사 지원 또는 모든 이용 방식이 허용된다고 판단하지 않는다. 라이선스 확인 절차는 [[Open-Source-License-Review|오픈소스 라이선스 검토]]로 연결한다. 위 사례의 설치, 데이터 이전과 복원은 직접 실행하지 않았다.

## 전자 도서관의 파일과 동기화 상태

셀프호스팅 독서 서비스는 책 파일뿐 아니라 사용자별 읽은 위치, 하이라이트, 평점과 접근 권한을 관리한다. 파일을 복사하는 것과 여러 기기의 상태를 일치시키는 것은 별개다. 오프라인 기기가 돌아왔을 때 충돌과 삭제가 어떻게 반영되는지, 서버와 기기의 버전 조합을 확인한다.

2026-11-02 BookOrbit 공식 README는 전자책, PDF, 만화와 오디오북의 웹 열람, Kobo와 KOReader 간 양방향 진행/주석 동기화, KOReader에서 검색과 내려받기를 설명한다. iPhone은 오프라인 열람과 오디오 재생을, Apple Watch는 내려받은 오디오 재생과 이후 진행 상태 조정을 지원한다. 해당 README의 요구 조건은 서버 v3.0.0 이상, iOS 26 이상이며 Watch 기능은 watchOS 26 이상이다. 본문과 낭독을 결합한 EPUB3 사용 예도 제공한다.

BookOrbit는 도서, import 폴더, 앱 데이터와 PostgreSQL을 포함한 모든 쓰기 경로에 신뢰할 수 있는 로컬 파일시스템을 요구한다. README는 SMB/NFS, FUSE, 클라우드 마운트와 NAS 구성을 지원하지 않으며, 잠금과 rename 등의 차이로 손상이나 유실이 생길 수 있다고 명시한다. 운영에서는 원본 도서, PostgreSQL 데이터, 애플리케이션 데이터와 비밀 설정을 함께 복구 대상으로 검토한다. 자체 서버라고 외부 통신이 없어지는 것은 아니다. 메타데이터 제공자와 외부 독서 서비스 동기화의 활성화 여부를 확인한다. 실제 설치, 기기 동기화, 백업 복원과 EPUB 문장 강조는 시험하지 않았다.

## 운영 체크포인트

1. 외부 노출이 필요한 서비스와 VPN 안에 둘 서비스를 정한다.
2. 설정, 데이터와 비밀 값을 구분해 백업한다.
3. 호스트 장애를 감지할 수 있는 외부 관측 경로를 둔다.
4. OS와 애플리케이션 갱신, 데이터 마이그레이션 및 복원을 연습한다.
5. 관리 시간, 전력과 교체 장비까지 비용에 포함한다.

이 절차는 사례에서 도출한 운영 제안이다. 28개 배포나 성능 재현은 수행하지 않았다.

## 출처

- [What I run on my $10 USD OpenStick homelab — Bosscher](https://blog.bosscher.ch/posts/openstick/) — 2026-11-07 개인 블로그. 수치는 작성자 측정
- [BookOrbit — GitHub, bookorbit/bookorbit](https://github.com/bookorbit/bookorbit) — 2026-11-02 기능과 버전 조건, 데이터 경로를 확인.
- [BookOrbit, What is BookOrbit?](https://bookorbit.app/what-is-bookorbit) — 자체 호스팅과 외부 연동의 경계.

- [Immich, Backup and Restore](https://docs.immich.app/administration/backup-and-restore/)
- [Vaultwarden README — Vaultwarden](https://github.com/dani-garcia/vaultwarden)
- [n8n, Choose how to use n8n](https://docs.n8n.io/choose-how-to-use-n8n/)
- [n8n LICENSE.md — n8n](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)
- [What I Self-Host — viceconsole.fyi](https://viceconsole.fyi/blog/2026/10/10/what-i-self-host) — URL 식별, 2026-10-16 본문 접근 실패
- GeekNews, 2026-10-15 제공 발췌: 내가 셀프호스팅하는 것들 - N100 미니 PC로 서비스 28개 운영하기

## 관련 문서

- [[Backup-Restore|백업과 복구]]
- [[Linux-File-System|Linux 파일과 운영 경로]]
- [[컨테이너(Container)|컨테이너]]
