// --- 1. Variables Globales ---
const USERS_STORAGE_KEY = "users";
const RECORDS_STORAGE_KEY = "records";
const BAD_PLATES_STORAGE_KEY = "badPlates";
const DARK_MODE_STORAGE_KEY = "darkMode";
const CUSTOM_CARGO_TYPES_KEY = "customCargoTypes";
const ALERT_SETTINGS_KEY = "alertSettings";

let users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY)) || [];


/*const adminExists = users.some(user => user.email === "admin@example.com");
if (!adminExists) {
    users.push({ email: "admin@example.com", password: "admin" });
    saveUsers();
}*/

let currentUser = null;

let records = JSON.parse(localStorage.getItem(RECORDS_STORAGE_KEY) || "[]");
let badPlates = JSON.parse(localStorage.getItem(BAD_PLATES_STORAGE_KEY) || "[]");
let customCargoTypes = JSON.parse(localStorage.getItem(CUSTOM_CARGO_TYPES_KEY) || '["Tarimas", "Corrugado Plástico", "Corrugado Cartón", "Tarimas RAP"]');

let alertSettings = JSON.parse(localStorage.getItem(ALERT_SETTINGS_KEY)) || {
    badPlateThreshold: 3,
    pendingLoadThreshold: 2
};


let filteredRecords = null; // Para búsqueda o filtro por fechas/cargas en la pestaña de registros
let currentCargoFilter = "all";
let currentStartDateFilter = null;
let currentEndDateFilter = null;

let statCargoFilter = "all"; // Para filtro en la pestaña de estadísticas
let statStartDateFilter = null;
let statEndDateFilter = null;


// Gráficas
let unitMovementChart = null;
let chartFilterStartDate = null;
let chartFilterEndDate = null;

// Notificaciones
let notifications = []; // Almacenará las notificaciones activas

// --- 2. Funciones de Utilidad ---

function saveUsers() {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function saveRecords() {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

function saveBadPlates() {
    localStorage.setItem(BAD_PLATES_STORAGE_KEY, JSON.stringify(badPlates));
}

function saveCustomCargoTypes() {
    localStorage.setItem(CUSTOM_CARGO_TYPES_KEY, JSON.stringify(customCargoTypes));
}

function saveAlertSettings() {
    localStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify(alertSettings));
}

function showLoadingAnimation(show, message = "Espere por favor...") {
    const loadingOverlay = document.getElementById("loading-overlay");
    const loadingMessage = loadingOverlay.querySelector(".loading-message");
    const loadingSpinner = loadingOverlay.querySelector(".loading-spinner");
    const loadingBar = loadingOverlay.querySelector(".loading-bar");

    if (loadingOverlay) {
        loadingMessage.innerText = message;
        if (show) {
            loadingSpinner.style.animation = 'none';
            loadingBar.style.animation = 'none';
            void loadingSpinner.offsetWidth;
            void loadingBar.offsetWidth;
            loadingSpinner.style.animation = 'spin 1s linear infinite';
            loadingBar.style.animation = 'progressBar 3s ease-out forwards';

            loadingOverlay.classList.add("visible");
        } else {
            setTimeout(() => {
                loadingOverlay.classList.remove("visible");
            }, 500);
        }
    }
}

function showToast(message, type = "info", duration = 3000) {
    const toastContainer = document.getElementById("toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${
        type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-times-circle' :
        type === 'warning' ? 'fa-exclamation-triangle' :
        'fa-info-circle'
    }"></i> ${message}`;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 10); // Small delay to trigger CSS transition

    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hide");
        toast.addEventListener("transitionend", () => toast.remove());
    }, duration);
}


function isValidEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

function updateLabelPosition(inputElement) {
    const label = inputElement.nextElementSibling;
    if (label && label.tagName === 'LABEL') {
        if (inputElement.value || inputElement.matches(':focus') || inputElement.type === 'date') {
            label.classList.add('active-label');
        } else {
            label.classList.remove('active-label');
        }
    }
}


// --- 3. Funciones de Autenticación y Registro ---

function handleLogin() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const loginErrorP = document.getElementById("login-error");
    const loginLoadingText = document.getElementById("login-loading-text");

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        showToast("Ingresa tu correo electrónico y contraseña", "error");
        return;
    }

    if (!isValidEmail(email)) {
        showToast("El formato del correo electrónico es inválido.", "error");
        return;
    }

    loginErrorP.innerText = "";
    loginLoadingText.classList.add("loading-dots");
    loginLoadingText.innerText = "Accediendo al sistema";

    setTimeout(() => {
        const foundUser = users.find(user => user.email === email && user.password === password);
        if (!foundUser) {
            showToast("Correo electrónico o contraseña incorrectos", "error");
            loginLoadingText.classList.remove("loading-dots");
            loginLoadingText.innerText = "Accede a tu cuenta de Control de Cargas";
        } else {
            currentUser = email;
            document.getElementById("login-container").style.display = "none";

            showLoadingAnimation(true, `¡Bienvenido, ${email}!`);

            setTimeout(() => {
                showLoadingAnimation(false);
                document.getElementById("app-container").style.display = "flex";
                document.getElementById("date").value = new Date().toISOString().split("T")[0];
                renderCargoCheckboxes(); // NEW: Render custom cargo types
                renderCargoFilterOptions(); // NEW: Render custom cargo types in filters
                renderStatCargoFilterOptions(); // NEW: Render custom cargo types in statistics filters
                renderLists();
                renderBadPlatesList();
                renderStatistics();
                populatePlateSuggestions();
                checkAndGenerateAlerts(); // NEW: Generate alerts on login
                updateNotificationCount(); // NEW: Update notification count
                loginLoadingText.classList.remove("loading-dots");
                loginLoadingText.innerText = "Accede a tu cuenta de Control de Cargas";
                toggleAdminFeatures(currentUser === 'admin@example.com'); // NEW: Show/hide admin features
            }, 1500);
        }
    }, 1500);
}

function logout() {
    currentUser = null;
    document.getElementById("app-container").style.display = "none";
    document.getElementById("login-container").style.display = "flex";
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("login-error").innerText = "";
    filteredRecords = null;
    currentCargoFilter = "all";
    currentStartDateFilter = null;
    currentEndDateFilter = null;
    statCargoFilter = "all";
    statStartDateFilter = null;
    statEndDateFilter = null;
    document.getElementById("cargoFilter").value = "all";
    document.getElementById("filterStartDate").value = "";
    document.getElementById("filterEndDate").value = "";
    document.getElementById("statCargoFilter").value = "all";
    document.getElementById("statFilterStartDate").value = "";
    document.getElementById("statFilterEndDate").value = "";

    renderLists();
    renderStatistics();

    const darkModeBtn = document.getElementById("darkModeBtn");
    if (localStorage.getItem(DARK_MODE_STORAGE_KEY) !== "enabled") {
        if (darkModeBtn) darkModeBtn.innerHTML = '<i class="fas fa-sun"></i> ☀️ Modo Oscuro';
    }
    showToast("Sesión cerrada.", "info");
}

function registerUser() {
    const newEmailInput = document.getElementById("new-email");
    const newPasswordInput = document.getElementById("new-password");
    const registerErrorP = document.getElementById("register-error");

    const newEmail = newEmailInput.value.trim();
    const newPassword = newPasswordInput.value.trim();

    if (!newEmail || !newPassword) {
        showToast("Por favor completa todos los campos.", "error");
        return;
    }

    if (!isValidEmail(newEmail)) {
        showToast("El formato del correo electrónico es inválido.", "error");
        return;
    }

    if (users.some(u => u.email === newEmail)) {
        showToast("Este correo electrónico ya está registrado.", "error");
        return;
    }

    users.push({ email: newEmail, password: newPassword });
    saveUsers();
    showToast("Usuario registrado con éxito.", "success", 4000);

    newEmailInput.value = "";
    newPasswordInput.value = "";
    updateLabelPosition(newEmailInput);
    updateLabelPosition(newPasswordInput);

    setTimeout(() => {
        document.getElementById("register-form").style.display = "none";
        document.getElementById("login-form").style.display = "flex";
        document.querySelector("#login-container .login-footer").style.display = "flex";
        const loginLoadingText = document.getElementById("login-loading-text");
        if(loginLoadingText) {
            loginLoadingText.style.display = "block";
            loginLoadingText.classList.remove("loading-dots");
            loginLoadingText.innerText = "Accede a tu cuenta de Control de Cargas";
        }
    }, 4000);
}

