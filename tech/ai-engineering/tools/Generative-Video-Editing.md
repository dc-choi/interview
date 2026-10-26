---
tags: [ai, video, generative-video, editing, evaluation, reframing]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["생성형 영상 편집", "Generative Video Editing", "자동 리프레이밍", "Auto Reframing"]
---

# 생성형 영상 편집과 결과 검증

생성형 영상 편집은 텍스트 지시와 참조 이미지, 기존 영상을 입력으로 장면을 생성하거나 바꾸는 방식이다. 요청한 변경과 보존해야 할 요소를 함께 명시하고, 결과 영상에서 실제로 지켜졌는지 확인한다. 프롬프트에 조건을 많이 넣었다는 사실은 품질 검증을 대신하지 않는다.

## 생성, 수정과 편집 결과물을 구분한다

| 작업 | 확인할 결과 |
|---|---|
| 장면 생성 | 피사체, 배경, 동작과 구도가 의도에 맞는가 |
| 기존 장면 수정 | 바꿀 요소가 바뀌고 유지할 요소는 보존됐는가 |
| 장면 연장 | 연결 구간의 인물, 조명과 환경이 이어지는가 |
| 최종 편집 | 길이, 컷 연결, 자막과 음성이 납품 조건을 충족하는가 |

이 표는 결과 검수에 사용할 실천 기준이다. 개별 생성 기능의 지원만으로 기존 편집기의 모든 작업을 대체한다고 판단하지 않는다.

## 제품 기능 사례: Google Vids의 Gemini Omni

2026-10-07에 확인한 공식 발표 기준이다.

- 자연어와 참조 이미지를 조합해 영상을 생성하며, 생성한 영상이나 직접 촬영한 클립의 배경, 조명과 효과를 단계적으로 수정할 수 있다.
- 2026-09-23 발표의 Omni 1.1 Flash는 장면 연장, 생성 클립 길이 지정, 1080p 생성과 기존 AI 클립의 해상도 확대를 설명한다.
- 같은 발표는 Google 또는 Google Workspace 계정의 무료 생성 접근을 안내한다. 추가 생성 용량은 요금제에 따라 구분하므로 무료를 무제한 생성이나 모든 기능의 동일한 제공으로 해석하지 않는다. 정확한 사용 한도는 이용 시점의 계정 조건을 확인한다.
- 생성 클립에는 비가시적 SynthID 워터마크를 넣는다. 이 표시는 AI 생성 여부를 확인하는 단서이지 사실성, 권리 확보나 납품 품질의 보증이 아니다.

발표의 기능 설명은 특정 입력에서 인물과 원본 구도를 완벽하게 보존한다는 성능 보장이 아니다. 아직 출시 예정으로 표기된 기능은 현재 사용 가능한 기능에 포함하지 않는다.

## 제품 기능 사례: Amazon Nova Reel의 비동기 생성

이 절은 2026-10-10 AWS 공식 문서 대조 기준이다. 위 Google Vids 기능은 앞 절에 명시한 확인 시점을 유지한다.

- Nova Reel은 텍스트 또는 텍스트와 이미지를 입력받아 영상을 생성한다. 참조 이미지는 시작 키 프레임을 안내한다. 이 입력 계약만으로 기존 동영상의 특정 부분을 수정하는 기능까지 지원한다고 해석하지 않는다.
- `amazon.nova-reel-v1:1`은 6초 단위로 최대 2분, 1280×720 해상도와 초당 24프레임의 영상을 생성한다. 6초보다 긴 생성에는 이 모델 ID가 필요하다. 길이 지원을 여러 장면의 인물이나 상품 일관성 보장으로 읽지 않는다.
- Bedrock Runtime의 `StartAsyncInvoke`로 작업을 제출하고 `GetAsyncInvoke`로 상태를 조회한다. 결과는 지정한 S3 위치에서 확인한다. 작업 식별자를 받았다는 사실은 영상 생성 완료가 아니다.

애플리케이션에서는 접수, 생성 완료와 검수 완료를 나누어 관리하는 편이 좋다. 실패 상태를 처리하고, 성공한 영상도 길이와 내용이 납품 조건에 맞는지 재생해 확인한다. 이는 공식 비동기 호출 흐름에 기반한 운영 제안이며 실제 계정에서의 실행 검증 결과는 아니다.

