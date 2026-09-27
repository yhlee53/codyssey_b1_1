/* ============================================================
   CONFIG  ← 여기서 본인 정보를 수정하세요
   이 섹션은 포트폴리오 전반에 필요한 기본 설정값을 모아둔 곳입니다.
   - GitHub 사용자 이름
   - 프로젝트 수 제한
   - 스크롤 기준값
   - 타이핑 효과 속도
   - EmailJS 메일 발송 설정
   실제 이메일을 받으려면 TO_EMAIL, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY 값을 맞춰야 합니다.
   ============================================================ */
const CONFIG = Object.freeze({
  GITHUB_USERNAME:         'yhlee53', // GitHub 아이디
  MAX_PROJECTS:            30,                     // 표시할 최대 저장소 수
  SCROLL_NAV_THRESHOLD:    60,   // px: 헤더 배경 변경 기준 (README 명시)
  SCROLL_TOP_THRESHOLD:    300,  // px: 스크롤 상단 버튼 표시 기준 (README 명시)
  INTERSECTION_THRESHOLD:  0.2,  // 스크롤 애니메이션 임계값 (README 명시)
  TYPING_WORDS:    ['개발자', '문제해결사', '꾸준한 학습자', 'Frontend Dev'],
  TYPING_SPEED:    150,   // ms: 타이핑 속도
  ERASING_SPEED:   75,    // ms: 지우기 속도
  PAUSE_TIME:      1800,  // ms: 단어 유지 시간
  /* EmailJS 설정: 실제 전송을 사용하려면 EmailJS 계정에서 발급받은 값을 넣으세요. 빈 값이면 시뮬레이션 모드로 동작합니다. */
  TO_EMAIL:               'yhlee53@daum.net', // 실제 수신 메일 주소
  EMAILJS_SERVICE_ID:      'service_145b45i', // ex: 'service_xxx'
  EMAILJS_TEMPLATE_ID:     'template_xan7lwh', // ex: 'template_xxx'
  EMAILJS_PUBLIC_KEY:      'uHsrQljjYOY2ENJyL', // ex: 'user_xxx' 또는 public key
});

/* ============================================================
   STATE  — "이벤트 → 상태 변경 → 화면 업데이트" 흐름의 단일 진실 출처
   이 객체는 페이지가 현재 어떤 상태인지 저장하는 중앙 저장소입니다.
   예를 들어 테마, 메뉴 열림 여부, 스크롤 위치, 프로젝트 목록 상태, 폼 입력 상태 등을 모두 여기서 관리합니다.
   이렇게 상태를 한 곳에서 관리하면 코드 흐름을 추적하기 쉽고, UI를 일관되게 업데이트할 수 있습니다.
   ============================================================ */
const state = {
  /* 테마: 로컬스토리지 > 시스템 설정 > 기본값(light) 순으로 초기화 */
  theme: (() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  })(),

  menu: {
    isOpen: false,
  },

  scroll: {
    isScrolled:    false,
    showScrollTop: false,
  },

  projects: {
    status:       'idle',  // 'idle' | 'loading' | 'success' | 'error' | 'empty'
    data:         [],      // GitHub API 원본 데이터 (배열)
    filtered:     [],      // 필터 적용 후 데이터
    activeFilter: 'all',
    languages:    [],      // 중복 없는 언어 목록
    error:        null,
  },

  form: {
    name:    { value: '', isValid: false, isDirty: false, error: '' },
    email:   { value: '', isValid: false, isDirty: false, error: '' },
    message: { value: '', isValid: false, isDirty: false, error: '' },
    isSubmitting: false,
    isSubmitted:  false,
  },
};

