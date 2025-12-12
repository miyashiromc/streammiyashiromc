import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

// Función para obtener la configuración de Firebase desde el entorno de hosting
async function initializeFirebase() {
    try {
        const response = await fetch('/__/firebase/init.json');
        const config = await response.json();

        const app = initializeApp(config);
        const db = getFirestore(app);

        setupCommentsSystem(db);
    } catch (error) {
        console.error('Error inicializando Firebase. Asegúrate de estar ejecutando esto en Firebase Hosting o configura manualmente las credenciales.', error);
        // Fallback or manual config could go here if needed, but for now we rely on Hosting
    }
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
            // Opcional: limpiar username o dejarlo para el siguiente comentario

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