## 긴 영상의 하이라이트는 원문과 시간 구간을 연결한다

2026-10-10에 대조한 AWS의 2024년 공개 구현 사례 기준이다. 기존 영상에서 숏폼을 만드는 작업은 새 장면 생성과 구분한다. Transcribe로 전사한 뒤 Bedrock 모델이 주제와 관련 대본을 고르고, Lambda가 선택된 텍스트를 단어별 타임스탬프와 대조해 원본 구간을 찾는다. 이 사례는 시간 구간 계산에 Python `difflib`를 사용한다.

하이라이트 추출과 최종 제작은 두 Step Functions 워크플로로 나뉜다. 첫 결과를 사람이 검토해 제목과 자막, 구간별 화면 영역을 수정한 뒤 MediaConvert로 최종 영상을 만든다. LLM이 선택한 대본을 원본에 실제 존재하는 발화로 연결하는 단계가 필요하다.

운영에서는 텍스트 매칭 성공과 편집 의미의 보존을 따로 검수한다. 같은 문장이 반복된 위치를 잘못 고르거나 떨어진 발화를 이어 조건과 부정 표현이 빠지지 않았는지 확인한다. 화면 영역을 바꾼 뒤에는 발표자의 얼굴뿐 아니라 설명에 필요한 도표와 자막도 최종 영상에서 확인한다. 이는 구현 사례에 기반한 검수 제안이며 자동 검증 기능의 보장이 아니다.

## 가로 영상을 세로 숏폼으로 자동 리프레이밍한다

16:9 원본을 9:16으로 자를 때 중앙을 고정하면 움직이는 화자가 화면 밖으로 나가고, 프레임마다 검출 결과를 그대로 따라가면 화면이 떨린다. 자동 리프레이밍은 한 모델로 끝나지 않으므로 장면 분할, 검출, 추적, 경로 평활화와 크롭을 나누어 설계한다. 관리형 선택지로는 [[Elemental-Inference|AWS Elemental Inference]]의 Smart crop이 있다.

| 단계 | 하는 일 | 확인할 점 |
|---|---|---|
| 장면 분할 | 컷 경계를 찾아 장면별로 처리한다 | 이전 장면의 카메라 위치를 이어 받지 않는가 |
| 검출 | 프레임마다 얼굴이나 사람 박스와 점수를 얻는다 | 박스 좌표 형식과 점수 임계값 |
| 추적과 주인공 선택 | 프레임 사이의 같은 인물을 잇고 따라갈 대상을 고른다 | 여러 사람이 나올 때의 선택 규칙 |
| 경로 평활화 | 박스 중심을 부드러운 카메라 경로로 바꾼다 | 떨림과 추적 지연의 균형 |
| 크롭과 렌더링 | 경로를 중심으로 9:16 창을 잘라 인코딩한다 | 창이 원본 밖으로 나가지 않는가, 자막과 그래픽이 남는가 |

2026-10-12 공식 문서 대조 기준, MediaPipe Face Detector는 디코딩된 영상 프레임(VIDEO 모드)에서 얼굴 박스와 6개 얼굴 랜드마크를 낸다. short-range 모델은 휴대폰 전면 카메라처럼 가까운 얼굴에 맞춰져 있고 후면 카메라 이미지처럼 먼 거리까지 다루는 full-range 모델이 따로 있으므로, 화자가 멀리 선 강의 영상에서는 모델 선택부터 확인한다. 얼굴이 가려지거나 화면 밖으로 나가면 사람 전체를 찾는 객체 검출기로 보완한다. Hugging Face Transformers의 RT-DETR(`PekingU/rtdetr_r50vd`)은 `post_process_object_detection`에서 점수, 라벨과 원본 픽셀 기준의 (왼쪽 위 x, 왼쪽 위 y, 오른쪽 아래 x, 오른쪽 아래 y) 박스를 돌려주고, 기본 점수 임계값은 0.5다. COCO 형식 데이터의 박스는 (x, y, 너비, 높이)이므로 중심을 계산하기 전에 형식을 확인한다. Hub 모델 페이지의 추론 위젯은 Inference Provider가 그 모델을 서빙할 때만 보인다. 위젯 유무로 모델을 쓸 수 있는지 판단하지 않고, 상용 서비스에 넣기 전에 모델 카드의 라이선스와 용도, 한계를 확인한다.