/* ============================================================
   DOM 참조 캐시 (querySelector는 한 번만 실행)
   자주 사용하는 요소를 미리 변수로 저장해두면 DOM 탐색 비용을 줄이고,
   이후 코드에서 반복적으로 요소를 찾지 않아도 되므로 성능이 좋아집니다.
   이 객체는 헤더, 네비게이션, 프로젝트 영역, 폼, 스크롤 버튼 등을 담고 있습니다.
   ============================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

const el = {
  html:           $('html'),
  header:         $('#header'),
  themeToggle:    $('#themeToggle'),
  themeIcon:      $('#themeIcon'),
  hamburger:      $('#hamburger'),
  navMenu:        $('#navMenu'),
  navLinks:       $$('.nav__link'),

  typingText:     $('#typingText'),

  profileImg:     $('#profileImg'),
  profileFallback:$('#profileFallback'),

  projectFilters: $('#projectFilters'),
  projectsGrid:   $('#projectsGrid'),
  loadingState:   $('#loadingState'),
  errorState:     $('#errorState'),
  errorMessage:   $('#errorMessage'),
  retryBtn:       $('#retryBtn'),
  emptyState:     $('#emptyState'),

  contactForm:    $('#contactForm'),
  nameInput:      $('#name'),
  emailInput:     $('#email'),
  messageInput:   $('#message'),
  nameError:      $('#nameError'),
  emailError:     $('#emailError'),
  messageError:   $('#messageError'),
  submitBtn:      $('#submitBtn'),
  formSuccess:    $('#formSuccess'),

  scrollTop:      $('#scrollTop'),
  currentYear:    $('#currentYear'),
};

/* ============================================================
   1. 테마 관리
   이벤트: 클릭
   상태:   state.theme 변경
   렌더:   html[data-theme], 아이콘, localStorage
   사용자가 다크/라이트 모드를 전환할 때 호출됩니다.
   선택한 테마는 브라우저 저장소에 저장되어 다음 방문 시 유지됩니다.
   ============================================================ */
const applyTheme = (theme) => {
  el.html.setAttribute('data-theme', theme);
  el.themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem('theme', theme);
};

const toggleTheme = () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
};

/* ============================================================
   2. 햄버거 메뉴 관리
   이벤트: 클릭, 링크 클릭, 외부 클릭
   상태:   state.menu.isOpen
   렌더:   nav__menu.open, hamburger.active, aria-expanded
   모바일 환경에서 메뉴를 열고 닫는 로직입니다.
   메뉴가 열려 있으면 햄버거 아이콘이 X 모양으로 바뀌고, 외부를 클릭하면 자동으로 닫힙니다.
   ============================================================ */
const setMenuOpen = (isOpen) => {
  state.menu.isOpen = isOpen;
  el.navMenu.classList.toggle('open', isOpen);
  el.hamburger.classList.toggle('active', isOpen);
  el.hamburger.setAttribute('aria-expanded', String(isOpen));
  el.hamburger.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
};

const toggleMenu = () => setMenuOpen(!state.menu.isOpen);

/* ============================================================
   3. 스크롤 관리
   이벤트: scroll
   상태:   state.scroll.isScrolled, state.scroll.showScrollTop
   렌더:   header.scrolled, scrollTop 버튼 가시성, nav active 링크
   사용자가 페이지를 스크롤할 때 헤더 배경색, 상단 이동 버튼, 현재 활성 섹션을 업데이트합니다.
   ============================================================ */
const updateScroll = () => {
  const y = window.scrollY;

  /* 헤더 배경 */
  const isScrolled = y > CONFIG.SCROLL_NAV_THRESHOLD;
  if (isScrolled !== state.scroll.isScrolled) {
    state.scroll.isScrolled = isScrolled;
    el.header.classList.toggle('scrolled', isScrolled);
  }

  /* 스크롤 상단 버튼 */
  const showScrollTop = y > CONFIG.SCROLL_TOP_THRESHOLD;
  if (showScrollTop !== state.scroll.showScrollTop) {
    state.scroll.showScrollTop = showScrollTop;
    el.scrollTop.classList.toggle('visible', showScrollTop);
    el.scrollTop.classList.toggle('hidden', !showScrollTop);
  }

  /* 활성 섹션 하이라이트 */
  highlightActiveSection();
};

const highlightActiveSection = () => {
  const sections = $$('section[id]');
  let currentId = '';

  sections.forEach((section) => {
    const top = section.getBoundingClientRect().top;
    if (top <= 80) currentId = section.id;
  });

  el.navLinks.forEach((link) => {
    const href = link.getAttribute('href').replace('#', '');
    link.classList.toggle('active', href === currentId);
  });
};

