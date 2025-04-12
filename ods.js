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
  document.querySelector('input[name="ajuste"]').addEventListener("input", actualizarVistaTotal);

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
      aliado: form.aliado.value || null,
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
  
    // Capturar artículos
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
  
    // Consecutivo incremental
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
  
    datos.consecutivo = nuevoConsecutivo;
  
    mostrarOverlayCarga("Guardando orden de servicio...");
  
    const { error } = await supabase.from("ods").insert([datos]);
  
    ocultarOverlayCarga();
  
    if (error) {
      alert("❌ Error al guardar: " + error.message);
      return;
    }
  
    alert(`✅ Orden registrada con éxito
  Terminal: ${datos.terminal}
  Operación: ${datos.operacion}
  Folio: ${datos.consecutivo}
  Correo: ${datos.email}`);
  
    form.reset();
    document.getElementById("vigencia-final").value = new Date().toISOString().split("T")[0];
    document.getElementById("vista-subtotal").textContent = "$0.00";
    document.getElementById("vista-ajuste").textContent = "$0.00";
    document.getElementById("vista-total").textContent = "$0.00";
    document.getElementById("articulos-container").innerHTML = "";
    crearSelectorArticulo();
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
    select.innerHTML = `
      <option disabled selected>Seleccionar Artículo</option>
      ${articulosDisponibles.map(
        art => `<option value="${art.producto}" data-precio="${art.precio}">${art.producto}</option>`
      ).join("")}
    `;
  
    const cantidad = document.createElement("input");
    cantidad.type = "number";
    cantidad.value = 1;
    cantidad.min = 1;
  
    select.addEventListener("change", () => {
      const precio = select.selectedOptions[0]?.dataset.precio || 0;
      fila.dataset.precio = precio;
      actualizarVistaTotal(); // 🟦 ACTUALIZA AL CAMBIAR PRODUCTO
    });
  
    cantidad.addEventListener("input", actualizarVistaTotal); // 🟦 ACTUALIZA AL CAMBIAR CANTIDAD
  
    fila.dataset.precio = 0;
  
    fila.appendChild(select);
    fila.appendChild(cantidad);
  
    document.getElementById("articulos-container").appendChild(fila);
  }

  function actualizarVistaTotal() {
    const filas = document.querySelectorAll(".articulo-fila");
    let subtotal = 0;
  
    filas.forEach(fila => {
      const cantidad = parseInt(fila.querySelector("input").value) || 1;
      const precio = parseFloat(fila.dataset.precio) || 0;
      subtotal += cantidad * precio;
    });
  
    const ajuste = parseFloat(document.querySelector('input[name="ajuste"]').value) || 0;
    const total = subtotal + ajuste;
  
    // Actualiza los tres campos visibles
    document.getElementById("vista-subtotal").textContent = subtotal.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
      });
      
      document.getElementById("vista-ajuste").textContent = `${ajuste >= 0 ? '+' : '-'}${Math.abs(ajuste).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
      })}`;
      
      document.getElementById("vista-total").textContent = total.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
      });
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
        <th>Terminal</th>
        <th>Operación</th>
        <th>Cliente</th>
        <th>Observaciones</th>
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
      <td title="${item.consecutivo}">${item.consecutivo}</td>
      <td title="${item.terminal}">${item.terminal}</td>
      <td title="${item.operacion}">${item.operacion}</td>
      <td title="${item.cliente}">${item.cliente}</td>
      <td title="${item.observaciones || '--'}">${item.observaciones || "--"}</td>
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

  const btnNuevaODS = document.getElementById("btn-nueva-ods");
    const btnHistorialODS = document.getElementById("btn-historial-ods");
    const seccionFormulario = document.getElementById("seccion-formulario-ods");
    const seccionHistorial = document.getElementById("seccion-historial-ods");

    btnNuevaODS.addEventListener("click", () => {
    btnNuevaODS.classList.add("tab-activa");
    btnHistorialODS.classList.remove("tab-activa");
    seccionFormulario.style.display = "block";
    seccionHistorial.style.display = "none";
    });

    btnHistorialODS.addEventListener("click", () => {
    btnHistorialODS.classList.add("tab-activa");
    btnNuevaODS.classList.remove("tab-activa");
    seccionFormulario.style.display = "none";
    seccionHistorial.style.display = "block";
    cargarHistorialODS(); // ✅ siempre actualiza
    });