function toggleRegisterForm() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const loginFooter = document.querySelector("#login-container .login-footer");
    const loginLoadingText = document.getElementById("login-loading-text");

    if (registerForm.style.display === "none" || registerForm.style.display === "") {
        loginForm.style.display = "none";
        loginFooter.style.display = "none";
        registerForm.style.display = "flex";
        document.getElementById("new-email").value = "";
        document.getElementById("new-password").value = "";
        if(loginLoadingText) {
            loginLoadingText.style.display = "none";
        }
    } else {
        registerForm.style.display = "none";
        loginForm.style.display = "flex";
        loginFooter.style.display = "flex";
        if(loginLoadingText) {
            loginLoadingText.style.display = "block";
            loginLoadingText.classList.remove("loading-dots");
            loginLoadingText.innerText = "Accede a tu cuenta de Control de Cargas";
        }
    }
}

// NEW: Admin user management
function toggleAdminFeatures(isAdmin) {
    const manageUsersHeading = document.getElementById('manageUsersHeading');
    const userManagementSection = document.getElementById('userManagementSection');

    if (isAdmin) {
        if (manageUsersHeading) manageUsersHeading.style.display = 'block';
        if (userManagementSection) {
            userManagementSection.style.display = 'block';
            renderUserList();
        }
    } else {
        if (manageUsersHeading) manageUsersHeading.style.display = 'none';
        if (userManagementSection) userManagementSection.style.display = 'none';
    }
}

function renderUserList() {
    const userListUl = document.getElementById('userList');
    if (!userListUl) return;

    userListUl.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${user.email} ${user.email === 'admin@example.com' ? '(Admin)' : ''}</span>
            ${user.email !== 'admin@example.com' ? `<button class="delete-user-btn" data-email="${user.email}"><i class="fas fa-user-times"></i> Eliminar</button>` : ''}
        `;
        userListUl.appendChild(li);
    });
}

function addUserAdmin() {
    const newEmailInput = document.getElementById("newUserEmailAdmin");
    const newPasswordInput = document.getElementById("newUserPasswordAdmin");

    const newEmail = newEmailInput.value.trim();
    const newPassword = newPasswordInput.value.trim();

    if (!newEmail || !newPassword) {
        showToast("Por favor, introduce correo y contraseña para el nuevo usuario.", "error");
        return;
    }
    if (!isValidEmail(newEmail)) {
        showToast("El formato del correo electrónico es inválido.", "error");
        return;
    }
    if (users.some(u => u.email === newEmail)) {
        showToast("Ya existe un usuario con este correo electrónico.", "error");
        return;
    }

    users.push({ email: newEmail, password: newPassword });
    saveUsers();
    renderUserList();
    showToast("Usuario añadido correctamente.", "success");
    newEmailInput.value = '';
    newPasswordInput.value = '';
    updateLabelPosition(newEmailInput);
    updateLabelPosition(newPasswordInput);
}

function deleteUser(emailToDelete) {
    if (emailToDelete === 'admin@example.com') {
        showToast("No se puede eliminar al usuario administrador.", "error");
        return;
    }
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario ${emailToDelete}? Esto eliminará TODOS sus registros de cargas y placas malas.`)) return;

    users = users.filter(u => u.email !== emailToDelete);
    records = records.filter(r => r.user !== emailToDelete);
    badPlates = badPlates.filter(bp => bp.user !== emailToDelete);

    saveUsers();
    saveRecords();
    saveBadPlates();
    renderUserList();
    showToast(`Usuario ${emailToDelete} y sus datos eliminados.`, "success");
}


// --- 4. Funciones de Registros (CRUD) y Tipos de Carga Personalizables ---

// NEW: Renderiza los checkboxes de carga dinámicamente
function renderCargoCheckboxes(targetElementId = "cargoCheckboxes", record = null) {
    const container = document.getElementById(targetElementId);
    if (!container) return;

    container.innerHTML = "";
    customCargoTypes.forEach(type => {
        // Normalize type name for property access (e.g., "Corrugado Plástico" -> "corrugadoPlastico")
        const normalizedType = type.replace(/\s/g, ''); // Remove spaces
        const checkbox = document.createElement("label");
        checkbox.className = "checkbox-container";
        checkbox.innerHTML = `
            <input type="checkbox" id="${targetElementId === 'cargoCheckboxes' ? '' : 'edit'}${normalizedType}"> ${type}
        `;
        container.appendChild(checkbox);

        // If editing, set the checkbox state based on the record
        if (record) {
            const checkboxInput = checkbox.querySelector('input');
            if (checkboxInput) {
                // Assuming record properties match normalized names and values are 0 or 1
                checkboxInput.checked = record[normalizedType.toLowerCase()] === 1;
            }
        }
    });
}

// NEW: Renderiza las opciones del filtro de carga dinámicamente
function renderCargoFilterOptions() {
    const cargoFilterSelect = document.getElementById("cargoFilter");
    const statCargoFilterSelect = document.getElementById("statCargoFilter");

    if (cargoFilterSelect) {
        cargoFilterSelect.innerHTML = '<option value="all">Todas las Cargas</option>';
        customCargoTypes.forEach(type => {
            const normalizedType = type.replace(/\s/g, ''); // Remove spaces
            const option = document.createElement("option");
            option.value = normalizedType.toLowerCase();
            option.innerText = type;
            cargoFilterSelect.appendChild(option);
        });
        cargoFilterSelect.value = currentCargoFilter; // Restore previous selection
    }
    if (statCargoFilterSelect) {
        statCargoFilterSelect.innerHTML = '<option value="all">Todas las Cargas</option>';
        customCargoTypes.forEach(type => {
            const normalizedType = type.replace(/\s/g, '');
            const option = document.createElement("option");
            option.value = normalizedType.toLowerCase();
            option.innerText = type;
            statCargoFilterSelect.appendChild(option);
        });
        statCargoFilterSelect.value = statCargoFilter; // Restore previous selection
    }
}


function addRecord() {
    const dateInput = document.getElementById("date");
    const plateInput = document.getElementById("plate");

    const date = dateInput.value;
    const plate = plateInput.value.trim();

    const cargoData = {};
    let hasCargo = false;

    customCargoTypes.forEach(type => {
        const normalizedType = type.replace(/\s/g, '');
        const checkbox = document.getElementById(normalizedType);
        if (checkbox) {
            cargoData[normalizedType.toLowerCase()] = checkbox.checked ? 1 : 0;
            if (checkbox.checked) hasCargo = true;
        }
    });

    if (!date || !plate) {
        showToast("Por favor, completa la fecha y la placa.", "error");
        return;
    }

    if (!hasCargo) {
        showToast("Por favor, selecciona al menos un tipo de carga.", "error");
        return;
    }

    const plateExists = records.some(r => r.plate.toLowerCase() === plate.toLowerCase() && r.user === currentUser && !r.sent);
    if (plateExists) {
        showToast("Ya existe una carga activa con esa placa.", "error");
        return;
    }

    const newRecord = {
        id: Date.now(),
        user: currentUser,
        date,
        plate,
        ...cargoData, // Spread the dynamic cargo properties
        sent: false,
        _createdAt: new Date().toISOString(),
        _createdBy: currentUser,
        _lastUpdatedAt: new Date().toISOString(),
        _lastUpdatedBy: currentUser
    };

    records.push(newRecord);
    saveRecords();
    renderLists();
    renderStatistics();
    populatePlateSuggestions();

    showToast("Carga agregada con éxito.", "success");
    plateInput.value = "";
    updateLabelPosition(plateInput);
    customCargoTypes.forEach(type => {
        const normalizedType = type.replace(/\s/g, '');
        const checkbox = document.getElementById(normalizedType);
        if (checkbox) checkbox.checked = false;
    });
}

