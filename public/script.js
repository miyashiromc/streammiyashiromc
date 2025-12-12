import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { getDatabase, ref, onValue, push, onDisconnect, set, serverTimestamp as rtdbTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js';

// Función para obtener la configuración de Firebase desde el entorno de hosting
async function initializeFirebase() {
    try {
        const response = await fetch('/__/firebase/init.json');
        const config = await response.json();

        // Configuración explícita de la URL de Realtime Database para asegurar la conexión
        config.databaseURL = "https://kushiro-531d6-default-rtdb.firebaseio.com/";

        const app = initializeApp(config);
        const db = getFirestore(app);

        // Inicializar Realtime Database para el contador
        // Nota: Si databaseURL no viene en el init.json automático, podría fallar si no se ha creado la DB.
        const dbRT = getDatabase(app);

        setupCommentsSystem(db);
        setupViewerCounter(dbRT);

    } catch (error) {
        console.error('Error inicializando Firebase:', error);
    }
}

// Sistema de Contadores de Visitas (Presencia)
function setupViewerCounter(dbRT) {
    const countElement = document.getElementById('count-number');
    const connectionsRef = ref(dbRT, 'connections');
    const connectedRef = ref(dbRT, '.info/connected');

    // Manejar conexión local
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            // Estamos conectados
            const con = push(connectionsRef);

            // Cuando me desconecte, elimina mi referencia
            onDisconnect(con).remove();

            // Guarda mi presencia
            set(con, {
                timestamp: rtdbTimestamp(),
                device: navigator.userAgent
            });
        }
    });

    // Escuchar el total de conexiones
    onValue(connectionsRef, (snap) => {
        const count = snap.size;
        countElement.innerText = count;
    });
}

function setupCommentsSystem(db) {
    const commentsList = document.getElementById('comments-list');
    const commentForm = document.getElementById('comment-form');

    // Referencia a la colección 'comments'
    const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));

    // Escuchar cambios en tiempo real
    onSnapshot(q, (snapshot) => {
        commentsList.innerHTML = ''; // Limpiar lista actual
        snapshot.forEach((doc) => {
            const data = doc.data();
            const commentElement = createCommentElement(data);
            commentsList.appendChild(commentElement);
        });
    });

    // Manejar envío del formulario
    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const message = document.getElementById('message').value;
        const submitBtn = commentForm.querySelector('button');

        if (!username || !message) return;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            await addDoc(collection(db, "comments"), {
                username: username,
                message: message,
                timestamp: serverTimestamp()
            });

            // Limpiar formulario
            document.getElementById('message').value = '';

        } catch (error) {
            console.error("Error al agregar comentario: ", error);
            alert("No se pudo enviar el comentario. Inténtalo de nuevo.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Comentar';
        }
    });
}

function createCommentElement(data) {
    const div = document.createElement('div');
    div.className = 'comment-item';

    // Formatear fecha si existe
    let timeString = '';
    if (data.timestamp) {
        const date = data.timestamp.toDate();
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-user">${escapeHtml(data.username)}</span>
            <span class="comment-time">${timeString}</span>
        </div>
        <div class="comment-body">
            ${escapeHtml(data.message)}
        </div>
    `;
    return div;
}

// Prevenir XSS simple
function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Iniciar aplicación
initializeFirebase();
