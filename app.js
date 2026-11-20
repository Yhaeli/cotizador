/* VIVERO ELIEL - Cotizaciones y control de inventario/ventas */
'use strict';

const $ = id => document.getElementById(id);
const dinero = n => Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fechaTexto = v => {
  if (!v) return '—';
  const d = v.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-PE');
};

const fechaISO = v => {
  if (!v) return '';
  const d = v.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const fechaServidor = () => firebase.firestore.FieldValue.serverTimestamp();
const escapar = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const mostrarError = error => {
  console.error(error);
  alert('Ocurrió un error. Verifica tu conexión y las credenciales de Firebase.');
};

// ---------------- NAVEGACIÓN ----------------
function switchTab(tabId, event) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.main-nav .nav-btn').forEach(el => el.classList.remove('active'));
  $('tab-' + tabId)?.classList.add('active');
  event?.currentTarget?.classList.add('active');
}

function cambiarPagina(modulo, pagina, boton) {
  document.querySelectorAll(`#tab-${modulo} .pagina-${modulo}`).forEach(el => el.classList.remove('activa'));
  document.querySelectorAll(`#tab-${modulo} .nav-${modulo}`).forEach(el => el.classList.remove('activo'));
  $(pagina)?.classList.add('activa');
  boton?.classList.add('activo');
}