function openEditRecordModal(id) {
    const record = records.find(r => r.id === id && r.user === currentUser);
    if (!record) {
        showToast("Registro no encontrado para editar.", "error");
        return;
    }

    document.getElementById("editRecordId").value = record.id;
    document.getElementById("editDate").value = record.date;
    document.getElementById("editPlate").value = record.plate;

    // Render edit cargo checkboxes with current record values
    renderCargoCheckboxes("editCargoCheckboxes", record);

    document.querySelectorAll('#editRecordModal .input-field input, #editRecordModal .input-field textarea').forEach(input => {
        updateLabelPosition(input);
    });

    const editModal = document.getElementById("editRecordModal");
    editModal.classList.add("show-modal");
}

function closeEditRecordModal() {
    document.getElementById("editRecordModal").classList.remove("show-modal");
}

function saveEditedRecord(e) {
    e.preventDefault();

    const recordId = parseInt(document.getElementById("editRecordId").value);
    const recordIndex = records.findIndex(r => r.id === recordId && r.user === currentUser);

    if (recordIndex === -1) {
        showToast("Error: Registro no encontrado.", "error");
        return;
    }

    const record = records[recordIndex];

    const newDate = document.getElementById("editDate").value;
    const newPlate = document.getElementById("editPlate").value.trim();

    const newCargoData = {};
    let hasCargo = false;
    customCargoTypes.forEach(type => {
        const normalizedType = type.replace(/\s/g, '');
        const checkbox = document.getElementById(`edit${normalizedType}`);
        if (checkbox) {
            newCargoData[normalizedType.toLowerCase()] = checkbox.checked ? 1 : 0;
            if (checkbox.checked) hasCargo = true;
        }
    });

    if (!newDate || !newPlate) {
        showToast("La fecha y la placa no pueden estar vacías.", "error");
        return;
    }

    if (!hasCargo) {
        showToast("Debe seleccionar al menos un tipo de carga.", "error");
        return;
    }

    const plateExists = records.some(r =>
        r.id !== recordId &&
        r.plate.toLowerCase() === newPlate.toLowerCase() &&
        r.user === currentUser &&
        !r.sent
    );
    if (plateExists) {
        showToast("Ya existe otra carga activa con esa placa.", "error");
        return;
    }

    record.date = newDate;
    record.plate = newPlate;
    // Update existing cargo properties, and add new ones if they exist in newCargoData
    Object.keys(newCargoData).forEach(key => {
        record[key] = newCargoData[key];
    });
    // For old cargo types that might no longer exist in customCargoTypes, remove them or set to 0
    const currentCargoKeys = Object.keys(record).filter(key => customCargoTypes.map(t => t.replace(/\s/g, '').toLowerCase()).includes(key));
    Object.keys(record).forEach(key => {
        if (key in record && !currentCargoKeys.includes(key) && customCargoTypes.map(t => t.replace(/\s/g, '').toLowerCase()).includes(key)) {
             record[key] = 0; // Set to 0 if not selected in new types
        }
    });


    record._lastUpdatedAt = new Date().toISOString();
    record._lastUpdatedBy = currentUser;

    saveRecords();
    renderLists();
    populatePlateSuggestions();
    showToast("Carga actualizada con éxito.", "success");
    closeEditRecordModal();
}


function toggleSent(id) {
    const recordIndex = records.findIndex(r => r.id === id && r.user === currentUser);
    if (recordIndex > -1) {
        const record = records[recordIndex];
        if (record.sent) {
            showToast("La unidad ya ha sido marcada como enviada.", "info");
            return;
        }
        record.sent = true;
        record._lastUpdatedAt = new Date().toISOString();
        record._lastUpdatedBy = currentUser;
        saveRecords();
        renderLists();
        renderStatistics();
        showToast("Carga marcada como enviada.", "success");
    }
}

function revertSent(id) {
    if (!confirm("¿Estás seguro de que quieres revertir esta carga a 'pendiente'?")) return;
    const recordIndex = records.findIndex(r => r.id === id && r.user === currentUser);
    if (recordIndex > -1) {
        const record = records[recordIndex];
        record.sent = false;
        record._lastUpdatedAt = new Date().toISOString();
        record._lastUpdatedBy = currentUser;
        saveRecords();
        renderLists();
        renderStatistics();
        showToast("Carga revertida a pendiente.", "info");
    }
}

function deleteRecord(id) {
    if (!confirm("¿Estás seguro de que quieres eliminar este registro?")) return;
    records = records.filter(r => !(r.id === id && r.user === currentUser));
    saveRecords();
    renderLists();
    renderStatistics();
    populatePlateSuggestions();
    showToast("Registro eliminado.", "success");
}

