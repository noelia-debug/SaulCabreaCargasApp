// main.js - Modificación para CRUD de registros

const database = firebase.database();
const recordsRef = database.ref('records');

// Esta función se ejecuta CADA VEZ que hay un cambio en la base de datos
function listenForRecords() {
    recordsRef.on('value', (snapshot) => {
        const recordsData = snapshot.val() || {};
        const recordsListDiv = document.getElementById("recordsList");
        recordsListDiv.innerHTML = "";

        // Transforma los datos de objeto a array
        const userRecords = Object.values(recordsData).filter(record => record.user === currentUser);

        if (userRecords.length === 0) {
            recordsListDiv.innerHTML = '<p class="no-records">No hay registros de cargas.</p>';
            return;
        }

        userRecords.forEach(record => {
            // ... Lógica para crear el HTML del registro como antes
        });
    });
}

function addRecord(e) {
    e.preventDefault();
    // ... (obtener datos del formulario)

    const newRecord = {
        user: currentUser,
        date: date,
        plate: plate,
        loadType: loadType
    };

    // Envía el nuevo registro a la base de datos de Firebase
    recordsRef.push(newRecord);

    showToast("Carga agregada con éxito.", "success");
    // ... (limpiar campos)
}

function deleteRecord(id) {
    if (!confirm("...")) return;
    // Elimina el registro por su ID único en Firebase
    recordsRef.child(id).remove();
    showToast("Registro eliminado.", "info");
}

// Modifica el event listener de borrado para que use el ID de Firebase
document.getElementById("recordsList").addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-record-btn");
    if (btn) {
        // Aquí el ID ya no es de un timestamp, es el ID único de Firebase
        deleteRecord(btn.dataset.id);
    }
});
