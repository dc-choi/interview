---
tags: [network, wireless, wifi, ieee-802-11, troubleshooting, captive-portal]
status: done
verified_at: 2026-11-17
category: "Web - 네트워크"
aliases: ["Wi-Fi Generations", "Wi-Fi 세대", "와이파이 세대", "802.11n", "Wi-Fi 4", "802.11ac", "802.11ax", "802.11be", "802.11bn", "Wi-Fi 7", "Wi-Fi 8", "802.11p", "WAVE", "802.11bd", "DSRC"]
---

# Wi-Fi 세대와 연결 구간 진단

Wi-Fi는 단말과 AP(공유기) 사이의 짧은 무선 구간을 맡는 IEEE 802.11 계열 기술이다. AP 뒤쪽은 다시 유선 LAN, ISP 망, 해저 케이블을 포함한 백본으로 이어진다. 그래서 Wi-Fi 신호가 강해도 인터넷이 안 될 수 있고, Wi-Fi 세대를 올려도 AP 업링크나 서버가 병목이면 체감이 바뀌지 않는다.

## 무선 구간이 하는 일

- **변조**: 송신 측은 비트열을 전파의 진폭과 위상 조합(심볼)에 싣고 수신 측은 이를 비트로 되돌린다. 모뎀(modem)은 변조(modulation)와 복조(demodulation)를 합친 이름이다. 구별되는 심볼이 1024개(1024-QAM)면 심볼 하나에 log2(1024) = 10비트, 4096개(4K QAM)면 12비트를 싣는다. 심볼 간 간격이 좁아지므로 신호 품질이 좋을 때만 쓸 수 있다.
- **OFDM**: 채널 폭을 많은 부반송파로 나눠 병렬로 보낸다. 벽에 반사돼 늦게 도착한 신호(다중 경로)가 섞여도 덜 뭉개지게 하려는 구조다. 부반송파 묶음을 여러 단말에 배분하는 OFDMA는 [[Wireless-Multiple-Access|무선 다중접속과 공간 다중화]]에 있다.
- **매체 접근**: 같은 채널을 여러 단말이 나눠 쓰므로, 보내기 전에 채널이 비었는지 듣고 충돌 가능성이 있으면 임의 시간만큼 물러났다가 다시 시도한다(CSMA/CA). 수신 측은 프레임을 받으면 ACK를 돌려주고, ACK가 없으면 송신 측이 재전송한다. 유선의 CSMA/CD와의 차이는 [[Physical-DataLink-Layer|L1/L2 물리와 데이터링크]]에 있다. 단말이 많을수록 채널을 기다리는 시간이 늘어 단말별 처리량과 지연이 나빠진다.
- **대역**: 2.4GHz, 5GHz, 6GHz 대역을 쓴다. 일반적으로 높은 주파수일수록 벽과 거리에 따른 감쇠가 커서, AP 가까이에서는 5GHz나 6GHz가 넓은 채널로 빠르고 벽 여러 개 너머에서는 2.4GHz가 더 안정적일 수 있다.
- **암호화**: 전파는 벽 너머로도 퍼지므로 보호된 네트워크는 프레임 내용을 암호화한다. 신호가 닿는 것과 내용을 읽을 수 있는 것은 다르다.

## 세대 이름과 IEEE 규격

Wi-Fi Alliance는 2018-10-03 세대 번호 이름을 도입하며 802.11ax 기반 제품을 Wi-Fi 6로 부르고, 이전 세대인 802.11ac와 802.11n을 각각 Wi-Fi 5와 Wi-Fi 4로 소급해 부를 수 있게 했다. 세대 번호는 소비자용 이름이고, 실제 기능은 IEEE 개정안과 Wi-Fi Alliance 인증 프로그램이 정한다.