// ---------------- COTIZADOR ----------------
function procesarCotizacion() {
  const pedido = $('pedido-texto')?.value || '';
  const embalaje = Number($('valEmbalaje')?.value || 0);
  const filas = $('img-tabla-filas');
  if (!filas) return;

  filas.innerHTML = '';
  let subtotal = 0;

  pedido.split('\n').map(x => x.trim()).filter(Boolean).forEach(linea => {
    // Formato admitido: "2 Peperomia - 20.00" (importe total de esa línea)
    const m = linea.match(/^(?:(\d+)\s*x?\s+)?(.+?)\s*[-:]\s*(\d+(?:[.,]\d{1,2})?)$/i);
    const cantidad = m ? Math.max(1, Number(m[1] || 1)) : 1;
    const descripcion = m ? m[2].trim() : linea;
    const totalLinea = m ? Number(m[3].replace(',', '.')) : 0;
    subtotal += totalLinea;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center">${cantidad}</td>
      <td>${escapar(descripcion)}</td>
      <td class="text-right">S/. ${dinero(totalLinea / cantidad)}</td>
      <td class="text-right">S/. ${dinero(totalLinea)}</td>
    `;
    filas.appendChild(tr);
  });

  const total = subtotal + embalaje;
  if ($('img-cliente')) $('img-cliente').textContent = $('cliente')?.value.trim() || '---';
  if ($('img-num-cotizacion')) $('img-num-cotizacion').textContent = $('num-cotizacion')?.value.trim() || '---';
  if ($('img-fecha')) $('img-fecha').textContent = new Date().toLocaleDateString('es-PE');
  if ($('valPlantas')) $('valPlantas').value = subtotal.toFixed(2);
  if ($('valTotal')) $('valTotal').value = total.toFixed(2);
  if ($('img-subtotal')) $('img-subtotal').textContent = dinero(subtotal);
  if ($('img-embalaje')) $('img-embalaje').textContent = dinero(embalaje);
  if ($('img-total')) $('img-total').textContent = dinero(total);
}

async function guardarCotizacion() {
  const cliente = $('cliente')?.value.trim();
  if (!cliente) {
    alert('Ingresa el nombre del cliente para guardar la cotización.');
    return false;
  }
  try {
    await db.collection('cotizaciones').add({
      cliente,
      numCotizacion: $('num-cotizacion')?.value.trim() || '',
      pedidoTexto: $('pedido-texto')?.value || '',
      valEmbalaje: Number($('valEmbalaje')?.value || 0),
      fecha: fechaServidor()
    });
    return true;
  } catch (e) {
    mostrarError(e);
    return false;
  }
}

function escucharCotizaciones() {
  db.collection('cotizaciones').orderBy('fecha', 'desc').onSnapshot(s => {
    const select = $('lista-guardados');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccionar cotización guardada --</option>';
    s.forEach(doc => {
      const d = doc.data();
      const o = document.createElement('option');
      o.value = doc.id;
      o.textContent = `${d.cliente || 'Sin cliente'} (${d.numCotizacion || 'S/N'})`;
      o.dataset.cliente = d.cliente || '';
      o.dataset.num = d.numCotizacion || '';
      o.dataset.pedido = d.pedidoTexto || '';
      o.dataset.embalaje = d.valEmbalaje || 0;
      select.appendChild(o);
    });
  }, mostrarError);
}

function cargarCotizacion() {
  const o = $('lista-guardados')?.selectedOptions[0];
  if (!o?.value) return;
  $('cliente').value = o.dataset.cliente;
  $('num-cotizacion').value = o.dataset.num;
  $('pedido-texto').value = o.dataset.pedido;
  $('valEmbalaje').value = o.dataset.embalaje;
  procesarCotizacion();
}

async function eliminarCotizacion() {
  const id = $('lista-guardados')?.value;
  if (!id) return alert('Selecciona una cotización.');
  if (!confirm('¿Eliminar esta cotización guardada?')) return;
  try {
    await db.collection('cotizaciones').doc(id).delete();
  } catch (e) {
    mostrarError(e);
  }
}

async function copiarWhatsAppYGuardar() {
  procesarCotizacion();
  const ok = await guardarCotizacion();
  if (!ok) return;

  const cliente = $('cliente').value.trim();
  const num = $('num-cotizacion').value.trim();
  const pedido = $('pedido-texto').value.trim();
  const msg = `🌱 *COTIZACIÓN VIVERO ELIEL*\n👤 Cliente: ${cliente}\n${num ? `📄 Cotización: ${num}\n` : ''}📋 *Detalle del pedido:*\n${pedido}\n\n🪴 Total de plantas: S/. ${$('valPlantas').value}\n📦 Embalaje y traslado: S/. ${$('valEmbalaje').value}\n💰 *TOTAL A CANCELAR: S/. ${$('valTotal').value}*\n\n💳 *Métodos de pago:*\n📱 Yape: 981 046 861\n🏦 BCP Cta. Cte.: 19178952536034\nTitular: Arlene Cruzado Llanos`;

  try {
    await navigator.clipboard.writeText(msg);
    alert('Cotización guardada y texto copiado.');
  } catch {
    alert('Cotización guardada. No se pudo copiar automáticamente.');
  }
}

async function guardarYDescargarImagen() {
  procesarCotizacion();
  if (!(await guardarCotizacion())) return;
  if (typeof html2canvas === 'undefined') {
    return alert('No se pudo cargar la herramienta para generar la imagen.');
  }
  try {
    const canvas = await html2canvas($('bloque-imagen'), { scale: 2, useCORS: true });
    const a = document.createElement('a');
    a.download = `Cotizacion_${$('cliente').value.trim() || 'Vivero'}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (e) {
    mostrarError(e);
  }
}

// ---------------- DATOS COMPARTIDOS ----------------
let macetas = [];
let sustratos = [];
let ventasMacetas = [];
let ventasSustratos = [];

function setOpciones(select, items, placeholder, unidad = false) {
  if (!select) return;
  const anterior = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(p => {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = unidad ? `${p.nombre} (${p.unidad})` : p.nombre;
    select.appendChild(o);
  });
  if (items.some(p => p.id === anterior)) select.value = anterior;
}

// ---------------- MACETAS ----------------
function escucharMacetas() {
  db.collection('macetas').onSnapshot(s => {
    macetas = s.docs.map(d => ({ id: d.id, ...d.data() }));
    pintarMacetas();
  }, mostrarError);

  db.collection('ventasMacetas').orderBy('fecha', 'desc').onSnapshot(s => {
    ventasMacetas = s.docs.map(d => ({ id: d.id, ...d.data() }));
    pintarHistorialMacetas();
    resumenMacetas();
  }, mostrarError);

  db.collection('movimientosMacetas').orderBy('fecha', 'desc').onSnapshot(s => {
    const tb = $('movimientosInventarioMacetas');
    if (!tb) return;
    tb.innerHTML = s.docs.map(d => {
      const x = d.data();
      return `<tr>
        <td>${fechaTexto(x.fecha)}</td>
        <td>${escapar(x.producto)}</td>
        <td>${escapar(x.tipo)}</td>
        <td>${dinero(x.cantidad)}</td>
        <td>${escapar(x.detalle || '')}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5">Sin movimientos.</td></tr>';
  }, mostrarError);
}

function pintarMacetas() {
  const tb = $('tablaInventarioMacetas');
  if (tb) {
    tb.innerHTML = macetas.map(p => `<tr>
      <td>${escapar(p.nombre)}</td>
      <td>S/. ${dinero(p.costo)}</td>
      <td>S/. ${dinero(p.precioVenta)}</td>
      <td>${dinero(p.stock)}</td>
      <td>${p.stock <= 0 ? 'Agotado' : p.stock <= 5 ? 'Stock bajo' : 'Disponible'}</td>
      <td>
        <button type="button" class="editar-maceta" data-id="${p.id}">Editar</button>
        <button type="button" class="eliminar-maceta" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="6">No hay macetas registradas.</td></tr>';
  }

  setOpciones($('productoEntradaMaceta'), macetas, 'Seleccionar maceta');

  const tbody = $('productosVentaMacetas');
  if (tbody) {
    tbody.innerHTML = macetas.map(p => `<tr>
      <td>${escapar(p.nombre)}</td>
      <td>${p.stock}</td>
      <td><input type="number" min="0" max="${p.stock}" step="1" value="0" class="cantidad-maceta-venta" data-id="${p.id}" style="width:75px"></td>
      <td>S/. ${dinero(p.precioVenta)}</td>
      <td class="subtotal-maceta" data-id="${p.id}">S/. 0.00</td>
    </tr>`).join('') || '<tr><td colspan="5">No hay productos disponibles.</td></tr>';
  }

  resumenMacetas();
  pintarAlertasMacetas();
}

function resumenMacetas() {
  if ($('totalProductosMacetas')) $('totalProductosMacetas').textContent = macetas.length;
  if ($('totalStockMacetas')) $('totalStockMacetas').textContent = macetas.reduce((a, p) => a + Number(p.stock || 0), 0);
  if ($('totalVendidasMacetas')) {
    $('totalVendidasMacetas').textContent = ventasMacetas.reduce(
      (a, v) => a + (v.productos || []).reduce((b, p) => b + Number(p.cantidad || 0), 0),
      0
    );
  }
  const ahora = new Date();
  const mes = ventasMacetas.filter(v => {
    const d = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
    return !Number.isNaN(d.getTime()) && d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  }).reduce((a, v) => a + Number(v.total || 0), 0);

  if ($('ventasMesMacetas')) $('ventasMesMacetas').textContent = 'S/. ' + dinero(mes);
}

function pintarAlertasMacetas() {
  const a = $('alertasStockMacetas');
  if (!a) return;
  a.innerHTML = macetas.filter(p => Number(p.stock) <= 5)
    .map(p => `<div class="alerta-stock">${escapar(p.nombre)}: ${p.stock} disponibles</div>`)
    .join('') || 'No hay alertas de stock.';
}

function actualizarTotalMacetas() {
  let total = 0;
  document.querySelectorAll('.cantidad-maceta-venta').forEach(i => {
    const p = macetas.find(x => x.id === i.dataset.id);
    const q = Math.max(0, Number(i.value || 0));
    const sub = q * Number(p?.precioVenta || 0);
    total += sub;
    const cel = document.querySelector(`.subtotal-maceta[data-id="${i.dataset.id}"]`);
    if (cel) cel.textContent = 'S/. ' + dinero(sub);
  });
  if ($('totalVentaMacetas')) $('totalVentaMacetas').textContent = 'S/. ' + dinero(total);
}

function pintarHistorialMacetas() {
  const tb = $('historialVentasMacetas');
  if (!tb) return;
  const desde = $('fechaDesdeMacetas')?.value;
  const hasta = $('fechaHastaMacetas')?.value;

  const rows = ventasMacetas.filter(v => {
    const iso = fechaISO(v.fecha);
    if (!iso) return true;
    if (desde && iso < desde) return false;
    if (hasta && iso > hasta) return false;
    return true;
  });

  tb.innerHTML = rows.map(v => `<tr>
    <td>${fechaTexto(v.fecha)}</td>
    <td>${(v.productos || []).map(p => `${escapar(p.nombre)} x${p.cantidad}`).join(', ')}</td>
    <td>${escapar(v.cliente)}</td>
    <td>${escapar(v.metodoPago)}</td>
    <td>S/. ${dinero(v.total)}</td>
    <td>${escapar(v.estado)}</td>
    <td><button type="button" class="borrar-venta-maceta" data-id="${v.id}">Eliminar</button></td>
  </tr>`).join('') || '<tr><td colspan="7">No hay ventas registradas.</td></tr>';
}

// ---------------- SUSTRATOS ----------------
function escucharSustratos() {
  db.collection('sustratos').onSnapshot(s => {
    sustratos = s.docs.map(d => ({ id: d.id, ...d.data() }));
    pintarSustratos();
  }, mostrarError);

  db.collection('ventasSustratos').orderBy('fecha', 'desc').onSnapshot(s => {
    ventasSustratos = s.docs.map(d => ({ id: d.id, ...d.data() }));
    pintarHistorialSustratos();
    resumenSustratos();
  }, mostrarError);

  db.collection('movimientosSustratos').orderBy('fecha', 'desc').onSnapshot(s => {
    const tb = $('movimientosInventarioSustratos');
    if (!tb) return;
    tb.innerHTML = s.docs.map(d => {
      const x = d.data();
      return `<tr>
        <td>${fechaTexto(x.fecha)}</td>
        <td>${escapar(x.producto)}</td>
        <td>${escapar(x.tipo)}</td>
        <td>${dinero(x.cantidad)}</td>
        <td>${escapar(x.unidad)}</td>
        <td>${escapar(x.detalle || '')}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="6">Sin movimientos.</td></tr>';
  }, mostrarError);
}

function pintarSustratos() {
  const filtroTexto = ($('buscarSustrato')?.value || '').toLowerCase().trim();
  const filtrados = sustratos.filter(p => p.nombre.toLowerCase().includes(filtroTexto));

  const tb = $('tablaInventarioSustratos');
  if (tb) {
    tb.innerHTML = filtrados.map(p => `<tr>
      <td>${escapar(p.nombre)}</td>
      <td>${escapar(p.unidad)}</td>
      <td>S/. ${dinero(p.costo)}</td>
      <td>S/. ${dinero(p.precioVenta)}</td>
      <td>${dinero(p.stock)}</td>
      <td>${p.stock <= 0 ? 'Agotado' : p.stock <= 5 ? 'Stock bajo' : 'Disponible'}</td>
      <td>
        <button type="button" class="editar-sustrato" data-id="${p.id}">Editar</button>
        <button type="button" class="eliminar-sustrato" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7">No hay productos registrados.</td></tr>';
  }

  setOpciones($('selectEntradaSustrato'), sustratos, 'Selecciona un producto', true);

  const venta = $('detalleVentaSustratos');
  if (venta) {
    venta.innerHTML = sustratos.map(p => `<tr>
      <td>${escapar(p.nombre)}</td>
      <td>${escapar(p.unidad)}</td>
      <td>${dinero(p.stock)}</td>
      <td><input class="cantidad-sustrato-venta" data-id="${p.id}" type="number" min="0" max="${p.stock}" step="0.01" value="0" style="width:85px"></td>
      <td>S/. ${dinero(p.precioVenta)}</td>
      <td class="subtotal-sustrato" data-id="${p.id}">S/. 0.00</td>
    </tr>`).join('') || '<tr><td colspan="6">No hay productos registrados.</td></tr>';
  }

  pintarAlertasSustratos();
  resumenSustratos();
}

function pintarAlertasSustratos() {
  const bajo = sustratos.filter(p => Number(p.stock) <= 5);
  const tb = $('alertasInventarioSustratos');
  if (tb) {
    tb.innerHTML = bajo.map(p => `<tr>
      <td>${escapar(p.nombre)}</td>
      <td>${dinero(p.stock)}</td>
      <td>${escapar(p.unidad)}</td>
      <td>${p.stock <= 0 ? 'Agotado' : 'Stock bajo'}</td>
    </tr>`).join('') || '<tr><td colspan="4">No hay alertas de stock.</td></tr>';
  }
  if ($('alertasSustratos')) $('alertasSustratos').textContent = bajo.length;
}

function resumenSustratos() {
  if ($('totalProductosSustratos')) $('totalProductosSustratos').textContent = sustratos.length;
  for (const [u, id] of [['kg', 'stockKgSustratos'], ['L', 'stockLitrosSustratos'], ['und', 'stockUnidadesSustratos']]) {
    if ($(id)) {
      $(id).textContent = dinero(sustratos.filter(p => p.unidad === u).reduce((a, p) => a + Number(p.stock || 0), 0));
    }
  }
  const n = new Date();
  const total = ventasSustratos.filter(v => {
    const d = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
    return !Number.isNaN(d.getTime()) && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((a, v) => a + Number(v.total || 0), 0);

  if ($('ventasMesSustratos')) $('ventasMesSustratos').textContent = 'S/. ' + dinero(total);
}

function actualizarTotalSustratos() {
  let total = 0;
  document.querySelectorAll('.cantidad-sustrato-venta').forEach(input => {
    const producto = sustratos.find(p => p.id === input.dataset.id);
    const cantidad = Math.max(0, Number(input.value || 0));
    const subtotal = cantidad * Number(producto?.precioVenta || 0);
    total += subtotal;
    const celda = document.querySelector(`.subtotal-sustrato[data-id="${input.dataset.id}"]`);
    if (celda) celda.textContent = 'S/. ' + dinero(subtotal);
  });
  if ($('totalVentaSustratos')) $('totalVentaSustratos').textContent = 'S/. ' + dinero(total);
}

function pintarHistorialSustratos() {
  const tb = $('historialVentasSustratos');
  if (!tb) return;
  const f = $('filtroFechaSustratos')?.value;
  const rows = ventasSustratos.filter(v => !f || fechaISO(v.fecha) === f);

  tb.innerHTML = rows.map(v => `<tr>
    <td>${fechaTexto(v.fecha)}</td>
    <td>${(v.productos || []).map(p => `${escapar(p.nombre)} x${dinero(p.cantidad)} ${escapar(p.unidad)}`).join(', ')}</td>
    <td>${escapar(v.cliente)}</td>
    <td>${escapar(v.metodoPago)}</td>
    <td>S/. ${dinero(v.total)}</td>
    <td>${escapar(v.estado)}</td>
    <td><button type="button" class="borrar-venta-sustrato" data-id="${v.id}">Eliminar</button></td>
  </tr>`).join('') || '<tr><td colspan="7">No hay ventas registradas.</td></tr>';
}

// ---------------- INICIALIZACIÓN ÚNICA DE EVENTOS ----------------
document.addEventListener('DOMContentLoaded', () => {
  // 1. Navegación interna de Macetas y Sustratos
  document.querySelectorAll('#tab-macetas .nav-macetas').forEach(b => {
    b.addEventListener('click', () => cambiarPagina('macetas', b.dataset.pagina, b));
  });
  document.querySelectorAll('#tab-sustratos .nav-sustratos').forEach(b => {
    b.addEventListener('click', () => cambiarPagina('sustratos', b.dataset.pagina, b));
  });

  // 2. Cotizador en tiempo real
  ['cliente', 'num-cotizacion', 'pedido-texto', 'valEmbalaje'].forEach(id => {
    $(id)?.addEventListener('input', procesarCotizacion);
  });
  procesarCotizacion();

  // 3. Eventos Módulo Macetas
  $('btnAgregarMaceta')?.addEventListener('click', async () => {
    const nombre = $('nombreMaceta').value.trim();
    const costo = Number($('costoMaceta').value);
    const precio = Number($('precioVentaMaceta').value);
    const stock = Number($('stockMaceta').value);

    if (!nombre || $('costoMaceta').value === '' || $('precioVentaMaceta').value === '' || $('stockMaceta').value === '' || ![costo, precio, stock].every(Number.isFinite) || costo < 0 || precio < 0 || !Number.isInteger(stock) || stock < 0) {
      return alert('Completa correctamente todos los campos.');
    }
    try {
      const ref = db.collection('macetas').doc();
      await ref.set({ nombre, costo, precioVenta: precio, stock, fecha: fechaServidor() });
      if (stock > 0) {
        await db.collection('movimientosMacetas').add({
          macetaId: ref.id, producto: nombre, tipo: 'Stock inicial', cantidad: stock, detalle: 'Registro inicial', fecha: fechaServidor()
        });
      }
      $('nombreMaceta').value = $('costoMaceta').value = $('precioVentaMaceta').value = $('stockMaceta').value = '';
      alert('Maceta registrada correctamente.');
    } catch (e) { mostrarError(e); }
  });

  $('tablaInventarioMacetas')?.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('eliminar-maceta')) {
      if (confirm('¿Eliminar esta maceta?')) {
        try { await db.collection('macetas').doc(id).delete(); } catch (err) { mostrarError(err); }
      }
    }
    if (e.target.classList.contains('editar-maceta')) {
      const p = macetas.find(x => x.id === id);
      if (!p) return;
      const nombre = prompt('Nombre:', p.nombre);
      if (nombre === null) return;
      const costo = Number(prompt('Costo:', p.costo));
      const precioVenta = Number(prompt('Precio de venta:', p.precioVenta));
      if (!nombre.trim() || !Number.isFinite(costo) || !Number.isFinite(precioVenta) || costo < 0 || precioVenta < 0) {
        return alert('Datos no válidos.');
      }
      try { await db.collection('macetas').doc(id).update({ nombre: nombre.trim(), costo, precioVenta }); } catch (err) { mostrarError(err); }
    }
  });

  $('btnRegistrarEntradaMaceta')?.addEventListener('click', async () => {
    const id = $('productoEntradaMaceta').value;
    const cantidad = Number($('cantidadEntradaMaceta').value);
    const costo = Number($('costoEntradaMaceta').value);
    const p = macetas.find(x => x.id === id);

    if (!p || !Number.isInteger(cantidad) || cantidad <= 0 || $('costoEntradaMaceta').value === '' || !Number.isFinite(costo) || costo < 0) {
      return alert('Completa los datos de la entrada.');
    }
    try {
      await db.runTransaction(async t => {
        t.update(db.collection('macetas').doc(id), { stock: Number(p.stock || 0) + cantidad, costo });
        const m = db.collection('movimientosMacetas').doc();
        t.set(m, { macetaId: id, producto: p.nombre, tipo: 'Entrada', cantidad, detalle: $('observacionEntradaMaceta').value.trim(), fecha: fechaServidor() });
      });
      $('cantidadEntradaMaceta').value = $('costoEntradaMaceta').value = $('observacionEntradaMaceta').value = '';
      alert('Entrada registrada.');
    } catch (e) { mostrarError(e); }
  });

  $('productosVentaMacetas')?.addEventListener('input', actualizarTotalMacetas);

  $('btnRegistrarVentaMaceta')?.addEventListener('click', async () => {
    const productos = [...document.querySelectorAll('.cantidad-maceta-venta')].map(i => {
      const p = macetas.find(x => x.id === i.dataset.id);
      const q = Number(i.value || 0);
      return p ? { id: p.id, nombre: p.nombre, cantidad: q, precioUnitario: Number(p.precioVenta || 0), subtotal: q * Number(p.precioVenta || 0) } : null;
    }).filter(x => x && x.cantidad > 0);

    if (!productos.length) return alert('Indica la cantidad de al menos una maceta.');
    for (const x of productos) {
      const p = macetas.find(y => y.id === x.id);
      if (x.cantidad > p.stock) return alert(`Stock insuficiente para ${p.nombre}.`);
    }

    const total = productos.reduce((a, p) => a + p.subtotal, 0);
    const medioPago = $('medioPagoMacetas').value;

    try {
      await db.runTransaction(async t => {
        for (const x of productos) {
          t.update(db.collection('macetas').doc(x.id), { stock: macetas.find(p => p.id === x.id).stock - x.cantidad });
        }
        const v = db.collection('ventasMacetas').doc();
        t.set(v, {
          productos, total,
          cliente: $('clienteVentaMaceta').value.trim() || 'Público general',
          metodoPago: medioPago,
          estado: medioPago === 'Pago Pendiente' ? 'Pendiente' : 'Pagado',
          fecha: fechaServidor()
        });
        for (const x of productos) {
          const m = db.collection('movimientosMacetas').doc();
          t.set(m, { macetaId: x.id, producto: x.nombre, tipo: 'Venta', cantidad: x.cantidad, detalle: 'Venta registrada', fecha: fechaServidor() });
        }
      });
      document.querySelectorAll('.cantidad-maceta-venta').forEach(i => i.value = 0);
      $('clienteVentaMaceta').value = '';
      actualizarTotalMacetas();
      alert('Venta registrada correctamente.');
    } catch (e) { mostrarError(e); }
  });

  $('btnFiltrarVentasMacetas')?.addEventListener('click', pintarHistorialMacetas);
  $('btnLimpiarFiltrosMacetas')?.addEventListener('click', () => {
    if ($('fechaDesdeMacetas')) $('fechaDesdeMacetas').value = '';
    if ($('fechaHastaMacetas')) $('fechaHastaMacetas').value = '';
    pintarHistorialMacetas();
  });

  $('historialVentasMacetas')?.addEventListener('click', async e => {
    if (!e.target.classList.contains('borrar-venta-maceta')) return;
    if (!confirm('¿Eliminar el registro? El stock no se modificará.')) return;
    try { await db.collection('ventasMacetas').doc(e.target.dataset.id).delete(); } catch (err) { mostrarError(err); }
  });

  // 4. Eventos Módulo Sustratos
  $('buscarSustrato')?.addEventListener('input', pintarSustratos);

  $('btnAgregarSustrato')?.addEventListener('click', async () => {
    const nombre = $('nombreSustrato').value.trim();
    const unidad = $('unidadSustrato').value;
    const costo = Number($('costoSustrato').value);
    const precioVenta = Number($('precioVentaSustrato').value);
    const stock = Number($('stockSustrato').value);

    if (!nombre || !unidad || $('costoSustrato').value === '' || $('precioVentaSustrato').value === '' || $('stockSustrato').value === '' || ![costo, precioVenta, stock].every(Number.isFinite) || costo < 0 || precioVenta < 0 || stock < 0) {
      return alert('Completa correctamente todos los campos.');
    }
    try {
      const ref = db.collection('sustratos').doc();
      await ref.set({ nombre, unidad, costo, precioVenta, stock, fecha: fechaServidor() });
      if (stock > 0) {
        await db.collection('movimientosSustratos').add({
          sustratoId: ref.id, producto: nombre, tipo: 'Stock inicial', cantidad: stock, unidad, detalle: 'Registro inicial', fecha: fechaServidor()
        });
      }
      $('nombreSustrato').value = $('costoSustrato').value = $('precioVentaSustrato').value = $('stockSustrato').value = '';
      $('unidadSustrato').value = '';
      alert('Producto registrado.');
    } catch (e) { mostrarError(e); }
  });

  $('tablaInventarioSustratos')?.addEventListener('click', async e => {
    const id = e.target.dataset.id;
    if (!id) return;
    if (e.target.classList.contains('eliminar-sustrato')) {
      if (confirm('¿Eliminar este producto?')) {
        try { await db.collection('sustratos').doc(id).delete(); } catch (err) { mostrarError(err); }
      }
    }
    if (e.target.classList.contains('editar-sustrato')) {
      const p = sustratos.find(x => x.id === id);
      if (!p) return;
      const nombre = prompt('Nombre:', p.nombre);
      if (nombre === null) return;
      const costo = Number(prompt('Costo:', p.costo));
      const precioVenta = Number(prompt('Precio de venta:', p.precioVenta));
      if (!nombre.trim() || !Number.isFinite(costo) || !Number.isFinite(precioVenta) || costo < 0 || precioVenta < 0) {
        return alert('Datos no válidos.');
      }
      try { await db.collection('sustratos').doc(id).update({ nombre: nombre.trim(), costo, precioVenta }); } catch (err) { mostrarError(err); }
    }
  });

  $('btnRegistrarEntradaSustrato')?.addEventListener('click', async () => {
    const id = $('selectEntradaSustrato').value;
    const cantidad = Number($('cantidadEntradaSustrato').value);
    const costo = Number($('costoEntradaSustrato').value);
    const observacion = $('observacionEntradaSustrato').value.trim();

    if (!id || !Number.isFinite(cantidad) || cantidad <= 0 || $('costoEntradaSustrato').value === '' || !Number.isFinite(costo) || costo < 0) {
      return alert('Completa correctamente los datos de la entrada.');
    }

    try {
      await db.runTransaction(async transaction => {
        const productoRef = db.collection('sustratos').doc(id);
        const productoSnap = await transaction.get(productoRef);
        if (!productoSnap.exists) throw new Error('El producto ya no existe.');

        const producto = productoSnap.data();
        const nuevoStock = Number(producto.stock || 0) + cantidad;
        const movimientoRef = db.collection('movimientosSustratos').doc();
        const entradaRef = db.collection('entradasSustratos').doc();

        transaction.update(productoRef, { stock: nuevoStock, costo });
        transaction.set(movimientoRef, {
          sustratoId: id, producto: producto.nombre, tipo: 'Entrada', cantidad, unidad: producto.unidad, detalle: observacion, fecha: fechaServidor()
        });
        transaction.set(entradaRef, {
          sustratoId: id, producto: producto.nombre, cantidad, unidad: producto.unidad, costoUnitario: costo, total: cantidad * costo, fecha: fechaServidor()
        });
      });

      $('cantidadEntradaSustrato').value = '';
      $('costoEntradaSustrato').value = '';
      $('observacionEntradaSustrato').value = '';
      alert('Entrada registrada correctamente.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo registrar la entrada.');
    }
  });

  $('detalleVentaSustratos')?.addEventListener('input', actualizarTotalSustratos);

  $('btnRegistrarVentaSustrato')?.addEventListener('click', async () => {
    const cantidades = [...document.querySelectorAll('.cantidad-sustrato-venta')];
    const productos = cantidades.map(input => {
      const cantidad = Number(input.value || 0);
      const producto = sustratos.find(p => p.id === input.dataset.id);
      if (!producto || cantidad === 0) return null;
      return {
        id: producto.id,
        nombre: producto.nombre,
        unidad: producto.unidad,
        cantidad,
        precioUnitario: Number(producto.precioVenta || 0),
        subtotal: cantidad * Number(producto.precioVenta || 0)
      };
    }).filter(Boolean);

    if (!productos.length) return alert('Indica la cantidad de al menos un producto.');
    if (productos.some(p => !Number.isFinite(p.cantidad) || p.cantidad <= 0)) {
      return alert('Verifica las cantidades ingresadas.');
    }

    const total = productos.reduce((suma, p) => suma + p.subtotal, 0);
    const cliente = $('clienteVentaSustrato').value.trim() || 'Público general';
    const metodoPago = $('metodoPagoSustrato').value;

    try {
      await db.runTransaction(async transaction => {
        const referencias = productos.map(p => db.collection('sustratos').doc(p.id));
        const documentos = await Promise.all(referencias.map(ref => transaction.get(ref)));

        documentos.forEach((doc, index) => {
          const producto = productos[index];
          if (!doc.exists) throw new Error(`El producto ${producto.nombre} ya no existe.`);
          const stockActual = Number(doc.data().stock || 0);
          if (producto.cantidad > stockActual) {
            throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stockActual} ${producto.unidad}.`);
          }
        });

        documentos.forEach((doc, index) => {
          const producto = productos[index];
          const stockActual = Number(doc.data().stock || 0);
          transaction.update(referencias[index], { stock: stockActual - producto.cantidad });
        });

        const ventaRef = db.collection('ventasSustratos').doc();
        transaction.set(ventaRef, {
          productos,
          total,
          cliente,
          metodoPago,
          estado: metodoPago === 'Pago Pendiente' ? 'Pendiente' : 'Pagado',
          fecha: fechaServidor()
        });

        productos.forEach(producto => {
          const movimientoRef = db.collection('movimientosSustratos').doc();
          transaction.set(movimientoRef, {
            sustratoId: producto.id,
            producto: producto.nombre,
            tipo: 'Venta',
            cantidad: producto.cantidad,
            unidad: producto.unidad,
            detalle: 'Venta registrada',
            fecha: fechaServidor()
          });
        });
      });

      cantidades.forEach(input => input.value = 0);
      $('clienteVentaSustrato').value = '';
      actualizarTotalSustratos();
      alert('Venta registrada correctamente.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo registrar la venta.');
    }
  });

  $('filtroFechaSustratos')?.addEventListener('change', pintarHistorialSustratos);

  $('historialVentasSustratos')?.addEventListener('click', async e => {
    if (!e.target.classList.contains('borrar-venta-sustrato')) return;
    if (!confirm('¿Eliminar el registro? El stock no se modificará.')) return;
    try { await db.collection('ventasSustratos').doc(e.target.dataset.id).delete(); } catch (err) { mostrarError(err); }
  });

  $('filtroMovimientoSustratos')?.addEventListener('change', e => {
    const filtro = e.target.value;
    db.collection('movimientosSustratos').orderBy('fecha', 'desc').get().then(s => {
      const tb = $('movimientosInventarioSustratos');
      const rows = s.docs.map(d => d.data()).filter(x =>
        filtro === 'todos' ||
        (filtro === 'entrada' && x.tipo === 'Entrada') ||
        (filtro === 'venta' && x.tipo === 'Venta') ||
        (filtro === 'devolucion' && x.tipo === 'Devolución')
      );
      if (tb) {
        tb.innerHTML = rows.map(x => `<tr>
          <td>${fechaTexto(x.fecha)}</td>
          <td>${escapar(x.producto)}</td>
          <td>${escapar(x.tipo)}</td>
          <td>${dinero(x.cantidad)}</td>
          <td>${escapar(x.unidad)}</td>
          <td>${escapar(x.detalle || '')}</td>
        </tr>`).join('') || '<tr><td colspan="6">Sin movimientos.</td></tr>';
      }
    }).catch(mostrarError);
  });

  // 5. Conexión inicial con Firebase
  if (typeof firebase === 'undefined' || !firebase.apps?.length) {
    console.error('Firebase no está configurado.');
    return;
  }

  escucharCotizaciones();
  escucharMacetas();
  escucharSustratos();
});
