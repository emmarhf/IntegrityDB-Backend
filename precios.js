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
    cargarProductos(); // 👈 Esto activa la carga inicial
    document.getElementById("buscador-precios").addEventListener("input", () => {
        paginaActual = 1;
        aplicarFiltros();
    });
    document.getElementById("filtro-categoria").addEventListener("change", () => {
        paginaActual = 1;
        aplicarFiltros();
      });
    document.getElementById("btn-exportar-excel").addEventListener("click", exportarExcel);
});

let paginaActual = 1;
const productosPorPagina = 16;
let totalProductos = 0;
let todosLosProductos = []; // importante: poblado en cargarProductos()

// ╭─────────────────────────────╮
// │ Lectura de productos desde Supabase │
// ╰─────────────────────────────╯

async function cargarProductos() {
    const { data: productos, count, error } = await supabase
      .from("lista_precios")
      .select("*", { count: "exact" });
  
    if (error) {
      console.error("❌ Error al cargar productos:", error.message);
      return;
    }
  
    todosLosProductos = productos;
    totalProductos = count;
  
    await poblarCategoriasGlobal();
    aplicarFiltros(); // Esto ya se encarga de paginar
  }

async function poblarCategoriasGlobal() {
    const select = document.getElementById("filtro-categoria");
  
    const { data, error } = await supabase
      .from("lista_precios")
      .select("categoria");
  
    if (error) {
      console.error("❌ Error al obtener categorías:", error.message);
      return;
    }
  
    const categoriasUnicas = [...new Set(data.map(p => p.categoria).filter(Boolean))].sort();
    select.innerHTML = '<option value="">Todas las categorías</option>';
    categoriasUnicas.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
}

async function poblarListasDesplegables() {
    const { data: productos, error } = await supabase.from("lista_precios").select("categoria, subcategoria");
  
    if (error) {
      console.error("❌ Error al obtener categorías:", error.message);
      return;
    }
  
    const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort();
    const subcategorias = [...new Set(productos.map(p => p.subcategoria).filter(Boolean))].sort();
  
    const listaCat = document.getElementById("lista-categorias");
    const listaSub = document.getElementById("lista-subcategorias");
  
    listaCat.innerHTML = "";
    listaSub.innerHTML = "";
  
    categorias.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      listaCat.appendChild(opt);
    });
  
    subcategorias.forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub;
      listaSub.appendChild(opt);
    });
}


// ╭─────────────────────────────╮
// │ Buscador y Filtro dinámico │
// ╰─────────────────────────────╯

