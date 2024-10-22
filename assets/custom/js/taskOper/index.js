document.addEventListener("DOMContentLoaded", async () => {
  const { loadDatatable, loadOneTask } = await import("./module.js");
  const { decodeToken } = await import("./../auth/auth.js");
  const $progresBar = document.querySelector(".progress-bar");
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
      // console.log(data);
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
    }
  });
  await loadDatatable();
});