| 세대 | IEEE 규격 | IEEE SA 승인 | 무엇을 개선했나 |
|---|---|---|---|
| Wi-Fi 4 | 802.11n(Enhancements for Higher Throughput) | 2009-09-11(발행 2009-10-29) | MIMO 공간 다중화(최대 4개 공간 스트림), 20MHz 두 개를 묶은 40MHz 채널, 프레임 집적. 물리 계층 최고 속도가 802.11a/g의 54Mbps에서 600Mbps로 오름 |
| Wi-Fi 5 | 802.11ac(Very High Throughput, 6GHz 미만) | 2013-12-11(발행 2013-12-18) | 5GHz 대역의 넓은 채널(최대 160MHz), 256-QAM, 더 많은 공간 스트림, 하향 MU-MIMO로 최고 속도와 BSS 처리량을 올림 |
| Wi-Fi 6 | 802.11ax(High Efficiency WLAN) | 2021-02-09 | 단말이 많을 때의 효율. OFDMA, MU-MIMO, TWT(단말과 AP가 깨어날 시간을 약속해 전력 절감), 1024-QAM, 160MHz 채널 |
| Wi-Fi 6E | 802.11ax | 위와 같음 | Wi-Fi 6를 6GHz 대역으로 확장 |
| Wi-Fi 7 | 802.11be(Extremely High Throughput) | 2024-09-26(발행 2025-07-22) | 6GHz의 320MHz 채널, 여러 대역 링크를 동시에 쓰는 MLO(Multi-Link Operation), 4K QAM(1024-QAM 대비 전송률 20% 향상) |
| Wi-Fi 8 | P802.11bn(Ultra High Reliability) | 미승인 | 최고 속도보다 신뢰성과 지연 |

- 802.11n의 600Mbps는 4개 공간 스트림, 40MHz 채널, 짧은 보호 구간(400ns)을 모두 갖춘 경우의 물리 계층 전송률이다. 공간 스트림 S개를 쓰려면 송신 안테나와 수신 안테나가 각각 S개 이상 있어야 하므로, 한쪽 안테나가 하나면 40MHz에서도 최고 150Mbps다. 스트림이 많을수록 더 높은 SNR이 필요해 실제 처리량은 거리와 간섭에 따라 크게 낮아진다. 802.11n의 목표가 비트율보다 사용자가 체감하는 실효 처리량이었기 때문에, 프레임마다 붙는 고정 오버헤드를 MAC 계층에서도 줄였다. 여러 프레임을 묶어 보내는 프레임 집적은 묶음 전체에 무선 프리앰블을 한 번만 붙인다. MSDU를 묶는 A-MSDU는 MAC 헤더도 하나로 합치지만, MPDU를 묶는 A-MPDU는 구성 프레임마다 MAC 헤더를 유지하고 확인 응답은 Block Ack로 한 번에 받는다. IEEE 규격 초록이 목표로 적은 값은 MAC 데이터 서비스 접근점에서 잰 최소 100Mb/s다.
- Wi-Fi Alliance는 802.11n 초안 2.0 기기 인증을 2007년 6월에 시작했다. 최종 규격은 초안 2.0에 필수 기능을 더하지 않아 초안 2.0 기기를 소프트웨어 갱신으로 맞출 수 있게 했다.
- 802.11ac-2013의 IEEE SA 목적 문장은 기존 WLAN 용도에서 BSS 처리량을 크게 높이고 6GHz 미만에서 여러 멀티미디어와 데이터 스트림 분배 같은 새 시장을 여는 것이다. 현재 IEEE SA 상태는 Superseded Standard다. IEEE 802.11 TGac 진행 기록에는 40/80/160MHz 전송과 256-QAM 매핑의 PHY 결의, 비연속 160MHz(80+80) 전송의 스펙트럼 마스크, 하향(DL) MU-MIMO 관련 항목이 있다. Cisco의 802.11ac 설명은 변조를 802.11n의 64-QAM에서 256-QAM으로, 공간 스트림을 802.11n의 4개에서 8개로 늘린 것을 차이로 든다. 256-QAM은 심볼당 8비트로 64-QAM의 6비트보다 많이 싣지만 앞의 변조 설명처럼 신호 품질이 좋을 때만 쓴다.
- 규격의 최대치와 인증 제품의 기능 범위는 다르다. Wi-Fi Alliance는 2016-06-29 Wi-Fi CERTIFIED ac 인증을 이른바 wave 2 기능으로 확장했다. 여러 단말에 한 번에 하나씩이 아니라 동시에 데이터를 보내는 MU-MIMO, 최대 채널 폭 80MHz에서 160MHz로 확대, 공간 스트림 지원 3개에서 4개로 확대, 5GHz의 더 많은 채널 지원 권장이 그 내용이다. 이 발표는 새 기능 전체를 지원하는 기기가 원래 인증 기능만 지원하는 기기보다 최대 3배 빠를 수 있다고 적는다. 그래서 같은 Wi-Fi 5 제품이라도 초기 인증(wave 1) 제품인지 wave 2 기능을 갖췄는지에 따라 채널 폭과 동시 전송 능력이 다르다. 이 발표문의 파트너 인용은 이 기능을 하향 MU-MIMO로 부르고, 상향 MU-MIMO는 2022-01-05 Wi-Fi CERTIFIED 6 Release 2에서 인증 기능으로 더해졌다. Wi-Fi 6에서 AP가 OFDMA로 상향과 하향 전송의 단말별 자원을 배분하는 방식은 [[Wireless-Multiple-Access|무선 다중접속과 공간 다중화]]에 있다.
- Wi-Fi Alliance의 Wi-Fi CERTIFIED 6 인증은 2019년 9월, Wi-Fi CERTIFIED 7 인증은 2024-01-08에 시작했다. IEEE 규격 승인보다 인증 제품이 먼저 나온 세대가 있으므로 제품 출시일과 규격 승인일을 구분한다.
- 802.11bn의 목표는 802.11be 대비 신호 품질 수준 중 적어도 하나에서 처리량 25% 향상, 지연 분포 95번째 백분위수 25% 감소, BSS 사이 이동(로밍)을 포함한 MPDU 손실 25% 감소 등이다. Wi-Fi Alliance는 Wi-Fi 8을 신뢰성을 높이는 세대로 소개하고, AP들이 스펙트럼을 두고 경쟁하는 대신 협력하는 조율 기능을 그 특징 중 하나로 든다. 2026-10-27 IEEE 802.11 일정표 기준 초안은 D2.x 단계이고 IEEE 최종 승인은 2028년 5월로 예측돼 있다. 그 전에 나오는 제품은 초안 기준 구현이다.
- 단말과 AP가 둘 다 지원하는 세대로만 붙는다. AP만 새 세대로 바꾸면 기존 단말은 이전 세대로 연결된다. macOS에서는 Option 키를 누른 채 메뉴 막대의 Wi-Fi 상태 메뉴를 열면 현재 연결의 채널, 대역, 보안 방식과 802.11 프로토콜을 볼 수 있다.

