document.addEventListener("DOMContentLoaded", async () => {
  const { decodeToken } = await import("./../auth/auth.js");
  const user = localStorage.getItem("user");
  const $titleRecipe = document.querySelector(".title-recipe");
  const $tableItemsTask = document.querySelector(".table-items-task");
  const $tableItemsTaskBody = $tableItemsTask.querySelector("tbody");
  let valueScale = 0;
  const socket = io("http://localhost:3004", {
    reconnection: true,
    timeout: 2000,
  });
  socket.on("connect", (io) => {
    console.log("Conectado al servidor Socket.IO");
  });

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
    if (data <= 5) {
      valueScale = 0;
    }
    console.log("Datos del puerto serie:", data);
    $btnConfirmIngredient.setAttribute("disabled", "true");
    document.querySelector(".current-weight").textContent = `${
      data - valueScale
    } G`;
    const $progresBar = document.querySelector(".progress-bar");

    let valueMax = $progresBar.getAttribute("aria-valuemax");
    let result = ((data - valueScale) * 100) / parseInt(valueMax);
    $progresBar.style.width = `${result}%`;
    $progresBar.textContent = `${Math.round(result)}%`;

    if (
      data - valueScale >
      parseInt(valueMax) + parseInt($progresBar.dataset.margintolerance)
    ) {
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
      data - valueScale <=
        parseInt(valueMax) + parseInt($progresBar.dataset.margintolerance) &&
      data - valueScale >=
        parseInt(valueMax) - parseInt($progresBar.dataset.margintolerance)
    ) {
      $progresBar.classList.remove("bg-warning", "bg-success", "bg-danger");
      $progresBar.classList.add("bg-success");
      $progresBar.setAttribute("data-currentValue", data - valueScale);
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
      if (parseInt(data.quantity) > 12000) {
        socket.emit("port", "COM3");
      } else {
        socket.emit("port", "COM4");
      }
      $progresBar.setAttribute("aria-valuemin", 0);
      $progresBar.setAttribute("aria-valuemax", data.quantity);
      $progresBar.setAttribute("data-taskId", data.taskid);
      $progresBar.setAttribute("data-ingredientId", data.ingredientid);
      $progresBar.setAttribute("data-itemId", data.itemid);
      $progresBar.setAttribute("data-marginTolerance", data.margintolerance);
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
        data.quantity > 12000 ? `Bascula de Piso` : `Bascula de Mesa`;
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
      event.target.setAttribute("disabled", "true");
      try {
        let pData = $progresBar.dataset;
        let response = await fetch(`http://localhost:3003/tasks-detail`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${dataToken.token}`,
          },
          body: JSON.stringify({
            taskId: parseInt(pData.taskid),
            ingredientId: parseInt(pData.ingredientid),
            weight: parseInt(pData.currentvalue),
            itemId: parseInt(pData.itemid),
            userId: dataToken?.sub,
          }),
        });

        if (response.ok) {
          let result = await response.json();
          if (result.message) {
            Swal.fire({
              title: `No hay "${result.lots[0].ingredient.name || ''}" disponible en inventario.`,
              text: result.message,
              html:`<div class="text-left">
                      <p class="p-0 m-0"><b>Cantidad disponible: </b>${Number(result.availableQuantity)} G</p>
                      <p class="p-0 m-0"><b>Cantidad requerida: </b>${Number(result.requiredQuantity)} G</p>
                    </div>`,
              icon: "warning",
            });
            event.target.removeAttribute("disabled");
            return
          }

          document.querySelector(".btn-close-ingredient").click();
          setTimeout(() => {
            document.querySelector(`.btn-detail-${pData.taskid}`).click();
          }, 300);
          valueScale = valueScale + parseInt(pData.currentvalue);
          socket.emit("port", "COM0");
          event.target.removeAttribute("disabled");
        } else {
          console.error("Error en la respuesta:", response.statusText);
        }
      } catch (error) {
        console.error("Error en la solicitud:", error);
        event.target.removeAttribute("disabled");
      } finally {
        event.target.removeAttribute("disabled");
      }
    }
  });

  let recipe = {};

  const startDate = document.querySelector(".start-date");
  const endDate = document.querySelector(".end-date");
  // Obtén la fecha actual
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Añade el 0 si es necesario
  const day = String(today.getDate()).padStart(2, "0"); // Añade el 0 si es necesario

  // Formato en "YYYY-MM-DD" para campos de tipo date
  const formattedDate = `${year}-${month}-${day}`;
  startDate.value = formattedDate;
  endDate.value = formattedDate;
  await loadDatatable(formattedDate, `${year}-${month}-${today.getDate() + 1}`);
  document.addEventListener("change", async (event) => {
    if (event.target == startDate || event.target == endDate) {
      if (startDate.value != "" && endDate.value != "") {
        await loadDatatable(startDate.value, endDate.value);
      }
    }
  });

  // Load task
  async function loadDatatable(startDate, endDate) {
    // Check if the table has already been initialized
    if ($.fn.dataTable.isDataTable(".table-tasks")) {
      // If it has been initialized, destroy the previous instance
      $(".table-tasks").DataTable().destroy();
      $(".table-tasks").empty(); // Optional: Clear the table body
    }
    $(".table-tasks").DataTable({
      ajax: {
        url: `http://localhost:3003/tasks/${startDate}/${endDate}`,
        type: "GET",
        headers: {
          Authorization: `Bearer ${dataToken.token}`, // Enviar el token en el encabezado de autorización
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
          Authorization: `Bearer ${dataToken.token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        $titleRecipe.textContent = `${data.product.name.toUpperCase()}`;
        recipe = data;
        console.log(data);
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
                        <td class="${result ? `bg-success text-white` : ``}">${
            result ? result?.user?.name : ``
          }</td>
                        <td class="text-center ${result ? `bg-success` : ``}">
                        ${
                          result
                            ? `<button class="btn text-white border-white btn-sm">Pesado</button>`
                            : `<button class="btn btn-primary btn-sm btn-scale" data-taskId="${data.id}" data-itemId="${item?.id}" data-ingredientId="${item.ingredient.id}" data-ingredientName="${item.ingredient.name}" data-marginTolerance="${item.ingredient.marginTolerance}" data-quantity="${item.cuantity}" data-controlUnit="${item.controlUnit}">Pesar</button>`
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
            $progresBar.setAttribute(
              "data-marginTolerance",
              element.ingredient.marginTolerance
            );
            $progresBar.setAttribute("aria-valuemin", 0);
            $progresBar.setAttribute("aria-valuemax", element.cuantity);
            $progresBar.setAttribute("data-taskId", id);
            $progresBar.setAttribute(
              "data-ingredientId",
              element.ingredient.id
            );
            $progresBar.setAttribute("data-itemId", element.id);
            $progresBar.style.width = `0%`;
            
            document.querySelector(".title-modal-product").textContent =
            data.product.name;
            
            document.querySelector(".production-lots").innerHTML = `
                <div class="row mb-0">
                  <div class="col-md-4"><h4>Lotes afectados</h4></div>
                  <div class="col-md-4"><h4>Fecha Vencimiento</h4></div>
                  <div class="col-md-4"><h4>Cantidad Disponible</div>
                </div>`;
            element.ingredient.stock.map((lot) => {
              document.querySelector(".production-lots").innerHTML += `
                <div class="row">
                  <div class="col-md-4 my-0 py-0"><h4 class="my-0 py-1"><span class="text-muted">${lot.batchNumber}</span></h4></div>
                  <div class="col-md-4 my-0 py-0"><h4 class="my-0 py-1"><span class="text-muted">${lot.expirationDate}</span></h4></div>
                  <div class="col-md-4 my-0 py-0"><h4 class="my-0 py-1"><span class="text-muted">${lot.quantity}</span></h4></div>
                </div>`
            })
            
            document.querySelector(".title-modal-ingredient").textContent =
              element.ingredient.name;
            document.querySelector(".current-weight").textContent = 0;
            document.querySelector(
              ".objective-weight"
            ).textContent = `${element.cuantity} ${element.controlUnit}`;
            document.querySelector(".title-scale").textContent =
              element.cuantity > 12000 ? `Báscula de Piso` : `Báscula de Mesa`;
            if (element.ingredient.id == 9) {
              $progresBar.setAttribute("data-currentValue", element.cuantity);
              $btnConfirmIngredient.removeAttribute("disabled");
            } else {
              $btnConfirmIngredient.setAttribute("disabled", "true");
            }

            if (parseInt(element.cuantity) > 12000) {
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