async function editarODS(id) {
  mostrarOverlayCarga("Cargando orden...");

  const { data, error } = await supabase.from("ods").select("*").eq("id", id).single();

  ocultarOverlayCarga();

  if (error || !data) {
    alert("❌ No se pudo cargar la orden para editar.");
    return;
  }

  const form = document.getElementById("form-edicion-ods");
  form.dataset.id = id;

  // Llenar dinámicamente campos existentes sin romper la estructura
  const campos = [
    "cliente", "telefono", "email", "asesor", "terminal", "operacion", "aliado", "observaciones"
  ];

  campos.forEach(nombre => {
    const campo = form.querySelector(`[name="${nombre}"]`);
    if (campo) campo.value = data[nombre] || "";
  });

  document.getElementById("panel-edicion-ods").classList.remove("oculto");
}



document.querySelector(".btn-eliminar").addEventListener("click", async () => {
  const form = document.getElementById("form-edicion-ods");
  const id = form.dataset.id;

  if (!confirm("¿Estás seguro de eliminar esta orden? Esta acción no se puede deshacer.")) return;

  mostrarOverlayCarga("Eliminando...");

  const { error } = await supabase.from("ods").delete().eq("id", id);

  ocultarOverlayCarga();

  if (error) {
    alert("❌ No se pudo eliminar.");
    return;
  }

  alert("🗑️ Orden eliminada");
  document.getElementById("panel-edicion-ods").classList.add("oculto");
  cargarHistorialODS();
});

document.querySelector(".btn-cerrar").addEventListener("click", () => {
  document.getElementById("panel-edicion-ods").classList.add("oculto");
});


async function editarODS(id) {
    mostrarOverlayCarga("Cargando orden...");
  
    const { data, error } = await supabase.from("ods").select("*").eq("id", id).single();
  
    ocultarOverlayCarga();
  
    if (error || !data) {
      alert("❌ No se pudo cargar la orden para editar.");
      return;
    }
  
    const form = document.getElementById("form-edicion-ods");
    form.dataset.id = id;
  
    // Llenar dinámicamente campos existentes sin romper la estructura
    const campos = [
      "cliente", "telefono", "email", "asesor", "terminal", "operacion", "aliado", "observaciones"
    ];
  
    campos.forEach(nombre => {
      const campo = form.querySelector(`[name="${nombre}"]`);
      if (campo) campo.value = data[nombre] || "";
    });
  
    document.getElementById("panel-edicion-ods").classList.remove("oculto");
  }
  
  document.getElementById("form-edicion-ods").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const id = form.dataset.id;
  
    const campos = {};
    ["cliente", "telefono", "email", "asesor", "terminal", "operacion", "aliado", "observaciones"].forEach(nombre => {
      const campo = form.querySelector(`[name="${nombre}"]`);
      if (campo) campos[nombre] = campo.value;
    });
  
    mostrarOverlayCarga("Guardando cambios...");
  
    const { error } = await supabase.from("ods").update(campos).eq("id", id);
  
    ocultarOverlayCarga();
  
    if (error) {
      alert("❌ Error al actualizar la orden");
      return;
    }
  
    alert("✅ Cambios guardados");
    document.getElementById("panel-edicion-ods").classList.add("oculto");
    cargarHistorialODS();
  });
  
  document.querySelector(".btn-eliminar").addEventListener("click", async () => {
    const form = document.getElementById("form-edicion-ods");
    const id = form.dataset.id;
  
    if (!confirm("¿Estás seguro de eliminar esta orden? Esta acción no se puede deshacer.")) return;
  
    mostrarOverlayCarga("Eliminando...");
  
    const { error } = await supabase.from("ods").delete().eq("id", id);
  
    ocultarOverlayCarga();
  
    if (error) {
      alert("❌ No se pudo eliminar.");
      return;
    }
  
    alert("🗑️ Orden eliminada");
    document.getElementById("panel-edicion-ods").classList.add("oculto");
    cargarHistorialODS();
  });
  
  document.querySelector(".btn-cerrar").addEventListener("click", () => {
    document.getElementById("panel-edicion-ods").classList.add("oculto");
  });

  async function visualizarODS(id) {
    mostrarOverlayCarga("Cargando orden...");
  
    const { data, error } = await supabase
      .from("ods")
      .select("*")
      .eq("id", id)
      .single();
  
    ocultarOverlayCarga();
  
    if (error || !data) {
      alert("❌ No se pudo cargar la orden");
      return;
    }
  
    // ✅ Guardar la orden en localStorage con clave EXACTA
    localStorage.setItem("ordenSeleccionada", JSON.stringify(data));
  
    // ✅ Abrir contrato.html en una nueva pestaña
    window.open("contrato.html", "_blank");
  }