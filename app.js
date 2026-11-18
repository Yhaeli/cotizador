// ==========================================
// 1. FUNCIONES GENERALES Y NAVEGACIÓN
// ==========================================

function switchTab(tabId, event) {
  // Ocultar todas las pestañas
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Quitar la clase active de todos los botones del menú superior
  const navBtns = document.querySelectorAll('.main-nav .nav-btn');
  navBtns.forEach(btn => btn.classList.remove('active'));

  // Mostrar la pestaña seleccionada
  const tabSeleccionada = document.getElementById('tab-' + tabId);
  if (tabSeleccionada) {
    tabSeleccionada.classList.add('active');
  }

  // Activar visualmente el botón presionado
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
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

  const $ = id => document.getElementById(id);

  // ==========================================
  // 1. VARIABLES
  // ==========================================

  let inventarioMacetas = [];
  let ventasMacetas = [];
  let movimientosMacetas = [];

  const dinero = valor =>
    Number(valor || 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const fechaServidor = () =>
    firebase.firestore.FieldValue.serverTimestamp();

  function escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  function convertirFecha(valor) {

    if (!valor) return null;

    if (valor.toDate) return valor.toDate();

    if (valor instanceof Date) return valor;

    const fecha = new Date(valor);

    return isNaN(fecha.getTime()) ? null : fecha;

  }

  function mostrarFecha(valor) {

    const fecha = convertirFecha(valor);

    return fecha
      ? fecha.toLocaleDateString('es-PE')
      : 'Pendiente';

  }

  function mostrarError(error) {

    console.error(error);

    alert(
      error.message ||
      'No se pudo completar la operación. Verifica tu conexión.'
    );

  }


  // ==========================================
  // 2. NAVEGACIÓN ENTRE PÁGINAS
  // ==========================================

  document.querySelectorAll(
    '#tab-macetas .nav-macetas'
  ).forEach(boton => {

    boton.addEventListener('click', () => {

      const pagina = boton.dataset.pagina;

      document.querySelectorAll(
        '#tab-macetas .nav-macetas'
      ).forEach(b => b.classList.remove('activo'));

      document.querySelectorAll(
        '#tab-macetas .pagina-macetas'
      ).forEach(p => p.classList.remove('activa'));

      boton.classList.add('activo');

      const destino = $(pagina);

      if (destino) {
        destino.classList.add('activa');
      }

    });

  });


  // ==========================================
  // 3. REGISTRAR PRODUCTO
  // ==========================================

  $('btnAgregarMaceta')?.addEventListener('click', async () => {

    const nombre = $('nombreMaceta').value.trim();
    const costo = Number($('costoMaceta').value);
    const precio = Number($('precioVentaMaceta').value);
    const stock = Number($('stockMaceta').value);

    if (
      !nombre ||
      !Number.isFinite(costo) ||
      !Number.isFinite(precio) ||
      costo < 0 ||
      precio < 0 ||
      $('costoMaceta').value === '' ||
      $('precioVentaMaceta').value === '' ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      $('stockMaceta').value === ''
    ) {

      alert('Completa correctamente todos los campos.');
      return;

    }

    try {

      const productoRef = db.collection('macetas').doc();

      const movimientoRef =
        db.collection('movimientosMacetas').doc();

      await db.runTransaction(async transaction => {

        transaction.set(productoRef, {

          nombre,
          costo,
          precioVenta: precio,
          stock,
          fecha: fechaServidor()

        });

        if (stock > 0) {

          transaction.set(movimientoRef, {

            macetaId: productoRef.id,
            producto: nombre,
            tipo: 'Stock inicial',
            cantidad: stock,
            detalle: 'Registro inicial',
            fecha: fechaServidor()

          });

        }

      });

      $('nombreMaceta').value = '';
      $('costoMaceta').value = '';
      $('precioVentaMaceta').value = '';
      $('stockMaceta').value = '';

      alert('Producto registrado correctamente.');

    } catch (error) {

      mostrarError(error);

    }

  });


  // ==========================================
  // 4. ESCUCHAR INVENTARIO
  // ==========================================

  db.collection('macetas').onSnapshot(snapshot => {

    inventarioMacetas = [];

    snapshot.forEach(doc => {

      inventarioMacetas.push({
        id: doc.id,
        ...doc.data()
      });

    });

    mostrarInventario();
    mostrarSelectores();
    mostrarProductosVenta();
    actualizarResumen();

  }, mostrarError);


  // ==========================================
  // 5. MOSTRAR INVENTARIO
  // ==========================================

  function mostrarInventario() {

    const tabla = $('tablaInventarioMacetas');

    if (!tabla) return;

    tabla.innerHTML = '';

    inventarioMacetas.forEach(item => {

      const stock = Number(item.stock || 0);

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

        <td>${escapar(item.nombre)}</td>

        <td>S/. ${dinero(item.costo)}</td>

        <td>S/. ${dinero(precio)}</td>

        <td>${stock}</td>

        <td>${estado}</td>

        <td>
          <button class="editar-maceta" data-id="${item.id}">
            Editar
          </button>

          <button class="eliminar-maceta" data-id="${item.id}">
            Eliminar
          </button>
        </td>

      `;

      tabla.appendChild(fila);

    });

  }


  // ==========================================
  // 6. EDITAR Y ELIMINAR PRODUCTOS
  // ==========================================

  $('tablaInventarioMacetas')?.addEventListener('click', async event => {

    const editar = event.target.closest('.editar-maceta');
    const eliminar = event.target.closest('.eliminar-maceta');

    if (editar) {

      const producto = inventarioMacetas.find(
        p => p.id === editar.dataset.id
      );

      if (!producto) return;

      const nombre = prompt('Nombre:', producto.nombre);

      if (nombre === null) return;

      const costo = prompt('Costo de compra:', producto.costo ?? 0);

      if (costo === null) return;

      const precio = prompt(
        'Precio de venta:',
        producto.precioVenta ?? producto.costo ?? 0
      );

      if (precio === null) return;

      if (
        !nombre.trim() ||
        !Number.isFinite(Number(costo)) ||
        !Number.isFinite(Number(precio)) ||
        Number(costo) < 0 ||
        Number(precio) < 0
      ) {

        alert('Los datos ingresados no son válidos.');
        return;

      }

      try {

        await db.collection('macetas')
          .doc(producto.id)
          .update({

            nombre: nombre.trim(),
            costo: Number(costo),
            precioVenta: Number(precio)

          });

        alert('Producto actualizado.');

      } catch (error) {

        mostrarError(error);

      }

    }


    if (eliminar) {

      const producto = inventarioMacetas.find(
        p => p.id === eliminar.dataset.id
      );

      if (!producto) return;

      if (Number(producto.stock || 0) !== 0) {

        alert('Solo puedes eliminar productos con stock en cero.');
        return;

      }

      if (!confirm('¿Deseas eliminar este producto?')) return;

      try {

        await db.collection('macetas')
          .doc(producto.id)
          .delete();

        alert('Producto eliminado.');

      } catch (error) {

        mostrarError(error);

      }

    }

  });


  // ==========================================
  // 7. SELECTORES DE PRODUCTOS
  // ==========================================

  function mostrarSelectores() {

    [
      'productoEntradaMaceta'
    ].forEach(id => {

      const select = $(id);

      if (!select) return;

      const anterior = select.value;

      select.innerHTML =
        '<option value="">Seleccionar maceta</option>';

      inventarioMacetas.forEach(item => {

        const option = document.createElement('option');

        option.value = item.id;
        option.textContent = item.nombre;

        select.appendChild(option);

      });

      select.value = anterior;

    });

  }


  // ==========================================
  // 8. REGISTRAR ENTRADAS
  // ==========================================

  $('btnRegistrarEntradaMaceta')?.addEventListener(
    'click',
    async () => {

      const id = $('productoEntradaMaceta').value;
      const cantidad = Number($('cantidadEntradaMaceta').value);
      const costo = Number($('costoEntradaMaceta').value);

      const observacion =
        $('observacionEntradaMaceta').value.trim();

      if (
        !id ||
        !Number.isInteger(cantidad) ||
        cantidad <= 0 ||
        !Number.isFinite(costo) ||
        costo < 0 ||
        $('costoEntradaMaceta').value === ''
      ) {

        alert('Completa correctamente los datos de la entrada.');
        return;

      }

      try {

        const productoRef = db.collection('macetas').doc(id);
        const entradaRef = db.collection('entradasMacetas').doc();
        const movimientoRef =
          db.collection('movimientosMacetas').doc();

        await db.runTransaction(async transaction => {

          const productoDoc = await transaction.get(productoRef);

          if (!productoDoc.exists) {
            throw new Error('El producto no existe.');
          }

          const producto = productoDoc.data();

          transaction.update(productoRef, {

            stock: Number(producto.stock || 0) + cantidad

          });

          transaction.set(entradaRef, {

            macetaId: id,
            producto: producto.nombre,
            cantidad,
            costoUnitario: costo,
            observacion,
            fecha: fechaServidor()

          });

          transaction.set(movimientoRef, {

            macetaId: id,
            producto: producto.nombre,
            tipo: 'Entrada',
            cantidad,
            detalle: observacion || 'Ingreso de mercadería',
            fecha: fechaServidor()

          });

        });

        $('cantidadEntradaMaceta').value = '';
        $('costoEntradaMaceta').value = '';
        $('observacionEntradaMaceta').value = '';
        $('productoEntradaMaceta').value = '';

        alert('Entrada registrada correctamente.');

      } catch (error) {

        mostrarError(error);

      }

    }
  );


  // ==========================================
  // 9. MOSTRAR PRODUCTOS EN LA PÁGINA DE VENTAS
  // ==========================================

  function mostrarProductosVenta() {

    const tabla = $('productosVentaMacetas');

    if (!tabla) return;

    const cantidadesActuales = {};

    tabla.querySelectorAll('.cantidad-producto-venta').forEach(input => {

      cantidadesActuales[input.dataset.id] = input.value;

    });

    tabla.innerHTML = '';

    inventarioMacetas.forEach(item => {

      const stock = Number(item.stock || 0);

      const precio = Number(
        item.precioVenta ?? item.costo ?? 0
      );

      const fila = document.createElement('tr');

      fila.innerHTML = `

        <td>${escapar(item.nombre)}</td>

        <td>${stock}</td>

        <td>
          <input
            type="number"
            class="cantidad-producto-venta"
            data-id="${item.id}"
            value="${escapar(cantidadesActuales[item.id] || 0)}"
            min="0"
            max="${stock}"
            step="1"
          >
        </td>

        <td>
          <input
            type="number"
            class="precio-producto-venta"
            data-id="${item.id}"
            value="${precio}"
            min="0"
            step="0.01"
          >
        </td>

        <td>
          <strong class="subtotal-producto-venta" data-id="${item.id}">
            S/. 0.00
          </strong>
        </td>

      `;

      tabla.appendChild(fila);

    });

    actualizarTotalesVenta();

  }


  // ==========================================
  // 10. CALCULAR TOTALES AUTOMÁTICAMENTE
  // ==========================================

  $('productosVentaMacetas')?.addEventListener('input', event => {

    if (
      event.target.classList.contains('cantidad-producto-venta') ||
      event.target.classList.contains('precio-producto-venta')
    ) {

      actualizarTotalesVenta();

    }

  });


  function obtenerProductosSeleccionados() {

    const cantidades = document.querySelectorAll(
      '#productosVentaMacetas .cantidad-producto-venta'
    );

    const seleccionados = [];

    cantidades.forEach(input => {

      const cantidad = Number(input.value);

      if (cantidad <= 0) return;

      const id = input.dataset.id;

      const precioInput = document.querySelector(
        `#productosVentaMacetas .precio-producto-venta[data-id="${id}"]`
      );

      const producto = inventarioMacetas.find(p => p.id === id);

      if (!producto) return;

      seleccionados.push({

        macetaId: id,
        producto: producto.nombre,
        cantidad,
        precioUnit: Number(precioInput.value),
        subtotal: cantidad * Number(precioInput.value)

      });

    });

    return seleccionados;

  }


  function actualizarTotalesVenta() {

    let total = 0;

    const seleccionados = obtenerProductosSeleccionados();

    document.querySelectorAll(
      '#productosVentaMacetas .subtotal-producto-venta'
    ).forEach(celda => {

      const item = seleccionados.find(
        p => p.macetaId === celda.dataset.id
      );

      const subtotal = item ? item.subtotal : 0;

      celda.textContent = `S/. ${dinero(subtotal)}`;

      total += subtotal;

    });

    $('totalVentaMacetas').textContent =
      `S/. ${dinero(total)}`;

  }


  // ==========================================
  // 11. REGISTRAR VENTA COMPLETA
  // ==========================================

  $('btnRegistrarVentaMaceta')?.addEventListener(
    'click',
    async () => {

      const items = obtenerProductosSeleccionados();

      if (items.length === 0) {

        alert('Indica al menos una cantidad para registrar la venta.');
        return;

      }

      for (const item of items) {

        const producto = inventarioMacetas.find(
          p => p.id === item.macetaId
        );

        if (
          !Number.isInteger(item.cantidad) ||
          item.cantidad <= 0 ||
          !Number.isFinite(item.precioUnit) ||
          item.precioUnit < 0 ||
          !producto ||
          item.cantidad > Number(producto.stock || 0)
        ) {

          alert(
            `Revisa la cantidad y el precio de ${item.producto}.`
          );

          return;

        }

      }

      const cliente =
        $('clienteVentaMaceta').value.trim() || 'Cliente Anónimo';

      const metodoPago = $('medioPagoMacetas').value;

      const total = items.reduce(
        (suma, item) => suma + item.subtotal,
        0
      );

      if (!confirm(`¿Registrar la venta por S/. ${dinero(total)}?`)) {
        return;
      }

      try {

        const ventaRef = db.collection('ventasMacetas').doc();

        const referencias = items.map(item => ({

          item,

          productoRef: db.collection('macetas').doc(item.macetaId),

          movimientoRef:
            db.collection('movimientosMacetas').doc()

        }));

        await db.runTransaction(async transaction => {

          // Leer todos los productos antes de escribir.
          const documentos = await Promise.all(
            referencias.map(ref =>
              transaction.get(ref.productoRef)
            )
          );

          documentos.forEach((doc, index) => {

            if (!doc.exists) {
              throw new Error('Uno de los productos ya no existe.');
            }

            const stock = Number(doc.data().stock || 0);

            if (stock < referencias[index].item.cantidad) {

              throw new Error(
                `Stock insuficiente para ${referencias[index].item.producto}.`
              );

            }

          });

          referencias.forEach((ref, index) => {

            const producto = documentos[index].data();

            transaction.update(ref.productoRef, {

              stock:
                Number(producto.stock || 0) - ref.item.cantidad

            });

            transaction.set(ref.movimientoRef, {

              macetaId: ref.item.macetaId,
              producto: producto.nombre,
              tipo: 'Venta',
              cantidad: ref.item.cantidad,
              detalle: 'Salida por venta',
              ventaId: ventaRef.id,
              fecha: fechaServidor()

            });

          });

          transaction.set(ventaRef, {

            items,

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
            metodoPago,
            estado: 'Registrada',
            fecha: fechaServidor()

          });

        });

        $('clienteVentaMaceta').value = '';

        $('medioPagoMacetas').value = 'Efectivo';

        alert('Venta registrada correctamente.');

      } catch (error) {

        mostrarError(error);

      }

    }
  );


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

      mostrarHistorial();
      actualizarResumen();

    }, mostrarError);


  function mostrarHistorial() {

    const tabla = $('historialVentasMacetas');

    if (!tabla) return;

    tabla.innerHTML = '';

    const desde = $('fechaDesdeMacetas').value
      ? new Date($('fechaDesdeMacetas').value + 'T00:00:00')
      : null;

    const hasta = $('fechaHastaMacetas').value
      ? new Date($('fechaHastaMacetas').value + 'T23:59:59.999')
      : null;

    const filtradas = ventasMacetas.filter(venta => {

      const fecha = convertirFecha(venta.fecha);

      if (!fecha) return !desde && !hasta;

      if (desde && fecha < desde) return false;

      if (hasta && fecha > hasta) return false;

      return true;

    });

    filtradas.forEach(venta => {

      const items = Array.isArray(venta.items)
        ? venta.items
        : [{
            producto: venta.producto || 'Venta antigua',
            cantidad: venta.cantidad || 0
          }];

      const productos = items.map(item =>
        `${escapar(item.producto)} x${item.cantidad}`
      ).join('<br>');

      const anulada = venta.estado === 'Anulada';

      const fila = document.createElement('tr');

      fila.innerHTML = `

        <td>${mostrarFecha(venta.fecha)}</td>

        <td>${productos}</td>

        <td>${escapar(venta.cliente || 'Cliente Anónimo')}</td>

        <td>S/. ${dinero(venta.total)}</td>

        <td>${escapar(venta.metodoPago || '-')}</td>

        <td>${anulada ? 'Anulada' : 'Registrada'}</td>

        <td>
          ${
            anulada
              ? '-'
              : Array.isArray(venta.items)
                ? `<button
                    class="anular-venta-maceta"
                    data-id="${venta.id}"
                  >Anular</button>`
                : 'Venta antigua'
          }
        </td>

      `;

      tabla.appendChild(fila);

    });

  }


  $('btnFiltrarVentasMacetas')?.addEventListener(
    'click',
    () => {

      const desde = $('fechaDesdeMacetas').value;
      const hasta = $('fechaHastaMacetas').value;

      if (desde && hasta && desde > hasta) {

        alert('La fecha inicial no puede ser posterior a la fecha final.');
        return;

      }

      mostrarHistorial();

    }
  );


  $('btnLimpiarFiltrosMacetas')?.addEventListener(
    'click',
    () => {

      $('fechaDesdeMacetas').value = '';
      $('fechaHastaMacetas').value = '';

      mostrarHistorial();

    }
  );


  // ==========================================
  // 13. ANULAR VENTA Y DEVOLVER STOCK
  // ==========================================

  $('historialVentasMacetas')?.addEventListener(
    'click',
    async event => {

      const boton = event.target.closest('.anular-venta-maceta');

      if (!boton) return;

      if (!confirm(
        '¿Anular esta venta y devolver las unidades al inventario?'
      )) return;

      const id = boton.dataset.id;

      try {

        const ventaRef = db.collection('ventasMacetas').doc(id);

        await db.runTransaction(async transaction => {

          const ventaDoc = await transaction.get(ventaRef);

          if (!ventaDoc.exists) {
            throw new Error('La venta no existe.');
          }

          const venta = ventaDoc.data();

          if (venta.estado === 'Anulada') {
            throw new Error('La venta ya está anulada.');
          }

          if (!Array.isArray(venta.items)) {

            throw new Error(
              'Esta venta antigua no permite devolver el stock automáticamente.'
            );

          }

          const referencias = venta.items.map(item => ({

            item,

            productoRef:
              db.collection('macetas').doc(item.macetaId),

            movimientoRef:
              db.collection('movimientosMacetas').doc()

          }));

          const documentos = await Promise.all(
            referencias.map(ref =>
              transaction.get(ref.productoRef)
            )
          );

          documentos.forEach(doc => {

            if (!doc.exists) {
              throw new Error('No se encontró uno de los productos.');
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
              detalle: 'Devolución de unidades',
              ventaId: id,
              fecha: fechaServidor()

            });

          });

          transaction.update(ventaRef, {

            estado: 'Anulada',
            fechaAnulacion: fechaServidor()

          });

        });

        alert('Venta anulada y stock devuelto.');

      } catch (error) {

        mostrarError(error);

      }

    }
  );


  // ==========================================
  // 14. MOVIMIENTOS
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

      mostrarMovimientos();

    }, mostrarError);


  function mostrarMovimientos() {

    const tabla = $('movimientosInventarioMacetas');

    if (!tabla) return;

    tabla.innerHTML = '';

    movimientosMacetas.forEach(movimiento => {

      const fila = document.createElement('tr');

      fila.innerHTML = `

        <td>${mostrarFecha(movimiento.fecha)}</td>

        <td>${escapar(movimiento.producto)}</td>

        <td>${escapar(movimiento.tipo)}</td>

        <td>${movimiento.cantidad}</td>

        <td>${escapar(movimiento.detalle || '-')}</td>

      `;

      tabla.appendChild(fila);

    });

  }


  // ==========================================
  // 15. PANEL DE INICIO
  // ==========================================

  function actualizarResumen() {

    const totalProductos = inventarioMacetas.length;

    const totalStock = inventarioMacetas.reduce(
      (suma, item) => suma + Number(item.stock || 0),
      0
    );

    const ventasValidas = ventasMacetas.filter(
      venta => venta.estado !== 'Anulada'
    );

    const totalVendidas = ventasValidas.reduce((suma, venta) => {

      if (Array.isArray(venta.items)) {

        return suma + venta.items.reduce(
          (total, item) => total + Number(item.cantidad || 0),
          0
        );

      }

      return suma + Number(venta.cantidad || 0);

    }, 0);

    const ahora = new Date();

    const totalMes = ventasValidas.reduce((suma, venta) => {

      const fecha = convertirFecha(venta.fecha);

      if (
        fecha &&
        fecha.getMonth() === ahora.getMonth() &&
        fecha.getFullYear() === ahora.getFullYear()
      ) {

        return suma + Number(venta.total || 0);

      }

      return suma;

    }, 0);

    $('totalProductosMacetas').textContent = totalProductos;
    $('totalStockMacetas').textContent = totalStock;
    $('totalVendidasMacetas').textContent = totalVendidas;

    $('ventasMesMacetas').textContent =
      `S/. ${dinero(totalMes)}`;

    mostrarAlertasStock();

  }


  function mostrarAlertasStock() {

    const contenedor = $('alertasStockMacetas');

    if (!contenedor) return;

    contenedor.innerHTML = '';

    const productosBajos = inventarioMacetas.filter(
      item => Number(item.stock || 0) <= 5
    );

    if (productosBajos.length === 0) {

      contenedor.textContent = 'No hay alertas de stock.';

      return;

    }

    productosBajos.forEach(item => {

      const alerta = document.createElement('div');

      alerta.className = 'alerta-stock';

      alerta.textContent =
        `${item.nombre}: ${item.stock || 0} unidades disponibles`;

      contenedor.appendChild(alerta);

    });

  }

})();

