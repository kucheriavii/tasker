// Roadmap / Diablo 2 Skill Tree module: AI-generated & manual skill trees, progression tracking.
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

// Default high-quality Diablo-like DevOps Skill Tree
export const DEVOPS_ROADMAP_TEMPLATE = {
  title: 'DevOps Інженер: Дерево розвитку',
  description: 'Покрокова карта прокачки навичок від основ Linux та мереж до Kubernetes, CI/CD, GitOps та хмарної архітектури.',
  targetRole: 'DevOps Engineer',
  branches: [
    'Linux & Системи',
    'Мережі & Безпека',
    'Контейнеризація',
    'CI/CD & Автоматизація',
    'IaC & Хмари',
    'Kubernetes & Оркестрація',
    'Моніторинг & Надійність',
  ],
  nodes: [
    // Tier 1: Фундамент (No prerequisites)
    {
      id: 'linux-core',
      title: 'Linux Core & Bash',
      icon: '🐧',
      tier: 1,
      branch: 'Linux & Системи',
      description: 'Управління Linux-серверами, файлова система, права доступу, процеси та написання shell-скриптів для автоматизації рутини.',
      whyImportant: 'Фундамент будь-якої інфраструктури: 95% серверів та контейнерів працюють на Linux.',
      status: 'completed',
      prerequisites: [],
      topics: [
        'Навігація, grep, sed, awk, find',
        'Права доступу, користувачі та групи (chmod, chown, sudo)',
        'Управління процесами (ps, top, htop, kill, systemctl)',
        'Bash-скрипти: змінні, цикли, обробка аргументів',
        'Systemd units та таймери',
      ],
      completedTopics: [
        'Навігація, grep, sed, awk, find',
        'Права доступу, користувачі та групи (chmod, chown, sudo)',
        'Управління процесами (ps, top, htop, kill, systemctl)',
      ],
    },
    {
      id: 'git-scm',
      title: 'Git & VCS Workflows',
      icon: '🌿',
      tier: 1,
      branch: 'CI/CD & Автоматизація',
      description: 'Робота з гілками, злиття, rebase, cherry-pick та командні практики GitFlow / Trunk-Based Development.',
      whyImportant: 'Код інфраструктури та пайплайни зберігаються та версіонуються виключно в Git.',
      status: 'completed',
      prerequisites: [],
      topics: [
        'Основні команди: commit, push, pull, fetch, stash',
        'Розв\'язання конфліктів та rebase vs merge',
        'Стратегії гілкування (Trunk-based, GitHub Flow)',
        'Робота з Pull Request та рев\'ю коду',
      ],
      completedTopics: [
        'Основні команди: commit, push, pull, fetch, stash',
        'Розв\'язання конфліктів та rebase vs merge',
        'Стратегії гілкування (Trunk-based, GitHub Flow)',
        'Робота з Pull Request та рев\'ю коду',
      ],
    },
    {
      id: 'net-basics',
      title: 'Мережі & Інтернет-протоколи',
      icon: '🌐',
      tier: 1,
      branch: 'Мережі & Безпека',
      description: 'Розуміння роботи TCP/IP, DNS, роутингу, HTTP/HTTPS, SSH ключів та базової мережевої діагностики.',
      whyImportant: 'Без мереж неможливо побудувати жодну розподілену систему чи зрозуміти збій зв\'язку між сервісами.',
      status: 'in_progress',
      prerequisites: [],
      topics: [
        'Модель OSI та стек TCP/UDP',
        'DNS: A, CNAME, MX, TTL, dig, nslookup',
        'HTTP/1.1, HTTP/2, REST, SSL/TLS рукостискання',
        'Діагностика: curl, ping, traceroute, netstat, tcpdump',
        'SSH тунелі та автентифікація за ключами',
      ],
      completedTopics: [
        'Модель OSI та стек TCP/UDP',
        'DNS: A, CNAME, MX, TTL, dig, nslookup',
        'SSH тунелі та автентифікація за ключами',
      ],
    },

    // Tier 2: Контейнери та Перші Пайплайни (Requires Tier 1)
    {
      id: 'docker-basics',
      title: 'Docker & Оптимізація образів',
      icon: '🐳',
      tier: 2,
      branch: 'Контейнеризація',
      description: 'Створення ефективних Dockerfile, багатоетапна збірка (multi-stage), робота з Docker Compose та кешування шарів.',
      whyImportant: 'Контейнери стали стандартом пакування та розгортання додатків у сучасному світі.',
      status: 'in_progress',
      prerequisites: ['linux-core'],
      topics: [
        'Dockerfile: RUN, COPY, ADD, CMD vs ENTRYPOINT',
        'Multi-stage builds для мінімального розміру образу',
        'Docker Compose для локального стеку розробки',
        'Мережі Docker (bridge, host, overlay) та Volumes',
        'Безпека: non-root користувачі, сканування Trivy',
      ],
      completedTopics: [
        'Dockerfile: RUN, COPY, ADD, CMD vs ENTRYPOINT',
        'Docker Compose для локального стеку розробки',
      ],
    },
    {
      id: 'cicd-github-actions',
      title: 'CI/CD: GitHub Actions & GitLab',
      icon: '⚡',
      tier: 2,
      branch: 'CI/CD & Автоматизація',
      description: 'Автоматизація збірки, лінтингу, тестування та деплою додатків при кожному пуші в репозиторій.',
      whyImportant: 'Швидка та надійна доставка змін від розробника до продакшену без ручної праці.',
      status: 'available',
      prerequisites: ['git-scm', 'linux-core'],
      topics: [
        'Синтаксис workflows, jobs, steps',
        'Секрети та змінні оточення (Secrets / Environments)',
        'Збірка та публікація Docker-образу в registry (GHCR/DockerHub)',
        'Кешування залежностей для прискорення пайплайнів',
        'Матричні збірки та деплой за тегами релізів',
      ],
      completedTopics: [],
    },
    {
      id: 'security-fundamentals',
      title: 'Безпека & Мережеві екрани',
      icon: '🛡️',
      tier: 2,
      branch: 'Мережі & Безпека',
      description: 'Налаштування iptables/UFW, управління секретами, TLS-сертифікати Let\'s Encrypt та захист серверів.',
      whyImportant: 'Інфраструктура повинна бути захищеною за замовчуванням від витоків і зламів.',
      status: 'available',
      prerequisites: ['net-basics', 'linux-core'],
      topics: [
        'Налаштування фаєрвола (ufw, iptables)',
        'Автоматичне оновлення сертифікатів Certbot / Let\'s Encrypt',
        'Аудит безпеки SSH (відключення паролів, Fail2ban)',
        'Принцип найменших привілеїв (Least Privilege)',
      ],
      completedTopics: [],
    },

    // Tier 3: IaC та Хмарна Інфраструктура (Requires Tier 2)
    {
      id: 'terraform-iac',
      title: 'Terraform & Infrastructure as Code',
      icon: '🏗️',
      tier: 3,
      branch: 'IaC & Хмари',
      description: 'Опис інфраструктури кодом за допомогою HCL: ресурси, модулі, управління стейтом та командна робота.',
      whyImportant: 'Дозволяє відтворювати будь-яку інфраструктуру за хвилини та виключає людські помилки.',
      status: 'locked',
      prerequisites: ['docker-basics', 'cicd-github-actions'],
      topics: [
        'Синтаксис HCL, providers, resources, data sources',
        'Керування State-файлом (remote backend, s3 + dynamodb lock)',
        'Модульна структура коду',
        'Terraform plan, apply, import, drift detection',
        'Terragrunt для масштабування кількох середовищ (dev/stage/prod)',
      ],
      completedTopics: [],
    },
    {
      id: 'cloud-aws-gcp',
      title: 'Хмарні платформи (AWS / GCP / Hetzner)',
      icon: '☁️',
      tier: 3,
      branch: 'IaC & Хмари',
      description: 'Віртуальні машини, об\'єктні сховища S3, віртуальні приватні мережі (VPC), IAM та балансувальники навантаження.',
      whyImportant: 'Більшість бізнесів розміщують продакшн у хмарах для відмовостійкості.',
      status: 'locked',
      prerequisites: ['security-fundamentals', 'net-basics'],
      topics: [
        'IAM політики, ролі та безпечний доступ',
        'Обчислення: EC2, Cloud Compute, автоскейлінг',
        'Мережі: VPC, Subnets, Internet Gateways, NAT, Security Groups',
        'Об\'єктне сховище S3 / Cloud Storage & CDN',
        'Load Balancers (ALB/NLB) та Route53',
      ],
      completedTopics: [],
    },
    {
      id: 'ansible-config',
      title: 'Ansible: Конфігурація серверів',
      icon: '📜',
      tier: 3,
      branch: 'Linux & Системи',
      description: 'Декларативне налаштування серверного оточення без агентів через SSH: Playbooks, Roles, Vault.',
      whyImportant: 'Автоматизує налаштування сотень серверів в один клік.',
      status: 'locked',
      prerequisites: ['linux-core', 'security-fundamentals'],
      topics: [
        'Inventory файли та змінні',
        'Playbooks, tasks, handlers',
        'Використання готових та власних ролей (Roles)',
        'Ansible Vault для шифрування чутливих даних',
      ],
      completedTopics: [],
    },

    // Tier 4: Kubernetes & Оркестрація
    {
      id: 'k8s-fundamentals',
      title: 'Kubernetes: Ядро & Архітектура',
      icon: '☸️',
      tier: 4,
      branch: 'Kubernetes & Оркестрація',
      description: 'Pods, Deployments, Services, Ingress, ConfigMaps, Secrets та принципи самовідновлення кластера.',
      whyImportant: 'Головний стандарт для оркестрації мікросервісів у високонавантажених системах.',
      status: 'locked',
      prerequisites: ['docker-basics', 'terraform-iac'],
      topics: [
        'Архітектура control-plane (API server, etcd, scheduler, kubelet)',
        'Deployments, ReplicaSets та Rolling Updates',
        'Мережі K8s: ClusterIP, NodePort, Ingress Controller',
        'Управління сховищем: PVC, PV, StorageClass',
        'Resource Limits, Requests та HPA (автомасштабування)',
      ],
      completedTopics: [],
    },
    {
      id: 'helm-packaging',
      title: 'Helm: Пакетний менеджер K8s',
      icon: '📦',
      tier: 4,
      branch: 'Kubernetes & Оркестрація',
      description: 'Шаблонізація маніфестів K8s, створення власних Helm Charts та керування релізами додатків.',
      whyImportant: 'Спрощує деплой комплексних систем (бази, черги, бекенд) до однієї команди.',
      status: 'locked',
      prerequisites: ['k8s-fundamentals'],
      topics: [
        'Структура чарту: Chart.yaml, values.yaml, templates',
        'Шаблонізація Go template (if, with, range)',
        'Helm install, upgrade, rollback, dependencies',
      ],
      completedTopics: [],
    },
    {
      id: 'observability-prom',
      title: 'Prometheus & Grafana Моніторинг',
      icon: '📊',
      tier: 4,
      branch: 'Моніторинг & Надійність',
      description: 'Збір метрик, PromQL запити, створення інформативних дашбордів Grafana та сповіщення Alertmanager.',
      whyImportant: 'Неможливо виправити проблему, яку ви не можете виміряти та побачити в реальному часі.',
      status: 'locked',
      prerequisites: ['docker-basics', 'linux-core'],
      topics: [
        'Принцип pull-based метрик та Node Exporter',
        'Синтаксис запитів PromQL (rate, sum, increase)',
        'Побудова дашбордів у Grafana',
        'Правила алертингу в Alertmanager (Telegram, Slack, Email)',
      ],
      completedTopics: [],
    },

    // Tier 5: GitOps, Логування & High-Level Production
    {
      id: 'gitops-argocd',
      title: 'GitOps: ArgoCD & Flagger',
      icon: '🔄',
      tier: 5,
      branch: 'CI/CD & Автоматизація',
      description: 'Синхронізація стану кластера безпосередньо з Git репозиторію, Canary-релізи та захист від дрейфу.',
      whyImportant: 'Найсучасніша парадигма деплою у хмарні кластери.',
      status: 'locked',
      prerequisites: ['k8s-fundamentals', 'helm-packaging', 'cicd-github-actions'],
      topics: [
        'Концепція GitOps як єдиного джерела правди (Single Source of Truth)',
        'Встановлення та налаштування ArgoCD Applications',
        'Auto-sync, prune та self-healing',
        'Canary та Blue-Green деплойменти',
      ],
      completedTopics: [],
    },
    {
      id: 'logging-tracing',
      title: 'Логування (Loki/ELK) & Tracing',
      icon: '🔍',
      tier: 5,
      branch: 'Моніторинг & Надійність',
      description: 'Централізований збір логів через Promtail / Fluentd, агрегація в Loki або OpenSearch та трейсинг OpenTelemetry.',
      whyImportant: 'Допомагає миттєво знайти причину збою у сотнях мікросервісів.',
      status: 'locked',
      prerequisites: ['observability-prom', 'k8s-fundamentals'],
      topics: [
        'Grafana Loki + Promtail для економного збору логів',
        'Пошук логів мовою LogQL',
        'Концепція трасування (Distributed Tracing, Spans, Jaeger)',
        'SLO, SLI та SLA: встановлення цілей надійності',
      ],
      completedTopics: [],
    },
  ],
};

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

