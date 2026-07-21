// CAMBIO DE PESTAÑAS
function switchTab(tabId, event) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById('tab-' + tabId).classList.add('active');
  if(event) event.currentTarget.classList.add('active');
}

// PROCESAMIENTO Y CÁLCULO DE COTIZACIÓN EN TIEMPO REAL
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

// COPIAR TEXTO A WHATSAPP Y GUARDAR COTIZACIÓN AUTOMÁTICAMENTE
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

// SISTEMA DE ALMACENAMIENTO DE COTIZACIONES
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

// INVENTARIOS MACETAS Y SUSTRATOS
let inventarioMacetas = [
  { id: 1, modelo: 'Clásica', tamano: 'N° 14', precio: 2.50, stock: 50 },
  { id: 2, modelo: 'Premium', tamano: 'N° 18', precio: 5.00, stock: 20 }
];

let inventarioSustratos = [
  { id: 1, nombre: 'Fibra de Coco', precio: 10.00, stock: 15 },
  { id: 2, nombre: 'Perlita', precio: 8.50, stock: 30 },
  { id: 3, nombre: 'Plugmix 8', precio: 12.00, stock: 10 },
  { id: 4, nombre: 'Piedra Pómez', precio: 7.00, stock: 25 },
  { id: 5, nombre: 'Corteza de Pino', precio: 9.00, stock: 18 }
];

function renderMacetas() {
  const tabla = document.getElementById('tabla-macetas');
  const select = document.getElementById('select-maceta-venta');
  if(!tabla || !select) return;
  tabla.innerHTML = '';
  select.innerHTML = '<option value="">-- Seleccionar --</option>';

  inventarioMacetas.forEach(item => {
    tabla.innerHTML += `
      <tr>
        <td>${item.modelo}</td>
        <td>${item.tamano}</td>
        <td>S/. ${item.precio.toFixed(2)}</td>
        <td class="${item.stock < 5 ? 'stock-low' : ''}">${item.stock} unids.</td>
      </tr>`;
    select.innerHTML += `<option value="${item.id}">${item.modelo} - ${item.tamano} (S/. ${item.precio.toFixed(2)})</option>`;
  });
}

function agregarMaceta(e) {
  e.preventDefault();
  const modelo = document.getElementById('maceta-modelo').value;
  const tamano = document.getElementById('maceta-tamano').value;
  const precio = parseFloat(document.getElementById('maceta-precio').value);
  const stock = parseInt(document.getElementById('maceta-cantidad').value);

  inventarioMacetas.push({ id: Date.now(), modelo, tamano, precio, stock });
  document.getElementById('form-agregar-maceta').reset();
  renderMacetas();
}

function calcularTotalMaceta() {
  const id = document.getElementById('select-maceta-venta').value;
  const cant = parseInt(document.getElementById('cant-maceta-venta').value) || 0;
  const item = inventarioMacetas.find(m => m.id == id);
  const total = item ? item.precio * cant : 0;
  document.getElementById('total-maceta-venta').value = total.toFixed(2);
}

function registrarVentaMaceta(e) {
  e.preventDefault();
  const id = document.getElementById('select-maceta-venta').value;
  const cant = parseInt(document.getElementById('cant-maceta-venta').value);
  const item = inventarioMacetas.find(m => m.id == id);

  if (item && item.stock >= cant) {
    item.stock -= cant;
    alert(`Venta registrada con éxito. Total: S/. ${(item.precio * cant).toFixed(2)}`);
    document.getElementById('form-venta-maceta').reset();
    document.getElementById('total-maceta-venta').value = "0.00";
    renderMacetas();
  } else {
    alert('Stock insuficiente para realizar esta venta.');
  }
}

function renderSustratos() {
  const tabla = document.getElementById('tabla-sustratos');
  const select = document.getElementById('select-sustrato-venta');
  if(!tabla || !select) return;
  tabla.innerHTML = '';
  select.innerHTML = '<option value="">-- Seleccionar --</option>';

  inventarioSustratos.forEach(item => {
    tabla.innerHTML += `
      <tr>
        <td>${item.nombre}</td>
        <td>S/. ${item.precio.toFixed(2)}</td>
        <td class="${item.stock < 5 ? 'stock-low' : ''}">${item.stock} unids.</td>
      </tr>`;
    select.innerHTML += `<option value="${item.id}">${item.nombre} (S/. ${item.precio.toFixed(2)})</option>`;
  });
}

function agregarSustrato(e) {
  e.preventDefault();
  const nombre = document.getElementById('sustrato-nombre').value;
  const precio = parseFloat(document.getElementById('sustrato-precio').value);
  const stock = parseInt(document.getElementById('sustrato-cantidad').value);

  inventarioSustratos.push({ id: Date.now(), nombre, precio, stock });
  document.getElementById('form-agregar-sustrato').reset();
  renderSustratos();
}

function calcularTotalSustrato() {
  const id = document.getElementById('select-sustrato-venta').value;
  const cant = parseInt(document.getElementById('cant-sustrato-venta').value) || 0;
  const item = inventarioSustratos.find(s => s.id == id);
  const total = item ? item.precio * cant : 0;
  document.getElementById('total-sustrato-venta').value = total.toFixed(2);
}

function registrarVentaSustrato(e) {
  e.preventDefault();
  const id = document.getElementById('select-sustrato-venta').value;
  const cant = parseInt(document.getElementById('cant-sustrato-venta').value);
  const item = inventarioSustratos.find(s => s.id == id);

  if (item && item.stock >= cant) {
    item.stock -= cant;
    alert(`Venta registrada con éxito. Total: S/. ${(item.precio * cant).toFixed(2)}`);
    document.getElementById('form-venta-sustrato').reset();
    document.getElementById('total-sustrato-venta').value = "0.00";
    renderSustratos();
  } else {
    alert('Stock insuficiente para realizar esta venta.');
  }
}

// GENERAR Y DESCARGAR/COMPARTIR IMAGEN (COMPATIBLE CON CELULARES Y PC)
async function guardarYDescargarImagen() {
  const bloque = document.getElementById('bloque-imagen');
  if (!bloque) {
    alert("Error: No se encontró la cotización para capturar.");
    return;
  }

  if (typeof html2canvas === 'undefined') {
    alert("La librería de imagen se está cargando. Intenta de nuevo en unos segundos.");
    return;
  }

  try {
    const canvas = await html2canvas(bloque, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false
    });

    const cliente = (document.getElementById('cliente').value.trim() || 'Cotizacion').replace(/[^a-zA-Z0-9]/g, '_');
    const nombreArchivo = `Cotizacion_Vivero_Eliel_${cliente}.png`;

    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert("Error al generar la imagen.");
        return;
      }

      const file = new File([blob], nombreArchivo, { type: 'image/png' });

      // Si es un celular y soporta compartir archivos nativamente
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Cotización Vivero Eliel',
            text: `Cotización para ${cliente}`
          });
        } catch (shareErr) {
          console.log("Compartir cancelado:", shareErr);
        }
      } else {
        // Descarga tradicional en PC
        const enlace = document.createElement('a');
        enlace.download = nombreArchivo;
        enlace.href = URL.createObjectURL(blob);
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
      }
    }, 'image/png');

  } catch (error) {
    console.error("Error al capturar imagen:", error);
    alert("No se pudo generar la imagen. Revisa tu conexión a internet.");
  }
}

// Inicialización al cargar la página
window.onload = function() {
  renderMacetas();
  renderSustratos();
  actualizarListaCotizacionesGuardadas();
  procesarCotizacion();
};