async function aplicarFiltros() {
    const termino = document.getElementById("buscador-precios").value.trim().toLowerCase();
    const categoria = document.getElementById("filtro-categoria").value.toLowerCase();
    const grid = document.getElementById("grid-precios");
    const contador = document.getElementById("contador-precios");
  
    paginaActual = Math.max(paginaActual, 1); // aseguramos que nunca sea menor a 1
  
    let productosFiltrados = [];
  
    const busquedaActiva = termino.length > 0 || (categoria !== "" && categoria !== undefined);
  
    if (busquedaActiva) {
      let query = supabase.from("lista_precios").select("*");
  
      if (termino.length > 0) {
        query = query.ilike("producto", `%${termino}%`);
      }
  
      const { data, error } = await query;
  
      if (error) {
        console.error("❌ Error en búsqueda:", error.message);
        return;
      }
  
      productosFiltrados = data.filter((item) => {
        const matchCategoria = categoria === "" || item.categoria?.toLowerCase() === categoria;
        const terminoNormalizado = termino.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const matchExtra =
        
        item.producto?.toLowerCase().includes(termino) ||
        item.descripcion?.toLowerCase().includes(termino) ||
        item.subcategoria?.toLowerCase().includes(termino) ||
        item.categoria?.toLowerCase().includes(termino) ||
        item.id?.toLowerCase().includes(termino) ||
        (item.precio !== undefined && item.precio.toString().includes(termino));
                if (termino.length > 0 && matchExtra) return true;
                if (termino.length === 0 && matchCategoria) return true;
                return false;
            });
      
    } else {
      productosFiltrados = todosLosProductos;
    }
  
    totalProductos = productosFiltrados.length;
  
    const desde = (paginaActual - 1) * productosPorPagina;
    const hasta = desde + productosPorPagina;
    const productosVisibles = productosFiltrados.slice(desde, hasta);
  
    actualizarControlesPaginacion();
    document.querySelector(".paginacion").style.display = "flex";
  
    // 🔁 Renderizado de resultados
        grid.innerHTML = "";
        contador.textContent = `${productosFiltrados.length} productos encontrados`;

        // ⛔ Si no hay productos en absoluto, mostramos sugerencia
        if (productosFiltrados.length === 0) {
        const terminoBusqueda = document.getElementById("buscador-precios").value.trim();

        const sugerencia = document.createElement("div");
            sugerencia.className = "mensaje-sin-resultados";
            sugerencia.innerHTML = `
            <h2>😕 No se encontraron coincidencias</h2>
            <p>Puedes consultar el canal oficial de cotizaciones en Telegram.</p>
            <a href="https://t.me" target="_blank" class="boton-telegram">
                📲 Abrir Telegram y buscar el grupo
            </a>
            `;
            grid.appendChild(sugerencia);
        return; // solo en este caso se detiene el flujo
        }

        // ✅ Si hay productos, renderiza normalmente
        productosVisibles.forEach((item) => {
        const card = document.createElement("div");
        card.className = "tarjeta-precio";
        card.innerHTML = `
            <h3>${item.producto}</h3>
            <span class="categoria-tag">${item.categoria} > ${item.subcategoria}</span>
            <p class="descripcion">${item.descripcion}</p>
            <div class="precio">$${Number(item.precio).toLocaleString()}</div>
            <div class="crud-botones">
            <button class="editar" onclick="editarProducto('${item.id}')">Editar</button>
            <button class="eliminar" onclick="eliminarProducto('${item.id}')">Eliminar</button>
            </div>
        `;
        grid.appendChild(card);
        });
}



// ╭─────────────────────────────╮
// │ Panel lateral: Agregar producto │
// ╰─────────────────────────────╯
let modoEdicion = false;
let productoEditandoId = null;
const panel = document.getElementById("panel-lateral");
const formAgregar = document.getElementById("form-agregar-producto");

document.getElementById("btn-agregar-producto").addEventListener("click", () => {
  panel.classList.add("visible");
  panel.classList.remove("oculto");
  poblarListasDesplegables();
});

document.getElementById("btn-cerrar-panel").addEventListener("click", () => {
    panel.classList.remove("visible");
    setTimeout(() => panel.classList.add("oculto"), 300);
    
    // 🧼 Limpiar formulario y volver a modo agregar
    formAgregar.reset();
    document.querySelector(".panel-contenido h3").textContent = "Agregar Producto";
    modoEdicion = false;
    productoEditandoId = null;
});

formAgregar.addEventListener("submit", async (e) => {
    e.preventDefault();
  
    const overlay = document.getElementById("overlay-guardando");
    overlay.classList.remove("hidden");
  
    const producto = document.getElementById("form-producto").value.trim();
    const categoria = document.getElementById("form-categoria").value.trim();
    const subcategoria = document.getElementById("form-subcategoria").value.trim();
    const precio = parseFloat(document.getElementById("form-precio").value);
    const descripcion = document.getElementById("form-descripcion").value.trim();
  
    let resultado;
  
    if (modoEdicion) {
      resultado = await supabase.from("lista_precios").update({
        producto, categoria, subcategoria, precio, descripcion
      }).eq("id", productoEditandoId);
    } else {
      resultado = await supabase.from("lista_precios").insert([
        { producto, categoria, subcategoria, precio, descripcion }
      ]);
    }
  
    const { error } = resultado;
  
    overlay.classList.add("hidden"); // Ocultar overlay
  
    if (error) {
      alert("❌ Error al guardar: " + error.message);
    } else {
        mostrarToast("Producto guardado correctamente ✅");
      panel.classList.remove("visible");
      setTimeout(() => panel.classList.add("oculto"), 300);
      formAgregar.reset();
      cargarProductos(); // Refrescar lista
    }
});



