// ==========================================
// 1. CAMBIO DE PESTAÑAS
// ==========================================
function switchTab(tabId, event) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById('tab-' + tabId).classList.add('active');
  if (event) event.currentTarget.classList.add('active');
}

// ==========================================
// 2. PROCESAMIENTO Y CÁLCULO DE COTIZACIÓN
// ==========================================
function procesarCotizacion() {
  try {
    const clienteInput = document.getElementById('cliente');
    const numCotizacionInput = document.getElementById('num-cotizacion');
    const pedidoTextoInput = document.getElementById('pedido-texto');
    const valEmbalajeInput = document.getElementById('valEmbalaje');

    if (!pedidoTextoInput) return;

    const cliente = clienteInput ? (clienteInput.value || '---') : '---';
    const numCotizacion = numCotizacionInput ? (numCotizacionInput.value || '---') : '---';
    const pedidoTexto = pedidoTextoInput.value || '';
    
    let embalajeTexto = valEmbalajeInput ? valEmbalajeInput.value : "0";
    embalajeTexto = embalajeTexto.replace(',', '.');
    const valEmbalaje = parseFloat(embalajeTexto) || 0;

    const hoy = new Date();
    const fechaStr = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

    if (document.getElementById('img-cliente')) document.getElementById('img-cliente').innerText = cliente;
    if (document.getElementById('img-num-cotizacion')) document.getElementById('img-num-cotizacion').innerText = numCotizacion;
    if (document.getElementById('img-fecha')) document.getElementById('img-fecha').innerText = fechaStr;

    const lineas = pedidoTexto.split('\n');
    let sumaPlantas = 0;
    let htmlFilas = '';

    lineas.forEach(linea => {
      linea = linea.trim();
      if (!linea) return;

      let cantidad = 1;
      let descripcion = linea;
      let precioUnitario = 0;

      if (linea.includes('-')) {
        const partes = linea.split('-');
        const parteIzquierda = partes[0].trim();
        const parteDerecha = partes[1].trim().replace(',', '.');

        precioUnitario = parseFloat(parteDerecha) || 0;

        const palabras = parteIzquierda.split(' ');
        if (!isNaN(palabras[0]) && palabras.length > 1) {
          cantidad = parseInt(palabras[0]);
          descripcion = palabras.slice(1).join(' ');
        } else {
          descripcion = parteIzquierda;
        }
      } else {
        const palabras = linea.split(' ');
        const ultimaPalabra = palabras[palabras.length - 1].replace(',', '.');

        if (!isNaN(ultimaPalabra) && palabras.length > 1) {
          precioUnitario = parseFloat(ultimaPalabra) || 0;

          const primerPalabra = palabras[0];
          if (!isNaN(primerPalabra) && palabras.length > 2) {
            cantidad = parseInt(primerPalabra);
            descripcion = palabras.slice(1, -1).join(' ');
          } else {
            descripcion = palabras.slice(0, -1).join(' ');
          }
        }
      }

      const subtotalLinea = cantidad * precioUnitario;
      sumaPlantas += subtotalLinea;

      htmlFilas += `
        <tr>
          <td class="text-center">${cantidad}</td>
          <td>${descripcion}</td>
          <td class="text-right">S/. ${precioUnitario.toFixed(2)}</td>
          <td class="text-right">S/. ${subtotalLinea.toFixed(2)}</td>
        </tr>
      `;
    });

    const totalPagar = sumaPlantas + valEmbalaje;

    if (document.getElementById('valPlantas')) document.getElementById('valPlantas').value = sumaPlantas.toFixed(2);
    if (document.getElementById('valTotal')) document.getElementById('valTotal').value = totalPagar.toFixed(2);

    if (document.getElementById('img-tabla-filas')) document.getElementById('img-tabla-filas').innerHTML = htmlFilas;
    if (document.getElementById('img-subtotal')) document.getElementById('img-subtotal').innerText = sumaPlantas.toFixed(2);
    if (document.getElementById('img-embalaje')) document.getElementById('img-embalaje').innerText = valEmbalaje.toFixed(2);
    if (document.getElementById('img-total')) document.getElementById('img-total').innerText = totalPagar.toFixed(2);

  } catch (err) {
    console.error("Error al procesar cotización:", err);
  }
}

