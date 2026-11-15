---
tags: [game, unity, urp, 2d, pixel-art, rendering, sprite]
status: done
verified_at: 2026-11-15
category: "Web - 실시간"
aliases: ["Unity 2D Pixel Art Rendering", "Unity 픽셀 아트 렌더링", "Pixel Perfect Camera", "픽셀 퍼펙트 카메라", "도트 스프라이트 설정"]
---

# Unity 2D 픽셀 아트 렌더링: 스프라이트 설정과 Pixel Perfect Camera

도트(픽셀 아트) 스프라이트가 흐릿하거나, 리소스마다 도트 크기가 다르거나, 움직일 때 떨려 보이면 그림보다 엔진 설정을 먼저 본다. 세 증상은 원인이 다르다. 흐림은 텍스처 필터링과 압축, 크기 불일치는 Pixels Per Unit(PPU), 떨림은 화면 픽셀과 스프라이트 픽셀의 배율과 정렬에서 온다.

이 문서는 2026-11-15에 대조한 Unity 6.6(6000.6) 매뉴얼의 URP 2D Pixel Perfect Camera 문서 기준이다. 실제 프로젝트에서 시험한 기록은 아니다.

## 1. 스프라이트 가져오기 설정: 흐림과 크기 불일치

| 증상 | 설정 | 이유 |
|---|---|---|
| 확대하면 경계가 번진다 | Inspector의 Advanced에서 Filter Mode를 Point로 두고, Compression은 None으로 | (일반 원리) 기본 필터링은 확대할 때 이웃 픽셀을 섞어 부드럽게 보정한다. Point는 가장 가까운 텍셀 하나만 써서 경계를 유지한다. 압축은 색 블록을 근사해 도트 색이 번질 수 있다 |
| 캐릭터와 타일의 도트 크기가 다르다 | 모든 스프라이트의 Pixels Per Unit을 같은 값으로 | PPU는 스프라이트 이미지의 몇 픽셀이 월드 좌표 1 유닛이 되는지 정한다. 캐릭터 32, 타일 16이면 같은 한 칸에 캐릭터는 도트 32개가 들어가 도트가 타일의 절반 크기로 보인다 |
| 회전이나 배치 기준점이 픽셀 사이에 놓인다 | Sprite Editor에서 Pivot을 Custom, Pivot Unit Mode를 Pixels로 | 피벗이 픽셀 단위로 스냅된다 |

Scene 뷰에서 배치할 때도 Grid Size를 1 / Asset Pixels Per Unit으로 두고 Grid Snapping을 켜면 오브젝트가 스프라이트 픽셀 단위로 놓인다(PPU 100이면 0.01).

## 2. Pixel Perfect Camera: 떨림과 회전

Pixel Perfect Camera는 화면 해상도가 달라도 스프라이트가 온전한 픽셀로 그려지도록 카메라 해상도를 자동으로 조정한다. Unity는 이 컴포넌트가 픽셀 아트가 흐려지거나 스프라이트가 움직이고 회전할 때 일그러지는 것을 막는다고 설명한다.

왜 떨림이 생기는지는 매뉴얼에 직접 적혀 있지 않다. 일반 원리로 보면, 스프라이트 한 픽셀을 화면의 2.5픽셀처럼 정수가 아닌 배율로 그리면 어떤 도트는 2픽셀, 어떤 도트는 3픽셀이 된다. 스프라이트가 픽셀 사이 위치로 움직이면 어느 도트가 넓어지는지가 프레임마다 바뀌어 모양이 흔들려 보인다. 컴포넌트의 Current Pixel Ratio(예: 2:1은 원래 크기의 두 배)가 지금 배율을 보여 준다.

| 속성 | 하는 일 |
|---|---|
| Asset Pixels Per Unit | 월드 1 유닛에 대응하는 스프라이트 픽셀 수. 장면 안 스프라이트의 PPU와 같게 맞춘다 |
| Reference Resolution | 스프라이트가 설계된 화면 해상도. X 320, Y 180이면 카메라가 스프라이트 픽셀로 가로 320, 세로 180을 보여 준다 |
| Crop Frame | Reference Resolution의 화면비를 벗어나는 영역을 검은 띠로 가린다. None, Pillarbox(좌우), Letterbox(상하), Windowbox(사방), Stretch Fill(뷰포트를 채우도록 늘림) |
| Grid Snapping: Pixel Snapping | 스프라이트를 픽셀 격자에 맞춰 그려 픽셀 사이로 움직이지 않게 한다. Transform 위치 값은 바꾸지 않는다 |
| Grid Snapping: Upscale Render Texture | 장면을 Reference Resolution(뷰포트 화면비가 더 넓거나 높으면 그보다 큰) 임시 텍스처에 그린 뒤 뷰포트 크기로 키운다. 회전한 스프라이트도 원래 해상도의 대각선으로 그려져 픽셀이 똑바르고 정사각형으로 남는다 |
| Filter Mode | Crop Frame이 Stretch Fill일 때 늘리는 방식. Point는 선명하지만 반짝임(shimmering)이 생길 수 있고, Retro AA(기본값)는 쌍선형 필터로 반짝임을 줄이는 대신 픽셀 경계가 흐려질 수 있다 |

