document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  const { loadDatatable, loadOneTask } = await import("./module.js");
  const { decodeToken } = await import("./../auth/auth.js");
  const $progresBar = document.querySelector(".progress-bar");
  const $btnConfirmIngredient = document.querySelector(
    ".btn-confirm-ingredient"
  );
  const $btnTaskSave = document.querySelector(".btn-task-save");
  const dataToken = decodeToken();
  if (!dataToken.token) {
    window.location.href = "../";
  }
  // Mostrar/ocultar funcionalidades basadas en los roles
  if (dataToken.role == "admin" || dataToken.role == "superadmin") {
    document.querySelector(".slide-menu-admin").style.display = "block";
    document.querySelector(".slide-menu-user").style.display = "none";
  } else {
    document.querySelector(".slide-menu-admin").style.display = "none";
    document.querySelector(".slide-menu-user").style.display = "block";
  }

  const $proUserName = document.querySelector(".pro-username");
  $proUserName.textContent = user;
  const socket = io("http://localhost:3004", {
    reconnection: true,
    timeout: 2000,
  });

  socket.on("connect", (io) => {
    console.log("Conectado al servidor Socket.IO");
  });

  socket.on("serialData", (data) => {
    data = data.match(/\d+/g)?.join("");
    console.log("Datos del puerto serie:", data);
    $btnConfirmIngredient.setAttribute("disabled", "true");
    document.querySelector(".current-weight").textContent = `${data} G`;
    const $progresBar = document.querySelector(".progress-bar");
    console.log($progresBar.datase);

    let valueMax = $progresBar.getAttribute("aria-valuemax");
    let result = (data * 100) / parseInt(valueMax);
    $progresBar.style.width = `${result}%`;
    $progresBar.textContent = `${Math.round(result)}%`;

    if (data > parseInt(valueMax) + 10) {
      $progresBar.classList.remove("bg-warning", "bg-success", "bg-danger");
      $progresBar.classList.add("bg-danger");
    }
    if (result < 99) {
      $progresBar.classList.remove("bg-warning", "bg-success", "bg-danger");
      $progresBar.classList.add("bg-warning");
    }
    if ((data <= parseInt(valueMax) + 10 && data >= parseInt(valueMax) - 10) || $progresBar.dataset.ingredientid == 9) {
      $progresBar.classList.remove("bg-warning", "bg-success", "bg-danger");
      $progresBar.classList.add("bg-success");
      $progresBar.setAttribute("data-currentValue", data);
      $btnConfirmIngredient.removeAttribute("disabled");
    }
  });

  socket.on("disconnect", () => {
    console.log("Desconectado del servidor Socket.IO");
  });

  // Click Event
  document.addEventListener("click", async (event) => {
    let data = event.target.dataset;
    if (event.target.matches(".btn-detail")) {
      $btnTaskSave.setAttribute("data-taskId", data.id);
      $btnTaskSave.setAttribute("hidden", "true");
      await loadOneTask(data.id);
      $("#detailTaskModal").modal("show");
    } else if (event.target.matches(".btn-scale")) {
      if (parseInt(data.quantity) > 18000) {
        socket.emit("port", "COM3");
      } else {
        socket.emit("port", "COM4");
      }
      $progresBar.setAttribute("aria-valuemin", 0);
      $progresBar.setAttribute("aria-valuemax", data.quantity);
      $progresBar.setAttribute("data-taskId", data.taskid);
      $progresBar.setAttribute("data-ingredientId", data.ingredientid);
      $progresBar.style.width = `0%`;
      $("#detailTaskModal").modal("hide");
      $("#igredientModal").modal("show");
      document.querySelector(".title-modal-ingredient").textContent =
        data.ingredientname;
      document.querySelector(".current-weight").textContent = 0;
      document.querySelector(
        ".objective-weight"
      ).textContent = `${data.quantity} ${data.controlunit}`;
      document.querySelector(".title-scale").textContent =
        data.quantity > 18000 ? `Bascula de Piso` : `Bascula de Mesa`;
      if (data.ingredientid == 9) {
        $btnConfirmIngredient.removeAttribute("disabled");
        $btnConfirmIngredient.click();
      }
    } else if (event.target.matches(".btn-close-ingredient")) {
      $("#detailTaskModal").modal("show");
      $("#igredientModal").modal("hide");
    } else if (event.target.matches(".btn-task-save")) {
      await fetch(`http://localhost:3003/tasks/${data.taskid}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${dataToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Finalizada" }),
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
          throw new Error("No autorizado");
        })
        .then((data) => {
          if (data) {
            $("#detailTaskModal").modal("hide");
            $(".table-tasks").DataTable().ajax.reload();
            return;
          } else {
            Swal.fire({
              title: "Ops...",
              text: "Ocurrió un error, intente nuevamente",
              icon: "warning",
            });
          }
        });
    } else if (event.target.matches(".btn-confirm-ingredient")) {
      try {
        let pData = $progresBar.dataset;
        let response = await fetch(`http://localhost:3003/tasks-detail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            taskId: parseInt(pData.taskid),
            ingredientId: parseInt(pData.ingredientid),
            weight: parseInt(pData.currentvalue),
          }),
        });
        console.log(response);

        if (response.ok) {
          let result = await response.json();
          document.querySelector(".btn-close-ingredient").click();
          setTimeout(() => {
            document.querySelector(`.btn-detail-${pData.taskid}`).click();
          }, 200);
        } else {
          console.error("Error en la respuesta:", response.statusText);
        }
      } catch (error) {
        console.error("Error en la solicitud:", error);
      }
      // $("#detailTaskModal").modal("show");
      // $("#igredientModal").modal("hide");
    }
  });
  await loadDatatable();
});
