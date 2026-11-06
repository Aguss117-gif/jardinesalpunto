const WHATSAPP_NUMBER = "5491167099550"; 
// Reemplazá las comillas vacías por tu número con código de país.
// Ejemplo de formato: 54911XXXXXXXX. No uses +, espacios ni guiones.

const menuButton = document.getElementById("menuButton");
const nav = document.getElementById("nav");

menuButton.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

nav.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

document.getElementById("year").textContent = new Date().getFullYear();

const whatsapp = document.getElementById("contactWhatsApp");
const message = encodeURIComponent(
  "Hola, vi la página de JardinesAlpunto y quisiera consultar por un presupuesto."
);

if (/^\d{10,15}$/.test(WHATSAPP_NUMBER)) {
  whatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  whatsapp.target = "_blank";
  whatsapp.rel = "noopener noreferrer";
} else {
  whatsapp.href = "#contacto";
  whatsapp.addEventListener("click", event => {
    event.preventDefault();
    alert("Configurá tu número de WhatsApp en el archivo public/app.js.");
  });
}

async function loadGallery() {
  const gallery = document.getElementById("gallery");

  try {
    const response = await fetch("/api/gallery");
    if (!response.ok) throw new Error("No se pudo cargar la galería.");

    const items = await response.json();
    gallery.replaceChildren();

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty-gallery";
      empty.textContent = "Próximamente vas a encontrar acá nuestros trabajos.";
      gallery.appendChild(empty);
      return;
    }

    items.forEach(item => {
      const card = document.createElement("article");
      card.className = "gallery-card";

      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.title || "Trabajo de jardinería";
      img.loading = "lazy";

      const caption = document.createElement("div");
      caption.className = "gallery-caption";
      caption.textContent = item.title || "Trabajo realizado";

      card.append(img, caption);
      gallery.appendChild(card);
    });
  } catch (error) {
    console.error(error);
  }
}

loadGallery();
