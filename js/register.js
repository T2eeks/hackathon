document.addEventListener('DOMContentLoaded', () => {
    const registerBtn = document.getElementById('register-btn');
    const notification = document.getElementById('notification');
    const email = document.getElementById('email');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm-password');

    function validateField(input) {
        let isValid = true;
        if (input.id === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            isValid = emailRegex.test(input.value.trim());
        } else if (input.id === 'username') {
            isValid = input.value.trim().length > 0 && input.value.trim().length <= 15;
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

    [email, username, password, confirmPassword].forEach(input => {
        input.addEventListener('input', () => validateField(input));
    });

    function showNotification(message) {
        if (notification) {
            notification.textContent = message;
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }

    registerBtn.addEventListener('click', () => {
        console.log('Кнопка регистрации нажата');
        const isEmailValid = validateField(email);
        const isUsernameValid = validateField(username);
        const isPasswordValid = validateField(password);
        const isConfirmValid = validateField(confirmPassword);

        console.log('Валидация:', { isEmailValid, isUsernameValid, isPasswordValid, isConfirmValid });

        if (isEmailValid && isUsernameValid && isPasswordValid && isConfirmValid) {
            const userData = {
                username: username.value.trim(),
                email: email.value.trim(),
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
                if (!response.ok) throw new Error('Ошибка регистрации: ' + response.statusText);
                return response.json();
            })
            .then(data => {
                console.log('Данные от сервера:', data);
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', data.user.username);
                    showNotification('Регистрация успешна!');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                showNotification('Ошибка регистрации: ' + error.message);
            });
        } else {
            showNotification('Проверьте введенные данные.');
        }
    });

    document.getElementById('close-register').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});