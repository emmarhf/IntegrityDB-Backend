const SUPABASE_URL = "https://mtjcxaoomoymuttvtrzp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10amN4YW9vbW95bXV0dHZ0cnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjYyNDMsImV4cCI6MjA1ODkwMjI0M30.P11fBpCkrAzGOmL8PdcuKN_iXZSsH6qXEwdDAP2k4GM";

const tableBody = document.querySelector("#tabla-componentes tbody");

// Función para obtener los datos de Supabase
async function fetchComponentes() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/componentes?select=id,nombre,categoria_id,categorias(nombre)`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        }
    });

    const data = await response.json();
    renderTable(data);
}

// Función para mostrar los datos en la tabla
function renderTable(data) {
    tableBody.innerHTML = ""; // Limpiar tabla antes de renderizar
    data.forEach(componente => {
        const categoriaNombre = componente.categorias ? componente.categorias.nombre : "Desconocido";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${componente.id}</td>
            <td>${componente.categoria_id} - ${categoriaNombre}</td>  <!-- Mostrar categoria_id y nombre -->
            <td>${componente.nombre}</td>
            <td>
                <button onclick="editarComponente(${componente.id})">Editar</button>
                <button onclick="eliminarComponente(${componente.id})">Eliminar</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Llamamos a la función al cargar la página
fetchComponentes();