// ==========================================
// 3. COPIAR TEXTO A WHATSAPP Y GUARDAR
// ==========================================
function copiarWhatsAppYGuardar() {
  const cliente = document.getElementById('cliente').value.trim() || 'Cliente Sin Nombre';
  const numCotizacion = document.getElementById('num-cotizacion').value || '---';
  const valPlantas = document.getElementById('valPlantas').value || '0.00';
  const valEmbalaje = document.getElementById('valEmbalaje').value || '0.00';
  const valTotal = document.getElementById('valTotal').value || '0.00';
  const pedidoTexto = document.getElementById('pedido-texto').value || '';

  if (!pedidoTexto.trim()) {
    alert("Por favor escribe el detalle del pedido antes de copiar o guardar.");
    return;
  }

  const hoy = new Date();
  const fechaStr = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

  let textoCopiar = `*COTIZACIÓN VIVERO ELIEL*\n`;
  textoCopiar += `👤 *Cliente:* ${cliente}\n`;
  textoCopiar += `📄 *N° Cotización:* ${numCotizacion}\n`;
  textoCopiar += `📅 *Fecha:* ${fechaStr}\n\n`;
  textoCopiar += `*DETALLE DEL PEDIDO:*\n${pedidoTexto}\n\n`;
  textoCopiar += `🪴 *Total Plantas:* S/. ${valPlantas}\n`;
  textoCopiar += `📦 *Embalaje y Traslado:* S/. ${valEmbalaje}\n`;
  textoCopiar += `💰 *TOTAL A PAGAR:* S/. ${valTotal}\n\n`;
  textoCopiar += `📋 *Métodos de pago:*\n`;
  textoCopiar += `📱 Yape: 981 046 861\n`;
  textoCopiar += `🏦 BCP Cuenta Corriente: 19178952536034\n`;
  textoCopiar += `💥 Titular: Arlene Cruzado Llanos\n\n`;
  textoCopiar += `⚠️ *Importante:* Vigencia de 24 horas. Sin confirmación de pago, el pedido se libera.`;

  guardarCotizacionEnLocal({
    cliente,
    numCotizacion,
    pedidoTexto,
    valEmbalaje,
    fecha: fechaStr
  });

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textoCopiar).then(() => {
      alert("✅ Texto copiado al portapapeles y cotización guardada automáticamente.");
    }).catch(() => fallbackCopiar(textoCopiar));
  } else {
    fallbackCopiar(textoCopiar);
  }
}

function fallbackCopiar(texto) {
  const areaTemp = document.createElement("textarea");
  areaTemp.value = texto;
  document.body.appendChild(areaTemp);
  areaTemp.select();
  document.execCommand("copy");
  document.body.removeChild(areaTemp);
  alert("✅ Texto copiado al portapapeles y cotización guardada automáticamente.");
}

// ==========================================
// 4. ALMACENAMIENTO DE COTIZACIONES
// ==========================================
function guardarCotizacionEnLocal(datos) {
  let cotizaciones = JSON.parse(localStorage.getItem('vivero_cotizaciones') || '[]');
  
  const index = cotizaciones.findIndex(c => c.cliente.toLowerCase() === datos.cliente.toLowerCase());
  if (index !== -1) {
    cotizaciones[index] = datos;
  } else {
    cotizaciones.push(datos);
  }

  localStorage.setItem('vivero_cotizaciones', JSON.stringify(cotizaciones));
  actualizarListaCotizacionesGuardadas();
}

function actualizarListaCotizacionesGuardadas() {
  const select = document.getElementById('lista-guardados');
  if (!select) return;

  const cotizaciones = JSON.parse(localStorage.getItem('vivero_cotizaciones') || '[]');
  select.innerHTML = '<option value="">-- Seleccionar cotización guardada --</option>';

  cotizaciones.forEach((item, index) => {
    select.innerHTML += `<option value="${index}">${item.cliente} (${item.fecha}) - N° ${item.numCotizacion}</option>`;
  });
}

