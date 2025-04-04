document.addEventListener("DOMContentLoaded", async () => {
  const { decodeToken, logout } = await import("./../auth/auth.js");
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

  const $tableProducts = document.querySelector(".table-users");
  const $userForm = document.querySelector(".user-form");
  const $proUserName = document.querySelector(".pro-username");
  const user = localStorage.getItem("user");
  $proUserName.textContent = user;

  // Event clcik
  document.addEventListener("click", async (event) => {
    let data = event.target.dataset;
    if (event.target.matches(".btn-modal-user")) {
      $userForm.reset();
      $userForm.id.value = "";
      $("#userModal").modal("show");
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
      $userForm.id.value = data?.id;
      $userForm.document.value = data?.document;
      $userForm.name.value = data?.name;
      $userForm.email.value = data?.email;
      $userForm.role.value = data?.role;
      $("#userModal").modal("show");
    }
  });

  // submit
  document.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.target === $userForm) {
      const data = new FormData(event.target);
      const jsonData = {};
      data.forEach((value, key) => {
        jsonData[key] = value;
      });
      delete jsonData["id"];

      await fetch(
        `http://localhost:3003/users${
          $userForm.id.value != "" ? `/${$userForm.id.value}` : ""
        }`,
        {
          method: $userForm.id.value != "" ? "PUT" : "POST",
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
            $(".table-users").DataTable().ajax.reload();
            $("#userModal").modal("hide");
            event.target.reset();
            event.target.id.value = "";
            Swal.fire({
              title: "Proceso exitoso",
              // text: "Receta creada",
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
    $(".table-users").DataTable({
      ajax: {
        url: "http://localhost:3003/users",
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
        {
          data: "document",
          className: "p-1",
        },
        { 
          data: "name",
          className: "p-1", },
        { 
          data: "email",
          className: "p-1", },
        { 
          data: "role",
          className: "p-1", },
        {
          data: "created_at",
          className: "p-1",
          render: function (data) {
            return data.substr(0, 10); // Mostrar solo la fecha en formato 'YYYY-MM-DD'
          },
        },
        {
          data: null,
          className: "text-center p-1",
          render: function (data, type, row) {
            // Crear botones Eliminar y Editar
            return `
                          <i class="fas fa-trash bg-danger text-white btn-xs me-2 btn-delete" data-id="${row.id}" data-name="${row.name}"></i>
                          <i class="fas fa-edit bg-warning text-white btn-xs btn-edit" data-id="${row.id}" data-document="${row.document}" data-name="${row.name}" data-role="${row.role}" data-email="${row.email}"></i>
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
    await fetch(`http://localhost:3003/users/${id}`, {
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
          $(".table-users").DataTable().ajax.reload();
          $("#userModal").modal("hide");
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
});