(x1, y1, x2, y2) 박스의 중심은 `((x1 + x2) / 2, (y1 + y2) / 2)`다. 이 값을 매 프레임 크롭 중심으로 쓰면 검출의 작은 흔들림이 그대로 화면 떨림이 된다. AutoFlip 공개 설명도 원시 박스는 프레임 사이 떨림이 커서 크롭 창을 바로 정할 수 없다고 설명한다. 가장 단순한 보정은 지수 평활이다.

`새 중심 = 이전 중심 + α × (검출 중심 − 이전 중심)`, `0 < α ≤ 1`

이전 중심 500에서 600이 검출되면 α = 0.2일 때 520, 다음 프레임에도 600이면 536이 된다. α = 0.8이면 첫 프레임에 580까지 움직인다. α가 작을수록 덜 떨리지만 늦게 따라간다. α = 0.2면 남은 거리가 프레임마다 0.8배로 줄어 갑작스러운 이동의 90%를 따라잡는 데 11프레임(30fps에서 약 0.37초)이 걸리고, 그사이 빠르게 움직인 인물이 창 밖으로 나갈 수 있다. α는 프레임당 값이므로 원본 fps가 다르면 같은 α도 반응 시간이 달라진다.

이 지연은 과거 프레임만 쓰는 실시간 방식의 제약이다. 녹화된 영상은 장면 전체를 본 뒤 경로를 정할 수 있다. AutoFlip은 장면이 끝날 때까지 버퍼링한 뒤 박스와의 오차를 최소화하는 낮은 차수의 다항식 경로를 맞추고, 장면마다 고정, 일정 속도 이동과 추적 중 하나를 고른다. 예제 설정은 장면 동안 초점 대상이 정한 비율(`motion_stabilization_threshold_percent`) 안에 머물면 카메라를 고정한다. 인물이 거의 서 있는데 카메라가 계속 미세하게 따라가면 원본보다 산만해질 수 있으므로, 실시간 방식에서도 검출 중심이 현재 창 중심에서 정한 거리 안에 있으면 움직이지 않는 데드존을 둔다. 필요한 대상을 창 하나에 담을 수 없으면 AutoFlip은 단색이나 흐린 원본으로 여백을 채운다. AutoFlip은 2023-03-01에 지원이 끝난 MediaPipe 레거시 솔루션이므로 구현 의존성이 아니라 설계 참고로 쓴다.

다음은 이 구조를 적용한 검수와 비용 점검 제안이다.