function renderLists() {
    const pendingList = document.getElementById("pendingList");
    const sentList = document.getElementById("sentList");

    if (!pendingList || !sentList) return;

    pendingList.innerHTML = "";
    sentList.innerHTML = "";

    let dataToRender = (filteredRecords || records).filter(r => r.user === currentUser);

    if (currentCargoFilter !== "all") {
        const propertyToFilter = currentCargoFilter;
        dataToRender = dataToRender.filter(record => record[propertyToFilter] === 1);
    }

    if (currentStartDateFilter && currentEndDateFilter) {
        dataToRender = dataToRender.filter(record => {
            const recordDate = new Date(record.date + 'T00:00:00');
            const startDate = new Date(currentStartDateFilter + 'T00:00:00');
            const endDate = new Date(currentEndDateFilter + 'T23:59:59');
            return recordDate >= startDate && recordDate <= endDate;
        });
    }

    const pendingRecords = dataToRender.filter(record => !record.sent);
    const sentRecords = dataToRender.filter(record => record.sent);

    // Helper to render a single record card
    const createRecordCard = (record, isSent) => {
        const card = document.createElement("div");
        card.className = `card ${isSent ? 'sent' : ''}`;
        card.dataset.id = record.id;

        let cargoDisplay = [];
        customCargoTypes.forEach(type => {
            const normalizedType = type.replace(/\s/g, '').toLowerCase();
            if (record[normalizedType] === 1) {
                cargoDisplay.push(`${type}: ✅`);
            }
        });
        const cargoText = cargoDisplay.join(" ");

        card.innerHTML = `
            <div class="card-details">
                <strong>${record.plate}</strong> - ${record.date}<br>
                <span>${cargoText || 'Sin cargas seleccionadas'}</span>
                <small>Últ. Act: ${new Date(record._lastUpdatedAt || record._createdAt).toLocaleString()}</small>
            </div>
            <div class="card-actions">
                <button class="edit-record-btn" data-id="${record.id}" aria-label="Editar registro">
                    <i class="fas fa-edit"></i>
                </button>
                ${!isSent ? `
                <button class="send-btn" data-id="${record.id}" aria-label="Marcar como enviada">
                    <i class="fas fa-paper-plane"></i>
                </button>` : `
                <button class="revert-sent-btn" data-id="${record.id}" aria-label="Revertir a pendiente">
                    <i class="fas fa-undo"></i>
                </button>`}
                <button class="delete-record-btn" data-id="${record.id}" aria-label="Eliminar registro">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        return card;
    };


    if (pendingRecords.length === 0) {
        pendingList.innerHTML = '<p class="no-records">No hay cargas pendientes que coincidan con los filtros.</p>';
    } else {
        pendingRecords.forEach(record => pendingList.appendChild(createRecordCard(record, false)));
    }

    if (sentRecords.length === 0) {
        sentList.innerHTML = '<p class="no-records">No hay cargas enviadas que coincidan con los filtros.</p>';
    } else {
        sentRecords.forEach(record => sentList.appendChild(createRecordCard(record, true)));
    }
}


function searchRecords() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();
    if (searchTerm) {
        filteredRecords = records.filter(r =>
            r.user === currentUser && r.plate.toLowerCase().includes(searchTerm)
        );
    } else {
        filteredRecords = null;
    }
    renderLists();
}

function populatePlateSuggestions() {
    const plateSuggestionsDatalist = document.getElementById("plateSuggestions");
    if (!plateSuggestionsDatalist) return;

    plateSuggestionsDatalist.innerHTML = '';
    const uniquePlates = new Set();
    records.filter(r => r.user === currentUser).forEach(record => {
        uniquePlates.add(record.plate);
    });
    badPlates.filter(p => p.user === currentUser).forEach(badPlate => {
        uniquePlates.add(badPlate.plate);
    });

    uniquePlates.forEach(plate => {
        const option = document.createElement("option");
        option.value = plate;
        plateSuggestionsDatalist.appendChild(option);
    });
}

// NEW: Open Plate History Modal
function openPlateHistoryModal(plateNumber) {
    const historyModal = document.getElementById("plateHistoryModal");
    const historyPlateNumberSpan = document.getElementById("historyPlateNumber");
    const plateHistoryList = document.getElementById("plateHistoryList");

    if (!historyModal || !historyPlateNumberSpan || !plateHistoryList) return;

    historyPlateNumberSpan.innerText = plateNumber;
    plateHistoryList.innerHTML = ''; // Clear previous history

    const plateRecords = records.filter(r => r.user === currentUser && r.plate.toLowerCase() === plateNumber.toLowerCase())
                                 .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending

    if (plateRecords.length === 0) {
        plateHistoryList.innerHTML = '<p class="no-records">No hay historial para esta placa.</p>';
    } else {
        plateRecords.forEach(record => {
            const card = document.createElement("div");
            card.className = `card ${record.sent ? 'sent' : ''}`;

            let cargoDisplay = [];
            customCargoTypes.forEach(type => {
                const normalizedType = type.replace(/\s/g, '').toLowerCase();
                if (record[normalizedType] === 1) {
                    cargoDisplay.push(`${type}: ✅`);
                }
            });
            const cargoText = cargoDisplay.join(" ");

            card.innerHTML = `
                <div class="card-details">
                    <strong>Fecha: ${record.date}</strong> - ${record.sent ? 'Enviada' : 'Pendiente'}<br>
                    <span>Carga: ${cargoText || 'Ninguna'}</span>
                    <small>Registrado: ${new Date(record._createdAt).toLocaleString()}</small>
                </div>
            `;
            plateHistoryList.appendChild(card);
        });
    }

    historyModal.classList.add("show-modal");
}

function closePlateHistoryModal() {
    document.getElementById("plateHistoryModal").classList.remove("show-modal");
}


// --- Funciones para Placas en Mal Estado ---

function addBadPlate(e) {
    e.preventDefault();

    const plateInput = document.getElementById("badPlateNumber");
    const reasonInput = document.getElementById("badPlateReason");

    const plate = plateInput.value.trim();
    const reason = reasonInput.value.trim();

    if (!plate || !reason) {
        showToast("Por favor, completa la placa y el motivo.", "error");
        return;
    }

    const newBadPlate = {
        id: Date.now(),
        user: currentUser,
        plate: plate,
        reason: reason,
        _createdAt: new Date().toISOString(),
        _createdBy: currentUser,
        _lastUpdatedAt: new Date().toISOString(),
        _lastUpdatedBy: currentUser,
        resolved: false,
        resolvedTimestamp: null,
        resolvedBy: null
    };

    badPlates.push(newBadPlate);
    saveBadPlates();
    renderBadPlatesList();
    renderStatistics();
    populatePlateSuggestions();
    checkAndGenerateAlerts(); // NEW: Check alerts after adding bad plate

    showToast("Placa registrada en mal estado.", "success");
    plateInput.value = "";
    reasonInput.value = "";
    updateLabelPosition(plateInput);
    updateLabelPosition(reasonInput);
}

function resolveBadPlate(id) {
    const badPlateIndex = badPlates.findIndex(p => p.id === id && p.user === currentUser);
    if (badPlateIndex > -1) {
        const badPlate = badPlates[badPlateIndex];
        badPlate.resolved = true;
        badPlate.resolvedTimestamp = new Date().toISOString();
        badPlate.resolvedBy = currentUser;
        badPlate._lastUpdatedAt = new Date().toISOString();
        badPlate._lastUpdatedBy = currentUser;
        saveBadPlates();
        renderBadPlatesList();
        renderStatistics();
        checkAndGenerateAlerts(); // NEW: Re-check alerts after resolving bad plate
        showToast("Reporte de placa resuelto.", "success");
    }
}

function renderBadPlatesList() {
    const badPlatesListDiv = document.getElementById("badPlatesList");
    const resolvedBadPlatesListDiv = document.getElementById("resolvedBadPlatesList");

    if (!badPlatesListDiv || !resolvedBadPlatesListDiv) return;

    badPlatesListDiv.innerHTML = "";
    resolvedBadPlatesListDiv.innerHTML = "";

    const userBadPlates = badPlates.filter(p => p.user === currentUser);

    const pendingBadPlates = userBadPlates.filter(p => !p.resolved);
    const resolvedBadPlates = userBadPlates.filter(p => p.resolved);

    if (pendingBadPlates.length === 0) {
        badPlatesListDiv.innerHTML = '<p class="no-records">No hay placas pendientes de revisión.</p>';
    } else {
        pendingBadPlates.forEach(badPlate => {
            const card = document.createElement("div");
            card.className = "bad-plate-card";
            card.dataset.id = badPlate.id;
            card.innerHTML = `
                <div class="bad-plate-card-details">
                    <strong>${badPlate.plate}</strong> <br>
                    <p>${badPlate.reason}</p>
                    <small>Reportado: ${new Date(badPlate._createdAt).toLocaleString()}</small>
                </div>
                <div class="bad-plate-card-actions">
                    <button class="resolve-bad-plate-btn" data-id="${badPlate.id}" aria-label="Marcar como resuelta">
                        <i class="fas fa-check-circle"></i> Restaurar
                    </button>
                    <button class="delete-bad-plate-btn" data-id="${badPlate.id}" aria-label="Eliminar reporte">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            `;
            badPlatesListDiv.appendChild(card);
        });
    }

    if (resolvedBadPlates.length === 0) {
        resolvedBadPlatesListDiv.innerHTML = '<p class="no-records">No hay placas resueltas.</p>';
    } else {
        resolvedBadPlates.forEach(badPlate => {
            const card = document.createElement("div");
            card.className = "bad-plate-card resolved";
            card.dataset.id = badPlate.id;
            card.innerHTML = `
                <div class="bad-plate-card-details">
                    <strong>${badPlate.plate}</strong> <br>
                    <p>${badPlate.reason}</p>
                    <small>Reportado: ${new Date(badPlate._createdAt).toLocaleString()}<br>Resuelto: ${new Date(badPlate.resolvedTimestamp).toLocaleString()}</small>
                </div>
                <div class="bad-plate-card-actions">
                    <button class="delete-bad-plate-btn" data-id="${badPlate.id}" aria-label="Eliminar reporte">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            `;
            resolvedBadPlatesListDiv.appendChild(card);
        });
    }
}

function deleteBadPlate(id) {
    if (!confirm("¿Estás seguro de que quieres eliminar este reporte de placa? Esto es permanente.")) return;
    badPlates = badPlates.filter(p => !(p.id === id && p.user === currentUser));
    saveBadPlates();
    renderBadPlatesList();
    renderStatistics();
    populatePlateSuggestions();
    checkAndGenerateAlerts(); // NEW: Re-check alerts after deleting bad plate
    showToast("Reporte de placa eliminado.", "success");
}


// --- NUEVA FUNCIÓN: Renderizar Estadísticas ---
function renderStatistics() {
    let userRecords = records.filter(r => r.user === currentUser);
    let userBadPlates = badPlates.filter(p => p.user === currentUser);

    // Apply filters for statistics
    if (statCargoFilter !== "all") {
        userRecords = userRecords.filter(record => record[statCargoFilter] === 1);
    }

    if (statStartDateFilter && statEndDateFilter) {
        userRecords = userRecords.filter(record => {
            const recordDate = new Date(record.date + 'T00:00:00');
            const startDate = new Date(statStartDateFilter + 'T00:00:00');
            const endDate = new Date(statEndDateFilter + 'T23:59:59');
            return recordDate >= startDate && recordDate <= endDate;
        });
    }


    const totalLoads = userRecords.length;
    const pendingLoads = userRecords.filter(r => !r.sent).length;
    const sentLoads = userRecords.filter(r => r.sent).length;

    const pendingBadPlates = userBadPlates.filter(p => !p.resolved).length;
    const resolvedBadPlates = userBadPlates.filter(p => p.resolved).length;

    document.getElementById("totalLoadsStat").innerText = totalLoads;
    document.getElementById("pendingLoadsStat").innerText = pendingLoads;
    document.getElementById("sentLoadsStat").innerText = sentLoads;
    document.getElementById("pendingBadPlatesStat").innerText = pendingBadPlates;
    document.getElementById("resolvedBadPlatesStat").innerText = resolvedBadPlates;

    const cargoCounts = {};
    customCargoTypes.forEach(type => {
        cargoCounts[type.replace(/\s/g, '').toLowerCase()] = 0;
    });

    userRecords.forEach(record => {
        customCargoTypes.forEach(type => {
            const normalizedType = type.replace(/\s/g, '').toLowerCase();
            if (record[normalizedType] === 1) {
                cargoCounts[normalizedType]++;
            }
        });
    });

    const cargoDistributionStatsDiv = document.getElementById("cargoDistributionStats");
    cargoDistributionStatsDiv.innerHTML = '';

    let hasDistributionData = false;
    customCargoTypes.forEach(type => {
        const normalizedType = type.replace(/\s/g, '').toLowerCase();
        const count = cargoCounts[normalizedType];
        if (count > 0) {
            hasDistributionData = true;
            const percentage = totalLoads > 0 ? ((count / totalLoads) * 100).toFixed(1) : 0;

            const item = document.createElement("div");
            item.className = "stat-item";
            item.innerHTML = `
                <span>${type}:</span>
                <span>${count} <small>(${percentage}%)</small></span>
            `;
            cargoDistributionStatsDiv.appendChild(item);
        }
    });

    if (!hasDistributionData) {
        cargoDistributionStatsDiv.innerHTML = '<p class="no-records">No hay datos de cargas para mostrar la distribución.</p>';
    }
}

// NEW: Render Stat Cargo Filter Options (already included in renderCargoFilterOptions but calling separately for clarity)
function renderStatCargoFilterOptions() {
    renderCargoFilterOptions(); // This function already handles both main cargo filter and stat cargo filter
}


// --- 5. Funciones de Exportación ---

function exportToXLSX() {
    let userData = records.filter(r => r.user === currentUser);

    // Apply current filters from records tab
    if (currentCargoFilter !== "all") {
        const propertyToFilter = currentCargoFilter;
        userData = userData.filter(record => record[propertyToFilter] === 1);
    }

    if (currentStartDateFilter && currentEndDateFilter) {
        userData = userData.filter(record => {
            const recordDate = new Date(record.date + 'T00:00:00');
            const startDate = new Date(currentStartDateFilter + 'T00:00:00');
            const endDate = new Date(currentEndDateFilter + 'T23:59:59');
            return recordDate >= startDate && recordDate <= endDate;
        });
    }

    if (userData.length === 0) {
        showToast("No hay registros que coincidan con los filtros para exportar.", "info");
        return;
    }

    const headers = ["Fecha", "Placa"];
    customCargoTypes.forEach(type => headers.push(type)); // Add dynamic cargo type headers
    headers.push("Estado", "Creado Por", "Fecha Creación", "Última Actualización Por", "Fecha Última Actualización");

    const wsData = [headers];

    userData.forEach(r => {
        const row = [
            r.date,
            r.plate
        ];
        customCargoTypes.forEach(type => {
            const normalizedType = type.replace(/\s/g, '').toLowerCase();
            row.push(r[normalizedType] === 1 ? "Sí" : "No");
        });
        row.push(
            r.sent ? "Enviado" : "Pendiente",
            r._createdBy || "N/A",
            new Date(r._createdAt).toLocaleString(),
            r._lastUpdatedBy || "N/A",
            new Date(r._lastUpdatedAt).toLocaleString()
        );
        wsData.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Cargas Filtradas");
    XLSX.writeFile(wb, "registro_cargas_filtrado.xlsx");
    showToast("Datos filtrados exportados a Excel.", "success");
}


// NEW: Export to PDF
function exportToPDF() {
    // Requires jspdf library
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let userData = records.filter(r => r.user === currentUser);

    // Apply current filters from records tab
    if (currentCargoFilter !== "all") {
        const propertyToFilter = currentCargoFilter;
        userData = userData.filter(record => record[propertyToFilter] === 1);
    }

    if (currentStartDateFilter && currentEndDateFilter) {
        userData = userData.filter(record => {
            const recordDate = new Date(record.date + 'T00:00:00');
            const startDate = new Date(currentStartDateFilter + 'T00:00:00');
            const endDate = new Date(currentEndDateFilter + 'T23:59:59');
            return recordDate >= startDate && recordDate <= endDate;
        });
    }

    if (userData.length === 0) {
        showToast("No hay registros que coincidan con los filtros para exportar a PDF.", "info");
        return;
    }

    doc.setFontSize(16);
    doc.text("Reporte de Cargas", 10, 10);
    doc.setFontSize(10);
    doc.text(`Generado por: ${currentUser} el ${new Date().toLocaleDateString()}`, 10, 20);

    const tableColumn = ["Fecha", "Placa", "Carga", "Estado"];
    const tableRows = [];

    userData.forEach(r => {
        let cargoSummary = [];
        customCargoTypes.forEach(type => {
            const normalizedType = type.replace(/\s/g, '').toLowerCase();
            if (r[normalizedType] === 1) {
                cargoSummary.push(type);
            }
        });

        tableRows.push([
            r.date,
            r.plate,
            cargoSummary.join(", ") || "Ninguna",
            r.sent ? "Enviado" : "Pendiente"
        ]);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [0, 123, 255], textColor: 255, fontStyle: 'bold' },
        margin: { top: 10, right: 10, bottom: 10, left: 10 }
    });

    doc.save("reporte_cargas_filtrado.pdf");
    showToast("Reporte PDF generado.", "success");
}

function backupData() {
    const dataToSave = {
        users: users,
        records: records,
        badPlates: badPlates,
        customCargoTypes: customCargoTypes, // NEW: Include custom cargo types
        alertSettings: alertSettings // NEW: Include alert settings
    };
    const jsonString = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_control_cargas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Copia de seguridad creada.", "success");
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) {
        showToast("No se seleccionó ningún archivo.", "info");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const loadedData = JSON.parse(e.target.result);
            if (loadedData.users && loadedData.records && loadedData.badPlates && loadedData.customCargoTypes && loadedData.alertSettings) {
                if (!confirm("¿Estás seguro de que quieres restaurar los datos? Esto sobrescribirá tus datos actuales.")) {
                    return;
                }
                users = loadedData.users;
                records = loadedData.records;
                badPlates = loadedData.badPlates;
                customCargoTypes = loadedData.customCargoTypes; // NEW: Restore custom cargo types
                alertSettings = loadedData.alertSettings; // NEW: Restore alert settings

                saveUsers();
                saveRecords();
                saveBadPlates();
                saveCustomCargoTypes(); // NEW: Save restored custom cargo types
                saveAlertSettings(); // NEW: Save restored alert settings

                showToast("Datos restaurados con éxito. Recargando la aplicación...", "success", 3000);
                setTimeout(() => {
                    if (currentUser && users.some(u => u.email === currentUser)) {
                        renderCargoCheckboxes();
                        renderCargoFilterOptions();
                        renderStatCargoFilterOptions();
                        renderLists();
                        renderBadPlatesList();
                        renderStatistics();
                        populatePlateSuggestions();
                        checkAndGenerateAlerts();
                        updateNotificationCount();
                        toggleAdminFeatures(currentUser === 'admin@example.com');
                        // Update settings modal inputs after restore
                        document.getElementById("badPlateThreshold").value = alertSettings.badPlateThreshold;
                        document.getElementById("pendingLoadThreshold").value = alertSettings.pendingLoadThreshold;
                        renderCustomCargoTypesList(); // Re-render custom cargo type list in settings
                        document.getElementById("login-container").style.display = "none";
                        document.getElementById("app-container").style.display = "flex";
                    } else {
                        logout();
                        showToast("La sesión ha sido cerrada debido a la restauración de datos.", "info");
                    }
                }, 3000);

            } else {
                showToast("El archivo JSON no contiene la estructura de datos esperada (usuarios, records, badPlates, customCargoTypes, alertSettings).", "error");
            }
        } catch (error) {
            console.error("Error al parsear el archivo JSON:", error);
            showToast("Error al leer el archivo. Asegúrate de que sea un JSON válido.", "error");
        }
    };
    reader.onerror = function() {
        showToast("Error al cargar el archivo.", "error");
    };
    reader.readAsText(file);
}


// --- 6. Funciones de Gráficas de Movimientos ---

function generateUnitMovementChart() {
    const userRecords = records.filter(r => r.user === currentUser);

    let filteredRecordsForChart = userRecords;

    if (chartFilterStartDate && chartFilterEndDate) {
        filteredRecordsForChart = userRecords.filter(record => {
            const recordDate = new Date(record.date + 'T00:00:00');
            const startDate = new Date(chartFilterStartDate + 'T00:00:00');
            const endDate = new Date(chartFilterEndDate + 'T23:59:59');
            return recordDate >= startDate && recordDate <= endDate;
        });
    }

    const movementsByDate = {};
    filteredRecordsForChart.forEach(record => {
        const date = record.date;
        if (!movementsByDate[date]) {
            movementsByDate[date] = 0;
        }
        movementsByDate[date]++;
    });

    const dates = Object.keys(movementsByDate).sort();
    const movements = dates.map(date => movementsByDate[date]);

    const ctx = document.getElementById('unitMovementChart').getContext('2d');

    if (unitMovementChart) {
        unitMovementChart.destroy();
    }

    unitMovementChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Unidades Movilizadas',
                data: movements,
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Número de Unidades'
                    },
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}

function openChartsModal() {
    const chartsModal = document.getElementById("chartsModal");
    chartsModal.classList.add("show-modal");
    document.getElementById("chartStartDate").value = chartFilterStartDate || '';
    document.getElementById("chartEndDate").value = chartFilterEndDate || '';

    document.querySelectorAll('#chartsModal .input-field input').forEach(input => {
        updateLabelPosition(input);
    });

    generateUnitMovementChart();
}

function closeChartsModal() {
    document.getElementById("chartsModal").classList.remove("show-modal");
}

function applyChartDateFilter() {
    const startDateInput = document.getElementById("chartStartDate");
    const endDateInput = document.getElementById("chartEndDate");

    chartFilterStartDate = startDateInput.value;
    chartFilterEndDate = endDateInput.value;

    if (!chartFilterStartDate || !chartFilterEndDate) {
        showToast("Por favor, selecciona ambas fechas para filtrar la gráfica.", "error");
        return;
    }

    if (new Date(chartFilterStartDate) > new Date(chartFilterEndDate)) {
        showToast("La fecha de inicio no puede ser posterior a la fecha de fin.", "error");
        return;
    }

    generateUnitMovementChart();
    showToast("Filtro de gráfica aplicado.", "info");
}

function resetChartDateFilter() {
    chartFilterStartDate = null;
    chartFilterEndDate = null;
    document.getElementById("chartStartDate").value = '';
    document.getElementById("chartEndDate").value = '';
    updateLabelPosition(document.getElementById("chartStartDate"));
    updateLabelPosition(document.getElementById("chartEndDate"));

    generateUnitMovementChart();
    showToast("Filtro de gráfica reseteado.", "info");
}

// --- NUEVA FUNCIÓN: Gestión de Tipos de Carga Personalizados ---

function renderCustomCargoTypesList() {
    const container = document.getElementById("customCargoTypesContainer");
    if (!container) return;

    container.innerHTML = '';
    if (customCargoTypes.length === 0) {
        container.innerHTML = '<p class="no-records">No hay tipos de carga personalizados.</p>';
        return;
    }

    customCargoTypes.forEach(type => {
        const item = document.createElement("div");
        item.className = "cargo-item";
        item.innerHTML = `
            <span>${type}</span>
            <button class="delete-cargo-type-btn" data-type="${type}"><i class="fas fa-trash-alt"></i></button>
        `;
        container.appendChild(item);
    });
}

function addCustomCargoType() {
    const newTypeNameInput = document.getElementById("newCargoTypeName");
    const newTypeName = newTypeNameInput.value.trim();

    if (!newTypeName) {
        showToast("Por favor, introduce un nombre para el nuevo tipo de carga.", "error");
        return;
    }
    if (customCargoTypes.includes(newTypeName)) {
        showToast("Este tipo de carga ya existe.", "warning");
        return;
    }

    customCargoTypes.push(newTypeName);
    saveCustomCargoTypes();
    renderCustomCargoTypesList();
    renderCargoCheckboxes(); // Update checkboxes in main form
    renderCargoFilterOptions(); // Update filter dropdowns
    showToast(`Tipo de carga '${newTypeName}' añadido.`, "success");
    newTypeNameInput.value = '';
    updateLabelPosition(newTypeNameInput);
}

function deleteCustomCargoType(typeToDelete) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el tipo de carga '${typeToDelete}'? Esto no afectará los registros existentes, pero no aparecerá en nuevas entradas o ediciones.`)) return;

    customCargoTypes = customCargoTypes.filter(type => type !== typeToDelete);
    saveCustomCargoTypes();
    renderCustomCargoTypesList();
    renderCargoCheckboxes(); // Update checkboxes in main form
    renderCargoFilterOptions(); // Update filter dropdowns
    showToast(`Tipo de carga '${typeToDelete}' eliminado.`, "success");
}

