import {baseUrl} from './config.js';

// =============================================
// БЛОК ИНИЦИАЛИЗАЦИИ
// =============================================

let tg, user;

try {
    tg = window.common.initTelegram();
    user = tg.initDataUnsafe.user;
} catch (error) {
    console.error("Ошибка инициализации Telegram:", error);
    tg = { initDataUnsafe: {} };
    user = { id: 0 };
}

/**
 * Коллекция экранов приложения
 * @type {Object.<string, HTMLElement>}
 */
const screens = {
    main: document.getElementById('mainScreen'),
    profile: document.getElementById('profileScreen'),
    applications: document.getElementById('applicationsScreen'),
    applicationDetail: document.getElementById('applicationDetailScreen'),
    users: document.getElementById('usersScreen'),
    trainers: document.getElementById('trainersScreen'),
    trainerDetail: document.getElementById('trainerDetailScreen'),
    trainees: document.getElementById('traineesScreen'),
    traineeDetail: document.getElementById('traineeDetailScreen'),
    groups: document.getElementById('groupsScreen'),
    createGroup: document.getElementById('createGroupScreen'),
    deleteGroup: document.getElementById('deleteGroupScreen'),
    visits: document.getElementById('visitsScreen'),
    selectGroup: document.getElementById('selectGroupScreen'),
    selectTrainee: document.getElementById('selectTraineeScreen'),
    manageAttendance: document.getElementById('manageAttendanceScreen'),
    markPresent: document.getElementById('markPresentScreen'),
    addVisitation: document.getElementById('addVisitationScreen'),
    visitsResult: document.getElementById('visitsResultScreen')
};

/**
 * Элементы модального окна отклонения заявок
 */
let rejectReasonModal, rejectReasonInput, submitRejectBtn, closeRejectBtn;
function initModal() {
    rejectReasonModal = document.getElementById('rejectModal');
    rejectReasonInput = document.getElementById('rejectReason');
    submitRejectBtn = document.getElementById('submitReject');
    closeRejectBtn = document.getElementById('closeRejectModal');

    // Обработчики событий
    submitRejectBtn.addEventListener('click', submitReject);
    closeRejectBtn.addEventListener('click', closeRejectModal);

    // Закрытие при клике на фон
    rejectModal.addEventListener('click', (e) => {
        if (e.target === rejectModal) closeRejectModal();
    });
}

/**
 * Глобальное состояние приложения
 */
const state = {
    applications: [],
    currentApplication: null,
    trainers: [],
    currentTrainer: null,
    trainees: [],
    markTrainees: [],
    currentTrainee: null,
    groups: [],
    isEditing: false,
    visits: {
        startDate: null,
        endDate: null,
        selectedGroup: null,
        selectedTrainee: null
    },
    addVisitation: {
        date: null,
        time: null,
        selectedTrainee: null,
        selectedGroup: null
    },
    selectedTrainees: new Set() // Для хранения ID выбранных учеников
};

// =============================================
// ФУНКЦИИ УПРАВЛЕНИЯ ЭКРАНАМИ
// =============================================

/**
 * Переключает видимость экранов
 */
function showScreen(screenId) {
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.add('hidden');
    });

    const target = screens[screenId];
    if (target) {
        target.classList.remove('hidden');
    }

    if (screenId === 'markPresent') {
        // Убедимся, что список учеников загружается при открытии экрана
        if (state.markTrainees.length === 0) {
            loadAllTraineesForMarking();
        } else {
            displayTraineesForMarking();
        }
    }

    if (screenId === 'createGroup') {
        setupGroupNumberControls();
    }

    if (screenId === 'addVisitation') {
        // Не выполняем полную инициализацию при возврате
        setupAddVisitationScreen(false);
    }
}

// Показ/скрытие глобального лоадера
function showLoader(text = 'Подождите...') {
    const el = document.getElementById('globalLoading');
    if (!el) return;
    const p = el.querySelector('p');
    if (p) p.textContent = text;
    el.classList.remove('hidden');
}

function hideLoader() {
    const el = document.getElementById('globalLoading');
    if (!el) return;
    el.classList.add('hidden');
}

// Форматирование даты для input[type=date]
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// =============================================
// ОБРАБОТЧИКИ НАВИГАЦИИ
// =============================================

