(() => {
  "use strict";

  const data = window.APP_DATA;
  const STORAGE_KEY = "qianfu-workplace-role-test-v3";

  if (!data) {
    return;
  }

  const PROFESSIONAL_TERMS = [
    "个人—组织价值匹配度",
    "强组织政治技能型员工",
    "极强任务导向型员工",
    "强角色适应型员工",
    "强非正式沟通型员工",
    "强关系导向型管理者",
    "强意义体验型员工",
    "强交易导向型选手",
    "强服务导向型员工",
    "低政治回避型员工",
    "低职场迂回型人才",
    "低职场修饰度",
    "高情境敏感",
    "高风险意识",
    "高自我监控",
    "高适应性",
    "低冲动性",
    "长期导向",
    "高行动倾向",
    "强情绪外显型",
    "高执行力",
    "高权力动机",
    "高组织敏感度",
    "政治技能",
    "社会洞察力",
    "向下影响能力",
    "框架效应",
    "心理契约",
    "间歇性强化",
    "高尽责性",
    "高成就动机",
    "任务绩效",
    "关系绩效",
    "工作—生活边界渗透",
    "工作—生活边界",
    "目标坚持性",
    "责任意识",
    "风险警觉性",
    "关系妥协倾向",
    "使命驱动型员工",
    "高价值一致性",
    "强内在动机",
    "道德认同",
    "自我一致性",
    "价值承诺",
    "高机会识别",
    "高资源整合",
    "边界跨越能力",
    "社会资本运作能力",
    "谈判意识",
    "模糊容忍度",
    "高情绪敏感",
    "高开放性",
    "情绪感知能力",
    "共情水平",
    "情感强度",
    "人际敏感性",
    "经验开放性",
    "高关系导向",
    "高社会网络密度",
    "人际信息流",
    "高角色投入",
    "高可用性",
    "角色嵌入度",
    "组织承诺",
    "情绪劳动水平",
    "信息接近度",
    "隐性知识",
    "高直接性",
    "强问题导向",
    "行为激活水平",
    "决断性",
    "冲突倾向",
    "高行为灵活性",
    "情境适应能力",
    "社会认知能力",
    "印象管理意识",
    "低存在感",
    "高任务服从",
    "强角色边界型员工",
    "任务纪律",
    "主动建言",
    "向上影响",
    "自我展示",
  ];
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const professionalTermMatcher = new RegExp(
    PROFESSIONAL_TERMS.sort((left, right) => right.length - left.length).map(escapeRegExp).join("|"),
    "g",
  );
  const SHARE_FIELD_TEXT = "复制粘贴这个网址，看看你是《潜伏里的谁》：www.xxxxxx.com";
  const DAILY_VISITOR_NAMESPACE = "gxxmst1225-qianfu";

  const createState = () => ({
    version: 3,
    current: 0,
    answers: Array(data.totalQuestions).fill(null),
    startedAt: Date.now(),
    completedAt: null,
  });

  const readState = () => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return createState();
      }
      const state = JSON.parse(raw);
      if (!Array.isArray(state.answers) || state.answers.length !== data.totalQuestions) {
        return createState();
      }
      state.current = Math.min(Math.max(Number(state.current) || 0, 0), data.totalQuestions - 1);
      return state;
    } catch {
      return createState();
    }
  };

  const saveState = (state) => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const startQuiz = () => {
    const state = createState();
    saveState(state);
    return state;
  };

  const answeredCount = (state) => state.answers.filter((answer) => Number.isInteger(answer)).length;

  const calculateScores = (state) => {
    const scores = Object.fromEntries(data.roles.map((role) => [role.name, 0]));
    state.answers.forEach((answerIndex, questionIndex) => {
      if (!Number.isInteger(answerIndex)) {
        return;
      }
      const answer = data.questions[questionIndex]?.options[answerIndex];
      answer?.scores.forEach((name) => {
        scores[name] += 1;
      });
    });
    return scores;
  };

  const matchingRole = (state) => {
    const scores = calculateScores(state);
    let winner = data.roles[0];
    data.roles.forEach((role) => {
      if (scores[role.name] > scores[winner.name]) {
        winner = role;
      }
    });
    return { role: winner, scores };
  };

  const formatDuration = (startedAt, completedAt = Date.now()) => {
    const seconds = Math.max(0, Math.floor((completedAt - startedAt) / 1000));
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const remainder = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${remainder}`;
  };

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  };

  const appendHighlightedText = (element, text) => {
    professionalTermMatcher.lastIndex = 0;
    let cursor = 0;
    let match;
    while ((match = professionalTermMatcher.exec(text)) !== null) {
      if (match.index > cursor) {
        element.append(document.createTextNode(text.slice(cursor, match.index)));
      }
      element.append(make("strong", "professional-term", match[0]));
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) {
      element.append(document.createTextNode(text.slice(cursor)));
    }
  };

  const makeAnalysisParagraph = (className, text) => {
    const paragraph = make("p", className);
    appendHighlightedText(paragraph, text);
    return paragraph;
  };

  const appendAvatar = (parent, source, alt, className) => {
    const image = document.createElement("img");
    image.className = className;
    image.src = source;
    image.alt = alt;
    image.loading = "lazy";
    parent.append(image);
  };

  const renderDailyVisitorCount = () => {
    const count = document.querySelector("#daily-visitor-count");
    if (!count) {
      return;
    }

    const dateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date()).reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});
    const date = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const localKey = `qianfu-daily-visitor:${date}`;
    const alreadyCounted = window.localStorage.getItem(localKey) === "1";
    const action = alreadyCounted ? "get" : "hit";
    const endpoint = `https://api.countapi.xyz/${action}/${DAILY_VISITOR_NAMESPACE}/${date}`;

    fetch(endpoint, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Visitor counter unavailable"))))
      .then((payload) => {
        const value = Number(payload.value);
        if (!Number.isFinite(value)) {
          return;
        }
        count.textContent = String(value);
        if (!alreadyCounted) {
          window.localStorage.setItem(localKey, "1");
        }
      })
      .catch(() => {
        count.textContent = "----";
      });
  };

  const bindQuizStarters = () => {
    document.querySelectorAll("[data-start-quiz]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        startQuiz();
        window.location.assign(link.href);
      });
    });
  };

  const renderOverview = () => {
    const list = document.querySelector("#overview-list");
    if (!list) {
      return;
    }

    const fragment = document.createDocumentFragment();
    data.overview.entries.forEach((entry) => {
      const item = make("article", "overview-item");
      const avatar = make("div", "overview-avatar");
      appendAvatar(avatar, entry.image, entry.name, "overview-avatar-image");

      const content = make("div", "overview-copy");
      content.append(make("h2", "overview-name", `${entry.name}——${entry.tag}`));
      content.append(make("p", "overview-quote", entry.quote));

      item.append(avatar, content);
      fragment.append(item);
    });
    list.replaceChildren(fragment);
  };

  const renderQuiz = () => {
    const root = document.querySelector("#quiz-paper-root");
    if (!root) {
      return;
    }

    const section = document.querySelector("#quiz-section");
    const count = document.querySelector("#quiz-count");
    const progress = document.querySelector("#quiz-progress-value");
    const progressBar = document.querySelector("#quiz-progress-bar");
    const previous = document.querySelector("#quiz-previous");
    const next = document.querySelector("#quiz-next");
    let state = readState();

    const scrollToTop = () => {
      window.scrollTo(0, 0);
    };

    const render = () => {
      state = readState();
      const question = data.questions[state.current];
      const selectedIndex = state.answers[state.current];
      section.textContent = question.section;
      count.textContent = `${question.number} / ${data.totalQuestions}`;
      progress.textContent = `${question.number} / ${data.totalQuestions}`;
      progressBar.style.width = `${Math.round((question.number / data.totalQuestions) * 100)}%`;

      const paperCopy = make("div", "quiz-paper-copy");
      const meta = make("div", "quiz-meta");
      meta.append(
        make("span", "quiz-kind", question.kind === "choice" ? "单选" : "YES / NO"),
        make("span", "quiz-source-number", question.kind === "choice" ? `选择题 ${question.sourceNumber}` : `判断题 ${question.sourceNumber}`),
      );
      paperCopy.append(meta, make("h1", "quiz-question", question.text));

      const options = make("div", question.kind === "choice" ? "answer-options" : "answer-options binary-options");
      question.options.forEach((option, optionIndex) => {
        const button = make("button", "answer-option");
        button.type = "button";
        button.setAttribute("aria-pressed", String(optionIndex === selectedIndex));
        if (optionIndex === selectedIndex) {
          button.classList.add("is-selected");
        }
        button.append(
          make("span", "option-mark", question.kind === "choice" ? `${option.label}.` : option.label),
          make("span", "option-copy", option.text),
        );
        button.addEventListener("click", () => {
          state.answers[state.current] = optionIndex;
          state.completedAt = null;
          saveState(state);
          render();
        });
        options.append(button);
      });

      paperCopy.append(options);
      const paper = make("section", "quiz-paper");
      const art = document.createElement("img");
      art.className = "paper-art";
      art.src = "素材图片/天津站空白纸.png";
      art.alt = "天津站人事档案纸张";
      paper.append(art, paperCopy);
      root.replaceChildren(paper);

      previous.disabled = state.current === 0;
      next.disabled = !Number.isInteger(selectedIndex);
      next.textContent = state.current === data.totalQuestions - 1 ? "完成答题" : "下一题";
    };

    previous.addEventListener("click", () => {
      if (state.current === 0) {
        return;
      }
      state.current -= 1;
      saveState(state);
      render();
      scrollToTop();
    });

    next.addEventListener("click", () => {
      if (!Number.isInteger(state.answers[state.current])) {
        return;
      }
      if (state.current === data.totalQuestions - 1) {
        state.completedAt = Date.now();
        saveState(state);
        window.location.assign("ready.html");
        return;
      }
      state.current += 1;
      saveState(state);
      render();
      scrollToTop();
    });

    render();
  };

  const renderReady = () => {
    const state = readState();
    const answered = answeredCount(state);
    const answeredNode = document.querySelector("#ready-answered");
    const timeNode = document.querySelector("#ready-time");
    const totalNode = document.querySelector("#ready-total");
    const action = document.querySelector("#ready-action");
    if (!answeredNode || !timeNode || !totalNode || !action) {
      return;
    }

    answeredNode.textContent = String(answered);
    totalNode.textContent = String(data.roles.length);
    timeNode.textContent = formatDuration(state.startedAt, state.completedAt || Date.now());
    if (answered < data.totalQuestions) {
      action.textContent = "继续答题";
      action.href = "quiz.html";
    }
  };

  const showShareDialog = () => {
    document.querySelector(".share-dialog-shell")?.remove();

    const shell = make("div", "share-dialog-shell");
    const dialog = make("section", "share-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "share-dialog-title");

    const close = make("button", "share-dialog-close", "×");
    close.type = "button";
    close.title = "关闭";
    close.setAttribute("aria-label", "关闭");
    const title = make("h2", "share-dialog-title", "分享给同事");
    title.id = "share-dialog-title";
    const field = document.createElement("textarea");
    field.className = "share-link-field";
    field.readOnly = true;
    field.rows = 3;
    field.value = SHARE_FIELD_TEXT;
    field.setAttribute("aria-label", "可复制的分享字段");
    const copy = make("button", "poster-button", "复制字段");
    copy.type = "button";

    const closeDialog = () => shell.remove();
    close.addEventListener("click", closeDialog);
    shell.addEventListener("click", (event) => {
      if (event.target === shell) {
        closeDialog();
      }
    });
    copy.addEventListener("click", async () => {
      let copied = false;
      try {
        await navigator.clipboard?.writeText(SHARE_FIELD_TEXT);
        copied = true;
      } catch {
        field.focus();
        field.select();
        field.setSelectionRange(0, SHARE_FIELD_TEXT.length);
        copied = document.execCommand?.("copy") || false;
      }
      copy.textContent = copied ? "已复制" : "已选中，请复制";
    });

    dialog.append(close, title, field, copy);
    shell.append(dialog);
    document.body.append(shell);
    field.focus();
    field.select();
  };

  const topRoleComposition = (scores) => {
    const topRoles = data.roles
      .map((role, index) => ({ role, index, score: scores[role.name] }))
      .sort((left, right) => right.score - left.score || left.index - right.index)
      .slice(0, 3);
    const total = topRoles.reduce((sum, entry) => sum + entry.score, 0);
    const rawPercentages = topRoles.map((entry) => (total ? (entry.score / total) * 100 : 100 / topRoles.length));
    const percentages = rawPercentages.map((value) => Math.floor(value));
    const remaining = 100 - percentages.reduce((sum, value) => sum + value, 0);
    const fractionalOrder = rawPercentages
      .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
      .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
    for (let index = 0; index < remaining; index += 1) {
      percentages[fractionalOrder[index].index] += 1;
    }
    return topRoles.map((entry, index) => ({ ...entry, percentage: percentages[index] }));
  };

  const renderRoleComposition = (scores) => {
    const section = make("section", "role-composition");
    section.append(make("h2", "role-composition-title", "角色元素占比"));
    const list = make("div", "role-composition-list");
    topRoleComposition(scores).forEach((entry) => {
      const item = make("article", "role-composition-item");
      const avatar = make("div", "composition-avatar");
      appendAvatar(avatar, entry.role.image, entry.role.name, "composition-avatar-image");
      const copy = make("div", "composition-copy");
      const identity = make("div", "composition-identity");
      identity.append(
        make("strong", "composition-name", entry.role.name),
        make("span", "composition-percent", `${entry.percentage}%`),
      );
      copy.append(identity, make("p", "composition-quote", entry.role.quote));
      item.append(avatar, copy);
      list.append(item);
    });
    section.append(list);
    return section;
  };

  const renderResult = () => {
    const root = document.querySelector("#result-root");
    if (!root) {
      return;
    }
    const { role, scores } = matchingRole(readState());
    const fragment = document.createDocumentFragment();

    const portrait = make("section", "result-portrait");
    appendAvatar(portrait, role.image, role.name, "result-portrait-image");
    fragment.append(portrait);

    const identity = make("section", "result-identity");
    identity.append(
      make("p", "result-lead", "好啊，你竟然是——"),
      make("h1", "result-name", role.name),
      make("p", "result-tag", role.tag),
    );
    fragment.append(identity);

    const archive = make("section", "result-archive");
    archive.append(make("blockquote", "result-quote", role.quote));
    archive.append(make("h2", "result-archive-title", "人物档案"));
    role.analysis.forEach((paragraph) => archive.append(makeAnalysisParagraph("result-analysis", paragraph)));
    fragment.append(archive);
    fragment.append(renderRoleComposition(scores));

    const actions = make("div", "result-actions");
    const details = make("a", "poster-button alt", "偷看其他同事底细");
    details.href = "colleagues.html";
    const share = make("button", "poster-button", "分享给同事");
    share.type = "button";
    share.id = "share-result";
    share.addEventListener("click", showShareDialog);
    actions.append(details, share);
    fragment.append(actions);

    root.replaceChildren(fragment);
  };

  const renderColleagues = () => {
    const list = document.querySelector("#role-list");
    if (!list) {
      return;
    }
    const fragment = document.createDocumentFragment();
    data.roles.forEach((role) => {
      const card = make("article", "role-card");
      const heading = make("header", "role-heading");
      heading.append(make("h2", "role-name", role.name), make("p", "role-tag", role.tag));
      const portrait = make("div", "role-portrait");
      appendAvatar(portrait, role.image, role.name, "role-portrait-image");
      const quote = make("blockquote", "role-quote", role.quote);
      card.append(portrait, heading, quote);
      role.analysis.forEach((paragraph) => card.append(makeAnalysisParagraph("role-analysis", paragraph)));
      fragment.append(card);
    });
    list.replaceChildren(fragment);
  };

  bindQuizStarters();
  renderDailyVisitorCount();
  const page = document.body.dataset.page;
  if (page === "overview") {
    renderOverview();
  }
  if (page === "quiz") {
    renderQuiz();
  }
  if (page === "ready") {
    renderReady();
  }
  if (page === "result") {
    renderResult();
  }
  if (page === "colleagues") {
    renderColleagues();
  }
})();
