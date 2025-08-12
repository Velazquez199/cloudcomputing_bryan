const SUPABASE_URL = "https://vxqskfzzfcukmdgtcpmz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cXNrZnp6ZmN1a21kZ3RjcG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDUxMzQsImV4cCI6MjA3MDA4MTEzNH0.8zwRNdnR6zW1Yebo3H1d9ywtDySXalLk9D1pa_J0caw";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const listaEstudiantes = document.getElementById("lista-estudiantes");
const selectEstudiante = document.getElementById("estudiante");

// Variable para guardar ID del estudiante que estamos editando
let editandoId = null;

// Función para mostrar toast personalizado
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// Obtener usuario autenticado
async function getUser() {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    showToast("No estás autenticado.", "error");
    throw new Error("Usuario no autenticado");
  }
  return data.user;
}

// Agregar o guardar estudiante (según si estamos editando o no)
async function agregarEstudiante() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const clase = document.getElementById("clase").value.trim();

  if (!nombre || !correo || !clase) {
    showToast("Por favor, completa todos los campos.", "error");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(correo)) {
    showToast("Ingresa un correo válido.", "error");
    return;
  }

  try {
    const user = await getUser();

    // Validar correo duplicado si no estamos editando o si cambiamos correo
    if (!editandoId || (editandoId && correoCambiado(correo))) {
      const { data: existentes } = await client
        .from("estudiantes")
        .select("id")
        .eq("correo", correo);

      if (existentes && existentes.length > 0) {
        showToast("Ya existe un estudiante con ese correo.", "error");
        return;
      }
    }

    if (editandoId) {
      // Actualizar estudiante
      const { error } = await client
        .from("estudiantes")
        .update({ nombre, correo, clase })
        .eq("id", editandoId);

      if (error) {
        showToast("Error al actualizar: " + error.message, "error");
      } else {
        showToast("Estudiante actualizado correctamente ✅", "success");
        resetFormulario();
        cargarEstudiantes();
      }
    } else {
      // Insertar nuevo estudiante
      const { error } = await client.from("estudiantes").insert({
        nombre,
        correo,
        clase,
        user_id: user.id,
      });

      if (error) {
        showToast("Error al agregar: " + error.message, "error");
      } else {
        showToast("Estudiante agregado correctamente ✅", "success");
        resetFormulario();
        cargarEstudiantes();
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function correoCambiado(nuevoCorreo) {
  // Verificar si el correo que se está editando es diferente del correo actual para validar duplicados
  const correoActual = document.getElementById("correo").getAttribute("data-original") || "";
  return nuevoCorreo !== correoActual;
}

function resetFormulario() {
  document.getElementById("nombre").value = "";
  const correoInput = document.getElementById("correo");
  correoInput.value = "";
  correoInput.removeAttribute("data-original");
  document.getElementById("clase").value = "";
  editandoId = null;
  // Cambiar botón a "Agregar"
  const btn = document.querySelector("section.card button");
  btn.textContent = "Agregar";
  btn.onclick = agregarEstudiante;
}

// Cargar estudiantes y actualizar lista y select
async function cargarEstudiantes() {
  try {
    const { data, error } = await client
      .from("estudiantes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Error al cargar estudiantes: " + error.message, "error");
      return;
    }

    listaEstudiantes.innerHTML = "";
    selectEstudiante.innerHTML = '<option value="">--Selecciona--</option>';

    data.forEach((est) => {
      // Crear elemento para lista de estudiantes con botones editar y eliminar
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${est.nombre}</strong> (${est.correo}) - Clase: ${est.clase}
        <button class="edit-btn" onclick="editarEstudiante(${est.id}, '${est.nombre}', '${est.correo}', '${est.clase}')">Editar</button>
        <button class="delete-btn" onclick="eliminarEstudiante(${est.id})">Eliminar</button>
      `;
      listaEstudiantes.appendChild(li);

      // Crear opciones para select en subir archivos
      const option = document.createElement("option");
      option.value = est.id;
      option.textContent = est.nombre;
      selectEstudiante.appendChild(option);
    });
  } catch (e) {
    console.error(e);
  }
}

// Cargar estudiantes al inicio
cargarEstudiantes();

// Editar estudiante: llenar formulario y cambiar botón a guardar
function editarEstudiante(id, nombre, correo, clase) {
  document.getElementById("nombre").value = nombre;
  const correoInput = document.getElementById("correo");
  correoInput.value = correo;
  correoInput.setAttribute("data-original", correo); // Guardar correo original para validar cambio

  document.getElementById("clase").value = clase;

  editandoId = id;

  const btn = document.querySelector("section.card button");
  btn.textContent = "Guardar cambios";
  btn.onclick = agregarEstudiante;
}

// Eliminar estudiante con confirmación
async function eliminarEstudiante(id) {
  if (!confirm("¿Seguro que deseas eliminar este estudiante?")) return;

  try {
    const { error } = await client.from("estudiantes").delete().eq("id", id);

    if (error) {
      showToast("Error al eliminar estudiante: " + error.message, "error");
    } else {
      showToast("Estudiante eliminado ✅", "success");
      cargarEstudiantes();
    }
  } catch (e) {
    console.error(e);
  }
}

// Subir archivo vinculado a estudiante seleccionado
async function subirArchivo() {
  const archivoInput = document.getElementById("archivo");
  const archivo = archivoInput.files[0];
  const estudianteId = selectEstudiante.value;

  if (!estudianteId) {
    showToast("Selecciona un estudiante para asociar el archivo.", "error");
    return;
  }

  if (!archivo) {
    showToast("Selecciona un archivo primero.", "error");
    return;
  }

  if (archivo.size > 5 * 1024 * 1024) {
    showToast("El archivo no debe superar los 5 MB.", "error");
    return;
  }

  try {
    const user = await getUser();

    // Ruta para guardar archivo: carpeta usuario + estudiante + archivo
    const nombreRuta = `${user.id}/${estudianteId}/${archivo.name}`;

    // Verificar si archivo ya existe
    const { data: existentes } = await client.storage.from("tareas").list(`${user.id}/${estudianteId}`);

    if (existentes?.some((f) => f.name === archivo.name)) {
      const reemplazar = confirm("Ya existe un archivo con ese nombre. ¿Deseas reemplazarlo?");
      if (!reemplazar) return;
    }

    const { error } = await client.storage
      .from("tareas")
      .upload(nombreRuta, archivo, { cacheControl: "3600", upsert: true });

    if (error) {
      showToast("Error al subir archivo: " + error.message, "error");
    } else {
      showToast("Archivo subido correctamente ✅", "success");
      archivoInput.value = "";
      listarArchivos();
    }
  } catch (e) {
    console.error(e);
  }
}

// Listar archivos del usuario (puedes filtrar por estudiante si quieres)
async function listarArchivos() {
  try {
    const user = await getUser();

    const { data, error } = await client.storage
      .from("tareas")
      .list(`${user.id}`, { limit: 100 });

    const lista = document.getElementById("lista-archivos");
    lista.innerHTML = "";

    if (error) {
      lista.innerHTML = "<li>Error al listar archivos</li>";
      return;
    }

    // Mostrar archivos (si quieres, puedes filtrar por estudiante seleccionada)
    data.forEach(async (archivo) => {
      const { data: signedUrlData, error: signedUrlError } = await client.storage
        .from("tareas")
        .createSignedUrl(`${user.id}/${archivo.name}`, 60);

      if (signedUrlError) {
        console.error("Error al generar URL firmada:", signedUrlError.message);
        return;
      }

      const publicUrl = signedUrlData.signedUrl;
      const item = document.createElement("li");

      const esImagen = archivo.name.match(/\.(jpg|jpeg|png|gif)$/i);
      const esPDF = archivo.name.match(/\.pdf$/i);

      if (esImagen) {
        item.innerHTML = `
          <strong>${archivo.name}</strong><br>
          <a href="${publicUrl}" target="_blank">
            <img src="${publicUrl}" width="150" style="border:1px solid #ccc; margin:5px;" />
          </a>
        `;
      } else if (esPDF) {
        item.innerHTML = `
          <strong>${archivo.name}</strong><br>
          <a href="${publicUrl}" target="_blank">Ver PDF</a>
        `;
      } else {
        item.innerHTML = `<a href="${publicUrl}" target="_blank">${archivo.name}</a>`;
      }

      lista.appendChild(item);
    });
  } catch (e) {
    console.error(e);
  }
}

listarArchivos();

// Cerrar sesión
async function cerrarSesion() {
  try {
    const { error } = await client.auth.signOut();
    if (error) {
      showToast("Error al cerrar sesión: " + error.message, "error");
    } else {
      localStorage.removeItem("token");
      showToast("Sesión cerrada correctamente ✅", "success");
      setTimeout(() => window.location.href = "index.html", 1500);
    }
  } catch (e) {
    console.error(e);
  }
}
