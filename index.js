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
 let categorias = {};               // ID → Nombre
 let categoriaNombreAId = {};       // Nombre → ID (para carga)

 
 // 🛠️ Generar un ID personalizado según el formato "CPU-i5-12345"
 function generarIDPersonalizado(nombre, categoria) {
     const nombreCorto = nombre.split(" ")[0].substring(0, 3).toUpperCase();
     const timestamp = Date.now().toString().slice(-5); // Últimos 5 dígitos del timestamp
     return `${categoria}-${nombreCorto}-${timestamp}`;
 }
 
 // 🔄 Obtener categorías y almacenarlas en un objeto
 async function fetchCategorias() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/categorias`, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        // Limpiar mapas
        categorias = {};
        categoriaNombreAId = {};

        // Construir mapas
        data.forEach(cat => {
            categorias[cat.id] = cat.nombre;
            categoriaNombreAId[cat.nombre.trim().toLowerCase()] = cat.id;
        });

        // Rellenar el <select>
        categoriaInput.innerHTML = data
            .map(cat => `<option value="${cat.id}">${cat.nombre}</option>`)
            .join("");

    } catch (error) {
        console.error("❌ Error al obtener categorías:", error);
    }
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
            <td>$${componente.precio.toLocaleString("es-MX")}</td>
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

    // Actualizar contador
    const contador = document.getElementById("contador-componentes");
    if (searchInput.value.trim() || categoryFilter.value) {
        contador.textContent = `${data.length} resultados encontrados`;
    } else {
        contador.textContent = `${data.length} componentes`;
    }
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
 
 
 // Función para convertir los datos de la tabla a formato CSV
 function convertirACSV(componentes) {
     const encabezados = ["ID", "Categoría", "Nombre", "Precio", "Descripción"];
     const filas = componentes.map(componente => [
         componente.id,
         categorias[componente.categoria_id] || "Desconocido",
         componente.nombre,
         componente.precio,
         `"${componente.descripcion.replace(/"/g, '""')}"`  // Escapar las comillas dobles dentro de la descripción
     ]);
 
     // Combinar encabezados y filas en un formato CSV
     const contenido = [encabezados, ...filas].map(fila => fila.join(",")).join("\n");
     return contenido;
 }
 // Función para descargar el archivo CSV
 function descargarArchivo(componentes, notificar = true) {
    const csv = convertirACSV(componentes);
    const blob = new Blob([csv], { type: 'text/csv' });
    const enlace = document.createElement('a');
    const fechaHora = new Date().toLocaleString();
    const nombreArchivo = `componentes_${fechaHora}.csv`.replace(/[:]/g, "-");

    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombreArchivo;
    enlace.click();

    console.log("📥 descarga realizada", { notificar });

    if (notificar) {
        const mensaje = `¡Se realizó una descarga de componentes!\nFecha y Hora: ${fechaHora}`;
        const enlaceWhatsApp = `https://wa.me/5522971545?text=${encodeURIComponent(mensaje)}`;
        console.log("📲 enviando WhatsApp desde descarga");
        console.trace("🧩 WhatsApp lanzado desde descargarArchivo()");
        window.open(enlaceWhatsApp, "_blank");

    }
}



 
 // Evento para el botón de descarga
 document.getElementById("download-file").addEventListener("click", () => {
     descargarArchivo(componentes); // Descargar el archivo y notificar
 });

 // Elementos del modal
const modalCarga = document.getElementById("modal-carga-base");
const inputArchivo = document.getElementById("archivo-base");
const btnConfirmarCarga = document.getElementById("confirmar-carga");
const btnCancelarCarga = document.getElementById("cancelar-carga");
const previewTablaBody = document.querySelector("#preview-table tbody");
const previewContainer = document.getElementById("preview-carga");
const btnEliminarBase = document.getElementById("eliminar-base");
const tablaVacia = [
    ["ID", "Categoría", "Nombre", "Precio", "Descripción"]
];



let datosCargados = []; // fuera de los listeners

// 🧭 Mostrar el modal
document.getElementById("btn-cargar-base").addEventListener("click", () => {
    modalCarga.classList.remove("hidden");
    previewContainer.classList.add("hidden");
    previewTablaBody.innerHTML = "";
    inputArchivo.value = "";
});

// ❌ Cancelar carga
btnCancelarCarga.addEventListener("click", () => {
    modalCarga.classList.add("hidden");
});


// 🗑️ Eliminar Base
const overlay = document.getElementById("overlay-cargando");

btnEliminarBase.addEventListener("click", async () => {
    const confirmar = confirm("⚠️ ¿Estás seguro que quieres eliminar toda la base de componentes?\nEsto eliminará los registros uno por uno.");

    if (!confirmar) return;

    // Mostrar overlay y desactivar botones
    overlay.classList.remove("hidden");
    btnEliminarBase.disabled = true;
    btnConfirmarCarga.disabled = true;
    btnCancelarCarga.disabled = true;

    try {
        // 📥 Descargar respaldo sin notificación
        descargarArchivo(componentes, false); // ❌ No notificar

        // 🗑️ Eliminar uno por uno
        for (const componente of componentes) {
            await fetch(`${SUPABASE_URL}/rest/v1/componentes?id=eq.${componente.id}`, {
                method: "DELETE",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json"
                }
            });
        }

        // ✅ Refrescar UI
        await fetchComponentes();
        modalCarga.classList.add("hidden");

        alert("✅ Base eliminada correctamente.");

        // 📲 Notificación única
        const fechaHora = new Date().toLocaleString();
        const mensaje = `⚠️ Se eliminó toda la base de componentes.\n📅 Fecha y hora: ${fechaHora}`;
        const enlaceWA = `https://wa.me/5522971545?text=${encodeURIComponent(mensaje)}`;
        window.open(enlaceWA, "_blank", "noopener,noreferrer");

    } catch (error) {
        console.error("❌ Error eliminando base:", error);
        alert("❌ Ocurrió un error al eliminar la base.");
    } finally {
        overlay.classList.add("hidden");
        btnEliminarBase.disabled = false;
        btnConfirmarCarga.disabled = false;
        btnCancelarCarga.disabled = false;
    }
});