async function editarProducto(id) {
    const { data, error } = await supabase.from("lista_precios").select("*").eq("id", id).single();
  
    if (error) {
      alert("❌ Error al obtener producto: " + error.message);
      return;
    }
  
    // Mostrar panel y cambiar modo
    panel.classList.add("visible");
    panel.classList.remove("oculto");
    document.querySelector(".panel-contenido h3").textContent = "Editar Producto";
  
    modoEdicion = true;
    productoEditandoId = id;
  
    // Rellenar campos
    document.getElementById("form-producto").value = data.producto || "";
    document.getElementById("form-categoria").value = data.categoria || "";
    document.getElementById("form-subcategoria").value = data.subcategoria || "";
    document.getElementById("form-precio").value = data.precio || "";
    document.getElementById("form-descripcion").value = data.descripcion || "";
  
    poblarListasDesplegables(); // También rellenar datalists
}

async function eliminarProducto(id) {
    const confirmar = confirm("¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.");
  
    if (!confirmar) return;
  
    const { error } = await supabase.from("lista_precios").delete().eq("id", id);
  
    if (error) {
        mostrarAlertaTailwind("❌ Error al eliminar producto", "error");
      } else {
        mostrarAlertaTailwind("✅ Producto eliminado correctamente", "success");
        aplicarFiltros(); // o cargarProductos();
      }
}

// ╭────────────────────────────╮
// │ Exportar productos a Excel │
// ╰────────────────────────────╯
function exportarExcel() {
    if (todosLosProductos.length === 0) {
      alert("No hay productos para exportar.");
      return;
    }
  
    const productosFiltrados = document.querySelectorAll(".tarjeta-precio");
  
    // Obtener los datos visibles en pantalla
    const datos = Array.from(productosFiltrados).map(card => {
      const nombre = card.querySelector("h3")?.textContent || "";
      const categoria = card.querySelector(".categoria-tag")?.textContent.split(">")[0].trim();
      const subcategoria = card.querySelector(".categoria-tag")?.textContent.split(">")[1]?.trim();
      const descripcion = card.querySelector(".descripcion")?.textContent || "";
      const precio = card.querySelector(".precio")?.textContent.replace("$", "").trim();
  
      return {
        Producto: nombre,
        Categoría: categoria,
        Subcategoría: subcategoria || "",
        Descripción: descripcion,
        Precio: Number(precio.replace(/,/g, "")),
      };
    });
  
    // Crear hoja Excel
    const worksheet = XLSX.utils.json_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Precios");
  
    // Descargar archivo
    const ahora = new Date();
    const fechaHora = ahora.toISOString().slice(0,16).replace("T", "_").replace(":", "-");
    const nombreArchivo = `lista_precios_${fechaHora}.xlsx`;

    XLSX.writeFile(workbook, nombreArchivo);
}


// ╭────────────────────────────────────────────╮
// │ Modal carga de base de precios - Flujo 1/2 │
// ╰────────────────────────────────────────────╯

const modalCarga = document.getElementById("modal-carga-base");
const btnAbrirCarga = document.getElementById("btn-cargar-base");
const btnCerrarModal = document.getElementById("cerrar-modal-carga");
const btnDescargarPlantilla = document.getElementById("btn-descargar-plantilla");
const inputArchivo = document.getElementById("input-archivo-base");
const previewContenedor = document.getElementById("preview-container");
const tablaPreview = document.getElementById("tabla-preview");
const btnConfirmarCarga = document.getElementById("btn-confirmar-carga");

