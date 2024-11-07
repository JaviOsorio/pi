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

  const startDate = document.querySelector(".start-date");
  const endDate = document.querySelector(".end-date");
  // Obtén la fecha actual
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Añade el 0 si es necesario
  const day = String(today.getDate()).padStart(2, "0"); // Añade el 0 si es necesario

  // Formato en "YYYY-MM-DD" para campos de tipo date
  const formattedDate = `${year}-${month}-${day}`;
  
  await loadDatatable(formattedDate, `${year}-${month}-${(day + 1)}`);
  document.addEventListener("change", async (event) => {
    if (event.target == startDate || event.target == endDate) {
      if (startDate.value != "" && endDate.value != "") {
        await loadDatatable(startDate.value, endDate.value);
      }
    }
  });

  // Load data
  async function loadDatatable(startDate, endDate) {
    $(".table-chart").DataTable({
      language: {
        url: "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json",
      },
      drawCallback: function () {
        $(".dataTables_paginate > .pagination").addClass("pagination-rounded");
      },
      responsive: true,
      autoWidth: false,
      destroy: true,
      deferRender: true,
      ajax: {
        url: `http://localhost:3003/tasks/filter/${startDate}/${endDate}`,
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
            sheetName: "Ingredientes",
            title: "Ingredientes",
            className: "btn btn-outline-success",
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
        { data: "id" },
        { data: "name" },
        {
          data: "cuantity",
          render: function (data, type, row) {
            return data.toLocaleString("en-US"); // Aplica el formato de miles
          },
        },
        {
          data: "weight",
          render: function (data, type, row) {
            return data.toLocaleString("en-US"); // Aplica el formato de miles
          },
        },
        { data: "controlUnit" },
      ],
    });
  }
});
