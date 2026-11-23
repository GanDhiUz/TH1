# 휴대폰 전용 레이아웃 (index-mobile.html)

`index-mobile.html`은 `index.html`에 아래 두 블록만 **추가**한 파일입니다. 학습 내용·순서·기능은 그대로입니다.

- `mobile.css`: `</head>` 바로 앞에 들어가는 스타일. 전부 `@media (max-width: 480px)` 안에 있어 PC·태블릿에는 적용되지 않습니다.
- `mobile.js`: `</body>` 바로 앞에 들어가는 스크립트. 폭 480px 이하일 때만
  1. 16px보다 작은 글씨를 16px로 키우고,
  2. "한 장 핵심 정리" SVG 포스터를 같은 글·같은 순서의 세로 카드로 다시 그립니다. (PNG 저장은 원래 포스터 그대로)

## 다시 만들기

`index.html`이 바뀌었다면 아래 명령으로 `index-mobile.html`을 다시 만듭니다.

```
python3 mobile-src/build.py
```

## 원본에 반영할 때

`index-mobile.html`을 `index.html`로 바꾸면 됩니다. (두 블록만 추가된 것이므로 PC 화면은 달라지지 않습니다.)
