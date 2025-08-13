import { baseUrl } from './config.js';
import { APP_VERSION } from './config.js';

const tg = Telegram.WebApp; // Правильное присвоение

const cachedVersion = localStorage.getItem('app_version');
if (cachedVersion !== APP_VERSION) {
    // 1. Очищаем кеш Telegram WebView
    tg.clearCache = true;
    tg.expand();

    // 2. Обновляем версию в localStorage
    localStorage.setItem('app_version', APP_VERSION);

    // 3. Добавляем параметр версии ко всем ресурсам
    document.querySelectorAll('script[src], link[href]').forEach(el => {
        const url = new URL(el.src || el.href, baseUrl);
        url.searchParams.set('v', APP_VERSION);
        if (el.src) el.src = url.toString();
        if (el.href) el.href = url.toString();
    });

    alert(`Обновлено до версии ${APP_VERSION}`);
}

tg.expand();
tg.enableClosingConfirmation();
tg.setHeaderColor('#2a2a2a');
tg.setBackgroundColor('#2a2a2a');

// Определение роли пользователя
async function determineUserRole() {
    try {
        const user = tg.initDataUnsafe.user;
        if (!user) return redirectToRole('guest');

        const response = await fetch(`${baseUrl}/app/user/data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: user.id })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        await showSomeMessage('Ваша роль: ' + data.role);
        redirectToRole(data.role);
    } catch (error) {
        console.error('Ошибка определения роли:', error);
        document.getElementById('errorMessage').textContent =
            `Ошибка: ${error.message}. Перенаправляем в гостевой режим.`;
        document.getElementById('errorMessage').style.display = 'block';
        setTimeout(() => redirectToRole('guest'), 3000);
    }
}

// Перенаправление на соответствующий интерфейс
function redirectToRole(role) {
    switch (role) {
        case 'ученик':
            window.location.href = 'trainee.html';
            break;
        case 'тренер':
            window.location.href = 'admin.html';
            break;
        case 'администратор':
            window.location.href = 'admin.html';
            break;
        default:
            window.location.href = 'guest.html';
            break;
    }
}

// Запускаем определение роли при загрузке
window.addEventListener('DOMContentLoaded', determineUserRole);

// Всплывающее окно
function showPopup(message) {
    return new Promise(resolve => {
        const popup = document.getElementById('popupNotification');
        popup.innerText = message;
        popup.classList.remove('hidden');
        popup.style.display = 'block';

        setTimeout(() => {
            popup.classList.add('hidden');
            setTimeout(() => {
                popup.style.display = 'none';
                resolve(); // завершение промиса после исчезновения
            }, 2000);
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function showSomeMessage(message) {
    await showPopup(message);
}
