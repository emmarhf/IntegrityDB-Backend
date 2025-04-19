// ╭──────────────────────────────────────────────╮
// │ index.js – Lógica para la página principal   │
// ╰──────────────────────────────────────────────╯

// 🔑 Configurar Supabase
const SUPABASE_URL = "https://mtjcxaoomoymuttvtrzp.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10amN4YW9vbW95bXV0dHZ0cnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjYyNDMsImV4cCI6MjA1ODkwMjI0M30.P11fBpCkrAzGOmL8PdcuKN_iXZSsH6qXEwdDAP2k4GM";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ╭────────────────────────────────────────────╮
// │ Variables globales                         │
// ╰────────────────────────────────────────────╯
let usuarioActual = null;
let ultimoConteo = 0;
let destinatarioActual = null;
let chatModal = null;
let btnChat = null;

// ╭────────────────────────────────────────────╮
// │ Validar sesión y preparar eventos          │
// ╰────────────────────────────────────────────╯
window.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    window.location.href = "login.html";
    return;
  }

  usuarioActual = data.user;

  // Cerrar sesión
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) {
        console.error("❌ Error al cerrar sesión:", logoutError.message);
        alert("Hubo un problema al cerrar sesión. Intenta de nuevo.");
      } else {
        window.location.href = "login.html";
      }
    });
  }

  // Cargar destinatarios y chat
  cargarUsuariosParaChat();
  inicializarChat();

  // Polling cada 2 segundos
  setInterval(() => {
    if (usuarioActual && destinatarioActual) {
      cargarMensajesEntreUsuarios(usuarioActual.id, destinatarioActual);
    }
  }, 2000);

  document.getElementById("abrir-chat").addEventListener("click", () => {
    chatModal.style.display = "flex";
    btnChat.classList.remove("nuevo");
    document.getElementById("noti-box").style.display = "none";
  });
  
  document.getElementById("cerrar-noti").addEventListener("click", () => {
    document.getElementById("noti-box").style.display = "none";
  });
});

// ╭────────────────────────────╮
// │ Cargar lista de usuarios   │
// ╰────────────────────────────╯
async function cargarUsuariosParaChat() {
  const { data: usuarios, error } = await supabase.from("perfiles").select("id, nombre");

  if (error) {
    console.error("❌ Error al cargar perfiles:", error.message);
    return;
  }

  const select = document.getElementById("destinatario");
  usuarios.forEach(usuario => {
    if (usuario.id === usuarioActual.id) return;
    const option = document.createElement("option");
    option.value = usuario.id;
    option.textContent = usuario.nombre;
    select.appendChild(option);
  });
}

// ╭────────────────────────────╮
// │ Inicializar Chat UI        │
// ╰────────────────────────────╯
function inicializarChat() {
  btnChat = document.getElementById("btn-chat");
  chatModal = document.getElementById("chat-modal");
  const formChat = document.getElementById("form-chat");
  const inputMensaje = document.getElementById("mensaje-input");
  const contenedorMensajes = document.getElementById("chat-mensajes");
  const destinatarioSelect = document.getElementById("destinatario");

  btnChat.addEventListener("click", () => {
    const visible = chatModal.style.display === "flex";
    chatModal.style.display = visible ? "none" : "flex";

    if (!visible) {
      btnChat.classList.remove("nuevo"); // 🔴 Limpiar badge
    }
  });

  formChat.addEventListener("submit", async (e) => {
    e.preventDefault();

    const mensaje = inputMensaje.value.trim();
    const destinatarioId = destinatarioSelect.value;

    if (!mensaje || !destinatarioId) return;

    const { error } = await supabase.from("mensajes").insert({
      remitente_id: usuarioActual.id,
      destinatario_id: destinatarioId,
      mensaje: mensaje
    });

    if (error) {
      alert("❌ Error al enviar mensaje");
      console.error(error);
      return;
    }

    // Mostrar mensaje local
    const nuevo = document.createElement("div");
    nuevo.style.margin = "0.5rem 0";
    nuevo.style.background = "#e0f2fe";
    nuevo.style.padding = "0.6rem 0.8rem";
    nuevo.style.borderRadius = "10px";
    nuevo.style.fontSize = "0.9rem";
    nuevo.textContent = "🧑‍💻 Tú: " + mensaje;
    contenedorMensajes.appendChild(nuevo);

    inputMensaje.value = "";
    contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
  });

  destinatarioSelect.addEventListener("change", async (e) => {
    const destinatarioId = e.target.value;
    if (!destinatarioId) return;
    destinatarioActual = destinatarioId;
    await cargarMensajesEntreUsuarios(usuarioActual.id, destinatarioActual);
  });
}

// ╭────────────────────────────────────────────╮
// │ Cargar mensajes entre 2 usuarios           │
// ╰────────────────────────────────────────────╯
async function cargarMensajesEntreUsuarios(remitenteId, destinatarioId) {
  const { data: mensajes, error } = await supabase
    .from("mensajes")
    .select("*")
    .or(`and(remitente_id.eq.${remitenteId},destinatario_id.eq.${destinatarioId}),and(remitente_id.eq.${destinatarioId},destinatario_id.eq.${remitenteId})`)
    .order("timestamp", { ascending: true });

  const contenedor = document.getElementById("chat-mensajes");
  contenedor.innerHTML = "";

  if (error) {
    contenedor.innerHTML = "<div style='color:red;'>Error al cargar mensajes</div>";
    console.error(error);
    return;
  }

  mensajes.forEach(m => {
    const msg = document.createElement("div");
    msg.textContent = (m.remitente_id === remitenteId ? "🧑‍💻 Tú: " : "👤 Otro: ") + m.mensaje;
    msg.style.margin = "0.5rem 0";
    msg.style.background = m.remitente_id === remitenteId ? "#e0f2fe" : "#fef3c7";
    msg.style.padding = "0.6rem 0.8rem";
    msg.style.borderRadius = "10px";
    msg.style.fontSize = "0.9rem";
    contenedor.appendChild(msg);
  });

  contenedor.scrollTop = contenedor.scrollHeight;

  if (mensajes.length > ultimoConteo && mensajes[mensajes.length - 1].remitente_id !== usuarioActual.id) {
    btnChat.classList.add("nuevo");
  
    const notiBox = document.getElementById("noti-box");
    const notiText = document.getElementById("noti-text");
  
    notiText.textContent = `Nuevo mensaje recibido`;
    notiBox.style.display = "block";
  }

  ultimoConteo = mensajes.length;
}