export function registerRoadmap({ route, send, readJson, q, tx, getUserId, isAdmin }) {
  // GET /api/roadmaps - list user roadmaps (or default seeded)
  route('GET', '/api/roadmaps', async (req, res) => {
    const userId = getUserId ? getUserId(req, res) : null;
    let rows = [];
    if (userId) {
      rows = await q('SELECT id, user_id, title, description, target_role, nodes_json, created_at, updated_at FROM roadmaps WHERE user_id=? OR user_id IS NULL ORDER BY created_at DESC').all(userId);
    } else {
      rows = await q('SELECT id, user_id, title, description, target_role, nodes_json, created_at, updated_at FROM roadmaps ORDER BY created_at DESC').all();
    }

    // Auto-seed default DevOps roadmap if table is empty
    if (rows.length === 0) {
      const defId = randomUUID();
      const nodes = refreshSkillStates(DEVOPS_ROADMAP_TEMPLATE.nodes);
      const dataJson = JSON.stringify({
        branches: DEVOPS_ROADMAP_TEMPLATE.branches,
        nodes,
      });
      await q('INSERT INTO roadmaps (id, user_id, title, description, target_role, nodes_json) VALUES (?,?,?,?,?,?)').run(
        defId, userId, DEVOPS_ROADMAP_TEMPLATE.title, DEVOPS_ROADMAP_TEMPLATE.description, DEVOPS_ROADMAP_TEMPLATE.targetRole, dataJson,
      );
      rows = await q('SELECT id, user_id, title, description, target_role, nodes_json, created_at, updated_at FROM roadmaps WHERE id=?').all(defId);
    }

    const roadmaps = rows.map((r) => {
      let parsed = { branches: [], nodes: [] };
      try { parsed = JSON.parse(r.nodes_json); } catch {}
      return {
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
    });

    send(res, 200, { roadmaps });
  });

  // GET /api/roadmaps/:id
  route('GET', '/api/roadmaps/:id', async (req, res, { id }) => {
    const row = await q('SELECT id, user_id, title, description, target_role, nodes_json, created_at, updated_at FROM roadmaps WHERE id=?').get(id);
    if (!row) return send(res, 404, { error: 'roadmap not found' });
    let parsed = { branches: [], nodes: [] };
    try { parsed = JSON.parse(row.nodes_json); } catch {}
    send(res, 200, {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      targetRole: row.target_role,
      branches: parsed.branches || [],
      nodes: parsed.nodes || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  // POST /api/roadmaps - create manual or template roadmap
  route('POST', '/api/roadmaps', async (req, res) => {
    const userId = getUserId ? getUserId(req, res) : null;
    const body = await readJson(req);
    const id = randomUUID();
    const title = String(body.title || 'Новий роадмап').trim();
    const description = String(body.description || '').trim();
    const targetRole = String(body.targetRole || title).trim();
    const branches = Array.isArray(body.branches) ? body.branches : [];
    const rawNodes = Array.isArray(body.nodes) ? body.nodes : [];
    const nodes = refreshSkillStates(rawNodes);

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

  // PATCH /api/roadmaps/:id - update progress, node states, or metadata
  route('PATCH', '/api/roadmaps/:id', async (req, res, { id }) => {
    const userId = getUserId ? getUserId(req, res) : null;
    const body = await readJson(req);
    const existing = await q('SELECT id, user_id, title, description, target_role, nodes_json FROM roadmaps WHERE id=?').get(id);
    if (!existing) return send(res, 404, { error: 'roadmap not found' });

    let parsed = { branches: [], nodes: [] };
    try { parsed = JSON.parse(existing.nodes_json); } catch {}

    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    const description = body.description !== undefined ? String(body.description).trim() : existing.description;
    const targetRole = body.targetRole !== undefined ? String(body.targetRole).trim() : existing.target_role;
    const branches = Array.isArray(body.branches) ? body.branches : parsed.branches;
    let nodes = Array.isArray(body.nodes) ? body.nodes : parsed.nodes;

    // Handle single node status or topic toggle if sent in patch
    if (body.nodeId) {
      nodes = nodes.map((n) => {
        if (n.id !== body.nodeId) return n;
        const updated = { ...n };
        if (body.status) updated.status = body.status;
        if (Array.isArray(body.completedTopics)) updated.completedTopics = body.completedTopics;
        if (body.toggleTopic) {
          const cur = new Set(updated.completedTopics || []);
          if (cur.has(body.toggleTopic)) cur.delete(body.toggleTopic);
          else cur.add(body.toggleTopic);
          updated.completedTopics = Array.from(cur);
          // If all topics completed, auto-complete skill
          if (updated.topics?.length && updated.completedTopics.length === updated.topics.length) {
            updated.status = 'completed';
          }
        }
        return updated;
      });
    }

    // Recompute unlock prerequisites
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

  // DELETE /api/roadmaps/:id
  route('DELETE', '/api/roadmaps/:id', async (req, res, { id }) => {
    await q('DELETE FROM roadmaps WHERE id=?').run(id);
    send(res, 204);
  });

  // POST /api/roadmaps/generate - AI Skill Tree Generation (Gemini)
  route('POST', '/api/roadmaps/generate', async (req, res) => {
    const userId = getUserId ? getUserId(req, res) : null;
    const { prompt: userGoal, language = 'uk' } = await readJson(req);
    if (!userGoal || !String(userGoal).trim()) {
      return send(res, 400, { error: 'goal prompt required' });
    }

    loadEnvIfNeeded();
    const key = process.env.GEMINI_API_KEY;

    // If Gemini key is missing or prompt is "devops", we can offer the rich built-in template or fallback
    const isDevopsRequest = /devops|девопс/i.test(userGoal);
    if (!key && isDevopsRequest) {
      const id = randomUUID();
      const nodes = refreshSkillStates(DEVOPS_ROADMAP_TEMPLATE.nodes);
      const dataJson = JSON.stringify({
        branches: DEVOPS_ROADMAP_TEMPLATE.branches,
        nodes,
      });
      await q('INSERT INTO roadmaps (id, user_id, title, description, target_role, nodes_json) VALUES (?,?,?,?,?,?)').run(
        id, userId, DEVOPS_ROADMAP_TEMPLATE.title, DEVOPS_ROADMAP_TEMPLATE.description, DEVOPS_ROADMAP_TEMPLATE.targetRole, dataJson,
      );
      return send(res, 201, {
        id,
        userId,
        title: DEVOPS_ROADMAP_TEMPLATE.title,
        description: DEVOPS_ROADMAP_TEMPLATE.description,
        targetRole: DEVOPS_ROADMAP_TEMPLATE.targetRole,
        branches: DEVOPS_ROADMAP_TEMPLATE.branches,
        nodes,
      });
    }

    if (!key) {
      return send(res, 400, {
        error: 'GEMINI_API_KEY не налаштовано у .env. Для перевірки можна використати вбудований шаблон DevOps або додати ключ Gemini.',
      });
    }

    const systemPrompt = `You are a master curriculum architect and game designer creating a Diablo 2 style Skill Tree / Learning Roadmap for mastering a profession or technology.
Target user goal: "${userGoal.trim()}".
Language: ${language === 'uk' ? 'Ukrainian' : 'English'}.

Structure rules:
1. "title": Engaging title for the skill tree in the target language (e.g. "Карта розвитку: DevOps Інженер").
2. "description": 1-2 sentences overview of what this tree covers.
3. "targetRole": Short name of the role (e.g. "DevOps Engineer").
4. "branches": 3 to 6 logical categories/paths (e.g. "Linux & OS", "Containers", "Cloud & IaC", "CI/CD", "Monitoring").
5. "nodes": 12 to 18 skill nodes total, arranged logically in tiers from 1 to 5.
   - tier 1: 2-3 foundational skills (prerequisites: []).
   - tier 2: 3-4 core skills (prerequisites: ids of tier 1 skills).
   - tier 3: 3-4 intermediate skills (prerequisites: ids of tier 2 skills).
   - tier 4: 2-3 advanced skills.
   - tier 5: 1-2 mastery / expert skills.
   - id: short kebab-case unique string (e.g. "docker-core", "k8s-cluster").
   - icon: single fitting emoji (e.g. "🐧", "🐳", "☸️", "⚡", "🛡️", "📦").
   - topics: 3 to 5 concrete actionable study checklist items for each skill.
   - prerequisites: array of node ids required before unlocking this node.
Ensure all prerequisite ids refer to existing node ids in previous tiers!
`;

    try {
      const fallbackModels = [
        process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        'gemini-3.5-flash',
      ];

      let generatedJson = null;
      let lastErrText = '';

      for (const model of fallbackModels) {
        try {
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: ROADMAP_SCHEMA,
                temperature: 0.3,
              },
            }),
            signal: AbortSignal.timeout(60000),
          });

          if (resp.ok) {
            const data = await resp.json();
            const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (raw) {
              generatedJson = JSON.parse(raw);
              break;
            }
          } else {
            lastErrText = await resp.text();
            console.warn(`[Roadmap AI] Gemini model ${model} failed (${resp.status}):`, lastErrText.slice(0, 200));
          }
        } catch (e) {
          console.warn(`[Roadmap AI] Fetch error with ${model}:`, e.message);
        }
      }

      if (!generatedJson) {
        throw new Error(`AI generation failed: ${lastErrText.slice(0, 150) || 'no response from Gemini'}`);
      }

      // Process nodes: set initial tier 1 skills as available, others as locked
      const rawNodes = (generatedJson.nodes || []).map((n) => ({
        ...n,
        status: (n.tier === 1 || !n.prerequisites?.length) ? 'available' : 'locked',
        completedTopics: [],
      }));

      const nodes = refreshSkillStates(rawNodes);
      const branches = generatedJson.branches || [];
      const title = generatedJson.title || userGoal;
      const description = generatedJson.description || '';
      const targetRole = generatedJson.targetRole || userGoal;

      const id = randomUUID();
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
    } catch (err) {
      console.error('[Roadmap AI] Error generating roadmap:', err);
      send(res, 502, { error: err.message || 'AI generation failed' });
    }
  });

  // POST /api/roadmaps/:id/export-to-tasks - export a skill node into Tasker tasks
  route('POST', '/api/roadmaps/:id/export-to-tasks', async (req, res, { id }) => {
    const userId = getUserId ? getUserId(req, res) : null;
    const { nodeId } = await readJson(req);
    const row = await q('SELECT nodes_json FROM roadmaps WHERE id=?').get(id);
    if (!row) return send(res, 404, { error: 'roadmap not found' });

    let parsed = { nodes: [] };
    try { parsed = JSON.parse(row.nodes_json); } catch {}
    const node = (parsed.nodes || []).find((n) => n.id === nodeId);
    if (!node) return send(res, 404, { error: 'skill node not found' });

    const st = await q('SELECT id FROM statuses ORDER BY pos LIMIT 1').get();
    const createdTask = await tx(async () => {
      const rootTaskId = randomUUID();
      const pos = userId
        ? await q('SELECT COALESCE(MAX(pos),-1)+1 p FROM tasks WHERE parent_id IS NULL AND kind=\'task\' AND user_id=?').get(userId)
        : await q('SELECT COALESCE(MAX(pos),-1)+1 p FROM tasks WHERE parent_id IS NULL AND kind=\'task\'').get();
      const pNum = Number(pos?.p ?? 0);

      const taskTitle = `${node.icon || '🎯'} [Skill] ${node.title}`;
      const desc = `${node.description}\n\nНапрямок: ${node.branch}\nРівень: Tier ${node.tier}`;

      await q('INSERT INTO tasks (id,parent_id,title,description,status_id,pos,kind,tags,characteristic,user_id) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
        rootTaskId, null, taskTitle, desc, st.id, pNum, 'task', 'roadmap,skill', 'skill', userId,
      );

      // Add each topic as a subtask
      for (let i = 0; i < (node.topics || []).length; i++) {
        const top = node.topics[i];
        const subId = randomUUID();
        await q('INSERT INTO tasks (id,parent_id,title,status_id,pos,kind,user_id) VALUES (?,?,?,?,?,?,?)').run(
          subId, rootTaskId, top, st.id, i, 'task', userId,
        );
      }
      return rootTaskId;
    });

    send(res, 201, { taskId: createdTask });
  });
}
