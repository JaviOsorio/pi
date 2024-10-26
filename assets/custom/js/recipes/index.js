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
  const $proUserName = document.querySelector(".pro-username");
  const user = localStorage.getItem("user");
  $proUserName.textContent = user;
  const $tableProducts = document.querySelector(".table-products");
  const $recipeForm = document.querySelector(".recipe-form");
  // Ingredients
  const ingredientsList = document.getElementById("ingredientsList");
  const addIngredientButton = document.getElementById("addIngredient");
  let availableIngredients = [];

  // Event clcik
  document.addEventListener("click", async (event) => {
    let data = event.target.dataset;
    if (event.target.matches(".btn-modal-recipe")) {
      $recipeForm.id.value = "";
      $recipeForm.reset();
      const ingredientItems =
        ingredientsList.querySelectorAll(".ingredient-item");
      // Mantener solo el primer ingredient-item
      if (ingredientItems.length > 1) {
        // Eliminar todos los elementos excepto el primero
        for (let i = 1; i < ingredientItems.length; i++) {
          ingredientsList.removeChild(ingredientItems[i]);
        }
      }

      // Restablecer los valores del primer ingrediente
      const firstIngredientItem =
        ingredientsList.querySelector(".ingredient-item");
      if (firstIngredientItem) {
        // Restablecer los campos select y input del primer item
        const selects = firstIngredientItem.querySelectorAll("select");
        const inputs = firstIngredientItem.querySelectorAll("input");

        selects.forEach((select) => {
          select.selectedIndex = 0; // Restablecer al primer valor (por defecto)
        });

        inputs.forEach((input) => {
          input.value = ""; // Vaciar los inputs
        });
      }
      $("#recipeModal").modal("show");
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
      $recipeForm.id.value = data?.id;
      $recipeForm.name.value = data?.name;
      $("#recipeModal").modal("show");
      await handleEditButtonClick(data?.id);
    }
  });

  // submit
  document.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (event.target === $recipeForm) {
      const data = new FormData(event.target);
      const jsonData = {};

      // Recoger solo los campos que pertenecen a la receta
      data.forEach((value, key) => {
        if (!key.startsWith("ingredient_")) {
          // Excluimos los campos de ingredientes
          jsonData[key] = value;
        }
      });

      delete jsonData["id"]; // Si estás actualizando, el 'id' no debería estar en el POST

      // Enviar la solicitud para crear o actualizar la receta
      const recipeResponse = await fetch(
        `http://localhost:3003/products${
          $recipeForm.id.value != "" ? `/${$recipeForm.id.value}` : ""
        }`,
        {
          method: $recipeForm.id.value != "" ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${dataToken.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jsonData), // Solo enviamos los datos de la receta
        }
      );

      if (!recipeResponse.ok) {
        Swal.fire({
          title: "Ops...",
          text: "Ocurrió un error al crear la receta",
          icon: "warning",
        });
        return;
      }

      const createdOrUpdatedRecipe = await recipeResponse.json();

      const recipeId = createdOrUpdatedRecipe.id; // Obtenemos el ID de la receta creada o actualizada

      // Paso 2: Enviar los ingredientes asociados a la receta
      const ingredientIds = document.querySelectorAll(
        '[name="ingredient_id[]"]'
      );
      const quantities = document.querySelectorAll(
        '[name="ingredient_quantity[]"]'
      );
      const controlUnits = document.querySelectorAll(
        '[name="ingredient_control_unit[]"]'
      );

      for (let i = 0; i < ingredientIds.length; i++) {
        const ingredientData = {
          productId: recipeId, // El ID de la receta recién creada o actualizada
          ingredientId: parseInt(ingredientIds[i].value), // Convertir ID del ingrediente a número
          cuantity: Number(quantities[i].value.replace(".", "")), // Convertir la cantidad a número
          controlUnit: controlUnits[i].value, // Unidad de control del ingrediente
        };

        // Asociar ingrediente a la receta
        const ingredientResponse = await fetch(`http://localhost:3003/items`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${dataToken.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ingredientData),
        });

        if (!ingredientResponse.ok) {
          Swal.fire({
            title: "Ops...",
            text: "Ocurrió un error al asociar los ingredientes",
            icon: "warning",
          });
          return;
        }
      }

      // Si todo salió bien, recargar la tabla y cerrar el modal
      $(".table-products").DataTable().ajax.reload();
      $("#recipeModal").modal("hide");
      event.target.reset();
      event.target.id.value = "";

      Swal.fire({
        title: "Proceso exitoso",
        text: "Receta y sus ingredientes creados/actualizados correctamente",
        icon: "success",
      });
    }
  });

  // Load data
  async function loadDatatable() {
    $(".table-products").DataTable({
      ajax: {
        url: "http://localhost:3003/products",
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
        { data: "id" }, // Columna para ID
        { data: "name" }, // Columna para nombre
        { data: "status" }, // Columna para estado
        {
          data: "createAt", // Columna para fecha de creación
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
                          <button class="btn btn-danger text-white btn-xs me-2 btn-delete" data-id="${row.id}" data-name="${row.name}">Eliminar</button>
                          <button class="btn btn-warning text-white btn-xs btn-edit" data-id="${row.id}" data-name="${row.name}">Editar</button>
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
    await fetch(`http://localhost:3003/products/${id}`, {
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
          $(".table-products").DataTable().ajax.reload();
          $("#recipeModal").modal("hide");
          event.target.reset();
          Swal.fire({
            title: "Proceso exitoso",
            text: "Eliminada creada",
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

  // Función para cargar los ingredientes desde el backend
  async function loadIngredients() {
    try {
      const response = await fetch("http://localhost:3003/ingredients", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${dataToken.token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      availableIngredients = data; // Guardar los ingredientes cargados

      // Llenar el primer campo de selección de ingredientes
      const firstSelect = document.querySelector(".ingredient-select");
      populateIngredientSelect(firstSelect);
    } catch (error) {
      console.error("Error al cargar los ingredientes:", error);
    }
  }

  // Función para llenar el campo select con los ingredientes
  function populateIngredientSelect(selectElement) {
    selectElement.innerHTML = ""; // Limpiar el select

    availableIngredients.forEach((ingredient) => {
      const option = document.createElement("option");
      option.value = ingredient.id; // Usar el ID del ingrediente
      option.textContent = ingredient.name; // Mostrar el nombre del ingrediente
      selectElement.appendChild(option);
    });
  }

  // Cargar los ingredientes al cargar la página
  await loadIngredients();

  // Agregar un nuevo campo de ingrediente
  addIngredientButton.addEventListener("click", function () {
    const ingredientItem = document.createElement("div");
    ingredientItem.classList.add("ingredient-item");

    ingredientItem.innerHTML = `
          <div class="row">
              <div class="col-sm-5">
                  <select class="form-control mb-2 ingredient-select" name="ingredient_id[]" required="">
                      <!-- Aquí se cargarán los ingredientes dinámicamente -->
                  </select>
              </div>
              <div class="col-sm-4">
                  <input type="number" class="form-control mb-2" name="ingredient_quantity[]" placeholder="Cantidad" step="any" required="">
              </div>
              <div class="col-sm-2">
                  <select class="form-control mb-2 ingredient-select" name="ingredient_control_unit[]" required="">
                      <option value="G">G</option>
                      <option value="KG">KG</option>
                      <option value="LB">LB</option>
                      <option value="L">L</option>
                  </select>
              </div>
              <div class="col-sm-1">
                  <button type="button" class="btn btn-danger btn-sm remove-ingredient"><i class="fas fa-trash"></i></button>
              </div>
          </div>
      `;

    ingredientsList.appendChild(ingredientItem);

    // Llenar el nuevo select con los ingredientes disponibles
    const newSelect = ingredientItem.querySelector(".ingredient-select");
    populateIngredientSelect(newSelect);

    // Agregar funcionalidad para eliminar un ingrediente
    ingredientItem
      .querySelector(".remove-ingredient")
      .addEventListener("click", function () {
        ingredientItem.remove();
      });
  });

  // Edit reset
  async function handleEditButtonClick(recipeId) {
    try {
      // Limpiar ingredientes existentes
      const ingredientsList = document.getElementById("ingredientsList");
      ingredientsList.innerHTML = ""; // Limpia la lista antes de agregar nuevos ingredientes
      const response = await fetch(
        `http://localhost:3003/products/${recipeId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${dataToken.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Error al obtener la receta");
      }

      const recipeData = await response.json();

      // Cargar datos de la receta en el formulario
      document.querySelector('input[name="id"]').value = recipeData.id;
      document.querySelector('input[name="name"]').value = recipeData.name;

      // Cargar ingredientes asociados a la receta
      recipeData.items.forEach((ingredient) => {
        const ingredientItem = document.createElement("div");
        ingredientItem.classList.add("ingredient-item");

        ingredientItem.innerHTML = `
                  <div class="row">
                      <div class="col-sm-5">
                          <select class="form-control mb-2 ingredient-select" name="ingredient_id[]" required="">
                              <!-- Aquí se cargarán los ingredientes dinámicamente -->
                          </select>
                      </div>
                      <div class="col-sm-4">
                          <input type="number" class="form-control mb-2" name="ingredient_quantity[]" placeholder="Cantidad" step="any" value="${
                            ingredient.cuantity
                          }" required="">
                      </div>
                      <div class="col-sm-2">
                          <select class="form-control mb-2 ingredient-select" name="ingredient_control_unit[]" required="">
                              <option value="G" ${
                                ingredient.controlUnit === "G" ? "selected" : ""
                              }>G</option>
                              <option value="KG" ${
                                ingredient.controlUnit === "KG"
                                  ? "selected"
                                  : ""
                              }>KG</option>
                              <option value="LB" ${
                                ingredient.controlUnit === "LB"
                                  ? "selected"
                                  : ""
                              }>LB</option>
                              <option value="L" ${
                                ingredient.controlUnit === "L" ? "selected" : ""
                              }>L</option>
                          </select>
                      </div>
                      <div class="col-sm-1">
                          <button type="button" class="btn btn-danger btn-sm remove-ingredient"><i class="fas fa-trash"></i></button>
                      </div>
                  </div>
              `;

        ingredientsList.appendChild(ingredientItem);

        // Llenar el nuevo select con los ingredientes disponibles
        const newSelect = ingredientItem.querySelector(".ingredient-select");
        populateIngredientSelect(newSelect);

        // Seleccionar el ingrediente actual
        newSelect.value = ingredient.ingredient.id; // Asigna el ID del ingrediente actual

        // Agregar funcionalidad para eliminar un ingrediente
        ingredientItem
          .querySelector(".remove-ingredient")
          .addEventListener("click", function () {
            ingredientItem.remove();
          });
      });
    } catch (error) {
      console.error("Error al manejar el botón de edición:", error);
    }
  }

  function createIngredientRow(item) {
    const ingredientRow = document.createElement("div");
    ingredientRow.className = "ingredient-item";
    ingredientRow.innerHTML = `
          <div class="row">
              <div class="col-sm-5">
                  <select class="form-control mb-2 ingredient-select" name="ingredient_id[]" required="">
                      <!-- Aquí se cargarán los ingredientes dinámicamente -->
                  </select>
              </div>
              <div class="col-sm-4">
                  <input type="number" class="form-control mb-2" name="ingredient_quantity[]" step="any" value="${
                    item.cuantity
                  }" placeholder="Cantidad" required="">
              </div>
              <div class="col-sm-2">
                  <select class="form-control mb-2 ingredient-select" name="ingredient_control_unit[]" required="">
                      <option value="G" ${
                        item.controlUnit === "G" ? "selected" : ""
                      }>G</option>
                      <option value="KG" ${
                        item.controlUnit === "KG" ? "selected" : ""
                      }>KG</option>
                      <option value="LB" ${
                        item.controlUnit === "LB" ? "selected" : ""
                      }>LB</option>
                      <option value="L" ${
                        item.controlUnit === "L" ? "selected" : ""
                      }>L</option>
                  </select>
              </div>
              <div class="col-sm-1">
                  <button type="button" class="btn btn-danger btn-sm remove-ingredient"><i class="fas fa-trash"></i></button>
              </div>
          </div>
      `;

    // Agregar evento para eliminar el ingrediente
    ingredientRow
      .querySelector(".remove-ingredient")
      .addEventListener("click", () => {
        ingredientRow.remove();
      });

    return ingredientRow;
  }
});
