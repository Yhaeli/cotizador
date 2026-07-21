// ==========================================
// VARIABLES GLOBALES EN MEMORIA
// ==========================================
let cotizacionesGuardadas = [];
let inventarioMacetas = [];
let historialVentasMacetas = [];
let inventarioSustratos = [];
let historialVentasSustratos = [];

// ==========================================
// 1. NAVEGACIÓN ENTRE PESTAÑAS
// ==========================================
function switchTab(tabId, event) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById('tab-' + tabId).classList.add('active');
  if (event) event.currentTarget.classList.add('active');
}

// ==========================================
// 2. ESCUCHADORES EN TIEMPO REAL (FIREBASE FIRESTORE)
// ==========================================

// --- A. COTIZACIONES EN TIEMPO REAL ---
db.collection("cotizaciones").onSnapshot((snapshot) => {
  cotizacionesGuardadas = [];
  snapshot.forEach((doc) => {
    cotizacionesGuardadas.push({ id: doc.id, ...doc.data() });
  });
  actualizarListaCotizacionesGuardadas();
});

// --- B. MACETAS EN TIEMPO REAL ---
db.collection("inventario_macetas").onSnapshot((snapshot) => {
  inventarioMacetas = [];
  snapshot.forEach((doc) => {
    inventarioMacetas.push({ id: doc.id, ...doc.data() });
  });
  actualizarPantallaMacetas();
});

db.collection("ventas_macetas").orderBy("fechaSort", "desc").onSnapshot((snapshot) => {
  historialVentasMacetas = [];
  snapshot.forEach((doc) => {
    historialVentasMacetas.push({ id: doc.id, ...doc.data() });
  });
  actualizarPantallaMacetas();
});

// --- C. SUSTRATOS EN TIEMPO REAL ---
db.collection("inventario_sustratos").onSnapshot((snapshot) => {
  inventarioSustratos = [];
  snapshot.forEach((doc) => {
    inventarioSustratos.push({ id: doc.id, ...doc.data() });
  });
  actualizarPantallaSustratos();
});

db.collection("ventas_sustratos").orderBy("fechaSort", "desc").onSnapshot((snapshot) => {
  historialVentasSustratos = [];
  snapshot.forEach((doc) => {
    historialVentasSustratos.push({ id: doc.id, ...doc.data() });
  });
  actualizarPantallaSustratos();
});

