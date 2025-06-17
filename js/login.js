document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const notification = document.getElementById('notification');
    const loginInput = document.getElementById('login'); // Было username
    const password = document.getElementById('password');

    function validateField(input) {
        let isValid = true;
        if (input.id === 'login') {
            isValid = input.value.trim().length > 0 && input.value.trim().length <= 15;
        } else if (input.id === 'password') {
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
            isValid = passwordRegex.test(input.value.trim());
        }
        input.classList.toggle('invalid', !isValid);
        return isValid;
    }

    [loginInput, password].forEach(input => {
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
        const isLoginValid = validateField(loginInput);
        const isPasswordValid = validateField(password);

        console.log('Валидация:', { isLoginValid, isPasswordValid });

        if (isLoginValid && isPasswordValid) {
            const userData = {
                login: loginInput.value.trim(),
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
                    if (response.status === 401) throw new Error('Неверный логин или пароль');
                    throw new Error(`Ошибка входа: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Данные от сервера:', data);
                // Проверяем возможные форматы ответа
                const token = data.token || data.accessToken;
                const user = data.user || data;
                const userId = user?.id || user?.userId;
                const userLogin = user?.login || user?.username;

                if (token && userId && userLogin) {
                    localStorage.setItem('token', token);
                    localStorage.setItem('user', userLogin);
                    localStorage.setItem('userId', userId);
                    showNotification('Вход успешен!', true);
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    console.error('Неверный формат ответа:', JSON.stringify(data));
                    throw new Error(`Неверный формат ответа сервера: ${JSON.stringify(data)}`);
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