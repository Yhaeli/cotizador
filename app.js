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
  .then(() => console.log("Cotización guardada en Firestore."))
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
  procesarCotizacion();
  guardarCotizacion();

  const cliente = document.getElementById('cliente').value.trim() || '---';
  const numCotizacion = document.getElementById('num-cotizacion').value.trim();
  const pedido = document.getElementById('pedido-texto').value.trim();
  const valPlantas = (parseFloat(document.getElementById('valPlantas').value) || 0).toFixed(2);
  const valEmbalaje = (parseFloat(document.getElementById('valEmbalaje').value) || 0).toFixed(2);
  const total = (parseFloat(document.getElementById('valTotal').value) || 0).toFixed(2);

  const lineaCotizacion = numCotizacion ? `📄 Cotización: ${numCotizacion}\n` : '';

  const mensaje = `🌱 *COTIZACIÓN VIVERO ELIEL*\n` +
                  `👤 Cliente: ${cliente}\n` +
                  lineaCotizacion +
                  `📋 *Detalle del pedido:*\n${pedido}\n\n` +
                  `🪴 Total de plantas: S/. ${valPlantas}\n` +
                  `📦 Embalaje y traslado: S/. ${valEmbalaje}\n` +
                  `💰 *TOTAL A CANCELAR: S/. ${total}*\n\n` +
                  `💳 *Métodos de pago:*\n` +
                  `📱 Yape: 981 046 861\n` +
                  `🏦 BCP Cta. Cte.: 19178952536034\n` +
                  `💥 Titular: Arlene Cruzado Llanos`;

  navigator.clipboard.writeText(mensaje)
    .then(() => alert("¡Texto copiado al portapapeles (con embalaje incluido) y cotización guardada!"))
    .catch(() => alert("Cotización guardada. (No se pudo copiar el texto automáticamente)"));
}

function guardarYDescargarImagen() {
  procesarCotizacion();
  guardarCotizacion();
  const bloque = document.getElementById('bloque-imagen');

  if (typeof html2canvas !== 'undefined') {
    html2canvas(bloque, {
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0
    }).then(canvas => {
      const enlace = document.createElement('a');
      enlace.download = `Cotizacion_${document.getElementById('cliente').value.trim() || 'Vivero'}.png`;
      enlace.href = canvas.toDataURL('image/png');
      enlace.click();
    });
  } else {
    alert("Librería de imagen no disponible.");
  }
}


// ==========================================
// MÓDULO DE MACETAS - VIVERO ELIEL
// ==========================================

