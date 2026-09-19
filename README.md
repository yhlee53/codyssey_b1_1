# 포트폴리오 웹사이트

순수 HTML, CSS, JavaScript로 구현한 반응형 포트폴리오입니다.

## 배포 URL

> GitHub Pages 배포 후 이 부분을 수정하세요.  
> `https://yhlee53.github.io/b2-1`

## 스크린샷

| 데스크톱 | 모바일 | 다크 모드 |
|:---:|:---:|:---:|
| *(스크린샷 추가)* | *(스크린샷 추가)* | *(스크린샷 추가)* |

---

## 사용 기술

- **HTML5** — 시맨틱 마크업 (`header`, `nav`, `main`, `section`, `article`, `footer`)
- **CSS3** — Flexbox, CSS Grid, CSS Variables, 미디어 쿼리 (모바일 퍼스트)
- **JavaScript (ES6+)** — DOM 조작, 이벤트 처리, Fetch API, async/await, Intersection Observer
- **Google Fonts** — Inter
- **Font Awesome 6** — 아이콘

외부 UI 라이브러리(React, Vue, Bootstrap, Tailwind 등) 사용 안 함.

---

## 기능 목록

### 인터랙티브 UI
- **다크 모드** 토글 — 설정이 `localStorage`에 저장되어 새로고침 후에도 유지
- **시스템 다크 모드** 자동 감지 (`prefers-color-scheme`)
- **햄버거 메뉴** — 모바일 환경에서 네비게이션 토글
- **부드러운 스크롤** — 앵커 링크 클릭 시 `scrollIntoView({ behavior: 'smooth' })`
- **타이핑 효과** — Hero 섹션에서 단어를 타자기 효과로 순환 표시
- **스크롤 애니메이션** — `Intersection Observer`로 섹션 진입 시 fade-in

### 네비게이션
- **헤더 배경 변경** — 스크롤 **60px** 이상에서 배경색 적용 (투명 → 불투명)
- **스크롤 상단 버튼** — 스크롤 **300px** 이상에서 버튼 표시
- **활성 섹션 표시** — 현재 보이는 섹션에 해당하는 메뉴 항목 하이라이트

### GitHub API 연동
- `https://api.github.com/users/{username}/repos` 엔드포인트 사용
- fork 저장소 제외, 스타 수 기준 내림차순 정렬
- **언어별 필터링** 버튼 동적 생성 및 적용
- 상태 UI:
  - **로딩 중** — 스피너 애니메이션
  - **성공** — 카드 그리드 렌더링
  - **에러** — 에러 메시지 + 재시도 버튼 (403 Rate Limit 포함)
  - **빈 상태** — 안내 메시지

### 폼 유효성 검사
- 실시간 입력 검증 (`input` + `blur` 이벤트)
- 이름: 2자 이상
- 이메일: 정규식 형식 검증
- 메시지: 10자 이상
- 에러 메시지를 해당 입력 필드 바로 아래 표시
- 제출 시 성공 메시지 표시 및 폼 초기화

