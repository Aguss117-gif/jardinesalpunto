const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const uploadForm = document.getElementById("uploadForm");
const uploadMessage = document.getElementById("uploadMessage");
const adminGallery = document.getElementById("adminGallery");

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Ocurrió un error.");
  }

  return data;
}

function showDashboard(authenticated) {
  loginSection.hidden = authenticated;
  dashboard.hidden = !authenticated;
  if (authenticated) refreshGallery();
}

async function checkSession() {
  try {
    const data = await api("/api/session");
    showDashboard(data.authenticated);
  } catch {
    showDashboard(false);
  }
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginMessage.textContent = "Verificando acceso...";

  try {
    await api("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: document.getElementById("password").value
      })
    });

    loginForm.reset();
    loginMessage.textContent = "";
    showDashboard(true);
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

uploadForm.addEventListener("submit", async event => {
  event.preventDefault();
  uploadMessage.textContent = "Subiendo imagen...";

  try {
    const formData = new FormData(uploadForm);
    await api("/api/gallery", {
      method: "POST",
      body: formData
    });

    uploadForm.reset();
    uploadMessage.textContent = "Imagen publicada correctamente.";
    await refreshGallery();
  } catch (error) {
    uploadMessage.textContent = error.message;
  }
});

async function refreshGallery() {
  adminGallery.replaceChildren();

  try {
    const items = await api("/api/gallery");

    if (!items.length) {
      adminGallery.textContent = "Todavía no publicaste ningún trabajo.";
      return;
    }

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "admin-item";

      const image = document.createElement("img");
      image.src = item.url;
      image.alt = item.title || "Trabajo";
      image.loading = "lazy";

      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.title || "Trabajo realizado";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Eliminar foto";

      remove.addEventListener("click", async () => {
        if (!confirm("¿Querés eliminar esta foto de la galería?")) return;

        try {
          await api("/api/gallery/" + encodeURIComponent(item.id), {
            method: "DELETE"
          });
          await refreshGallery();
        } catch (error) {
          alert(error.message);
        }
      });

      content.append(title, document.createElement("br"), remove);
      card.append(image, content);
      adminGallery.appendChild(card);
    });
  } catch (error) {
    adminGallery.textContent = error.message;
  }
}

document.getElementById("logoutButton").addEventListener("click", async () => {
  try {
    await api("/api/logout", { method: "POST" });
    showDashboard(false);
  } catch (error) {
    alert(error.message);
  }
});

checkSession();