function cargarCotizacion() {
  const select = document.getElementById('lista-guardados');
  const idx = select.value;
  if (idx === "") return;

  const cotizaciones = JSON.parse(localStorage.getItem('vivero_cotizaciones') || '[]');
  const item = cotizaciones[idx];

  if (item) {
    document.getElementById('cliente').value = item.cliente;
    document.getElementById('num-cotizacion').value = item.numCotizacion || '';
    document.getElementById('pedido-texto').value = item.pedidoTexto;
    document.getElementById('valEmbalaje').value = item.valEmbalaje || '0.00';
    procesarCotizacion();
  }
}

function eliminarCotizacion() {
  const select = document.getElementById('lista-guardados');
  const idx = select.value;
  if (idx === "") {
    alert("Selecciona una cotización guardada para eliminar.");
    return;
  }

  let cotizaciones = JSON.parse(localStorage.getItem('vivero_cotizaciones') || '[]');
  cotizaciones.splice(idx, 1);
  localStorage.setItem('vivero_cotizaciones', JSON.stringify(cotizaciones));
  
  actualizarListaCotizacionesGuardadas();
  alert("Cotización eliminada correctamente.");
}

// ==========================================
// 5. CONTROL DE INVENTARIO Y VENTAS (MACETAS Y SUSTRATOS)
// ==========================================

let inventarioMacetas = JSON.parse(localStorage.getItem('inventarioMacetas')) || [];
let historialVentasMacetas = JSON.parse(localStorage.getItem('historialVentasMacetas')) || [];

let inventarioSustratos = JSON.parse(localStorage.getItem('inventarioSustratos')) || [];
let historialVentasSustratos = JSON.parse(localStorage.getItem('historialVentasSustratos')) || [];

// AUTOCOMPLETAR PRECIO DE VENTA AL SELECCIONAR PRODUCTO
window.cargarPrecioVentaMaceta = function() {
  let index = document.getElementById('selectMacetaVenta').value;
  let inputPrecio = document.getElementById('precioVentaMacetaInput');
  if (index !== "" && inputPrecio && inventarioMacetas[index]) {
    inputPrecio.value = inventarioMacetas[index].costo.toFixed(2);
  } else if (inputPrecio) {
    inputPrecio.value = '';
  }
};

window.cargarPrecioVentaSustrato = function() {
  let index = document.getElementById('selectSustratoVenta').value;
  let inputPrecio = document.getElementById('precioVentaSustratoInput');
  if (index !== "" && inputPrecio && inventarioSustratos[index]) {
    inputPrecio.value = inventarioSustratos[index].costo.toFixed(2);
  } else if (inputPrecio) {
    inputPrecio.value = '';
  }
};

