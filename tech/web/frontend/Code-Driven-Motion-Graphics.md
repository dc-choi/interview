---
tags: [web, frontend, animation, video, rendering]
status: done
verified_at: 2026-11-16
category: "웹&네트워크(Web&Network)"
aliases: ["Code-Driven Motion Graphics", "코드 기반 모션 그래픽"]
---

# 코드 기반 모션 그래픽과 영상 출력

코드로 움직이는 화면을 만드는 일은 장면 구성, 시간 제어와 파일 출력으로 나눌 수 있다. 웹에서 재생되는 애니메이션과 배포할 영상 파일은 산출물이 다르므로, 최종 결과부터 정하고 필요한 도구를 고른다.

## 화면 렌더러와 파일 처리 도구를 구분한다

2026-11-04 각 프로젝트의 공식 README와 Remotion 문서에서 확인한 역할이다. 아래 도구를 모두 설치해야 한다는 뜻은 아니다.

| 도구 | 확인한 역할 | 구분할 경계 |
|---|---|---|
| Lottie Web | After Effects에서 내보낸 애니메이션 데이터를 웹에서 SVG, Canvas 또는 HTML 렌더러로 재생 | 애니메이션 데이터와 화면 재생을 영상 파일 출력과 구분한다 |
| Three.js | 장면, 카메라와 렌더러로 3D 화면을 구성 | 3D 장면을 그리는 기능과 최종 미디어 파일 인코딩을 구분한다 |
| Remotion | React 컴포넌트와 영상 메타데이터를 composition으로 묶고 영상으로 렌더링 | 현재 프레임으로 결정되는 장면과 실시간 경과에 의존하는 애니메이션을 구분한다 |
| Mediabunny | TypeScript로 영상과 음성 파일을 읽고 쓰고 변환 | 컨테이너와 코덱 처리 기능이 장면 기획이나 디자인을 대신하지 않는다 |

이 구분은 조합을 설계할 때의 역할 분해다. 모든 도구 사이의 직접 연동이나 특정 브라우저에서의 출력 성공을 검증한 결과는 아니다. AI가 코드를 작성하도록 도울 수 있어도, 이 도구들의 기본 렌더링 기능을 생성형 모델의 추론 기능으로 분류하지 않는다.

브라우저 대신 자체 GPU 엔진으로 같은 형태의 장면을 그리는 도구도 있다. 2026-11-16 README(v0.1.1) 기준 raea는 현재 프레임을 그리는 React와 TypeScript 컴포지션을 GPU에서 합성하고, 하드웨어 인코더가 있는 기기에서는 그것으로 인코딩한다. README 예제는 `useCurrentFrame`, `Composition`, `interpolate`처럼 Remotion과 같은 이름의 API를 쓴다. 같은 파일을 영상으로 렌더링하거나(`raea render`), 입력, 물리와 소리를 붙인 게임으로 실시간 실행하거나(`raea play`), 독립 프로그램으로 내보낸다(`raea export-game`). 3D 장면은 Bevy 0.20이 그린다. GeekNews 소개는 Remotion이 Chromium에서, HyperFrames가 headless Chrome에서 프레임을 그리는 방식과 대비한다. 렌더러가 다르면 같은 React 코드라도 지원하는 CSS와 브라우저 API의 범위가 다를 수 있으므로, 옮길 때는 대표 장면의 출력으로 확인한다(이 문서의 해석). README는 첫 정식 릴리스이며 Windows 빌드가 가장 덜 검증됐다고 밝힌다.

## 기획, 자산과 움직임에 필요한 도구를 고른다

같은 날짜에 공식 README에서 용도를 대조한 보조 도구다. 앞의 네 도구와 합쳐 20개 저장소를 작업 단계로 구분한 것이며, 단계마다 하나씩 반드시 써야 하는 표준 구성은 아니다.

