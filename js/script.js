document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('record-btn').addEventListener('click', startRecording);
    document.getElementById('stop-btn').addEventListener('click', stopRecording);
    document.getElementById('play-btn').addEventListener('click', playAudio);
    document.getElementById('save-btn').addEventListener('click', saveNote);
    document.getElementById('record-again-btn').addEventListener('click', recordAgain);
    document.getElementById('save-text-btn').addEventListener('click', saveTextNote);
    let mediaRecorder;
    let audioChunks = [];
    let audioUrl;
    let isRecording = false;
    let recordTimeout;
    let token = localStorage.getItem('token');

    const user = localStorage.getItem('user');
    if (user) {
        document.getElementById('user-login').textContent = user;
        document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'inline');
    } else {
        document.getElementById('user-login').textContent = 'Войти';
    }

    function startRecording() {
        if (isRecording) return;
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                audioChunks = [];
                isRecording = true;
                document.getElementById('record-btn').style.display = 'none';
                document.getElementById('stop-btn').style.display = 'inline';
                document.getElementById('play-btn').style.display = 'none';
                document.getElementById('save-btn').style.display = 'none';
                document.getElementById('record-again-btn').style.display = 'none';
                document.getElementById('save-text-btn').style.display = 'none';

                recordTimeout = setTimeout(() => {
                    stopRecording();
                    showNotification('Запись ограничена 30 секундами!', false);
                }, 30000);

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    clearTimeout(recordTimeout);
                    isRecording = false;
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    audioUrl = URL.createObjectURL(audioBlob);
                    document.getElementById('audio-player').src = audioUrl;
                    document.getElementById('play-btn').style.display = 'inline';
                    document.getElementById('save-btn').style.display = 'inline';
                    document.getElementById('record-again-btn').style.display = 'inline';
                };
            })
            .catch(error => {
                console.error('Ошибка записи:', error);
                showNotification('Ошибка доступа к микрофону.', false);
            });
    }

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            document.getElementById('stop-btn').style.display = 'none';
        }
    }

    function playAudio() {
        document.getElementById('audio-player').play();
    }

    function saveNote() {
        if (!token) {
            showNotification('Пожалуйста, войдите или зарегистрируйтесь.', false);
            return;
        }
        const userId = localStorage.getItem('userId');
        if (!userId) {
            showNotification('Ошибка: ID пользователя не найден.', false);
            return;
        }
        const noteText = document.getElementById('note-text').value || 'Голосовая заметка';
        const audioBlob = audioChunks.length ? new Blob(audioChunks, { type: 'audio/wav' }) : null;
        if (!audioBlob) {
            showNotification('Ошибка: аудиозапись не найдена.', false);
            return;
        }

        const formData = new FormData();
        formData.append('UserId', userId);
        formData.append('TextContent', noteText);
        formData.append('WavFile', audioBlob, 'voice.wav');
        // Отправляем null для Latitude и Longitude, так как они опциональны
        // formData.append('Latitude', '');
        // formData.append('Longitude', '');

        fetch('http://localhost:5057/api/inputs/wav', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        })
        .then(response => {
            console.log('Ответ сервера:', response);
            if (response.status === 200) {
                return response.json();
            } else if (response.status === 400) {
                return response.json().then(data => { throw new Error(data.Error || 'Неверные данные в запросе.') });
            } else if (response.status === 401) {
                throw new Error('Неавторизован. Пожалуйста, войдите снова.');
            } else {
                throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            showNotification('Голосовая заметка сохранена!', true);
            saveNoteLocally({ type: 'voice', text: noteText, audioUrl: audioUrl || '', date: new Date().toISOString().split('T')[0] });
            resetRecording();
            showNotesModal();
        })
        .catch(error => {
            console.error('Ошибка:', error);
            showNotification('Ошибка сохранения: ' + error.message, false);
        });
    }

    function saveTextNote() {
        if (!token) {
            showNotification('Пожалуйста, войдите или зарегистрируйтесь.', false);
            return;
        }
        const userId = localStorage.getItem('userId');
        if (!userId) {
            showNotification('Ошибка: ID пользователя не найден.', false);
            return;
        }
        const noteText = document.getElementById('note-text').value;
        if (!noteText) {
            showNotification('Введите текст заметки.', false);
            return;
        }

        const formData = new FormData();
        formData.append('UserId', userId);
        formData.append('TextContent', noteText);
        // formData.append('Latitude', '');
        // formData.append('Longitude', '');

        fetch('http://localhost:5057/api/inputs/text', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        })
        .then(response => {
            console.log('Ответ сервера:', response);
            if (response.status === 200) {
                return response.json();
            } else if (response.status === 400) {
                return response.json().then(data => { throw new Error(data.Error || 'Неверные данные в запросе.') });
            } else if (response.status === 401) {
                throw new Error('Неавторизован. Пожалуйста, войдите снова.');
            } else {
                throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            showNotification('Текстовая заметка сохранена!', true);
            saveNoteLocally({ type: 'text', text: noteText, date: new Date().toISOString().split('T')[0] });
            document.getElementById('note-text').value = '';
            document.getElementById('save-text-btn').style.display = 'none';
            showNotesModal();
        })
        .catch(error => {
            console.error('Ошибка:', error);
            showNotification('Ошибка сохранения: ' + error.message, false);
        });
    }

    function recordAgain() {
        document.getElementById('play-btn').style.display = 'none';
        document.getElementById('save-btn').style.display = 'none';
        document.getElementById('record-again-btn').style.display = 'none';
        document.getElementById('audio-player').src = '';
        startRecording();
    }

    function resetRecording() {
        document.getElementById('record-btn').style.display = 'inline';
        document.getElementById('stop-btn').style.display = 'none';
        document.getElementById('play-btn').style.display = 'none';
        document.getElementById('save-btn').style.display = 'none';
        document.getElementById('record-again-btn').style.display = 'none';
        document.getElementById('audio-player').src = '';
        audioChunks = [];
        audioUrl = null;
    }

    document.getElementById('note-text').addEventListener('input', function() {
        if (this.value.trim()) {
            document.getElementById('save-text-btn').style.display = 'inline';
        } else {
            document.getElementById('save-text-btn').style.display = 'none';
        }
    });

    function showNotesModal() {
        const sidebar = document.getElementById('notes-sidebar');
        const overlay = document.getElementById('notes-overlay');
        if (!sidebar || !overlay) {
            console.error('Элемент notes-sidebar или notes-overlay не найден!');
            return;
        }
        if (!localStorage.getItem('user')) {
            document.getElementById('notes-items').innerHTML = '<p>Вы не авторизованы. <a href="register.html">Зарегистрироваться</a> либо <a href="login.html">Авторизоваться</a></p>';
            sidebar.classList.add('active');
            overlay.classList.add('active');
            return;
        }

        const userId = localStorage.getItem('userId');
        if (!userId) {
            showNotification('Ошибка: ID пользователя не найден.', false);
            return;
        }

        // Загружаем заметки с сервера
        fetch(`http://localhost:5057/api/tasks?userId=${userId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => {
            if (response.status === 200) {
                return response.json();
            } else if (response.status === 400) {
                return response.json().then(data => { throw new Error(data.Error || 'Неверный запрос.') });
            } else if (response.status === 401) {
                throw new Error('Неавторизован. Пожалуйста, войдите снова.');
            } else {
                throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
            }
        })
        .then(tasks => {
            localStorage.setItem('notes', JSON.stringify(tasks.map(task => ({
                type: task.WavContent ? 'voice' : 'text',
                text: task.TextContent || 'Без текста',
                audioUrl: task.WavContent ? URL.createObjectURL(new Blob([new Uint8Array(task.WavContent)], { type: 'audio/wav' })) : '',
                date: task.CreatedAt ? new Date(task.CreatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            }))));
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            if (notes.length === 0) {
                document.getElementById('notes-items').innerHTML = '<p>Тут пока ничего нет(</p>';
            } else {
                document.getElementById('notes-items').innerHTML = '<h3>Мои заметки</h3><ul>' + notes.map(note => `
                    <li class="${note.type}-note" onclick="showNoteDetails('${note.type}', '${note.text}', '${note.audioUrl || ''}')">
                        ${note.type === 'voice' ? 'Голосовая заметка' : 'Текстовая заметка'} (${note.date})
                    </li>
                `).join('') + '</ul>';
            }
            sidebar.classList.add('active');
            overlay.classList.add('active');
        })
        .catch(error => {
            console.error('Ошибка загрузки заметок:', error);
            showNotification('Ошибка загрузки заметок: ' + error.message, false);
            // Показываем локальные заметки, если сервер недоступен
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            if (notes.length === 0) {
                document.getElementById('notes-items').innerHTML = '<p>Тут пока ничего нет(</p>';
            } else {
                document.getElementById('notes-items').innerHTML = '<h3>Мои заметки</h3><ul>' + notes.map(note => `
                    <li class="${note.type}-note" onclick="showNoteDetails('${note.type}', '${note.text}', '${note.audioUrl || ''}')">
                        ${note.type === 'voice' ? 'Голосовая заметка' : 'Текстовая заметка'} (${note.date})
                    </li>
                `).join('') + '</ul>';
            }
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    function showNoteDetails(type, text, audioUrl) {
        const items = document.getElementById('notes-items');
        items.innerHTML = `
            <h3>Детали заметки</h3>
            <div class="note-detail">
                <p><strong>Тип:</strong> <img src="img/${type === 'voice' ? 'micro.png' : 'node.png'}" alt="${type}">${type === 'voice' ? 'Голосовая' : 'Текстовая'}</p>
                <p><strong>Текст:</strong> ${text}</p>
                ${type === 'voice' && audioUrl ? `<audio controls src="${audioUrl}"></audio>` : ''}
                <button onclick="returnToNotes()">Вернуться</button>
            </div>
        `;
    }

    function returnToNotes() {
        showNotesModal();
    }

    function saveNoteLocally(note) {
        note.date = new Date().toISOString().split('T')[0];
        let notes = JSON.parse(localStorage.getItem('notes') || '[]');
        notes.push(note);
        localStorage.setItem('notes', JSON.stringify(notes));
    }

    function showNotification(message, isSuccess = false) {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.textContent = message;
            notification.style.color = isSuccess ? 'green' : 'red';
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }

    document.getElementById('notes-link').addEventListener('click', function(event) {
        event.preventDefault();
        showNotesModal();
    });

    document.getElementById('close-notes').addEventListener('click', () => {
        const sidebar = document.getElementById('notes-sidebar');
        const overlay = document.getElementById('notes-overlay');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    document.getElementById('notes-overlay').addEventListener('click', () => {
        const sidebar = document.getElementById('notes-sidebar');
        const overlay = document.getElementById('notes-overlay');
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    document.getElementById('logout-btn').addEventListener('click', function(event) {
        event.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('notes');
        document.getElementById('user-login').textContent = 'Войти';
        document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'none');
        showNotification('Вы вышли из аккаунта', true);
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    });

    // Экспортируем функции для тестирования (если нужно)
    window.startRecording = startRecording;
    window.stopRecording = stopRecording;
    window.playAudio = playAudio;
    window.saveNote = saveNote;
    window.saveTextNote = saveTextNote;
    window.recordAgain = recordAgain;
    window.resetRecording = resetRecording;
    window.showNotesModal = showNotesModal;
    window.showNoteDetails = showNoteDetails;
    window.returnToNotes = returnToNotes;
    window.saveNoteLocally = saveNoteLocally;
    window.showNotification = showNotification;
});