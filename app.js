// ==========================================
// 1. FUNCIONES GENERALES Y NAVEGACIÓN
// ==========================================

function switchTab(tabId, event) {
  // Ocultar todas las pestañas
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Desactivar botones de navegación
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));

  // Activar pestaña y botón actual
  document.getElementById('tab-' + tabId).classList.add('active');
  if (event) event.currentTarget.classList.add('active');
}

// ==========================================
// 2. MÓDULO DE MACETAS
// ==========================================

// Variables globales de elementos HTML para Macetas
const nombreMaceta = document.getElementById('nombreMaceta');
const costoMaceta = document.getElementById('costoMaceta');
const stockMaceta = document.getElementById('stockMaceta');
const btnAgregarMaceta = document.getElementById('btnAgregarMaceta');
const tablaInventarioMacetas = document.getElementById('tablaInventarioMacetas');

const selectMacetaVenta = document.getElementById('selectMacetaVenta');
const cantidadVenta = document.getElementById('cantidadVenta');
const precioVentaMacetaInput = document.getElementById('precioVentaMacetaInput');
const clienteVentaMaceta = document.getElementById('clienteVentaMaceta');
const metodoPagoMaceta = document.getElementById('metodoPagoMaceta');
const btnRegistrarVenta = document.getElementById('btnRegistrarVenta');
const listaHistorialVentas = document.getElementById('listaHistorialVentas');

// A. Agregar Maceta al Inventario
if (btnAgregarMaceta) {
  btnAgregarMaceta.addEventListener('click', () => {
    const nombre = nombreMaceta.value.trim();
    const costo = parseFloat(costoMaceta.value);
    const stock = parseInt(stockMaceta.value);

    if (!nombre || isNaN(costo) || isNaN(stock)) {
      alert("Por favor completa todos los campos del inventario.");
      return;
    }

    db.collection('macetas').add({
      nombre: nombre,
      costo: costo,
      stock: stock,
      fecha: new Date()
    })
    .then(() => {
      alert("Maceta agregada exitosamente.");
      nombreMaceta.value = '';
      costoMaceta.value = '';
      stockMaceta.value = '';
    })
    .catch(error => console.error("Error al guardar en Firestore:", error));
  });
}