| 단계 | 도구 | 확인한 용도 |
|---|---|---|
| 화면 설계 | Penpot | 디지털 제품 디자인과 프로토타입 |
| 구상과 스케치 | Excalidraw | 손그림 스타일의 화이트보드, 다이어그램과 와이어프레임 |
| 글꼴 준비 | Fontsource | 자체 호스팅할 글꼴을 개별 npm 패키지로 제공 |
| 아이콘 준비 | Lucide | SVG 아이콘과 프레임워크별 패키지 |
| 벡터 정리 | SVGO | SVG 파일 최적화를 위한 Node.js 라이브러리와 CLI |
| 이미지 정리 | sharp | 이미지 크기 조정, 변환과 합성 |
| 상호작용 애니메이션 | Rive Web (`rive-wasm`) | Rive 파일의 애니메이션과 상태 머신을 실행하는 웹 런타임 |
| 움직임 제어 | Motion | JavaScript, React와 Vue의 애니메이션 |
| 움직임 제어 | GSAP | CSS, SVG와 JavaScript 객체 등의 속성 애니메이션 |
| 움직임 제어 | Anime.js | CSS 속성, SVG, DOM 속성과 JavaScript 객체의 애니메이션 |
| 모션 설계 | Theatre.js | 코드와 시각적 방식으로 애니메이션 구성 |
| React의 3D 장면 | React Three Fiber | Three.js를 위한 React 렌더러 |
| 3D 장면 보조 | Drei | React Three Fiber용 헬퍼와 추상화 모음 |
| 3D 후처리 | `postprocessing` | Three.js 렌더링에 pass와 effect를 연결하는 후처리 라이브러리 |
| 에이전트 작업 안내 | Remotion Agent Skills | Remotion 프로젝트 작업에 관한 에이전트 지침 모음 |
| 미디어 처리 | FFmpeg | 영상, 음성, 자막과 메타데이터 처리 라이브러리 및 도구 |

Rive Web 런타임과 Rive 저작 도구는 역할이 다르다. Remotion Agent Skills도 영상 렌더러 자체가 아니다. 여러 애니메이션 엔진의 기능이 겹치면 필요한 표현과 기존 프로젝트의 의존성을 기준으로 고른다. 이 표는 역할 확인이며 설치 호환성, 성능 비교와 각 라이선스의 전수 검토는 아니다.

## 프레임 번호로 장면을 정의한다

Remotion의 기본 모델은 현재 프레임 번호에 따라 React 화면을 그리는 것이다. 영상에는 `width`, `height`, `durationInFrames`, `fps`를 정하고, 첫 프레임은 0, 마지막 프레임은 `durationInFrames - 1`이다. 영상 길이는 `durationInFrames / fps`초로 계산한다.

예를 들어 30fps에서 150프레임은 5초이며 프레임 번호는 0부터 149까지다. 5초라는 길이와 마지막 프레임의 시작 시각을 혼동하지 않는다. 이는 문서의 시간 모델을 적용한 산술 예시다.

애니메이션 속성은 `useCurrentFrame()`으로 얻은 프레임에 연결한다. Remotion 공식 문서는 CSS transition처럼 이 값에 기반하지 않는 애니메이션이 렌더링 중 깜빡임을 일으킬 수 있다고 경고한다. 브라우저 미리보기에서 부드럽게 보였다는 사실만으로 출력 파일도 같다고 판단하지 않는다.

## 최소 구성과 검수 순서

다음은 위 역할 구분을 적용한 제작 제안이다.

1. 결과가 웹의 상호작용 화면인지, 고정 길이의 영상 파일인지 정한다.
2. 글꼴, 이미지와 벡터 자산을 준비하고 출력 크기와 길이를 정한다. 3D가 필요할 때만 장면 구성 도구를 추가한다.
3. 짧은 대표 장면으로 시작 프레임, 전환 구간과 마지막 프레임을 확인한다. 시간 기반 효과를 영상 출력에 옮길 때는 프레임별 상태를 재현할 수 있는지 확인한다.
4. 실제 파일을 출력해 글꼴, 자막 잘림, 프레임 순서와 음성 싱크를 재생 검수한다. 미리보기와 파일 출력의 성공 여부를 따로 남긴다.
5. 코드, 글꼴, 이미지와 모델을 함께 쓴다면 각 이용 조건을 따로 확인한다. 공개 저장소라는 사실만으로 같은 상업 이용 조건을 가정하지 않는다.

에이전트가 만든 영상은 사람이 재생하기 전에 자동 검사를 먼저 거칠 수 있다. raea README는 특정 프레임 하나를 PNG로 뽑아 에이전트가 보고 고치게 하고(`raea render 파일 -o frame.png --frame 45`), `raea check`로 잘린 글자, 낮은 대비, 안전 영역 밖 요소, 멈춘 화면과 음량 문제를 잡는다고 설명한다. 설치 스크립트는 에이전트 스킬을 `~/.claude/skills`에 더하므로 [[Agent-Skills|에이전트 스킬]]의 외부 스킬 설치 기준을 함께 적용한다. 자동 검사는 4번 재생 검수의 앞단일 뿐이며, 검사 항목에 없는 글꼴 대체, 프레임 순서와 음성 싱크는 실제 파일로 확인한다(이 문서의 제안).

