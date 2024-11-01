const alarmForm = document.getElementById('alarmForm');
const alarmsBody = document.getElementById('alarmsBody');
const timeDisplay = document.getElementById('currentTime');
const currentDateDisplay = document.getElementById('currentDate');
const audioButtons = document.querySelectorAll('.audio-buttons button');
const alarmModal = document.getElementById('alarmModal');
const alarmAudioNameDisplay = document.getElementById('alarmAudioName');
const volumeInput = document.getElementById('volumeInput');
const backupButton = document.getElementById('backupButton');
const restoreButton = document.getElementById('restoreButton');
const restoreInput = document.getElementById('restoreInput');

let selectedAudio = null;
let currentAlarmAudio = null;
let activeAlarmIndex = null; // Índice de la alarma activa
let playedAlarmsToday = new Set(); // Almacena alarmas reproducidas hoy

// Declarar los audios
const audios = {
    'LINEA 1': 'LINEA-1.mp3',
    'LINEA 4A,5A,8': 'LINEA-4A-5A-8.mp3',
    'LINEA 2,5,6,7': 'LINEA-2-5-6-7.mp3',
    'LINEA 2A,3,4,9': 'LINEA-2A-3-4-9.mp3',
};

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    timeDisplay.textContent = timeString;
}
setInterval(updateTime, 1000);
updateTime();

function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateString = now.toLocaleDateString('es-MX', options);
    currentDateDisplay.textContent = dateString.charAt(0).toUpperCase() + dateString.slice(1);
}
updateDate();