## 세대 밖의 용도별 개정: 차량 통신(802.11p와 WAVE)

세대 번호는 소비자용 성능 개정의 이름이고, 802.11에는 특정 환경에 맞춘 개정도 있다. 802.11p-2010(Amendment 6: Wireless Access in Vehicular Environments)은 달리는 차량 환경에서 무선 통신을 하도록 802.11의 MAC과 PHY를 확장한 개정이다(IEEE SA 승인 2010-06-17, 발행 2010-07-15). IEEE SA 페이지의 현재 상태는 Superseded Standard이고, IEEE 802.11 작업반 일정표는 802.11p-2010을 802.11-2012 통합판의 기반 개정으로 적는다. 현행 요구사항은 최신 802.11 통합판에서 확인한다.

WAVE(Wireless Access in Vehicular Environments)는 802.11 위에 IEEE 1609 계열 표준을 얹은 차량 통신 구조다. 아키텍처 안내서 1609.0-2019는 BSS(basic service set, AP와 그에 결합한 단말의 집합) 밖에서 동작하는 802.11과 함께 다음 표준을 구성 요소로 든다. 표의 판 번호와 상태는 2026-11-16 IEEE SA 페이지 기준이다.

| 표준 | 역할 |
|---|---|
| 1609.2 | 애플리케이션과 관리 메시지의 보안 서비스(현행 1609.2-2025) |
| 1609.3 | 네트워킹 서비스(현행 1609.3-2020) |
| 1609.4 | 멀티채널 운영(현행 1609.4-2016, 2016-01-29 승인, 개정 프로젝트 없음. 10년 안에 개정되지 않으면 비활성 절차 대상이 된다) |
| 1609.11 | ITS 전자 결제 데이터 교환(10년 안에 개정되지 않아 2021-03-25 비활성) |
| 1609.12 | 식별자 |