let datosCargadosPrecios = [];

// 🟡 Abrir modal
btnAbrirCarga.addEventListener("click", () => {
  modalCarga.classList.add("mostrar");
});

// 🔴 Cerrar modal
btnCerrarModal.addEventListener("click", () => {
  modalCarga.classList.remove("mostrar");
  tablaPreview.innerHTML = "";
  previewContenedor.classList.add("oculto");
  btnConfirmarCarga.classList.add("oculto");
  inputArchivo.value = "";
});

// 📥 Descargar plantilla
btnDescargarPlantilla.addEventListener("click", () => {
  const plantilla = [
    {
      producto: "Laptop ejemplo",
      precio: 9999,
      categoría: "Equipos",
      subcategoría: "Portátiles",
      descripción: "Laptop de referencia para pruebas"
    }
  ];
  const hoja = XLSX.utils.json_to_sheet(plantilla);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Plantilla");
  XLSX.writeFile(libro, "plantilla_base_precios.xlsx");
});

// 📂 Cargar archivo y mostrar vista previa
inputArchivo.addEventListener("change", async (event) => {
  const archivo = event.target.files[0];
  if (!archivo) return;

  const extension = archivo.name.split('.').pop().toLowerCase();
  let filas;

  try {
    if (extension === "csv") {
      const texto = await archivo.text();
      const libro = XLSX.read(texto, { type: "string" });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
    } else {
      const buffer = await archivo.arrayBuffer();
      const libro = XLSX.read(buffer, { type: "array" });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      filas = XLSX.utils.sheet_to_json(hoja, { header: 1 });
    }

    const headers = filas[0].map(h =>
      h.toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
    );

    const datos = filas.slice(1).map(fila => {
      const obj = {};
      headers.forEach((key, i) => {
        obj[key] = fila[i] ?? "";
      });
      return obj;
    });

    const columnasRequeridas = ["producto", "precio", "categoria", "subcategoria", "descripcion"];
    const claves = Object.keys(datos[0]);
    const faltantes = columnasRequeridas.filter(col => !claves.includes(col));
    if (faltantes.length > 0) {
      alert("❌ El archivo no tiene las columnas requeridas: " + faltantes.join(", "));
      return;
    }

    datosCargadosPrecios = datos;
    tablaPreview.innerHTML = generarTablaHTML(datos.slice(0, 15));
    previewContenedor.classList.remove("oculto");
    btnConfirmarCarga.classList.remove("oculto");

    } catch (err) {
  console.error("❌ Error al confirmar carga:", err);

  let mensaje = "❌ Hubo un error al subir la nueva base.";

  if (err && err.message) {
    mensaje += `\n\n🔎 ${err.message}`;
  }

  if (err && err.details) {
    mensaje += `\n📌 Detalles: ${err.details}`;
  }

  if (err && err.hint) {
    mensaje += `\n💡 Sugerencia: ${err.hint}`;
  }

  alert(mensaje);
}
});

// 🧾 Generador de tabla HTML para vista previa
function generarTablaHTML(datos) {
  if (!datos || datos.length === 0) return "<p>Sin datos para mostrar</p>";

  const headers = Object.keys(datos[0]);
  const thead = headers.map(h => `<th>${h}</th>`).join("");
  const filas = datos.map(row =>
    `<tr>${headers.map(h => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`
  ).join("");

  return `<table><thead><tr>${thead}</tr></thead><tbody>${filas}</tbody></table>`;
}

// ╭─────────────────────────────────────────────╮
// │ Confirmar carga: respaldo + reemplazo base  │
// ╰─────────────────────────────────────────────╯

