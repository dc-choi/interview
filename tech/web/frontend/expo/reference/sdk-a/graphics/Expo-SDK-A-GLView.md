---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["GLView context, snapshot와 native crash 경계"]
---

# GLView context, snapshot와 native crash 경계

## context와 frame

`expo-gl`의 GLView는 Android/iOS/Web render target이다. mount 시 context를 만들고 onContextCreate(gl)를 호출한다. WebGL2와 비슷한 API 지만 모든 method가 구현된 것은 아니다. gl.drawingBufferWidth/Height로 viewport를 정하고 rendering 후 `gl.flush(); gl.endFrameEXP()`로 frame 표시를 알린다. iOS msaaSamples 기본4,0은 multisampling 비활성이다. ViewProps를 상속한다.

```tsx
<GLView style={{ width: 300, height: 300 }} onContextCreate={gl => {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.flush(); gl.endFrameEXP();
}} />
```

실기기의 synchronous native call이 필요하므로 JS를 desktop Chrome에서 실행하는 remote debugging과 호환되지 않는다. native JS engine을 사용하는 debugging과 이 오래된 remote mode를 구별한다. 일부 오래된 Android는 WebGL2 feature가 없으므로 gl instanceof WebGL2RenderingContext로 확인한다.

## headless, resource와 snapshot

`GLView.createContextAsync()`는 view 없는 context를 만든다. 화면 swap 비용은 적지만 viewport/framebuffer/texture를 직접 준비하고 snapshot을 통해 결과를 보여야 한다. destroyContextAsync(contextOrId)는 파괴 성공 boolean을 반환한다. component의 createCameraTextureAsync(cameraRefOrHandle), destroyObjectAsync(glObject)는 camera texture와 native object를 관리한다.

static takeSnapshotAsync(context,options) 또는 view ref의 takeSnapshotAsync(options)는 cache에 저장하고 `{uri,localUri,width,height}`를 반환한다. options는 framebuffer, rect{x,y,width,height}, flip(defaultfalse), compress0~1(default1), formatjpeg/png/webp(defaultjpeg)다. iOS webp는 경고와 함께 png를 만들므로 platform 별 format을 정한다. native uri/cache 파일은 영구 저장과 다르다.

texImage2D pixels는 null, pixel ArrayBuffer 또는 `{localUri:'file://...'}`를 받는다. Asset을 사용할 때 downloadAsync 완료 후 localUri를 전달한다. browser document/resource loader를 가정하는 Three/Pixi 등의 코드는 native resource loading adapter가 필요하다.

## worklet과 구현 한계

enableExperimentalWorkletSupport 기본 false를 켜고 gl.contextId를 UI worklet에 전달한 뒤 `GLView.getWorkletContext(id)`로 context를 재구성한다. 반환이 undefined 일 수 있다. worklet 함수만 실행할 수 있고 third-party Three/Pixi 전체를 그대로 실행할 수 없다. asset로 딩은 main thread에서 수행하고 참조를 전달한다. loop는 requestAnimationFrame을 쓰며 setTimeout은 지원하지 않는다.

미구현 API는 framebuffer/renderbuffer/texture/uniform/vertex attribute 조회 일부, compressed texture upload2D/3D, getBufferSubData, getInternalformatParameter, renderbufferStorageMultisample, fence/is/delete/clientWait/wait/getSyncParameter와 getActiveUniformBlockParameter 다. 잘못된 type/bounds argument를 API가 검사하지 않을 수 있어 **native crash**로 이어진다. shader compile/link 상태와 texture bounds를 앱에서 검사한다.

`__expoSetLogging` bitmask는 METHOD_CALLS1,GET_ERRORS2,RESOLVE_CONSTANTS4,TRUNCATE_STRINGS8,ALL15,DISABLED0이다. GET_ERRORS는 각 호출 뒤 blocking gl.getError를 수행하므로 performance에 큰 영향을 준다. 진단 설정을 render 성능 측정과 혼동하지 않는다.

## 출처

- [Expo Documentation, GLView](https://docs.expo.dev/versions/latest/sdk/gl-view)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