- 1609.1은 2006년 시험용 표준(WAVE Resource Manager)으로, 도로변 장치(RSU)를 거쳐 원격 애플리케이션이 차량 탑재 장치(OBU)에 접근하게 하는 자원 관리자를 정의했지만 2008-12-31 철회됐다. 1609.1을 현행 계층으로 설명하는 자료는 2006년 구성을 기준으로 한 것이다.
- 후속 개정 802.11bd-2022(Enhancements for Next Generation V2X, 승인 2022-12-03, 현재 Superseded로 802.11 일정표상 802.11-2024 통합판의 기반 개정)는 5.9GHz와 60GHz 대역의 차세대 V2X(차량과 모든 것 사이의 통신)를 위해 PHY와 MAC을 고쳤다. 진행 중인 1609.0 개정안(P1609.0)은 1609 표준과 802.11에 더해 LTE-V2X(셀룰러 기반 차량 통신)를 기반 기술로 포함한다. 802.11 계열 하나가 차량 통신을 독점하는 구도가 아니므로, 지역별 주파수 정책과 채택 기술은 별도로 확인한다(2026-11-16 IEEE SA 페이지 대조).
- 미국이 그 예다. FCC는 1999년 5.850~5.925GHz의 75MHz 전체를 ITS(지능형 교통 시스템)에 배정했지만, 2020년 First Report and Order에서 아래쪽 45MHz(5.850~5.895GHz)를 비면허 용도로 돌리고 위쪽 30MHz(5.895~5.925GHz)만 C-V2X(셀룰러 기반 차량 통신) 방식의 ITS에 남겼다. 2024-11-20 채택한 Second Report and Order는 C-V2X 기술 규칙을 정하고, 802.11p-2010을 따르던 DSRC(Dedicated Short Range Communications) 운용을 이 명령의 연방관보 게재일부터 2년 안에 끝내게 했으며, 규칙 시행 뒤 새 면허는 C-V2X만 허가한다. 연방관보 게재는 2024-12-13, 규칙 시행은 2025-02-11이고, 기존 DSRC 면허의 갱신은 2026-12-14를 넘을 수 없다. 2026-11-16 기준으로 이 기한은 아직 지나지 않았으며, 기한 뒤에는 미국에서 802.11p 기반 차량 통신의 운용 근거가 끝난다. 기한의 연장 여부와 다른 지역의 채택 기술은 각국 규제 문서로 따로 확인한다(2026-11-16 FCC 24-123과 연방관보 원문 대조).

## 연결 구간을 나눠 진단한다

Wi-Fi 아이콘이 가득 찼는데 인터넷이 안 된다면 단말과 AP 사이는 연결됐고 그 뒤 어딘가가 막힌 것이다. 구간별로 나눠 확인한다.

| 확인 | 성공의 의미 | 실패하면 볼 곳 |
|---|---|---|
| `ping <기본 게이트웨이 IP>` | 단말과 AP 사이 무선 구간 정상 | AP와의 거리, 전원, 대역 선택 |
| `ping 8.8.8.8` 같은 외부 IP | AP 뒤 회선과 ISP 망을 지나 인터넷까지 도달 | AP의 WAN 연결, ISP 장애 공지 |
| `ping example.com` 같은 도메인 | 이름 해석까지 정상 | DNS 설정. 다른 resolver로 바꿔 보는 것도 방법 |
| `traceroute`(Windows는 `tracert`) | 거치는 홉과 구간별 지연 | 지연이 크게 뛰는 홉 |

- ICMP를 막는 장비도 있으므로 ping 무응답만으로 경로가 끊겼다고 단정하지 않는다. HTTP 요청이나 다른 도구로 교차 확인한다.
- 해외 서버로 가는 traceroute에서 특정 홉부터 지연이 크게 뛰면 대개 장거리 구간이다. 광섬유 안의 빛은 진공보다 느려(대략 초당 20만 km) 수천 km를 왕복하면 물리적으로 수십 ms 이상이 든다. 이 하한은 장비를 바꿔도 줄지 않는다. 지연 지표는 [[Network-Quality-Metrics|네트워크 품질 지표]]를 참고한다.
- 휴대폰과 노트북 운영체제는 일반적으로 접속 직후 제조사의 확인용 주소에 요청해 인터넷 연결 여부와 captive portal(카페, 호텔의 로그인 페이지)을 판단한다. 표준 쪽에서는 RFC 8910이 DHCP와 Router Advertisement로 captive portal API의 URI를 알려 주는 옵션을, RFC 8908이 그 API(JSON, `captive` 필드 등)를 정의한다.
- AP 재시작으로 고쳐지는 경우가 있는 것은 AP도 작은 컴퓨터라 재시작하면 ISP와의 연결과 내부 상태(NAT 매핑 등)가 초기화될 수 있기 때문으로 설명된다. 원인 진단을 대신하지는 않는다.

