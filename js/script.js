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
        formData.append('Text', noteText);
        formData.append('AudioFile', audioBlob, 'voice.wav');

        fetch('http://localhost:5057/api/inputs/audio', {
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
            saveNoteLocally({
                taskId: data.Task?.TaskId || Date.now().toString(), // Сохраняем taskId из ответа бэкенда
                type: 'voice',
                name: data.Task?.Name || noteText,
                text: noteText,
                category: data.Task?.Category || 'Без категории',
                createdAt: data.Task?.CreatedAt ? new Date(data.Task.CreatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
                locationName: data.Task?.LocationName || '',
                dueTime: data.Task?.DueTime ? new Date(data.Task.DueTime).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '',
                isCompleted: data.Task?.IsCompleted || false,
                audioUrl: audioUrl || ''
            });
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
        formData.append('Text', noteText);
        formData.append('IsCompleted', 'false');

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
            saveNoteLocally({
                taskId: data.Task?.TaskId || Date.now().toString(), // Сохраняем taskId из ответа бэкенда
                type: 'text',
                name: data.Task?.Name || noteText,
                text: noteText,
                category: data.Task?.Category || 'Без категории',
                createdAt: data.Task?.CreatedAt ? new Date(data.Task.CreatedAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
                locationName: data.Task?.LocationName || '',
                dueTime: data.Task?.DueTime ? new Date(data.Task.DueTime).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '',
                isCompleted: data.Task?.IsCompleted || false
            });
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

        fetch(`http://localhost:5057/api/tasks/user/${userId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => {
            if (response.status === 200) {
                return response.json();
            } else if (response.status === 400) {
                return response.json().then(data => { throw new Error(data.error || 'Неверный запрос.') });
            } else if (response.status === 401) {
                throw new Error('Неавторизован. Пожалуйста, войдите снова.');
            } else {
                throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
            }
        })
        .then(tasks => {
            localStorage.setItem('notes', JSON.stringify(tasks.map(task => ({
                taskId: task.taskId,
                name: task.name,
                text: task.text || 'Без текста',
                category: task.category,
                createdAt: task.createdAt ? new Date(task.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : 'Нет даты',
                locationName: task.locationName || '',
                dueTime: task.dueTime ? new Date(task.dueTime).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '',
                isCompleted: task.isCompleted || false
            }))));
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            if (notes.length === 0) {
                document.getElementById('notes-items').innerHTML = '<p>Тут пока ничего нет :(</p>';
            } else {
                document.getElementById('notes-items').innerHTML = `
                    <h3>Мои заметки</h3>
                    <div class="notes-list">
                        ${notes.map(note => `
                            <div class="note-card ${note.isCompleted ? 'completed' : ''}">
                                <div class="note-content" onclick="showNoteDetails(
                                    '${note.taskId}',
                                    '${note.name}',
                                    '${note.text}',
                                    '${note.category}',
                                    '${note.createdAt}',
                                    '${note.locationName}',
                                    '${note.dueTime}',
                                    ${note.isCompleted}
                                )">
                                    <h4>${note.name}</h4>
                                    <p class="note-date">${note.createdAt}</p>
                                </div>
                                <button class="complete-btn" onclick="toggleTaskCompletion('${note.taskId}', ${note.isCompleted})">
                                    ${note.isCompleted ? 'Снять отметку' : 'Не выполнено'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            sidebar.classList.add('active');
            overlay.classList.add('active');
        })
        .catch(error => {
            console.error('Ошибка загрузки заметок:', error);
            showNotification('Ошибка загрузки заметок: ' + error.message, false);
            const notes = JSON.parse(localStorage.getItem('notes') || '[]');
            if (notes.length === 0) {
                document.getElementById('notes-items').innerHTML = '<p>Тут пока ничего нет :(</p>';
            } else {
                document.getElementById('notes-items').innerHTML = `
                    <h3>Мои заметки</h3>
                    <div class="notes-list">
                        ${notes.map(note => `
                            <div class="note-card ${note.isCompleted ? 'completed' : ''}">
                                <div class="note-content" onclick="showNoteDetails(
                                    '${note.taskId}',
                                    '${note.name}',
                                    '${note.text}',
                                    '${note.category}',
                                    '${note.createdAt}',
                                    '${note.locationName}',
                                    '${note.dueTime}',
                                    ${note.isCompleted}
                                )">
                                    <h4>${note.name}</h4>
                                    <p class="note-date">${note.createdAt}</p>
                                </div>
                                <button class="complete-btn" onclick="toggleTaskCompletion('${note.taskId}', ${note.isCompleted})">
                                    ${note.isCompleted ? 'Снять отметку' : 'Выполнено'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    function showNoteDetails(taskId, name, text, category, createdAt, locationName, dueTime, isCompleted) {
        const items = document.getElementById('notes-items');
        items.innerHTML = `
            <h3>Детали заметки</h3>
            <div class="note-detail">
                <h4>${name}</h4>
                <p><strong>Текст:</strong> ${text}</p>
                <p><strong>Категория:</strong> ${category}</p>
                <p><strong>Дата создания:</strong> ${createdAt}</p>
                ${locationName ? `<p><strong>Локация:</strong> ${locationName}</p>` : ''}
                ${dueTime ? `<p><strong>Время выполнения:</strong> ${dueTime}</p>` : ''}
                <p><strong>Статус:</strong> ${isCompleted ? 'Выполнено' : 'Не выполнено'}</p>
                <button class="note-detail-btn" onclick="toggleTaskCompletion('${taskId}', ${isCompleted})">
                    ${isCompleted ? 'Снять отметку' : 'Отметить выполненной'}
                </button>
                <button class="note-detail-btn" onclick="openMapForNote('${taskId}')">
                    ${locationName ? 'Изменить локацию' : 'Добавить локацию'}
                </button>
                <button class="note-detail-btn return-btn" onclick="returnToNotes()">Вернуться</button>
            </div>
        `;
    }

    function openMapForNote(taskId) {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        if (!token || !userId) {
            showNotification('Пожалуйста, войдите или зарегистрируйтесь.', false);
            return;
        }
        initMap(taskId, token, userId, (locationData) => {
            // Обновляем локальное хранилище и UI после выбора локации
            let notes = JSON.parse(localStorage.getItem('notes') || '[]');
            const note = notes.find(note => note.taskId === taskId);
            if (!note) {
                showNotification('Заметка не найдена в локальном хранилище.', false);
                showNotesModal(); // Возвращаемся к списку заметок
                return;
            }
            notes = notes.map(note => 
                note.taskId === taskId 
                    ? { ...note, locationName: locationData.address }
                    : note
            );
            localStorage.setItem('notes', JSON.stringify(notes));
            showNoteDetails(
                taskId,
                note.name,
                note.text,
                note.category,
                note.createdAt,
                locationData.address,
                note.dueTime,
                note.isCompleted
            );
        });
    }

    function toggleTaskCompletion(taskId, isCompleted) {
        if (!token) {
            showNotification('Пожалуйста, войдите или зарегистрируйтесь.', false);
            return;
        }
        const userId = localStorage.getItem('userId');
        if (!userId) {
            showNotification('Ошибка: ID пользователя не найден.', false);
            return;
        }

        fetch(`http://localhost:5057/api/tasks/${taskId}/complete`, {
            method: 'PUT', 
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isCompleted: !isCompleted })
        })
        .then(response => {
            if (response.status === 200) {
                return response.json();
            } else if (response.status === 400) {
                return response.json().then(data => { throw new Error(data.error || 'Неверный запрос.') });
            } else if (response.status === 401) {
                throw new Error('Неавторизован. Пожалуйста, войдите снова.');
            } else if (response.status === 404) {
                throw new Error('Заметка не найдена.');
            } else {
                throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            showNotification(`Заметка ${isCompleted ? 'не выполнена' : 'выполнена'}!`, true);
            let notes = JSON.parse(localStorage.getItem('notes') || '[]');
            notes = notes.map(note => note.taskId === taskId ? { ...note, isCompleted: !isCompleted } : note);
            localStorage.setItem('notes', JSON.stringify(notes));
            showNotesModal();
        })
        .catch(error => {
            console.error('Ошибка обновления статуса:', error);
            showNotification('Ошибка: ' + error.message, false);
        });
    }

    function returnToNotes() {
        showNotesModal();
    }

    function saveNoteLocally(note) {
        note.date = new Date().toISOString().split('T')[0];
        note.isCompleted = note.isCompleted ?? false;
        let notes = JSON.parse(localStorage.getItem('notes') || '[]');
        // Проверяем, не существует ли заметка с таким taskId
        notes = notes.filter(n => n.taskId !== note.taskId); // Удаляем старую версию, если есть
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
    window.toggleTaskCompletion = toggleTaskCompletion;
    window.openMapForNote = openMapForNote;
});