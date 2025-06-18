const YANDEX_API_URL = 'https://api-maps.yandex.ru/2.1/?apikey=b837b7cc-fc22-46bf-8ce8-7fa761d44747&lang=ru_RU';

let map, placemark, searchControl;

function initMap(noteId, token, userId, onLocationSelected) {
    const modal = document.getElementById('map-modal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    const script = document.createElement('script');
    script.src = YANDEX_API_URL;
    script.async = true;
    script.onload = () => {
        ymaps.ready(() => {
            map = new ymaps.Map('map-container', {
                center: [56.48466329899591, 84.94837595719432], 
                zoom: 10,
                controls: []
            });

            map.controls.add('zoomControl');
            map.controls.add('typeSelector');
            map.controls.add('fullscreenControl');

            searchControl = new ymaps.control.SearchControl({
                options: {
                    float: 'left',
                    floatIndex: 100,
                    placeholderContent: 'Поиск адреса...',
                    noPlacemark: true,
                    provider: 'yandex#search'
                }
            });
            map.controls.add(searchControl);

            searchControl.events.add('resultselect', (e) => {
                const index = e.get('index');
                searchControl.getResult(index).then((res) => {
                    const coords = res.geometry.getCoordinates();
                    const address = res.properties.get('text');
                    createPlacemark(coords, address);
                    showLocationConfirmation(noteId, token, coords, address, userId, onLocationSelected);
                });
            });

            map.events.add('click', (e) => {
                const coords = e.get('coords');
                ymaps.geocode(coords).then((res) => {
                    const firstGeoObject = res.geoObjects.get(0);
                    const address = firstGeoObject.getAddressLine();
                    createPlacemark(coords, address);
                    showLocationConfirmation(noteId, token, coords, address, userId, onLocationSelected);
                });
            });
        });
    };
    document.head.appendChild(script);
}

function createPlacemark(coords, address) {
    if (placemark) {
        map.geoObjects.remove(placemark);
    }
    
    placemark = new ymaps.Placemark(coords, {
        balloonContent: address
    }, {
        preset: 'islands#redDotIcon',
        draggable: true
    });
    
    map.geoObjects.add(placemark);
    map.setCenter(coords);
    
    placemark.events.add('dragend', function() {
        ymaps.geocode(placemark.geometry.getCoordinates()).then((res) => {
            const firstGeoObject = res.geoObjects.get(0);
            const newAddress = firstGeoObject.getAddressLine();
            placemark.properties.set('balloonContent', newAddress);
            document.getElementById('confirm-address').textContent = newAddress;
        });
    });
}

function showLocationConfirmation(noteId, token, coords, address, userId, onLocationSelected) {
    const slider = document.getElementById('location-confirm-slider');
    const addressSpan = document.getElementById('confirm-address');
    
    addressSpan.textContent = `Выбран адрес: ${address}`;
    slider.innerHTML = `
        <p id="confirm-address">Выбран адрес: ${address}</p>
        <p>Подтвердить выбор?</p>
        <div class="confirm-buttons">
            <button class="confirm-btn yes">Да</button>
            <button class="confirm-btn no">Нет</button>
        </div>
    `;
    
    slider.classList.add('show');
    
    slider.querySelector('.confirm-btn.yes').onclick = () => {
        sendLocationToBackend(noteId, token, coords, address, userId, onLocationSelected);
        slider.classList.remove('show');
        closeMapModal();
    };
    
    slider.querySelector('.confirm-btn.no').onclick = () => {
        slider.classList.remove('show');
    };
}

function sendLocationToBackend(noteId, token, coords, address, userId, onLocationSelected) {
    const [latitude, longitude] = coords;
    const locationData = {
        latitude: latitude,
        longitude: longitude,
        locationName: address
    };
    
    console.log('Отправка:', { noteId, userId, locationData });
    
    fetch(`http://92.126.54.217:5000/api/inputs/location/${noteId}?userId=${userId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
    })
    .then(response => {
        if (response.ok) {
            return response.json().then(data => {
                showNotification('Локация сохранена!', true);
                if (onLocationSelected) {
                    onLocationSelected({
                        address: address,
                        taskId: data.Task?.TaskId || noteId
                    });
                }
                let notes = JSON.parse(localStorage.getItem('notes') || '[]');
                notes = notes.map(note => 
                    note.taskId == noteId 
                        ? { ...note, locationName: address, location: `(${latitude}, ${longitude})` }
                        : note
                );
                localStorage.setItem('notes', JSON.stringify(notes));
            });
        } else {
            return response.json().then(err => {
                throw new Error(err.Error || 'Ошибка сохранения локации');
            });
        }
    })
    .catch(error => {
        console.error('Ошибка сохранения локации:', error);
        showNotification('Ошибка: ' + error.message, false);
    });
}

function closeMapModal() {
    const modal = document.getElementById('map-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        if (map) {
            map.destroy();
            map = null;
            placemark = null;
        }
        document.getElementById('map-container').innerHTML = '';
    }, 300);
}

function showNotification(message, isSuccess) {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.style.backgroundColor = isSuccess ? '#4CAF50' : '#f44336';
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}