// --- PANTALLA MACETAS ---
function actualizarPantallaMacetas() {
  const tablaInventario = document.getElementById('tablaInventarioMacetas');
  const selectVenta = document.getElementById('selectMacetaVenta');
  const listaVentas = document.getElementById('listaHistorialVentas');
  
  if (!tablaInventario || !selectVenta || !listaVentas) return;

  tablaInventario.innerHTML = '';
  selectVenta.innerHTML = '<option value="">-- Seleccionar Maceta --</option>';
  listaVentas.innerHTML = '';

  inventarioMacetas.forEach((maceta, index) => {
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${maceta.nombre}</b></td>
      <td>S/. ${maceta.costo.toFixed(2)}</td>
      <td><b>${maceta.stock}</b> unids.</td>
      <td><button type="button" class="btn-red" onclick="eliminarMaceta(${index})">Eliminar</button></td>
    `;
    tablaInventario.appendChild(tr);

    let option = document.createElement('option');
    option.value = index;
    option.textContent = `${maceta.nombre} (Stock: ${maceta.stock})`;
    selectVenta.appendChild(option);
  });

  historialVentasMacetas.forEach(venta => {
    let li = document.createElement('li');
    li.style.borderLeftColor = "#0288D1";
    li.innerHTML = `
      <span>
        <small>${venta.fecha}</small><br>
        Vendió: <b>${venta.cantidad}x ${venta.nombre}</b> (a S/.${venta.precioUnitario.toFixed(2)} c/u) <br>
        Total: <b>S/.${venta.total.toFixed(2)}</b>
      </span>
    `;
    listaVentas.appendChild(li);
  });
}

// --- PANTALLA SUSTRATOS ---
function actualizarPantallaSustratos() {
  const tablaInventario = document.getElementById('tablaInventarioSustratos');
  const selectVenta = document.getElementById('selectSustratoVenta');
  const listaVentas = document.getElementById('listaHistorialSustratos');
  
  if (!tablaInventario || !selectVenta || !listaVentas) return;

  tablaInventario.innerHTML = '';
  selectVenta.innerHTML = '<option value="">-- Seleccionar Sustrato --</option>';
  listaVentas.innerHTML = '';

  inventarioSustratos.forEach((sustrato, index) => {
    let tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${sustrato.nombre}</b></td>
      <td>S/. ${sustrato.costo.toFixed(2)}</td>
      <td><b>${sustrato.stock}</b> unids.</td>
      <td><button type="button" class="btn-red" onclick="eliminarSustrato(${index})">Eliminar</button></td>
    `;
    tablaInventario.appendChild(tr);

    let option = document.createElement('option');
    option.value = index;
    option.textContent = `${sustrato.nombre} (Stock: ${sustrato.stock})`;
    selectVenta.appendChild(option);
  });

  historialVentasSustratos.forEach(venta => {
    let li = document.createElement('li');
    li.style.borderLeftColor = "#8e24aa";
    li.innerHTML = `
      <span>
        <small>${venta.fecha}</small><br>
        Vendió: <b>${venta.cantidad}x ${venta.nombre}</b> (a S/.${venta.precioUnitario.toFixed(2)} c/u) <br>
        Total: <b>S/.${venta.total.toFixed(2)}</b>
      </span>
    `;
    listaVentas.appendChild(li);
  });
}