(() => {

  // ==========================================
  // 1. REFERENCIAS HTML
  // ==========================================

  const $ = id => document.getElementById(id);

  const nombreMaceta = $('nombreMaceta');
  const costoMaceta = $('costoMaceta');
  const precioVentaMaceta = $('precioVentaMaceta');
  const stockMaceta = $('stockMaceta');
  const btnAgregarMaceta = $('btnAgregarMaceta');

  const tablaInventarioMacetas = $('tablaInventarioMacetas');

  const productoEntradaMaceta = $('productoEntradaMaceta');
  const cantidadEntradaMaceta = $('cantidadEntradaMaceta');
  const costoEntradaMaceta = $('costoEntradaMaceta');
  const observacionEntradaMaceta = $('observacionEntradaMaceta');
  const btnRegistrarEntradaMaceta = $('btnRegistrarEntradaMaceta');

  const productoVentaMaceta = $('productoVentaMaceta');
  const cantidadVentaMaceta = $('cantidadVentaMaceta');
  const precioUnitarioVentaMaceta = $('precioUnitarioVentaMaceta');
  const btnAgregarProductoVentaMaceta = $('btnAgregarProductoVentaMaceta');

  const clienteVentaMaceta = $('clienteVentaMaceta');
  const medioPagoMacetas = $('medioPagoMacetas');
  const btnRegistrarVentaMaceta = $('btnRegistrarVentaMaceta');

  const detalleVentaMacetas = $('detalleVentaMacetas');
  const totalVentaMacetas = $('totalVentaMacetas');

  const historialVentasMacetas = $('historialVentasMacetas');
  const movimientosInventarioMacetas = $('movimientosInventarioMacetas');

  const fechaDesdeMacetas = $('fechaDesdeMacetas');
  const fechaHastaMacetas = $('fechaHastaMacetas');

  const btnFiltrarVentasMacetas = $('btnFiltrarVentasMacetas');
  const btnLimpiarFiltrosMacetas = $('btnLimpiarFiltrosMacetas');

  const totalProductosMacetas = $('totalProductosMacetas');
  const totalStockMacetas = $('totalStockMacetas');
  const totalVendidasMacetas = $('totalVendidasMacetas');
  const ventasMesMacetas = $('ventasMesMacetas');


  // ==========================================
  // 2. VARIABLES
  // ==========================================

  let inventarioMacetas = [];
  let ventasMacetas = [];
  let movimientosMacetas = [];

  let carritoMacetas = [];

  const dinero = valor =>
    Number(valor || 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const timestamp = () =>
    firebase.firestore.FieldValue.serverTimestamp();

  function fechaReal(valor) {

    if (!valor) return null;

    if (valor.toDate) return valor.toDate();

    if (valor instanceof Date) return valor;

    const fecha = new Date(valor);

    return isNaN(fecha.getTime()) ? null : fecha;
  }

  function fechaTexto(valor) {

    const fecha = fechaReal(valor);

    if (!fecha) return 'Pendiente';

    return fecha.toLocaleDateString('es-PE');

  }

  function escaparHTML(texto) {

    return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[caracter]);

  }

  function mostrarError(error) {

    console.error('Error en módulo de macetas:', error);

    alert(
      'Ocurrió un problema al realizar la operación. ' +
      'Revisa tu conexión e inténtalo nuevamente.'
    );

  }


  // ==========================================
  // 3. REGISTRAR NUEVA MACETA
  // ==========================================

  if (btnAgregarMaceta) {

    btnAgregarMaceta.addEventListener('click', async () => {

      const nombre = nombreMaceta.value.trim();
      const costo = Number(costoMaceta.value);
      const precio = Number(precioVentaMaceta.value);
      const stock = Number(stockMaceta.value);

      if (
        !nombre ||
        costo < 0 ||
        precio < 0 ||
        !Number.isFinite(costo) ||
        !Number.isFinite(precio) ||
        !Number.isInteger(stock) ||
        stock < 0 ||
        stockMaceta.value === ''
      ) {

        alert('Completa correctamente todos los campos.');
        return;

      }

      try {

        const referencia = db.collection('macetas').doc();

        const movimiento = db.collection('movimientosMacetas').doc();

        await db.runTransaction(async transaction => {

          transaction.set(referencia, {

            nombre,
            costo,
            precioVenta: precio,
            stock,
            fecha: timestamp()

          });

          if (stock > 0) {

            transaction.set(movimiento, {

              producto: nombre,
              macetaId: referencia.id,
              tipo: 'Stock inicial',
              cantidad: stock,
              detalle: 'Registro inicial del inventario',
              fecha: timestamp()

            });

          }

        });

        nombreMaceta.value = '';
        costoMaceta.value = '';
        precioVentaMaceta.value = '';
        stockMaceta.value = '';

        alert('Maceta registrada correctamente.');

      } catch (error) {

        mostrarError(error);

      }

    });

  }


  // ==========================================
  // 4. MOSTRAR INVENTARIO
  // ==========================================

  db.collection('macetas').onSnapshot(snapshot => {

    inventarioMacetas = [];

    snapshot.forEach(doc => {

      inventarioMacetas.push({

        id: doc.id,
        ...doc.data()

      });

    });

    mostrarInventarioMacetas();
    cargarSelectoresMacetas();
    actualizarResumenMacetas();

  }, mostrarError);


  function mostrarInventarioMacetas() {

    if (!tablaInventarioMacetas) return;

    tablaInventarioMacetas.innerHTML = '';

    inventarioMacetas.forEach(item => {

      const stock = Number(item.stock || 0);
      const costo = Number(item.costo || 0);

      // Compatibilidad con productos antiguos.
      // Si no tienen precioVenta, se utiliza costo como precio temporal.
      const precio = Number(
        item.precioVenta ?? item.costo ?? 0
      );

      let estado = 'Disponible';

      if (stock <= 0) {

        estado = 'Agotado';

      } else if (stock <= 5) {

        estado = 'Stock bajo';

      }

      const fila = document.createElement('tr');

      fila.innerHTML = `

        <td>${escaparHTML(item.nombre)}</td>

        <td>S/. ${dinero(costo)}</td>

        <td>S/. ${dinero(precio)}</td>

        <td>${stock}</td>

        <td>${estado}</td>

        <td>

          <button
            type="button"
            class="btn-editar-maceta"
            data-id="${item.id}"
          >
            Editar
          </button>

          <button
            type="button"
            class="btn-eliminar-maceta"
            data-id="${item.id}"
          >
            Eliminar
          </button>

        </td>

      `;

      tablaInventarioMacetas.appendChild(fila);

    });

  }


  // ==========================================
  // 5. EDITAR PRODUCTO
  // ==========================================

  if (tablaInventarioMacetas) {

    tablaInventarioMacetas.addEventListener('click', async event => {

      const botonEditar = event.target.closest('.btn-editar-maceta');
      const botonEliminar = event.target.closest('.btn-eliminar-maceta');

      if (botonEditar) {

        const id = botonEditar.dataset.id;

        const producto = inventarioMacetas.find(item => item.id === id);

        if (!producto) return;

        const nombre = prompt('Nombre del producto:', producto.nombre);

        if (nombre === null) return;

        const costo = prompt(
          'Costo de compra:',
          producto.costo ?? 0
        );

        if (costo === null) return;

        const precio = prompt(
          'Precio de venta:',
          producto.precioVenta ?? producto.costo ?? 0
        );

        if (precio === null) return;

        const costoNumero = Number(costo);
        const precioNumero = Number(precio);

        if (
          !nombre.trim() ||
          !Number.isFinite(costoNumero) ||
          !Number.isFinite(precioNumero) ||
          costoNumero < 0 ||
          precioNumero < 0
        ) {

          alert('Los datos ingresados no son válidos.');
          return;

        }

        try {

          await db.collection('macetas').doc(id).update({

            nombre: nombre.trim(),
            costo: costoNumero,
            precioVenta: precioNumero

          });

          alert('Producto actualizado correctamente.');

        } catch (error) {

          mostrarError(error);

        }

      }


      if (botonEliminar) {

        const id = botonEliminar.dataset.id;

        const producto = inventarioMacetas.find(item => item.id === id);

        if (!producto) return;

        if (Number(producto.stock || 0) !== 0) {

          alert(
            'No puedes eliminar una maceta que todavía tiene stock. ' +
            'Primero registra su salida o ajusta el inventario.'
          );

          return;

        }

        if (!confirm('¿Deseas eliminar este producto del inventario?')) {
          return;
        }

        try {

          await db.collection('macetas').doc(id).delete();

          alert('Producto eliminado.');

        } catch (error) {

          mostrarError(error);

        }

      }

    });

  }


  // ==========================================
  // 6. CARGAR SELECTORES
  // ==========================================

  function cargarSelectoresMacetas() {

    const selectores = [
      productoEntradaMaceta,
      productoVentaMaceta
    ];

    selectores.forEach(select => {

      if (!select) return;

      const valorAnterior = select.value;

      select.innerHTML = '<option value="">Seleccionar maceta</option>';

      inventarioMacetas.forEach(item => {

        const option = document.createElement('option');

        option.value = item.id;

        option.textContent =
          `${item.nombre} (Stock: ${item.stock || 0})`;

        select.appendChild(option);

      });

      if (inventarioMacetas.some(item => item.id === valorAnterior)) {

        select.value = valorAnterior;

      }

    });

  }


  // ==========================================
  // 7. REGISTRAR ENTRADA DE INVENTARIO
  // ==========================================

  if (btnRegistrarEntradaMaceta) {

    btnRegistrarEntradaMaceta.addEventListener('click', async () => {

      const id = productoEntradaMaceta.value;
      const cantidad = Number(cantidadEntradaMaceta.value);
      const costo = Number(costoEntradaMaceta.value);
      const observacion = observacionEntradaMaceta.value.trim();

      if (
        !id ||
        !Number.isInteger(cantidad) ||
        cantidad <= 0 ||
        !Number.isFinite(costo) ||
        costo < 0 ||
        costoEntradaMaceta.value === ''
      ) {

        alert('Completa correctamente los datos de la entrada.');
        return;

      }

      try {

        const productoRef = db.collection('macetas').doc(id);

        const entradaRef = db.collection('entradasMacetas').doc();

        const movimientoRef = db.collection('movimientosMacetas').doc();

        await db.runTransaction(async transaction => {

          const productoDoc = await transaction.get(productoRef);

          if (!productoDoc.exists) {

            throw new Error('El producto no existe.');

          }

          const producto = productoDoc.data();

          const nuevoStock = Number(producto.stock || 0) + cantidad;

          transaction.update(productoRef, {

            stock: nuevoStock

          });

          transaction.set(entradaRef, {

            macetaId: id,
            producto: producto.nombre,
            cantidad,
            costoUnitario: costo,
            observacion,
            fecha: timestamp()

          });

          transaction.set(movimientoRef, {

            macetaId: id,
            producto: producto.nombre,
            tipo: 'Entrada',
            cantidad,
            detalle: observacion || 'Ingreso de mercadería',
            fecha: timestamp()

          });

        });

        cantidadEntradaMaceta.value = '';
        costoEntradaMaceta.value = '';
        observacionEntradaMaceta.value = '';
        productoEntradaMaceta.value = '';

        alert('Entrada registrada y stock actualizado.');

      } catch (error) {

        mostrarError(error);

      }

    });

  }


  // ==========================================
  // 8. CARGAR PRECIO DE VENTA
  // ==========================================

  if (productoVentaMaceta) {

    productoVentaMaceta.addEventListener('change', () => {

      const producto = inventarioMacetas.find(
        item => item.id === productoVentaMaceta.value
      );

      precioUnitarioVentaMaceta.value = producto
        ? Number(producto.precioVenta ?? producto.costo ?? 0)
        : '';

    });

  }


  // ==========================================
  // 9. AGREGAR PRODUCTOS AL CARRITO
  // ==========================================

  if (btnAgregarProductoVentaMaceta) {

    btnAgregarProductoVentaMaceta.addEventListener('click', () => {

      const id = productoVentaMaceta.value;
      const cantidad = Number(cantidadVentaMaceta.value);
      const precio = Number(precioUnitarioVentaMaceta.value);

      const producto = inventarioMacetas.find(item => item.id === id);

      if (!producto) {

        alert('Selecciona una maceta.');
        return;

      }

      if (
        !Number.isInteger(cantidad) ||
        cantidad <= 0 ||
        !Number.isFinite(precio) ||
        precio < 0 ||
        precioUnitarioVentaMaceta.value === ''
      ) {

        alert('Ingresa una cantidad y un precio válidos.');
        return;

      }

      const existente = carritoMacetas.find(item => item.macetaId === id);

      const cantidadAcumulada =
        cantidad + (existente ? existente.cantidad : 0);

      if (cantidadAcumulada > Number(producto.stock || 0)) {

        alert(
          `Stock insuficiente. Disponible: ${producto.stock || 0}`
        );

        return;

      }

      if (existente) {

        existente.cantidad += cantidad;
        existente.precioUnit = precio;
        existente.subtotal = existente.cantidad * precio;

      } else {

        carritoMacetas.push({

          macetaId: id,
          producto: producto.nombre,
          cantidad,
          precioUnit: precio,
          subtotal: cantidad * precio

        });

      }

      mostrarCarritoMacetas();

      productoVentaMaceta.value = '';
      cantidadVentaMaceta.value = '';
      precioUnitarioVentaMaceta.value = '';

    });

  }


  // ==========================================
  // 10. MOSTRAR CARRITO
  // ==========================================

  function mostrarCarritoMacetas() {

    if (!detalleVentaMacetas) return;

    detalleVentaMacetas.innerHTML = '';

    let total = 0;

    carritoMacetas.forEach((item, index) => {

      total += item.subtotal;

      const fila = document.createElement('tr');

      fila.innerHTML = `

        <td>${escaparHTML(item.producto)}</td>

        <td>${item.cantidad}</td>

        <td>S/. ${dinero(item.precioUnit)}</td>

        <td>S/. ${dinero(item.subtotal)}</td>

        <td>

          <button
            type="button"
            class="btn-quitar-carrito"
            data-index="${index}"
          >
            Quitar
          </button>

        </td>

      `;

      detalleVentaMacetas.appendChild(fila);

    });

    totalVentaMacetas.textContent = `S/. ${dinero(total)}`;

  }


  if (detalleVentaMacetas) {

    detalleVentaMacetas.addEventListener('click', event => {

      const boton = event.target.closest('.btn-quitar-carrito');

      if (!boton) return;

      carritoMacetas.splice(Number(boton.dataset.index), 1);

      mostrarCarritoMacetas();

    });

  }


  // ==========================================
  // 11. REGISTRAR VENTA COMPLETA
  // ==========================================

  if (btnRegistrarVentaMaceta) {

    btnRegistrarVentaMaceta.addEventListener('click', async () => {

      if (carritoMacetas.length === 0) {

        alert('Agrega al menos un producto a la venta.');
        return;

      }

      const cliente =
        clienteVentaMaceta.value.trim() || 'Cliente Anónimo';

      const pago = medioPagoMacetas.value;

      const items = carritoMacetas.map(item => ({ ...item }));

      const total = items.reduce(
        (suma, item) => suma + item.subtotal,
        0
      );

      try {

        const ventaRef = db.collection('ventasMacetas').doc();

        const referencias = items.map(item => ({
          item,
          productoRef: db.collection('macetas').doc(item.macetaId),
          movimientoRef: db.collection('movimientosMacetas').doc()
        }));

        await db.runTransaction(async transaction => {

          // Primero se leen todos los productos.
          const documentos = await Promise.all(
            referencias.map(ref => transaction.get(ref.productoRef))
          );

          // Se comprueba el stock de todos los productos.
          documentos.forEach((doc, index) => {

            if (!doc.exists) {

              throw new Error('Uno de los productos ya no existe.');

            }

            const stockActual = Number(doc.data().stock || 0);

            if (stockActual < referencias[index].item.cantidad) {

              throw new Error(
                `Stock insuficiente para ${referencias[index].item.producto}.`
              );

            }

          });

          // Después de validar, se realizan las escrituras.
          referencias.forEach((ref, index) => {

            const producto = documentos[index].data();

            const nuevoStock =
              Number(producto.stock || 0) - ref.item.cantidad;

            transaction.update(ref.productoRef, {

              stock: nuevoStock

            });

            transaction.set(ref.movimientoRef, {

              macetaId: ref.item.macetaId,
              producto: producto.nombre,
              tipo: 'Venta',
              cantidad: ref.item.cantidad,
              detalle: 'Salida por venta',
              ventaId: ventaRef.id,
              fecha: timestamp()

            });

          });

          transaction.set(ventaRef, {

            items,

            // Campos compatibles con el historial antiguo.
            producto: items.length === 1
              ? items[0].producto
              : `${items.length} productos`,

            cantidad: items.reduce(
              (suma, item) => suma + item.cantidad,
              0
            ),

            precioUnit: items.length === 1
              ? items[0].precioUnit
              : null,

            total,
            cliente,
            metodoPago: pago,
            estado: 'Registrada',
            fecha: timestamp()

          });

        });

        carritoMacetas = [];

        mostrarCarritoMacetas();

        clienteVentaMaceta.value = '';

        medioPagoMacetas.value = 'Efectivo';

        alert('Venta registrada correctamente. El stock se actualizó.');

      } catch (error) {

        mostrarError(error);

      }

    });

  }


  // ==========================================
  // 12. HISTORIAL DE VENTAS
  // ==========================================

  db.collection('ventasMacetas')
    .orderBy('fecha', 'desc')
    .onSnapshot(snapshot => {

      ventasMacetas = [];

      snapshot.forEach(doc => {

        ventasMacetas.push({

          id: doc.id,
          ...doc.data()

        });

      });

      mostrarHistorialVentasMacetas();
      actualizarResumenMacetas();

    }, mostrarError);


  function mostrarHistorialVentasMacetas() {

    if (!historialVentasMacetas) return;

    historialVentasMacetas.innerHTML = '';

    const desde = fechaDesdeMacetas?.value
      ? new Date(`${fechaDesdeMacetas.value}T00:00:00`)
      : null;

    const hasta = fechaHastaMacetas?.value
      ? new Date(`${fechaHastaMacetas.value}T23:59:59.999`)
      : null;

    const ventasFiltradas = ventasMacetas.filter(venta => {

      const fecha = fechaReal(venta.fecha);

      if (!fecha) return !desde && !hasta;

      if (desde && fecha < desde) return false;

      if (hasta && fecha > hasta) return false;

      return true;

    });

    ventasFiltradas.forEach(venta => {

      const items = Array.isArray(venta.items)
        ? venta.items
        : [{
            producto: venta.producto || 'Venta antigua',
            cantidad: venta.cantidad || 0
          }];

      const productos = items.map(item =>
        `${escaparHTML(item.producto)} x${item.cantidad}`
      ).join('<br>');

      const anulada = venta.estado === 'Anulada';

      const fila = document.createElement('tr');

      fila.innerHTML = `

        <td>${fechaTexto(venta.fecha)}</td>

        <td>${productos}</td>

        <td>${escaparHTML(venta.cliente || 'Cliente Anónimo')}</td>

        <td>S/. ${dinero(venta.total)}</td>

        <td>${escaparHTML(venta.metodoPago || '-')}</td>

        <td>${anulada ? 'Anulada' : 'Registrada'}</td>

        <td>

          ${
            anulada
              ? '-'
              : Array.isArray(venta.items)
                ? `<button
                     type="button"
                     class="btn-anular-venta"
                     data-id="${venta.id}"
                   >Anular</button>`
                : 'Venta antigua'
          }

        </td>

      `;

      historialVentasMacetas.appendChild(fila);

    });

  }


  // ==========================================
  // 13. FILTRAR HISTORIAL
  // ==========================================

  if (btnFiltrarVentasMacetas) {

    btnFiltrarVentasMacetas.addEventListener('click', () => {

      if (
        fechaDesdeMacetas.value &&
        fechaHastaMacetas.value &&
        fechaDesdeMacetas.value > fechaHastaMacetas.value
      ) {

        alert('La fecha inicial no puede ser posterior a la fecha final.');
        return;

      }

      mostrarHistorialVentasMacetas();

    });

  }


  if (btnLimpiarFiltrosMacetas) {

    btnLimpiarFiltrosMacetas.addEventListener('click', () => {

      fechaDesdeMacetas.value = '';
      fechaHastaMacetas.value = '';

      mostrarHistorialVentasMacetas();

    });

  }


  // ==========================================
  // 14. ANULAR VENTA Y DEVOLVER STOCK
  // ==========================================

  if (historialVentasMacetas) {

    historialVentasMacetas.addEventListener('click', async event => {

      const boton = event.target.closest('.btn-anular-venta');

      if (!boton) return;

      const id = boton.dataset.id;

      if (!confirm(
        '¿Deseas anular esta venta? Las unidades volverán al inventario.'
      )) {

        return;

      }

      try {

        const ventaRef = db.collection('ventasMacetas').doc(id);

        await db.runTransaction(async transaction => {

          const ventaDoc = await transaction.get(ventaRef);

          if (!ventaDoc.exists) {

            throw new Error('La venta no existe.');

          }

          const venta = ventaDoc.data();

          if (venta.estado === 'Anulada') {

            throw new Error('Esta venta ya fue anulada.');

          }

          if (!Array.isArray(venta.items)) {

            throw new Error(
              'Esta es una venta antigua y no contiene los identificadores ' +
              'de sus productos. No se puede devolver el stock automáticamente.'
            );

          }

          const referencias = venta.items.map(item => ({

            item,

            productoRef: db.collection('macetas').doc(item.macetaId),

            movimientoRef: db.collection('movimientosMacetas').doc()

          }));

          // Leer todos los productos antes de realizar escrituras.
          const documentos = await Promise.all(

            referencias.map(ref => transaction.get(ref.productoRef))

          );

          documentos.forEach((doc, index) => {

            if (!doc.exists) {

              throw new Error(
                `No se encontró el producto ${referencias[index].item.producto}.`
              );

            }

          });

          referencias.forEach((ref, index) => {

            const producto = documentos[index].data();

            transaction.update(ref.productoRef, {

              stock:
                Number(producto.stock || 0) + ref.item.cantidad

            });

            transaction.set(ref.movimientoRef, {

              macetaId: ref.item.macetaId,
              producto: producto.nombre,
              tipo: 'Anulación de venta',
              cantidad: ref.item.cantidad,
              detalle: 'Devolución de unidades por anulación',
              ventaId: id,
              fecha: timestamp()

            });

          });

          transaction.update(ventaRef, {

            estado: 'Anulada',
            fechaAnulacion: timestamp()

          });

        });

        alert('Venta anulada y stock devuelto correctamente.');

      } catch (error) {

        mostrarError(error);

      }

    });

  }


  // ==========================================
  // 15. MOVIMIENTOS DE INVENTARIO
  // ==========================================

  db.collection('movimientosMacetas')
    .orderBy('fecha', 'desc')
    .onSnapshot(snapshot => {

      movimientosMacetas = [];

      snapshot.forEach(doc => {

        movimientosMacetas.push({

          id: doc.id,
          ...doc.data()

        });

      });

      mostrarMovimientosMacetas();

    }, mostrarError);


  function mostrarMovimientosMacetas() {

    if (!movimientosInventarioMacetas) return;

    movimientosInventarioMacetas.innerHTML = '';

    movimientosMacetas.forEach(movimiento => {

      const fila = document.createElement('tr');

      fila.innerHTML = `

        <td>${fechaTexto(movimiento.fecha)}</td>

        <td>${escaparHTML(movimiento.producto)}</td>

        <td>${escaparHTML(movimiento.tipo)}</td>

        <td>${movimiento.cantidad}</td>

        <td>${escaparHTML(movimiento.detalle || '-')}</td>

      `;

      movimientosInventarioMacetas.appendChild(fila);

    });

  }


  // ==========================================
  // 16. ACTUALIZAR PANEL DE RESUMEN
  // ==========================================

  function actualizarResumenMacetas() {

    const productos = inventarioMacetas.length;

    const stock = inventarioMacetas.reduce(
      (suma, item) => suma + Number(item.stock || 0),
      0
    );

    const ventasValidas = ventasMacetas.filter(
      venta => venta.estado !== 'Anulada'
    );

    const vendidas = ventasValidas.reduce((suma, venta) => {

      if (Array.isArray(venta.items)) {

        return suma + venta.items.reduce(
          (total, item) => total + Number(item.cantidad || 0),
          0
        );

      }

      return suma + Number(venta.cantidad || 0);

    }, 0);

    const ahora = new Date();

    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();

    const totalMes = ventasValidas.reduce((suma, venta) => {

      const fecha = fechaReal(venta.fecha);

      if (
        fecha &&
        fecha.getMonth() === mes &&
        fecha.getFullYear() === anio
      ) {

        return suma + Number(venta.total || 0);

      }

      return suma;

    }, 0);

    if (totalProductosMacetas) {
      totalProductosMacetas.textContent = productos;
    }

    if (totalStockMacetas) {
      totalStockMacetas.textContent = stock;
    }

    if (totalVendidasMacetas) {
      totalVendidasMacetas.textContent = vendidas;
    }

    if (ventasMesMacetas) {
      ventasMesMacetas.textContent = `S/. ${dinero(totalMes)}`;
    }

  }

})();

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
