import { Injectable, computed, signal } from '@angular/core';

export type Lang = 'uk' | 'en';

const STORAGE_KEY = 'tasker.lang';

export const DICT = {
  uk: {
    // Header & Tabs
    tasks: 'завдання',
    books: 'книги та курси',
    booksShort: 'курси',
    roleUser: 'користувач',
    roleAdmin: 'адмін',
    role: 'роль',
    import: 'імпорт',
    library: 'бібліотека',
    trash: 'кошик',
    purgatory: 'чистилище',
    statuses: 'статуси',
    menu: 'меню',
    close: 'закрити',
    lang: 'мова: укр',

    // Mobile nav sections
    viewsSection: '# розділи',
    toolsSection: '# інструменти та каталог',
    accessSection: '# доступ',
    tasksDesc: 'короткотермінові завдання',
    booksDesc: 'книги, курси та довготермінові плани',
    importDesc: 'додати / ai завдання',
    libraryDesc: 'спільний каталог шаблонів',
    statusesDesc: 'керування статусами',
    trashDesc: 'видалені завдання',
    purgatoryDesc: 'видалені книги та курси (тільки адмін)',
    roleSwitchToUser: 'перемкнути на звичайного користувача',
    roleSwitchToAdmin: 'увійти як адміністратор',

    // New task inputs
    newTaskPlaceholder: 'нове завдання, натисніть enter...',
    newBookPlaceholder: 'нова книга чи курс, натисніть enter...',
    deadlineTitle: 'термін виконання (необовʼязково)',
    addBtn: 'додати',
    dropToTopLevel: 'перетягніть сюди, щоб перемістити на верхній рівень',
    tasksHeading: 'завдання',
    booksHeading: 'книги та курси',
    booksGlossaryHint: 'глосарій книг та курсів. оберіть потрібний та додайте собі в завдання.',
    noTasksYet: 'завдань ще немає. додайте перше вище.',
    noBooksYet: 'книг та курсів ще немає. додайте першу назву вище.',

    // Detail view
    rootTasks: '~ завдання',
    rootBooks: '~ книги та курси',
    edit: 'ред.',
    ok: 'ок',
    cancel: 'скасувати',
    moveToBooks: '-> книги та курси',
    moveToTasks: '-> завдання',
    cloneBookToTasks: 'додати собі в завдання',
    cloneBookShort: '+ в завдання',
    clonedToTasksSuccess: 'успішно додано в завдання!',
    saveToLibrary: '-> бібліотека',
    leafDoneSuffix: 'виконано',
    thisTaskDone: 'це завдання виконано',
    deadlineHeading: '# термін виконання',
    setAt: 'встановлено:',
    overdue: '! протерміновано',
    noDeadline: 'термін не встановлено',
    clear: 'очистити',
    descHeading: '# опис',
    emptyDesc: '(немає опису)',
    descPlaceholder: 'опис...',
    imagesHeading: '# зображення',
    dropImagesHint: 'перетягніть сюди, вставте (Ctrl+V) або',
    addImageBtn: '[додати зображення]',
    subtasksHeading: '# підзавдання',
    setAllSubtasksTo: 'встановити всі підзавдання в',
    resetBtn: 'скинути',
    noSubtasks: 'підзавдань немає.',
    newSubtaskPlaceholder: 'нове підзавдання, натисніть enter...',

    // Task Item
    duePrefix: 'до: ',
    subtaskPlaceholder: 'підзавдання...',
    addSubtaskBtn: '+під',
    deleteBtn: '✕',

    // Statuses panel
    statusesHeading: '# статуси',
    statusesHint: 'перший = за замовчуванням для нових завдань. done = закреслено і враховується як виконане; cancel = скасовано; active = "в процесі".',
    doneLabel: 'виконано',
    cancelLabel: 'скасовано',
    activeLabel: 'активний',
    newStatusPlaceholder: 'новий статус...',

    // Trash panel
    trashHeading: '# кошик',
    trashEmpty: 'кошик порожній.',
    emptyTrashBtn: 'видалити все з кошика',
    restoreBtn: 'відновити',
    purgeBtn: 'видалити назавжди',

    // Purgatory panel (чистилище книг та курсів)
    purgatoryHeading: '# чистилище (видалені книги та курси)',
    purgatoryHint: 'розділ доступний виключно адміністратору. звідси книги можна повернути або видалити назавжди.',
    purgatoryEmpty: 'чистилище порожнє.',
    restoreToBooksBtn: 'повернути в книги та курси',
    purgeBookBtn: 'видалити назавжди',
    emptyPurgatoryBtn: '[очистити чистилище]',

    // Search, filter & tags for books
    searchBooksPlaceholder: 'пошук книг та курсів (назва, опис, теги)...',
    allTags: 'всі',
    tagsHeading: '# теги',
    tagsPlaceholder: 'теги через кому (наприклад: docker, devops, backend)...',
    noTags: '(немає тегів)',
    newBookTagsPlaceholder: 'теги через кому...',
    filterActivePrefix: 'тег:',
    clearFilter: 'скинути фільтр',
    foundBooksCount: (n: number) => `знайдено: ${n}`,

    // Popups / dialogs
    confirmTitle: 'підтвердження',
    alertTitle: 'сповіщення',
    promptTitle: 'введення',
    confirmDeleteTask: (title: string) => `Видалити "${title}"?`,
    confirmDeleteTaskWithSubs: (title: string) => `Видалити "${title}" та всі його підзавдання?`,
    confirmMoveBookToPurgatory: (title: string) => `Перемістити "${title}" у чистилище?`,
    moveToPurgatoryBtn: 'у чистилище',
    confirmPurgeTask: 'Видалити це завдання назавжди?',
    confirmPurgeBook: (title: string) => `Видалити "${title}" назавжди з бази даних?`,
    confirmEmptyTrash: 'Видалити всі завдання з кошика назавжди? Цю дію неможливо скасувати.',
    confirmEmptyPurgatory: 'Очистити чистилище? Усі видалені книги будуть стерті назавжди.',
    confirmDeleteImage: 'Видалити це зображення?',
    confirmDeleteStatus: (name: string) => `Видалити статус "${name}"?`,
    confirmClearDue: 'Видалити термін виконання?',
    confirmResetSubtasks: (name: string) => `Встановити для ВСІХ підзавдань статус "${name}"?`,
    confirmSwitchToUser: 'Перейти в режим звичайного користувача?',
    adminPrompt: 'Введіть пароль адміністратора (за замовчуванням: admin):',
    adminLoginTitle: 'вхід адміністратора',
    adminPasswordPlaceholder: 'пароль...',
    invalidAdminPassword: 'Невірний пароль адміністратора.',
    accessDenied: 'доступ заборонено',

    // Library panel
    libraryHeading: '# бібліотека (спільні книги / курси / плейлісти)',
    libraryHintAdmin: 'режим адміністратора: ви можете додавати через імпорт, редагувати та видаляти матеріали з бібліотеки.',
    libraryHintUser: 'режим користувача: переглядайте матеріали та переносьте будь-яку книгу чи курс собі в завдання або курси (тільки читання).',
    searchLibrary: 'пошук у бібліотеці...',
    cloneToBooks: 'додати в курси',
    cloneToTasks: 'додати в завдання',
    alreadyInBooks: 'вже додано в курси',
    editLibraryItem: 'редагувати',
    deleteLibraryItem: 'видалити',
    confirmDeleteLibraryItem: (title: string) => `Видалити "${title}" з бібліотеки?`,
    titlePlaceholder: 'назва...',
    sourceUrlPlaceholder: 'посилання на джерело...',
    filterAll: 'всі',
    filterBook: 'книга',
    filterPlaylist: 'плейліст',
    filterCourse: 'курс',
    filterOther: 'інше',

    // Import panel
    importHeading: '# імпорт / ai завдання',
    tabAi: 'ai завдання',
    tabYoutube: 'youtube плейліст',
    tabText: 'текст / markdown',
    aiTaskPlaceholder: 'опишіть що ви хочете зробити (наприклад: вивчити docker з нуля за 2 тижні)...',
    generateAiBtn: 'згенерувати завдання через ai',
    importingBtn: 'імпортую...',
    sendToLibraryBtn: '-> в бібліотеку',
    sendToTasksBtn: '-> в завдання',
    sendToBooksBtn: '-> в книги та курси',
  },
  en: {
    // Header & Tabs
    tasks: 'tasks',
    books: 'books & courses',
    booksShort: 'books',
    roleUser: 'user',
    roleAdmin: 'admin',
    role: 'role',
    import: 'import',
    library: 'library',
    trash: 'trash',
    purgatory: 'purgatory',
    statuses: 'statuses',
    menu: 'menu',
    close: 'close',
    lang: 'lang: en',

    // Mobile nav sections
    viewsSection: '# views',
    toolsSection: '# tools & catalog',
    accessSection: '# access',
    tasksDesc: 'short-term tasks',
    booksDesc: 'books, playlists & courses',
    importDesc: 'add / ai task generator',
    libraryDesc: 'shared templates catalog',
    statusesDesc: 'manage workflow statuses',
    trashDesc: 'deleted tasks',
    purgatoryDesc: 'deleted books & courses (admin only)',
    roleSwitchToUser: 'switch to regular user mode',
    roleSwitchToAdmin: 'login as administrator',

    // New task inputs
    newTaskPlaceholder: 'new short-term task, press enter...',
    newBookPlaceholder: 'new book or course, press enter...',
    deadlineTitle: 'optional deadline',
    addBtn: 'add',
    dropToTopLevel: 'drop here to move item to top level',
    tasksHeading: 'tasks',
    booksHeading: 'books & courses',
    booksGlossaryHint: 'glossary of books and courses. choose one and add to your tasks.',
    noTasksYet: 'no short-term tasks yet. add one above.',
    noBooksYet: 'no books or courses yet. add one above.',

    // Detail view
    rootTasks: '~ tasks',
    rootBooks: '~ books & courses',
    edit: 'edit',
    ok: 'ok',
    cancel: 'cancel',
    moveToBooks: '-> books & courses',
    moveToTasks: '-> tasks',
    cloneBookToTasks: 'add to my tasks',
    cloneBookShort: '+ to tasks',
    clonedToTasksSuccess: 'successfully added to tasks!',
    saveToLibrary: '-> library',
    leafDoneSuffix: 'leaf tasks done',
    thisTaskDone: 'this task done',
    deadlineHeading: '# deadline',
    setAt: 'set:',
    overdue: '! overdue',
    noDeadline: 'no deadline set',
    clear: 'clear',
    descHeading: '# description',
    emptyDesc: '(empty)',
    descPlaceholder: 'description...',
    imagesHeading: '# images',
    dropImagesHint: 'drop files here, paste (Ctrl+V), or',
    addImageBtn: '[add image]',
    subtasksHeading: '# subtasks',
    setAllSubtasksTo: 'set all subtasks to',
    resetBtn: 'reset',
    noSubtasks: 'no subtasks.',
    newSubtaskPlaceholder: 'new subtask, press enter...',

    // Task Item
    duePrefix: 'due: ',
    subtaskPlaceholder: 'subtask...',
    addSubtaskBtn: '+sub',
    deleteBtn: 'x',

    // Statuses panel
    statusesHeading: '# statuses',
    statusesHint: 'first = default for new tasks. done = struck through and finished; cancel = cancelled; active = in progress.',
    doneLabel: 'done',
    cancelLabel: 'cancel',
    activeLabel: 'active',
    newStatusPlaceholder: 'new status...',

    // Trash panel
    trashHeading: '# trash',
    trashEmpty: 'trash is empty.',
    emptyTrashBtn: 'delete all from trash',
    restoreBtn: 'restore',
    purgeBtn: 'purge',

    // Purgatory panel
    purgatoryHeading: '# purgatory (deleted books & courses)',
    purgatoryHint: 'accessible exclusively by administrators. restore books or delete them permanently.',
    purgatoryEmpty: 'purgatory is empty.',
    restoreToBooksBtn: 'restore to books & courses',
    purgeBookBtn: 'delete forever',
    emptyPurgatoryBtn: '[empty purgatory]',

    // Search, filter & tags for books
    searchBooksPlaceholder: 'search books & courses (title, desc, tags)...',
    allTags: 'all',
    tagsHeading: '# tags',
    tagsPlaceholder: 'comma-separated tags (e.g. docker, devops, backend)...',
    noTags: '(no tags)',
    newBookTagsPlaceholder: 'tags comma-separated...',
    filterActivePrefix: 'tag:',
    clearFilter: 'reset filter',
    foundBooksCount: (n: number) => `found: ${n}`,

    // Popups / dialogs
    confirmTitle: 'confirmation',
    alertTitle: 'alert',
    promptTitle: 'input',
    confirmDeleteTask: (title: string) => `Delete "${title}"?`,
    confirmDeleteTaskWithSubs: (title: string) => `Delete "${title}" and its subtasks?`,
    confirmMoveBookToPurgatory: (title: string) => `Move "${title}" to purgatory?`,
    moveToPurgatoryBtn: 'to purgatory',
    confirmPurgeTask: 'Delete this task forever?',
    confirmPurgeBook: (title: string) => `Permanently delete "${title}" from database?`,
    confirmEmptyTrash: 'Permanently delete all tasks from trash? This cannot be undone.',
    confirmEmptyPurgatory: 'Empty all purgatory? All deleted books will be permanently erased.',
    confirmDeleteImage: 'Delete this image?',
    confirmDeleteStatus: (name: string) => `Delete status "${name}"?`,
    confirmClearDue: 'Delete deadline from this task?',
    confirmResetSubtasks: (name: string) => `Set ALL subtasks to "${name}"?`,
    confirmSwitchToUser: 'Switch from admin to regular user mode?',
    adminPrompt: 'Enter admin password (default: admin):',
    adminLoginTitle: 'admin login',
    adminPasswordPlaceholder: 'admin password...',
    invalidAdminPassword: 'Invalid admin password.',
    accessDenied: 'access denied',

    // Library panel
    libraryHeading: '# library (shared books / playlists / courses)',
    libraryHintAdmin: 'admin mode: you can add via import, edit, and delete library items.',
    libraryHintUser: 'user mode: browse items and add any book or course to your tasks or courses (read-only).',
    searchLibrary: 'search library...',
    cloneToBooks: 'add to courses',
    cloneToTasks: 'add to tasks',
    alreadyInBooks: 'already in courses',
    editLibraryItem: 'edit',
    deleteLibraryItem: 'delete',
    confirmDeleteLibraryItem: (title: string) => `Delete "${title}" from library?`,
    titlePlaceholder: 'title...',
    sourceUrlPlaceholder: 'source url...',
    filterAll: 'all',
    filterBook: 'book',
    filterPlaylist: 'playlist',
    filterCourse: 'course',
    filterOther: 'other',

    // Import panel
    importHeading: '# import / ai task generator',
    tabAi: 'ai task',
    tabYoutube: 'youtube playlist',
    tabText: 'text / markdown',
    aiTaskPlaceholder: 'describe what you want to learn or build...',
    generateAiBtn: 'generate with ai',
    importingBtn: 'importing...',
    sendToLibraryBtn: '-> to library',
    sendToTasksBtn: '-> to tasks',
    sendToBooksBtn: '-> to books & courses',
  },
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  /** Active language: 'uk' (default) or 'en' */
  readonly lang = signal<Lang>((localStorage.getItem(STORAGE_KEY) as Lang) || 'uk');

  readonly t = computed(() => DICT[this.lang()]);

  setLang(l: Lang) {
    this.lang.set(l);
    localStorage.setItem(STORAGE_KEY, l);
  }

  toggleLang() {
    this.setLang(this.lang() === 'uk' ? 'en' : 'uk');
  }
}