/* ============================================================
   4. 스크롤 애니메이션 (Intersection Observer)
   화면에 보이는 요소에 .visible 클래스를 추가해 서서히 나타나게 합니다.
   fade-in 클래스가 붙은 요소는 페이지 진입 시 자연스럽게 보이도록 처리됩니다.
   임계값: CONFIG.INTERSECTION_THRESHOLD
   ============================================================ */
const setupScrollAnimation = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // 한 번만 실행
        }
      });
    },
    { threshold: CONFIG.INTERSECTION_THRESHOLD }
  );

  $$('.fade-in').forEach((el) => observer.observe(el));
};

/* ============================================================
   5. 타이핑 효과 (Hero 섹션)
   Hero 영역의 텍스트가 마치 타이핑되는 것처럼 반복적으로 보이도록 만듭니다.
   타이핑될 단어들은 CONFIG.TYPING_WORDS 배열에 들어 있고,
   속도는 TYPING_SPEED, ERASING_SPEED, PAUSE_TIME으로 조절합니다.
   ============================================================ */
const startTypingEffect = () => {
  const { TYPING_WORDS, TYPING_SPEED, ERASING_SPEED, PAUSE_TIME } = CONFIG;
  let wordIdx = 0;
  let charIdx = 0;
  let isErasing = false;

  const type = () => {
    const word = TYPING_WORDS[wordIdx % TYPING_WORDS.length];
    const current = isErasing ? word.slice(0, charIdx - 1) : word.slice(0, charIdx + 1);
    el.typingText.textContent = current;

    if (!isErasing && current === word) {
      isErasing = true;
      setTimeout(type, PAUSE_TIME);
      return;
    }
    if (isErasing && current === '') {
      isErasing = false;
      wordIdx++;
      setTimeout(type, TYPING_SPEED);
      return;
    }

    charIdx = isErasing ? charIdx - 1 : charIdx + 1;
    setTimeout(type, isErasing ? ERASING_SPEED : TYPING_SPEED);
  };

  type();
};

/* ============================================================
   6. GitHub API 연동
   이벤트: 페이지 로드, 재시도 버튼 클릭
   상태:   state.projects.status / data / filtered / languages / error
   렌더:   loadingState / errorState / emptyState / projectsGrid
   사용자가 GitHub 저장소 목록을 불러와 프로젝트 섹션에 표시하는 핵심 기능입니다.
   GitHub API 응답을 받아 카드형 UI로 렌더링합니다.
   ============================================================ */

/* 상태에 따라 UI 전환 */
const renderProjectsState = () => {
  const { status } = state.projects;

  const show = (el) => el.classList.remove('hidden');
  const hide = (el) => el.classList.add('hidden');

  // 모두 숨기고
  hide(el.loadingState);
  hide(el.errorState);
  hide(el.emptyState);
  hide(el.projectsGrid);

  // 해당 상태만 표시
  if (status === 'loading') show(el.loadingState);
  else if (status === 'error') {
    el.errorMessage.textContent = state.projects.error || '프로젝트를 불러올 수 없습니다.';
    show(el.errorState);
  }
  else if (status === 'empty') show(el.emptyState);
  else if (status === 'success') show(el.projectsGrid);
};

/* 언어별 색상 클래스 (CSS에 .lang-dot--{key} 정의) */
const getLangKey = (lang) =>
  (lang || 'other').toLowerCase().replace(/\+/g, '\\+').replace(/\s+/g, '-').replace(/[^a-z0-9\\+-]/g, '');

