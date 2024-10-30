document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  const $titleRecipe = document.querySelector(".title-recipe");
  const $tableItemsTask = document.querySelector(".table-items-task");
  const $tableItemsTaskBody = $tableItemsTask.querySelector("tbody");
  const socket = io("http://localhost:3004", {
    reconnection: true,
    timeout: 2000,
  });
  socket.on("connect", (io) => {
    console.log("Conectado al servidor Socket.IO");
  });
  // const { loadDatatable, loadOneTask } = await import("./module.js?16");
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

  socket.on("serialData", (data) => {
    data = data.match(/\d+/g)?.join("");
    console.log("Datos del puerto serie:", data);
    $btnConfirmIngredient.setAttribute("disabled", "true");
    document.querySelector(".current-weight").textContent = `${data} G`;
    const $progresBar = document.querySelector(".progress-bar");

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

    if ($progresBar.dataset.ingredientid == 9) {
      $progresBar.setAttribute("data-currentValue", valueMax);
      $btnConfirmIngredient.removeAttribute("disabled");
    } else if (
      data <= parseInt(valueMax) + 10 &&
      data >= parseInt(valueMax) - 10
    ) {
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
      $btnConfirmIngredient.setAttribute("disabled", "true");
      if (parseInt(data.quantity) > 18000) {
        socket.emit("port", "COM3");
      } else {
        socket.emit("port", "COM4");
      }
      $progresBar.setAttribute("aria-valuemin", 0);
      $progresBar.setAttribute("aria-valuemax", data.quantity);
      $progresBar.setAttribute("data-taskId", data.taskid);
      $progresBar.setAttribute("data-ingredientId", data.ingredientid);
      $progresBar.setAttribute("data-itemId", data.itemid);
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
        $progresBar.setAttribute("data-currentValue", data.quantity);
        $btnConfirmIngredient.removeAttribute("disabled");
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
            itemId: parseInt(pData.itemid),
          }),
        });

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
    }
  });
  await loadDatatable();

  let recipe = {};

  // Load task
  async function loadDatatable() {
    $(".table-tasks").DataTable({
      ajax: {
        url: "http://localhost:3003/tasks",
        type: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // Enviar el token en el encabezado de autorización
          "Content-Type": "application/json",
        },
        dataSrc: function (json) {
          return json; // En caso de que el JSON devuelto sea un array de objetos
        },
        error: function (xhr, error, thrown) {
          console.error("Error al obtener datos protegidos:", error);
        },
      },
      columns: [
        { data: "productionBatch" },
        { data: "product.name" },
        {
          data: "endDate", // Columna para fecha de creación
          render: function (data, type, row) {
            return `<button class="btn btn-sm ${
              row.status == "Finalizada" ? "btn-success" : "btn-primary"
            }">${row.status}</button>`;
          },
        },
        {
          data: "startDate", // Columna para fecha de creación
          render: function (data) {
            return data.substr(0, 10); // Mostrar solo la fecha en formato 'YYYY-MM-DD'
          },
        },
        {
          data: "endDate", // Columna para fecha de creación
          render: function (data) {
            return data.substr(0, 10); // Mostrar solo la fecha en formato 'YYYY-MM-DD'
          },
        },
        {
          data: "endDate", // Columna para fecha de creación
          render: function (data, type, row) {
            return `<button class="btn btn-primary btn-detail btn-detail-${row.id} btn-sm" data-id="${row.id}" data-name="${row.product?.name}">Iniciar</button>`;
          },
        },
      ],
      language: {
        decimal: "",
        emptyTable: "No hay datos disponibles en la tabla",
        info: "Mostrando _START_ a _END_ de _TOTAL_ entradas",
        infoEmpty: "Mostrando 0 a 0 de 0 entradas",
        infoFiltered: "(filtrado de _MAX_ entradas totales)",
        infoPostFix: "",
        thousands: ",",
        lengthMenu: "Mostrar _MENU_ entradas",
        loadingRecords: "Cargando...",
        processing: "Procesando...",
        search: "Buscar:",
        zeroRecords: "No se encontraron resultados",
        paginate: {
          first: "Primero",
          last: "Último",
          next: "Siguiente",
          previous: "Anterior",
        },
        aria: {
          sortAscending:
            ": Activar para ordenar la columna de forma ascendente",
          sortDescending:
            ": Activar para ordenar la columna de forma descendente",
        },
      },
    });
  }

  // Función para cargar las recetas desde el backend
  async function loadOneTask(id) {
    try {
      const response = await fetch(`http://localhost:3003/tasks/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        $titleRecipe.textContent = `${data.product.name.toUpperCase()}`;
        recipe = data;

        // Detail
        let itemsHtml = "";
        data.product.items.map((item) => {
          let result = data.details.find((ing) => {
            return (
              item.ingredient.id === ing?.ingredient?.id &&
              item?.id === ing?.itemId
            );
          });

          itemsHtml += `
                    <tr class="ingredient-row">
                        <td class="${result ? `bg-success text-white` : ``}">${
            item.ingredient.name
          }</td>
                        <td class="${result ? `bg-success text-white` : ``}">${
            item.cuantity
          }</td>
                        <td class="${result ? `bg-success text-white` : ``}">${
            item.controlUnit
          }</td>
                        <td class="text-center ${result ? `bg-success` : ``}">
                        ${
                          result
                            ? `<button class="btn text-white border-white btn-sm">Pesado</button>`
                            : `<button class="btn btn-primary btn-sm btn-scale" data-taskId="${data.id}" data-itemId="${item?.id}" data-ingredientId="${item.ingredient.id}" data-ingredientName="${item.ingredient.name}" data-quantity="${item.cuantity}" data-controlUnit="${item.controlUnit}">Pesar</button>`
                        }
                        </td>
                    </tr>`;
        });

        if (data?.details.length == data?.product?.items.length) {
          const $btnTaskSave = document.querySelector(".btn-task-save");
          $btnTaskSave.removeAttribute("hidden");
        }
        let ingredients = data.product?.items;
        for (let index = 0; index < ingredients.length; index++) {
          let element = ingredients[index];
          let result = data.details.find((ing) => {
            return (
              element.ingredient.id === ing?.ingredient?.id &&
              element?.id === ing?.itemId
            );
          });

          if (!result) {
            $progresBar.setAttribute("aria-valuemin", 0);
            $progresBar.setAttribute("aria-valuemax", element.cuantity);
            $progresBar.setAttribute("data-taskId", id);
            $progresBar.setAttribute(
              "data-ingredientId",
              element.ingredient.id
            );
            $progresBar.setAttribute("data-itemId", element.id);
            $progresBar.style.width = `0%`;
            document.querySelector(".title-modal-ingredient").textContent =
              element.ingredient.name;
            document.querySelector(".current-weight").textContent = 0;
            document.querySelector(
              ".objective-weight"
            ).textContent = `${element.cuantity} ${element.controlUnit}`;
            document.querySelector(".title-scale").textContent =
              element.cuantity > 1000 ? `Bascula de Piso` : `Bascula de Mesa`;
            if (element.ingredient.id == 9) {
              $progresBar.setAttribute("data-currentValue", element.cuantity);
              $btnConfirmIngredient.removeAttribute("disabled");
            } else {
              // $btnConfirmIngredient.setAttribute("disabled", "true");
            }
            if (parseInt(element.quantity) > 18000) {
              socket.emit("port", "COM3");
            } else {
              socket.emit("port", "COM4");
            }
            $("#detailTaskModal").modal("hide");
            $("#igredientModal").modal("show");
            break;
          }
        }
        $tableItemsTaskBody.innerHTML = itemsHtml;
      }
    } catch (error) {
      console.error("Error al cargar tarea:", error);
    }
  }
});
