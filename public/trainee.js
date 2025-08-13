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
    tg = {initDataUnsafe: {}};
    user = {id: 0};
}

/**
 * Коллекция экранов приложения
 * @type {Object.<string, HTMLElement>}
 */
const screens = {
    main: document.getElementById('mainScreen'),
    profile: document.getElementById('profileScreen'),
    visits: document.getElementById('visitsScreen')
};

/**
 * Глобальное состояние приложения
 */
const state = {
    userData: null,
    visits: []
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

// =============================================
// ЗАГРУЗКА ДАННЫХ
// =============================================

// Загрузка профиля ученика
async function loadTraineeProfile() {
    if (!user?.id) {
        common.showErrorAlert('Ошибка: ID пользователя не определен');
        return;
    }

    try {
        showLoader('Загрузка профиля...');

        const response = await fetch(`${baseUrl}/app/user/trainee/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.id
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка сервера: ${response.status}`);
        }

        const data = await response.json();
        state.userData = data;
        updateTraineeProfileInfo();
        showScreen('profile');
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        common.showErrorAlert('Не удалось загрузить профиль: ' + error.message);
    } finally {
        hideLoader();
    }
}

// Обновление информации в профиле ученика
function updateTraineeProfileInfo() {
    if (!state.userData) return;

    const container = document.getElementById('userInfo');
    if (!container) return;

    container.innerHTML = `
        <p><span class="label">ID: </span> <span class="value">${state.userData.userId || '-'}</span></p>
        <p><span class="label">Фамилия: </span> <span class="value">${state.userData.lastName || '-'}</span></p>
        <p><span class="label">Имя: </span> <span class="value">${state.userData.firstName || '-'}</span></p>
        <p><span class="label">Отчество: </span> <span class="value">${state.userData.middleName || '-'}</span></p>
        <p><span class="label">Группа: </span> <span class="value">${state.userData.group || '-'}</span></p>
        <p><span class="label">Роль: </span> <span class="value">${state.userData.role || 'ученик'}</span></p>
        <p><span class="label">Статус оплаты: </span>  
            <span class="payment-status ${state.userData.paid ? 'paid' : 'unpaid'}">
                ${state.userData.paid ? 'Оплачено' : 'Не оплачено'}
            </span>
        </p>
    `;
}

// Просмотр посещений
async function viewVisits() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        common.showErrorAlert('Заполните обе даты');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        common.showErrorAlert('Дата начала не может быть позже даты окончания');
        return;
    }

    try {
        showLoader('Загрузка посещений...');

        const response = await fetch(`${baseUrl}/app/user/trainee/get_visitations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.id,
                startDate: startDate,
                endDate: endDate
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Ошибка сервера: ${response.status}`);
        }

        state.visits = await response.json();
        displayVisits();

    } catch (error) {
        console.error('Ошибка загрузки посещений:', error);
        common.showErrorAlert('Ошибка загрузки посещений: ' + error.message);
    } finally {
        hideLoader();
    }
}

// Отображение посещений
function displayVisits() {
    const container = document.getElementById('visitsResult');
    if (!container) return;

    container.innerHTML = '';

    if (!state.visits || state.visits.length === 0) {
        container.innerHTML = '<div class="visit-card"><p>Посещений не найдено</p></div>';
        return;
    }

    let html = '';
    state.visits.forEach(visit => {
        const dateStr = visit.visitation_date || visit.visitationDate || '';
        const [datePart, timePart] = dateStr.split('T');
        const [year, month, day] = datePart.split('-');
        const formattedDate = `${day}-${month}-${year}`;

        html += `
            <div class="visit-card">
                <p><span class="label">Дата:</span> <span class="value">${formattedDate || '-'}</span></p>
                <p><span class="label">Время:</span> <span class="value">${timePart || '-'}</span></p>
                <p><span class="label">Группа:</span> <span class="value">${visit.group || '-'}</span></p>
            </div>
        `;
    });

    container.innerHTML = html;
}

// =============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// =============================================

function setupEventListeners() {
    // Навигация
    document.getElementById('profileBtn')?.addEventListener('click', loadTraineeProfile);
    document.getElementById('visitsBtn')?.addEventListener('click', () => showScreen('visits'));
    document.getElementById('backFromProfileBtn')?.addEventListener('click', () => showScreen('main'));
    document.getElementById('backFromVisitsBtn')?.addEventListener('click', () => showScreen('main'));
    document.getElementById('viewVisitsBtn')?.addEventListener('click', viewVisits);
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =============================================

function initApp() {
    // Установка дат по умолчанию
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput) startDateInput.valueAsDate = firstDayOfMonth;
    if (endDateInput) endDateInput.valueAsDate = today;

    // Настройка обработчиков событий
    setupEventListeners();

    // Показ главного экрана
    showScreen('main');
}

// Запуск приложения после полной загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);