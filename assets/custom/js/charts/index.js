document.addEventListener("DOMContentLoaded", async () => {
  const { decodeToken } = await import("./../auth/auth.js");
  const dataToken = decodeToken();
  if (dataToken.token) {
    await loadDatatable();
    // Mostrar/ocultar funcionalidades basadas en los roles
    if (dataToken.role == "admin" || dataToken.role == "superadmin") {
      document.querySelector(".slide-menu-admin").style.display = "block";
      document.querySelector(".slide-menu-user").style.display = "none";
    } else {
      document.querySelector(".slide-menu-admin").style.display = "none";
      document.querySelector(".slide-menu-user").style.display = "block";
    }
  } else {
    window.location.href = "../";
  }
});