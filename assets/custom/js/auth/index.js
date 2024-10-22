const $messageLogin = document.querySelector(".message-login");
document.addEventListener("submit", async (e) => {
  e.preventDefault(); // Prevenir el envío del formulario

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(
      "https://gestor.andar.com.co/pesi/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }), // Enviar credenciales
      }
    );

    const data = await response.json();
    if (response.status === 201 && data.access_token) {
      localStorage.setItem("token", data.access_token); // Almacenar el token
      localStorage.setItem("user", data.user.name); // Almacenar el usuario
      setTimeout(() => {
        console.log(data);
      }, 10000);
      window.location.href = "pages/home.html"; // Redirigir a una página protegida
    } else {
      $messageLogin.removeAttribute("hidden");
    }
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
  }
});

function logout() {
  localStorage.removeItem("token");
  window.location.hash = "#/login";
}

async function fetchProtectedData(route) {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.hash = "#/login";
    return;
  }

  const response = await fetch(`https://gestor.andar.com.co/pesi${route}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.ok) {
    return await response.json();
  } else {
    window.location.hash = "#/login";
  }
}
