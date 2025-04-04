// ✅ Configurar Supabase
const SUPABASE_URL = "https://mtjcxaoomoymuttvtrzp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10amN4YW9vbW95bXV0dHZ0cnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjYyNDMsImV4cCI6MjA1ODkwMjI0M30.P11fBpCkrAzGOmL8PdcuKN_iXZSsH6qXEwdDAP2k4GM";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 🎯 Elementos del DOM
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const errorDisplay = document.getElementById("login-error");

// 🚪 Validar login
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  errorDisplay.textContent = "";

  if (!email || !password) {
    errorDisplay.textContent = "Por favor ingresa correo y contraseña.";
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("❌ Error de login:", error.message);
    errorDisplay.textContent = "Correo o contraseña inválidos";
  } else {
    // Verificar si hay redirección guardada
      const redirect = localStorage.getItem("postLoginRedirect") || "index.html";
      localStorage.removeItem("postLoginRedirect"); // Limpieza
      window.location.href = redirect;
  }
});
