// Roadmap / Diablo 2 Skill Tree module: AI-generated & popular skill trees, multi-user progression tracking.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hereDir = dirname(fileURLToPath(import.meta.url));
function loadEnvIfNeeded() {
  const envFile = join(hereDir, '..', '.env');
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && m[2]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const DEVOPS_ROADMAP_TEMPLATE = {
  "id": "devops-core",
  "title": "DevOps Інженер: Дерево розвитку",
  "description": "Покрокова карта прокачки навичок від основ Linux та мереж до Kubernetes, CI/CD, GitOps та хмарної архітектури.",
  "targetRole": "DevOps Engineer",
  "branches": [
    "Linux & Системи",
    "Мережі & Безпека",
    "Контейнеризація",
    "CI/CD & Автоматизація",
    "IaC & Хмари",
    "Kubernetes & Оркестрація",
    "Моніторинг & Надійність"
  ],
  "nodes": [
    {
      "id": "linux-core",
      "title": "Linux Core & Bash",
      "icon": "🐧",
      "tier": 1,
      "branch": "Linux & Системи",
      "description": "Управління Linux-серверами, файлова система, права доступу, процеси та написання shell-скриптів для автоматизації рутини.",
      "whyImportant": "Фундамент будь-якої інфраструктури: 95% серверів та контейнерів працюють на Linux.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Навігація, grep, sed, awk, find",
        "Права доступу, користувачі та групи (chmod, chown, sudo)",
        "Управління процесами (ps, top, htop, kill, systemctl)",
        "Bash-скрипти: змінні, цикли, обробка аргументів",
        "Systemd units та таймери"
      ],
      "completedTopics": []
    },
    {
      "id": "git-scm",
      "title": "Git & VCS Workflows",
      "icon": "🌿",
      "tier": 1,
      "branch": "CI/CD & Автоматизація",
      "description": "Робота з гілками, злиття, rebase, cherry-pick та командні практики GitFlow / Trunk-Based Development.",
      "whyImportant": "Код інфраструктури та пайплайни зберігаються та версіонуються виключно в Git.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Основні команди: commit, push, pull, fetch, stash",
        "Розв'язання конфліктів та rebase vs merge",
        "Стратегії гілкування (Trunk-based, GitHub Flow)",
        "Робота з Pull Request та рев'ю коду"
      ],
      "completedTopics": []
    },
    {
      "id": "net-basics",
      "title": "Мережі & Інтернет-протоколи",
      "icon": "🌐",
      "tier": 1,
      "branch": "Мережі & Безпека",
      "description": "Розуміння роботи TCP/IP, DNS, роутингу, HTTP/HTTPS, SSH ключів та базової мережевої діагностики.",
      "whyImportant": "Без мереж неможливо побудувати жодну розподілену систему чи зрозуміти збій зв'язку між сервісами.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Модель OSI та стек TCP/UDP",
        "DNS: A, CNAME, MX, TTL, dig, nslookup",
        "HTTP/1.1, HTTP/2, REST, SSL/TLS рукостискання",
        "Діагностика: curl, ping, traceroute, netstat, tcpdump",
        "SSH тунелі та автентифікація за ключами"
      ],
      "completedTopics": []
    },
    {
      "id": "docker-basics",
      "title": "Docker & Оптимізація образів",
      "icon": "🐳",
      "tier": 2,
      "branch": "Контейнеризація",
      "description": "Створення ефективних Dockerfile, багатоетапна збірка (multi-stage), робота з Docker Compose та кешування шарів.",
      "whyImportant": "Контейнери стали стандартом пакування та розгортання додатків у сучасному світі.",
      "status": "locked",
      "prerequisites": [
        "linux-core"
      ],
      "topics": [
        "Dockerfile: RUN, COPY, ADD, CMD vs ENTRYPOINT",
        "Multi-stage builds для мінімального розміру образу",
        "Docker Compose для локального стеку розробки",
        "Мережі Docker (bridge, host, overlay) та Volumes",
        "Безпека: non-root користувачі, сканування Trivy"
      ],
      "completedTopics": []
    },
    {
      "id": "cicd-github-actions",
      "title": "CI/CD: GitHub Actions & GitLab",
      "icon": "⚡",
      "tier": 2,
      "branch": "CI/CD & Автоматизація",
      "description": "Побудова автоматизованих пайплайнів тестування, збірки, публікації артефактів та безпечного деплою на сервери.",
      "whyImportant": "Автоматизує рутинні перевірки та усуває людський фактор при викатці нових версій.",
      "status": "locked",
      "prerequisites": [
        "git-scm"
      ],
      "topics": [
        "Синтаксис GitHub Actions workflows, jobs та steps",
        "Використання Secrets, Variables та Environments",
        "Кешування залежностей для прискорення збірок",
        "Matrix builds для паралельного тестування",
        "Автоматичний пуш образів у GitHub Container Registry / Docker Hub"
      ],
      "completedTopics": []
    },
    {
      "id": "security-fundamentals",
      "title": "Безпека серверів & SSH Hardening",
      "icon": "🛡️",
      "tier": 2,
      "branch": "Мережі & Безпека",
      "description": "Захист серверів від зломів: UFW/iptables, fail2ban, відключення парольного доступу по SSH, оновлення безпеки.",
      "whyImportant": "Небезпечні сервери стають мішенями ботнетів та ведуть до витоку персональних даних.",
      "status": "locked",
      "prerequisites": [
        "net-basics",
        "linux-core"
      ],
      "topics": [
        "Налаштування SSH: Port, PermitRootLogin no, PubkeyAuthentication",
        "Фаєрвол UFW та відкриття тільки потрібних портів",
        "Захист від перебору паролів (Fail2ban)",
        "Аудит відкритих портів та процесів (nmap, ss, lsof)"
      ],
      "completedTopics": []
    },
    {
      "id": "terraform-iac",
      "title": "Terraform: Інфраструктура як Код",
      "icon": "🏗️",
      "tier": 3,
      "branch": "IaC & Хмари",
      "description": "Декларативний опис інфраструктури (хмарні віртуальні машини, мережі, бази даних) з автоматичним створенням.",
      "whyImportant": "Дозволяє розгортати та відновлювати всю інфраструктуру компанії за лічені хвилини.",
      "status": "locked",
      "prerequisites": [
        "docker-basics",
        "git-scm"
      ],
      "topics": [
        "HCL синтаксис: providers, resources, data sources",
        "Variables, outputs, locals та вирази",
        "Управління станом: remote state у S3 + dynamoDB locking",
        "Створення перевикористовуваних модулів Terraform",
        "Terraform plan, apply, destroy та drift detection"
      ],
      "completedTopics": []
    },
    {
      "id": "cloud-aws",
      "title": "Хмарна архітектура: AWS Core",
      "icon": "☁️",
      "tier": 3,
      "branch": "IaC & Хмари",
      "description": "Робота з головними сервісами AWS: EC2, VPC, S3, IAM, Security Groups та CloudWatch.",
      "whyImportant": "AWS є лідером глобального хмарного ринку для розміщення продуктових систем.",
      "status": "locked",
      "prerequisites": [
        "net-basics"
      ],
      "topics": [
        "IAM: користувачі, ролі, політики найменших привілеїв",
        "VPC: публічні/приватні підмережі, NAT Gateway, Route Tables",
        "EC2: інстанси, AMI, Launch Templates, Auto Scaling",
        "S3: бакети, політики доступу, версіонування та життєві цикли"
      ],
      "completedTopics": []
    },
    {
      "id": "ansible-config",
      "title": "Ansible: Конфігурація серверів",
      "icon": "📜",
      "tier": 3,
      "branch": "Linux & Системи",
      "description": "Декларативне налаштування серверного оточення без агентів через SSH: Playbooks, Roles, Vault.",
      "whyImportant": "Автоматизує налаштування сотень серверів в один клік.",
      "status": "locked",
      "prerequisites": [
        "linux-core",
        "security-fundamentals"
      ],
      "topics": [
        "Inventory файли та змінні",
        "Playbooks, tasks, handlers",
        "Використання готових та власних ролей (Roles)",
        "Ansible Vault для шифрування чутливих даних"
      ],
      "completedTopics": []
    },
    {
      "id": "k8s-fundamentals",
      "title": "Kubernetes: Ядро & Архітектура",
      "icon": "☸️",
      "tier": 4,
      "branch": "Kubernetes & Оркестрація",
      "description": "Pods, Deployments, Services, Ingress, ConfigMaps, Secrets та принципи самовідновлення кластера.",
      "whyImportant": "Головний стандарт для оркестрації мікросервісів у високонавантажених системах.",
      "status": "locked",
      "prerequisites": [
        "docker-basics",
        "terraform-iac"
      ],
      "topics": [
        "Архітектура control-plane (API server, etcd, scheduler, kubelet)",
        "Deployments, ReplicaSets та Rolling Updates",
        "Мережі K8s: ClusterIP, NodePort, Ingress Controller",
        "Управління сховищем: PVC, PV, StorageClass",
        "Resource Limits, Requests та HPA (автомасштабування)"
      ],
      "completedTopics": []
    },
    {
      "id": "helm-packaging",
      "title": "Helm: Пакетний менеджер K8s",
      "icon": "📦",
      "tier": 4,
      "branch": "Kubernetes & Оркестрація",
      "description": "Шаблонізація маніфестів K8s, створення власних Helm Charts та керування релізами додатків.",
      "whyImportant": "Спрощує деплой комплексних систем (бази, черги, бекенд) до однієї команди.",
      "status": "locked",
      "prerequisites": [
        "k8s-fundamentals"
      ],
      "topics": [
        "Структура чарту: Chart.yaml, values.yaml, templates",
        "Шаблонізація Go template (if, with, range)",
        "Helm install, upgrade, rollback, dependencies"
      ],
      "completedTopics": []
    },
    {
      "id": "observability-prom",
      "title": "Prometheus & Grafana Моніторинг",
      "icon": "📊",
      "tier": 4,
      "branch": "Моніторинг & Надійність",
      "description": "Збір метрик, PromQL запити, створення інформативних дашбордів Grafana та сповіщення Alertmanager.",
      "whyImportant": "Неможливо виправити проблему, яку ви не можете виміряти та побачити в реальному часі.",
      "status": "locked",
      "prerequisites": [
        "docker-basics",
        "linux-core"
      ],
      "topics": [
        "Принцип pull-based метрик та Node Exporter",
        "Синтаксис запитів PromQL (rate, sum, increase)",
        "Побудова дашбордів у Grafana",
        "Правила алертингу в Alertmanager (Telegram, Slack, Email)"
      ],
      "completedTopics": []
    },
    {
      "id": "gitops-argocd",
      "title": "GitOps: ArgoCD & Flagger",
      "icon": "🔄",
      "tier": 5,
      "branch": "CI/CD & Автоматизація",
      "description": "Синхронізація стану кластера безпосередньо з Git репозиторію, Canary-релізи та захист від дрейфу.",
      "whyImportant": "Найсучасніша парадигма деплою у хмарні кластери.",
      "status": "locked",
      "prerequisites": [
        "k8s-fundamentals",
        "helm-packaging",
        "cicd-github-actions"
      ],
      "topics": [
        "Концепція GitOps як єдиного джерела правди (Single Source of Truth)",
        "Встановлення та налаштування ArgoCD Applications",
        "Auto-sync, prune та self-healing",
        "Canary та Blue-Green деплойменти"
      ],
      "completedTopics": []
    },
    {
      "id": "logging-tracing",
      "title": "Логування (Loki/ELK) & Tracing",
      "icon": "🔍",
      "tier": 5,
      "branch": "Моніторинг & Надійність",
      "description": "Централізований збір логів через Promtail / Fluentd, агрегація в Loki або OpenSearch та трейсинг OpenTelemetry.",
      "whyImportant": "Допомагає миттєво знайти причину збою у сотнях мікросервісів.",
      "status": "locked",
      "prerequisites": [
        "observability-prom",
        "k8s-fundamentals"
      ],
      "topics": [
        "Grafana Loki + Promtail для економного збору логів",
        "Пошук логів мовою LogQL",
        "Концепція трасування (Distributed Tracing, Spans, Jaeger)",
        "SLO, SLI та SLA: встановлення цілей надійності"
      ],
      "completedTopics": []
    }
  ]
};
export const FRONTEND_ROADMAP_TEMPLATE = {
  "id": "frontend-core",
  "title": "Frontend Розробник (React / TypeScript / Web)",
  "description": "Покрокова карта розвитку сучасного фронтенд-інженера від основ HTML/CSS та чистого JS до React, TypeScript, Next.js та оптимізації продуктивності.",
  "targetRole": "Frontend Developer",
  "branches": [
    "Web Основи & Стилі",
    "JavaScript & TypeScript",
    "UI Бібліотеки & Стан",
    "Фреймворки & SSR",
    "Продуктивність & Архітектура"
  ],
  "nodes": [
    {
      "id": "fe-html-css",
      "title": "HTML5, Семантика & Сучасний CSS",
      "icon": "🎨",
      "tier": 1,
      "branch": "Web Основи & Стилі",
      "description": "Семантична розмітка, доступність (a11y), адаптивні розкладки Flexbox та Grid, специфічність CSS та сучасні псевдокласи.",
      "whyImportant": "Якісна семантична розмітка забезпечує доступність інтерфейсу для всіх та високі позиції в пошукових системах.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Семантичні теги та доступність (a11y, ARIA, tab index)",
        "Flexbox та CSS Grid розкладки",
        "CSS змінні та адаптивний дизайн (Media Queries, Mobile First)",
        "Box Model, специфічність селекторів та z-index stacking context"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-js-core",
      "title": "JavaScript Core & Асинхронність",
      "icon": "⚡",
      "tier": 1,
      "branch": "JavaScript & TypeScript",
      "description": "Глибоке розуміння типів, замикань, прототипів, Event Loop, Promises, async/await та взаємодії з DOM API.",
      "whyImportant": "JavaScript — фундаментальна мова веб-розробки. Без неї неможливо зрозуміти поведінку жодного фреймворку.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Типи даних, замикання (closures) та прототипи (prototype chain)",
        "Event Loop, Call Stack та мікротаски/макротаски",
        "Promises, async/await та обробка помилок",
        "Робота з DOM API, Browser Events та дебаг у консолі"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-git-tooling",
      "title": "Git & Інструменти розробника",
      "icon": "🛠️",
      "tier": 1,
      "branch": "Продуктивність & Архітектура",
      "description": "Робота з Git гілками, командні процеси, сучасні пакетні менеджери (pnpm/npm) та швидкі бандлери (Vite).",
      "whyImportant": "Ефективний локальний дев-стек багаторазово прискорює щоденну розробку та взаємодію в команді.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Git: commit, push, pull, branches, merge vs rebase",
        "Пакетні менеджери: npm, pnpm, yarn, lock-файли",
        "Vite: бандлінг, HMR та конфігурація плагінів",
        "Chrome DevTools: Network, Sources, Elements, Performance"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-ts",
      "title": "TypeScript: Типізація додатків",
      "icon": "🔷",
      "tier": 2,
      "branch": "JavaScript & TypeScript",
      "description": "Строга статична типізація: інтерфейси, типи, дженеріки, Union типи, Utility types та конфігурація strict mode.",
      "whyImportant": "TypeScript усуває 90% помилок на етапі компіляції та робить рефакторинг великих додатків безпечним.",
      "status": "locked",
      "prerequisites": [
        "fe-js-core"
      ],
      "topics": [
        "Інтерфейси, типи (Type vs Interface) та Generics",
        "Union, Intersection та вбудовані Utility types (Partial, Pick, Omit)",
        "Конфігурація tsconfig.json та strict mode",
        "Типізація асинхронних відповідей API та подій DOM"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-react-basics",
      "title": "React: Компоненти та Хуки",
      "icon": "⚛️",
      "tier": 2,
      "branch": "UI Бібліотеки & Стан",
      "description": "Компонентний підхід, JSX синтаксис, передача props, базові хуки (useState, useEffect, useRef, useMemo).",
      "whyImportant": "React — найпопулярніша бібліотека побудови користувацьких веб-інтерфейсів у світі.",
      "status": "locked",
      "prerequisites": [
        "fe-js-core",
        "fe-html-css"
      ],
      "topics": [
        "JSX, Props та умовний рендеринг",
        "Хуки стану: useState, useEffect, useRef, useMemo, useCallback",
        "Життєвий цикл компонентів та чисті функції без сайд-ефектів",
        "Керування списками та правильне використання keys"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-tailwind-ui",
      "title": "Tailwind CSS & UI Системи",
      "icon": "🌊",
      "tier": 2,
      "branch": "Web Основи & Стилі",
      "description": "Utility-first CSS підхід, швидка верстка адаптивних інтерфейсів, підтримка темної теми та сучасні компоненти shadcn/ui.",
      "whyImportant": "Стандарт сучасної швидкої розробки дизайн-систем без розростання важких CSS-файлів.",
      "status": "locked",
      "prerequisites": [
        "fe-html-css"
      ],
      "topics": [
        "Utility-first підхід та конфігурація tailwind.config",
        "Кастомні теми, кольори та темна тема (dark mode)",
        "Компонентні бібліотеки (shadcn/ui, Radix UI)",
        "Анімації та плавні переходи (CSS transitions / Framer Motion)"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-state-mgmt",
      "title": "Керування станом (Zustand / TanStack Query)",
      "icon": "📦",
      "tier": 3,
      "branch": "UI Бібліотеки & Стан",
      "description": "Розділення клієнтського та серверного стану за допомогою Zustand та TanStack Query (кешування, інвалідація запитів).",
      "whyImportant": "Запобігає надлишковим ререндерам та синхронізує кеш даних з бекендом.",
      "status": "locked",
      "prerequisites": [
        "fe-react-basics"
      ],
      "topics": [
        "Zustand: мінімалістичний та швидкий глобальний стор",
        "TanStack Query (React Query): кешування серверного стану та refetch",
        "Оптимістичні оновлення даних в інтерфейсі (Optimistic UI)",
        "Context API: коли використовувати, а коли уникати"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-routing-forms",
      "title": "Маршрутизація & Форми з валідацією",
      "icon": "🧭",
      "tier": 3,
      "branch": "UI Бібліотеки & Стан",
      "description": "Клієнтський роутинг, вкладені маршрути, робота зі складними формами (React Hook Form) та схема-валідація Zod.",
      "whyImportant": "Форми та навігація є основними точками взаємодії користувача з будь-яким веб-сервісом.",
      "status": "locked",
      "prerequisites": [
        "fe-react-basics",
        "fe-ts"
      ],
      "topics": [
        "React Router / TanStack Router: вкладені маршрути та loaders",
        "Робота з формами: React Hook Form для мінімальних ререндерів",
        "Схемна валідація даних з Zod та виведення помилок",
        "Керування параметрами URL (query params, filters)"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-nextjs",
      "title": "Next.js & Server Components (SSR/SSG)",
      "icon": "▲",
      "tier": 4,
      "branch": "Фреймворки & SSR",
      "description": "App Router, React Server Components (RSC), серверний рендеринг, статична генерація сторінок та Server Actions.",
      "whyImportant": "Забезпечує максимальну швидкість завантаження сторінок та першокласну SEO-індексацію додатку.",
      "status": "locked",
      "prerequisites": [
        "fe-react-basics",
        "fe-ts",
        "fe-routing-forms"
      ],
      "topics": [
        "App Router архітектура та layouts",
        "React Server Components (RSC) vs Client Components ('use client')",
        "SSR, SSG, ISR та динамічний рендеринг контенту",
        "Server Actions та мутація даних безпосередньо з компонентів"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-testing",
      "title": "Тестування: Vitest, RTL & Playwright",
      "icon": "🧪",
      "tier": 4,
      "branch": "Продуктивність & Архітектура",
      "description": "Unit-тести логіки, компонентне тестування користувацької взаємодії з React Testing Library та E2E тести.",
      "whyImportant": "Автоматичні тести гарантують, що нові зміни не зламають існуючий функціонал перед релізом.",
      "status": "locked",
      "prerequisites": [
        "fe-react-basics",
        "fe-ts"
      ],
      "topics": [
        "Unit-тести функцій та хуків з Vitest",
        "Тестування компонентів з React Testing Library",
        "Mock Service Worker (MSW) для перехоплення API запитів",
        "Базові E2E тести з Playwright"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-perf-seo",
      "title": "Core Web Vitals & Швидкодія",
      "icon": "🚀",
      "tier": 5,
      "branch": "Продуктивність & Архітектура",
      "description": "Оптимізація метрик LCP, INP, CLS, стиснення зображень, code splitting, lazy loading та налаштування SEO метаданих.",
      "whyImportant": "Швидкість сайту безпосередньо впливає на конверсію та задоволеність користувачів.",
      "status": "locked",
      "prerequisites": [
        "fe-nextjs",
        "fe-testing"
      ],
      "topics": [
        "Метрики LCP, INP, CLS та як їх покращити за допомогою Lighthouse",
        "Оптимізація зображень (next/image, WebP/AVIF) та шрифтів",
        "Code splitting, динамічні імпорти (React.lazy) та tree shaking",
        "SEO: OpenGraph, Meta-теги, robots.txt, dynamic sitemap"
      ],
      "completedTopics": []
    },
    {
      "id": "fe-architecture",
      "title": "Frontend Архітектура & Безпека",
      "icon": "🏛️",
      "tier": 5,
      "branch": "Продуктивність & Архітектура",
      "description": "Feature-Sliced Design (FSD), захист від XSS та CSRF, CSP заголовки, мікрофронтенди та автоматичний деплой.",
      "whyImportant": "Дозволяє масштабувати кодову базу додатку на десятки розробників без втрати якості та швидкості розробки.",
      "status": "locked",
      "prerequisites": [
        "fe-perf-seo"
      ],
      "topics": [
        "Feature-Sliced Design (FSD) або Модульна структура компонентів",
        "Безпека клієнта: захист від XSS, CSRF, CSP заголовки",
        "Мікрофронтенди (Module Federation) для великих проектів",
        "CI/CD деплоймент: Vercel, Cloudflare Pages, Docker контейнери"
      ],
      "completedTopics": []
    }
  ]
};
export const BACKEND_ROADMAP_TEMPLATE = {
  "id": "backend-core",
  "title": "Backend Розробник (Node.js / Python / Microservices)",
  "description": "Покрокова карта розвитку інженера бекенду від алгоритмів та реляційних баз даних до асинхронних черг, кешування Redis, gRPC та мікросервісів.",
  "targetRole": "Backend Developer",
  "branches": [
    "Основи & Мови",
    "Бази Даних & Сховища",
    "API & Протоколи",
    "Безпека & Архітектура",
    "Highload & Розподілені Системи"
  ],
  "nodes": [
    {
      "id": "be-cs-algo",
      "title": "CS Базис, Алгоритми & Структури",
      "icon": "🧠",
      "tier": 1,
      "branch": "Основи & Мови",
      "description": "Складність алгоритмів (Big O), базові структури даних (масиви, стеки, черги, хеш-таблиці, дерева) та пошук/сортування.",
      "whyImportant": "Допомагає писати оптимізований код та уникати витоків пам'яті чи зависань під навантаженням.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Оцінка складності алгоритмів за часом та пам'яттю (Big O)",
        "Масиви, зв'язані списки, стеки, черги, хеш-таблиці",
        "Дерева та бінарний пошук, обхід графів (BFS, DFS)",
        "Базове розуміння роботи процесів та потоків (Threads vs Processes)"
      ],
      "completedTopics": []
    },
    {
      "id": "be-lang-core",
      "title": "Бекенд мова (Node.js / Python / Go)",
      "icon": "💻",
      "tier": 1,
      "branch": "Основи & Мови",
      "description": "Глибоке володіння синтаксисом, асинхронним вводом-виводом (Event Loop / Goroutines / AsyncIO), робота з файлами та пакетами.",
      "whyImportant": "Основний інструмент для реалізації бізнес-логіки та обробки запитів.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Синтаксис, стандартна бібліотека та принципи ООП / Функціонального коду",
        "Асинхронний non-blocking I/O та робота пулу потоків",
        "Робота з файловою системою, потоками (Streams) та буферами",
        "Керування пакетами та модульна структура проекту"
      ],
      "completedTopics": []
    },
    {
      "id": "be-git",
      "title": "Git & Командна розробка",
      "icon": "🌿",
      "tier": 1,
      "branch": "Основи & Мови",
      "description": "Контроль версій, branching strategies, рев'ю коду, лінтери, автоформатування та семантичне версіонування.",
      "whyImportant": "Забезпечує прозору командну роботу та відстеження історії змін сервісів.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Контроль версій, branching, cherry-pick, PR рев'ю",
        "Семантичне версіонування (SemVer) релізів",
        "Лінтери (ESLint, Ruff) та автоформаттери коду"
      ],
      "completedTopics": []
    },
    {
      "id": "be-sql-rdbms",
      "title": "PostgreSQL & Реляційні БД",
      "icon": "🗄️",
      "tier": 2,
      "branch": "Бази Даних & Сховища",
      "description": "Проектування реляційних схем, складні SQL запити, індекси, транзакції та рівні ізоляції ACID.",
      "whyImportant": "Реляційні бази даних є головним надійним сховищем фінансових та користувацьких даних додатку.",
      "status": "locked",
      "prerequisites": [
        "be-lang-core"
      ],
      "topics": [
        "Проектування схем, нормалізація (1NF-3NF) та foreign keys",
        "Складні JOIN, групування, агрегатні та віконні функції",
        "Індекси (B-Tree, GIN, Hash) та аналіз запитів (EXPLAIN ANALYZE)",
        "Транзакції, рівні ізоляції (ACID) та запобігання race conditions"
      ],
      "completedTopics": []
    },
    {
      "id": "be-rest-api",
      "title": "RESTful API & HTTP Стандарти",
      "icon": "🔌",
      "tier": 2,
      "branch": "API & Протоколи",
      "description": "Проектування REST ендпоінтів, правильні HTTP методи та статус-коди, пагінація, валідація схем та OpenAPI документація.",
      "whyImportant": "Стандарт взаємодії бекенду з фронтендом, мобільними додатками та зовнішніми інтеграціями.",
      "status": "locked",
      "prerequisites": [
        "be-lang-core"
      ],
      "topics": [
        "HTTP методи (GET, POST, PUT, PATCH, DELETE), статус-коди та headers",
        "Пагінація (cursor-based vs offset), фільтрація та сортування",
        "Валідація вхідних даних (DTO, схеми) та єдиний формат помилок",
        "Автоматична документація через OpenAPI / Swagger"
      ],
      "completedTopics": []
    },
    {
      "id": "be-auth-sec",
      "title": "Автентифікація & Безпека Бекенду",
      "icon": "🛡️",
      "tier": 3,
      "branch": "Безпека & Архітектура",
      "description": "Хешування паролів, JWT (Access + Refresh токени), сесії, OAuth2/OIDC та захист від типових атак (SQLi, Rate Limiting).",
      "whyImportant": "Захищає акаунти користувачів від несанкціонованого доступу та атак на відмову в обслуговуванні.",
      "status": "locked",
      "prerequisites": [
        "be-rest-api"
      ],
      "topics": [
        "Хешування паролів (Bcrypt, Argon2) та правила зберігання",
        "JWT (Access + Refresh токени) та Cookie session-based auth",
        "OAuth 2.0 / OpenID Connect (Google, GitHub провайдери)",
        "Захист від SQL Injection, CORS налаштування, Rate Limiting"
      ],
      "completedTopics": []
    },
    {
      "id": "be-redis-cache",
      "title": "Redis: Кешування & In-Memory Сховище",
      "icon": "⚡",
      "tier": 3,
      "branch": "Бази Даних & Сховища",
      "description": "Використання Redis для кешування важких запитів, збереження сесій, черг завдань та розподілених блокувань.",
      "whyImportant": "Прискорює відповіді сервісу в десятки разів за рахунок читання з оперативної пам'яті.",
      "status": "locked",
      "prerequisites": [
        "be-sql-rdbms"
      ],
      "topics": [
        "Структури даних Redis: Strings, Hashes, Lists, Sets, Sorted Sets",
        "Стратегії кешування (Cache-Aside, Write-Through, TTL)",
        "Розподілені блокування (Distributed locks / Redlock)",
        "Pub/Sub механізм у Redis для швидких сповіщень"
      ],
      "completedTopics": []
    },
    {
      "id": "be-docker",
      "title": "Docker для Бекенд-сервісів",
      "icon": "🐳",
      "tier": 3,
      "branch": "Безпека & Архітектура",
      "description": "Створення легких Docker-образів додатку, багатоконтейнерне середовище через Docker Compose (App + DB + Redis).",
      "whyImportant": "Гарантує однаковий запуск бекенду на комп'ютері розробника, в CI та на бойовому сервері.",
      "status": "locked",
      "prerequisites": [
        "be-lang-core"
      ],
      "topics": [
        "Написання оптимізованих Dockerfile для сервісу",
        "Зв'язок сервісів через Docker Compose (Сервер + Postgres + Redis)",
        "Управління конфігураціями через Environment variables",
        "Збереження даних через Volumes"
      ],
      "completedTopics": []
    },
    {
      "id": "be-queues",
      "title": "Брокери повідомлень (RabbitMQ / Kafka)",
      "icon": "📬",
      "tier": 4,
      "branch": "Highload & Розподілені Системи",
      "description": "Асинхронна обробка завдань у фоні, черги повідомлень, Event-Driven підхід та надійність доставки.",
      "whyImportant": "Дозволяє серверам відповідати миттєво, виконуючи важкі задачі (листи, генерацію звітів) у фоні.",
      "status": "locked",
      "prerequisites": [
        "be-redis-cache",
        "be-docker"
      ],
      "topics": [
        "Асинхронна обробка фонових задач (Background workers)",
        "Черги, Exchanges, Routing keys у RabbitMQ",
        "Event-Driven архітектура та топіки у Kafka",
        "Гарантії доставки: At-least-once, Dead Letter Queues (DLQ)"
      ],
      "completedTopics": []
    },
    {
      "id": "be-grpc-websockets",
      "title": "gRPC, Protobuf & WebSockets",
      "icon": "📡",
      "tier": 4,
      "branch": "API & Протоколи",
      "description": "Швидкий бінарний протокол gRPC для міжсервісної комунікації та WebSockets для двостороннього зв'язку в реальному часі.",
      "whyImportant": "Забезпечує мінімальні затримки передачі даних та стрімінг у високонавантажених системах.",
      "status": "locked",
      "prerequisites": [
        "be-rest-api"
      ],
      "topics": [
        "Protocol Buffers: строга схема сервісів та швидка серіалізація",
        "gRPC клієнт-серверна комунікація та двосторонній стрімінг",
        "WebSockets для реального часу (чати, онлайн-оновлення)",
        "RPC vs REST: вибір для внутрішніх та публічних API"
      ],
      "completedTopics": []
    },
    {
      "id": "be-microservices",
      "title": "Мікросервісна Архітектура & Патерни",
      "icon": "🧩",
      "tier": 5,
      "branch": "Highload & Розподілені Системи",
      "description": "Декомпозиція моноліту, API Gateway, розподілені транзакції (Saga, Outbox), Circuit Breaker.",
      "whyImportant": "Дозволяє великим командам незалежно розробляти, деплоїти та масштабувати окремі сервіси.",
      "status": "locked",
      "prerequisites": [
        "be-queues",
        "be-grpc-websockets"
      ],
      "topics": [
        "Декомпозиція моноліту, межі контекстів (Domain-Driven Design)",
        "API Gateway та Service Discovery",
        "Розподілені транзакції: Saga паттерн та Transactional Outbox",
        "Circuit Breaker та стійкість до збоїв залежних сервісів"
      ],
      "completedTopics": []
    },
    {
      "id": "be-highload-obs",
      "title": "Highload, Масштабування & Observability",
      "icon": "📈",
      "tier": 5,
      "branch": "Highload & Розподілені Системи",
      "description": "Горизонтальне масштабування, шардування БД, реплікація, збір метрик та розподілений трейсинг (OpenTelemetry).",
      "whyImportant": "Підтримує стабільну роботу додатку при мільйонах запитів на добу.",
      "status": "locked",
      "prerequisites": [
        "be-microservices"
      ],
      "topics": [
        "Горизонтальне масштабування та Load Balancing",
        "Шардування та реплікація баз даних (Read replicas, Write master)",
        "Логування, метрики та Distributed Tracing (OpenTelemetry)",
        "Профілювання пам'яті та пошук CPU bottleneck"
      ],
      "completedTopics": []
    }
  ]
};
export const QA_AUTOMATION_ROADMAP_TEMPLATE = {
  "id": "qa-core",
  "title": "QA Automation Інженер (Playwright / Python / CI/CD)",
  "description": "Покрокова карта прокачки інженера з автоматизації тестування від тест-дизайну та API тестування до сучасних E2E фреймворків, навантажувальних тестів та CI/CD.",
  "targetRole": "QA Automation Engineer",
  "branches": [
    "Теорія & Основи",
    "Програмування для QA",
    "API Автоматизація",
    "UI / E2E Автоматизація",
    "CI/CD & Навантаження"
  ],
  "nodes": [
    {
      "id": "qa-theory",
      "title": "Теорія тестування & Test Design",
      "icon": "📋",
      "tier": 1,
      "branch": "Теорія & Основи",
      "description": "Рівні тестування, техніки тест-дизайну (еквівалентні класи, граничні значення), життєвий цикл дефекту та баг-репорти.",
      "whyImportant": "Тест-дизайн дозволяє знаходити максимальну кількість критичних дефектів при мінімальній кількості автотестів.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Рівні тестування (Unit, Integration, System, Acceptance)",
        "Техніки тест-дизайну: Equivalence Partitioning, Boundary Value, Decision Table",
        "Складання тест-планів, тест-кейсів та баг-репортів",
        "Життєвий цикл дефекту та баг-трекери (Jira)"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-git",
      "title": "Git & Основи Linux для QA",
      "icon": "🌿",
      "tier": 1,
      "branch": "Теорія & Основи",
      "description": "Робота з Git для збереження автотестів, команди Linux для перевірки логів сервера та запуск тестів через CLI.",
      "whyImportant": "Необхідний мінімум для запуску тестів у терміналі та взаємодії з репозиторієм проекту.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Базові команди Git: commit, branch, merge, PR",
        "Робота з терміналом Linux: файли, логи, права",
        "Організація структури репозиторію з автотестами"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-lang",
      "title": "Python або TypeScript для автоматизатора",
      "icon": "🐍",
      "tier": 2,
      "branch": "Програмування для QA",
      "description": "ООП, базові структури даних, робота з JSON/файлами, тестові фреймворки (Pytest / Vitest), фікстури та assertions.",
      "whyImportant": "Мова програмування — головний робочий інструмент для створення надійних тестових сценаріїв.",
      "status": "locked",
      "prerequisites": [
        "qa-git"
      ],
      "topics": [
        "Базові типи даних, колекції, функції та ООП",
        "Робота з файлами (JSON, CSV, YAML)",
        "Тестові фреймворки: Pytest або Jest/Vitest",
        "Фікстури, параметризація тестів та assertions"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-api-manual",
      "title": "Тестування API: Postman & HTTP",
      "icon": "📬",
      "tier": 2,
      "branch": "API Автоматизація",
      "description": "Розуміння протоколу HTTP, методів, заголовків, написання тестових перевірок у Postman та запуск через Newman.",
      "whyImportant": "API тести виконуються на порядок швидше за UI тести та покривають основну бізнес-логіку додатку.",
      "status": "locked",
      "prerequisites": [
        "qa-theory"
      ],
      "topics": [
        "Методи HTTP, статус-коди, заголовки та cookies",
        "Створення колекцій та оточень у Postman",
        "Написання автоперевірок на JavaScript у Postman",
        "Запуск колекцій через Newman у консолі"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-sql",
      "title": "SQL для валідації даних",
      "icon": "🗄️",
      "tier": 2,
      "branch": "Теорія & Основи",
      "description": "Написання SELECT запитів, перевірка коректності запису даних у базу після виконання дій користувача.",
      "whyImportant": "Дозволяє перевірити реальний стан бази даних, а не лише відповідь інтерфейсу.",
      "status": "locked",
      "prerequisites": [
        "qa-theory"
      ],
      "topics": [
        "Базові SELECT запити, фільтрація WHERE та сортування",
        "JOIN декількох таблиць для перевірки цілісності",
        "Перевірка стану БД після виконання тестів"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-api-auto",
      "title": "Автоматизація API (Requests / Playwright API)",
      "icon": "⚡",
      "tier": 3,
      "branch": "API Автоматизація",
      "description": "Створення клієнта API для тестів, автоматизація авторизації, перевірка JSON-схеми відповідей та генерація тестових даних.",
      "whyImportant": "Формує надійну базу для інтеграційного тестування сервісів.",
      "status": "locked",
      "prerequisites": [
        "qa-lang",
        "qa-api-manual"
      ],
      "topics": [
        "Написання API-клієнта з автоматичним керуванням токенами",
        "Валідація JSON-схеми відповідей (Pydantic / Zod / jsonschema)",
        "Перевірка статус-кодів, тіла та часу відповіді",
        "Генерація динамічних тестових даних з бібліотекою Faker"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-playwright-e2e",
      "title": "E2E Автоматизація з Playwright",
      "icon": "🎭",
      "tier": 3,
      "branch": "UI / E2E Автоматизація",
      "description": "Сучасний веб-драйвер Playwright: стабільні локатори, автоочікування елементів, архітектура Page Object Model (POM).",
      "whyImportant": "Playwright став новим стандартом індустрії завдяки швидкості та відсутності 'флаків' (flaky tests).",
      "status": "locked",
      "prerequisites": [
        "qa-lang"
      ],
      "topics": [
        "Локатори та селектори (Role, Text, CSS)",
        "Автоматичне очікування (Auto-waiting) та дії з елементами",
        "Page Object Model (POM) архітектура тестів",
        "Робота з кількома вкладками, фреймами та діалогами"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-advanced-ui",
      "title": "Розширене E2E: Скріншоти & Network Mocking",
      "icon": "👁️",
      "tier": 4,
      "branch": "UI / E2E Автоматизація",
      "description": "Візуальне регресійне тестування, мокінг мережевих відповідей, збереження стану авторизації та детальні звіти Allure.",
      "whyImportant": "Дозволяє тестувати складні сценарії (помилки сервера, нестачу коштів) без зміни бекенду.",
      "status": "locked",
      "prerequisites": [
        "qa-playwright-e2e"
      ],
      "topics": [
        "Visual Regression Testing (порівняння скріншотів піксель-в-піксель)",
        "Перехоплення мережевих запитів та Mocking відповідей API",
        "Збереження стану авторизації (Storage State)",
        "Генерація наочних звітів з Allure Report"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-cicd",
      "title": "Інтеграція тестів у CI/CD (GitHub Actions)",
      "icon": "🚀",
      "tier": 4,
      "branch": "CI/CD & Навантаження",
      "description": "Паралельний запуск автотестів при створенні Pull Request, збереження артефактів (відео падінь, скріншоти) та сповіщення.",
      "whyImportant": "Забезпечує якість коду ще до його потрапляння в основну гілку проекту.",
      "status": "locked",
      "prerequisites": [
        "qa-api-auto",
        "qa-playwright-e2e"
      ],
      "topics": [
        "Запуск автотестів при Pull Request у GitHub Actions",
        "Паралельний запуск тестів у кількох контейнерах (sharding)",
        "Збереження артефактів: логи, скріншоти падінь, trace viewer",
        "Сповіщення команди про результати прогону (Telegram/Slack)"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-perf-k6",
      "title": "Навантажувальне тестування (k6)",
      "icon": "⏱️",
      "tier": 5,
      "branch": "CI/CD & Навантаження",
      "description": "Скрипти навантажувального тестування на JavaScript у k6: вимірювання RPS, перцентилів p95/p99 та стрес-тести.",
      "whyImportant": "Допомагає знайти межу витривалості сервера до того, як вона викличе збій у користувачів.",
      "status": "locked",
      "prerequisites": [
        "qa-cicd",
        "qa-api-auto"
      ],
      "topics": [
        "Види навантаження: Smoke, Load, Stress, Spike тестування",
        "Написання скриптів навантаження на JavaScript у k6",
        "Визначення порогів продуктивності (Thresholds: p95, p99)",
        "Аналіз графіків відгуку сервера та пошук вузьких місць"
      ],
      "completedTopics": []
    },
    {
      "id": "qa-arch-lead",
      "title": "Тест-стратегія & QA Lead практики",
      "icon": "🏆",
      "tier": 5,
      "branch": "CI/CD & Навантаження",
      "description": "Побудова тестової піраміди, розрахунок окупності автоматизації (ROI), Quality Gates та аудит якості процесів.",
      "whyImportant": "Формує зрілу культуру якості в інженерній команді компанії.",
      "status": "locked",
      "prerequisites": [
        "qa-perf-k6",
        "qa-advanced-ui"
      ],
      "topics": [
        "Піраміда тестування та розрахунок окупності автоматизації (ROI)",
        "Побудова Test Automation Framework з нуля",
        "Метрики якості: Test Coverage, Flaky tests rate, Defect Leakage",
        "Впровадження Quality Gates у релізний цикл"
      ],
      "completedTopics": []
    }
  ]
};
export const AI_ML_ROADMAP_TEMPLATE = {
  "id": "ai-ml-core",
  "title": "AI & Machine Learning Інженер (Python / PyTorch / LLM)",
  "description": "Покрокова карта розвитку фахівця зі штучного інтелекту: від математичного базису та Pandas/Scikit-Learn до глибокого навчання (PyTorch), LLM, RAG та MLOps.",
  "targetRole": "AI & Machine Learning Engineer",
  "branches": [
    "Математика & Data Science",
    "Класичний Machine Learning",
    "Deep Learning & Нейромережі",
    "NLP & Generative AI",
    "MLOps & Продакшн"
  ],
  "nodes": [
    {
      "id": "ai-math-python",
      "title": "Python для AI & Математичний базис",
      "icon": "🐍",
      "tier": 1,
      "branch": "Математика & Data Science",
      "description": "Лінійна алгебра (матриці, вектори), теорія ймовірностей, математична статистика, градієнтний спуск та робота в Jupyter.",
      "whyImportant": "Математика — мова, на якій побудовані алгоритми машинного навчання та нейромережі.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Лінійна алгебра: вектори, матриці, скалярний добуток, власні числа",
        "Теорія ймовірностей та розподіли випадкових величин",
        "Похідні, часткові похідні та градієнтний спуск",
        "Python: віртуальні оточення, Jupyter Notebooks"
      ],
      "completedTopics": []
    },
    {
      "id": "ai-pandas-numpy",
      "title": "Обробка даних: NumPy & Pandas",
      "icon": "📊",
      "tier": 1,
      "branch": "Математика & Data Science",
      "description": "Векторизовані обчислення у NumPy, обробка табличних даних у Pandas, очищення даних та візуалізація.",
      "whyImportant": "80% роботи ML-інженера — це підготовка, фільтрація та агрегація якісних даних.",
      "status": "locked",
      "prerequisites": [
        "ai-math-python"
      ],
      "topics": [
        "Векторизовані операції з масивами у NumPy",
        "DataFrames у Pandas: фільтрація, групування, злиття",
        "Очищення даних: робота з пропусками та викидами",
        "Візуалізація: Matplotlib та Seaborn графіки"
      ],
      "completedTopics": []
    },
    {
      "id": "ai-feature-eng",
      "title": "Feature Engineering & EDA",
      "icon": "🔧",
      "tier": 2,
      "branch": "Математика & Data Science",
      "description": "Дослідницький аналіз даних (EDA), кодування ознак, нормалізація, робота з часовими рядами та текстовими фічами.",
      "whyImportant": "Якісні ознаки (features) дають більший приріст точності моделі, ніж ускладнення її архітектури.",
      "status": "locked",
      "prerequisites": [
        "ai-pandas-numpy"
      ],
      "topics": [
        "Дослідницький аналіз даних (Exploratory Data Analysis)",
        "Кодування категоріальних змінних (One-Hot, Target Encoding)",
        "Нормалізація та стандартизація ознак (MinMax, StandardScaler)",
        "Робота з часовими рядами та текстовими даними"
      ],
      "completedTopics": []
    },
    {
      "id": "ai-classic-ml",
      "title": "Класичний ML зі Scikit-Learn",
      "icon": "🤖",
      "tier": 2,
      "branch": "Класичний Machine Learning",
      "description": "Лінійна та логістична регресія, дерева рішень, Random Forest, кластеризація та метрики точності (F1, ROC-AUC).",
      "whyImportant": "Швидкі та інтерпретовані алгоритми, які є першим вибором для більшості табличних бізнес-задач.",
      "status": "locked",
      "prerequisites": [
        "ai-feature-eng"
      ],
      "topics": [
        "Лінійна та логістична регресія для прогнозів та класифікації",
        "Дерева рішень та ансамблі Random Forest",
        "Кластеризація (K-Means, DBSCAN) та PCA (зниження розмірності)",
        "Метрики оцінки: Accuracy, Precision, Recall, F1-score, ROC-AUC"
      ],
      "completedTopics": []
    },
    {
      "id": "ai-gradient-boosting",
      "title": "Градієнтний бустинг (XGBoost / LightGBM)",
      "icon": "⚡",
      "tier": 3,
      "branch": "Класичний Machine Learning",
      "description": "Побудова ансамблів над деревами рішень, тюнінг гіперпараметрів за допомогою Optuna та інтерпретація за допомогою SHAP.",
      "whyImportant": "Найпотужніший клас алгоритмів для табличних даних, що виграє переважну більшість змагань Kaggle.",
      "status": "locked",
      "prerequisites": [
        "ai-classic-ml"
      ],
      "topics": [
        "Принцип побудови ансамблів та бустинг над деревами",
        "Оптимізація гіперпараметрів (Optuna, GridSearch)",
        "Робота з незбалансованими датасетами",
        "Інтерпретація моделей (SHAP values, Feature Importance)"
      ],
      "completedTopics": []
    },
    {
      "id": "ai-pytorch-basics",
      "title": "Deep Learning & PyTorch",
      "icon": "🔥",
      "tier": 3,
      "branch": "Deep Learning & Нейромережі",
      "description": "Обчислювальний граф, autograd, повнозв'язні нейромережі (MLP), loss-функції, оптимізатори (AdamW) та цикл навчання.",
      "whyImportant": "PyTorch — головний інструмент досліджень та розробки сучасних нейромереж у світі.",
      "status": "locked",
      "prerequisites": [
        "ai-classic-ml"
      ],
      "topics": [
        "Тензори у PyTorch, обчислювальний граф та autograd",
        "Побудова повнозв'язних нейромереж (MLP)",
        "Функції активації (ReLU, GELU) та loss-функції (Cross-Entropy, MSE)",
        "Оптимізатори: AdamW, SGD, Learning Rate Schedulers"
      ],
      "completedTopics": []
    },
    {
      "id": "ai-cnn-vision",
      "title": "Комп'ютерний зір (CNN, ResNet, YOLO)",
      "icon": "👁️",
      "tier": 4,
      "branch": "Deep Learning & Нейромережі",
      "description": "Згорткові нейромережі, Transfer Learning на готових моделях (ResNet, EfficientNet), виявлення об'єктів за допомогою YOLO.",
      "whyImportant": "Дозволяє комп'ютерам аналізувати зображення та відеопотоки в реальному часі.",
      "status": "locked",
      "prerequisites": [
        "ai-pytorch-basics"
      ],
      "topics": [
        "Згорткові шари (Convolution, Pooling, Batch Normalization)",
        "Класифікація зображень та Transfer Learning (ResNet, EfficientNet)",
        "Детекція об'єктів за допомогою YOLO",
        "Аугментація зображень (Albumentations)"
      ],
      "completedTopics": []
    },
    {
      "id": "ai-transformers-nlp",
      "title": "Трансформери & Hugging Face",
      "icon": "📖",
      "tier": 4,
      "branch": "NLP & Generative AI",
      "description": "Архітектура Transformer, механізм Attention, токенізація, робота з відкритими моделями на Hugging Face.",
      "whyImportant": "Трансформери здійснили революцію в обробці природної мови і лягли в основу всіх сучасних LLM.",
      "status": "locked",
      "prerequisites": [
        "ai-pytorch-basics"
      ],
      "topics": [
        "Механізм Attention (Self-Attention, Multi-Head)",
        "Архітектура Transformer (Encoder / Decoder)",
        "Бібліотека Hugging Face Transformers та Datasets",
        "Токенізація тексту (BPE, WordPiece) та ембеддінги"
      ],
      "completedTopics": []
    },
    {
      "id": "ai-llm-rag",
      "title": "LLM, RAG & Векторні бази даних",
      "icon": "🧠",
      "tier": 5,
      "branch": "NLP & Generative AI",
      "description": "Побудова систем RAG з векторними базами (pgvector, Chroma), розробка агентів (LangChain/LlamaIndex), Prompt Engineering.",
      "whyImportant": "Найгарячіший напрямок сучасної розробки штучного інтелекту для бізнесу.",
      "status": "locked",
      "prerequisites": [
        "ai-transformers-nlp"
      ],
      "topics": [
        "Побудова Retrieval-Augmented Generation (RAG) систем",
        "Векторні бази даних: pgvector, Chroma, Pinecone",
        "Фреймворки розробки агентів: LangChain, LlamaIndex",
        "Prompt Engineering, structured JSON outputs, Function calling"
      ],
      "completedTopics": []
    },
    {
      "id": "ai-mlops",
      "title": "MLOps: Деплой & Трекінг моделей",
      "icon": "🏭",
      "tier": 5,
      "branch": "MLOps & Продакшн",
      "description": "Трекінг експериментів (MLflow), сервінг моделей через FastAPI або vLLM, квантизація та моніторинг Data Drift.",
      "whyImportant": "Перетворює експерименти в Jupyter Notebook на надійний бізнес-сервіс у продакшені.",
      "status": "locked",
      "prerequisites": [
        "ai-llm-rag",
        "ai-gradient-boosting"
      ],
      "topics": [
        "Трекінг експериментів та моделей через MLflow / W&B",
        "Сервінг моделей через FastAPI або vLLM / Triton Server",
        "Квантизація та оптимізація інференсу (ONNX, TensorRT, GGUF)",
        "Моніторинг зсуву даних (Data Drift) у продакшені"
      ],
      "completedTopics": []
    }
  ]
};
export const CYBERSECURITY_ROADMAP_TEMPLATE = {
  "id": "cybersec-core",
  "title": "Cybersecurity & AppSec Спеціаліст (OWASP / DevSecOps)",
  "description": "Покрокова карта розвитку фахівця з кібербезпеки: від мережевого аудиту та криптографії до пошуку веб-вразливостей OWASP, DevSecOps та реагування на інциденти.",
  "targetRole": "Cybersecurity Specialist",
  "branches": [
    "Мережі & Системи",
    "Криптографія & Захист",
    "Веб & AppSec",
    "DevSecOps & Сканування",
    "SecOps & Реагування"
  ],
  "nodes": [
    {
      "id": "sec-net-foundations",
      "title": "Мережева безпека & Протоколи",
      "icon": "🌐",
      "tier": 1,
      "branch": "Мережі & Системи",
      "description": "Аналіз пакетів за допомогою Wireshark, сканування портів Nmap, аналіз TCP/IP сесій та конфігурація фаєрволів.",
      "whyImportant": "Більшість атак відбуваються через мережеві інтерфейси та відкриті порти.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Аналіз пакетів з Wireshark та tcpdump",
        "TCP/IP стек, порти, DNS та маршрутизація",
        "Робота з фаєрволами (iptables, nftables, ufw)",
        "Протоколи VPN: WireGuard, OpenVPN, IPsec"
      ],
      "completedTopics": []
    },
    {
      "id": "sec-linux-hardening",
      "title": "Безпека Linux & Hardening",
      "icon": "🐧",
      "tier": 1,
      "branch": "Мережі & Системи",
      "description": "Налаштування безпеки операційної системи Linux: права доступу, SSH hardening, 2FA, Fail2ban, SELinux / AppArmor.",
      "whyImportant": "Захищає серверну інфраструктуру від закріплення зловмисника у системі.",
      "status": "available",
      "prerequisites": [],
      "topics": [
        "Налаштування прав, sudoers, SUID/SGID біти",
        "SSH hardening: ключі, 2FA, відключення root паролів",
        "Аудит системи: fail2ban, auditd, logwatch",
        "Концепції SELinux та AppArmor"
      ],
      "completedTopics": []
    },
    {
      "id": "sec-crypto",
      "title": "Прикладна криптографія",
      "icon": "🔐",
      "tier": 2,
      "branch": "Криптографія & Захист",
      "description": "Симетричне та асиметричне шифрування (AES, RSA, ECC), криптографічні хеші (SHA-256), сертифікати X.509 та PKI інфраструктура.",
      "whyImportant": "Забезпечує конфіденційність та цілісність даних при передачі та зберіганні.",
      "status": "locked",
      "prerequisites": [
        "sec-net-foundations"
      ],
      "topics": [
        "Симетричне шифрування (AES-GCM, ChaCha20)",
        "Асиметричне шифрування (RSA, Ed25519, ECDSA)",
        "Криптографічні хеш-функції (SHA-256, BLAKE3)",
        "SSL/TLS рукостискання, сертифікати X.509 та PKI"
      ],
      "completedTopics": []
    },
    {
      "id": "sec-owasp-top10",
      "title": "Веб-вразливості & OWASP Top 10",
      "icon": "🕷️",
      "tier": 2,
      "branch": "Веб & AppSec",
      "description": "Аналіз головних веб-вразливостей: SQL Injection, XSS, CSRF, SSRF, IDOR, Broken Authentication.",
      "whyImportant": "OWASP Top 10 покриває 95% векторів атак на веб-додатки та API.",
      "status": "locked",
      "prerequisites": [
        "sec-net-foundations"
      ],
      "topics": [
        "SQL Injection та Command Injection",
        "Cross-Site Scripting (XSS: Stored, Reflected, DOM)",
        "Cross-Site Request Forgery (CSRF) та SameSite cookies",
        "Server-Side Request Forgery (SSRF) та Broken Access Control"
      ],
      "completedTopics": []
    },
    {
      "id": "sec-appsec-tools",
      "title": "Тестування на проникнення: Burp Suite & ZAP",
      "icon": "🔍",
      "tier": 3,
      "branch": "Веб & AppSec",
      "description": "Перехоплення трафіку додатку через проксі Burp Suite, фаззинг параметрів, аналіз відповідей та пошук логічних дірок.",
      "whyImportant": "Дозволяє знайти вразливість до того, як її виявлять зловмисники у мережі.",
      "status": "locked",
      "prerequisites": [
        "sec-owasp-top10"
      ],
      "topics": [
        "Перехоплення та модифікація HTTP запитів у Burp Suite",
        "Автоматизоване сканування вразливостей з OWASP ZAP",
        "Фаззинг параметрів та перебір шляхів (ffuf, gobuster)",
        "Аналіз логіки бізнес-вразливостей"
      ],
      "completedTopics": []
    },
    {
      "id": "sec-devsecops",
      "title": "DevSecOps & Безпека коду (SAST/DAST)",
      "icon": "🛡️",
      "tier": 3,
      "branch": "DevSecOps & Сканування",
      "description": "Інтеграція перевірок безпеки в CI/CD: статичний аналіз коду (SonarQube/Semgrep), пошук витоку ключів та сканування CVE у залежностях.",
      "whyImportant": "Виправлення вразливості на етапі написання коду коштує в десятки разів дешевше, ніж після релізу.",
      "status": "locked",
      "prerequisites": [
        "sec-owasp-top10",
        "sec-linux-hardening"
      ],
      "topics": [
        "Статичний аналіз коду (SAST): SonarQube, Semgrep",
        "Сканування відкритих бібліотек на CVE (Snyk, Dependency-Check)",
        "Пошук захардкодженних секретів у Git (TruffleHog, Gitleaks)",
        "Інтеграція security checks у CI/CD пайплайни"
      ],
      "completedTopics": []
    },
    {
      "id": "sec-container-k8s",
      "title": "Безпека контейнерів & Kubernetes",
      "icon": "🐳",
      "tier": 4,
      "branch": "DevSecOps & Сканування",
      "description": "Сканування Docker-образів (Trivy), seccomp профілі, політики безпеки Kubernetes (NetworkPolicies, Pod Security Standards, Kyverno).",
      "whyImportant": "Запобігає втечі з контейнера (container escape) та компрометації сусідніх сервісів у кластері.",
      "status": "locked",
      "prerequisites": [
        "sec-devsecops"
      ],
      "topics": [
        "Сканування Docker-образів (Trivy, Grype)",
        "Non-root контейнери, readonly файлові системи, seccomp",
        "Kubernetes NetworkPolicies та RBAC права",
        "Політики безпеки: Kyverno або OPA Gatekeeper"
      ],
      "completedTopics": []
    },
    {
      "id": "sec-cloud-iam",
      "title": "Хмарна безпека (Cloud Security & IAM)",
      "icon": "☁️",
      "tier": 4,
      "branch": "SecOps & Реагування",
      "description": "Принцип найменших привілеїв у хмарі (IAM Least Privilege), захист хмарних сховищ, аналіз аудиторських логів (CloudTrail).",
      "whyImportant": "Помилки конфігурації хмарних прав є причиною понад 80% витоків корпоративних баз даних.",
      "status": "locked",
      "prerequisites": [
        "sec-crypto",
        "sec-net-foundations"
      ],
      "topics": [
        "Принцип мінімальних привілеїв (Least Privilege) в IAM",
        "Захист публічних сховищ (S3 buckets, storage permissions)",
        "Хмарні логи: AWS CloudTrail / GCP Cloud Audit",
        "Cloud Security Posture Management (CSPM)"
      ],
      "completedTopics": []
    },
    {
      "id": "sec-soc-siem",
      "title": "SIEM, Моніторинг атак & Трейсинг",
      "icon": "🚨",
      "tier": 5,
      "branch": "SecOps & Реагування",
      "description": "Збір логів безпеки в SIEM системі (Wazuh, Elastic Security), виявлення аномалій та правил Sigma, аналіз DDoS атак.",
      "whyImportant": "Дозволяє виявити атаку на ранніх стадіях проникнення та попередити втрату даних.",
      "status": "locked",
      "prerequisites": [
        "sec-cloud-iam",
        "sec-container-k8s"
      ],
      "topics": [
        "Централізований збір security логів у SIEM (Wazuh, Elastic Security)",
        "Створення правил виявлення загроз (Sigma rules)",
        "Аналіз мережевих аномалій та DDoS атак",
        "Threat Intelligence фіди та індикатори компрометації (IoC)"
      ],
      "completedTopics": []
    },
    {
      "id": "sec-incident-response",
      "title": "Incident Response & Forensics",
      "icon": "⚔️",
      "tier": 5,
      "branch": "SecOps & Реагування",
      "description": "План реагування на інциденти безпеки (NIST framework), збір цифрових доказів (Memory dump, диск), локалізація загрози та post-mortem.",
      "whyImportant": "Мінімізує фінансові та репутаційні збитки компанії при успішній атаці хакерів.",
      "status": "locked",
      "prerequisites": [
        "sec-soc-siem"
      ],
      "topics": [
        "Життєвий цикл реагування на інциденти (NIST / SANS)",
        "Цифрова криміналістика (Digital Forensics): дамп пам'яті, таймлайни",
        "Ізоляція скомпрометованих вузлів та ерадикація загрози",
        "Post-mortem аналіз та закриття вразливостей"
      ],
      "completedTopics": []
    }
  ]
};

export const POPULAR_ROADMAP_TEMPLATES = [
  DEVOPS_ROADMAP_TEMPLATE,
  FRONTEND_ROADMAP_TEMPLATE,
  BACKEND_ROADMAP_TEMPLATE,
  QA_AUTOMATION_ROADMAP_TEMPLATE,
  AI_ML_ROADMAP_TEMPLATE,
  CYBERSECURITY_ROADMAP_TEMPLATE,
];

const ROADMAP_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    targetRole: { type: 'STRING' },
    branches: { type: 'ARRAY', items: { type: 'STRING' } },
    nodes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          title: { type: 'STRING' },
          icon: { type: 'STRING' },
          tier: { type: 'INTEGER' },
          branch: { type: 'STRING' },
          description: { type: 'STRING' },
          whyImportant: { type: 'STRING' },
          prerequisites: { type: 'ARRAY', items: { type: 'STRING' } },
          topics: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['id', 'title', 'icon', 'tier', 'branch', 'description', 'prerequisites', 'topics'],
      },
    },
  },
  required: ['title', 'description', 'targetRole', 'branches', 'nodes'],
};

// Recomputes unlock states according to Diablo 2 skill tree mechanics
export function refreshSkillStates(nodes) {
  const completedIds = new Set(nodes.filter((n) => n.status === 'completed').map((n) => n.id));
  return nodes.map((node) => {
    if (node.status === 'completed') return node;
    const prereqs = Array.isArray(node.prerequisites) ? node.prerequisites : [];
    const allMet = prereqs.every((pid) => completedIds.has(pid));
    if (!allMet) {
      return { ...node, status: 'locked' };
    }
    if (node.status === 'locked') {
      return { ...node, status: 'available' };
    }
    return node;
  });
}

function applyUserProgressToRoadmap(roadmap, userProgressMap = {}) {
  const baseNodes = roadmap.nodes || [];
  const nodes = baseNodes.map((n) => {
    const p = userProgressMap[n.id];
    if (p) {
      return {
        ...n,
        status: p.status || (n.prerequisites?.length ? 'locked' : 'available'),
        completedTopics: Array.isArray(p.completedTopics) ? p.completedTopics : [],
      };
    }
    return {
      ...n,
      status: n.prerequisites?.length ? 'locked' : 'available',
      completedTopics: [],
    };
  });
  return {
    ...roadmap,
    nodes: refreshSkillStates(nodes),
  };
}

export function registerRoadmap({ route, send, readJson, q, tx, getUserId, isAdmin }) {
  // Ensure all 6 popular roadmaps exist and have clean default unlearned state in roadmaps table
  async function ensurePopularRoadmaps() {
    for (const t of POPULAR_ROADMAP_TEMPLATES) {
      const cleanNodes = t.nodes.map((n) => ({
        ...n,
        status: (n.prerequisites && n.prerequisites.length > 0) ? 'locked' : 'available',
        completedTopics: [],
      }));
      const nodesJson = JSON.stringify({
        branches: t.branches,
        nodes: cleanNodes,
      });

      const existing = await q('SELECT id FROM roadmaps WHERE id=?').get(t.id);
      if (!existing) {
        await q(
          'INSERT INTO roadmaps (id, user_id, title, description, target_role, nodes_json) VALUES (?,?,?,?,?,?)'
        ).run(t.id, 'admin', t.title, t.description, t.targetRole, nodesJson);
      } else {
        // Keep definition in sync with clean unlearned defaults
        await q(
          'UPDATE roadmaps SET title=?, description=?, target_role=?, nodes_json=? WHERE id=?'
        ).run(t.title, t.description, t.targetRole, nodesJson, t.id);
      }
    }
    // Also remove any legacy unanchored seeds if any
    try {
      await q("DELETE FROM roadmaps WHERE user_id='user' AND title LIKE '%DevOps%'").run();
    } catch {}
  }

  // Trigger seeding on startup
  ensurePopularRoadmaps().catch((err) => {
    console.error('Failed to ensure popular roadmaps:', err);
  });

  // GET /api/roadmaps - list all available roadmaps with current user's individual progress
  route('GET', '/api/roadmaps', async (req, res) => {
    const userId = getUserId ? getUserId(req, res) : 'user';
    const rows = await q('SELECT id, user_id, title, description, target_role, nodes_json, created_at, updated_at FROM roadmaps ORDER BY created_at ASC').all();

    // Load user's progress records from user_roadmap_progress table
    const progressRows = await q('SELECT roadmap_id, progress_json FROM user_roadmap_progress WHERE user_id=?').all(userId);
    const progressByRoadmap = new Map();
    for (const pr of progressRows) {
      try {
        progressByRoadmap.set(pr.roadmap_id, JSON.parse(pr.progress_json || '{}'));
      } catch {}
    }

    const roadmaps = rows.map((r) => {
      let parsed = { branches: [], nodes: [] };
      try { parsed = JSON.parse(r.nodes_json); } catch {}
      const rm = {
        id: r.id,
        userId: r.user_id,
        title: r.title,
        description: r.description,
        targetRole: r.target_role,
        branches: parsed.branches || [],
        nodes: parsed.nodes || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
      return applyUserProgressToRoadmap(rm, progressByRoadmap.get(r.id) || {});
    });

    send(res, 200, { roadmaps });
  });

  // GET /api/roadmaps/:id - single roadmap with current user's progress
  route('GET', '/api/roadmaps/:id', async (req, res, { id }) => {
    const userId = getUserId ? getUserId(req, res) : 'user';
    const row = await q('SELECT id, user_id, title, description, target_role, nodes_json, created_at, updated_at FROM roadmaps WHERE id=?').get(id);
    if (!row) return send(res, 404, { error: 'roadmap not found' });

    let parsed = { branches: [], nodes: [] };
    try { parsed = JSON.parse(row.nodes_json); } catch {}

    const progressRow = await q('SELECT progress_json FROM user_roadmap_progress WHERE user_id=? AND roadmap_id=?').get(userId, id);
    let userProgress = {};
    if (progressRow) {
      try { userProgress = JSON.parse(progressRow.progress_json || '{}'); } catch {}
    }

    const rm = {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      targetRole: row.target_role,
      branches: parsed.branches || [],
      nodes: parsed.nodes || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    send(res, 200, applyUserProgressToRoadmap(rm, userProgress));
  });

  // POST /api/roadmaps - create manual roadmap (ADMIN ONLY)
  route('POST', '/api/roadmaps', async (req, res) => {
    if (!isAdmin(req)) {
      return send(res, 403, { error: 'Тільки адміністратор може створювати нові карти розвитку' });
    }
    const userId = getUserId ? getUserId(req, res) : 'admin';
    const body = await readJson(req);
    const id = randomUUID();
    const title = String(body.title || 'Новий роадмап').trim();
    const description = String(body.description || '').trim();
    const targetRole = String(body.targetRole || title).trim();
    const branches = Array.isArray(body.branches) ? body.branches : [];
    const rawNodes = Array.isArray(body.nodes) ? body.nodes : [];

    // All skills are unlearned by default
    const cleanNodes = rawNodes.map((n) => ({
      ...n,
      status: (n.prerequisites && n.prerequisites.length > 0) ? 'locked' : 'available',
      completedTopics: [],
    }));
    const nodes = refreshSkillStates(cleanNodes);

    const nodesJson = JSON.stringify({ branches, nodes });
    await q('INSERT INTO roadmaps (id, user_id, title, description, target_role, nodes_json) VALUES (?,?,?,?,?,?)').run(
      id, userId, title, description, targetRole, nodesJson,
    );

    send(res, 201, {
      id,
      userId,
      title,
      description,
      targetRole,
      branches,
      nodes,
    });
  });

  // PATCH /api/roadmaps/:id - update user progress OR roadmap definition
  route('PATCH', '/api/roadmaps/:id', async (req, res, { id }) => {
    const userId = getUserId ? getUserId(req, res) : 'user';
    const body = await readJson(req);
    const existing = await q('SELECT id, user_id, title, description, target_role, nodes_json FROM roadmaps WHERE id=?').get(id);
    if (!existing) return send(res, 404, { error: 'roadmap not found' });

    let parsed = { branches: [], nodes: [] };
    try { parsed = JSON.parse(existing.nodes_json); } catch {}

    // Case 1: User is participating (updating their skill status or checking off topics)
    if (body.nodeId) {
      const targetNode = parsed.nodes.find((n) => n.id === body.nodeId);
      if (!targetNode) return send(res, 404, { error: 'node not found in roadmap' });

      // Fetch existing user progress from user_roadmap_progress
      const prRow = await q('SELECT progress_json FROM user_roadmap_progress WHERE user_id=? AND roadmap_id=?').get(userId, id);
      let userProgress = {};
      if (prRow) {
        try { userProgress = JSON.parse(prRow.progress_json || '{}'); } catch {}
      }

      const nodeState = userProgress[body.nodeId] || {
        status: targetNode.prerequisites?.length ? 'locked' : 'available',
        completedTopics: [],
      };

      if (body.status) {
        nodeState.status = body.status;
      }
      if (Array.isArray(body.completedTopics)) {
        nodeState.completedTopics = body.completedTopics;
      }
      if (body.toggleTopic) {
        const curSet = new Set(nodeState.completedTopics || []);
        if (curSet.has(body.toggleTopic)) {
          curSet.delete(body.toggleTopic);
        } else {
          curSet.add(body.toggleTopic);
        }
        nodeState.completedTopics = Array.from(curSet);

        // Auto-complete if all topics completed
        if (targetNode.topics?.length && nodeState.completedTopics.length === targetNode.topics.length) {
          nodeState.status = 'completed';
        }
      }

      userProgress[body.nodeId] = nodeState;
      const progressJson = JSON.stringify(userProgress);
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

      // Save user progress in user_roadmap_progress table
      await q(
        'INSERT INTO user_roadmap_progress (user_id, roadmap_id, progress_json, updated_at) VALUES (?,?,?,?) ON CONFLICT (user_id, roadmap_id) DO UPDATE SET progress_json = EXCLUDED.progress_json, updated_at = EXCLUDED.updated_at'
      ).run(userId, id, progressJson, nowStr);

      const rm = {
        id: existing.id,
        userId: existing.user_id,
        title: existing.title,
        description: existing.description,
        targetRole: existing.target_role,
        branches: parsed.branches || [],
        nodes: parsed.nodes || [],
        updatedAt: nowStr,
      };

      return send(res, 200, applyUserProgressToRoadmap(rm, userProgress));
    }

    // Case 2: Modifying roadmap definition / structure (ADMIN ONLY)
    if (!isAdmin(req)) {
      return send(res, 403, { error: 'Тільки адміністратор може редагувати структуру карти розвитку' });
    }

    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    const description = body.description !== undefined ? String(body.description).trim() : existing.description;
    const targetRole = body.targetRole !== undefined ? String(body.targetRole).trim() : existing.target_role;
    const branches = Array.isArray(body.branches) ? body.branches : parsed.branches;
    let nodes = Array.isArray(body.nodes) ? body.nodes : parsed.nodes;

    nodes = refreshSkillStates(nodes);
    const nodesJson = JSON.stringify({ branches, nodes });
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await q('UPDATE roadmaps SET title=?, description=?, target_role=?, nodes_json=?, updated_at=? WHERE id=?').run(
      title, description, targetRole, nodesJson, nowStr, id,
    );

    send(res, 200, {
      id,
      title,
      description,
      targetRole,
      branches,
      nodes,
      updatedAt: nowStr,
    });
  });

  // DELETE /api/roadmaps/:id - delete roadmap (ADMIN ONLY)
  route('DELETE', '/api/roadmaps/:id', async (req, res, { id }) => {
    if (!isAdmin(req)) {
      return send(res, 403, { error: 'Тільки адміністратор може видаляти карти розвитку' });
    }
    await q('DELETE FROM user_roadmap_progress WHERE roadmap_id=?').run(id);
    await q('DELETE FROM roadmaps WHERE id=?').run(id);
    send(res, 204);
  });

  // POST /api/roadmaps/generate - AI Skill Tree Generation (ADMIN ONLY)
  route('POST', '/api/roadmaps/generate', async (req, res) => {
    if (!isAdmin(req)) {
      return send(res, 403, { error: 'Тільки адміністратор може створювати та генерувати нові карти розвитку' });
    }

    loadEnvIfNeeded();
    const userId = getUserId ? getUserId(req, res) : 'admin';
    const body = await readJson(req);
    const prompt = String(body.prompt || '').trim();

    if (!prompt) {
      return send(res, 400, { error: 'Вкажіть професію або ціль для побудови роадмапу' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    let generated = null;

    if (apiKey) {
      try {
        const sysPrompt = `Ти експертний IT архітектор, техлід та геймдизайнер дерев розвитку (як у Diablo 2).
Твоє завдання — побудувати детальне, логічне дерево навичок (Roadmap / Skill Tree) для запиту користувача.

Вимоги:
1. Рівні (tier): від 1 до 5 (Tier 1 — фундаментальні основи, Tier 2 — ключові інструменти, Tier 3 — поглиблені практики, Tier 4 — складні екосистеми, Tier 5 — архітектура, надійність, оптимізація).
2. Загальна кількість навичок (nodes): від 10 до 16.
3. Кожна навичка повинна мати:
   - id: латинський унікальний slug (наприклад "linux-core", "docker-basics")
   - title: назва навички українською з англійськими термінами де потрібно
   - icon: відповідний тематичний емодзі (наприклад 🐧, 🐳, ⚡)
   - tier: число від 1 до 5
   - branch: назва однієї з категорій/гілок (наприклад "Контейнеризація", "Безпека")
   - description: 1-2 речення що це таке
   - whyImportant: 1 речення чому це критично знати
   - prerequisites: масив id попередніх навичок (для Tier 1 — порожній масив [])
   - topics: масив з 3-5 ключових конкретних тем/підпунктів для вивчення
4. Всі навички створюються НЕВИВЧЕНИМИ за замовчуванням (completedTopics порожні).
5. Відповідь поверни строго українською мовою у форматі JSON згідно схеми.`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: sysPrompt },
                  { text: `Запит користувача: "${prompt}". Побудуй повноцінну карту розвитку (Skill Tree).` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
              responseSchema: ROADMAP_SCHEMA,
            },
          }),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            generated = JSON.parse(text);
          }
        }
      } catch (err) {
        console.error('Gemini roadmap generation error:', err);
      }
    }

    // Fallback template if Gemini fails or no key
    if (!generated || !Array.isArray(generated.nodes) || generated.nodes.length === 0) {
      // Find closest template or pick DevOps
      const lower = prompt.toLowerCase();
      let matched = DEVOPS_ROADMAP_TEMPLATE;
      if (lower.includes('front') || lower.includes('react') || lower.includes('веб') || lower.includes('web')) matched = FRONTEND_ROADMAP_TEMPLATE;
      else if (lower.includes('back') || lower.includes('node') || lower.includes('сервер') || lower.includes('api')) matched = BACKEND_ROADMAP_TEMPLATE;
      else if (lower.includes('qa') || lower.includes('тест') || lower.includes('playwright') || lower.includes('автоматиз')) matched = QA_AUTOMATION_ROADMAP_TEMPLATE;
      else if (lower.includes('ai') || lower.includes('ml') || lower.includes('штучн') || lower.includes('модел') || lower.includes('data')) matched = AI_ML_ROADMAP_TEMPLATE;
      else if (lower.includes('sec') || lower.includes('безпек') || lower.includes('cyber') || lower.includes('owasp')) matched = CYBERSECURITY_ROADMAP_TEMPLATE;

      generated = {
        title: `${matched.title} (${prompt})`,
        description: matched.description,
        targetRole: prompt,
        branches: matched.branches,
        nodes: matched.nodes,
      };
    }

    const id = randomUUID();
    // Default all nodes to unlearned:
    const cleanNodes = generated.nodes.map((n) => ({
      ...n,
      status: (n.prerequisites && n.prerequisites.length > 0) ? 'locked' : 'available',
      completedTopics: [],
    }));
    const nodes = refreshSkillStates(cleanNodes);

    const nodesJson = JSON.stringify({
      branches: generated.branches || [],
      nodes,
    });

    await q('INSERT INTO roadmaps (id, user_id, title, description, target_role, nodes_json) VALUES (?,?,?,?,?,?)').run(
      id, userId, generated.title, generated.description || '', generated.targetRole || prompt, nodesJson,
    );

    send(res, 201, {
      id,
      userId,
      title: generated.title,
      description: generated.description || '',
      targetRole: generated.targetRole || prompt,
      branches: generated.branches || [],
      nodes,
    });
  });

  // POST /api/roadmaps/:id/export-to-tasks - export a skill node to user's Tasker tasks
  route('POST', '/api/roadmaps/:id/export-to-tasks', async (req, res, { id }) => {
    const userId = getUserId ? getUserId(req, res) : 'user';
    const body = await readJson(req);
    const nodeId = body.nodeId;
    if (!nodeId) return send(res, 400, { error: 'nodeId required' });

    const roadmap = await q('SELECT id, title, nodes_json FROM roadmaps WHERE id=?').get(id);
    if (!roadmap) return send(res, 404, { error: 'roadmap not found' });

    let parsed = { nodes: [] };
    try { parsed = JSON.parse(roadmap.nodes_json); } catch {}

    const node = parsed.nodes.find((n) => n.id === nodeId);
    if (!node) return send(res, 404, { error: 'node not found' });

    // Retrieve default status for new tasks
    const todoStatus = (await q('SELECT id FROM statuses WHERE done=0 AND cancelled=0 ORDER BY pos ASC').get()) ||
      (await q('SELECT id FROM statuses LIMIT 1').get());

    if (!todoStatus) return send(res, 500, { error: 'no status found' });

    // Find highest position among top-level tasks
    const posRow = await q('SELECT COALESCE(MAX(pos), -1) + 1 as p FROM tasks WHERE parent_id IS NULL').get();
    const nextPos = posRow ? Number(posRow.p) : 0;

    const parentTaskId = randomUUID();
    const parentTitle = `[Навичка] ${node.icon} ${node.title}`;
    const parentDesc = `${node.description}

Чому важливо: ${node.whyImportant}
Джерело: Роадмап "${roadmap.title}"`;

    await tx(async () => {
      // Create parent task
      await q(
        'INSERT INTO tasks (id, parent_id, title, description, status_id, collapsed, pos, kind, tags, user_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
      ).run(
        parentTaskId,
        null,
        parentTitle,
        parentDesc,
        todoStatus.id,
        0,
        nextPos,
        'task',
        `роадмап,${node.branch || 'навички'}`,
        userId,
      );

      // Create child tasks for each topic in the skill
      if (Array.isArray(node.topics)) {
        for (let i = 0; i < node.topics.length; i++) {
          const topic = node.topics[i];
          const childId = randomUUID();
          await q(
            'INSERT INTO tasks (id, parent_id, title, description, status_id, collapsed, pos, kind, tags, user_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
          ).run(
            childId,
            parentTaskId,
            topic,
            `Тема з навички "${node.title}"`,
            todoStatus.id,
            0,
            i,
            'task',
            'роадмап',
            userId,
          );
        }
      }
    });

    send(res, 201, {
      taskId: parentTaskId,
      title: parentTitle,
      subtasksCount: (node.topics || []).length,
    });
  });
}
