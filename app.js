// ==========================================
// 1. FUNCIONES GENERALES Y NAVEGACIÓN
// ==========================================

function switchTab(tabId, event) {
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));

  document.getElementById('tab-' + tabId).classList.add('active');
  if (event) event.currentTarget.classList.add('active');
}

// ==========================================
// 2. MÓDULO COTIZADOR (CÁLCULO AUTOMÁTICO)
// ==========================================

function procesarCotizacion() {
  const cliente = document.getElementById('cliente').value;
  const numCotizacion = document.getElementById('num-cotizacion').value;
  const pedidoTexto = document.getElementById('pedido-texto').value;
  const valEmbalajeInput = document.getElementById('valEmbalaje');
  const valEmbalaje = parseFloat(valEmbalajeInput.value) || 0;

  // Actualizar encabezados visuales de la vista previa
  document.getElementById('img-cliente').textContent = cliente.trim() !== '' ? cliente : '---';
  document.getElementById('img-num-cotizacion').textContent = numCotizacion.trim() !== '' ? numCotizacion : '---';

  const fechaActual = new Date();
  const dia = String(fechaActual.getDate()).padStart(2, '0');
  const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
  const anio = fechaActual.getFullYear();
  document.getElementById('img-fecha').textContent = `${dia}/${mes}/${anio}`;

  const tablaFilas = document.getElementById('img-tabla-filas');
  tablaFilas.innerHTML = '';

  let totalPlantas = 0;

  // Separar líneas del texto ingresado
  const lineas = pedidoTexto.split('\n');

  lineas.forEach(linea => {
    linea = linea.trim();
    if (!linea) return;

    // Detecta patrones como: "2 rosas 23", "2 rosas - 23.00", "2 x rosas 23"
    // Extrae: Cantidad (opcional, por defecto 1), Descripción y Precio final
    const match = linea.match(/^(?:(\d+)\s*x?\s+)?(.+?)\s*[-:\s]+\s*(\d+(?:\.\d+)?)$/i);

    if (match) {
      const cantidad = parseInt(match[1]) || 1;
      const descripcion = match[2].trim();
      const precioTotalItem = parseFloat(match[3]);
      const precioUnitario = precioTotalItem / cantidad;

      totalPlantas += precioTotalItem;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center">${cantidad}</td>
        <td>${descripcion}</td>
        <td class="text-right">S/. ${precioUnitario.toFixed(2)}</td>
        <td class="text-right">S/. ${precioTotalItem.toFixed(2)}</td>
      `;
      tablaFilas.appendChild(tr);
    } else {
      // Si la línea no tiene precio al final, se muestra solo como descripción
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center">1</td>
        <td>${linea}</td>
        <td class="text-right">S/. 0.00</td>
        <td class="text-right">S/. 0.00</td>
      `;
      tablaFilas.appendChild(tr);
    }
  });

  const totalPagar = totalPlantas + valEmbalaje;

  // Actualizar los campos numéricos de la interfaz
  document.getElementById('valPlantas').value = totalPlantas.toFixed(2);
  document.getElementById('valTotal').value = totalPagar.toFixed(2);

  // Actualizar la vista previa de la tarjeta/recibo
  document.getElementById('img-subtotal').textContent = totalPlantas.toFixed(2);
  document.getElementById('img-embalaje').textContent = valEmbalaje.toFixed(2);
  document.getElementById('img-total').textContent = totalPagar.toFixed(2);
}

