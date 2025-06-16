document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const notification = document.getElementById('notification');
    const username = document.getElementById('username');
    const password = document.getElementById('password');

    function validateField(input) {
        let isValid = true;
        if (input.id === 'username') {
            isValid = input.value.trim().length > 0 && input.value.trim().length <= 15;
        } else if (input.id === 'password') {
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
            isValid = passwordRegex.test(input.value.trim());
        }
        input.classList.toggle('invalid', !isValid);
        return isValid;
    }

    [username, password].forEach(input => {
        input.addEventListener('input', () => validateField(input));
    });

    function showNotification(message, isSuccess = false) {
        if (notification) {
            notification.textContent = message;
            notification.style.color = isSuccess ? 'green' : 'red';
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }

    loginBtn.addEventListener('click', () => {
        console.log('Кнопка входа нажата');
        const isUsernameValid = validateField(username);
        const isPasswordValid = validateField(password);

        console.log('Валидация:', { isUsernameValid, isPasswordValid });

        if (isUsernameValid && isPasswordValid) {
            const userData = {
                username: username.value.trim(),
                password: password.value.trim()
            };
            console.log('Отправляем данные:', userData);

            fetch('http://localhost:5057/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            })
            .then(response => {
                console.log('Ответ сервера:', response);
                if (!response.ok) {
                    if (response.status === 401) throw new Error('Неверное имя пользователя или пароль');
                    throw new Error(`Ошибка входа: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Данные от сервера:', data);
                if (data.token && data.user && data.user.id) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', data.user.username);
                    localStorage.setItem('userId', data.user.id);
                    showNotification('Вход успешен!', true);
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    throw new Error('Неверный формат ответа сервера.');
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                showNotification('Ошибка: ' + error.message, false);
            });
        } else {
            showNotification('Проверьте введенные данные.');
        }
    });

    document.getElementById('close-login').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});