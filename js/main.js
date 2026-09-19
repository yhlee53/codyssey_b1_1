/* ============================================================
   CONFIG  ← 여기서 본인 정보를 수정하세요
   ============================================================ */
const CONFIG = Object.freeze({
  GITHUB_USERNAME:         'yhlee53', // GitHub 아이디
  MAX_PROJECTS:            12,                     // 표시할 최대 저장소 수
  SCROLL_NAV_THRESHOLD:    60,   // px: 헤더 배경 변경 기준 (README 명시)
  SCROLL_TOP_THRESHOLD:    300,  // px: 스크롤 상단 버튼 표시 기준 (README 명시)
  INTERSECTION_THRESHOLD:  0.2,  // 스크롤 애니메이션 임계값 (README 명시)
  TYPING_WORDS:    ['개발자', '문제해결사', '꾸준한 학습자', 'Frontend Dev'],
  TYPING_SPEED:    150,   // ms: 타이핑 속도
  ERASING_SPEED:   75,    // ms: 지우기 속도
  PAUSE_TIME:      1800,  // ms: 단어 유지 시간
  /* EmailJS 설정: 실제 전송을 사용하려면 EmailJS 계정에서 발급받은 값을 넣으세요. 빈 값이면 시뮬레이션 모드로 동작합니다. */
  EMAILJS_SERVICE_ID:  '', // ex: 'service_xxx'
  EMAILJS_TEMPLATE_ID: '', // ex: 'template_xxx'
  EMAILJS_PUBLIC_KEY:   '', // ex: 'user_xxx' 또는 public key
});

/* ============================================================
   STATE  — "이벤트 → 상태 변경 → 화면 업데이트" 흐름의 단일 진실 출처
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
   임계값: CONFIG.INTERSECTION_THRESHOLD (0.2)
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
      .filter(({ fork }) => !fork)
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
   ============================================================ */
const VALIDATORS = {
  name:    (v) => v.trim().length < 2 ? '이름을 2자 이상 입력해 주세요.' : '',
  email:   (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : '올바른 이메일 형식을 입력해 주세요.',
  message: (v) => v.trim().length < 10 ? '메시지를 10자 이상 입력해 주세요.' : '',
};

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
  el.contactForm.addEventListener('submit', handleSubmit);

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
   ============================================================ */
const handleSubmit = async (e) => {
  e.preventDefault(); // 기본 폼 전송 방지

  if (state.form.isSubmitting) return;

  const isValid = validateAll();
  if (!isValid) return;

  state.form.isSubmitting = true;
  el.submitBtn.disabled = true;
  el.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i><span>전송 중...</span>';

  /* 실제 전송: EmailJS 설정이 있다면 EmailJS로 전송, 없으면 시뮬레이션 모드 */
  const useEmailJS = CONFIG.EMAILJS_SERVICE_ID && CONFIG.EMAILJS_TEMPLATE_ID && CONFIG.EMAILJS_PUBLIC_KEY;

  try {
    if (useEmailJS && window.emailjs) {
      // EmailJS 초기화 (public key)
      emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);

      const templateParams = {
        from_name: state.form.name.value,
        from_email: state.form.email.value,
        message: state.form.message.value,
      };

      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, templateParams);

    } else {
      // 시뮬레이션(네트워크 지연 모사)
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    state.form.isSubmitting = false;
    state.form.isSubmitted  = true;

    el.submitBtn.disabled = false;
    el.submitBtn.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i><span>메시지 보내기</span>';

    el.formSuccess.classList.remove('hidden');
    el.contactForm.reset();

    /* 5초 후 성공 메시지 숨기기 */
    setTimeout(() => {
      el.formSuccess.classList.add('hidden');
      resetForm();
    }, 5000);

  } catch (err) {
    console.error('[Form] 전송 실패:', err);
    state.form.isSubmitting = false;
    el.submitBtn.disabled = false;
    el.submitBtn.innerHTML = '<i class="fas fa-paper-plane" aria-hidden="true"></i><span>메시지 보내기</span>';
    alert('메시지 전송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
};

/* ============================================================
   초기화
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
