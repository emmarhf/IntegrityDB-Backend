// ╭─────────────────────────────╮
// │ Validación y Cierre de Sesión │
// ╰─────────────────────────────╯

// ✅ Inicializar Supabase
const SUPABASE_URL = "https://mtjcxaoomoymuttvtrzp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10amN4YW9vbW95bXV0dHZ0cnpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzMjYyNDMsImV4cCI6MjA1ODkwMjI0M30.P11fBpCkrAzGOmL8PdcuKN_iXZSsH6qXEwdDAP2k4GM";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let articulosDisponibles = [];

// 🚪 Validar sesión activa
window.addEventListener("DOMContentLoaded", async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    localStorage.setItem("postLoginRedirect", window.location.pathname);
    window.location.href = "login.html";
    return;
  }

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

  await precargarArticulos();
  crearSelectorArticulo();
  cargarHistorialODS();

  document.getElementById("agregar-articulo").addEventListener("click", crearSelectorArticulo);
});

document.getElementById("vigencia-select").addEventListener("change", () => {
  const valor = parseFloat(document.getElementById("vigencia-select").value);
  const output = document.getElementById("vigencia-final");

  if (valor === 0) {
    output.value = "Sin vigencia";
    return;
  }

  const fechaBase = new Date();
  if (valor < 1) {
    fechaBase.setDate(fechaBase.getDate() + 15);
  } else {
    fechaBase.setFullYear(fechaBase.getFullYear() + valor);
  }

  output.value = fechaBase.toISOString().split("T")[0];
});

// ╭─────────────────────────────╮
// │ Captura y Envío de la Orden │
// ╰─────────────────────────────╯

document.getElementById("form-ods").addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const form = e.target;
    const datos = {
      cliente: form.cliente.value,
      telefono: form.telefono.value,
      email: form.email.value,
      asesor: form.asesor.value,
      terminal: form.terminal.value,
      operacion: form.operacion.value,
      ajuste: parseFloat(form.ajuste.value) || 0,
      observaciones: form.observaciones.value,
      marca: form.marca.value || null,
      modelo: form.modelo.value || null,
      serie: form.serie.value || null,
      detalles_equipo: form.detalles_equipo?.value || null,
      fecha_operacion: form.fecha_operacion.value,
      vigencia: form.vigencia.value,
      vigente_hasta: document.getElementById("vigencia-final").value,
      fecha_entrega: form.fecha_entrega.value,
      recomienda: parseInt(form.recomienda.value)
    };
  
    // Obtener artículos seleccionados
    const articulosDOM = document.querySelectorAll(".articulo-fila");
    const articulos = [];
    let total = 0;
  
    articulosDOM.forEach((fila) => {
      const articulo = fila.querySelector("select").value;
      const cantidad = parseInt(fila.querySelector("input").value) || 1;
      const precio = parseFloat(fila.dataset.precio) || 0;
      const subtotal = cantidad * precio;
  
      articulos.push({ articulo, cantidad, precio, subtotal });
      total += subtotal;
    });
  
    datos.articulos = articulos;
    datos.total_sin_iva = total + datos.ajuste;
  
    // ╭────────────────────────────────────╮
    // │ Obtener nuevo consecutivo basado   │
    // │ en el último valor en Supabase     │
    // ╰────────────────────────────────────╯
    // Generar consecutivo incremental
    let nuevoConsecutivo = "E2-BCOYCOM-9790";

    const { data: ultimos, error: errorUltimos } = await supabase
    .from("ods")
    .select("consecutivo")
    .order("created_at", { ascending: false })
    .limit(1);

    if (!errorUltimos && ultimos.length > 0) {
    const ultimo = ultimos[0].consecutivo;
    const partes = ultimo.split("-");
    const numero = parseInt(partes[2], 10);
    if (!isNaN(numero)) {
        const nuevoNumero = numero + 1;
        nuevoConsecutivo = `E2-BCOYCOM-${nuevoNumero}`;
    }
    }

