const token = localStorage.getItem("token");
const $titleRecipe = document.querySelector(".title-recipe");
const $progresBar = document.querySelector(".progress-bar");
const $tableItemsTask = document.querySelector(".table-items-task");
const $tableItemsTaskBody = $tableItemsTask.querySelector("tbody");
let recipe = {};

// Load task
export async function loadDatatable() {
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
        sortAscending: ": Activar para ordenar la columna de forma ascendente",
        sortDescending:
          ": Activar para ordenar la columna de forma descendente",
      },
    },
  });
}

// Función para cargar las recetas desde el backend
export async function loadOneTask(id) {
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
          return item.ingredient.id === ing?.ingredient?.id;
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
                          : `<button class="btn btn-primary btn-sm btn-scale" data-taskId="${data.id}" data-ingredientId="${item.ingredient.id}" data-ingredientName="${item.ingredient.name}" data-quantity="${item.cuantity}" data-controlUnit="${item.controlUnit}">Pesar</button>`
                      }
                      </td>
                  </tr>`;
      });

      console.log(data);

      if (data?.details.length == data?.product?.items.length) {
        const $btnTaskSave = document.querySelector(".btn-task-save");
        $btnTaskSave.removeAttribute("hidden");
      }
      let ingredients = data.product?.items;
      for (let index = 0; index < ingredients.length; index++) {
        let element = ingredients[index];
        let result = data.details.find((ing) => {
          return element.ingredient.id === ing?.ingredient?.id;
        });

        if (!result) {
          $progresBar.setAttribute("aria-valuemin", 0);
          $progresBar.setAttribute("aria-valuemax", element.cuantity);
          $progresBar.setAttribute("data-taskId", id);
          $progresBar.setAttribute("data-ingredientId", element.ingredient.id);
          $progresBar.style.width = `0%`;
          $("#detailTaskModal").modal("hide");
          // $("#igredientModal").modal("show");
          document.querySelector(".title-modal-ingredient").textContent =
            element.ingredient.name;
          document.querySelector(".current-weight").textContent = 0;
          document.querySelector(
            ".objective-weight"
          ).textContent = `${element.cuantity} ${element.controlUnit}`;
          document.querySelector(".title-scale").textContent =
            element.cuantity > 15000 ? `Bascula de Piso` : `Bascula de Mesa`;
          break;
        }
      }
      $tableItemsTaskBody.innerHTML = itemsHtml;
    }
  } catch (error) {
    console.error("Error al cargar tarea:", error);
  }
}
