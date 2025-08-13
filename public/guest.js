import {baseUrl} from './config.js';

// =============================================
// БЛОК ИНИЦИАЛИЗАЦИИ
// =============================================

let tg, user;

try {
    tg = Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();
    tg.setHeaderColor('#2a2a2a');
    tg.setBackgroundColor('#2a2a2a');
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
    application: document.getElementById('applicationScreen')
};

/**
 * Глобальное состояние приложения
 */
const state = {
    applicationSent: false,
    applicationData: null
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
// ФУНКЦИИ РАБОТЫ С ПРОФИЛЕМ И ЗАЯВКАМИ
// =============================================

/**
 * Обновляет информацию в профиле пользователя
 */
function updateUserInfo() {
    const container = document.getElementById('userInfo');
    if (!container) return;

    if (state.applicationSent && state.applicationData) {
        container.innerHTML = `
            <p><strong>Роль:</strong> Гость</p>
            <p><strong>ID:</strong> ${user.id || '-'}</p>
            <p><strong>Фамилия:</strong> ${state.applicationData.lastName || '-'}</p>
            <p><strong>Имя:</strong> ${state.applicationData.firstName || '-'}</p>
            <p><strong>Отчество:</strong> ${state.applicationData.middleName || '-'}</p>
            <p><strong>Группа:</strong> ${state.applicationData.group || '-'}</p>
            <p><em>🕗 Ожидание подтверждения администратором</em></p>
        `;
    } else {
        container.innerHTML = `
            <p><strong>Роль:</strong> Гость</p>
            <p><strong>ID:</strong> ${user.id || '-'}</p>
            <p><strong>Фамилия:</strong> -</p>
            <p><strong>Имя:</strong> -</p>
            <p><strong>Отчество:</strong> -</p>
            <p><strong>Группа:</strong> -</p>
            <p><em>ℹ️ Для доступа к функциям отправьте заявку</em></p>
        `;
    }
}

/**
 * Загружает данные заявки с сервера
 */
async function loadApplicationData() {
    try {
        showLoader('Проверка заявки...');

        const response = await fetch(`${baseUrl}/app/user/guest/get_application`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({userId: user.id})
        });

        if (response.ok) {
            const applicationData = await response.json();
            // Проверяем, что заявка действительна
            if (applicationData.lastName) {
                state.applicationSent = true;
                state.applicationData = applicationData;
            } else {
                state.applicationSent = false;
                state.applicationData = null;
            }
        } else if (response.status === 404) {
            state.applicationSent = false;
            state.applicationData = null;
        } else {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        common.showErrorAlert('Ошибка загрузки профиля: ' + error.message);
        state.applicationSent = false;
        state.applicationData = null;
    } finally {
        hideLoader();
    }
}

/**
 * Отправляет заявку на сервер
 */
async function submitApplication(e) {
    if (e) e.preventDefault();

    // Собираем данные из формы
    const applicationData = {
        userId: user.id,
        lastName: document.getElementById('lastName').value,
        firstName: document.getElementById('firstName').value,
        middleName: document.getElementById('middleName').value,
        group: document.getElementById('group').value
    };

    try {
        showLoader('Отправка заявки...');

        const response = await fetch(`${baseUrl}/app/user/guest/create_application`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(applicationData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ошибка ${response.status}: ${errorText}`);
        }

        const result = await response.text();
        state.applicationSent = true;
        state.applicationData = applicationData;
        updateUserInfo();
        showScreen('profile');
        common.showAlert(result);
    } catch (error) {
        console.error('Ошибка создания заявки:', error);
        common.showErrorAlert('Ошибка отправки заявки: ' + error.message);
    } finally {
        hideLoader();
    }
}

/**
 * Заполняет форму существующими данными заявки
 */
function fillApplicationForm() {
    if (state.applicationData) {
        document.getElementById('lastName').value = state.applicationData.lastName || '';
        document.getElementById('firstName').value = state.applicationData.firstName || '';
        document.getElementById('middleName').value = state.applicationData.middleName || '';
        document.getElementById('group').value = state.applicationData.group || '';
    }
}

// =============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// =============================================

function setupEventListeners() {
    // Навигация
    document.getElementById('profileBtn')?.addEventListener('click', async () => {
        await loadApplicationData();
        updateUserInfo();
        showScreen('profile');
    });

    document.getElementById('visitsBtn')?.addEventListener('click', () => {
        if (state.applicationSent) {
            common.showAlert('Ваша заявка на рассмотрении. Ожидайте подтверждения администратора.');
        } else {
            common.showErrorAlert('Для просмотра посещений необходимо отправить заявку в профиле.');
        }
    });

    document.getElementById('applicationBtn')?.addEventListener('click', () => {
        fillApplicationForm();
        showScreen('application');
    });

    document.getElementById('backFromProfileBtn')?.addEventListener('click', () => showScreen('main'));
    document.getElementById('cancelApplicationBtn')?.addEventListener('click', () => showScreen('profile'));

    // Форма заявки
    document.getElementById('applicationForm')?.addEventListener('submit', submitApplication);
}

// =============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// =============================================

function initApp() {
    updateUserInfo();
    setupEventListeners();
    showScreen('main');
}

// Запуск приложения после полной загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);