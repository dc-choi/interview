---
tags: [game, unity, 2d, sprite, sprite-atlas, rendering, draw-call, performance]
status: done
verified_at: 2026-11-17
category: "Web - 실시간"
aliases: ["Unity Sprite Atlas", "Unity 스프라이트 아틀라스", "Sprite Sheet", "스프라이트 시트", "Sprite Editor Slice", "스프라이트 슬라이스"]
---

# Unity 2D 스프라이트 시트와 아틀라스: 드로우콜과 메모리의 균형

2D 게임의 이미지를 한 장씩 따로 넣으면 그리는 요청이 텍스처마다 나뉜다. 여러 그림을 한 텍스처에 모으면 요청을 줄일 수 있지만, 묶음을 크게 만들수록 지금 쓰지 않는 그림까지 메모리에 올라간다. 이 문서는 Unity에서 그림을 한 텍스처로 모으는 두 방법과 묶는 기준을 다룬다. 드로우콜(CPU가 GPU에 보내는 그리기 요청)과 프레임 예산의 기본은 [[Unity-UI-Canvas-Batching|Unity UI 캔버스 배칭과 분할]], [[Game-Loop-Frame-Timing|게임 루프의 프레임 시간]]에 있다.

이 문서의 Unity 동작은 2026-11-16에 대조한 Unity 6000.5 매뉴얼 기준이다(pivot 정의만 6000.2). 대조 시점의 최신 매뉴얼은 6000.6이며, 아틀라스 소개의 드로우콜 설명은 6000.6에서도 같다.

## 왜 한 텍스처로 모으는가

- 스프라이트마다 별도 텍스처를 쓰면 Unity는 텍스처마다 별도의 드로우콜을 만들어 GPU에 보낸다.
- 스프라이트 아틀라스는 여러 텍스처를 하나의 텍스처로 합치고, Unity는 아틀라스 안의 모든 스프라이트를 드로우콜 하나로 그릴 수 있다.
- SRP Batcher를 쓰는 파이프라인(URP, HDRP, 사용자 SRP)에서는 드로우콜 수가 줄지 않을 수 있다. Unity 문서는 이 경우에도 성능이 비슷한 정도로 좋아진다고 설명한다. 그래서 효과는 드로우콜 수만이 아니라 프레임 시간으로 확인한다.

## 한 텍스처로 모으는 두 방법

| 방법 | 만드는 법 | 어울리는 경우 |
|---|---|---|
| 스프라이트 시트 | 처음부터 한 이미지에 여러 프레임을 그린 뒤 Texture의 Sprite Mode를 Multiple로 바꾸고 Sprite Editor에서 자른다 | 걷기, 공격처럼 칸 크기가 같은 애니메이션 프레임 |
| 스프라이트 아틀라스 | 따로 만든 이미지들을 Sprite Atlas 에셋에 넣어 Unity가 하나의 텍스처로 묶게 한다 | 이미 개별 파일로 있는 아이콘, 소품, 여러 크기의 그림 |

Sprite Editor의 Slice 방식은 투명도로 경계를 찾는 Automatic, 같은 크기로 자르는 Grid By Cell Size, 행과 열 수로 자르는 Grid By Cell Count, 마름모 모양으로 자르는 Isometric Grid가 있다. Automatic이 아닌 방식을 고르거나 Slice 설정을 바꾸면 자를 칸을 빨간 윤곽으로 미리 보여 준다. 이미 자른 텍스처에서는 미리보기가 보이지 않을 수 있다.

### 프레임마다 기준점을 맞춘다

스프라이트의 pivot은 그 그림의 좌표 원점이자 기준점이다. 각 칸의 pivot이 같은 위치(예: 아래 가운데)인데 칸 안의 캐릭터 위치가 프레임마다 다르면, 프레임이 바뀔 때 캐릭터가 위치를 옮긴 것처럼 흔들린다. 실무 팁으로, AI 이미지 생성 도구로 시트를 만들 때는 칸 크기, 캐릭터의 발 위치 같은 기준선을 함께 지정하고, 맞지 않으면 칸마다 pivot을 직접 조정한다. 이 팁은 Unity 매뉴얼이 아니라 작성 계기 영상의 제안이다. 도트 그림의 해상도와 PPU 설정은 [[Unity-2D-Pixel-Art-Rendering|Unity 2D 픽셀 아트 렌더링]]을 따른다.

## 무엇끼리 묶을까

