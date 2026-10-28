---
tags: [business, model, live-ops, retention, monetization, game]
status: done
category: "비즈니스&제품(Business&Product)"
aliases: ["Live Ops Service Model", "라이브옵스와 서비스형 제품", "패키지형과 서비스형 제품"]
---

# 라이브옵스와 서비스형 제품 모델

제품은 한 번 팔고 끝나는 패키지형과 계속 운영하며 돈을 버는 서비스형으로 나뉜다. 서비스형에서는 제품의 재미나 품질이 출발선일 뿐이고, 사용자가 다시 오고, 계속 쓰고, 돈을 낼 이유를 운영으로 계속 만들어 내야 매출이 유지된다. 이 운영 구조를 게임 업계에서는 라이브옵스(Live Ops)라고 부른다.

## 패키지형과 서비스형

| 구분 | 패키지형 (예: PC 패키지, 스팀 단품 게임) | 서비스형 (예: 부분 유료화 모바일 게임, 라이브 서비스 게임) |
|---|---|---|
| 돈을 받는 시점 | 구매 시점에 한 번 | 이용 기간 전체에 걸쳐 반복 |
| 소비 방식 | 책이나 드라마처럼 원할 때 몰아서 즐기고 묵혀 둘 수 있다 | 트렌드에 맞춰 계속 새로 끌어와야 하는 숏폼에 가깝다 |
| 제품의 핵심 | 완성된 경험의 재미와 완성도 | 재미 위에 얹은 재접속, 지속, 결제 구조 |
| 성패 신호 | 판매량, 평판 | 리텐션 커브, 결제 전환, 이용자당 매출 |
| 출시 뒤 조직 | 업데이트와 유지보수 중심 | 이벤트, 상업화, 운영, 데이터 분석이 상시로 돈다 |

경계는 기기가 아니라 수익 구조가 만든다. 모바일에도 패키지형이 있고 PC에도 라이브 서비스 게임이 있다. 모바일이 서비스형으로 기운 것은 무료 설치와 부분 유료화가 표준이 되면서 수익이 이용 기간에 걸리게 됐기 때문이다.

## 서비스형이 만들어야 하는 세 가지 이유

| 이유 | 설계 대상 | 대표 장치 |
|---|---|---|
| 다시 접속할 이유 | 재방문 주기 | 일일 과제, 시간제 보상, 한정 이벤트, 알림 |
| 계속 플레이할 이유 | 중장기 목표 | 성장 단계, 시즌, 수집, 경쟁과 협력 |
| 결제할 이유 | 가치 교환 지점 | 시간 단축, 꾸미기, 시즌 패스, 한정 상품 |

세 가지는 따로 설계하지 않는다. 재접속이 끊기면 지속 목표가 보이지 않고, 지속 목표가 없으면 결제할 대상도 생기지 않는다.

## Mental model

- 서비스형에서 재미는 필요조건이지 충분조건이 아니다. 재미있는데 아무도 하지 않는 상황의 원인을 재미나 퀄리티에서만 찾으면 진단이 틀린다. 먼저 리텐션 커브의 어느 구간에서 이탈하는지, 재방문할 이유가 있는지를 본다([[PMF-Funnel|PMF 신호와 리텐션 커브]]).
- 서비스형 제품은 게임이 아니어도 같은 구조를 가진다. 구독 앱, 커뮤니티, 습관형 서비스도 재방문, 지속, 결제 이유를 운영으로 만들어야 한다. 기능 단위 장치는 [[Gamification|게이미피케이션]]에서 다룬다.
- 결제 설계는 불쾌감을 함께 설계해야 한다. 어디에 돈을 쓰게 할지만큼 어떻게 써야 불쾌하지 않을지가 장기 리텐션을 좌우한다. 손실 회피와 강요의 경계는 [[Community-Dark-Patterns|다크 패턴 판별 질문]]으로 점검한다.

## 운영 조직

- 서비스형은 출시 뒤 상업화(BM 설계), 라이브옵스(이벤트와 업데이트 운영), 유저 운영(CS와 커뮤니티), 데이터 분석, 유저 리서치가 상시로 필요하다.
- 이 기능을 세분해 전담시키는 조직과 한두 명의 기획자가 이벤트, BM, 밸런스, 운영 대응을 함께 떠안는 조직은 같은 규모의 제품에서도 운영 품질 차이가 날 수 있다. 업계 실무자의 관찰이며 조직별 인력 규모를 비교한 자료는 확인하지 않았다.
- 1인이나 소규모 팀이 서비스형 제품을 하려면 운영 부하를 먼저 계산한다. 이벤트 주기, 대응 채널, 분석 주기를 사람 수에 맞춰 줄이거나, 운영이 적게 드는 패키지형에 가까운 구조를 고른다.

## 트레이드오프

- 서비스형은 매출이 이용 기간에 걸려 상한이 높지만, 운영을 멈추는 순간 매출도 줄어든다. 고정 운영비가 계속 든다.
- 패키지형은 운영 부담이 작고 완성도로 승부할 수 있지만, 출시 뒤 매출 곡선이 빠르게 꺾여 다음 작품이 필요하다.
- 재미를 우선 목표로 둔다면 패키지형이 맞을 수 있다. 서비스형을 고른다면 재미와 함께 운영 구조와 운영 인력을 처음부터 사업 계획에 넣는다.

## 사례: 소유 구조가 바뀐 뒤의 포트폴리오 재편 (EA, 2026)

패키지형 대작과 서비스형 게임을 함께 운영하는 회사는 소유 구조나 재무 조건이 바뀌면 두 유형의 우선순위를 다시 정할 수 있다. 확인 수준별로 나누면 다음과 같다.

