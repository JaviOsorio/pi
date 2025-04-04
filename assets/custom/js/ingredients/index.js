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

  // Event clcik
  document.addEventListener("click", async (event) => {
    let data = event.target.dataset;
    if (event.target.matches(".btn-modal-recipe")) {
      $recipeForm.reset();
      $recipeForm.id.value = "";
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
      $recipeForm.type.value = data?.type;
      $recipeForm.unitMeasure.value = data?.unitmeasure;
      $recipeForm.marginTolerance.value = data?.margintolerance;
      $recipeForm.minimumCuantity.value = data?.minimumcuantity;
      $("#recipeModal").modal("show");
    } else if (event.target.matches(".btn-discount-stock")) {
      Swal.fire({
        html: `
          <h3>${data?.name}</h3>
          <p>Digíte la cantidad a descontar.</p>
        `,
        input: "number",
        inputAttributes: {
          autocapitalize: "off",
          placeholder: "Cantidad",
          min: 1,
        },
        showCancelButton: true,
        confirmButtonText: "Confirmar",
        cancelButtonText: "Cancelar",
        showLoaderOnConfirm: true,
        preConfirm: async (quantity) => {
          await discountStock(data?.id, quantity);
          $(".table-products").DataTable().ajax.reload();
        },
      });
    }
  });

  // submit
  document.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.target === $recipeForm) {
      const data = new FormData(event.target);
      const jsonData = {};
      data.forEach((value, key) => {
        jsonData[key] = value;
      });
      delete jsonData["id"];

      await fetch(
        `http://localhost:3003/ingredients${
          $recipeForm.id.value != "" ? `/${$recipeForm.id.value}` : ""
        }`,
        {
          method: $recipeForm.id.value != "" ? "PUT" : "POST",
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
            $(".table-products").DataTable().ajax.reload();
            $("#recipeModal").modal("hide");
            event.target.reset();
            event.target.id.value = "";
            Swal.fire({
              title: "Proceso exitoso",
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
  async function loadDatatable() {
    $(".table-products").DataTable({
      ajax: {
        url: "http://localhost:3003/ingredients",
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
      dom: "Bfrtip",
      buttons: {
        dom: {
          button: {
            className: "btn",
          },
        },
        buttons: [
          {
            extend: "excel",
            text: "Exportar a Excel",
            sheetName: "Materia Prima",
            title: "Materia prima",
            className: "btn btn-outline-success btn-sm",
            exportOptions: {
              columns: ":visible", // Exportar solo columnas visibles
              format: {
                body: function (data, row, column, node) {
                  if (column === 5) {
                    // Cambia el índice según la posición de 'totalStock'
                    let numberValue = $("<div>")
                      .html(data)
                      .text()
                      .replace(/[^0-9]/g, "");
                    return Number(numberValue); // Se exporta como número
                  }
                  return $("<div>").html(data).text(); // Elimina HTML en otras columnas
                },
              },
            },
            excelStyles: [
              {
                template: "blue_medium",
              },
              {
                cells: "sh",
                style: {
                  font: {
                    size: 14,
                    b: true,
                    color: "FFFFFF",
                  },
                  fill: {
                    pattern: {
                      color: "1C3144",
                    },
                  },
                },
              },
              {
                cells: "A1:H1",
                style: {
                  font: {
                    size: 16,
                    b: true,
                    color: "FFFFFF",
                  },
                  fill: {
                    pattern: {
                      color: "1C3144",
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      columns: [
        { data: "id", className: "p-1" }, // Columna para ID
        { data: "name", className: "p-1" }, // Columna para nombre
        { data: "type", className: "p-1" }, // Columna para type
        { data: "unitMeasure", className: "p-1" }, // Columna para unitMeasure
        { data: "marginTolerance", className: "p-1" }, // Columna para nombre
        { data: "minimumCuantity", className: "p-1" }, // Columna para nombre
        { data: "status", className: "p-1" }, // Columna para estado
        {
          data: "createAt",
          className: "p-1",
          render: function (data) {
            return data.substr(0, 10); // Mostrar solo la fecha en formato 'YYYY-MM-DD'
          },
        },
        {
          data: "totalStock",
          className: "p-1",
          render: function (data, type, row) {
            return Number(data) < Number(row.minimumCuantity)
              ? `<i class="fas fa-exclamation-triangle text-danger"></i> ${Number(
                  data
                ).toLocaleString()}`
              : Number(data).toLocaleString();
          },
        },
        {
          data: null,
          className: "text-center p-1",
          render: function (data, type, row) {
            // Crear botones Eliminar y Editar
            return `
                          <!--<i class="fas fa-trash text-danger btn-delete" data-id="${row.id}" data-name="${row.name}"></i>-->
                          <i class="fas fa-edit text-warning btn-edit" data-id="${row.id}" data-name="${row.name}" data-type="${row.type}" data-unitMeasure="${row.unitMeasure}" data-marginTolerance="${row.marginTolerance}" data-minimumCuantity="${row.minimumCuantity}"></i>
                      `;
          },
        },
        {
          data: null,
          className: "text-center p-1",
          render: function (data, type, row) {
            // Crear botones Eliminar y Editar
            return `<i class="fas fa-box-open text-danger btn-discount-stock" data-id="${row.id}" data-name="${row.name}"></i>`;
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
    await fetch(`http://localhost:3003/ingredients/${id}`, {
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

  async function discountStock(id, quantity) {
    await fetch(`http://localhost:3003/stock-movement`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dataToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        batchNumber: "",
        type: "OUT",
        quantity: Number(quantity),
        ingredientId: Number(id),
        userId: Number(dataToken.sub),
      }),
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
          Swal.fire({
            title: "Proceso exitoso",
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
});