// B. Cargar Inventario de Macetas en Tiempo Real (Sincronización Laptop/Celular)
db.collection('macetas').onSnapshot(snapshot => {
  tablaInventarioMacetas.innerHTML = '';
  selectMacetaVenta.innerHTML = '<option value="">-- Seleccionar Maceta --</option>';

  snapshot.forEach(doc => {
    const item = doc.data();
    const id = doc.id;

    // Llenar Tabla
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${item.nombre}</td>
      <td>S/. ${parseFloat(item.costo).toFixed(2)}</td>
      <td>${item.stock}</td>
      <td>
        <button onclick="eliminarMaceta('${id}')" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">Eliminar</button>
      </td>
    `;
    tablaInventarioMacetas.appendChild(fila);

    // Llenar Select de Ventas
    const option = document.createElement('option');
    option.value = id;
    option.dataset.precio = item.costo;
    option.dataset.nombre = item.nombre;
    option.textContent = `${item.nombre} (Stock: ${item.stock})`;
    selectMacetaVenta.appendChild(option);
  });
});

// C. Auto-cargar Precio Base al Seleccionar Maceta
function cargarPrecioVentaMaceta() {
  const selectedOption = selectMacetaVenta.options[selectMacetaVenta.selectedIndex];
  if (selectedOption && selectedOption.dataset.precio) {
    precioVentaMacetaInput.value = selectedOption.dataset.precio;
  } else {
    precioVentaMacetaInput.value = '';
  }
}

// D. Registrar Venta de Macetas
if (btnRegistrarVenta) {
  btnRegistrarVenta.addEventListener('click', () => {
    const macetaId = selectMacetaVenta.value;
    const cant = parseInt(cantidadVenta.value);
    const precio = parseFloat(precioVentaMacetaInput.value);
    const cliente = clienteVentaMaceta.value.trim() || "Cliente Anónimo";
    const pago = metodoPagoMaceta.value;
    const selectedOption = selectMacetaVenta.options[selectMacetaVenta.selectedIndex];

    if (!macetaId || isNaN(cant) || isNaN(precio) || cant <= 0) {
      alert("Por favor selecciona un producto y completa una cantidad/precio válidos.");
      return;
    }

    const nombreProducto = selectedOption.dataset.nombre;

    // Guardar la venta en la colección 'ventasMacetas'
    db.collection('ventasMacetas').add({
      producto: nombreProducto,
      cantidad: cant,
      precioUnit: precio,
      total: cant * precio,
      cliente: cliente,
      metodoPago: pago,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      alert("Venta de maceta registrada.");
      cantidadVenta.value = '';
      clienteVentaMaceta.value = '';
      selectMacetaVenta.value = '';
      precioVentaMacetaInput.value = '';
    })
    .catch(error => console.error("Error al registrar venta:", error));
  });
}

// E. Cargar y Mostrar Historial de Ventas de Macetas en Tiempo Real
db.collection('ventasMacetas').orderBy('fecha', 'desc').onSnapshot(snapshot => {
  listaHistorialVentas.innerHTML = '';

  snapshot.forEach(doc => {
    const venta = doc.data();
    const id = doc.id;

    const li = document.createElement('li');
    li.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #ddd;";
    li.innerHTML = `
      <div>
        <strong>${venta.producto}</strong> x${venta.cantidad} - S/. ${(venta.total || 0).toFixed(2)} 
        <br><small>👤 ${venta.cliente} | 💳 ${venta.metodoPago}</small>
      </div>
      <button onclick="eliminarVentaMaceta('${id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">🗑️ Borrar</button>
    `;
    listaHistorialVentas.appendChild(li);
  });
});

// F. Funciones de Borrado (Macetas y Ventas)
function eliminarMaceta(id) {
  if (confirm("¿Deseas eliminar este producto del inventario?")) {
    db.collection('macetas').doc(id).delete();
  }
}

function eliminarVentaMaceta(id) {
  if (confirm("¿Estás seguro de eliminar este registro de venta?")) {
    db.collection('ventasMacetas').doc(id).delete();
  }
}


// ==========================================
// 3. MÓDULO DE SUSTRATOS
// ==========================================

const nombreSustrato = document.getElementById('nombreSustrato');
const costoSustrato = document.getElementById('costoSustrato');
const stockSustrato = document.getElementById('stockSustrato');
const btnAgregarSustrato = document.getElementById('btnAgregarSustrato');
const tablaInventarioSustratos = document.getElementById('tablaInventarioSustratos');

const selectSustratoVenta = document.getElementById('selectSustratoVenta');
const cantidadSustratoVenta = document.getElementById('cantidadSustratoVenta');
const precioVentaSustratoInput = document.getElementById('precioVentaSustratoInput');
const clienteVentaSustrato = document.getElementById('clienteVentaSustrato');
const metodoPagoSustrato = document.getElementById('metodoPagoSustrato');
const btnRegistrarVentaSustrato = document.getElementById('btnRegistrarVentaSustrato');
const listaHistorialSustratos = document.getElementById('listaHistorialSustratos');

// A. Agregar Sustrato
if (btnAgregarSustrato) {
  btnAgregarSustrato.addEventListener('click', () => {
    const nombre = nombreSustrato.value.trim();
    const costo = parseFloat(costoSustrato.value);
    const stock = parseInt(stockSustrato.value);

    if (!nombre || isNaN(costo) || isNaN(stock)) {
      alert("Por favor completa los campos del sustrato.");
      return;
    }

    db.collection('sustratos').add({
      nombre: nombre,
      costo: costo,
      stock: stock,
      fecha: new Date()
    })
    .then(() => {
      alert("Sustrato agregado exitosamente.");
      nombreSustrato.value = '';
      costoSustrato.value = '';
      stockSustrato.value = '';
    });
  });
}

// B. Cargar Inventario de Sustratos
db.collection('sustratos').onSnapshot(snapshot => {
  tablaInventarioSustratos.innerHTML = '';
  selectSustratoVenta.innerHTML = '<option value="">-- Seleccionar Sustrato --</option>';

  snapshot.forEach(doc => {
    const item = doc.data();
    const id = doc.id;

    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${item.nombre}</td>
      <td>S/. ${parseFloat(item.costo).toFixed(2)}</td>
      <td>${item.stock}</td>
      <td>
        <button onclick="eliminarSustrato('${id}')" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">Eliminar</button>
      </td>
    `;
    tablaInventarioSustratos.appendChild(fila);

    const option = document.createElement('option');
    option.value = id;
    option.dataset.precio = item.costo;
    option.dataset.nombre = item.nombre;
    option.textContent = `${item.nombre} (Stock: ${item.stock})`;
    selectSustratoVenta.appendChild(option);
  });
});