// --- NUEVA FUNCIÓN: Alertas y Notificaciones ---

function checkAndGenerateAlerts() {
    notifications = []; // Clear current notifications

    // 1. Check for bad plates recurring
    const badPlateCounts = {};
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    badPlates.filter(p => p.user === currentUser && !p.resolved && new Date(p._createdAt) >= oneMonthAgo)
             .forEach(bp => {
        badPlateCounts[bp.plate] = (badPlateCounts[bp.plate] || 0) + 1;
    });

    for (const plate in badPlateCounts) {
        if (badPlateCounts[plate] >= alertSettings.badPlateThreshold) {
            notifications.push({
                id: `badPlate-${plate}`,
                type: "alert-bad-plate",
                message: `La placa ${plate} ha sido reportada ${badPlateCounts[plate]} veces en el último mes y aún está pendiente.`,
                timestamp: new Date().toISOString()
            });
        }
    }

    // 2. Check for pending loads for too long
    const today = new Date();
    records.filter(r => r.user === currentUser && !r.sent).forEach(record => {
        const recordDate = new Date(record.date);
        const diffTime = Math.abs(today.getTime() - recordDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= alertSettings.pendingLoadThreshold) {
            notifications.push({
                id: `pendingLoad-${record.id}`,
                type: "alert-pending-load",
                message: `La carga de la placa ${record.plate} (${record.date}) lleva ${diffDays} días pendiente.`,
                timestamp: new Date().toISOString()
            });
        }
    });
    updateNotificationCount();
    renderNotificationsList();
}

