document.addEventListener("DOMContentLoaded", async () => {
  const { decodeToken } = await import("./../auth/auth.js");
  const dataToken = decodeToken();
  if (dataToken.token) {
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
  const $tableProducts = document.querySelector(".table-tasks");
  const $taskForm = document.querySelector(".recipe-form");
  const $titleRecipe = document.querySelector(".title-recipe");
  const $tableItemsTask = document.querySelector(".table-items-task");
  const $tableItemsTaskBody = $tableItemsTask.querySelector("tbody");
  const date = new Date();
  $taskForm.productionBatch.value = `${date.getFullYear()}${
    date.getMonth() + 1
  }${date.getDate()}`;
  const $proUserName = document.querySelector(".pro-username");
  const user = localStorage.getItem("user");
  $proUserName.textContent = user;

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

  // Event clcik
  document.addEventListener("click", async (event) => {
    let data = event.target.dataset;
    if (event.target.matches(".btn-modal-recipe")) {
      $taskForm.reset();
      $taskForm.id.value = "";
      $taskForm.productionBatch.value = `${date.getFullYear()}${
        date.getMonth() + 1
      }${date.getDate()}`;
      $("#taskModal").modal("show");
    } else if (event.target.matches(".btn-delete")) {
      Swal.fire({
        title: "Estas segur@",
        text: `Eliminar ${data?.name}`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        cancelButtonText: "Cancelar",
        confirmButtonText: "Si, Eliminar",
      }).then(async (result) => {
        if (result.isConfirmed) {
          await remove(data?.id);
        }
      });
    } else if (event.target.matches(".btn-edit")) {
      $taskForm.id.value = data?.id;
      $taskForm.productId.value = data?.productid;
      $taskForm.productionBatch.value = data?.productionbatch;
      $taskForm.startDate.value = data?.startdate;
      $taskForm.endDate.value = data?.enddate;
      $taskForm.repetition.value = data?.repetition;
      $("#taskModal").modal("show");
    } else if (event.target.matches(".btn-detail")) {
      await loadOneTask(data.id);
      $("#detailTaskModal").modal("show");
    }
  });

  // submit
  document.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.target === $taskForm) {
      const data = new FormData(event.target);
      const jsonData = {};
      data.forEach((value, key) => {
        // Convierte a número si es necesario
        if (
          key === "repetition" ||
          key === "multiplicity" ||
          key === "productId"
        ) {
          jsonData[key] = parseFloat(value);
        } else {
          jsonData[key] = value;
        }
      });
      delete jsonData["id"];

      await fetch(
        `http://localhost:3003/tasks${
          $taskForm.id.value != "" ? `/${$taskForm.id.value}` : ""
        }`,
        {
          method: $taskForm.id.value != "" ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${dataToken.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jsonData),
        }
      )
        .then(async (response) => {
          if (response.ok) {
            return response.json();
          }
          // Captura el error y convierte el cuerpo a JSON para obtener detalles
          const errorData = await response.json();
          throw new Error(errorData.message || "No autorizado");
        })
        .then((data) => {
          if (data) {
            $("#taskModal").modal("hide");
            event.target.reset();
            event.target.id.value = "";
            $taskForm.productionBatch.value = `${date.getFullYear()}${
              date.getMonth() + 1
            }${date.getDate()}`;
            Swal.fire({
              title: "Proceso exitoso",
              // text: "Receta creada",
              icon: "success",
            });
            setTimeout(() => {
              $(".table-tasks").DataTable().ajax.reload();
            }, 4000);
            return;
          } else {
            Swal.fire({
              title: "Ops...",
              text: "Ocurrió un error, intente nuevamente",
              icon: "warning",
            });
          }
        })
        .catch((error) => {
          // Mensaje del error personalizado
          Swal.fire({
            title: "Ops...",
            text: error.message || "Ocurrió un error desconocido",
            icon: "error",
          });
        });
    }
  });

  // Load data
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
        // { data: 'id' },
        { data: "productionBatch" },
        { data: "product.name" },
        {
          data: "status", // Columna para fecha de creación
          render: function (data, type, row) {
            return `<button class="btn btn-sm ${
              row.status == "Finalizada" ? "btn-success" : "btn-primary"
            }">${row.status}</button>`;
          },
        },
        { data: "repetition" },
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
          data: null, // Columna para botones de acción
          className: "text-center",
          render: function (data, type, row) {
            // Crear botones Eliminar y Editar
            return `
                          <i class="fas fa-eye bg-info text-white btn-xs me-2 btn-detail" data-id="${row.id}" data-name="${row.product?.name}"></i>
                          `;
          },
        },
        {
          data: null, // Columna para botones de acción
          className: "text-center",
          render: function (data, type, row) {
            // Crear botones Eliminar y Editar
            console.log(row);
            
            return `
                          <i class="text-center fas fa-trash bg-danger text-white btn-xs btn-delete" data-id="${
                            row.id
                          }" data-name="${row.product?.name}"></i>
                          <i class="text-center fas fa-edit bg-warning text-white btn-xs btn-edit"
                              data-id="${row.id}"
                              data-productid="${row.product.id}"
                              data-name="${row.product.name}"
                              data-startDate="${row.startDate.substr(0, 10)}"
                              data-endDate="${row.endDate.substr(0, 10)}"
                              data-repetition="${row.repetition}"
                              data-productionbatch="${row.productionBatch}"
                          ></i>
                      `;
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

  async function remove(id) {
    await fetch(`http://localhost:3003/tasks/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${dataToken.token}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("No autorizado");
      })
      .then((data) => {
        if (data) {
          $(".table-tasks").DataTable().ajax.reload();
          Swal.fire({
            title: "Proceso exitoso",
            text: "Tarea liminada",
            icon: "success",
          });
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

  // Función para cargar las recetas desde el backend
  async function loadRecipes() {
    try {
      const response = await fetch("http://localhost:3003/products", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${dataToken.token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      availableIngredients = data;

      // Llenar el primer campo de selección de recetas
      const firstSelect = document.querySelector(".recipe-select");
      populateRecipeSelect(firstSelect);
    } catch (error) {
      console.error("Error al cargar las recetas:", error);
    }
  }

  // Función para cargar las tareas desde el backend
  async function loadOneTask(id) {
    try {
      let htmlDetailTask = "";
      const response = await fetch(`http://localhost:3003/tasks/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${dataToken.token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        $titleRecipe.textContent = data.product.name;
        // Detail
        let itemsHtml = "";
        data.product.items.map((item) => {
          itemsHtml += `
                      <tr class="ingredient-row">
                          <td>${item.ingredient.name}</td>
                          <td>${item.cuantity}</td>
                          <td class="text-center">${item.controlUnit}</td>
                      </tr>`;
        });
        $tableItemsTaskBody.innerHTML = itemsHtml;
      }
    } catch (error) {
      console.error("Error al cargar tarea:", error);
    }
  }

  // Función para llenar el campo select con las recetas
  function populateRecipeSelect(selectElement) {
    selectElement.innerHTML = ""; // Limpiar el select

    availableIngredients.forEach((recipe) => {
      if (recipe.type=='Receta') {
        const option = document.createElement("option");
        option.value = recipe.id;
        option.textContent = recipe.name;
        selectElement.appendChild(option);
      }
    });
  }

  // Cargar las recetas al cargar la página
  await loadRecipes();
});