// ==========================================
// 4. MÓDULO DE SUSTRATOS
// ==========================================
// ======================================================
// 4. MÓDULO DE SUSTRATOS - VIVERO ELIEL
// ======================================================
// Colecciones:
// sustratos
// ventasSustratos
// entradasSustratos
// movimientosSustratos
//
// Unidades:
// kg = kilogramos
// L  = litros
// und = bolsas o unidades
// ======================================================


// ======================================================
// 1. ELEMENTOS HTML
// ======================================================

const nombreSustrato = document.getElementById('nombreSustrato');
const unidadSustrato = document.getElementById('unidadSustrato');
const costoSustrato = document.getElementById('costoSustrato');
const precioVentaSustrato = document.getElementById('precioVentaSustrato');
const stockSustrato = document.getElementById('stockSustrato');

const btnAgregarSustrato = document.getElementById('btnAgregarSustrato');
const tablaInventarioSustratos = document.getElementById('tablaInventarioSustratos');

const selectSustratoVenta = document.getElementById('selectSustratoVenta');
const cantidadSustratoVenta = document.getElementById('cantidadSustratoVenta');
const precioVentaSustratoInput = document.getElementById('precioVentaSustratoInput');
const selectEntradaSustrato = document.getElementById('selectEntradaSustrato');
const cantidadEntradaSustrato = document.getElementById('cantidadEntradaSustrato');
const costoEntradaSustrato = document.getElementById('costoEntradaSustrato');
const observacionEntradaSustrato = document.getElementById('observacionEntradaSustrato');
const btnRegistrarEntradaSustrato = document.getElementById('btnRegistrarEntradaSustrato');

