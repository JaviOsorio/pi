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

  // Click Event
  document.addEventListener("click", async (event) => {
    let data = event.target.dataset;
    if (event.target.matches(".btn-detail")) {
      $btnTaskSave.setAttribute("data-taskId", data.id);
      $btnTaskSave.setAttribute("hidden", "true");
      await loadOneTask(data.id);
      $("#detailTaskModal").modal("show");
    } else if (event.target.matches(".btn-scale")) {
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
        data.quantity > 2000 ? `Bascula de Piso` : `Bascula de Mesa`;
    } else if (event.target.matches(".btn-close-ingredient")) {
      $("#detailTaskModal").modal("show");
      $("#igredientModal").modal("hide");
    } else if (event.target.matches(".btn-task-save")) {
      await fetch(`https://gestor.andar.com.co/pesi/tasks/${data.taskid}`, {
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
      console.log(event.target);

      try {
        let pData = $progresBar.dataset;
        let response = await fetch(
          `https://gestor.andar.com.co/pesi/tasks-detail`,
          {
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
          }
        );
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