/* 프로젝트 카드 HTML 생성 (map + template literal) */
const createCardHTML = ({ name, description, stargazers_count, forks_count, language, html_url }) => `
  <article class="project-card" data-language="${language || 'Other'}">
    <div class="project-card__head">
      <i class="fas fa-folder project-card__folder" aria-hidden="true"></i>
      <div class="project-card__links">
        <a href="${html_url}" target="_blank" rel="noopener noreferrer" aria-label="${name} GitHub 링크">
          <i class="fab fa-github" aria-hidden="true"></i>
        </a>
      </div>
    </div>
    <h3 class="project-card__name">${escapeHTML(name)}</h3>
    <p class="project-card__desc">${escapeHTML(description || '설명이 없습니다.')}</p>
    <div class="project-card__meta">
      ${language
        ? `<span class="project-card__lang">
             <span class="lang-dot lang-dot--${getLangKey(language)}" aria-hidden="true"></span>
             ${escapeHTML(language)}
           </span>`
        : ''}
      <span class="project-card__stat" aria-label="스타 ${stargazers_count}개">
        <i class="fas fa-star" aria-hidden="true"></i> ${stargazers_count}
      </span>
      <span class="project-card__stat" aria-label="포크 ${forks_count}개">
        <i class="fas fa-code-branch" aria-hidden="true"></i> ${forks_count}
      </span>
    </div>
  </article>
`;

/* XSS 방지용 HTML 이스케이프 */
const escapeHTML = (str) =>
  String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

/* 필터 버튼 생성 */
const renderFilterButtons = () => {
  const { languages, activeFilter } = state.projects;

  const buttons = [
    createFilterBtn('all', '전체', activeFilter),
    ...languages.map((lang) => createFilterBtn(lang, lang, activeFilter)),
  ].join('');

  el.projectFilters.innerHTML = buttons;

  /* 필터 버튼 이벤트 위임 */
  el.projectFilters.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      applyFilter(filter);
    });
  });
};

const createFilterBtn = (value, label, active) =>
  `<button class="filter-btn ${active === value ? 'filter-btn--active' : ''}" data-filter="${escapeHTML(value)}">
    ${escapeHTML(label)}
  </button>`;

/* 필터 적용 */
const applyFilter = (filter) => {
  state.projects.activeFilter = filter;

  state.projects.filtered = filter === 'all'
    ? state.projects.data
    : state.projects.data.filter(({ language }) => language === filter);

  renderFilterButtons();
  renderProjectCards();
};

/* 카드 렌더링 */
const renderProjectCards = () => {
  const { filtered } = state.projects;

  if (filtered.length === 0) {
    state.projects.status = 'empty';
    renderProjectsState();
    return;
  }

  state.projects.status = 'success';
  el.projectsGrid.innerHTML = filtered.map(createCardHTML).join('');
  renderProjectsState();
};

/* GitHub API 호출 */
const fetchProjects = async () => {
  state.projects.status = 'loading';
  state.projects.error = null;
  renderProjectsState();

  try {
    const res = await fetch(
      `https://api.github.com/users/${CONFIG.GITHUB_USERNAME}/repos?per_page=100&sort=updated`
    );

    /* 403: Rate Limit, 404: 사용자 없음 */
    if (!res.ok) {
      const msg = res.status === 403
        ? 'GitHub API 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
        : `GitHub API 오류 (${res.status})`;
      throw new Error(msg);
    }

    const repos = await res.json();

    /* fork 제외 + 정렬 (스타 내림차순) + 최대 개수 제한 */
    const filtered = repos
      .filter(({ private: isPrivate }) => !isPrivate)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, CONFIG.MAX_PROJECTS);

    /* 중복 없는 언어 목록 (filter + Set으로 처리) */
    const langs = [...new Set(
      filtered
        .map(({ language }) => language)
        .filter(Boolean)
    )];

    state.projects.data      = filtered;
    state.projects.filtered  = filtered;
    state.projects.languages = langs;

    if (filtered.length === 0) {
      state.projects.status = 'empty';
    } else {
      state.projects.status = 'success';
    }

    renderFilterButtons();
    renderProjectCards();

  } catch (err) {
    state.projects.status = 'error';
    state.projects.error  = err.message;
    renderProjectsState();
    console.error('[Projects] Fetch error:', err);
  }
};

/* ============================================================
   7. 폼 유효성 검사
   이벤트: input (실시간), submit
   상태:   state.form.{name|email|message}
   렌더:   에러 메시지 표시/숨김, 입력 클래스 토글, 성공 메시지
   사용자가 이름/이메일/메시지를 입력할 때 실시간으로 검증하고,
   전송 전에 전체 폼을 다시 확인해 잘못된 값이 있으면 막아줍니다.
   ============================================================ */