const historialEntradasSustratos = document.getElementById('historialEntradasSustratos');

const detalleVentaSustratos = document.getElementById('detalleVentaSustratos');
const totalVentaSustratos = document.getElementById('totalVentaSustratos');
const clienteVentaSustrato = document.getElementById('clienteVentaSustrato');
const metodoPagoSustrato = document.getElementById('metodoPagoSustrato');
const btnRegistrarVentaSustrato = document.getElementById('btnRegistrarVentaSustrato');
const listaHistorialSustratos = document.getElementById('listaHistorialSustratos');

if (btnAgregarSustrato) {
  btnAgregarSustrato.addEventListener('click', () => {
    const nombre = nombreSustrato.value.trim();
    const costo = parseFloat(costoSustrato.value);
    const stock = parseInt(stockSustrato.value);
const historialVentasSustratos = document.getElementById('historialVentasSustratos');
const filtroFechaSustratos = document.getElementById('filtroFechaSustratos');

    if (!nombre || isNaN(costo) || isNaN(stock)) {
      alert("Por favor completa los campos del sustrato.");
      return;
const movimientosInventarioSustratos = document.getElementById('movimientosInventarioSustratos');
const filtroMovimientoSustratos = document.getElementById('filtroMovimientoSustratos');

const buscarSustrato = document.getElementById('buscarSustrato');


// ======================================================
// 2. REFERENCIAS A FIRESTORE
// ======================================================

const coleccionSustratos = db.collection('sustratos');
const coleccionVentasSustratos = db.collection('ventasSustratos');
const coleccionEntradasSustratos = db.collection('entradasSustratos');
const coleccionMovimientosSustratos = db.collection('movimientosSustratos');


// ======================================================
// 3. VARIABLES DEL MÓDULO
// ======================================================

let productosSustratos = [];
let ventasSustratos = [];
let entradasSustratos = [];
let movimientosSustratos = [];

let paginaActualSustratos = 'inicioSustratos';

let ventaEnProcesoSustratos = false;


// ======================================================
// 4. FUNCIONES GENERALES
// ======================================================

function formatoMonedaSustratos(valor) {
    return 'S/ ' + Number(valor || 0).toFixed(2);
}


function formatoCantidadSustratos(valor) {
    return Number(valor || 0).toLocaleString('es-PE', {
        maximumFractionDigits: 2
    });
}


function unidadTextoSustratos(unidad) {

    if (unidad === 'kg') return 'kg';
    if (unidad === 'L') return 'L';

    return 'und.';
}


function escaparHTMLSustratos(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caracter => {
        const entidades = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return entidades[caracter];
    });
}


function obtenerFechaSustratos(fecha) {

    if (!fecha) return null;

    if (fecha.toDate) {
        return fecha.toDate();
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
    if (fecha instanceof Date) {
        return fecha;
    }

    const resultado = new Date(fecha);

    return isNaN(resultado.getTime()) ? null : resultado;
}


function mostrarFechaSustratos(fecha) {

    const fechaConvertida = obtenerFechaSustratos(fecha);

    if (!fechaConvertida) return '-';

    return fechaConvertida.toLocaleString('es-PE', {
        dateStyle: 'short',
        timeStyle: 'short'
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
function validarCantidadSustratos(cantidad, unidad) {

    const numero = Number(cantidad);

    if (!Number.isFinite(numero) || numero <= 0) {
        return false;
    }

    if (unidad === 'und') {
        return Number.isInteger(numero);
    }

    return true;
}


function obtenerPasoUnidadSustratos(unidad) {
    return unidad === 'und' ? '1' : '0.01';
}


function mostrarMensajeSustratos(mensaje) {
    alert(mensaje);
}


// ======================================================
// 5. NAVEGACIÓN DEL MENÚ
// ======================================================

document.querySelectorAll('#tab-sustratos button.nav-sustratos').forEach(boton => {

    boton.addEventListener('click', () => {

        const pagina = boton.dataset.pagina;

        if (!pagina) return;

        document.querySelectorAll('#tab-sustratos .pagina-sustratos')
            .forEach(seccion => seccion.classList.remove('activa'));

        document.querySelectorAll('#tab-sustratos button.nav-sustratos')
            .forEach(item => item.classList.remove('activo'));

        const destino = document.getElementById(pagina);

        if (destino) {
            destino.classList.add('activa');
        }

        boton.classList.add('activo');

        paginaActualSustratos = pagina;

    });

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

// ======================================================
// 6. REGISTRAR NUEVO PRODUCTO
// ======================================================

if (btnAgregarSustrato) {

    btnAgregarSustrato.addEventListener('click', async () => {

        const nombre = nombreSustrato.value.trim();
        const unidad = unidadSustrato.value;

        const costo = Number(costoSustrato.value);
        const precioVenta = Number(precioVentaSustrato.value);
        const stock = Number(stockSustrato.value);

        if (!nombre) {
            return mostrarMensajeSustratos('Ingresa el nombre del producto.');
        }

        if (!['kg', 'L', 'und'].includes(unidad)) {
            return mostrarMensajeSustratos('Selecciona una unidad válida.');
        }

        if (!Number.isFinite(costo) || costo < 0) {
            return mostrarMensajeSustratos('Ingresa un costo válido.');
        }

        if (!Number.isFinite(precioVenta) || precioVenta < 0) {
            return mostrarMensajeSustratos('Ingresa un precio de venta válido.');
        }

        if (!Number.isFinite(stock) || stock < 0) {
            return mostrarMensajeSustratos('Ingresa un stock válido.');
        }

        if (unidad === 'und' && !Number.isInteger(stock)) {
            return mostrarMensajeSustratos('Las unidades deben registrarse con números enteros.');
        }

        try {

            btnAgregarSustrato.disabled = true;

            const referencia = await coleccionSustratos.add({

                nombre: nombre,
                unidad: unidad,

                costo: costo,
                precioVenta: precioVenta,

                stock: stock,

                stockMinimo: 2,

                fecha: firebase.firestore.FieldValue.serverTimestamp(),

                actualizado: firebase.firestore.FieldValue.serverTimestamp()

            });

            if (stock > 0) {

                await coleccionMovimientosSustratos.add({

                    sustratoId: referencia.id,
                    producto: nombre,

                    tipo: 'entrada',
                    cantidad: stock,
                    unidad: unidad,

                    detalle: 'Stock inicial del producto',

                    fecha: firebase.firestore.FieldValue.serverTimestamp()

                });

            }

            nombreSustrato.value = '';
            costoSustrato.value = '';
            precioVentaSustrato.value = '';
            stockSustrato.value = '';

            mostrarMensajeSustratos('Producto registrado correctamente.');

        } catch (error) {

            console.error('Error registrando sustrato:', error);

            mostrarMensajeSustratos('No se pudo registrar el producto.');

        } finally {

            btnAgregarSustrato.disabled = false;

        }

    });

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

// ======================================================
// 7. CARGAR INVENTARIO
// ======================================================

coleccionSustratos.onSnapshot(snapshot => {

    productosSustratos = [];

    snapshot.forEach(doc => {

        const producto = doc.data();

        productosSustratos.push({
            id: doc.id,
            ...producto
        });

    });

    mostrarInventarioSustratos();
    cargarSelectEntradasSustratos();
    mostrarProductosVentaSustratos();
    actualizarPanelSustratos();

}, error => {

    console.error('Error cargando inventario:', error);

});


// ======================================================
// 8. MOSTRAR INVENTARIO
// ======================================================

function mostrarInventarioSustratos() {

    if (!tablaInventarioSustratos) return;

    const busqueda = (buscarSustrato?.value || '').toLowerCase();

    const filtrados = productosSustratos.filter(producto => {

        return String(producto.nombre || '')
            .toLowerCase()
            .includes(busqueda);

    });

    tablaInventarioSustratos.innerHTML = '';

    if (filtrados.length === 0) {

        tablaInventarioSustratos.innerHTML = `
            <tr>
                <td colspan="6">No hay productos registrados.</td>
            </tr>
        `;

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
    filtrados.forEach(producto => {

        const unidad = producto.unidad || 'und';

        const fila = document.createElement('tr');

        fila.innerHTML = `

            <td>${escaparHTMLSustratos(producto.nombre)}</td>

            <td>${unidadTextoSustratos(unidad)}</td>

            <td>${formatoMonedaSustratos(producto.costo)}</td>

            <td>${formatoMonedaSustratos(producto.precioVenta ?? producto.costo)}</td>

            <td>${formatoCantidadSustratos(producto.stock)} ${unidadTextoSustratos(unidad)}</td>

            <td>

                <button onclick="editarSustrato('${producto.id}')"
                    class="btn-editar-sustrato">
                    Editar
                </button>

                <button onclick="eliminarSustrato('${producto.id}')"
                    class="btn-eliminar-sustrato">
                    Eliminar
                </button>

            </td>

        `;

        tablaInventarioSustratos.appendChild(fila);

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
if (buscarSustrato) {

    buscarSustrato.addEventListener('input', mostrarInventarioSustratos);

function eliminarSustrato(id) {
  if (confirm("¿Deseas eliminar este producto del inventario?")) {
    db.collection('sustratos').doc(id).delete();
  }
}

function eliminarVentaSustrato(id) {
  if (confirm("¿Estás seguro de eliminar este registro de venta?")) {
    db.collection('ventasSustratos').doc(id).delete();
  }

// ======================================================
// 9. EDITAR PRODUCTO
// ======================================================

async function editarSustrato(id) {

    const producto = productosSustratos.find(item => item.id === id);

    if (!producto) return;

    const nuevoNombre = prompt('Nombre del producto:', producto.nombre);

    if (nuevoNombre === null) return;

    if (!nuevoNombre.trim()) {
        return mostrarMensajeSustratos('El nombre no puede estar vacío.');
    }

    const nuevoCosto = prompt('Costo unitario:', producto.costo || 0);

    if (nuevoCosto === null) return;

    const nuevoPrecio = prompt(
        'Precio de venta:',
        producto.precioVenta ?? producto.costo ?? 0
    );

    if (nuevoPrecio === null) return;

    const nuevoStock = prompt('Stock actual:', producto.stock || 0);

    if (nuevoStock === null) return;

    const costo = Number(nuevoCosto);
    const precio = Number(nuevoPrecio);
    const stock = Number(nuevoStock);

    if (
        !Number.isFinite(costo) || costo < 0 ||
        !Number.isFinite(precio) || precio < 0 ||
        !Number.isFinite(stock) || stock < 0
    ) {
        return mostrarMensajeSustratos('Los datos ingresados no son válidos.');
    }

    if (producto.unidad === 'und' && !Number.isInteger(stock)) {
        return mostrarMensajeSustratos('Las unidades deben ser números enteros.');
    }

    try {

        await coleccionSustratos.doc(id).update({

            nombre: nuevoNombre.trim(),
            costo: costo,
            precioVenta: precio,
            stock: stock,

            actualizado: firebase.firestore.FieldValue.serverTimestamp()

        });

        mostrarMensajeSustratos('Producto actualizado correctamente.');

    } catch (error) {

        console.error(error);

        mostrarMensajeSustratos('No se pudo actualizar el producto.');

    }

}


// ======================================================
// 10. ELIMINAR PRODUCTO
// ======================================================

async function eliminarSustrato(id) {

    const producto = productosSustratos.find(item => item.id === id);

    if (!producto) return;

    if (Number(producto.stock || 0) > 0) {

        return mostrarMensajeSustratos(
            'No puedes eliminar un producto que todavía tiene stock. Primero registra su salida o ajusta su inventario.'
        );

    }

    if (!confirm(`¿Deseas eliminar ${producto.nombre} del inventario?`)) {
        return;
    }

    try {

        await coleccionSustratos.doc(id).delete();

        mostrarMensajeSustratos('Producto eliminado.');

    } catch (error) {

        console.error(error);

        mostrarMensajeSustratos('No se pudo eliminar el producto.');

    }

}


// ======================================================
// 11. CARGAR SELECT DE ENTRADAS
// ======================================================

function cargarSelectEntradasSustratos() {

    if (!selectEntradaSustrato) return;

    const valorAnterior = selectEntradaSustrato.value;

    selectEntradaSustrato.innerHTML = `
        <option value="">Selecciona un producto</option>
    `;

    productosSustratos.forEach(producto => {

        const option = document.createElement('option');

        option.value = producto.id;

        option.textContent =
            `${producto.nombre} (${unidadTextoSustratos(producto.unidad || 'und')})`;

        selectEntradaSustrato.appendChild(option);

    });

    if (productosSustratos.some(p => p.id === valorAnterior)) {
        selectEntradaSustrato.value = valorAnterior;
    }

}


// ======================================================
// 12. REGISTRAR ENTRADA DE PRODUCTOS
// ======================================================

if (btnRegistrarEntradaSustrato) {

    btnRegistrarEntradaSustrato.addEventListener('click', async () => {

        const id = selectEntradaSustrato.value;
        const cantidad = Number(cantidadEntradaSustrato.value);
        const costo = Number(costoEntradaSustrato.value);

        const observacion = observacionEntradaSustrato.value.trim();

        const producto = productosSustratos.find(item => item.id === id);

        if (!producto) {
            return mostrarMensajeSustratos('Selecciona un producto.');
        }

        if (!validarCantidadSustratos(cantidad, producto.unidad || 'und')) {
            return mostrarMensajeSustratos('La cantidad ingresada no es válida para esta unidad.');
        }

        if (!Number.isFinite(costo) || costo < 0) {
            return mostrarMensajeSustratos('Ingresa un costo unitario válido.');
        }

        try {

            btnRegistrarEntradaSustrato.disabled = true;

            await db.runTransaction(async transaction => {

                const referenciaProducto = coleccionSustratos.doc(id);

                const documento = await transaction.get(referenciaProducto);

                if (!documento.exists) {
                    throw new Error('El producto ya no existe.');
                }

                const datos = documento.data();

                const stockAnterior = Number(datos.stock || 0);

                transaction.update(referenciaProducto, {

                    stock: stockAnterior + cantidad,

                    costo: costo,

                    actualizado: firebase.firestore.FieldValue.serverTimestamp()

                });

                const entradaRef = coleccionEntradasSustratos.doc();

                transaction.set(entradaRef, {

                    sustratoId: id,
                    producto: datos.nombre,

                    cantidad: cantidad,
                    unidad: datos.unidad || 'und',

                    costoUnit: costo,
                    total: cantidad * costo,

                    observacion: observacion,

                    fecha: firebase.firestore.FieldValue.serverTimestamp()

                });

                const movimientoRef = coleccionMovimientosSustratos.doc();

                transaction.set(movimientoRef, {

                    sustratoId: id,
                    producto: datos.nombre,

                    tipo: 'entrada',

                    cantidad: cantidad,
                    unidad: datos.unidad || 'und',

                    detalle: observacion || 'Ingreso de productos',

                    fecha: firebase.firestore.FieldValue.serverTimestamp()

                });

            });

            cantidadEntradaSustrato.value = '';
            costoEntradaSustrato.value = '';
            observacionEntradaSustrato.value = '';

            mostrarMensajeSustratos('Entrada registrada correctamente.');

        } catch (error) {

            console.error(error);

            mostrarMensajeSustratos('No se pudo registrar la entrada.');

        } finally {

            btnRegistrarEntradaSustrato.disabled = false;

        }

    });

}


// ======================================================
// 13. HISTORIAL DE ENTRADAS
// ======================================================

coleccionEntradasSustratos
    .orderBy('fecha', 'desc')
    .onSnapshot(snapshot => {

        entradasSustratos = [];

        snapshot.forEach(doc => {

            entradasSustratos.push({
                id: doc.id,
                ...doc.data()
            });

        });

        mostrarHistorialEntradasSustratos();

    }, error => {

        console.error('Error cargando entradas:', error);

    });


function mostrarHistorialEntradasSustratos() {

    if (!historialEntradasSustratos) return;

    historialEntradasSustratos.innerHTML = '';

    if (entradasSustratos.length === 0) {

        historialEntradasSustratos.innerHTML = `
            <tr>
                <td colspan="6">Todavía no hay entradas registradas.</td>
            </tr>
        `;

        return;
    }

    entradasSustratos.forEach(entrada => {

        const fila = document.createElement('tr');

        fila.innerHTML = `

            <td>${mostrarFechaSustratos(entrada.fecha)}</td>

            <td>${escaparHTMLSustratos(entrada.producto)}</td>

            <td>${formatoCantidadSustratos(entrada.cantidad)}</td>

            <td>${unidadTextoSustratos(entrada.unidad)}</td>

            <td>${formatoMonedaSustratos(entrada.costoUnit)}</td>

            <td>${formatoMonedaSustratos(entrada.total)}</td>

        `;

        historialEntradasSustratos.appendChild(fila);

    });

}


// ======================================================
// 14. MOSTRAR PRODUCTOS PARA VENTA
// ======================================================

function mostrarProductosVentaSustratos() {

    if (!detalleVentaSustratos) return;

    const cantidadesAnteriores = {};

    detalleVentaSustratos.querySelectorAll('tr[data-id]').forEach(fila => {

        const id = fila.dataset.id;

        cantidadesAnteriores[id] = {
            cantidad: fila.querySelector('.cantidad-venta-sustrato')?.value || '',
            precio: fila.querySelector('.precio-venta-sustrato')?.value || ''
        };

    });

    detalleVentaSustratos.innerHTML = '';

    if (productosSustratos.length === 0) {

        detalleVentaSustratos.innerHTML = `
            <tr>
                <td colspan="6">No hay productos disponibles.</td>
            </tr>
        `;

        actualizarTotalVentaSustratos();

        return;
    }

    productosSustratos.forEach(producto => {

        const unidad = producto.unidad || 'und';

        const stock = Number(producto.stock || 0);

        const precio = Number(producto.precioVenta ?? producto.costo ?? 0);

        const anterior = cantidadesAnteriores[producto.id] || {};

        const fila = document.createElement('tr');

        fila.dataset.id = producto.id;

        fila.innerHTML = `

            <td>${escaparHTMLSustratos(producto.nombre)}</td>

            <td>${unidadTextoSustratos(unidad)}</td>

            <td>${formatoCantidadSustratos(stock)}</td>

            <td>
                <input
                    type="number"
                    class="cantidad-venta-sustrato"
                    min="0"
                    step="${obtenerPasoUnidadSustratos(unidad)}"
                    max="${stock}"
                    value="${escaparHTMLSustratos(anterior.cantidad || '')}"
                    placeholder="0"
                    ${stock <= 0 ? 'disabled' : ''}
                >
            </td>

            <td>
                <input
                    type="number"
                    class="precio-venta-sustrato"
                    min="0"
                    step="0.01"
                    value="${escaparHTMLSustratos(anterior.precio || precio)}"
                >
            </td>

            <td class="subtotal-venta-sustrato">
                S/ 0.00
            </td>

        `;

        detalleVentaSustratos.appendChild(fila);

    });

    detalleVentaSustratos.querySelectorAll('input').forEach(input => {

        input.addEventListener('input', actualizarTotalVentaSustratos);

    });

    actualizarTotalVentaSustratos();

}


// ======================================================
// 15. CALCULAR TOTAL DE VENTA
// ======================================================

function actualizarTotalVentaSustratos() {

    if (!detalleVentaSustratos || !totalVentaSustratos) return;

    let total = 0;

    detalleVentaSustratos.querySelectorAll('tr[data-id]').forEach(fila => {

        const cantidad = Number(
            fila.querySelector('.cantidad-venta-sustrato')?.value || 0
        );

        const precio = Number(
            fila.querySelector('.precio-venta-sustrato')?.value || 0
        );

        const subtotal = cantidad * precio;

        total += subtotal;

        const celda = fila.querySelector('.subtotal-venta-sustrato');

        if (celda) {
            celda.textContent = formatoMonedaSustratos(subtotal);
        }

    });

    totalVentaSustratos.textContent = formatoMonedaSustratos(total);

}


// ======================================================
// 16. REGISTRAR VENTA COMPLETA
// ======================================================

if (btnRegistrarVentaSustrato) {

    btnRegistrarVentaSustrato.addEventListener('click', async () => {

        if (ventaEnProcesoSustratos) return;

        const productosVenta = [];

        detalleVentaSustratos.querySelectorAll('tr[data-id]').forEach(fila => {

            const cantidad = Number(
                fila.querySelector('.cantidad-venta-sustrato')?.value || 0
            );

            const precio = Number(
                fila.querySelector('.precio-venta-sustrato')?.value || 0
            );

            if (cantidad > 0) {

                productosVenta.push({

                    id: fila.dataset.id,
                    cantidad: cantidad,
                    precio: precio

                });

            }

        });

        if (productosVenta.length === 0) {
            return mostrarMensajeSustratos('Ingresa la cantidad de al menos un producto.');
        }

        for (const item of productosVenta) {

            const producto = productosSustratos.find(p => p.id === item.id);

            if (!producto) {
                return mostrarMensajeSustratos('Uno de los productos ya no está disponible.');
            }

            if (!validarCantidadSustratos(item.cantidad, producto.unidad || 'und')) {
                return mostrarMensajeSustratos(
                    `La cantidad de ${producto.nombre} no es válida.`
                );
            }

            if (!Number.isFinite(item.precio) || item.precio < 0) {
                return mostrarMensajeSustratos(
                    `El precio de ${producto.nombre} no es válido.`
                );
            }

        }

        const cliente = clienteVentaSustrato.value.trim() || 'Cliente Anónimo';
        const metodoPago = metodoPagoSustrato.value;

        const total = productosVenta.reduce((suma, item) => {
            return suma + item.cantidad * item.precio;
        }, 0);

        if (!confirm(`¿Confirmas esta venta por ${formatoMonedaSustratos(total)}?`)) {
            return;
        }

        try {

            ventaEnProcesoSustratos = true;

            btnRegistrarVentaSustrato.disabled = true;

            await db.runTransaction(async transaction => {

                const referencias = productosVenta.map(item => ({
                    item: item,
                    referencia: coleccionSustratos.doc(item.id)
                }));

                const documentos = [];

                // Primero leer todos los productos.
                for (const dato of referencias) {

                    const documento = await transaction.get(dato.referencia);

                    if (!documento.exists) {
                        throw new Error('Uno de los productos ya no existe.');
                    }

                    documentos.push({
                        ...dato,
                        documento: documento
                    });

                }

                const itemsVenta = [];

                // Validar stock antes de modificar.
                for (const dato of documentos) {

                    const producto = dato.documento.data();

                    const stockActual = Number(producto.stock || 0);

                    if (dato.item.cantidad > stockActual) {

                        throw new Error(
                            `Stock insuficiente de ${producto.nombre}. Disponible: ${stockActual}.`
                        );

                    }

                    itemsVenta.push({

                        sustratoId: dato.item.id,

                        producto: producto.nombre,

                        unidad: producto.unidad || 'und',

                        cantidad: dato.item.cantidad,

                        precioUnit: dato.item.precio,

                        subtotal: dato.item.cantidad * dato.item.precio

                    });

                }

                // Descontar existencias.
                documentos.forEach(dato => {

                    const producto = dato.documento.data();

                    transaction.update(dato.referencia, {

                        stock: Number(producto.stock || 0) - dato.item.cantidad,

                        actualizado: firebase.firestore.FieldValue.serverTimestamp()

                    });

                });

                // Registrar venta.
                const ventaRef = coleccionVentasSustratos.doc();

                transaction.set(ventaRef, {

                    items: itemsVenta,

                    producto: itemsVenta.length === 1
                        ? itemsVenta[0].producto
                        : `${itemsVenta.length} productos`,

                    cantidad: itemsVenta.length === 1
                        ? itemsVenta[0].cantidad
                        : null,

                    precioUnit: itemsVenta.length === 1
                        ? itemsVenta[0].precioUnit
                        : null,

                    total: total,

                    cliente: cliente,

                    metodoPago: metodoPago,

                    estado: 'completada',

                    fecha: firebase.firestore.FieldValue.serverTimestamp()

                });

                // Registrar movimientos de venta.
                itemsVenta.forEach(item => {

                    const movimientoRef = coleccionMovimientosSustratos.doc();

                    transaction.set(movimientoRef, {

                        sustratoId: item.sustratoId,

                        producto: item.producto,

                        tipo: 'venta',

                        cantidad: item.cantidad,

                        unidad: item.unidad,

                        detalle: 'Venta registrada',

                        ventaId: ventaRef.id,

                        fecha: firebase.firestore.FieldValue.serverTimestamp()

                    });

                });

            });

            clienteVentaSustrato.value = '';

            mostrarMensajeSustratos('¡Venta registrada correctamente!');

        } catch (error) {

            console.error('Error registrando venta:', error);

            mostrarMensajeSustratos(error.message || 'No se pudo registrar la venta.');

        } finally {

            ventaEnProcesoSustratos = false;

            btnRegistrarVentaSustrato.disabled = false;

        }

    });

}


// ======================================================
// 17. HISTORIAL DE VENTAS
// ======================================================

coleccionVentasSustratos
    .orderBy('fecha', 'desc')
    .onSnapshot(snapshot => {

        ventasSustratos = [];

        snapshot.forEach(doc => {

            ventasSustratos.push({
                id: doc.id,
                ...doc.data()
            });

        });

        mostrarHistorialVentasSustratos();
        actualizarPanelSustratos();

    }, error => {

        console.error('Error cargando ventas:', error);

    });


function obtenerResumenVentaSustratos(venta) {

    if (Array.isArray(venta.items) && venta.items.length > 0) {

        return venta.items.map(item => {

            return `${item.producto} (${formatoCantidadSustratos(item.cantidad)} ${unidadTextoSustratos(item.unidad)})`;

        }).join(', ');

    }

    return `${venta.producto || 'Venta antigua'} (${formatoCantidadSustratos(venta.cantidad || 0)})`;

}


function mostrarHistorialVentasSustratos() {

    if (!historialVentasSustratos) return;

    historialVentasSustratos.innerHTML = '';

    let filtradas = ventasSustratos;

    if (filtroFechaSustratos?.value) {

        filtradas = ventasSustratos.filter(venta => {

            const fecha = obtenerFechaSustratos(venta.fecha);

            if (!fecha) return false;

            const fechaTexto = [
                fecha.getFullYear(),
                String(fecha.getMonth() + 1).padStart(2, '0'),
                String(fecha.getDate()).padStart(2, '0')
            ].join('-');

            return fechaTexto === filtroFechaSustratos.value;

        });

    }

    if (filtradas.length === 0) {

        historialVentasSustratos.innerHTML = `
            <tr>
                <td colspan="7">No hay ventas registradas.</td>
            </tr>
        `;

        return;
    }

    filtradas.forEach(venta => {

        const estado = venta.estado || 'completada';

        const fila = document.createElement('tr');

        fila.innerHTML = `

            <td>${mostrarFechaSustratos(venta.fecha)}</td>

            <td>${escaparHTMLSustratos(obtenerResumenVentaSustratos(venta))}</td>

            <td>${escaparHTMLSustratos(venta.cliente || 'Cliente Anónimo')}</td>

            <td>${escaparHTMLSustratos(venta.metodoPago || '-')}</td>

            <td>${formatoMonedaSustratos(venta.total)}</td>

            <td>${estado === 'anulada' ? 'Anulada' : 'Completada'}</td>

            <td>
                ${
                    estado === 'anulada'
                    ? '<span>Sin acciones</span>'
                    : `<button onclick="anularVentaSustrato('${venta.id}')"
                        class="btn-eliminar-sustrato">Anular</button>`
                }
            </td>

        `;

        historialVentasSustratos.appendChild(fila);

    });

}


if (filtroFechaSustratos) {

    filtroFechaSustratos.addEventListener('change', mostrarHistorialVentasSustratos);

}


// ======================================================
// 18. ANULAR VENTA Y DEVOLVER STOCK
// ======================================================

async function anularVentaSustrato(id) {

    const venta = ventasSustratos.find(item => item.id === id);

    if (!venta) return;

    if (venta.estado === 'anulada') {
        return mostrarMensajeSustratos('Esta venta ya fue anulada.');
    }

    if (!Array.isArray(venta.items) || venta.items.length === 0) {

        return mostrarMensajeSustratos(
            'Esta es una venta antigua que no contiene los identificadores de los productos. No se puede devolver el stock automáticamente.'
        );

    }

    if (!confirm('¿Deseas anular esta venta y devolver las cantidades al inventario?')) {
        return;
    }

    try {

        await db.runTransaction(async transaction => {

            const ventaRef = coleccionVentasSustratos.doc(id);

            const ventaDoc = await transaction.get(ventaRef);

            if (!ventaDoc.exists) {
                throw new Error('La venta no existe.');
            }

            const datosVenta = ventaDoc.data();

            if (datosVenta.estado === 'anulada') {
                throw new Error('Esta venta ya fue anulada.');
            }

            const referencias = [];

            for (const item of datosVenta.items) {

                const referencia = coleccionSustratos.doc(item.sustratoId);

                const documento = await transaction.get(referencia);

                if (!documento.exists) {

                    throw new Error(
                        `No se encontró el producto ${item.producto}. No se puede completar la devolución.`
                    );

                }

                referencias.push({
                    item,
                    referencia,
                    documento
                });

            }

            // Devolver existencias.
            referencias.forEach(dato => {

                const stockActual = Number(dato.documento.data().stock || 0);

                transaction.update(dato.referencia, {

                    stock: stockActual + Number(dato.item.cantidad),

                    actualizado: firebase.firestore.FieldValue.serverTimestamp()

                });

            });

            // Cambiar estado de la venta.
            transaction.update(ventaRef, {

                estado: 'anulada',

                fechaAnulacion: firebase.firestore.FieldValue.serverTimestamp()

            });

            // Registrar devoluciones.
            referencias.forEach(dato => {

                const movimientoRef = coleccionMovimientosSustratos.doc();

                transaction.set(movimientoRef, {

                    sustratoId: dato.item.sustratoId,

                    producto: dato.item.producto,

                    tipo: 'devolucion',

                    cantidad: dato.item.cantidad,

                    unidad: dato.item.unidad,

                    detalle: 'Devolución por anulación de venta',

                    ventaId: id,

                    fecha: firebase.firestore.FieldValue.serverTimestamp()

                });

            });

        });

        mostrarMensajeSustratos('Venta anulada y stock devuelto correctamente.');

    } catch (error) {

        console.error(error);

        mostrarMensajeSustratos(error.message || 'No se pudo anular la venta.');

    }

}


// ======================================================
// 19. HISTORIAL DE MOVIMIENTOS
// ======================================================

coleccionMovimientosSustratos
    .orderBy('fecha', 'desc')
    .onSnapshot(snapshot => {

        movimientosSustratos = [];

        snapshot.forEach(doc => {

            movimientosSustratos.push({
                id: doc.id,
                ...doc.data()
            });

        });

        mostrarMovimientosSustratos();

    }, error => {

        console.error('Error cargando movimientos:', error);

    });


function mostrarMovimientosSustratos() {

    if (!movimientosInventarioSustratos) return;

    movimientosInventarioSustratos.innerHTML = '';

    let filtrados = movimientosSustratos;

    const filtro = filtroMovimientoSustratos?.value || 'todos';

    if (filtro !== 'todos') {

        filtrados = movimientosSustratos.filter(movimiento => {
            return movimiento.tipo === filtro;
        });

    }

    if (filtrados.length === 0) {

        movimientosInventarioSustratos.innerHTML = `
            <tr>
                <td colspan="6">No hay movimientos registrados.</td>
            </tr>
        `;

        return;

    }

    filtrados.forEach(movimiento => {

        const fila = document.createElement('tr');

        let tipoTexto = movimiento.tipo;

        if (movimiento.tipo === 'entrada') tipoTexto = 'Entrada';
        if (movimiento.tipo === 'venta') tipoTexto = 'Venta';
        if (movimiento.tipo === 'devolucion') tipoTexto = 'Devolución';

        fila.innerHTML = `

            <td>${mostrarFechaSustratos(movimiento.fecha)}</td>

            <td>${escaparHTMLSustratos(movimiento.producto)}</td>

            <td>${tipoTexto}</td>

            <td>${formatoCantidadSustratos(movimiento.cantidad)}</td>

            <td>${unidadTextoSustratos(movimiento.unidad)}</td>

            <td>${escaparHTMLSustratos(movimiento.detalle || '-')}</td>

        `;

        movimientosInventarioSustratos.appendChild(fila);

    });

}


if (filtroMovimientoSustratos) {

    filtroMovimientoSustratos.addEventListener('change', mostrarMovimientosSustratos);

}


// ======================================================
// 20. PANEL PRINCIPAL
// ======================================================

function actualizarPanelSustratos() {

    const totalProductos = productosSustratos.length;

    let stockKg = 0;
    let stockLitros = 0;
    let stockUnidades = 0;
    let alertas = 0;

    productosSustratos.forEach(producto => {

        const stock = Number(producto.stock || 0);

        if (producto.unidad === 'kg') stockKg += stock;
        else if (producto.unidad === 'L') stockLitros += stock;
        else stockUnidades += stock;

        const minimo = Number(producto.stockMinimo ?? 2);

        if (stock <= minimo) {
            alertas++;
        }

    });

    const ahora = new Date();

    const ventasMes = ventasSustratos.reduce((suma, venta) => {

        if (venta.estado === 'anulada') return suma;

        const fecha = obtenerFechaSustratos(venta.fecha);

        if (!fecha) return suma;

        if (
            fecha.getMonth() === ahora.getMonth() &&
            fecha.getFullYear() === ahora.getFullYear()
        ) {

            return suma + Number(venta.total || 0);

        }

        return suma;

    }, 0);


    const totalElementos = {

        totalProductosSustratos: totalProductos,

        stockKgSustratos: formatoCantidadSustratos(stockKg) + ' kg',

        stockLitrosSustratos: formatoCantidadSustratos(stockLitros) + ' L',

        stockUnidadesSustratos: formatoCantidadSustratos(stockUnidades),

        ventasMesSustratos: formatoMonedaSustratos(ventasMes),

        alertasSustratos: alertas

    };


    Object.entries(totalElementos).forEach(([id, valor]) => {

        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }

    });


    mostrarAlertasSustratos();

}


// ======================================================
// 21. ALERTAS DE STOCK BAJO
// ======================================================

function mostrarAlertasSustratos() {

    const tabla = document.getElementById('alertasInventarioSustratos');

    if (!tabla) return;

    const alertas = productosSustratos.filter(producto => {

        const stock = Number(producto.stock || 0);

        const minimo = Number(producto.stockMinimo ?? 2);

        return stock <= minimo;

    });

    tabla.innerHTML = '';

    if (alertas.length === 0) {

        tabla.innerHTML = `
            <tr>
                <td colspan="4">No hay productos con stock bajo.</td>
            </tr>
        `;

        return;

    }

    alertas.forEach(producto => {

        const fila = document.createElement('tr');

        fila.innerHTML = `

            <td>${escaparHTMLSustratos(producto.nombre)}</td>

            <td>${formatoCantidadSustratos(producto.stock)}</td>

            <td>${unidadTextoSustratos(producto.unidad)}</td>

            <td>
                <span style="color:#d97706;font-weight:600;">
                    Stock bajo
                </span>
            </td>

        `;

        tabla.appendChild(fila);

    });

}


// ======================================================
// FIN DEL MÓDULO DE SUSTRATOS
// ======================================================