Remotion README는 일부 사용에 회사 라이선스가 필요하다고 안내한다. raea README는 FSL-1.1-ALv2에 따라 raea와 경쟁하는 제품 외의 사용, 수정과 재배포를 허용하고 각 버전이 출시 2년 뒤 Apache-2.0이 된다고 밝힌다. 여기서는 요금과 적용 대상의 세부 조건을 판정하지 않는다. 이용 전에 공식 라이선스를 대조하며, 기존 소재 검수 항목은 [[Talking-Head-Video-Auto-Editing|녹화 영상 자동 편집]]과 [[Open-Source-License-Review|오픈소스 라이선스 검토]]에서 확인한다.

## 출처

- [Penpot — Penpot](https://github.com/penpot/penpot) — 디자인과 프로토타입
- [Excalidraw — Excalidraw](https://github.com/excalidraw/excalidraw) — 화이트보드, 다이어그램과 와이어프레임
- [Fontsource — Fontsource](https://github.com/fontsource/fontsource) — 자체 호스팅 글꼴 패키지
- [Lucide — Lucide](https://github.com/lucide-icons/lucide) — SVG 아이콘과 패키지
- [SVGO — SVGO](https://github.com/svg/svgo) — SVG 최적화
- [sharp — sharp](https://github.com/lovell/sharp) — 이미지 변환, 크기 조정과 합성
- [Rive Web — Rive](https://github.com/rive-app/rive-wasm) — 애니메이션과 상태 머신의 웹 런타임
- [Motion — Motion](https://github.com/motiondivision/motion) — 웹 애니메이션 라이브러리
- [GSAP — GSAP](https://github.com/greensock/GSAP) — JavaScript 속성 애니메이션
- [Anime.js — Anime.js](https://github.com/juliangarnier/anime) — CSS, SVG, DOM과 객체 애니메이션
- [Theatre.js — Theatre.js](https://github.com/theatre-js/theatre) — 코드와 시각적 모션 설계
- [React Three Fiber — Poimandres](https://github.com/pmndrs/react-three-fiber) — Three.js용 React 렌더러
- [Drei — Poimandres](https://github.com/pmndrs/drei) — React Three Fiber 헬퍼
- [Post Processing — Poimandres](https://github.com/pmndrs/postprocessing) — Three.js 후처리
- [Remotion Agent Skills — Remotion](https://github.com/remotion-dev/skills) — 에이전트 지침과 렌더러의 역할 구분
- [FFmpeg — FFmpeg](https://github.com/FFmpeg/FFmpeg) — 미디어 처리 라이브러리와 CLI
- [lottie-web — Airbnb](https://github.com/airbnb/lottie-web) — 애니메이션 데이터, 웹 렌더러와 재생 제어
- [Three.js — three.js contributors](https://github.com/mrdoob/three.js) — 장면, 카메라와 렌더러의 역할
- [Remotion — Remotion](https://github.com/remotion-dev/remotion) — React 기반 영상 제작과 회사 라이선스 주의사항
- [Mediabunny — Vanilagy](https://github.com/Vanilagy/mediabunny) — 미디어 읽기, 쓰기와 변환 기능
- [Remotion, The core idea](https://www.remotion.dev/docs/idea) — 프레임 번호, 영상 속성과 composition
- [Remotion, Animating properties](https://www.remotion.dev/docs/animating-properties) — 프레임 기반 애니메이션과 CSS transition 주의사항
- [raea — shinyobjectz](https://github.com/shinyobjectz/raea) — 2026-11-16 README(v0.1.1)의 GPU 합성, 영상과 게임 출력, 프레임 추출과 `raea check` 검사 항목, 스킬 설치 위치와 FSL-1.1-ALv2 조건 대조. 설치와 실행은 하지 않음
- [raea - AI가 코드로 만든 영상/3D/게임을 GPU에서 렌더링하는 엔진 — GeekNews](https://news.hada.io/topic?id=36917) — 학습 계기, Remotion과 HyperFrames의 렌더링 방식 비교

## 관련 문서

- [[프론트엔드(Frontend)|프론트엔드]]
- [[Talking-Head-Video-Auto-Editing|녹화 영상 자동 편집과 자막]]
- [[Generative-Video-Editing|생성형 영상 편집과 결과 검증]]
- [[Generative-Video-Production-Workflow|생성형 영상 제작 워크플로]]
- [[Agent-Skills|에이전트 스킬]]
- [[Open-Source-License-Review|오픈소스 라이선스 검토]]