function setupEventListeners() {
    // Навигация
    document.getElementById('profileBtn')?.addEventListener('click', () => showScreen('profile'));
    document.getElementById('usersBtn')?.addEventListener('click', () => showScreen('users'));
    document.getElementById('backFromProfileBtn')?.addEventListener('click', () => showScreen('main'));
    document.getElementById('backFromApplicationsBtn')?.addEventListener('click', () => showScreen('profile'));
    document.getElementById('backFromApplicationDetailBtn')?.addEventListener('click', () => showScreen('applications'));
    document.getElementById('trainersBtn')?.addEventListener('click', () => loadTrainers());
    document.getElementById('traineesBtn')?.addEventListener('click', () => loadTrainees());
    document.getElementById('backFromUsersBtn')?.addEventListener('click', () => showScreen('profile'));
    document.getElementById('backFromTrainersBtn')?.addEventListener('click', () => showScreen('users'));
    document.getElementById('backFromTraineesBtn')?.addEventListener('click', () => showScreen('users'));
    document.getElementById('backFromGroupsBtn')?.addEventListener('click', () => showScreen('profile'));
    document.getElementById('backFromCreateGroupBtn')?.addEventListener('click', () => showScreen('groups'));
    document.getElementById('backFromDeleteGroupBtn')?.addEventListener('click', () => showScreen('groups'));
    document.getElementById('backFromTrainerDetailBtn')?.addEventListener('click', () => showScreen('trainers'));
    document.getElementById('backFromTraineeDetailBtn')?.addEventListener('click', () => showScreen('trainees'));
    document.getElementById('backFromVisitsBtn')?.addEventListener('click', () => showScreen('main'));

    document.getElementById('backFromTraineeSelectBtn')?.addEventListener('click', () => {
        if (state.addVisitationContext === 'add') {
            showScreen('addVisitation');
        } else {
            showScreen('visits');
        }
    });

    document.getElementById('backFromGroupSelectBtn')?.addEventListener('click', () => {
        if (state.addVisitationContext === 'add') {
            showScreen('addVisitation');
        } else {
            showScreen('visits');
        }
    });

    document.getElementById('backFromAttendanceBtn')?.addEventListener('click', () => showScreen('main'));
    document.getElementById('backFromMarkPresentBtn')?.addEventListener('click', () => showScreen('manageAttendance'));
    document.getElementById('backFromAddVisitationBtn')?.addEventListener('click', () => showScreen('manageAttendance'));
    document.getElementById('backFromDeleteVisitationBtn')?.addEventListener('click', () => showScreen('manageAttendance'));

    // Заявки
    document.getElementById('applicationsBtn')?.addEventListener('click', loadApplications);
    document.getElementById('approveApplicationBtn')?.addEventListener('click', approveApplication);
    document.getElementById('rejectApplicationBtn')?.addEventListener('click', showRejectModal);

    // Тренеры
    document.getElementById('editTrainerBtn')?.addEventListener('click', editTrainer);
    document.getElementById('saveTrainerBtn')?.addEventListener('click', saveTrainer);
    document.getElementById('cancelEditTrainerBtn')?.addEventListener('click', cancelEditTrainer);

    // Ученики
    document.getElementById('editTraineeBtn')?.addEventListener('click', editTrainee);
    document.getElementById('saveTraineeBtn')?.addEventListener('click', saveTrainee);
    document.getElementById('cancelEditTraineeBtn')?.addEventListener('click', cancelEditTrainee);

    // Группы
    document.getElementById('groupsBtn')?.addEventListener('click', () => showScreen('groups'));
    document.getElementById('createGroupBtn')?.addEventListener('click', () => showScreen('createGroup'));
    document.getElementById('deleteGroupBtn')?.addEventListener('click', loadGroupsForDeletion);
    document.getElementById('submitCreateGroupBtn')?.addEventListener('click', createGroup);
    document.getElementById('confirmDeleteGroupBtn')?.addEventListener('click', deleteGroup);

    // Посещения
    document.getElementById('visitsBtn')?.addEventListener('click', initVisitsScreen);
    document.getElementById('manageAttendanceBtn')?.addEventListener('click', () => showScreen('manageAttendance'));
    document.getElementById('selectGroupBtn')?.addEventListener('click', selectGroupForVisits);
    document.getElementById('selectTraineeBtn')?.addEventListener('click', selectTraineeForVisits);
    document.getElementById('resetVisitsBtn')?.addEventListener('click', resetVisitsFilters);
    document.getElementById('viewVisitsBtn')?.addEventListener('click', viewVisits);
    document.getElementById('deleteSelectedVisitsBtn')?.addEventListener('click', deleteSelectedVisits);
    document.getElementById('backFromVisitsResultBtn')?.addEventListener('click', () => showScreen('visits'));

    // Управление посещениями
    document.getElementById('markPresentBtn')?.addEventListener('click', markPresent);
    document.getElementById('addVisitationBtn')?.addEventListener('click', () => {
        resetAddVisitation(true); // true = полная инициализация
        showScreen('addVisitation');
    });
    document.getElementById('confirmMarkPresentBtn')?.addEventListener('click', confirmMarkPresent);

    // Обработчик изменения группы при отметке присутствия
    document.getElementById('markGroupSelect')?.addEventListener('change', async function() {
        state.selectedGroupForMarking = this.value;
        await loadAllTraineesForMarking(this.value);
    });

    // Добавление посещения
    document.getElementById('addVisitationBtn')?.addEventListener('click', () => {
        resetAddVisitation();
        showScreen('addVisitation');
    });

    document.getElementById('selectTraineeForAddBtn')?.addEventListener('click', () => {
        state.addVisitationContext = 'add';
        selectTraineeForVisits(); // Используем ту же функцию, что и для посещений
    });

    document.getElementById('selectGroupForAddBtn')?.addEventListener('click', () => {
        state.addVisitationContext = 'add';
        selectGroupForVisits(); // Используем ту же функцию, что и для посещений
    });

    document.getElementById('resetAddVisitationBtn')?.addEventListener('click', () => {
        resetAddVisitation(true); // Полный сброс
    });
    document.getElementById('confirmAddVisitationBtn')?.addEventListener('click', confirmAddVisitation);

    document.getElementById('addVisitDate')?.addEventListener('change', (e) => {
        state.addVisitation.date = e.target.value;
    });

    document.getElementById('addVisitTime')?.addEventListener('change', (e) => {
        state.addVisitation.time = e.target.value;
    });
}