// ✅ Asignar el consecutivo correcto
datos.consecutivo = nuevoConsecutivo;
  
    datos.consecutivo = nuevoConsecutivo;
  
    mostrarOverlayCarga("Guardando orden de servicio...");
  
    const { error } = await supabase.from("ods").insert([datos]);
  
    ocultarOverlayCarga();
  
    if (error) {
      alert("❌ Error al guardar la orden: " + error.message);
      return;
    }
  
    alert(`✅ Tu orden fue registrada con éxito\nTerminal: ${datos.terminal}\nOperación: ${datos.operacion}\nFolio: ${datos.consecutivo}`);
    form.reset();
    document.getElementById("vigencia-final").value = "";
    cargarHistorialODS();
  });

// ╭─────────────────────────────╮
// │ Carga de artículos disponibles │
// ╰─────────────────────────────╯
async function precargarArticulos() {
  const { data, error } = await supabase.from("lista_precios").select("producto, precio");

  if (error) {
    console.error("❌ Error al cargar artículos:", error.message);
    return;
  }

  articulosDisponibles = data;
}

function crearSelectorArticulo() {
  const fila = document.createElement("div");
  fila.className = "articulo-fila";

  const select = document.createElement("select");
  select.innerHTML = articulosDisponibles.map(
    art => `<option value="${art.producto}" data-precio="${art.precio}">${art.producto}</option>`
  ).join("");

  const cantidad = document.createElement("input");
  cantidad.type = "number";
  cantidad.value = 1;
  cantidad.min = 1;

  select.addEventListener("change", () => {
    fila.dataset.precio = select.selectedOptions[0].dataset.precio;
  });

  fila.dataset.precio = articulosDisponibles[0]?.precio || 0;

  fila.appendChild(select);
  fila.appendChild(cantidad);

  document.getElementById("articulos-container").appendChild(fila);
}

// ╭─────────────────────────────╮
// │ Overlay de carga            │
// ╰─────────────────────────────╯
function mostrarOverlayCarga(texto) {
  const overlay = document.createElement("div");
  overlay.id = "overlay-carga";
  overlay.innerHTML = `<div class="caja-overlay"><span>${texto}</span></div>`;
  document.body.appendChild(overlay);
}

function ocultarOverlayCarga() {
  const overlay = document.getElementById("overlay-carga");
  if (overlay) overlay.remove();
}

// ╭─────────────────────────────╮
// │ Historial ODS con Filtro    │
// ╰─────────────────────────────╯

document.getElementById("filtro-historial").addEventListener("input", () => {
    cargarHistorialODS();
});

async function cargarHistorialODS() {
    const { data, error } = await supabase
      .from("ods")
      .select("*")
      .order("created_at", { ascending: false });
  
    const tabla = document.getElementById("tabla-ods");
    tabla.innerHTML = ""; // Limpiar
  
    if (error || !data) {
      tabla.innerHTML = "<tr><td colspan='8'>Error al cargar historial.</td></tr>";
      return;
    }
  
    const filtro = document.getElementById("filtro-historial").value.trim().toLowerCase();
    const filtradas = data.filter(item =>
      item.consecutivo?.toLowerCase().includes(filtro) ||
      item.cliente?.toLowerCase().includes(filtro) ||
      item.terminal?.toLowerCase().includes(filtro) ||
      item.operacion?.toLowerCase().includes(filtro)
    );
  
    // Crear thead completo
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Folio</th>
        <th>Cliente</th>
        <th>Terminal</th>
        <th>Operación</th>
        <th>Observaciones</th>
        <th>Total c/IVA</th>
        <th>Total s/IVA</th>
        <th>Acciones</th>
      </tr>`;
    tabla.appendChild(thead);
  
    // Crear tbody
    const tbody = document.createElement("tbody");
  
    filtradas.forEach((item) => {
      const totalConIVA = Number(item.total_sin_iva);
      const totalSinIVA = totalConIVA / 1.16;
  
      const fila = document.createElement("tr");
            fila.innerHTML = `
        <td>${item.consecutivo}</td>
        <td>${item.cliente}</td>
        <td>${item.terminal}</td>
        <td>${item.operacion}</td>
        <td>${item.observaciones || "--"}</td>
        <td>${totalConIVA.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</td>
        <td>${totalSinIVA.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</td>
        <td>
            <div class="acciones-contenedor">
            <button class="btn-editar" onclick="editarODS('${item.id}')">✏️ Editar</button>
            <button class="btn-ver" onclick="visualizarODS('${item.id}')">🧾 Visualizar</button>
            </div>
        </td>
        `;
      tbody.appendChild(fila);
    });
  
    tabla.appendChild(tbody);
  }