function updateNotificationCount() {
    const notificationCountSpan = document.getElementById("notificationCount");
    if (notificationCountSpan) {
        if (notifications.length > 0) {
            notificationCountSpan.innerText = notifications.length;
            notificationCountSpan.style.display = "block";
        } else {
            notificationCountSpan.innerText = "0";
            notificationCountSpan.style.display = "none";
        }
    }
}

function openNotificationsModal() {
    const notificationsModal = document.getElementById("notificationsModal");
    if (notificationsModal) {
        notificationsModal.classList.add("show-modal");
        renderNotificationsList(); // Ensure the list is updated when opening
    }
}

function closeNotificationsModal() {
    document.getElementById("notificationsModal").classList.remove("show-modal");
}

function renderNotificationsList() {
    const notificationsListDiv = document.getElementById("notificationsList");
    if (!notificationsListDiv) return;

    notificationsListDiv.innerHTML = ''; // Clear previous notifications

    if (notifications.length === 0) {
        notificationsListDiv.innerHTML = '<p class="no-records">No hay notificaciones.</p>';
        return;
    }

    notifications.forEach(notification => {
        const item = document.createElement("div");
        item.className = `notification-item ${notification.type}`;
        item.innerHTML = `
            <i class="fas ${
                notification.type.includes('bad-plate') ? 'fa-exclamation-triangle' : 'fa-hourglass-half'
            }"></i>
            <span>${notification.message} <small>(${new Date(notification.timestamp).toLocaleString()})</small></span>
        `;
        notificationsListDiv.appendChild(item);
    });
}