1. 움직임이 있는 10~20초 구간을 시험 클립으로 정하고, 원시 박스와 평활 박스를 다른 색으로 겹친 비교 영상에서 떨림과 지연을 본다.
2. 최종 9:16 결과를 중앙 고정 크롭과 나란히 재생해 실제로 나아졌는지 판단한다. 추적 기능이 붙었다는 사실은 품질 개선의 증거가 아니다.
3. 검출은 프레임마다 실행되므로 30fps 20초 클립도 600프레임이다. 검출이 실제로 GPU에서 도는지와 클립 길이당 처리 시간을 기록한다. AutoFlip 예제 그래프는 특징 추출을 낮춘 해상도와 솎아 낸 프레임에서 하고, 장면 경계는 전체 프레임 속도에서 찾는다. 이 측정값이 [[Pricing-Strategy#AI 기능의 크레딧 가격과 작업 원가|크레딧 가격의 원가 입력]]이 된다.

## 기존 영상을 모션 그래픽으로 재구성한다

기존 영상의 판서나 도식을 다시 표현할 때는 내용 해석, 장면 구성과 영상 렌더링을 나누어 확인한다. MP4만 있다는 사실과 편집 가능한 텍스트, 도형, 타이밍을 복원했다는 사실은 다르다.

2026-10-09 공식 문서 대조 기준, HyperFrames는 에이전트가 작성한 HTML, CSS와 JavaScript 프로젝트를 재생하거나 영상으로 렌더링한다. 실시간 재생 화면을 녹화하는 대신 각 프레임의 상태를 요청하는 방식이다. 렌더링 방식만으로 원본 판서의 의미나 글자가 정확히 복원됐다고 판단하지 않는다.

다음은 이 구분을 적용한 검수 제안이다.

- 판서의 용어, 수식과 화살표 관계를 먼저 확인하고, 흐린 글씨는 추측해 확정하지 않는다.
- 새 도형과 자막의 등장 시점을 원본 설명 음성과 맞춘다. 미리보기뿐 아니라 최종 영상도 재생해 점검한다.
- 후속 수정에 쓸 프로젝트와 최종 영상 파일을 함께 관리한다. 특정 모델의 편집 품질이나 자동 복원 정확도는 별도로 평가한다.

## 3D 시안을 스토리보드로 사용한다

대본, 장면 구도와 최종 영상의 질감을 한 번에 확정하기 어려우면 3D 애니메이션을 중간 시안으로 만들고 영상 생성기의 스토리보드로 사용할 수 있다. 대본과 구도가 바뀌는 단계, 개별 숏을 생성하는 단계, 음성과 음악을 붙여 편집하는 단계를 구분한다.

2026-09-18 공개 제작 사례에는 Blender로 만든 시안을 바탕으로 영상 생성기를 조작하고 생성한 숏을 편집한 작업이 나온다. 제작자는 결과의 분위기와 농담을 판단하고 다시 요청했다. 보고된 45분은 최초 예고편의 사례 시간이며, 후속 버전까지 포함한 표준 납기나 다른 입력의 재현 성능을 입증하지 않는다. 실행 로그와 제작 비용은 이 문서에서 검증하지 않았다.

이를 적용할 때는 중간 시안에서 대본의 의미, 구도와 컷 순서를 먼저 검수하고, 최종 영상에서 그 의도가 보존됐는지 확인하는 방식을 제안한다. 사실 자료를 재현하는 장면이라면 확인한 요소와 창작한 요소를 구분한다. 원본 지식에 맞는지와 시각적으로 마음에 드는지는 별도의 판단이다.

## 캐릭터, 동작 전이와 요소 교체를 나눈다

2026-10-24 Higgsfield 공식 안내에서 AI Influencer의 캐릭터 생성, Genjutsu의 Motion Transfer와 Object Swap을 확인했다. 이번 추가 검증은 이 절의 기능 구분이며, 다른 제품은 각 절에 적힌 검증 시점을 유지한다.

- 캐릭터 생성은 이후 장면에 사용할 외형을 정하는 단계다.
- Motion Transfer는 참조 영상의 움직임을 새 캐릭터와 장면에 적용한다.
- Object Swap은 기존 클립에서 지정한 의상이나 소품 같은 요소를 교체한다.

공식 기능 설명은 개별 입력에서 얼굴, 동작이나 배경이 완벽히 보존된다는 실측 보장이 아니다. 결과의 캐릭터 정체성, 손과 몸의 형태, 움직임의 타이밍과 유지할 배경을 원본과 비교한다.

새 클립을 만들 때는 캐릭터 이미지의 의상과 외형을 먼저 검토하고 동작을 적용하는 순서를 시도할 수 있다. 이미 생성한 클립의 옷을 매번 바꾸는 것보다 후속 수정 횟수를 줄일 수 있다는 제작 가설이며, 절감률은 검증되지 않았다. 기존 클립 일부를 바꾸는 작업에는 요소 교체를 검토한다. 원본 음성의 재사용과 음성 변경은 화면 변형과 별도로 확인한다.

생성 전 화면에 표시된 크레딧과 실제 재생성 횟수, 검수 시간을 기록한다. 영상에서 언급한 특정 금액을 현재 요금이나 완성본 한 편의 원가로 사용하지 않는다. 실제 계정에서 생성 품질과 비용을 재현한 검증은 수행하지 않았다.

## 참조 편집을 새 피사체로 다시 만든다

2026-10-26 Higgsfield의 Katana 공식 블로그(2026-10-12 게시)와 연결 안내, Claude의 사용자 정의 커넥터 문서에서 확인했다. 이번 추가 검증은 이 절의 기능, 연결, 명령과 과금 설명이며, 다른 절은 각 절에 적힌 검증 시점을 유지한다.

Katana는 Higgsfield MCP 커넥터를 통해 Claude 대화에서 참조 편집을 사용자의 캐릭터, 제품이나 의상으로 다시 만든다. 참조 편집은 직접 올린 영상이나 라이브러리의 프리셋이며, 숏의 순서와 길이, 음악에 맞춘 컷 위치를 포함한 숏 구조, 속도감과 전체 편집의 기준이 된다. 최대 5장의 캐릭터, 제품이나 의상 사진은 화면에 누가, 무엇이 나올지를 정한다. Katana는 필요한 숏을 생성해 편집본을 돌려주고, 결과는 Claude 대화와 Higgsfield Assets에 나타난다. 같은 대화에서 앞 절의 Genjutsu(Motion Transfer, Object Swap)도 쓸 수 있고 두 기능은 같은 Assets를 읽고 쓴다.

- 연결: Higgsfield의 MCP 서버 URL(`https://mcp.higgsfield.ai/mcp`)을 Claude에 사용자 정의 커넥터로 추가하고 Higgsfield 계정으로 로그인해 승인한다. Katana는 Higgsfield 모델로 실행되고 higgsfield.ai와 같은 계정, 같은 크레딧을 쓰며, 활성 Higgsfield 구독이 필요하고 API 키는 필요 없다.
- Claude 커넥터: 요금제별 추가 경로, 개수 제한과 도구 승인 설정은 [[Claude-Code-Business-Automation#외부 서비스 연동 — 전부 MCP|Claude 커넥터 권한 설정]]을 따른다.
- 시작: `/katana`는 대화에 프리셋 목록을 열고 `/katana/<preset-name>`은 특정 프리셋을 실행한다. Higgsfield는 이 제품의 편집본을 만들어 달라는 식의 일반 요청도 명령 없이 Katana를 시작한다고 안내한다. higgsfield.ai의 Katana 페이지에서 작성한 요청은 Send & Generate in Claude로 Claude 대화에 넘길 수 있다.
- 비용: 기존 Higgsfield 요금제의 크레딧을 쓰며 크레딧은 생성에 차감된다. Higgsfield는 MCP 별도 청구와 Claude 안에서 Katana를 실행하는 데 붙는 추가 요금이 없고, 생성마다 Claude가 확인 전에 정확한 크레딧 비용을 카드로 보여 준다고 안내한다. 새 생성이 필요한 수정, 추가 생성과 대안은 비용을 늘릴 수 있고, 요금제 등급과 크레딧 제공량은 지역마다 다르다.
- 제한: 일부 생성은 모더레이션으로 거절될 수 있다. Instagram이나 TikTok 프로필 링크는 받지 않으므로 참조는 파일로 올리거나 미디어 파일의 직접 링크로 준다. Higgsfield 안내 기준으로 Claude 대화에 바로 첨부한 이미지는 Higgsfield MCP에 Katana 참조 파일로 전달되지 않아, Katana가 대화 안에 Higgsfield 업로드 창을 열고 거기서 고른 파일이 Higgsfield 계정에 올라간다. 같은 글이 명령과 함께 첨부한 파일을 입력으로 쓴다고도 설명하므로 실제 첨부 경로는 계정에서 확인한다.

다음은 이 구조를 적용한 검수 제안이다. 참조와 결과를 나란히 재생해 음악에 맞춘 컷 위치와 컷 전환을 비교하고, 제품이 나오는 숏은 형태, 로고와 문구가 실제 제품과 맞는지 확인한다. 생성 전에 표시된 크레딧, 재생성 횟수와 검수 시간은 앞 절처럼 기록하고, Claude 쪽 사용 한도는 Higgsfield 크레딧과 따로 확인한다. Higgsfield는 그 안의 음악, 영상, 캐릭터, 로고와 그 밖의 보호 대상까지 포함해 소유하거나 사용 허락을 받은 참조 편집을 쓰라고 안내한다. 라이브러리의 커뮤니티 프리셋도 사용자가 Katana 페이지에서 게시해 바로 공개되고 신고 뒤 내려갈 수 있으므로 같은 권리 확인 대상이다. 남의 영상을 참조로 쓸 때는 권리를 먼저 확인하고, 표현을 옮기는 범위는 [[Competitive-Analysis#아이디어 참고와 표현 복제의 경계|아이디어 참고와 표현 복제의 경계]]로 판단한다. 커넥터가 요청하는 권한과 도구별 승인은 [[AI-Marketing-Connectors|AI 마케팅 커넥터의 권한과 데이터 경계]]의 기준으로 검토한다. 실제 계정에서 생성 품질과 비용을 재현한 검증은 수행하지 않았다.

## 변경 범위와 검수 기준을 함께 쓴다

다음은 제품 기능에 기반한 작업 제안이다.

1. 배경 교체처럼 한 번에 확인할 변경 하나를 정한다.
2. 얼굴, 의상, 로고, 자막, 카메라 동선 등 보존 대상과 출력 길이를 적는다.
3. 결과를 원본과 나란히 확인하고, 앞뒤 프레임에서 형태 변화, 경계와 깜빡임을 점검한다.
4. 만족한 버전을 남긴 뒤 다음 변경을 적용한다. 여러 수정의 효과를 한꺼번에 판단하지 않는다.

제품 사진이나 설명 영상을 만들 때는 그럴듯한 장면과 실제 제품의 기능을 구분한다. 생성된 시연을 실제 촬영 증거처럼 사용하지 않는다.

## 출처

- [Introducing the New AI Influencer: How It Works and What You Can Create — Higgsfield](https://higgsfield.ai/blog/new-ai-influencer) — 2026-10-24 캐릭터 생성과 Motion 탭의 작업 구분, 생성 전 크레딧 표시 확인.
- [Meet Higgsfield Genjutsu: How It Works and What You Get — Higgsfield](https://higgsfield.ai/blog/higgsfield-genjutsu) — 2026-10-24 동작 전이와 요소 교체의 구분 확인.
- [AI 쇼츠, 날로 먹는 줄 알았습니다… 직접 해보니(AI캐릭터 편) — YouTube, ZeroCho TV](https://www.youtube.com/watch?v=7Az6J0MAI_M) — 2026-10-18 유료광고 포함 사용기. 05:08~07:20 제작 순서와 재생성 부담은 경험에 기반한 가설로만 반영했고 요금, 품질과 절감 효과는 일반화하지 않았다.
- [Higgsfield Meets Katana: What It Is and How it Works — Higgsfield](https://higgsfield.ai/blog/higgsfield-katana) — 2026-10-12 게시, 2026-10-26 참조 편집과 사진의 역할, 커넥터 연결과 구독 조건, 명령, 생성 단위 크레딧 차감과 지역별 요금, 모더레이션, 링크와 첨부 이미지 제한, 참조 권리 안내 확인.
- [Katana video remix skill — Higgsfield](https://higgsfield.ai/mcp/katana?tab=claude) — 2026-10-26 커넥터 URL 복사, Claude 커넥터 설정에서 추가 후 로그인, `/katana`로 시작하는 요청 확인.
- [Claude Docs, Add a connector that isn't in the directory](https://claude.com/docs/connectors/custom/add-unlisted) — 2026-10-26 서버 URL로 사용자 정의 커넥터를 추가하는 방식 확인.
- [클로드 하나로 영상 생성부터 편집까지 끝내는 법 — YouTube, 피프](https://www.youtube.com/watch?v=AS-yjTcYDGk) — 2026-10-20 추천 링크가 포함된 홍보성 시연. 작성 계기로만 썼고 공식 문서로 확인한 사실만 반영했으며, 결과물 평가와 모델 추천은 반영하지 않았다.

- [The Overhang — One Useful Thing, Ethan Mollick](https://www.oneusefulthing.org/p/the-overhang) — 2026-09-18 공개 제작 경험, Blender 시안과 후속 영상 생성 및 사람의 수정 판단. 제작 시간은 작성자의 보고이며 일반 성능 지표가 아니다.
- [Amazon Bedrock을 활용한 AWS Korea YouTube 채널의 숏폼 자동화 사례 — AWS](https://aws.amazon.com/ko/blogs/tech/amazon-bedrock-shortform-content-automation/) — 원문 시간 구간 매칭과 검수 전후 워크플로 분리.
- [AWS, Generating videos with Amazon Nova Reel](https://docs.aws.amazon.com/nova/latest/userguide/video-generation.html) — 입력 형식과 Reel 1.1의 출력 범위.
- [AWS, Generate a video](https://docs.aws.amazon.com/nova/latest/userguide/code-examples-video.html) — 비동기 작업 제출, 상태 조회와 S3 결과 확인.
- [HyperFrames, What is HyperFrames?](https://hyperframes.heygen.com/introduction) — HTML 프로젝트와 프레임별 렌더링의 역할.
- [Google Vids gets powerful upgrades with Gemini Omni — Google](https://blog.google/products-and-platforms/products/workspace/gemini-omni-personal-avatars/) — 자연어, 참조 이미지와 기존 클립의 단계적 편집.
- [Anyone can make stunning HD videos with Gemini Omni in Google Vids — Google](https://blog.google/products-and-platforms/products/workspace/gemini-omni-in-google-vids/) — 2026-09-23 발표의 생성 기능, 접근 조건과 SynthID.
- [Google AI Edge, Face detection guide](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector) — VIDEO 모드, 얼굴 박스와 랜드마크, short-range와 full-range 모델의 대상.
- [Hugging Face Transformers, RT-DETR](https://huggingface.co/docs/transformers/model_doc/rt_detr) — 후처리 박스 형식과 기본 점수 임계값.
- [Hugging Face Transformers, Object detection](https://huggingface.co/docs/transformers/tasks/object_detection) — COCO와 Pascal VOC 박스 형식.
- [Hugging Face Hub, Widgets](https://huggingface.co/docs/hub/models-widgets), [Model Cards](https://huggingface.co/docs/hub/model-cards) — 위젯 표시 조건과 라이선스 메타데이터.
- [AutoFlip: An Open Source Framework for Intelligent Video Reframing — Google Research](https://research.google/blog/autoflip-an-open-source-framework-for-intelligent-video-reframing/) — 2020-02-13, 원시 박스의 떨림, 장면별 카메라 방식, 다항식 경로와 여백 처리.
- [MediaPipe, AutoFlip](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/autoflip.md) — 예제 그래프의 고정 판단 비율과 프레임 솎아내기, 2023-03-01 지원 종료.
- [NIST/SEMATECH e-Handbook, 6.4.3.1 Single Exponential Smoothing](https://www.itl.nist.gov/div898/handbook/pmc/section4/pmc431.htm) — 평활 상수 α의 범위와 반응 속도.
- [YouTube, 양실장의 바이브코딩대학, 1시간 압축) AI 기술 1도 모르는 초심자가 전문 AI SaaS 구축하는 모든 과정](https://www.youtube.com/watch?v=JK1S6FvAdZQ) — 2026-08-24, 25:58~42:39의 얼굴과 사람 검출, 바운딩 박스와 평활화 시연. 화면의 검출 결과와 코드는 확인하지 않았다.

## 관련 문서

- [[Claude-Design-Handoff|AI 디자인 시스템과 구현 인계]] — 웹 애니메이션과 프레임 기반 영상 렌더링의 경계
- [[Browser-CSS-Animation-and-Compatibility|브라우저 CSS 애니메이션과 호환성]] — 시간, 경로와 접근성 조건
- [[Elemental-Inference|AWS Elemental Inference]] — 관리형 Smart crop과 대표 영상 검수 기준
- [[Pricing-Strategy#AI 기능의 크레딧 가격과 작업 원가|AI 크레딧 가격과 작업 원가]] — GPU 처리 시간을 가격 하한으로 연결
- [[AI-Marketing-Connectors|AI 마케팅 커넥터의 권한과 데이터 경계]] — 커넥터의 계정, 서버와 호스트 권한 검토