function generateAlarmId() {
    return `alarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Basado en timestamp y random para mayor unicidad
}

function validateAlarmForm() {
    const time = document.getElementById('timeInput').value;
    const days = Array.from(document.querySelectorAll('.weekdays input:checked'));
    const audio = document.getElementById('audio').value;

    if (!time || days.length === 0 || !audio) {
        alert('Por favor, completa todos los campos.');
        return false;
    }
    return true;
}

function isDuplicateAlarm(time, days) {
    const alarms = getAlarms();
    return alarms.some(alarm => alarm.time === time && arraysEqual(alarm.days, days));
}

function isTooCloseToOtherAlarms(newTime) {
    const alarms = getAlarms();
    const newAlarmDate = new Date(`1970-01-01T${newTime}:00`);
    
    return alarms.some(alarm => {
        const existingAlarmDate = new Date(`1970-01-01T${alarm.time}:00`);
        const difference = Math.abs(existingAlarmDate - newAlarmDate) / 60000; // Diferencia en minutos
        return difference < 5; // Si hay menos de 5 minutos de diferencia
    });
}

function arraysEqual(a1, a2) {
    if (a1.length !== a2.length) return false;
    const sortedA1 = [...a1].sort();
    const sortedA2 = [...a2].sort();
    for (let i = 0; i < sortedA1.length; i++) {
        if (sortedA1[i] !== sortedA2[i]) return false;
    }
    return true;
}

function getAlarms() {
    try {
        return JSON.parse(localStorage.getItem('alarms')) || [];
    } catch (error) {
        console.error("Error al acceder al localStorage:", error);
        return [];
    }
}

function saveAlarms(alarms) {
    localStorage.setItem('alarms', JSON.stringify(alarms));
}

function loadAlarms() {
    const alarms = getAlarms();
    alarmsBody.innerHTML = '';
    alarms.forEach((alarm, index) => displayAlarm(alarm, index));
}

function displayAlarm(alarm, index) {
    const days = alarm.days.map(day => getDayAbbreviation(day)).join(', ');
    const tr = document.createElement('tr');
    tr.dataset.index = index;

    tr.innerHTML = `
        <td><input type="checkbox" class="toggle-active" ${alarm.active ? 'checked' : ''} onchange="toggleAlarm(${index})"></td>
        <td>${alarm.time}</td>
        <td>${days}</td>
        <td>${alarm.audio}</td>
        <td>${Math.round(alarm.volume * 100)}%</td>
        <td><button class="delete-btn" onclick="deleteAlarm(${index})">Eliminar</button></td>
    `;
    tr.classList.add('fade-in-row');
    alarmsBody.appendChild(tr);
}

function addAlarm(event) {
    event.preventDefault();

    if (!validateAlarmForm()) return;

    const time = document.getElementById('timeInput').value;
    const days = Array.from(document.querySelectorAll('.weekdays input:checked')).map(input => parseInt(input.value));
    const audio = document.getElementById('audio').value;
    const volume = parseFloat(volumeInput.value);

    if (isDuplicateAlarm(time, days)) {
        alert('Ya existe una alarma para esta hora y días seleccionados.');
        return;
    }

    if (isTooCloseToOtherAlarms(time)) {
        alert('No se pueden programar alarmas con menos de 5 minutos de diferencia entre ellas.');
        return;
    }

    const alarm = { id: generateAlarmId(), time, days, audio, volume, active: true };
    const alarms = getAlarms();
    alarms.push(alarm);
    saveAlarms(alarms);

    displayAlarm(alarm, alarms.length - 1);
    alarmForm.reset();
    selectedAudio = null;
    audioButtons.forEach(btn => btn.classList.remove('selected'));
    volumeInput.value = localStorage.getItem('volume') || 1; // Restaurar volumen
}

function deleteAlarm(index) {
    const alarms = getAlarms();
    alarms.splice(index, 1);
    saveAlarms(alarms);
    loadAlarms();
}

function toggleAlarm(index) {
    const alarms = getAlarms();
    alarms[index].active = !alarms[index].active;
    saveAlarms(alarms);
    loadAlarms();
}

function getDayAbbreviation(dayNumber) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[dayNumber];
}

function checkAlarms() {
    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 5);
    const currentDay = now.getDay();
    const alarms = getAlarms();

    alarms.forEach((alarm) => {
        const alarmId = `${alarm.id}-${currentDay}`;

        if (
            alarm.active &&
            alarm.time === currentTime &&
            alarm.days.includes(currentDay) &&
            !playedAlarmsToday.has(alarmId)
        ) {
            playedAlarmsToday.add(alarmId);
            playAlarm(alarm.audio, alarm.volume);
        }
    });
}

function playAlarm(audioName, volume) {
    const audioSrc = audios[audioName];
    if (audioSrc) {
        currentAlarmAudio = new Audio(audioSrc);
        currentAlarmAudio.volume = volume;
        currentAlarmAudio.loop = false; // No repetir el audio
        currentAlarmAudio.play();

        // Agregar clase de parpadeo mientras se reproduce
        alarmModal.classList.add('blink');
        alarmAudioNameDisplay.textContent = audioName;
        alarmModal.style.display = 'block';

        // Cerrar modal y detener parpadeo al finalizar el audio
        currentAlarmAudio.addEventListener('ended', stopAlarm);
    } else {
        alert(`No se encontró el audio para "${audioName}"`);
    }
}

function stopAlarm() {
    if (currentAlarmAudio) {
        currentAlarmAudio.pause();
        currentAlarmAudio.currentTime = 0;
        currentAlarmAudio = null;
    }
    alarmModal.classList.remove('blink'); // Detener parpadeo
    alarmModal.style.display = 'none';
}

function selectAudio(audioName, button) {
    selectedAudio = audioName;
    document.getElementById('audio').value = audioName;
    audioButtons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

function resetPlayedAlarms() {
    playedAlarmsToday.clear();
}
setInterval(resetPlayedAlarms, 86400000); // Cada 24 horas

backupButton.addEventListener('click', () => {
    const alarms = getAlarms();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(alarms, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'alarmas_respaldo.json');
    downloadAnchor.click();
});

restoreButton.addEventListener('click', () => {
    restoreInput.click();
});

restoreInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const alarms = JSON.parse(e.target.result);
            if (Array.isArray(alarms)) {
                saveAlarms(alarms);
                loadAlarms();
                alert('Respaldo restaurado correctamente.');
                playedAlarmsToday.clear(); // Limpiar alarmas reproducidas al restaurar
            } else {
                throw new Error('El archivo no contiene un array válido de alarmas.');
            }
        } catch (error) {
            console.error("Error al restaurar alarmas:", error);
            alert('Hubo un error al restaurar el respaldo. Asegúrate de que el archivo sea válido.');
        }
    };
    reader.readAsText(file);
});

function saveVolume(value) {
    localStorage.setItem('volume', value);
}

function loadVolume() {
    const savedVolume = localStorage.getItem('volume');
    if (savedVolume !== null) {
        volumeInput.value = savedVolume;
    }
}

alarmForm.addEventListener('submit', addAlarm);
volumeInput.addEventListener('input', (e) => {
    saveVolume(e.target.value);
});
window.addEventListener('load', () => {
    loadVolume();
    loadAlarms();
    setInterval(checkAlarms, 2000); // Verificar alarmas cada 2 segundos
    checkAlarms(); // Verificar alarmas inmediatamente al cargar
});