// ==========================================
// 3. PROCESAMIENTO Y CÁLCULO DE COTIZACIÓN
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
// 4. COPIAR TEXTO A WHATSAPP Y GUARDAR EN LA NUBE
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

  // Guardar/Actualizar en Firebase
  db.collection("cotizaciones").add({
    cliente,
    numCotizacion,
    pedidoTexto,
    valEmbalaje,
    fecha: fechaStr,
    creado: new Date()
  }).then(() => {
    console.log("Cotización sincronizada en la nube.");
  });

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textoCopiar).then(() => {
      alert("✅ Texto copiado al portapapeles y cotización guardada en la nube.");
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
  alert("✅ Texto copiado al portapapeles y cotización guardada en la nube.");
}

function actualizarListaCotizacionesGuardadas() {
  const select = document.getElementById('lista-guardados');
  if (!select) return;

  select.innerHTML = '<option value="">-- Seleccionar cotización guardada --</option>';
  cotizacionesGuardadas.forEach((item, index) => {
    select.innerHTML += `<option value="${index}">${item.cliente} (${item.fecha}) - N° ${item.numCotizacion}</option>`;
  });
}

function cargarCotizacion() {
  const select = document.getElementById('lista-guardados');
  const idx = select.value;
  if (idx === "") return;

  const item = cotizacionesGuardadas[idx];
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

  const item = cotizacionesGuardadas[idx];
  db.collection("cotizaciones").doc(item.id).delete().then(() => {
    alert("Cotización eliminada correctamente.");
  });
}

// ==========================================
// 5. AUTOCOMPLETADO DE PRECIOS
// ==========================================
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

// ==========================================
// 6. RENDERIZADO DE TABLAS EN TIEMPO REAL
// ==========================================
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
      <td><button type="button" class="btn-red" onclick="eliminarMaceta('${maceta.id}')">Eliminar</button></td>
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
      <td><button type="button" class="btn-red" onclick="eliminarSustrato('${sustrato.id}')">Eliminar</button></td>
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

// ==========================================
// 7. EVENTOS DE INTERACCIÓN Y NUBE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // --- AGREGAR MACETA ---
  const btnAgregarMaceta = document.getElementById('btnAgregarMaceta');
  if (btnAgregarMaceta) {
    btnAgregarMaceta.addEventListener('click', function() {
      let nombre = document.getElementById('nombreMaceta').value.trim();
      let costo = parseFloat(document.getElementById('costoMaceta').value);
      let stock = parseInt(document.getElementById('stockMaceta').value);

      if (nombre && !isNaN(costo) && !isNaN(stock)) {
        db.collection("inventario_macetas").add({ nombre, costo, stock });
        
        document.getElementById('nombreMaceta').value = '';
        document.getElementById('costoMaceta').value = '';
        document.getElementById('stockMaceta').value = '';
      } else {
        alert("Completa todos los campos con valores válidos.");
      }
    });
  }

  // --- REGISTRAR VENTA MACETA ---
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

        let nuevoStock = maceta.stock - cantidad;
        db.collection("inventario_macetas").doc(maceta.id).update({ stock: nuevoStock });

        let fecha = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
        let total = precioUnitario * cantidad;

        db.collection("ventas_macetas").add({
          nombre: maceta.nombre,
          cantidad,
          precioUnitario,
          total,
          fecha,
          fechaSort: new Date()
        });

        document.getElementById('cantidadVenta').value = '';
        if (precioInput) precioInput.value = '';
      } else {
        alert("Selecciona una maceta, coloca cantidad y confirma el precio de venta.");
      }
    });
  }

  // --- AGREGAR SUSTRATO ---
  const btnAgregarSustrato = document.getElementById('btnAgregarSustrato');
  if (btnAgregarSustrato) {
    btnAgregarSustrato.addEventListener('click', function() {
      let nombre = document.getElementById('nombreSustrato').value.trim();
      let costo = parseFloat(document.getElementById('costoSustrato').value);
      let stock = parseInt(document.getElementById('stockSustrato').value);

      if (nombre && !isNaN(costo) && !isNaN(stock)) {
        db.collection("inventario_sustratos").add({ nombre, costo, stock });
        
        document.getElementById('nombreSustrato').value = '';
        document.getElementById('costoSustrato').value = '';
        document.getElementById('stockSustrato').value = '';
      } else {
        alert("Completa todos los campos con valores válidos.");
      }
    });
  }

  // --- REGISTRAR VENTA SUSTRATO ---
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

        let nuevoStock = sustrato.stock - cantidad;
        db.collection("inventario_sustratos").doc(sustrato.id).update({ stock: nuevoStock });

        let fecha = new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
        let total = precioUnitario * cantidad;

        db.collection("ventas_sustratos").add({
          nombre: sustrato.nombre,
          cantidad,
          precioUnitario,
          total,
          fecha,
          fechaSort: new Date()
        });

        document.getElementById('cantidadSustratoVenta').value = '';
        if (precioInput) precioInput.value = '';
      } else {
        alert("Selecciona un sustrato, coloca cantidad y confirma el precio de venta.");
      }
    });
  }
});

// Funciones globales de eliminación en Firebase
window.eliminarMaceta = function(id) {
  if (confirm("¿Seguro que deseas eliminar esta maceta del inventario?")) {
    db.collection("inventario_macetas").doc(id).delete();
  }
};

window.eliminarSustrato = function(id) {
  if (confirm("¿Seguro que deseas eliminar este sustrato del inventario?")) {
    db.collection("inventario_sustratos").doc(id).delete();
  }
};

// INICIALIZACIÓN
window.onload = function() {
  procesarCotizacion();
};
