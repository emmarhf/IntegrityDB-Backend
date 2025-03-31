const SUPABASE_URL = "https://mtjcxaoomoymuttvtrzp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10amN4YW9vbW95bXV0dHZ0cnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjYyNDMsImV4cCI6MjA1ODkwMjI0M30.P11fBpCkrAzGOmL8PdcuKN_iXZSsH6qXEwdDAP2k4GM";

const tableBody = document.querySelector("#tabla-componentes tbody");
const searchInput = document.getElementById("search");
const categoryFilter = document.getElementById("category-filter");

const form = document.getElementById("form-componente");
const nombreInput = document.getElementById("nombre");
const categoriaInput = document.getElementById("categoria");
const precioInput = document.getElementById("precio");
const descripcionInput = document.getElementById("descripcion");

let componentes = [];
let categorias = {};

// 🛠️ Generar un ID personalizado según el formato "CPU-i5-12345"
function generarIDPersonalizado(nombre, categoria) {
    const nombreCorto = nombre.split(" ")[0].substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-5); // Últimos 5 dígitos del timestamp
    return `${categoria}-${nombreCorto}-${timestamp}`;
}

// 🔄 Obtener categorías y almacenarlas en un objeto
async function fetchCategorias() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/categorias`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        }
    });
    const data = await response.json();
    data.forEach(cat => {
        categorias[cat.id] = cat.nombre;
    });

    // Llenar select de categorías en el formulario
    categoriaInput.innerHTML = data.map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join("");
}

// 🔄 Obtener componentes desde Supabase
async function fetchComponentes() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/componentes`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        }
    });

    componentes = await response.json();
    renderTable(componentes);
}

// 🖥️ Renderizar la tabla con los datos obtenidos
function renderTable(data) {
    tableBody.innerHTML = ""; // Limpiar tabla
    data.forEach(componente => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${componente.id}</td>
            <td>${categorias[componente.categoria_id] || "Desconocido"}</td>  
            <td>${componente.nombre}</td>
            <td>${componente.precio}</td>
            <td>${componente.descripcion}</td>
            <td>
                <div class="action-buttons">
                    <button class="edit-btn" onclick="editarComponente('${componente.id}')">Editar</button>
                    <button class="delete-btn" onclick="eliminarComponente('${componente.id}')">Eliminar</button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 🔍 Filtrar componentes por búsqueda
function filtrarComponentes() {
    const texto = searchInput.value.toLowerCase();
    const categoriaSeleccionada = categoryFilter.value;

    const resultados = componentes.filter(componente => {
        const nombreCoincide = componente.nombre.toLowerCase().includes(texto);
        const categoriaCoincide = categoriaSeleccionada === "" || componente.categoria_id == categoriaSeleccionada;
        return nombreCoincide && categoriaCoincide;
    });

    renderTable(resultados);
}

// 🔄 Eventos para búsqueda y filtro
searchInput.addEventListener("input", filtrarComponentes);
categoryFilter.addEventListener("change", filtrarComponentes);

// ➕ Agregar un nuevo componente
async function agregarComponente(event) {
    event.preventDefault();

    const nuevoComponente = {
        id: generarIDPersonalizado(nombreInput.value, categoriaInput.value), // 🔹 ID personalizado
        nombre: nombreInput.value,
        categoria_id: parseInt(categoriaInput.value),
        precio: parseFloat(precioInput.value),
        descripcion: descripcionInput.value
    };

    console.log("📤 Enviando datos a Supabase:", nuevoComponente);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/componentes`, {
        method: "POST",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(nuevoComponente)
    });

    const responseData = await response.json();
    console.log("📥 Respuesta de Supabase:", responseData);

    if (response.ok) {
        form.reset();
        fetchComponentes(); // 🔄 Actualizar tabla
    } else {
        alert("❌ Error al agregar el componente.");
    }
}

// ⏳ Cargar datos al iniciar
async function iniciarApp() {
    await fetchCategorias();
    await fetchComponentes();
}

iniciarApp();

// 📝 Evento para agregar componente
form.addEventListener("submit", agregarComponente);

// 🗑️ Eliminar componente
async function eliminarComponente(id) {
    const confirmar = confirm("¿Seguro que quieres eliminar este componente?");
    if (!confirmar) return;

    await fetch(`${SUPABASE_URL}/rest/v1/componentes?id=eq.${id}`, {
        method: "DELETE",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        }
    });

    fetchComponentes();
}

// 🛠️ Editar componente (cargar datos en formulario)
async function editarComponente(id) {
    const componente = componentes.find(c => c.id === id);
    if (!componente) return;

    nombreInput.value = componente.nombre;
    categoriaInput.value = componente.categoria_id;
    precioInput.value = componente.precio;
    descripcionInput.value = componente.descripcion;

    // Cambiar botón para actualizar en lugar de agregar
    form.removeEventListener("submit", agregarComponente);
    form.addEventListener("submit", async function actualizarComponente(event) {
        event.preventDefault();

        const actualizado = {
            nombre: nombreInput.value,
            categoria_id: parseInt(categoriaInput.value),
            precio: parseFloat(precioInput.value),
            descripcion: descripcionInput.value
        };

        await fetch(`${SUPABASE_URL}/rest/v1/componentes?id=eq.${id}`, {
            method: "PATCH",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(actualizado)
        });

        form.reset();
        form.removeEventListener("submit", actualizarComponente);
        form.addEventListener("submit", agregarComponente);
        fetchComponentes();
    });
}