// =============================================
// ФУНКЦИИ РАБОТЫ С ЗАЯВКАМИ
// =============================================

async function loadApplications() {
    try {
        showLoader();
        const response = await fetch(`${baseUrl}/app/user/admin/applications`, {
            method: 'GET'
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        state.applications = await response.json();
        displayApplications();
        showScreen('applications');
    } catch (error) {
        common.showErrorAlert('Ошибка загрузки заявок: ' + error.message);
    } finally {
        hideLoader();
    }
}

function displayApplications() {
    const container = document.getElementById('applicationsList');
    if (!container) return;

    container.innerHTML = '';
    if (state.applications.length === 0) {
        container.innerHTML = '<p>Заявок нет</p>';
        return;
    }

    state.applications.forEach(app => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <h3>${app.lastName} ${app.firstName} ${app.middleName || ''}</h3>
            <p>ID заявки: ${app.applicationId}</p>
        `;
        item.addEventListener('click', () => {
            state.currentApplication = app;
            showApplicationDetail();
            showScreen('applicationDetail');
        });
        container.appendChild(item);
    });
}

function showApplicationDetail() {
    const app = state.currentApplication;
    const container = document.getElementById('applicationDetail');
    if (!container || !app) return;

    container.innerHTML = `
        <p><strong>ID:</strong> ${app.applicationId}</p>
        <p><strong>Фамилия:</strong> ${app.lastName}</p>
        <p><strong>Имя:</strong> ${app.firstName}</p>
        <p><strong>Отчество:</strong> ${app.middleName || '-'}</p>
        <p><strong>Группа:</strong> ${app.group || '-'}</p>
    `;
}

async function approveApplication() {
    if (!state.currentApplication) return;

    try {
        const app = state.currentApplication;
        const response = await fetch(`${baseUrl}/app/user/admin/application/approve`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                applicationId: app.applicationId,
                lastName: app.lastName,
                firstName: app.firstName,
                middleName: app.middleName,
                group: app.group
            })
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        common.showAlert(await response.text());
        await loadApplications();
        await loadTrainees();
        showScreen('applications');
    } catch (error) {
        common.showErrorAlert('Ошибка: ' + error.message);
    }
}

// Функции управления модалкой
function showRejectModal() {
    rejectReasonInput.value = '';
    rejectModal.classList.add('active');
    setTimeout(() => {
        rejectReasonInput.focus();
        rejectReasonInput.select();
    }, 10);
}

// =============================================
// ФУНКЦИИ РАБОТЫ С ТРЕНЕРАМИ
// =============================================

async function loadTrainers() {
    try {
        showLoader();
        const response = await fetch(`${baseUrl}/app/user/admin/trainers`, {
            method: 'GET'
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        if (response.status === 204) return common.showAlert('Нет тренеров');

        state.trainers = await response.json();
        displayTrainers();
        showScreen('trainers');
    } catch (error) {
        common.showErrorAlert('Ошибка загрузки тренеров: ' + error.message);
    } finally {
        hideLoader();
    }
}

function displayTrainers() {
    const container = document.getElementById('trainersList');
    if (!container) return;

    container.innerHTML = '';
    state.trainers.forEach(trainer => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `<h3>${trainer.lastName} ${trainer.firstName} ${trainer.middleName || ''}</h3>`;
        item.addEventListener('click', () => {
            state.currentTrainer = trainer;
            showTrainerDetail();
            showScreen('trainerDetail');
        });
        container.appendChild(item);
    });
}

function showTrainerDetail() {
    const trainer = state.currentTrainer;
    const detailView = document.getElementById('trainerDetail');
    const editForm = document.getElementById('trainerEditForm');

    if (!detailView || !editForm || !trainer) return;

    detailView.innerHTML = `
        <p><strong>ID:</strong> ${trainer.userId}</p>
        <p><strong>Фамилия:</strong> ${trainer.lastName}</p>
        <p><strong>Имя:</strong> ${trainer.firstName}</p>
        <p><strong>Отчество:</strong> ${trainer.middleName || '-'}</p>
        <p><strong>Роль:</strong> ${trainer.role}</p>
    `;

    editForm.innerHTML = `
        <div class="editable-field">
            <label>Фамилия</label>
            <input type="text" id="editLastName" value="${trainer.lastName}">
        </div>
        <div class="editable-field">
            <label>Имя</label>
            <input type="text" id="editFirstName" value="${trainer.firstName}">
        </div>
        <div class="editable-field">
            <label>Отчество</label>
            <input type="text" id="editMiddleName" value="${trainer.middleName || ''}">
        </div>
        <div class="editable-field">
            <label>Роль</label>
            <select id="editTrainerRole">
                <option value="тренер">тренер</option>
                <option value="ученик">ученик</option>
                <option value="гость">гость</option>
            </select>
        </div>
    `;

    document.getElementById('editTrainerRole').value = trainer.role;
    detailView.classList.remove('hidden');
    editForm.classList.add('hidden');
    document.getElementById('editTrainerBtn').classList.remove('hidden');
    document.getElementById('saveTrainerBtn').classList.add('hidden');
    document.getElementById('cancelEditTrainerBtn').classList.add('hidden');
}

function editTrainer() {
    const detailView = document.getElementById('trainerDetail');
    const editForm = document.getElementById('trainerEditForm');

    if (detailView && editForm) {
        detailView.classList.add('hidden');
        editForm.classList.remove('hidden');
        document.getElementById('editTrainerBtn').classList.add('hidden');
        document.getElementById('saveTrainerBtn').classList.remove('hidden');
        document.getElementById('cancelEditTrainerBtn').classList.remove('hidden');
    }
}

function cancelEditTrainer() {
    showTrainerDetail();
}

async function saveTrainer() {
    if (!state.currentTrainer) return;

    const updatedTrainer = {
        userId: state.currentTrainer.userId,
        lastName: document.getElementById('editLastName').value,
        firstName: document.getElementById('editFirstName').value,
        middleName: document.getElementById('editMiddleName').value,
        role: document.getElementById('editTrainerRole').value
    };

    try {
        const response = await fetch(`${baseUrl}/app/user/admin/trainers/update`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(updatedTrainer)
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        common.showAlert(await response.text());
        state.currentTrainer = {...state.currentTrainer, ...updatedTrainer};
        showTrainerDetail();
        loadTrainers();
    } catch (error) {
        common.showErrorAlert('Ошибка сохранения: ' + error.message);
    }
}

// =============================================
// ФУНКЦИИ РАБОТЫ С УЧЕНИКАМИ
// =============================================

async function loadTrainees() {
    try {
        showLoader();
        const response = await fetch(`${baseUrl}/app/user/admin/trainees`, {
            method: 'GET'
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        if (response.status === 204) return common.showAlert('Нет учеников');

        state.trainees = await response.json();
        state.trainees.sort((a, b) => a.lastName.localeCompare(b.lastName));
        displayTrainees();
        showScreen('trainees');
    } catch (error) {
        common.showErrorAlert('Ошибка загрузки учеников: ' + error.message);
    } finally {
        hideLoader();
    }
}

function displayTrainees() {
    const container = document.getElementById('traineesList');
    if (!container) return;

    container.innerHTML = '';
    state.trainees.forEach(trainee => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <h3>${trainee.lastName} ${trainee.firstName} ${trainee.middleName || ''}</h3>
            <span class="group-tag">${trainee.group || 'Без группы'}</span>
        `;
        item.addEventListener('click', () => {
            state.currentTrainee = trainee;
            showTraineeDetail();
            showScreen('traineeDetail');
        });
        container.appendChild(item);
    });
}

async function initGroups() {
    try {
        const response = await fetch(`${baseUrl}/app/user/admin/groups`, {
            method: 'GET'
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        const groupNames = await response.json();
        state.groups = (groupNames || []).map(name => ({ id: String(name), name: String(name) }));
    } catch (error) {
        console.error('Ошибка загрузки групп:', error);
        common.showErrorAlert('Ошибка загрузки групп: ' + error.message);
    }
}

async function showTraineeDetail() {
    await initGroups();
    const trainee = state.currentTrainee;
    const detailView = document.getElementById('traineeDetail');
    const editForm = document.getElementById('traineeEditForm');

    if (!detailView || !editForm || !trainee) return;

    const groupOptions = state.groups.map(group =>
        `<option value="${group.name}" ${trainee.group === group.name ? 'selected' : ''}>
            ${group.name}
        </option>`
    ).join('');

    detailView.innerHTML = `
        <p><strong>ID:</strong> ${trainee.userId}</p>
        <p><strong>Фамилия:</strong> ${trainee.lastName}</p>
        <p><strong>Имя:</strong> ${trainee.firstName}</p>
        <p><strong>Отчество:</strong> ${trainee.middleName || '-'}</p>
        <p><strong>Группа:</strong> ${trainee.group || '-'}</p>
        <p><strong>Роль:</strong> ${trainee.role}</p>
        <p><strong>Статус оплаты:</strong> 
            <span class="payment-status ${trainee.paid ? 'paid' : 'unpaid'}">
                ${trainee.paid ? 'Оплачено' : 'Не оплачено'}
            </span>
        </p>
    `;

    editForm.innerHTML = `
        <div class="editable-field">
            <label>Фамилия</label>
            <input type="text" id="editTraineeLastName" value="${trainee.lastName}">
        </div>
        <div class="editable-field">
            <label>Имя</label>
            <input type="text" id="editTraineeFirstName" value="${trainee.firstName}">
        </div>
        <div class="editable-field">
            <label>Отчество</label>
            <input type="text" id="editTraineeMiddleName" value="${trainee.middleName || ''}">
        </div>
       <div class="editable-field">
            <label>Группа</label>
            <select id="editTraineeGroup">
                ${groupOptions}
            </select>
        </div>
        <div class="editable-field">
            <label>Роль</label>
            <select id="editTraineeRole">
                <option value="ученик">ученик</option>
                <option value="тренер">тренер</option>
                <option value="гость">гость</option>
            </select>
        </div>
        <div class="editable-field">
            <label>Статус оплаты</label>
            <select id="editTraineePaid">
                <option value="true" ${trainee.paid ? 'selected' : ''}>Оплачено</option>
                <option value="false" ${!trainee.paid ? 'selected' : ''}>Не оплачено</option>
            </select>
        </div>
    `;

    detailView.classList.remove('hidden');
    editForm.classList.add('hidden');
    document.getElementById('editTraineeBtn').classList.remove('hidden');
    document.getElementById('saveTraineeBtn').classList.add('hidden');
    document.getElementById('cancelEditTraineeBtn').classList.add('hidden');
}

function editTrainee() {
    const detailView = document.getElementById('traineeDetail');
    const editForm = document.getElementById('traineeEditForm');

    if (detailView && editForm) {
        detailView.classList.add('hidden');
        editForm.classList.remove('hidden');
        document.getElementById('editTraineeBtn').classList.add('hidden');
        document.getElementById('saveTraineeBtn').classList.remove('hidden');
        document.getElementById('cancelEditTraineeBtn').classList.remove('hidden');
    }
}

function cancelEditTrainee() {
    showTraineeDetail();
}

async function saveTrainee() {
    if (!state.currentTrainee) return;

    const updatedTrainee = {
        userId: state.currentTrainee.userId,
        lastName: document.getElementById('editTraineeLastName').value,
        firstName: document.getElementById('editTraineeFirstName').value,
        middleName: document.getElementById('editTraineeMiddleName').value,
        group: document.getElementById('editTraineeGroup').value,
        role: document.getElementById('editTraineeRole').value,
        paidStatus: document.getElementById('editTraineePaid').value === 'true'
    };

    try {
        const response = await fetch(`${baseUrl}/app/user/admin/trainees/update`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(updatedTrainee)
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        common.showAlert(await response.text());
        state.currentTrainee = {...state.currentTrainee, ...updatedTrainee};
        showTraineeDetail();
        loadTrainees();
    } catch (error) {
        common.showErrorAlert('Ошибка сохранения: ' + error.message);
    }
}

// =============================================
// ФУНКЦИИ РАБОТЫ С ГРУППАМИ
// =============================================

async function loadGroupsForDeletion() {
    try {
        showLoader();
        const response = await fetch(`${baseUrl}/app/user/admin/groups`, {
            method: 'GET'
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        const groupNames = await response.json();
        state.groups = (groupNames || []).map(name => ({ id: String(name), name: String(name) }));
        displayGroupsForDeletion();
        showScreen('deleteGroup');
    } catch (error) {
        common.showErrorAlert('Ошибка загрузки групп: ' + error.message);
    } finally {
        hideLoader();
    }
}

function displayGroupsForDeletion() {
    const select = document.getElementById('deleteGroupSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Выберите группу</option>';
    state.groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = `Группа ${group.name}`;
        select.appendChild(option);
    });
}

async function deleteGroup() {
    const select = document.getElementById('deleteGroupSelect');
    if (!select) return;

    const groupId = select.value;
    if (!groupId) {
        common.showAlert('Выберите группу для удаления');
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/app/user/admin/group/delete`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({groupId})
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        common.showAlert(await response.text());
        await loadGroupsForDeletion();
        select.value = '';
    } catch (error) {
        common.showErrorAlert('Ошибка удаления: ' + error.message);
    }
}

async function createGroup() {
    const groupNumber = document.getElementById('groupName')?.value;
    if (!groupNumber || groupNumber < 1) {
        common.showErrorAlert('Введите корректный номер группы (больше 0)');
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/app/user/admin/group/create`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({groupId: groupNumber.toString()})
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        common.showAlert(await response.text());
        document.getElementById('groupName').value = '';
        showScreen('groups');
    } catch (error) {
        common.showErrorAlert('Ошибка создания: ' + error.message);
    }
}

function setupGroupNumberControls() {
    const groupNumberInput = document.getElementById('groupName');
    const groupDecBtn = document.getElementById('groupNumberDecreaseBtn');
    const groupIncBtn = document.getElementById('groupNumberIncreaseBtn');

    if (groupDecBtn && groupIncBtn && groupNumberInput) {
        groupDecBtn.addEventListener('click', () => {
            const current = parseInt(groupNumberInput.value || '1', 10);
            const next = Math.max(1, current - 1);
            groupNumberInput.value = String(next);
        });

        groupIncBtn.addEventListener('click', () => {
            const current = parseInt(groupNumberInput.value || '1', 10);
            const next = current + 1;
            groupNumberInput.value = String(next);
        });
    }
}

// =============================================
// ФУНКЦИИ УПРАВЛЕНИЯ ПОСЕЩАЕМОСТЬЮ
// =============================================

function initVisitsScreen() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    if (startDateInput) startDateInput.value = formatDate(firstDayOfMonth);
    if (endDateInput) endDateInput.value = formatDate(today);

    state.visits.selectedGroup = null;
    state.visits.selectedTrainee = null;
    // Сбрасываем контекст добавления посещения
    state.addVisitationContext = null;
    updateSelectionInfo();
    showScreen('visits');
}

function updateSelectionInfo() {
    const groupDisplay = document.getElementById('selectedGroupDisplay');
    const traineeDisplay = document.getElementById('selectedTraineeDisplay');

    if (groupDisplay) {
        groupDisplay.value = state.visits.selectedGroup ? state.visits.selectedGroup.name : '';
        groupDisplay.placeholder = state.visits.selectedGroup ? '' : 'Не выбрана';
    }

    if (traineeDisplay) {
        const t = state.visits.selectedTrainee;
        const fullName = t ? `${t.lastName || ''} ${t.firstName || ''}`.trim() : '';
        traineeDisplay.value = fullName;
        traineeDisplay.placeholder = t ? '' : 'Не выбран';
    }
}

function resetVisitsFilters() {
    state.visits.selectedGroup = null;
    state.visits.selectedTrainee = null;

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';

    updateSelectionInfo();
}

async function selectGroupForVisits() {
    try {
        showLoader();
        const response = await fetch(`${baseUrl}/app/user/admin/groups`, { method: 'GET' });
        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        const groupNames = await response.json();
        state.groups = (groupNames || []).map(name => ({ id: String(name), name: String(name) }));
        displayGroupsForVisits();
        showScreen('selectGroup');
    } catch (error) {
        common.showErrorAlert('Ошибка загрузки групп: ' + error.message);
    } finally {
        hideLoader();
    }
}

function displayGroupsForVisits() {
    const container = document.getElementById('groupsListVisits');
    if (!container) return;

    container.innerHTML = '';
    // Добавляем проверку на наличие групп
    if (!state.groups || state.groups.length === 0) {
        container.innerHTML = '<p>Групп не найдено</p>';
        return;
    }
    state.groups.forEach(group => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `<h3>${group.name}</h3>`;
        item.addEventListener('click', () => {
            if (state.addVisitationContext === 'add') {
                state.addVisitation.selectedGroup = group;
                updateAddVisitationDisplay();
                showScreen('addVisitation');
            } else {
                state.visits.selectedGroup = group;
                state.visits.selectedTrainee = null;
                updateSelectionInfo();
                showScreen('visits');
            }
        });
        container.appendChild(item);
    });
}

async function selectTraineeForVisits() {
    try {
        showLoader();
        const response = await fetch(`${baseUrl}/app/user/admin/trainees`, { method: 'GET' });
        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        state.trainees = await response.json();
        state.trainees.sort((a, b) => {
            const aKey = `${a.lastName || ''} ${a.firstName || ''}`.trim();
            const bKey = `${b.lastName || ''} ${b.firstName || ''}`.trim();
            return aKey.localeCompare(bKey);
        });
        displayTraineesForVisits();
        showScreen('selectTrainee');
    } catch (error) {
        common.showErrorAlert('Ошибка загрузки учеников: ' + error.message);
    } finally {
        hideLoader();
    }
}

function displayTraineesForVisits() {
    const container = document.getElementById('traineesListVisits');
    if (!container) return;

    container.innerHTML = '';
    // Добавляем проверку на наличие учеников
    if (!state.trainees || state.trainees.length === 0) {
        container.innerHTML = '<p>Учеников не найдено</p>';
        return;
    }
    state.trainees.forEach(trainee => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `<h3>${trainee.lastName} ${trainee.firstName}</h3>`;
        item.addEventListener('click', () => {
            if (state.addVisitationContext === 'add') {
                state.addVisitation.selectedTrainee = trainee;
                updateAddVisitationDisplay();
                showScreen('addVisitation');
            } else {
                state.visits.selectedTrainee = trainee;
                updateSelectionInfo();
                showScreen('visits');
            }
        });
        container.appendChild(item);
    });
}


async function viewVisits() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        common.showAlert('Заполните даты');
        return;
    }

    try {
        showLoader();
        const params = {
            startDate,
            endDate,
            groupId: state.visits.selectedGroup?.id || null,
            traineeId: state.visits.selectedTrainee?.userId || null
        };

        const response = await fetch(`${baseUrl}/app/user/admin/get_visitations`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(params)
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        const visits = await response.json();
        renderVisitsResult(visits);
        showScreen('visitsResult');
    } catch (error) {
        common.showErrorAlert('Ошибка: ' + error.message);
    } finally {
        hideLoader();
    }
}

function renderVisitsResult(visits) {
    const container = document.getElementById('visitsResultList');
    if (!container) return;

    container.innerHTML = '';
    if (!visits || visits.length === 0) {
        container.innerHTML = '<p>Посещений не найдено</p>';
        return;
    }

    const sorted = [...visits].sort((a, b) => {
        const dateA = a.visitation_date || a.visitationDate || '';
        const dateB = b.visitation_date || b.visitationDate || '';
        return dateA.localeCompare(dateB);
    });

    state.visitsSelectedForDelete = new Set();

    sorted.forEach(v => {
        const dateStr = v.visitation_date || v.visitationDate || '';
        const [datePart, timePart] = dateStr.split('T');
        const formattedDate = datePart ? new Date(datePart).toLocaleDateString() : '-';
        const fullName = v.full_name || v.fullName || '-';
        const group = v.visitation_group || v.group || '-';

        const item = document.createElement('div');
        item.className = 'list-item selectable visit-tile';
        item.dataset.visitationId = v.visitationId;
        item.innerHTML = `
            <h3>${formattedDate} ${timePart || ''}</h3>
            <p>${fullName}</p>
            <p>Группа: ${group}</p>
        `;

        item.addEventListener('click', () => {
            const id = String(v.visitationId);
            if (state.visitsSelectedForDelete.has(id)) {
                state.visitsSelectedForDelete.delete(id);
                item.classList.remove('selected');
            } else {
                state.visitsSelectedForDelete.add(id);
                item.classList.add('selected');
            }
        });

        container.appendChild(item);
    });
}

async function deleteSelectedVisits() {
    const ids = Array.from(state.visitsSelectedForDelete || []);
    if (ids.length === 0) {
        common.showAlert('Выберите посещения для удаления');
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/app/user/admin/visitations/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitationIds: ids })
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        common.showAlert(await response.text());
        state.visitsSelectedForDelete = new Set();
        showScreen('visits');
    } catch (e) {
        common.showErrorAlert('Ошибка: ' + e.message);
    }
}

