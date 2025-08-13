// Общие функции для всех ролей
const common = {
    // Инициализация Telegram WebApp
    initTelegram: () => {
        const tg = Telegram.WebApp;
        tg.expand();
        tg.enableClosingConfirmation();
        tg.setHeaderColor('#2a2a2a');
        tg.setBackgroundColor('#2a2a2a');
        return tg;
    },

    // Показать уведомление
    showAlert: (message) => {
        const alert = document.createElement('div');
        alert.className = 'alert';
        alert.textContent = message;
        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 3000);
    },

    // Показать уведомление
    showErrorAlert: (message) => {
        const alert = document.createElement('div');
        alert.className = 'error_alert';
        alert.textContent = message;
        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 3000);
    },

    // Переключение между экранами
    showScreen: (screenId, screens) => {
        screens.forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    }
};

// Экспортируем для использования в других файлах
window.common = common;