// Guardar Cotización en Firestore
function guardarCotizacion() {
  const cliente = document.getElementById('cliente').value.trim();
  const numCotizacion = document.getElementById('num-cotizacion').value.trim();
  const pedidoTexto = document.getElementById('pedido-texto').value;
  const valEmbalaje = parseFloat(document.getElementById('valEmbalaje').value) || 0;

  if (!cliente) {
    alert("Ingresa al menos el nombre del cliente para guardar.");
    return;
  }

  db.collection('cotizaciones').add({
    cliente: cliente,
    numCotizacion: numCotizacion,
    pedidoTexto: pedidoTexto,
    valEmbalaje: valEmbalaje,
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => alert("Cotización guardada exitosamente."))
  .catch(err => console.error("Error al guardar cotización:", err));
}

// Escuchar Cotizaciones Guardadas en Tiempo Real para el <select>
db.collection('cotizaciones').orderBy('fecha', 'desc').onSnapshot(snapshot => {
  const selectHistorial = document.getElementById('lista-guardados');
  if (!selectHistorial) return;

  selectHistorial.innerHTML = '<option value="">-- Seleccionar cotización guardada --</option>';

  snapshot.forEach(doc => {
    const cot = doc.data();
    const option = document.createElement('option');
    option.value = doc.id;
    option.dataset.cliente = cot.cliente || '';
    option.dataset.num = cot.numCotizacion || '';
    option.dataset.pedido = cot.pedidoTexto || '';
    option.dataset.embalaje = cot.valEmbalaje || 0;
    option.textContent = `${cot.cliente} (${cot.numCotizacion || 'S/N'})`;
    selectHistorial.appendChild(option);
  });
});

function cargarCotizacion() {
  const selectHistorial = document.getElementById('lista-guardados');
  const selectedOption = selectHistorial.options[selectHistorial.selectedIndex];

  if (selectedOption && selectedOption.value) {
    document.getElementById('cliente').value = selectedOption.dataset.cliente;
    document.getElementById('num-cotizacion').value = selectedOption.dataset.num;
    document.getElementById('pedido-texto').value = selectedOption.dataset.pedido;
    document.getElementById('valEmbalaje').value = selectedOption.dataset.embalaje;
    procesarCotizacion();
  }
}

function eliminarCotizacion() {
  const selectHistorial = document.getElementById('lista-guardados');
  const id = selectHistorial.value;

  if (!id) {
    alert("Selecciona una cotización de la lista para eliminar.");
    return;
  }

  if (confirm("¿Seguro de que deseas eliminar esta cotización guardada?")) {
    db.collection('cotizaciones').doc(id).delete()
    .then(() => {
      alert("Cotización eliminada.");
      document.getElementById('cliente').value = '';
      document.getElementById('num-cotizacion').value = '';
      document.getElementById('pedido-texto').value = '';
      document.getElementById('valEmbalaje').value = '0.00';
      procesarCotizacion();
    });
  }
}

// Botones de Acción de Cotizador
function copiarWhatsAppYGuardar() {
  guardarCotizacion();

  const cliente = document.getElementById('cliente').value;
  const total = document.getElementById('valTotal').value;
  const pedido = document.getElementById('pedido-texto').value;

  const mensaje = `🌱 *COTIZACIÓN VIVERO ELIEL*\n👤 Cliente: ${cliente}\n📋 Detalle:\n${pedido}\n\n💰 *TOTAL A CANCELAR: S/. ${total}*\n💳 Yape: 981 046 861 (Arlene Cruzado Llanos)`;

  navigator.clipboard.writeText(mensaje)
    .then(() => alert("¡Texto copiado al portapapeles y cotización guardada!"))
    .catch(() => alert("Cotización guardada. (No se pudo copiar el texto automáticamente)"));
}

function guardarYDescargarImagen() {
  guardarCotizacion();
  const bloque = document.getElementById('bloque-imagen');

  if (typeof html2canvas !== 'undefined') {
    html2canvas(bloque).then(canvas => {
      const enlace = document.createElement('a');
      enlace.download = `Cotizacion_${document.getElementById('cliente').value || 'Vivero'}.png`;
      enlace.href = canvas.toDataURL();
      enlace.click();
    });
  } else {
    alert("Librería de imagen no disponible.");
  }
}


// ==========================================
// 3. MÓDULO DE MACETAS
// ==========================================

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
    });
  });
}

db.collection('macetas').onSnapshot(snapshot => {
  if (!tablaInventarioMacetas || !selectMacetaVenta) return;
  tablaInventarioMacetas.innerHTML = '';
  selectMacetaVenta.innerHTML = '<option value="">-- Seleccionar Maceta --</option>';

  snapshot.forEach(doc => {
    const item = doc.data();
    const id = doc.id;

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

    const option = document.createElement('option');
    option.value = id;
    option.dataset.precio = item.costo;
    option.dataset.nombre = item.nombre;
    option.textContent = `${item.nombre} (Stock: ${item.stock})`;
    selectMacetaVenta.appendChild(option);
  });
});

function cargarPrecioVentaMaceta() {
  const selectedOption = selectMacetaVenta.options[selectMacetaVenta.selectedIndex];
  if (selectedOption && selectedOption.dataset.precio) {
    precioVentaMacetaInput.value = selectedOption.dataset.precio;
  } else {
    precioVentaMacetaInput.value = '';
  }
}

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

    db.collection('ventasMacetas').add({
      producto: selectedOption.dataset.nombre,
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
    });
  });
}

db.collection('ventasMacetas').orderBy('fecha', 'desc').onSnapshot(snapshot => {
  if (!listaHistorialVentas) return;
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
// 4. MÓDULO DE SUSTRATOS
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

db.collection('sustratos').onSnapshot(snapshot => {
  if (!tablaInventarioSustratos || !selectSustratoVenta) return;
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

db.collection('ventasSustratos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
  if (!listaHistorialSustratos) return;
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
