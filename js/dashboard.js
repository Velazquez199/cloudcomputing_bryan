const SUPABASE_URL = "https://vxqskfzzfcukmdgtcpmz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4cXNrZnp6ZmN1a21kZ3RjcG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDUxMzQsImV4cCI6MjA3MDA4MTEzNH0.8zwRNdnR6zW1Yebo3H1d9ywtDySXalLk9D1pa_J0caw";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ✅ Toast personalizado
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ✅ Agregar estudiante
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

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    showToast("No estás autenticado.", "error");
    return;
  }

  const { data: existentes } = await client
    .from("estudiantes")
    .select("id")
    .eq("correo", correo);

  if (existentes && existentes.length > 0) {
    showToast("Ya existe un estudiante con ese correo.", "error");
    return;
  }

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
    // 🧹 Limpiar campos
    document.getElementById("nombre").value = "";
    document.getElementById("correo").value = "";
    document.getElementById("clase").value = "";
    cargarEstudiantes();
  }
}

// ✅ Cargar estudiantes
async function cargarEstudiantes() {
  const { data, error } = await client
    .from("estudiantes")
    .select("*")
    .order("created_at", { ascending: false });

  const lista = document.getElementById("lista-estudiantes");
  lista.innerHTML = "";

  if (error) {
    showToast("Error al cargar estudiantes: " + error.message, "error");
    return;
  }

  data.forEach((est) => {
    const item = document.createElement("li");
    item.textContent = `${est.nombre} (${est.clase})`;
    lista.appendChild(item);
  });
}

cargarEstudiantes();

// ✅ Subir archivo
async function subirArchivo() {
  const archivoInput = document.getElementById("archivo");
  const archivo = archivoInput.files[0];

  if (!archivo) {
    showToast("Selecciona un archivo primero.", "error");
    return;
  }

  if (archivo.size > 5 * 1024 * 1024) {
    showToast("El archivo no debe superar los 5 MB.", "error");
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    showToast("Sesión no válida.", "error");
    return;
  }

  const nombreRuta = `${user.id}/${archivo.name}`;

  const { data: existentes } = await client.storage
    .from("tareas")
    .list(user.id);

  if (existentes?.some((f) => f.name === archivo.name)) {
    const reemplazar = confirm("Ya existe un archivo con ese nombre. ¿Deseas reemplazarlo?");
    if (!reemplazar) return;
  }

  const { error } = await client.storage
    .from("tareas")
    .upload(nombreRuta, archivo, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    showToast("Error al subir: " + error.message, "error");
  } else {
    showToast("Archivo subido correctamente ✅", "success");
    document.getElementById("archivo").value = ""; // 🧹 Limpiar input
    listarArchivos();
  }
}

// ✅ Listar archivos
async function listarArchivos() {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    showToast("Sesión no válida.", "error");
    return;
  }

  const { data, error } = await client.storage
    .from("tareas")
    .list(`${user.id}`, { limit: 20 });

  const lista = document.getElementById("lista-archivos");
  lista.innerHTML = "";

  if (error) {
    lista.innerHTML = "<li>Error al listar archivos</li>";
    return;
  }

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
}

listarArchivos();

// ✅ Cerrar sesión
async function cerrarSesion() {
  const { error } = await client.auth.signOut();

  if (error) {
    showToast("Error al cerrar sesión: " + error.message, "error");
  } else {
    localStorage.removeItem("token");
    showToast("Sesión cerrada correctamente ✅", "success");
    setTimeout(() => window.location.href = "index.html", 1500);
  }
}