## 개발 서버를 휴대폰에서 열 때

- `localhost`(127.0.0.1)는 요청을 보낸 기기 자신을 가리킨다. 휴대폰에서 `localhost:3000`을 열면 휴대폰 자신의 3000번 포트를 찾는다. 같은 Wi-Fi의 휴대폰에서 열려면 개발 PC의 사설 IP(예: `192.168.x.x`)를 쓰고, 개발 서버가 loopback이 아닌 인터페이스에서도 수신하도록 띄워야 한다. 원리는 [[Loopback-And-Localhost|Loopback과 Localhost]]에 있다.
- 사설 IP는 그 AP 안에서만 통한다. 외부 사람에게 보여 주려면 배포하거나 터널 서비스를 쓴다. 포트 포워딩으로 개발 PC를 인터넷에 직접 노출하면 누구나 접근할 수 있게 된다. NAT 동작은 [[IPv4-NAT-and-Traversal|NAT와 NAT 통과]]를 참고한다.
- Next.js 16 개발 서버는 기본 허용(localhost와 그 subdomain, 서버를 시작한 hostname) 밖의 호스트에서 온 개발 전용 요청을 막는다. 15.x 문서는 아직 막지 않는다고 적었으므로 버전을 확인한다. 화면은 뜨는데 상호작용이 붙지 않는 증상이 있으면(영상의 Next.js 16 실험에서 관찰) 터미널 경고를 확인하고 `allowedDevOrigins`에 해당 호스트를 넣는다([[NextJS-Config-Development|Next.js 개발 설정]]).
- 공용 Wi-Fi는 AP의 클라이언트 격리로 같은 네트워크의 단말끼리 통신을 막아 둘 수 있다. 반대로 격리가 없으면 외부 인터페이스로 열어 둔 개발 서버를 같은 네트워크의 다른 사람도 열 수 있으므로 확인이 끝나면 내린다.

## 면접 체크포인트

- Wi-Fi 신호 세기와 인터넷 연결이 별개인 이유와 구간별 진단 순서
- Wi-Fi 6가 최고 속도보다 다수 단말 효율을, Wi-Fi 8이 신뢰성과 지연을 목표로 한 이유
- 제품 출시일, 인증 시작일, IEEE 승인일의 차이
- 해외 서버 지연의 물리적 하한과 무선 구간 개선의 한계

## 출처