btnConfirmarCarga.addEventListener("click", async () => {
  const confirmar = confirm("⚠️ ¿Estás seguro de reemplazar la base actual? Se descargará un respaldo antes de continuar.");
  if (!confirmar) return;

  try {
    await generarRespaldoActual(); // 💾 respaldo de Supabase
    await reemplazarBaseSupabase(datosCargadosPrecios); // 🔄 insertar nuevos datos

    alert("✅ Base de Precios cargada con éxito.");
    location.reload();
  } catch (err) {
    console.error("❌ Error al confirmar carga:", err);
    alert("Hubo un error al subir la nueva base. Intenta nuevamente.");
  }
});

// ╭─────────────────────────────╮
// │ Reemplazar Base en Supabase │
// ╰─────────────────────────────╯
async function reemplazarBaseSupabase(datos) {
    // Limpieza del array: eliminamos campos como "id" o "uuid"
    const datosLimpios = datos.map(({ producto, precio, categoria, subcategoria, descripcion }) => ({
      producto,
      precio,
      categoria,
      subcategoria,
      descripcion
    }));
  
    // 1️⃣ Eliminar registros anteriores
    const { error: deleteError } = await supabase.from("lista_precios").delete();
    if (deleteError) throw deleteError;
  
    // 2️⃣ Insertar los nuevos datos
    const { error: insertError } = await supabase.from("lista_precios").insert(datosLimpios);
    if (insertError) throw insertError;
}
  
  // ╭────────────────────────────────────────────╮
  // │ Generar respaldo actual de la base de datos │
  // ╰────────────────────────────────────────────╯
  async function generarRespaldoActual() {
    const { data, error } = await supabase.from("lista_precios").select("*");
  
    if (error || !data || data.length === 0) {
      console.warn("⚠️ No se pudo generar respaldo o no hay datos previos.");
      return;
    }
  
    const hoja = XLSX.utils.json_to_sheet(data);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Respaldo");
  
    const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const nombre = `lista_precios_respaldo_${fecha}.xlsx`;
    XLSX.writeFile(libro, nombre);
}

function mostrarToast(mensaje = "Cambios guardados") {
    const toast = document.getElementById("toast-notificacion");
    toast.textContent = mensaje;
    toast.classList.remove("hidden");
  
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
}

document.getElementById("btn-prev").addEventListener("click", () => {
    if (paginaActual > 1) {
      paginaActual--;
      aplicarFiltros(); // ✅ correcto
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
  
  document.getElementById("btn-next").addEventListener("click", () => {
    paginaActual++;
    aplicarFiltros(); // ✅ correcto
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  
  function actualizarControlesPaginacion() {
    const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
  
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
  
    document.getElementById("pagina-actual").textContent = `Página ${paginaActual} de ${totalPaginas}`;
  
    btnPrev.disabled = paginaActual <= 1;
    btnNext.disabled = paginaActual >= totalPaginas || totalPaginas === 0;
}

function mostrarAlertaTailwind(mensaje = "Acción completada ✅", tipo = "success") {
    const toast = document.getElementById("toast-alert");
    toast.textContent = mensaje;
  
    // Reset clases base
    toast.className = "fixed bottom-5 left-1/2 transform -translate-x-1/2 text-sm font-medium px-4 py-2 rounded-md shadow-md transition-opacity duration-300 z-50 pointer-events-none opacity-0";
  
    // Color por tipo
    if (tipo === "success") {
      toast.classList.add("bg-green-500", "text-white");
    } else if (tipo === "error") {
      toast.classList.add("bg-red-500", "text-white");
    } else if (tipo === "warning") {
      toast.classList.add("bg-yellow-400", "text-black");
    }
  
    // Mostrar con fade
    requestAnimationFrame(() => {
      toast.classList.remove("opacity-0", "pointer-events-none");
      toast.classList.add("opacity-100");
    });
  
    // Ocultar después de 3 segundos
    setTimeout(() => {
      toast.classList.remove("opacity-100");
      toast.classList.add("opacity-0", "pointer-events-none");
    }, 3000);
}