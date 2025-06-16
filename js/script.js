let mediaRecorder;
let audioChunks = [];
let audioUrl;
let isRecording = false;
let recordTimeout;
let token = localStorage.getItem('token');

window.onload = function() {
    const user = localStorage.getItem('user');
    if (user) {
        document.getElementById('user-login').textContent = user;
    }
};

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
                showNotification('Запись ограничена 30 секундами!');
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
        showNotification('Пожалуйста, войдите или зарегистрируйтесь.');
        return;
    }
    const noteText = document.getElementById('note-text').value || 'Голосовая заметка';
    const audioBlob = audioUrl ? new Blob([audioUrl], { type: 'audio/wav' }) : null;
    const formData = new FormData();
    formData.append('text', noteText);
    if (audioBlob) formData.append('audio', audioBlob, 'voice.wav');

    fetch('/api/notes', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    })
    .then(response => response.json())
    .then(() => {
        showNotification('Заметка сохранена!');
        resetRecording();
        showNotesModal();
    })
    .catch(error => showNotification('Ошибка сохранения: ' + error));
}

function saveTextNote() {
    if (!token) {
        showNotification('Пожалуйста, войдите или зарегистрируйтесь.');
        return;
    }
    const noteText = document.getElementById('note-text').value;
    if (noteText) {
        fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text: noteText, type: 'text' })
        })
        .then(response => response.json())
        .then(() => {
            showNotification('Заметка сохранена!');
            document.getElementById('note-text').value = '';
            document.getElementById('save-text-btn').style.display = 'none';
            showNotesModal();
        })
        .catch(error => showNotification('Ошибка сохранения: ' + error));
    }
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
}

document.getElementById('note-text').addEventListener('input', function() {
    if (this.value.trim()) {
        document.getElementById('save-text-btn').style.display = 'inline';
    } else {
        document.getElementById('save-text-btn').style.display = 'none';
    }
});

function createRequest() {
    if (!confirm('Действительно хотите создать запрос?')) return;
    if (!token) {
        showNotification('Пожалуйста, войдите или зарегистрируйтесь.');
        return;
    }
    const sidebar = document.getElementById('notes-sidebar');
    const overlay = document.getElementById('notes-overlay');
    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.getElementById('notes-items').innerHTML = '<h3>Создать запрос</h3><p>Функция в разработке...</p>';
}

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

function showNotesModal() {
    const sidebar = document.getElementById('notes-sidebar');
    const overlay = document.getElementById('notes-overlay');
    if (!sidebar || !overlay) {
        console.error('Элемент notes-sidebar или notes-overlay не найден!');
        return;
    }
    if (!localStorage.getItem('user')) {
        document.getElementById('notes-items').innerHTML = '<p>Вы не авторизованы. <a href="register.html">Зарегистрироваться</a></p>';
    } else {
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
    }
    sidebar.classList.add('active');
    overlay.classList.add('active');
}

function showNoteDetails(type, text, audioUrl) {
    const items = document.getElementById('notes-items');
    items.innerHTML = `
        <h3>Детали заметки</h3>
        <div class="note-detail">
            <p><strong>Тип:</strong> <img src="img/${type === 'voice' ? 'micro.png' : 'node.png'}" alt="${type}">${type === 'voice' ? 'Голосовая' : 'Текстовая'}</p>
            <p><strong>Текст:</strong> ${text}</p>
            ${type === 'voice' ? `<audio controls src="${audioUrl}"></audio>` : ''}
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

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

document.getElementById('notes-link').addEventListener('click', function(event) {
    event.preventDefault();
    showNotesModal();
});