기본 설정에서는 뷰포트 전체 해상도로 그리므로 스프라이트를 회전하면 고해상도로 부드러운 대각선이 생긴다. 도트 느낌을 유지하려면 Upscale Render Texture를 쓴다.

## 3. 설치와 호환 조건

- Universal 2D 템플릿으로 만든 URP 프로젝트에는 Pixel Perfect Camera가 기본으로 들어 있다. 카메라에 컴포넌트를 추가하면 된다.
- 별도의 2D Pixel Perfect 패키지는 Built-In Render Pipeline 전용이므로 URP 프로젝트에 설치하지 않는다.
- Cinemachine을 쓰면 Cinemachine 패키지 문서의 Pixel Perfect 호환 안내를 따로 확인한다.

## 4. 트레이드오프와 점검

- Pixel Snapping과 Upscale Render Texture는 움직임을 픽셀 격자에 묶으므로 아주 느린 이동이 매끄럽게 미끄러지지 않고 한 칸씩 끊겨 보인다(설정 설명에서 도출). 부드러운 이동이 중요하면 배율과 스냅을 함께 시험한다.
- 이동량을 프레임 시간으로 계산할 때 소수 픽셀이 쌓이는 문제는 [[Game-Loop-Frame-Timing|게임 루프의 프레임 시간]]과 같이 본다.
- AI 코딩 도구로 2D 게임을 만들 때도 Point 필터와 압축 없음, 단일 PPU, Pixel Perfect Camera를 기준으로 함께 전달하면 생성된 설정을 같은 기준으로 검토할 수 있다(운영 제안).

점검 질문:

- 모든 도트 리소스의 PPU와 카메라의 Asset Pixels Per Unit이 같은가
- 흐림이 보이면 Filter Mode와 Compression부터 확인했는가
- Reference Resolution이 게임의 도트 해상도와 맞고, 다른 화면비를 Crop Frame으로 어떻게 처리할지 정했는가
- URP 프로젝트에 Built-In 전용 2D Pixel Perfect 패키지를 설치하지 않았는가

## 출처

- [Unity Manual 6.6, Scale and rotate pixel art precisely in URP](https://docs.unity.com/en-us/engine/6000.6/manual/unity2d/2d-urp/2d-pixelperfect) — 2026-11-15 개요와 Built-In 전용 패키지 안내 대조
- [Unity Manual 6.6, Add a pixel perfect camera](https://docs.unity.com/en-us/engine/6000.6/manual/unity2d/2d-urp/2d-pixelperfect/prep-sprites) — 2026-11-15 스프라이트 설정, 피벗, Scene 격자, Cinemachine 안내 대조
- [Unity Manual 6.6, Configure a pixel perfect camera](https://docs.unity.com/en-us/engine/6000.6/manual/unity2d/2d-urp/2d-pixelperfect/configure) — 2026-11-15 Filter Mode 기본값과 회전 처리 대조
- [Unity Manual 6.6, Pixel Perfect Camera component reference for URP](https://docs.unity.com/en-us/engine/6000.6/manual/unity2d/2d-urp/2d-pixelperfect/ref) — 2026-11-15 속성 설명 대조
- [도트 게임 만들 때 꼭 해야 하는 유니티 세팅 | 픽셀 퍼펙트 카메라 — YouTube, Todaycoding](https://www.youtube.com/watch?v=UpnXFsKJ4p8) — 2026-11-06 공개 영상, 학습 계기

## 관련 문서

- [[Game-Loop-Frame-Timing|게임 루프의 프레임 시간]] — 델타 타임과 소수 픽셀 누적
- [[Unity-UI-Canvas-Batching|Unity UI 캔버스 배칭과 분할]] — Unity 렌더링 비용
- [[Solo-Game-Scope-and-Asset-Budget|1인 게임 범위와 에셋 예산]] — 도트 에셋을 정할 때의 범위 판단
