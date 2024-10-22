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

  // Load data
  async function loadDatatable() {
    $(".table-chart").DataTable({
      "language": {
        "url": "//cdn.datatables.net/plug-ins/1.10.16/i18n/Spanish.json"
      },drawCallback:function(){
          $(".dataTables_paginate > .pagination").addClass("pagination-rounded")
      },
      responsive: true,
      autoWidth: false,
      destroy: true,
      deferRender: true,
      ajax: {
        url: "https://gestor.andar.com.co/pesi/tasks/filter",
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
      },dom: 'Bfrtip',
      buttons: {
          dom:{
              button:{
                className: 'btn'
              }
          },
          buttons:[
              {
                  extend: "excel",
                  text:"Exportar a Excel",
                  sheetName:"Ingredientes",
                  title: "Ingredientes",
                  className: 'btn btn-outline-success',
                  excelStyles:[
                      { 
                          "template": "blue_medium"
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
                                      color: "1C3144" 
                                  }
                              }
                          }
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
                                      color: "1C3144" 
                                  }
                              }
                          }
                      }
                  ], 
              }
          ]
          
      },
      columns: [
        { data: "id" },
        { data: "name" },
        { data: "cuantity" },
        { data: "weight" },
      ],
    });
  }
});