모든 그림을 아틀라스 하나에 넣는 것이 최선은 아니다. Unity 매뉴얼은 아래 기준으로 아틀라스를 나누라고 권한다.

- **동시에 쓰는 묶음:** 장면마다 다른 아틀라스처럼 같은 때에 쓰는 스프라이트끼리 묶는다. 쓰지 않는 스프라이트를 메모리에 올리거나, 많은 스프라이트 때문에 결합 텍스처를 여러 장 만드는 일을 피한다.
- **압축 설정:** 압축 설정이 달라야 하는 스프라이트는 다른 아틀라스에 둔다.
- **사용 빈도:** 자주 쓰는 스프라이트와 드물게 쓰는 스프라이트를 나눈다.

첫 기준의 이유처럼, 아틀라스를 크게 하나로 묶으면 지금 쓰지 않는 스프라이트까지 메모리에 올라간다. 그리는 순서 중간에 다른 텍스처의 스프라이트가 끼어들 때 묶음이 끊기는지, 어떤 조건에서 실제로 묶였는지는 파이프라인과 머티리얼, 정렬 순서에 따라 달라질 수 있어 이 문서는 확정하지 않는다. 실제 장면에서 프로파일러와 Frame Debugger로 확인한다.

## 패킹 옵션: 빽빽하게 넣을수록 생기는 부작용

Sprite Atlas의 Type이 Master(기본값)일 때 아래 패킹 속성을 쓸 수 있다. 2026-11-17 Unity 6000.5 Sprite Atlas Inspector 레퍼런스와 대조했다. 이 페이지는 Padding 말고는 각 속성의 기본 켜짐 여부를 적지 않으므로, 실제 기본값은 사용하는 에디터 버전의 Inspector에서 확인한다.

| 속성 | 하는 일 | 주의 |
|---|---|---|
| Tight Packing | 기본 사각형 대신 Sprite Editor의 Custom Outline 탭에 있는 메시 모양으로 스프라이트를 배치한다. 아틀라스 생성 안내는 스프라이트 둘레의 투명 픽셀을 줄이려면 켜라고 적는다 | 둘레 여백이 큰 그림(예: AI 생성 이미지)일수록 효과가 클 것으로 보는 것은 매뉴얼로 확인하지 못한 실무 제안이다 |
| Allow Rotation | 더 잘 맞도록 스프라이트를 회전해 배치한다 | Canvas UI 요소를 묶는 아틀라스에서는 UI 요소가 회전해 보이지 않도록 끈다 |
| Padding | 스프라이트 사이에 둘 픽셀 수. 이웃 스프라이트의 픽셀이 가장자리에 묻어나는 것을 막는다 | 기본값 4. 가장자리에 다른 색 선이 보이면 늘리라는 것은 매뉴얼로 확인하지 못한 실무 제안이다 |
| Alpha Dilation | 스프라이트 가장자리 색을 인접한 투명 픽셀로 넓혀 경계선이 보이지 않게 한다 | |

- Allow Rotation의 UI 주의를 따르려면 게임 월드용 아틀라스와 UI용 아틀라스를 나누고 UI용에서는 회전을 끄는 구성을 고려할 수 있다. UI 아틀라스에서 Tight Packing도 끄라는 권고는 Unity 매뉴얼로 확인하지 못한 실무 제안이며, 확인한 Unity 매뉴얼 범위(6000.5 레퍼런스, 소개, 생성 페이지)에는 Tight Packing의 UI 주의 문장이 없다. UI Image가 tight 배치된 스프라이트를 어떻게 그리는지는 uGUI 패키지 문서나 실제 장면에서 확인한다.
- 아틀라스는 여러 텍스처를 한 텍스처로 묶는 기능이다. 여백 때문에 스프라이트의 pivot 위치나 충돌 범위가 그림과 어긋나는 문제는 아틀라스 설정이 아니라 Sprite Editor에서 스프라이트를 잘라 맞추는 쪽에서 다룬다(Unity 매뉴얼 문장으로 확인하지 못한 실무 제안).

## 해상도 변형과 늦은 로딩