function saveAlertSettings() {
    const badPlateThresholdInput = document.getElementById("badPlateThreshold");
    const pendingLoadThresholdInput = document.getElementById("pendingLoadThreshold");

    const newBadPlateThreshold = parseInt(badPlateThresholdInput.value);
    const newPendingLoadThreshold = parseInt(pendingLoadThresholdInput.value);

    if (isNaN(newBadPlateThreshold) || newBadPlateThreshold < 1) {
        showToast("El umbral de placas en mal estado debe ser un número mayor o igual a 1.", "error");
        return;
    }
    if (isNaN(newPendingLoadThreshold) || newPendingLoadThreshold < 1) {
        showToast("El umbral de cargas pendientes debe ser un número mayor o igual a 1.", "error");
        return;
    }

    alertSettings.badPlateThreshold = newBadPlateThreshold;
    alertSettings.pendingLoadThreshold = newPendingLoadThreshold;
    localStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify(alertSettings));
    showToast("Ajustes de alertas guardados.", "success");
    checkAndGenerateAlerts(); // Re-evaluate alerts with new settings
}


// --- 7. Inicialización de Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
    // Autenticación
    document.getElementById("loginBtn").addEventListener("click", handleLogin);
    document.getElementById("logoutBtn").addEventListener("click", logout);
    document.getElementById("registerUserBtn").addEventListener("click", registerUser);
    document.getElementById("showRegisterFormBtn").addEventListener("click", toggleRegisterForm);
    document.getElementById("showLoginFormBtn").addEventListener("click", toggleRegisterForm);

    // Registros
    document.getElementById("addRecordBtn").addEventListener("click", addRecord);
    document.getElementById("saveEditedRecordBtn").addEventListener("click", saveEditedRecord);
    document.getElementById("closeEditRecordModalBtn").addEventListener("click", closeEditRecordModal);

    // NEW: View Plate History Button
    document.getElementById("viewPlateHistoryBtn").addEventListener("click", () => {
        const plate = document.getElementById("plate").value.trim();
        if (plate) {
            openPlateHistoryModal(plate);
        } else {
            showToast("Por favor, introduce una placa para ver su historial.", "info");
        }
    });
    document.getElementById("closePlateHistoryModalBtn").addEventListener("click", closePlateHistoryModal);


    // Event delegation for dynamically created record cards (pending list)
    document.getElementById("pendingList").addEventListener("click", (e) => {
        const targetBtn = e.target.closest("button");
        if (!targetBtn) return;
        const id = parseInt(targetBtn.dataset.id);
        if (targetBtn.classList.contains("edit-record-btn")) {
            openEditRecordModal(id);
        } else if (targetBtn.classList.contains("send-btn")) {
            toggleSent(id);
        } else if (targetBtn.classList.contains("delete-record-btn")) {
            deleteRecord(id);
        }
    });

    // Event delegation for dynamically created record cards (sent list)
    document.getElementById("sentList").addEventListener("click", (e) => {
        const targetBtn = e.target.closest("button");
        if (!targetBtn) return;
        const id = parseInt(targetBtn.dataset.id);
        if (targetBtn.classList.contains("edit-record-btn")) {
            openEditRecordModal(id);
        } else if (targetBtn.classList.contains("revert-sent-btn")) {
            revertSent(id);
        } else if (targetBtn.classList.contains("delete-record-btn")) {
            deleteRecord(id);
        }
    });

    // Placas en mal estado
    document.getElementById("addBadPlateBtn").addEventListener("click", addBadPlate);
    // Event delegation for bad plates (pending list)
    document.getElementById("badPlatesList").addEventListener("click", (e) => {
        const targetBtn = e.target.closest("button");
        if (!targetBtn) return;
        const id = parseInt(targetBtn.dataset.id);
        if (targetBtn.classList.contains("resolve-bad-plate-btn")) {
            resolveBadPlate(id);
        } else if (targetBtn.classList.contains("delete-bad-plate-btn")) {
            deleteBadPlate(id);
        }
    });
    // Event delegation for bad plates (resolved list)
    document.getElementById("resolvedBadPlatesList").addEventListener("click", (e) => {
        const targetBtn = e.target.closest("button");
        if (!targetBtn) return;
        const id = parseInt(targetBtn.dataset.id);
        if (targetBtn.classList.contains("delete-bad-plate-btn")) {
            deleteBadPlate(id);
        }
    });


    // Búsqueda y Filtros de Cargas
    document.getElementById("searchInput").addEventListener("input", searchRecords);
    document.getElementById("searchButton").addEventListener("click", searchRecords);
    document.getElementById("cargoFilter").addEventListener("change", (e) => {
        currentCargoFilter = e.target.value;
        renderLists();
    });
    document.getElementById("applyDateFilterBtn").addEventListener("click", () => {
        const startDateInput = document.getElementById("filterStartDate");
        const endDateInput = document.getElementById("filterEndDate");
        currentStartDateFilter = startDateInput.value;
        currentEndDateFilter = endDateInput.value;
        if (!currentStartDateFilter || !currentEndDateFilter) {
            showToast("Por favor, selecciona ambas fechas para filtrar.", "error");
            return;
        }
        if (new Date(currentStartDateFilter) > new Date(currentEndDateFilter)) {
            showToast("La fecha de inicio no puede ser posterior a la fecha de fin.", "error");
            return;
        }
        renderLists();
        showToast("Filtro por fechas aplicado.", "info");
    });
    document.getElementById("resetDateFilterBtn").addEventListener("click", () => {
        currentStartDateFilter = null;
        currentEndDateFilter = null;
        document.getElementById("filterStartDate").value = "";
        document.getElementById("filterEndDate").value = "";
        updateLabelPosition(document.getElementById("filterStartDate"));
        updateLabelPosition(document.getElementById("filterEndDate"));

        renderLists();
        showToast("Filtro por fechas reseteado.", "info");
    });

    // Filtros de Estadísticas
    document.getElementById("statCargoFilter").addEventListener("change", (e) => {
        statCargoFilter = e.target.value;
        renderStatistics();
    });
    document.getElementById("applyStatFilterBtn").addEventListener("click", () => {
        const startDateInput = document.getElementById("statFilterStartDate");
        const endDateInput = document.getElementById("statFilterEndDate");
        statStartDateFilter = startDateInput.value;
        statEndDateFilter = endDateInput.value;
        if (!statStartDateFilter || !statEndDateFilter) {
            showToast("Por favor, selecciona ambas fechas para filtrar las estadísticas.", "error");
            return;
        }
        if (new Date(statStartDateFilter) > new Date(statEndDateFilter)) {
            showToast("La fecha de inicio no puede ser posterior a la fecha de fin.", "error");
            return;
        }
        renderStatistics();
        showToast("Filtro de estadísticas aplicado.", "info");
    });
    document.getElementById("resetStatFilterBtn").addEventListener("click", () => {
        statStartDateFilter = null;
        statEndDateFilter = null;
        document.getElementById("statFilterStartDate").value = "";
        document.getElementById("statFilterEndDate").value = "";
        updateLabelPosition(document.getElementById("statFilterStartDate"));
        updateLabelPosition(document.getElementById("statFilterEndDate"));

        renderStatistics();
        showToast("Filtro de estadísticas reseteado.", "info");
    });

    // Pestañas de Navegación (Tabs)
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const targetTabId = this.dataset.tab;

            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(targetTabId).classList.add('active');

            if (targetTabId === 'recordsTab') {
                renderLists();
            } else if (targetTabId === 'badPlatesTab') {
                renderBadPlatesList();
            } else if (targetTabId === 'statisticsTab') {
                renderStatistics();
            }
        });
    });

    const firstTabButton = document.querySelector('.tab-button');
    if (firstTabButton) {
        firstTabButton.click();
    }


    // Ajustes
    document.getElementById("settingsBtn").addEventListener("click", () => {
        document.getElementById("settingsModal").classList.add("show-modal");
        // Populate inputs in settings modal
        document.getElementById("badPlateThreshold").value = alertSettings.badPlateThreshold;
        document.getElementById("pendingLoadThreshold").value = alertSettings.pendingLoadThreshold;
        // Update label positions for settings modal inputs
        document.querySelectorAll('#settingsModal .input-field input').forEach(input => {
            updateLabelPosition(input);
        });
        renderCustomCargoTypesList(); // Render custom cargo types list
        toggleAdminFeatures(currentUser === 'admin@example.com'); // Check admin status again when opening settings
    });
    document.getElementById("closeSettingsModalBtn").addEventListener("click", () => {
        document.getElementById("settingsModal").classList.remove("show-modal");
    });

    // Data Management
    document.getElementById("backupDataBtn").addEventListener("click", backupData);
    document.getElementById("restoreFileInput").addEventListener("change", restoreData);
    document.getElementById("triggerRestoreBtn").addEventListener("click", () => {
        document.getElementById("restoreFileInput").click();
    });

    // Custom Cargo Types
    document.getElementById("addCustomCargoTypeBtn").addEventListener("click", addCustomCargoType);
    document.getElementById("customCargoTypesContainer").addEventListener("click", (e) => {
        const targetBtn = e.target.closest(".delete-cargo-type-btn");
        if (targetBtn) {
            deleteCustomCargoType(targetBtn.dataset.type);
        }
    });

    // Alert Settings
    document.getElementById("saveAlertSettingsBtn").addEventListener("click", saveAlertSettings);


    // User Management (Admin only)
    const userListUl = document.getElementById('userList');
    if (userListUl) {
        userListUl.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-user-btn');
            if (deleteBtn) {
                deleteUser(deleteBtn.dataset.email);
            }
        });
    }
    const addUserAdminBtn = document.getElementById('addUserAdminBtn');
    if (addUserAdminBtn) {
        addUserAdminBtn.addEventListener('click', addUserAdmin);
    }


    // Dark Mode Toggle
    const darkModeBtn = document.getElementById("darkModeBtn");
    const isDarkModeEnabled = localStorage.getItem(DARK_MODE_STORAGE_KEY) === "enabled";
    if (isDarkModeEnabled) {
        document.body.classList.add("dark");
        if (darkModeBtn) darkModeBtn.innerHTML = '<i class="fas fa-moon"></i> 🌙 Modo Claro';
    } else {
        if (darkModeBtn) darkModeBtn.innerHTML = '<i class="fas fa-sun"></i> ☀️ Modo Oscuro';
    }

    darkModeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        if (document.body.classList.contains("dark")) {
            localStorage.setItem(DARK_MODE_STORAGE_KEY, "enabled");
            darkModeBtn.innerHTML = '<i class="fas fa-moon"></i> 🌙 Modo Claro';
        } else {
            localStorage.setItem(DARK_MODE_STORAGE_KEY, "disabled");
            darkModeBtn.innerHTML = '<i class="fas fa-sun"></i> ☀️ Modo Oscuro';
        }
    });

    // Charting
    document.getElementById("chartsBtn").addEventListener("click", openChartsModal);
    document.getElementById("closeChartsModalBtn").addEventListener("click", closeChartsModal);
    document.getElementById("applyChartFilterBtn").addEventListener("click", applyChartDateFilter);
    document.getElementById("resetChartFilterBtn").addEventListener("click", resetChartDateFilter);

    // PDF Export
    document.getElementById("exportPDFBtn").addEventListener("click", exportToPDF);
    document.getElementById("exportXLSXBtn").addEventListener("click", exportToXLSX);


    // Notifications
    document.getElementById("notificationsBtn").addEventListener("click", openNotificationsModal);
    document.getElementById("closeNotificationsModalBtn").addEventListener("click", closeNotificationsModal);


    // Manejo inicial de la visibilidad de la aplicación
    if (currentUser) {
        document.getElementById("login-container").style.display = "none";
        document.getElementById("app-container").style.display = "flex";
        renderCargoCheckboxes();
        renderCargoFilterOptions();
        renderStatCargoFilterOptions();
        renderLists();
        renderBadPlatesList();
        renderStatistics();
        populatePlateSuggestions();
        checkAndGenerateAlerts(); // Generate alerts on app load
        updateNotificationCount(); // Update count on app load
        toggleAdminFeatures(currentUser === 'admin@example.com');
    } else {
        document.getElementById("login-container").style.display = "flex";
        document.getElementById("app-container").style.display = "none";
    }

    // Initialize floating labels for all inputs
    document.querySelectorAll('.input-field input, .input-field textarea, .input-field select').forEach(input => {
        updateLabelPosition(input);
        input.addEventListener('focus', () => updateLabelPosition(input));
        input.addEventListener('blur', () => updateLabelPosition(input));
        input.addEventListener('input', () => updateLabelPosition(input));
    });

    // Ensure the date input initializes and its label adjusts
    const dateInput = document.getElementById("date");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split("T")[0];
        updateLabelPosition(dateInput);
    }
});