- **차입 인수와 비상장 전환(회사 공시):** EA는 2025-09-29 PIF, Silver Lake와 Affinity Partners 컨소시엄이 주당 210달러 현금, 기업가치 약 550억 달러로 회사를 인수하는 계약을 발표했다. 자금은 약 360억 달러의 지분 투자와 JPMorgan Chase가 약정한 200억 달러 부채 금융(종결 시 180억 달러 집행 예정)으로 구성됐다. 거래는 2026-08-04 종결됐고 EA 주식은 NASDAQ에서 거래를 멈췄다.
- **스튜디오 폐쇄(스튜디오 발표):** 2026-10-21 BioWare는 30여 년의 운영을 마치고 문을 닫으며 초기 개발 중이던 차기 Mass Effect 프로젝트도 끝낸다고 밝혔다.
- **감원과 재배치(보도):** Bloomberg는 EA 전체 약 400명 감원 중 BioWare 인력이 약 50명이라고 보도했다. 보도된 내부 메모는 수개월간 사업을 점검해 장기 성장 기회가 큰 곳에 인력과 투자를 모은다는 취지이며, skate.의 자원 축소와 Sims 신작 Project Lotus의 개발 중단도 함께 전해졌다. Project Lotus는 보도마다 일시 중단과 취소로 표현이 갈린다.
- **skate. 조정의 이유(보도에 인용된 EA 공지):** EA는 같은 날 공지에서 skate.가 이용자를 게임으로 데려오는 데는 크게 성공했지만 장기적으로 참여를 유지할 경험이 필요하다며, 더 작고 집중된 팀이 명확한 로드맵을 수행하도록 스튜디오를 바꾼다고 밝혔다. 공지 원문은 열지 못했고 VGC가 인용한 문장으로 확인했다.

적용 해석: skate.에 대해 EA가 밝힌 이유는 유입이 아니라 계속 플레이할 이유의 부족이다. 서비스형 프로젝트의 계속 투자 여부는 유입 성과만이 아니라 위 세 가지 이유 중 계속 플레이할 이유를 만들었는지로도 판단될 수 있다. 이 해석은 skate.에 한정한다. 패키지형 RPG를 만들던 BioWare의 폐쇄와 Mass Effect 중단에는 EA가 참여 관련 이유를 밝히지 않았다. 차입 부담이 생긴 소유 구조에서는 이런 판단이 빠르게 조직 개편으로 이어질 수 있지만, 이번 결정의 원인을 부채 하나로 확정할 근거는 공개 자료에 없다. 발표된 사실과 보도된 메모의 내용은 나눠 인용한다.

## 적용 점검

- 이 제품의 매출은 구매 시점에 생기는가, 이용 기간에 생기는가.
- 사용자가 내일 다시 올 이유, 한 달 뒤에도 쓸 이유, 돈을 낼 이유를 각각 한 문장으로 쓸 수 있는가.
- 그 이유를 만드는 운영(이벤트, 콘텐츠 갱신, 응대, 분석)을 누가, 어떤 주기로 맡는가.
- 결제 장치가 사용자의 목표를 돕는가, 지표만 돕는가.

## 출처

- [모바일 게임과 라이브옵스에 대한 게임 기획 실무자 게시물과 댓글 — Threads, sparronix](https://www.threads.com/@sparronix/post/Dd2tjyTGWxr)
- [EA Announces Agreement to be Acquired by PIF, Silver Lake and Affinity Partners for $55 Billion — Electronic Arts (SEC Form 8-K Exhibit 99.1)](https://www.sec.gov/Archives/edgar/data/712515/000114036125036415/ef20056167_ex99-1.htm) — 2025-09-29 발표, 2026-10-27 인수 가격, 지분과 부채 조달 구조 대조
- [EA Announces Completion of Acquisition by PIF, Silver Lake, and Affinity Partners — Electronic Arts](https://www.ea.com/en-us/news/ea-announces-completion-of-acquisition) — 2026-08-04 거래 종결과 상장 폐지, 2026-10-27 확인
- [EA closes Mass Effect, Dragon Age creator BioWare after 30 years of game development — Game Developer, Bryant Francis](https://www.gamedeveloper.com/business/ea-closes-mass-effect-dragon-age-creator-bioware-after-30-years-of-game-development) — 2026-10-21 보도, BioWare 발표와 Bloomberg 감원 보도, 내부 메모 인용
- [‘Many’ staff gone from Skate studio Full Circle as part of EA layoffs — VGC, Jordan Middler](https://www.videogameschronicle.com/news/many-staff-gone-from-skate-studio-full-circle-as-part-of-ea-layoffs/) — 2026-10-21 보도, 2026-10-27 확인. EA 공지의 skate. 관련 문장 인용
- [EA is shutting down BioWare — The Verge, Jay Peters](https://www.theverge.com/games/1015647/ea-is-shutting-down-bioware) — 2026-10-21(미국 시간) 보도. 2026-10-27 BioWare 성명까지 확인했고 이후 본문은 구독이 필요해 열지 못했다
- [EA, BioWare 폐쇄하고 차기 Mass Effect 개발 중단 — GeekNews](https://news.hada.io/topic?id=35770) — The Verge 기사 요약

## 관련 문서

- [[Business-Model|비즈니스 모델과 수익 구조]]
- [[Pricing-Strategy|가격 정책 설계]]
- [[PMF-Funnel|PMF 신호와 리텐션 커브]]
- [[Gamification|게이미피케이션]]
- [[Community-Dark-Patterns|커뮤니티, 프로덕트 다크 패턴]]
- [[In-App-Purchase|인앱결제]]
- [[Platform-Power|플랫폼 파워]] — 구조조정이 전략이 되는 조건
