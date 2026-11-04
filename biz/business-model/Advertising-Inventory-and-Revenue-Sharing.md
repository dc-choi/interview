---
tags: [business, advertising, inventory, streaming, monetization, ugc, copyright]
status: done
verified_at: 2026-10-30
category: "비즈니스&제품(Business&Product)"
aliases: ["Advertising Inventory and Revenue Sharing", "광고 인벤토리와 수익 배분"]
---

# 광고 인벤토리와 수익 배분

광고 인벤토리는 광고를 노출할 수 있는 기회다. 그 기회를 나누는 계약과 광고를 판매한 뒤 수익을 나누는 계약은 운영 책임과 계산 기준이 다르다. 영상 플랫폼 입점에서는 배분율뿐 아니라 누가 광고를 판매하고 삽입하며 정산하는지 함께 확인한다.

## 나누는 대상을 먼저 구분한다

| 구분 | 나누는 대상 | 확인할 책임 |
|---|---|---|
| 인벤토리 배분(inventory split) | 광고를 넣을 기회나 노출 몫 | 각자의 광고 수요 확보, 광고 서버, 소재와 실제 노출 관리 |
| 수익 배분(revenue share) | 계약에서 정의한 광고 수익 | 판매와 수금 주체, 공제 항목, 정산 기준과 시점 |

인벤토리 30%를 넘기는 것과 전체 광고 매출의 30%를 지급하는 것은 같은 계산이 아니다. 각 몫의 판매 단가와 실제 광고 충족률이 다르면 매출 비중도 달라진다. 확보한 슬롯 수를 곧바로 유료 광고 노출이나 매출로 세지 않는다.

## 플랫폼 조건의 사례

2026-10-30 Roku 개발자 안내 대조 기준, 광고를 포함한 앱은 자체 광고 서버를 구성하고 Roku의 요청에 따라 광고 노출의 30%를 Roku에 제공하는 inventory split 모델을 따른다. Roku는 그 몫의 수익을 갖고 게시자는 나머지 70%를 통제하며 해당 몫의 수익을 갖는다. 세부 의무는 배포 계약에 따르므로 이 비율을 모든 FAST 채널이나 다른 플랫폼의 공통 조건으로 사용하지 않는다.

Roku는 자신이 통제하는 인벤토리를 채우지 않거나 유료 광고 대신 자체 홍보 광고를 넣을 수도 있다고 안내한다. 따라서 플랫폼 입점이나 슬롯 배정은 판매 완료와 다르다. 게시자의 자체 광고 수요 활용도 해당 계약 조건 안에서 이뤄진다.

## 사업 검토에 적용할 질문

다음은 배분 구조에서 도출한 점검 제안이다.

1. 배분 기준이 광고 기회, 실제 노출, 총매출 또는 공제 후 수익 중 무엇인지 확인한다.
2. 각 몫의 광고주 확보, 미판매 슬롯과 미달 노출 처리 책임을 정한다.
3. 콘텐츠 제공자가 광고 삽입까지 맡는 조건이면 광고 서버, 송출과 보고의 구축 및 운영 비용을 계산한다.
4. 실제 노출과 인정된 정산 수익을 대조하고, 플랫폼별 배분율만으로 수익성을 비교하지 않는다.

서버 측 광고 삽입과 시청 추적의 기술 경계는 [[MediaTailor-Ad-Insertion|MediaTailor 광고 삽입]]에서 다룬다. 광고 수요 예측이나 이상 탐지 도구를 도입했다는 사실만으로 판매량과 수익 개선이 입증되지는 않는다.

## UGC 수익은 권리 식별 결과로 귀속된다

이용자가 올린 영상에는 업로더의 창작물과 제3자의 영상이나 음악이 섞일 수 있다. 제3자 저작물이 섞인 업로드에서도 광고 수익을 내려는 플랫폼은 배분율에 앞서 권리자가 누구인지, 그 권리자가 어떤 이용을 허락하는지, 광고 수익을 누구에게 줄지를 정하는 장치가 필요하다(아래 YouTube 구조에서 도출한 판단). 계약 상대가 미리 정해진 인벤토리 배분과 달리 수익을 받을 쪽이 업로드 단위의 식별 결과로 바뀐다.

YouTube의 롱폼 영상에서 업로드별로 광고 수익을 창작자나 권리자에게 귀속시키는 주된 장치는 두 가지다. 파트너 프로그램 밖 채널의 영상에도 YouTube가 광고를 붙일 수 있지만, 약관 자체는 업로더에게 지급 권리를 주지 않으며 지급은 파트너 프로그램 같은 별도 계약에서 생긴다. 음악 공연권처럼 관리 단체가 저작권료를 걷는 경로도 있으며, 그 지급과 광고 수익의 관계는 공개 도움말로 확인하지 않았다.