- [Wi-Fi Alliance introduces Wi-Fi 6 — Wi-Fi Alliance](https://www.wi-fi.org/news-events/newsroom/wi-fi-alliance-introduces-wi-fi-6) — 2018-10-03, 세대 이름과 802.11ax, ac, n 대응
- [Wi-Fi CERTIFIED 6 delivers new Wi-Fi era — Wi-Fi Alliance](https://www.wi-fi.org/news-events/newsroom/wi-fi-certified-6-delivers-new-wi-fi-era)
- [Wi-Fi Alliance introduces Wi-Fi CERTIFIED 7 — Wi-Fi Alliance](https://www.wi-fi.org/news-events/newsroom/wi-fi-alliance-introduces-wi-fi-certified-7) — 2024-01-08, 인증 시작과 주요 기능
- [Wi-Fi 7: Advanced connectivity for the next generation — Wi-Fi Alliance](https://www.wi-fi.org/beacon/the-beacon/wi-fi-7-advanced-connectivity-for-the-next-generation) — Wi-Fi 7과 802.11be 대응
- [Wi-Fi Happens Here — Wi-Fi Alliance](https://www.wi-fi.org/wi-fi-happens-here) — Wi-Fi 8과 802.11bn 대응
- [IEEE SA, IEEE 802.11n-2009](https://standards.ieee.org/ieee/802.11n/3952/) — 승인 2009-09-11, 발행 2009-10-29, 초록의 최소 100Mb/s 목표
- [802.11n: The Standard Revealed — Cisco](https://community.cisco.com/legacyfs/online/legacy/1/1/3/68311-white_paper_c11-427843_v1.pdf) — 2009 백서. 공간 스트림 최대 4개, 40MHz 채널 결합, 보호 구간별 최고 전송률, A-MSDU와 A-MPDU, Block Ack, 초안 2.0 인증 대조
- [IEEE SA, IEEE 802.11ac-2013](https://standards.ieee.org/ieee/802.11ac/4473/) — 2026-11-17 목적 문장, 승인 2013-12-11, 발행 2013-12-18, Superseded 상태 대조
- [Wi-Fi CERTIFIED ac brings new advances in Wi-Fi performance — Wi-Fi Alliance](https://www.wi-fi.org/news-events/newsroom/wi-fi-certified-ac-brings-new-advances-in-wi-fi-performance) — 2016-06-29, wave 2 인증 확장(MU-MIMO, 160MHz, 공간 스트림 4개, 5GHz 채널). 하향 MU-MIMO 표현은 발표문 안의 파트너 인용
- [What Is 802.11ac? — Cisco](https://www.cisco.com/c/en/us/products/collateral/wireless/aironet-3600-series/white_paper_c11-713103.html) — 256-QAM과 64-QAM, 공간 스트림 8개와 4개 비교만 사용. 같은 페이지의 대역 전환, 최대 80MHz 채널, 최고 속도 수치는 규격 최대치와 맞지 않아 옮기지 않음
- [IEEE 802.11, Status of Project IEEE 802.11ac](https://www.ieee802.org/11/Reports/tgac_update.htm) — 40/80/160MHz 전송과 256-QAM 매핑, 비연속 160MHz 스펙트럼 마스크, DL MU-MIMO 항목
- [Wi-Fi CERTIFIED 6 Release 2 adds new features for advanced Wi-Fi applications — Wi-Fi Alliance](https://www.wi-fi.org/news-events/newsroom/wi-fi-certified-6-release-2-adds-new-features-for-advanced-wi-fi-applications) — 2022-01-05, 상향 MU-MIMO 인증 추가
- [IEEE SA, IEEE 802.11ax-2021](https://standards.ieee.org/ieee/802.11ax/7180/)
- [IEEE SA, IEEE 802.11p-2010](https://standards.ieee.org/ieee/802.11p/3953/) — 차량 환경 개정, 승인 2010-06-17, Superseded 상태
- [IEEE SA, IEEE 802.11bd-2022](https://standards.ieee.org/ieee/802.11bd/7451/) — 차세대 V2X, 5.9GHz와 60GHz, Superseded 상태
- [IEEE SA, IEEE 1609.11-2010](https://standards.ieee.org/standard/1609_11-2010.html) — Inactive-Reserved, 2021-03-25 비활성
- [IEEE SA, IEEE 1609.0-2019 Guide for WAVE Architecture](https://standards.ieee.org/ieee/1609.0/6792/) — WAVE 구성 표준 목록
- [IEEE SA, P1609.0](https://standards.ieee.org/ieee/1609.0/12069/) — LTE-V2X를 포함하는 개정안
- [IEEE SA, IEEE 1609.1-2006](https://standards.ieee.org/ieee/1609.1/3958/) — Resource Manager, 2008-12-31 철회
- [IEEE SA, IEEE 1609.2-2025](https://standards.ieee.org/ieee/1609.2/12070/)
- [IEEE SA, IEEE 1609.3-2020](https://standards.ieee.org/ieee/1609.3/10360/)
- [IEEE SA, IEEE 1609.4-2016](https://standards.ieee.org/ieee/1609.4/6183/)
- [FCC, FCC 24-123 Use of the 5.850-5.925 GHz Band, Second Report and Order](https://docs.fcc.gov/public/attachments/FCC-24-123A1_Rcd.pdf) — 2024-11-20 채택, 2024-11-21 공개. 2020년 대역 재배치, DSRC의 802.11p-2010 준수 규정, 연방관보 게재일부터 2년의 DSRC 종료 기한과 신규 면허의 C-V2X 한정
- [Federal Register, Use of the 5.850-5.925 GHz Band (FR Doc 2024-28980, 89 FR 100838)](https://www.govinfo.gov/content/pkg/FR-2024-12-13/html/2024-28980.htm) — 2024-12-13 게재, 시행일 2025-02-11과 DSRC 면허 갱신 한도 2026-12-14
- [Wi-Fi Alliance, Wi-Fi (MAC/PHY)](https://www.wi-fi.org/discover-wi-fi/wi-fi-certified-7) — 세대별 기능과 Wi-Fi 8 소개
- [Wi-Fi Alliance, Wi-Fi 6E: Wi-Fi in the 6 GHz band (2021)](https://www.wi-fi.org/file/wi-fi-6e-wi-fi-in-the-6-ghz-band-2021)
- [IEEE 802.11, Official IEEE 802.11 Working Group Project Timelines](https://www.ieee802.org/11/Reports/802.11_Timelines.htm) — 2026-10-27 갱신본, 802.11be 승인과 발행일, 802.11bn 예측 일정, 802.11p와 802.11bd가 기반이 된 통합판
- [IEEE 802.11, Status of Project IEEE 802.11bn](https://www.ieee802.org/11/Reports/tgbn_update.htm) — UHR 목표
- [Apple, Use the Wi-Fi status menu on Mac](https://support.apple.com/guide/mac-help/use-the-wi-fi-status-menu-on-mac-mchlfad426fa/mac)
- [Next.js, app/api-reference/config/next-config-js/allowedDevOrigins](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins)
- [RFC 8908, Captive Portal API](https://www.rfc-editor.org/rfc/rfc8908)
- [RFC 8910, Captive-Portal Identification in DHCP and Router Advertisements (RAs)](https://www.rfc-editor.org/rfc/rfc8910)
- [바이브코딩할 때 무조건 알아야 할 인터넷 기초 개념과 Wi-Fi 원리 — 투더제이 TTJ](https://www.youtube.com/watch?v=T7jtlfeYgAA)
- [#NW 0035 와이파이 속도 10배 높인 혁명! IEEE 802.11n 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=OMO3Z8r7BqI) — 2026-11-06 공개 쇼츠, 802.11n 보강의 계기이며 내용은 위 IEEE SA와 Cisco 자료로 대조
- [#NW 0036 차끼리 대화하는 도로?! IEEE 802.11p WAVE 90초 완전정리 — 길리랩](https://www.youtube.com/watch?v=MIj1WcKIgp0) — 2026-11-07 공개 쇼츠, WAVE 보강의 계기이며 내용은 위 IEEE SA 페이지로 대조
- [#NW 0037 자동차끼리 대화한다고? V2X 기술 90초 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=ahuyjL8zLnY) — 2026-11-07 공개 쇼츠, 미국 5.9GHz 정책 보강의 계기이며 내용은 위 FCC 명령으로 대조. 통신 거리 수치와 유럽 표준 설명은 확인하지 못해 옮기지 않음
- [#NW 0038 기가비트 와이파이의 개막! IEEE 802.11ac(Wi-Fi 5) 핵심 기술 90초 총정리 — 길리랩](https://www.youtube.com/watch?v=we3eNIyAkNI) — 2026-11-07 공개 쇼츠, Wi-Fi 5 보강의 계기이며 내용은 위 IEEE SA, Wi-Fi Alliance, Cisco 자료로 대조. 최대 6.9Gbps와 802.11n 대비 3배 이상 수치, 빔포밍과 동적 대역폭 운영 설명은 1차 출처로 확인하지 못해 옮기지 않음

## 관련 문서

- [[Wireless-Multiple-Access|무선 다중접속과 공간 다중화]]
- [[WiFi-Sensing|Wi-Fi 센싱]]
- [[Physical-DataLink-Layer|L1/L2 물리와 데이터링크]]
- [[LAN-vs-WAN|LAN과 WAN]]
- [[IPv4-NAT-and-Traversal|NAT와 NAT 통과]]
- [[Application-Layer-Protocols|DHCP와 DNS]]
- [[Loopback-And-Localhost|Loopback과 Localhost]]
- [[Network-Quality-Metrics|네트워크 품질 지표]]
- [[NextJS-Config-Development|Next.js 개발 설정]]