// =============================================
// НОВЫЙ ФУНКЦИОНАЛ ОТМЕТКИ ПРИСУТСТВИЯ
// =============================================


async function loadAllTraineesForMarking() {
    try {
        showLoader();
        const response = await fetch(`${baseUrl}/app/user/admin/trainees`, {
            method: 'GET'
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        const trainees = await response.json();

        // Сортируем учеников по фамилии
        trainees.sort((a, b) => {
            const lastNameA = a.lastName || '';
            const lastNameB = b.lastName || '';
            return lastNameA.localeCompare(lastNameB);
        });

        state.markTrainees = trainees;
        displayTraineesForMarking();
    } catch (error) {
        common.showErrorAlert('Ошибка загрузки учеников: ' + error.message);
    } finally {
        hideLoader();
    }
}

function displayTraineesForMarking() {
    const container = document.getElementById('traineesMarkList');
    if (!container) return;

    container.innerHTML = '';

    if (state.markTrainees.length === 0) {
        container.innerHTML = '<p>Учеников нет</p>';
        return;
    }

    state.markTrainees.forEach(trainee => {
        const item = document.createElement('div');
        item.className = 'list-item selectable';

        item.innerHTML = `
            <h3>${trainee.lastName} ${trainee.firstName}</h3>
            <p>${trainee.middleName || ''}</p>
        `;

        // Обновляем класс при создании
        updateSelectedClass(item, trainee);

        item.addEventListener('click', () => {
            // Находим объект в Set по userId
            const existingTrainee = findTraineeInSet(trainee.userId);

            if (existingTrainee) {
                state.selectedTrainees.delete(existingTrainee);
            } else {
                state.selectedTrainees.add(trainee);
            }

            // Обновляем класс после изменения
            updateSelectedClass(item, trainee);
        });

        container.appendChild(item);
    });
}

// Вспомогательная функция для поиска объекта в Set
function findTraineeInSet(userId) {
    for (const trainee of state.selectedTrainees) {
        if (trainee.userId === userId) return trainee;
    }
    return null;
}

// Вспомогательная функция для обновления класса
function updateSelectedClass(item, trainee) {
    const isSelected = findTraineeInSet(trainee.userId) !== null;
    item.classList.toggle('selected', isSelected);
}


// Функция для отметки присутствующих
async function markPresent() {
    try {
        showLoader();
        state.selectedTrainees.clear();

        // Загружаем всех учеников
        await loadAllTraineesForMarking();

        showScreen('markPresent');
    } catch (error) {
        common.showErrorAlert('Ошибка загрузки учеников: ' + error.message);
    } finally {
        hideLoader();
    }
}

async function confirmMarkPresent() {
    if (state.selectedTrainees.size === 0) {
        common.showErrorAlert('Ученики не выбраны!');
        return;
    }

    try {
        showLoader('Сохранение данных...');

        // Преобразуем selectedTrainees в массив для отправки
        const selectedTraineesArray = Array.from(state.selectedTrainees);

        const response = await fetch(`${baseUrl}/app/user/admin/mark_attendance`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(selectedTraineesArray) // Отправляем целые объекты trainee
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);

        common.showAlert(await response.text());
        state.selectedTrainees.clear();
        showScreen('manageAttendance');
    } catch (error) {
        common.showErrorAlert('Ошибка: ' + error.message);
    } finally {
        hideLoader();
    }
}


// =============================================
// ФУНКЦИИ ДОБАВЛЕНИЯ ПОСЕЩЕНИЙ (ОСТАВЛЕНЫ БЕЗ ИЗМЕНЕНИЙ)
// =============================================

async function addVisitation() {
    // Ваша текущая реализация
    showScreen('addVisitation');
}

// Функция инициализации экрана добавления посещения
// Стало: setupAddVisitationScreen(initialize = false)
function setupAddVisitationScreen(initialize = false) {
    if (initialize) {
        // Устанавливаем значения только при первом открытии
        const now = new Date();
        const dateInput = document.getElementById('addVisitDate');
        const timeInput = document.getElementById('addVisitTime');

        if (dateInput) {
            dateInput.value = formatDate(now);
            state.addVisitation.date = dateInput.value;
        }

        if (timeInput) {
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            timeInput.value = `${hours}:${minutes}`;
            state.addVisitation.time = timeInput.value;
        }
    }

    // Всегда обновляем отображение выбранных значений
    updateAddVisitationDisplay();
}

// Обновление отображения выбранных значений
function updateAddVisitationDisplay() {
    const traineeDisplay = document.getElementById('selectedTraineeForAddDisplay');
    const groupDisplay = document.getElementById('selectedGroupForAddDisplay');

    if (traineeDisplay) {
        const t = state.addVisitation.selectedTrainee;
        traineeDisplay.value = t ? `${t.lastName} ${t.firstName}` : '';
        traineeDisplay.placeholder = t ? '' : 'Не выбран';
    }

    if (groupDisplay) {
        const g = state.addVisitation.selectedGroup;
        groupDisplay.value = g ? g.name : '';
        groupDisplay.placeholder = g ? '' : 'Не выбрана';
    }
}

// Функция сброса значений
function resetAddVisitation(fullReset = false) {
    if (fullReset) {
        // Полный сброс только при нажатии кнопки "Сбросить" или первом открытии
        state.addVisitation = {
            date: null,
            time: null,
            selectedTrainee: null,
            selectedGroup: null
        };
    }

    // Всегда обновляем экран с учетом флага инициализации
    setupAddVisitationScreen(fullReset);
}

// Функция подтверждения добавления посещения
async function confirmAddVisitation() {
    if (!state.addVisitation.selectedTrainee) {
        common.showErrorAlert('Выберите ученика');
        return;
    }

    if (!state.addVisitation.selectedGroup) {
        common.showErrorAlert('Выберите группу');
        return;
    }

    if (!state.addVisitation.date || !state.addVisitation.time) {
        common.showErrorAlert('Укажите дату и время');
        return;
    }

    try {
        showLoader('Добавление посещения...');

        const data = {
            trainee: state.addVisitation.selectedTrainee,
            groupId: state.addVisitation.selectedGroup.id,
            date: state.addVisitation.date,
            time: state.addVisitation.time
        };

        const response = await fetch(`${baseUrl}/app/user/admin/visitations/add`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);

        common.showAlert(await response.text());
        resetAddVisitation(true); // Полный сброс после успешного добавления
        showScreen('manageAttendance');
    } catch (error) {
        common.showAlert('Ошибка: ' + error.message);
    } finally {
        hideLoader();
    }
}

// =============================================
// ОБРАБОТЧИКИ МОДАЛЬНОГО ОКНА ОТКЛОНЕНИЯ
// =============================================

async function submitReject() {
    const reason = rejectReasonInput.value.trim();
    if (!reason) {
        common.showAlert('Пожалуйста, укажите причину!');
        return;
    }

    try {
        const app = state.currentApplication;
        const response = await fetch(`${baseUrl}/app/user/admin/application/reject`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                applicationId: app.applicationId,
                reason: reason
            })
        });

        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        common.showAlert(await response.text());
        closeRejectModal();
        await loadApplications();
        showScreen('applications');
    } catch (error) {
        common.showErrorAlert('Ошибка: ' + error.message);
    }
}

function closeRejectModal() {
    rejectModal.classList.remove('active');
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =============================================

function initApp() {
    initModal();
    setupEventListeners();
    setupGroupNumberControls();
    showScreen('main');
}

// Запуск приложения после полной загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);