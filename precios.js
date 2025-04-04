// ╭─────────────────────────────╮
// │ Validación y Cierre de Sesión │
// ╰─────────────────────────────╯

// ✅ Inicializar Supabase
const SUPABASE_URL = "https://mtjcxaoomoymuttvtrzp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10amN4YW9vbW95bXV0dHZ0cnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjYyNDMsImV4cCI6MjA1ODkwMjI0M30.P11fBpCkrAzGOmL8PdcuKN_iXZSsH6qXEwdDAP2k4GM";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🚪 Validar sesión activa
window.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    // Guardar página actual antes de redirigir
    localStorage.setItem("postLoginRedirect", window.location.pathname);
    window.location.href = "login.html";
    return;
  }


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
});