- **Variant 아틀라스:** 원본 아틀라스와 같은 스프라이트를 더 낮은 해상도로 묶는다. Scale을 0.5로 두면 원본의 절반 해상도 텍스처를 만든다. 기본값으로는 원본과 변형이 모두 빌드에 들어가며, 이 경우 Unity가 실행 중 어느 쪽을 쓸지 무작위로 고른다. 저사양 기기용으로 쓰려면 빌드에 넣을 쪽을 정한다. 둘 다 Include in Build를 끄면 텍스처가 빌드에 없어 해당 스프라이트가 보이지 않는다.
- **Include in Build와 late binding:** Include in Build를 켜면 프로젝트 시작 때 아틀라스를 불러와 스프라이트에 붙인다. 끄면 실행 중에 직접 불러오며 이를 late binding이라고 한다. 아직 불러오지 않은 아틀라스를 스프라이트가 요청하면 `SpriteAtlasManager.atlasRequested` 콜백이 호출되고, 콜백에서 `Resources.Load`나 AssetBundle API로 아틀라스를 넘긴다. 다음 레벨에서 필요한 그림만 그때 메모리에 올리는 식으로 쓴다.

## 실행 중에 아틀라스를 만드는 API(Unity 6.4)

Unity 6.4(6000.4)부터 `SpriteAtlasManager.CreateSpriteAtlas`로 실행 중에 스프라이트 아틀라스를 만들 수 있다. 미리 만든 아틀라스 에셋을 늦게 불러오는 late binding과 달리, 어떤 그림을 함께 묶을지 실행 시점에 정할 수 있다. 예를 들어 상점이나 인벤토리처럼 함께 보이는 그림이 플레이어 상태에 따라 달라지는 화면을 떠올릴 수 있다(레퍼런스에 없는 작성 예시).

```csharp
public static SpriteAtlas CreateSpriteAtlas(string name, SpriteAtlasRuntimeConfig config, AtlasPage[] pages)
```

- `name`은 아틀라스 이름이자 Tag로 쓰인다.
- `pages`는 스프라이트와 이미 묶은(packed) 텍스처를 담은 페이지 배열이다. `AtlasPage`의 `assets`는 스프라이트 같은 객체와 그 packed 위치(X, Y 좌표)를 담은 `ObjectData` 배열이고, `packedTextures`는 묶인 텍스처를 가리키는 `TextureData` 배열이다. 그림을 새 텍스처에 배치하는 패킹은 이 메서드가 아니라 호출하는 쪽이 준비한 결과를 넘기는 구조로 읽힌다.
- `SpriteAtlasRuntimeConfig`의 필드는 스프라이트에 적용할 `scaleMultiplier` 하나다.

2026-11-17에 대조한 6000.5 레퍼런스에는 텍스처의 Read/Write 요구, 지원 텍스처 형식, 호출 비용에 관한 설명이 없다. 그래서 이 문서는 요구사항을 확정하지 않는다. 다만 호출하는 쪽이 그림을 새 텍스처로 옮겨 묶는 동안에는 그 작업 시간이 들고, 원본 텍스처를 내리기 전까지는 원본과 결과 텍스처가 함께 메모리를 차지할 수 있다. 평소에는 함께 쓰는 단위로 미리 아틀라스를 나눠 두고, 실행 중 생성은 묶음이 상태마다 크게 달라지는 화면에 한정해 장면 전환이나 로딩 화면처럼 프레임 끊김이 보이지 않는 때에 하는 구성을 고려한다(실무 제안). 실제 비용은 대상 기기에서 프로파일러로 잰다.

## 점검 질문

- 아틀라스를 도입하기 전후로 드로우콜 수와 프레임 시간을 같은 장면에서 비교했는가. SRP Batcher를 쓰면 드로우콜 수만으로 판단하지 않는다.
- 아틀라스가 장면이나 화면 단위처럼 함께 쓰는 그림으로 나뉘어 있는가, 쓰지 않는 그림이 같은 텍스처에 섞여 있지 않은가.
- 애니메이션 시트의 칸 크기와 pivot이 프레임마다 일정한가.
- Variant와 Include in Build 설정으로 빌드에 들어가는 텍스처를 의도대로 정했는가.

## 출처

