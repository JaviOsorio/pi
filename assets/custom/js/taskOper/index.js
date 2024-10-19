
document.addEventListener("DOMContentLoaded", async () => {
  const { loadDatatable, loadOneTask } = await import('./module.js');
  const { decodeToken } = await import("./../auth/auth.js");
  const $progresBar = document.querySelector('.progress-bar')
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
  document.addEventListener('click', async (event) => {
    let data = event.target.dataset;
    if (event.target.matches('.btn-detail')) {
      await loadOneTask(data.id);
      $('#detailTaskModal').modal('show');
    } else if (event.target.matches('.btn-scale')) {
      $progresBar.setAttribute('aria-valuemin', 0)
      $progresBar.setAttribute('aria-valuemax', data.quantity)
      $progresBar.setAttribute('data-taskId', data.taskid)
      $progresBar.setAttribute('data-ingredientId', data.ingredientid)
      $progresBar.style.width = `0%`;
      $('#detailTaskModal').modal('hide');
      $('#igredientModal').modal('show');
      document.querySelector('.title-modal-ingredient').textContent = data.ingredientname
      document.querySelector('.current-weight').textContent = 0
      document.querySelector('.objective-weight').textContent = `${data.quantity} ${data.controlunit}`
      document.querySelector('.title-scale').textContent = data.quantity > 2000 ? `Bascula de Piso` : `Bascula de Mesa`;
      // console.log(data);
    } else if (event.target.matches('.btn-close-ingredient')) {
      $('#detailTaskModal').modal('show');
      $('#igredientModal').modal('hide');
    }
  });
  await loadDatatable()
});