/* 단일 필드 검증 후 UI 반영 */
const validateField = (fieldName, value) => {
  const error = VALIDATORS[fieldName](value);
  const field = state.form[fieldName];
  field.value   = value;
  field.error   = error;
  field.isValid = error === '';

  /* 에러 메시지 요소 */
  const errorEl  = el[`${fieldName}Error`];
  const inputEl  = el[`${fieldName}Input`];

  errorEl.textContent = field.isDirty ? error : '';
  inputEl.classList.toggle('error',   field.isDirty && !field.isValid);
  inputEl.classList.toggle('success', field.isDirty &&  field.isValid);

  return field.isValid;
};

/* 폼 전체 검증 */
const validateAll = () => {
  ['name', 'email', 'message'].forEach((f) => {
    state.form[f].isDirty = true;
  });
  return (
    validateField('name',    state.form.name.value)   &&
    validateField('email',   state.form.email.value)  &&
    validateField('message', state.form.message.value)
  );
};

/* 폼 리셋 */
const resetForm = () => {
  el.contactForm.reset();
  ['name', 'email', 'message'].forEach((f) => {
    state.form[f] = { value: '', isValid: false, isDirty: false, error: '' };
    el[`${f}Error`].textContent = '';
    el[`${f}Input`].classList.remove('error', 'success');
  });
  state.form.isSubmitted  = false;
  state.form.isSubmitting = false;
};

/* ============================================================
   8. 이벤트 연결 (모든 addEventListener를 한 곳에서 관리)
   UI 동작을 한 군데에서 연결해 유지보수성을 높입니다.
   버튼 클릭, 입력 이벤트, 스크롤, 메뉴 닫기, 폼 제출을 모두 여기서 등록합니다.
   ============================================================ */
const bindEvents = () => {

  /* 다크 모드 토글 */
  el.themeToggle.addEventListener('click', toggleTheme);

  /* 햄버거 메뉴 */
  el.hamburger.addEventListener('click', toggleMenu);

  /* 네비게이션 링크 클릭 시 모바일 메뉴 닫기 + 부드러운 스크롤 */
  el.navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.getElementById(href.slice(1));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
      if (state.menu.isOpen) setMenuOpen(false);
    });
  });

  /* 모바일 메뉴 외부 클릭 시 닫기 */
  document.addEventListener('click', (e) => {
    if (
      state.menu.isOpen &&
      !el.navMenu.contains(e.target) &&
      !el.hamburger.contains(e.target)
    ) {
      setMenuOpen(false);
    }
  });

  /* 스크롤 이벤트 */
  window.addEventListener('scroll', updateScroll, { passive: true });

  /* 스크롤 상단 버튼 */
  el.scrollTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Hero CTA 부드러운 스크롤 */
  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* GitHub API 재시도 버튼 */
  el.retryBtn.addEventListener('click', fetchProjects);

  /* 폼: 실시간 입력 검증 */
  [
    [el.nameInput,    'name'],
    [el.emailInput,   'email'],
    [el.messageInput, 'message'],
  ].forEach(([input, fieldName]) => {
    input.addEventListener('input', (e) => {
      state.form[fieldName].isDirty = true;
      validateField(fieldName, e.target.value);
    });
    input.addEventListener('blur', (e) => {
      state.form[fieldName].isDirty = true;
      validateField(fieldName, e.target.value);
    });
  });

  /* 폼: 제출 */
  if (el.contactForm) {
    el.contactForm.addEventListener('submit', handleSubmit);
  }

  /* 프로필 이미지 로드 실패 시 폴백 */
  el.profileImg.addEventListener('error', () => {
    el.profileImg.classList.add('hidden');
    el.profileFallback.classList.remove('hidden');
    el.profileFallback.removeAttribute('aria-hidden');
  });

  /* 시스템 다크 모드 변경 감지 (보너스) */
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      state.theme = e.matches ? 'dark' : 'light';
      applyTheme(state.theme);
    }
  });
};