// --- EVENTOS DE INTERACCIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  // Agregar Maceta
  const btnAgregarMaceta = document.getElementById('btnAgregarMaceta');
  if (btnAgregarMaceta) {
    btnAgregarMaceta.addEventListener('click', function() {
      let nombre = document.getElementById('nombreMaceta').value.trim();
      let costo = parseFloat(document.getElementById('costoMaceta').value);
      let stock = parseInt(document.getElementById('stockMaceta').value);

      if (nombre && !isNaN(costo) && !isNaN(stock)) {
        inventarioMacetas.push({ nombre, costo, stock });
        localStorage.setItem('inventarioMacetas', JSON.stringify(inventarioMacetas));
        
        document.getElementById('nombreMaceta').value = '';
        document.getElementById('costoMaceta').value = '';
        document.getElementById('stockMaceta').value = '';
        
        actualizarPantallaMacetas();
      } else {
        alert("Completa todos los campos con valores válidos.");
      }
    });
  }

  // Registrar Venta Maceta
  const btnRegistrarVentaMaceta = document.getElementById('btnRegistrarVenta');
  if (btnRegistrarVentaMaceta) {
    btnRegistrarVentaMaceta.addEventListener('click', function() {
      let index = document.getElementById('selectMacetaVenta').value;
      let cantidad = parseInt(document.getElementById('cantidadVenta').value);
      let precioInput = document.getElementById('precioVentaMacetaInput');
      let precioUnitario = precioInput ? parseFloat(precioInput.value) : NaN;

      if (index !== "" && !isNaN(cantidad) && cantidad > 0 && !isNaN(precioUnitario) && precioUnitario >= 0) {
        let maceta = inventarioMacetas[index];

        if (cantidad > maceta.stock) {
          alert("Stock insuficiente para realizar esta venta.");
          return;
        }

        maceta.stock -= cantidad;
        localStorage.setItem('inventarioMacetas', JSON.stringify(inventarioMacetas));

        let fecha = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
        let total = precioUnitario * cantidad;

        historialVentasMacetas.unshift({ fecha, nombre: maceta.nombre, cantidad, precioUnitario, total });
        localStorage.setItem('historialVentasMacetas', JSON.stringify(historialVentasMacetas));

        document.getElementById('cantidadVenta').value = '';
        if (precioInput) precioInput.value = '';
        actualizarPantallaMacetas();
      } else {
        alert("Selecciona una maceta, coloca cantidad y confirma el precio de venta.");
      }
    });
  }

  // Agregar Sustrato
  const btnAgregarSustrato = document.getElementById('btnAgregarSustrato');
  if (btnAgregarSustrato) {
    btnAgregarSustrato.addEventListener('click', function() {
      let nombre = document.getElementById('nombreSustrato').value.trim();
      let costo = parseFloat(document.getElementById('costoSustrato').value);
      let stock = parseInt(document.getElementById('stockSustrato').value);

      if (nombre && !isNaN(costo) && !isNaN(stock)) {
        inventarioSustratos.push({ nombre, costo, stock });
        localStorage.setItem('inventarioSustratos', JSON.stringify(inventarioSustratos));
        
        document.getElementById('nombreSustrato').value = '';
        document.getElementById('costoSustrato').value = '';
        document.getElementById('stockSustrato').value = '';
        
        actualizarPantallaSustratos();
      } else {
        alert("Completa todos los campos con valores válidos.");
      }
    });
  }

  // Registrar Venta Sustrato
  const btnRegistrarVentaSustrato = document.getElementById('btnRegistrarVentaSustrato');
  if (btnRegistrarVentaSustrato) {
    btnRegistrarVentaSustrato.addEventListener('click', function() {
      let index = document.getElementById('selectSustratoVenta').value;
      let cantidad = parseInt(document.getElementById('cantidadSustratoVenta').value);
      let precioInput = document.getElementById('precioVentaSustratoInput');
      let precioUnitario = precioInput ? parseFloat(precioInput.value) : NaN;

      if (index !== "" && !isNaN(cantidad) && cantidad > 0 && !isNaN(precioUnitario) && precioUnitario >= 0) {
        let sustrato = inventarioSustratos[index];

        if (cantidad > sustrato.stock) {
          alert("Stock insuficiente para realizar esta venta.");
          return;
        }

        sustrato.stock -= cantidad;
        localStorage.setItem('inventarioSustratos', JSON.stringify(inventarioSustratos));

        let fecha = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
        let total = precioUnitario * cantidad;

        historialVentasSustratos.unshift({ fecha, nombre: sustrato.nombre, cantidad, precioUnitario, total });
        localStorage.setItem('historialVentasSustratos', JSON.stringify(historialVentasSustratos));

        document.getElementById('cantidadSustratoVenta').value = '';
        if (precioInput) precioInput.value = '';
        actualizarPantallaSustratos();
      } else {
        alert("Selecciona un sustrato, coloca cantidad y confirma el precio de venta.");
      }
    });
  }
});

// Funciones globales de eliminación
window.eliminarMaceta = function(index) {
  if (confirm("¿Seguro que deseas eliminar esta maceta del inventario?")) {
    inventarioMacetas.splice(index, 1);
    localStorage.setItem('inventarioMacetas', JSON.stringify(inventarioMacetas));
    actualizarPantallaMacetas();
  }
};

window.eliminarSustrato = function(index) {
  if (confirm("¿Seguro que deseas eliminar este sustrato del inventario?")) {
    inventarioSustratos.splice(index, 1);
    localStorage.setItem('inventarioSustratos', JSON.stringify(inventarioSustratos));
    actualizarPantallaSustratos();
  }
};

// ==========================================
// 6. INICIALIZACIÓN AL CARGAR LA PÁGINA
// ==========================================
window.onload = function() {
  actualizarListaCotizacionesGuardadas();
  procesarCotizacion();
  actualizarPantallaMacetas();
  actualizarPantallaSustratos();
};
