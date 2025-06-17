document.addEventListener('DOMContentLoaded', () => {
    const registerBtn = document.getElementById('register-btn');
    const notification = document.getElementById('notification');
    const loginInput = document.getElementById('login');
    const nameInput = document.getElementById('name');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm-password');

    function validateField(input) {
        let isValid = true;
        if (input.id === 'login') {
            isValid = input.value.trim().length > 0 && input.value.trim().length <= 15;
        } else if (input.id === 'name') {
            isValid = input.value.trim().length > 0;
            input.value = input.value.trim().charAt(0).toUpperCase() + input.value.trim().slice(1);
        } else if (input.id === 'password' || input.id === 'confirm-password') {
            const passwordValue = password.value.trim();
            const confirmPasswordValue = confirmPassword.value.trim();
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
            isValid = passwordRegex.test(passwordValue) && passwordValue === confirmPasswordValue;
            password.classList.toggle('invalid', !isValid);
            confirmPassword.classList.toggle('invalid', !isValid);
        }
        input.classList.toggle('invalid', !isValid);
        return isValid;
    }

    [loginInput, nameInput, password, confirmPassword].forEach(input => {
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

    registerBtn.addEventListener('click', () => {
        console.log('Кнопка регистрации нажата');
        const isLoginValid = validateField(loginInput);
        const isNameValid = validateField(nameInput);
        const isPasswordValid = validateField(password);
        const isConfirmValid = validateField(confirmPassword);

        console.log('Валидация:', { isLoginValid, isNameValid, isPasswordValid, isConfirmValid });

        if (isLoginValid && isNameValid && isPasswordValid && isConfirmValid) {
            const userData = {
                login: loginInput.value.trim(),
                name: nameInput.value.trim(),
                password: password.value.trim()
            };
            console.log('Отправляем данные:', userData);

            fetch('http://localhost:5057/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            })
            .then(response => {
                console.log('Ответ сервера:', response);
                if (!response.ok) {
                    return response.json().then(data => {
                        const errorMessage = data.error || data.message || `Ошибка регистрации: ${response.statusText}`;
                        if (response.status === 400) {
                            throw new Error(errorMessage || 'Пользователь уже существует или неверные данные');
                        }
                        throw new Error(errorMessage);
                    });
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
                    showNotification('Регистрация успешна!', true);
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

    document.getElementById('close-register').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});