### 반응형 디자인
- **모바일 퍼스트** 작성 방식
- 브레이크포인트: `768px` (태블릿), `1024px` (데스크톱)
- Projects 카드: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`

### 레이아웃 선택 (Flex vs Grid)

#### Flex를 사용한 네비게이션
- `display: flex`로 로고·메뉴·액션 버튼을 수평으로 정렬
- **이유**: 네비게이션은 **단일 행(1D 축)**에서 항목 간 공간을 균등하게 분배해야 하므로 Flexbox가 효율적

#### Grid를 사용한 프로젝트 카드 레이아웃
- `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`로 반응형 그리드 구현
- **이유**: 프로젝트 목록은 **행·열이 동시에 변하는 2D 레이아웃**이며, `auto-fit`과 `minmax`를 통해 뷰포트 너비에 따라 자동으로 열 수를 조정하므로 CSS Grid가 최적

---

## 상태 관리 흐름 (이벤트 → 상태 → 렌더링)

| # | 이벤트 | 상태 변경 | 화면 업데이트 |
|---|---|---|---|
| 1 | 테마 버튼 클릭 | `state.theme` | `html[data-theme]` 변경, localStorage 저장 |
| 2 | GitHub API 호출 | `state.projects.status` | 로딩 / 성공 / 에러 / 빈 상태 UI |
| 3 | 폼 입력 | `state.form.{field}` | 에러 메시지 표시/숨김, 입력 필드 클래스 |
| 4 | 필터 버튼 클릭 | `state.projects.activeFilter` | 프로젝트 카드 목록 재렌더링 |

---

## 설정값 (js/main.js `CONFIG`)

| 항목 | 기본값 | 설명 |
|---|---|---|
| `SCROLL_NAV_THRESHOLD` | 60px | 헤더 배경 변경 기준 |
| `SCROLL_TOP_THRESHOLD` | 300px | 스크롤 상단 버튼 표시 기준 |
| `INTERSECTION_THRESHOLD` | 0.2 | 스크롤 애니메이션 임계값 |
| `MAX_PROJECTS` | 12 | GitHub 저장소 최대 표시 수 |

---

## 시작 방법

```bash
# 1. 저장소 클론
git clone https://github.com/yhlee53/b2-1.git
cd b2-1

# 2. js/main.js 상단 CONFIG에서 GITHUB_USERNAME 변경
# GITHUB_USERNAME: 'yhlee53'  →  본인 아이디

# 3. index.html의 YOUR NAME, yhlee53, 이메일 변경

# 4. VS Code Live Server로 실행 (또는 아무 정적 서버)
```

## 보너스 과제 구현 내역

- 프로젝트 필터링: 언어별 필터 버튼을 동적으로 생성하여 `array.filter()`로 프로젝트 목록을 필터링합니다.
- 타이핑 효과: Hero 섹션에 `TYPING_WORDS` 배열을 사용한 타자기 효과를 구현했습니다. 설정은 `js/main.js`의 `CONFIG`에서 조정하세요.
- 폼 실제 전송: EmailJS 연동을 지원합니다. EmailJS를 사용하려면 `js/main.js` 상단 `CONFIG`에 `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` 값을 입력하세요. 값이 비어 있으면 기존의 시뮬레이션 전송 동작이 유지됩니다.
  - EmailJS 설정 예:
    - `EMAILJS_SERVICE_ID`: service_xxx
    - `EMAILJS_TEMPLATE_ID`: template_xxx
    - `EMAILJS_PUBLIC_KEY`: user_xxx
  - EmailJS 사용 시 `index.html`에 SDK가 이미 포함되어 있으며, 실제 전송 과정에서 `emailjs.send()`를 호출합니다.
- 시스템 다크 모드 감지: `prefers-color-scheme` 미디어 쿼리로 초기 테마를 결정하고, 시스템 설정 변경을 실시간으로 감지하여 자동 적용합니다 (단, 사용자가 직접 토글하여 저장한 경우 로컬 설정 우선).

원하시면 EmailJS에 필요한 키를 제가 설정 파일로 넣어드리거나, Formspree 적용으로 대체해 드리겠습니다.

## GitHub Pages 배포

```bash
git init
git add .
git commit -m "init: portfolio"
git branch -M main
git remote add origin https://github.com/yhlee53/b2-1.git
git push -u origin main
# GitHub 저장소 Settings → Pages → Branch: main / root → Save
```

---

## 디렉토리 구조

```
b2-1/
├── index.html       # 메인 페이지 (시맨틱 HTML5)
├── css/
│   └── style.css    # 전체 스타일 (CSS Variables, 모바일 퍼스트)
├── js/
│   └── main.js      # 인터랙션, API, 폼 로직
├── images/
│   └── profile.jpg  # 프로필 이미지 (없으면 폴백 UI 표시)
└── README.md
```