// 🧪 Previsualizar archivo seleccionado
inputArchivo.addEventListener("change", async (event) => {
    const archivo = event.target.files[0];
    if (!archivo) return;

    // 👉 MOSTRAR nombre del archivo seleccionado
    const nombreArchivo = document.getElementById("archivo-seleccionado");
    nombreArchivo.textContent = archivo.name;

    const extension = archivo.name.split('.').pop().toLowerCase();
    const lector = new FileReader();

    lector.onload = function (e) {
        let filas;

        if (archivo.name.endsWith(".csv")) {
            const texto = e.target.result;
            const workbook = XLSX.read(texto, { type: "string" });
            const hoja = workbook.Sheets[workbook.SheetNames[0]];
            filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
        } else {
            const datos = new Uint8Array(e.target.result);
            const libro = XLSX.read(datos, { type: 'array' });
            const hoja = libro.Sheets[libro.SheetNames[0]];
            filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
        }

        datosCargados = filas;

        previewTablaBody.innerHTML = "";
        filas.slice(1).forEach(fila => {
            const [id, categoria, nombre, precio, descripcion] = fila;
            if (id && nombre) {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${id}</td>
                    <td>${categoria}</td>
                    <td>${nombre}</td>
                    <td>${precio}</td>
                    <td>${descripcion}</td>
                `;
                previewTablaBody.appendChild(tr);
            }
        });

        previewContainer.classList.remove("hidden");
    };

    if (archivo.name.endsWith(".csv")) {
        lector.readAsText(archivo, "utf-8");
    } else {
        lector.readAsArrayBuffer(archivo);
    }
});




btnConfirmarCarga.addEventListener("click", async () => {
    if (!datosCargados || datosCargados.length === 0) {
        alert("❌ No hay datos para cargar. Selecciona un archivo válido.");
        return;
    }

    const confirmar = confirm("¿Estás seguro de que deseas cargar esta base? Se reemplazarán los datos actuales.");
    if (!confirmar) return;

    // 📥 1. Descargar respaldo actual
    descargarArchivo(componentes, false); // en flujo de carga

    const headers = datosCargados[0];
    const datosValidos = datosCargados.slice(1).map(fila => {
        
        const [id, categoriaNombre, nombre, precio, descripcion] = fila;
        const categoria_id = categoriaNombreAId[categoriaNombre.trim().toLowerCase()] || null;
        
        if (!categoria_id) {
            alert(`❌ Categoría inválida: "${categoriaNombre}". Verifica que exista en Supabase.`);
            throw new Error(`Categoría inválida: ${categoriaNombre}`);
        }
        
        return {
            id,
            categoria_id,
            nombre,
            precio: parseFloat(precio),
            descripcion
        };
        
    });

    try {
        // ⚠️ 2. Eliminar base actual
        await fetch(`${SUPABASE_URL}/rest/v1/componentes`, {
            method: "DELETE",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json"
            }
        });

        // 📤 3. Insertar nueva base
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/componentes`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=representation"
            },
            body: JSON.stringify(datosValidos)
        });

        const insertData = await insertRes.json();
        console.log("📥 Respuesta de Supabase:", insertData);

        if (!insertRes.ok) {
            throw new Error("Supabase respondió con error: " + JSON.stringify(insertData));
        }

        // ✅ 4. Refrescar
        modalCarga.classList.add("hidden");
        inputArchivo.value = "";
        previewTablaBody.innerHTML = "";
        previewContainer.classList.add("hidden");
        fetchComponentes();

        // 📲 5. WhatsApp
        const fechaHora = new Date().toLocaleString();
        const mensaje = `✅ Se descargó un respaldo y se cargó una nueva base de componentes.\n📅 Fecha y hora: ${fechaHora}`;
        const enlaceWA = `https://wa.me/5522971545?text=${encodeURIComponent(mensaje)}`;
        window.open(enlaceWA, "_blank");


    } catch (error) {
        console.error("❌ Error en carga de base:", error);
        alert("❌ Error al cargar la base:\n" + error.message);
    }
});

const toggleGuia = document.getElementById("toggle-guia");
const contenidoGuia = document.getElementById("contenido-guia");

toggleGuia.addEventListener("click", () => {
    contenidoGuia.classList.toggle("hidden");
});

document.getElementById("descargar-plantilla").addEventListener("click", () => {
    const encabezados = ["ID", "Categoría", "Nombre", "Precio", "Descripción"];
    const ejemplo = [
        ["CPU-I5-10400F", "Procesador (CPU)", "Intel Core i5-10400F", 3400, "6 núcleos / 12 hilos, DDR4, Socket LGA1200"]
    ];

    const contenido = [encabezados, ...ejemplo]
        .map(fila => fila.join(","))
        .join("\n");

    const blob = new Blob([contenido], { type: "text/csv" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = "plantilla_componentes.csv";
    enlace.click();
});