- [Unity Manual 6000.5, Sprite atlases](https://docs.unity.com/en-us/engine/6000.5/manual/unity2d/sprite/atlas/atlas-introduction) — 텍스처별 드로우콜, 아틀라스 하나의 드로우콜, SRP Batcher 주의, 아틀라스 분리 기준
- [Unity Manual 6000.5, Create a sprite atlas](https://docs.unity.com/en-us/engine/6000.5/manual/unity2d/sprite/atlas/create-sprite-atlas) — 투명 픽셀을 줄이려면 Tight Packing을 켜라는 안내(2026-11-17 대조)
- [Unity Manual 6000.5, Variant sprite atlases](https://docs.unity.com/en-us/engine/6000.5/manual/unity2d/sprite/atlas/master-variant-sprite-atlases)
- [Unity Manual 6000.5, Sprite Atlas reference](https://docs.unity.com/en-us/engine/6000.5/manual/unity2d/sprite/atlas/sprite-atlas-reference) — Include in Build, Tight Packing, Allow Rotation의 Canvas UI 주의, Padding 기본값 4, Alpha Dilation(2026-11-17 대조)
- [Unity Manual 6000.5, Load a sprite atlas with SpriteAtlasManager.atlasRequested](https://docs.unity.com/en-us/engine/6000.5/manual/unity2d/sprite/atlas/load-sprite-atlas-spriteatlasmanageratlasrequested)
- [Unity Manual 6000.5, New in Unity 6.4](https://docs.unity.com/en-us/engine/6000.5/manual/whats-new/unity64) — 실행 중 아틀라스 생성 API 추가(2026-11-17 대조)
- [Unity Scripting API 6000.5, SpriteAtlasManager.CreateSpriteAtlas](https://docs.unity.com/en-us/engine/6000.5/script-reference/unityengine/u2d/spriteatlasmanager/createspriteatlas) — 시그니처와 인자 설명. `AtlasPage`, `SpriteAtlasRuntimeConfig` 구조체 페이지도 함께 대조(2026-11-17)
- [Unity Scripting API 6000.5, ObjectData](https://docs.unity.com/en-us/engine/6000.5/script-reference/unityengine/u2d/objectdata) — packed 객체와 위치 정보
- [Unity Scripting API 6000.5, TextureData](https://docs.unity.com/en-us/engine/6000.5/script-reference/unityengine/u2d/texturedata) — packed 텍스처 참조
- [유니티 6.4에 생긴 런타임 아틀라스, 언제 써야 할까? — Todaycoding](https://www.youtube.com/watch?v=4GgIgvV3XaM) — 2026-11-09 공개 쇼츠, 실행 중 생성 절의 계기. 실행 중 생성의 순간 부하와 메모리 우려, 장면 전환이나 로딩 시점에 한정하라는 권고는 이 영상의 제안이다. 에디터 설정 미지원, 2D Common 패키지 샘플과 그 샘플의 Read/Write 요구는 레퍼런스로 확인하지 못해 쓰지 않았다
- [Unity Manual 6000.5, Use the Sprite Editor](https://docs.unity.com/en-us/engine/6000.5/manual/unity2d/sprite/use-editor) — Sprite Mode Multiple와 Slice 방식
- [Unity Manual 6000.2, Sprite Editor](https://docs.unity3d.com/6000.2/Documentation/Manual/sprite/sprite-editor/use-editor.html) — pivot 정의
- [Unity Manual 6000.5, SRP Batcher](https://docs.unity.com/en-us/engine/6000.5/manual/analysis/graphics-performance-profiling/in-urp/reduce-draw-calls-urp/srpbatcher/srpbatcher) — 지원 파이프라인
- [2D 게임 만들 때 꼭 알아야 할 최적화, 스프라이트시트 — Todaycoding](https://www.youtube.com/watch?v=L60HEDUkt5w) — 2026-11-07 공개 쇼츠, 작성 계기. Unity 동작은 위 매뉴얼로 대조했고 AI 생성 시트의 기준선 팁만 이 영상의 제안이다
- [AI 이미지 그냥 사용하지마세요! — Todaycoding](https://www.youtube.com/watch?v=C7AdbN0Z_oM) — 2026-11-07 공개 쇼츠, 패킹 옵션 보강의 계기. 속성 설명은 위 레퍼런스로 대조했고 UI 아틀라스의 Tight Packing 끄기와 Sprite Editor 후보정 권고는 이 영상의 제안이다

## 관련 문서

- [[Unity-UI-Canvas-Batching|Unity UI 캔버스 배칭과 분할]] — uGUI의 배칭과 드로우콜
- [[Unity-2D-Pixel-Art-Rendering|Unity 2D 픽셀 아트 렌더링]] — 스프라이트 임포트 설정과 PPU
- [[Game-Loop-Frame-Timing|게임 루프의 프레임 시간]]
- [[실시간(Realtime)|실시간 통신]]