function cargarPrecioVentaSustrato() {
  const selectedOption = selectSustratoVenta.options[selectSustratoVenta.selectedIndex];
  if (selectedOption && selectedOption.dataset.precio) {
    precioVentaSustratoInput.value = selectedOption.dataset.precio;
  } else {
    precioVentaSustratoInput.value = '';
  }
}

// C. Registrar Venta Sustrato
if (btnRegistrarVentaSustrato) {
  btnRegistrarVentaSustrato.addEventListener('click', () => {
    const sustratoId = selectSustratoVenta.value;
    const cant = parseInt(cantidadSustratoVenta.value);
    const precio = parseFloat(precioVentaSustratoInput.value);
    const cliente = clienteVentaSustrato.value.trim() || "Cliente Anónimo";
    const pago = metodoPagoSustrato.value;
    const selectedOption = selectSustratoVenta.options[selectSustratoVenta.selectedIndex];

    if (!sustratoId || isNaN(cant) || isNaN(precio) || cant <= 0) {
      alert("Por favor selecciona un producto y datos válidos.");
      return;
    }

    db.collection('ventasSustratos').add({
      producto: selectedOption.dataset.nombre,
      cantidad: cant,
      precioUnit: precio,
      total: cant * precio,
      cliente: cliente,
      metodoPago: pago,
      fecha: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      alert("Venta de sustrato registrada.");
      cantidadSustratoVenta.value = '';
      clienteVentaSustrato.value = '';
      selectSustratoVenta.value = '';
      precioVentaSustratoInput.value = '';
    });
  });
}

// D. Historial Sustratos
db.collection('ventasSustratos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
  listaHistorialSustratos.innerHTML = '';

  snapshot.forEach(doc => {
    const venta = doc.data();
    const id = doc.id;

    const li = document.createElement('li');
    li.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #ddd;";
    li.innerHTML = `
      <div>
        <strong>${venta.producto}</strong> x${venta.cantidad} - S/. ${(venta.total || 0).toFixed(2)} 
        <br><small>👤 ${venta.cliente} | 💳 ${venta.metodoPago}</small>
      </div>
      <button onclick="eliminarVentaSustrato('${id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">🗑️ Borrar</button>
    `;
    listaHistorialSustratos.appendChild(li);
  });
});

function eliminarSustrato(id) {
  if (confirm("¿Deseas eliminar este producto del inventario?")) {
    db.collection('sustratos').doc(id).delete();
  }
}

function eliminarVentaSustrato(id) {
  if (confirm("¿Estás seguro de eliminar este registro de venta?")) {
    db.collection('ventasSustratos').doc(id).delete();
  }
}
