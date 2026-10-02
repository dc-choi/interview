---
tags: [react-native, components]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 이미지 맞춤과 시각 스타일

React Native 0.87 기준이다.

resizeMode는 이미지와 frame의 관계다. cover는 비율을 유지해 frame을 채우며 일부가 잘릴 수 있고, contain은 전체를 frame 안에 넣어 여백을 남긴다. stretch는 축별로 늘려 비율이 바뀔 수 있다. repeat는 반복, center는 중앙 배치와 큰 이미지 축소다.

objectFit은 cover/contain/fill/scale-down의 별도 style 계약이다. resizeMethod는 Android 디코딩 정책이며 동일한 목적이 아니다. 네트워크/data 이미지는 frame 크기를 별도로 정한다.

## 모서리, 색과 feedback

border width/color/radius, opacity/overflow와 backfaceVisibility를 쓸 수 있다. tintColor는 투명하지 않은 pixel의 색을 바꾼다. blurRadius, iOS capInsets와 Android fadeDuration은 서로 다른 효과다. capInsets는 모서리를 보존하며 중앙을 늘리는 resizable asset에 사용한다.

Android overlayColor는 contain이나 animated GIF의 rounded corner 제약에서 남는 모서리를 단색으로 채우는 보완이다. 배경과 같은 색을 고르는 경우가 흔하지만 실제 결과를 확인한다. alt를 지정하면 이미지가 accessible로 표시되므로 장식과 정보 이미지를 구분한다.

정적인 border/fit 예제를 실제 기기에서 확인하고 로딩 placeholder와 오류 state까지 함께 본다. 큰 원본을 작은 frame에 넣는 것은 화면 크기만 줄였을 뿐 decoding 메모리까지 줄였다는 증거가 아니다.

## 출처

- [React Native, image](https://reactnative.dev/docs/image)
- [React Native, image-style-props](https://reactnative.dev/docs/image-style-props)

## 관련 문서

- [[RN-Image-Loading]]
- [[RN-Image-Assets]]
- [[RN-Dimensions]]