| 경로 | 수익을 받는 쪽 | 결정 조건 |
|---|---|---|
| YouTube 파트너 프로그램 | 자기 영상에 광고를 붙인 창작자 | 자격 요건, 채널 심사와 수익화 정책 |
| Content ID 소유권 주장 | 일치한 저작물의 권리자, 경우에 따라 업로더와 공유 | 권리자가 미리 정한 규칙과 국가별 적용 |

파트너 프로그램의 자격과 수익화 정책은 [[AI-Generated-Content-Monetization|AI 생성 콘텐츠 수익화]]에 있다. Content ID, 음악 권리와 Shorts의 조건은 2026-11-04 YouTube 고객센터 기준 다음과 같다.

- **권리자의 선택:** 권리자는 일치한 영상의 시청 차단, 광고 게재를 통한 수익 창출, 시청 통계 추적 중에서 고르고, 이 조치를 국가나 지역별로 다르게 정할 수 있다. 일치 판정과 참조 데이터의 조건은 [[Audio-Fingerprinting#저작권 관리에 적용할 때|오디오 핑거프린팅]]에서 다룬다.
- **분쟁 중 수익:** 업로더와 권리자가 모두 수익화를 원하는 영상의 소유권 주장에 이의가 제기되면 분쟁 기간의 수익을 따로 보류했다가 결과에 따라 해당 당사자에게 지급한다. 5일 안에 이의를 제기하면 소유권 주장이 걸린 첫날부터 보류한다.
- **여러 겹의 음악 권리:** 녹음물(마스터) 권리는 보통 녹음한 음반사가 갖고 지역별로 다른 음반사가 맡기도 한다. 작곡의 공연권은 흔히 공연권 관리 단체가 관리하고, 다른 나라에서는 많은 경우 저작권 집중관리 단체가 같은 일을 맡는다. 그 밖의 작곡 권리는 주로 출판사가 관리한다. 도움말은 곡이 쓰일 때마다 그 지급을 전 세계 수십 곳의 권리자에게 나눠야 한다고 설명한다.
- **Shorts의 예외:** Shorts 피드 광고 수익은 월별로 모은 뒤, Short별 참여 조회수에 연결된 수익을 Creator Pool과 음악 파트너에게 사용한 트랙 수에 따라 나눈다. 음악 파트너가 올린 Short와 부적격 조회수의 수익은 Creator Pool에 넣지 않는다. Creator Pool 계산에서는 음악 업계 파트너가 제공하거나 Dream Track이 만든 음악만 Short에 기여한 것으로 보고, 그 밖의 제3자 콘텐츠는 Content ID 수익화 정책이 걸려 있어도 현재 인정하지 않는다. 소유권 주장이 걸린 1분 초과 Shorts는 차단되고 수익화 대상이 아니다. 롱폼의 Content ID 수익 귀속을 Shorts에 그대로 적용하지 않는다.

권리자가 차단보다 수익화를 택하면 식별 장치는 침해 대응 수단에서 수익 경로가 된다. YouTube EMEA 공공정책 책임자의 2021-08-31 공식 글은 권리자가 Content ID로 소유권을 주장한 경우의 95% 이상에서 콘텐츠를 차단하지 않고 광고와 구독 수익을 받는 쪽을 택하며, 직전 12개월 동안 음악 업계에 지급한 40억 달러 이상 가운데 30%가 Content ID로 수익화한 UGC에서 나왔다고 밝혔다. 같은 글은 Content ID 개발에 1억 달러 이상을 투자했다고 설명한다. 회사가 공개한 당시 수치이므로 현재 비율이나 다른 플랫폼의 기대치로 쓰지 않는다.

**사례:** Google은 2006-10-09 YouTube 인수를 발표하고 2006-11-13 완료했다. YouTube는 2007-05-03 원본 콘텐츠로 크고 꾸준한 시청자층을 만든 일부 창작자를 파트너로 올려 기존 파트너와 같은 수익 배분에 참여시킨다고 발표했고, 2007-12-10 미국과 캐나다 거주자 누구나 신청할 수 있게 열었다. 이때 원본 콘텐츠를 정기적으로 올리는 이용자에게 보상하는 것이 중요하다고 밝히고, 심사에서는 조회수와 구독자 등으로 본 상당한 시청자층과 이용약관의 꾸준한 준수를 중점적으로 본다고 했다. Content ID는 2007년부터 운영됐다. 공식 발표 기준으로 일반 이용자 출신 창작자의 수익 배분 참여는 인수 완료 6개월 안에 발표됐다. 당시 권리자 관계와 법무 역량의 공백은 [[Founder-Background-and-Capability-Gaps#성장 뒤 드러나는 비기술 역량 공백|창업자 배경과 역량 공백]]에서 본다.

**적용 제안:** UGC에 광고나 판매 수익을 붙이는 서비스는 배분율보다 다음을 먼저 정한다. 위 구조에서 도출한 점검 질문이며 법률 검토를 대신하지 않는다.

1. 업로드에 섞인 제3자 저작물을 무엇으로 식별하는가(참조 등록과 자동 대조, 신고 접수). 자동 식별에서 빠지는 저작물은 어떻게 처리하는가.
2. 권리자에게 줄 선택지(차단, 추적, 수익화), 국가별 적용과 업로더와의 수익 공유 여부는 무엇인가.
3. 권리 분쟁 중 생긴 수익을 보류했다가 결과에 따라 지급하는 절차와, 잘못된 주장을 반복하는 권리자를 제한하는 기준이 있는가.
4. 음악처럼 권리가 여러 겹인 소재에서 한 번의 이용으로 생긴 수익을 누구에게 어떻게 나누는가.

## 출처

- [Roku Developer, Video advertisements](https://developer.roku.com/dev/docs/video-advertisements) — 2026-10-30 inventory split, 광고 충족과 운영 조건 대조
- [디지털 영상 광고 시장의 변화: 스마트미디어렙의 AWS 활용 사례 — AWS Korea](https://www.youtube.com/watch?v=kLFnbIxQGS4) — 2024-09-09 공개, 31~34분의 인벤토리 배분과 수익 배분 설명. 당시 사업 계획을 현재 진출 실적으로 사용하지 않았다.
- [YouTube Help, How Content ID works](https://support.google.com/youtube/answer/2797370) — 2026-11-04 권리자의 조치 선택, 국가별 적용과 업로더 수익 공유 대조
- [YouTube Help, Monetization during copyright claim disputes](https://support.google.com/youtube/answer/7000961) — 2026-11-04 분쟁 중 수익 보류와 지급 대조
- [YouTube Help, Music Rights Management on YouTube](https://support.google.com/youtube/answer/7071269) — 2026-11-04 음악 권리의 종류, 관리 주체와 지급 분할 대조
- [YouTube Help, YouTube Shorts monetization policies](https://support.google.com/youtube/answer/12504220) — 2026-11-04 Shorts 피드 광고 수익의 풀 배분과 제3자 콘텐츠 처리 대조
- [YouTube, Terms of Service](https://www.youtube.com/t/terms) — 2026-11-04 Right to Monetize 대조
- [YouTube's approach to copyright — Google, Marco Pancini](https://blog.google/around-the-globe/google-europe/youtubes-approach-to-copyright) — 2021-08-31, 소유권 주장의 게시 유지 비율, 음악 업계 지급액과 Content ID 개발 투자액
- [New tools to protect creators and artists — Google, Amjad Hanif](https://blog.google/intl/en-in/products/platforms/new-tools-to-protect-creators-and-artists/) — 2024-09-06, Content ID의 2007년 운영 시작
- [Google To Acquire YouTube for $1.65 Billion in Stock — Google](https://googlepress.blogspot.com/2006/10/google-to-acquire-youtube-for-165_09.html) — 2006-10-09 인수 발표
- [Google Closes Acquisition of YouTube — Google](https://www.sec.gov/Archives/edgar/data/1288776/000119312506238320/dex991.htm) — 2006-11-13 인수 완료 보도자료의 SEC 제출본
- [YouTube Elevates Most Popular Users to Partners — YouTube Official Blog](https://blog.youtube/news-and-events/youtube-elevates-most-popular-users-to) — 2007-05-03 창작자 파트너의 수익 배분 참여 발표
- [Partner Program Expands — YouTube Official Blog](https://blog.youtube/news-and-events/partner-program-expands/) — 2007-12-10 미국과 캐나다 신청 개방과 심사 중점 기준
- [유튜브가 3년간 돈을 못 번 이유 (유튜브 창업자 Steve Chen) — BZCF](https://www.youtube.com/watch?v=cOlopZPs1Vg) — 2026-10-27 공개 클립. UGC 수익화의 선행 과제를 학습 계기로 삼았고 사실관계는 Google과 YouTube 공식 자료로 대조했다. 수익화 시작 시점에 관한 회고는 공식 발표와 맞지 않아 채택하지 않았다.

## 관련 문서

- [[Business-Model|비즈니스 모델과 수익 구조]]
- [[Website-Traffic-and-Ad-Revenue|웹사이트 트래픽과 광고 수익]]
- [[MediaTailor-Ad-Insertion|광고 삽입과 시청 추적]]
- [[Audio-Fingerprinting|오디오 핑거프린팅]] — 참조 자격, 권리 충돌과 정정 절차
- [[AI-Generated-Content-Monetization|AI 생성 콘텐츠 수익화]] — 파트너 프로그램 자격과 수익화 정책
- [[Founder-Background-and-Capability-Gaps|창업자 배경과 역량 공백]] — 권리자 관계와 법무 역량