/* ============================================================
   폼 제출 핸들러
   사용자가 문의 폼을 전송할 때 호출됩니다.
   1) 기본 폼 전송 막기
   2) 유효성 검사
   3) EmailJS로 메일 전송 시도
   4) 실패 시 mailto fallback
   5) 성공 메시지 표시
   ============================================================ */
const handleSubmit = async (e) => {
  e.preventDefault(); // 기본 폼 전송 방지
  console.log('[Form] submit start', {
    isSubmitting: state.form.isSubmitting,
    hasEmailJS: !!window.emailjs,
    serviceId: CONFIG.EMAILJS_SERVICE_ID,
    templateId: CONFIG.EMAILJS_TEMPLATE_ID,
    publicKey: CONFIG.EMAILJS_PUBLIC_KEY,
  });

  if (state.form.isSubmitting) return;

  const isValid = validateAll();
  if (!isValid) {
    console.warn('[Form] validation failed');
    return;
  }

  state.form.isSubmitting = true;
  el.submitBtn.disabled = true;
  el.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>전송 중...</span>';

  /* 실제 전송: EmailJS 설정이 있다면 EmailJS로 전송, 없으면 메일 앱 오픈 */
  const useEmailJS = CONFIG.EMAILJS_SERVICE_ID && CONFIG.EMAILJS_TEMPLATE_ID && CONFIG.EMAILJS_PUBLIC_KEY;

  try {
    if (useEmailJS && window.emailjs) {
      console.log('[Form] send via EmailJS');
      emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY });

      const templateParams = {
        from_name: state.form.name.value,
        from_email: state.form.email.value,
        message: state.form.message.value,
        to_email: CONFIG.TO_EMAIL,
      };

      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, templateParams);

    } else {
      console.warn('[Form] EmailJS unavailable; fallback mailto');
      const subject = encodeURIComponent(`문의사항: ${state.form.name.value}`);
      const body = encodeURIComponent(
        `이름: ${state.form.name.value}\n` +
        `이메일: ${state.form.email.value}\n\n` +
        `${state.form.message.value}`
      );
      window.location.href = `mailto:${CONFIG.TO_EMAIL}?subject=${subject}&body=${body}`;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    state.form.isSubmitting = false;
    state.form.isSubmitted  = true;

    el.submitBtn.disabled = false;
    el.submitBtn.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i><span>메시지 보내기</span>';

    el.formSuccess.classList.remove('hidden');
    el.contactForm.reset();

    setTimeout(() => {
      el.formSuccess.classList.add('hidden');
      resetForm();
    }, 5000);

  } catch (err) {
    console.error('[Form] 전송 실패:', err);
    const subject = encodeURIComponent(`문의사항: ${state.form.name.value}`);
    const body = encodeURIComponent(
      `이름: ${state.form.name.value}\n` +
      `이메일: ${state.form.email.value}\n\n` +
      `${state.form.message.value}`
    );
    window.location.href = `mailto:${subject}&body=${body}`;
    state.form.isSubmitting = false;
    el.submitBtn.disabled = false;
    el.submitBtn.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i><span>메시지 보내기</span>';
    alert('메일 앱이 열렸습니다. 발신자 메일 앱에서 전송해 주세요.');
  }
};

/* ============================================================
   초기화
   DOM이 준비되면 이 함수가 실행되며,
   테마 설정, 이벤트 바인딩, 스크롤 애니메이션, 타이핑 효과, GitHub 프로젝트 로드 등을 시작합니다.
   ============================================================ */
const init = () => {
  /* 테마 적용 (저장된 값 또는 시스템 설정) */
  applyTheme(state.theme);

  /* 연도 표시 */
  if (el.currentYear) el.currentYear.textContent = new Date().getFullYear();

  /* 이벤트 연결 */
  bindEvents();

  /* 스크롤 애니메이션 Observer */
  setupScrollAnimation();

  /* 타이핑 효과 */
  startTypingEffect();

  /* GitHub 프로젝트 로드 */
  fetchProjects();

  /* 초기 스크롤 상태 동기화 */
  updateScroll();
};

/* DOM 로드 완료 후 실행 (defer이지만 명시적으로 보장) */
document.addEventListener('DOMContentLoaded', init);
