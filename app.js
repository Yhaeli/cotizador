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
  // 15. ACTUALIZAR RESUMEN GENERAL (INICIO)
  // ==========================================

  function actualizarResumen() {

    const totalProductos = inventarioMacetas.length;

    const totalStock = inventarioMacetas.reduce(
      (suma, item) => suma + Number(item.stock || 0),
      0
    );

    let totalVendidas = 0;
    let ventasMes = 0;

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    ventasMacetas.forEach(venta => {

      if (venta.estado === 'Anulada') return;

      const items = Array.isArray(venta.items)
        ? venta.items
        : [{ cantidad: Number(venta.cantidad || 0) }];

      items.forEach(item => {
        totalVendidas += Number(item.cantidad || 0);
      });

      const fecha = convertirFecha(venta.fecha);

      if (
        fecha &&
        fecha.getMonth() === mesActual &&
        fecha.getFullYear() === anioActual
      ) {
        ventasMes += Number(venta.total || 0);
      }

    });

    if ($('totalProductosMacetas')) {
      $('totalProductosMacetas').textContent = totalProductos;
    }

    if ($('totalStockMacetas')) {
      $('totalStockMacetas').textContent = totalStock;
    }

    if ($('totalVendidasMacetas')) {
      $('totalVendidasMacetas').textContent = totalVendidas;
    }

    if ($('ventasMesMacetas')) {
      $('ventasMesMacetas').textContent = `S/. ${dinero(ventasMes)}`;
    }

    // Alertas de stock bajo o agotado
    const contenedorAlertas = $('alertasStockMacetas');

    if (contenedorAlertas) {

      const criticos = inventarioMacetas.filter(
        item => Number(item.stock || 0) <= 5
      );

      if (criticos.length === 0) {

        contenedorAlertas.innerHTML = 'No hay alertas de stock.';

      } else {

        contenedorAlertas.innerHTML = criticos.map(item => `
          <div class="alerta-stock">
            ⚠️ <strong>${escapar(item.nombre)}</strong> — Stock disponible: <strong>${item.stock}</strong> unidades
          </div>
        `).join('');

      }

    }

  }

})();


// ==========================================
// MÓDULO DE SUSTRATOS - VIVERO ELIEL
// ==========================================

(() => {

  const $ = id => document.getElementById(id);

  let inventarioSustratos = [];
  let ventasSustratos = [];
  let entradasSustratos = [];
  let movimientosSustratos = [];

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
    return fecha ? fecha.toLocaleDateString('es-PE') : 'Pendiente';
  }

  function mostrarError(error) {
    console.error(error);
    alert(error.message || 'Error en la operación de sustratos.');
  }

  // Navegación interna del módulo de sustratos
  document.querySelectorAll('#tab-sustratos .nav-sustratos').forEach(boton => {
    boton.addEventListener('click', () => {
      const pagina = boton.dataset.pagina;

      document.querySelectorAll('#tab-sustratos .nav-sustratos').forEach(b => b.classList.remove('activo'));
      document.querySelectorAll('#tab-sustratos .pagina-sustratos').forEach(p => p.classList.remove('activa'));

      boton.classList.add('activo');
      const destino = $(pagina);
      if (destino) destino.classList.add('activa');
    });
  });

  // Registrar nuevo sustrato
  $('btnAgregarSustrato')?.addEventListener('click', async () => {
    const nombre = $('nombreSustrato').value.trim();
    const unidad = $('unidadSustrato').value;
    const costo = Number($('costoSustrato').value);
    const precio = Number($('precioVentaSustrato').value);
    const stock = Number($('stockSustrato').value);

    if (!nombre || isNaN(costo) || isNaN(precio) || isNaN(stock) || costo < 0 || precio < 0 || stock < 0) {
      alert('Por favor completa todos los campos correctamente.');
      return;
    }

    try {
      const sustratoRef = db.collection('sustratos').doc();
      const movimientoRef = db.collection('movimientosSustratos').doc();

      await db.runTransaction(async transaction => {
        transaction.set(sustratoRef, {
          nombre,
          unidad,
          costo,
          precioVenta: precio,
          stock,
          fecha: fechaServidor()
        });

        if (stock > 0) {
          transaction.set(movimientoRef, {
            sustratoId: sustratoRef.id,
            producto: nombre,
            tipo: 'Entrada',
            cantidad: stock,
            unidad,
            detalle: 'Stock inicial registrado',
            fecha: fechaServidor()
          });
        }
      });

      $('nombreSustrato').value = '';
      $('costoSustrato').value = '';
      $('precioVentaSustrato').value = '';
      $('stockSustrato').value = '';

      alert('Sustrato registrado con éxito.');
    } catch (error) {
      mostrarError(error);
    }
  });

  // Escuchar inventario de sustratos en tiempo real
  db.collection('sustratos').onSnapshot(snapshot => {
    inventarioSustratos = [];
    snapshot.forEach(doc => {
      inventarioSustratos.push({ id: doc.id, ...doc.data() });
    });
    mostrarInventarioSustratos();
    mostrarSelectoresSustratos();
    mostrarProductosVentaSustratos();
    actualizarResumenSustratos();
  }, mostrarError);

  function mostrarInventarioSustratos() {
    const tabla = $('tablaInventarioSustratos');
    const buscador = $('buscarSustrato')?.value.toLowerCase() || '';
    if (!tabla) return;

    tabla.innerHTML = '';

    const filtrados = inventarioSustratos.filter(item =>
      item.nombre.toLowerCase().includes(buscador)
    );

    if (filtrados.length === 0) {
      tabla.innerHTML = '<tr><td colspan="6">No se encontraron productos.</td></tr>';
      return;
    }

    filtrados.forEach(item => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${escapar(item.nombre)}</td>
        <td>${escapar(item.unidad)}</td>
        <td>S/. ${dinero(item.costo)}</td>
        <td>S/. ${dinero(item.precioVenta)}</td>
        <td>${item.stock}</td>
        <td>
          <button type="button" class="btn-green editar-sustrato" data-id="${item.id}" style="padding:4px 8px; font-size:12px;">Editar</button>
          <button type="button" class="btn-red eliminar-sustrato" data-id="${item.id}">Eliminar</button>
        </td>
      `;
      tabla.appendChild(fila);
    });
  }

  $('buscarSustrato')?.addEventListener('input', mostrarInventarioSustratos);

  // Editar o eliminar sustrato
  $('tablaInventarioSustratos')?.addEventListener('click', async e => {
    const editar = e.target.closest('.editar-sustrato');
    const eliminar = e.target.closest('.eliminar-sustrato');

    if (editar) {
      const item = inventarioSustratos.find(s => s.id === editar.dataset.id);
      if (!item) return;

      const nuevoNombre = prompt('Editar nombre:', item.nombre);
      if (nuevoNombre === null) return;
      const nuevoPrecio = prompt('Editar precio de venta:', item.precioVenta);
      if (nuevoPrecio === null) return;

      try {
        await db.collection('sustratos').doc(item.id).update({
          nombre: nuevoNombre.trim(),
          precioVenta: Number(nuevoPrecio)
        });
        alert('Producto actualizado.');
      } catch (err) {
        mostrarError(err);
      }
    }

    if (eliminar) {
      const item = inventarioSustratos.find(s => s.id === eliminar.dataset.id);
      if (!item) return;
      if (item.stock > 0) {
        alert('Solo se pueden eliminar productos con stock en 0.');
        return;
      }
      if (!confirm('¿Eliminar este sustrato permanentemente?')) return;

      try {
        await db.collection('sustratos').doc(item.id).delete();
        alert('Sustrato eliminado.');
      } catch (err) {
        mostrarError(err);
      }
    }
  });

  function mostrarSelectoresSustratos() {
    const select = $('selectEntradaSustrato');
    if (!select) return;

    const actual = select.value;
    select.innerHTML = '<option value="">Selecciona un producto</option>';

    inventarioSustratos.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${item.nombre} (${item.unidad})`;
      select.appendChild(opt);
    });
    select.value = actual;
  }

  // Registrar entradas de sustrato
  $('btnRegistrarEntradaSustrato')?.addEventListener('click', async () => {
    const id = $('selectEntradaSustrato').value;
    const cantidad = Number($('cantidadEntradaSustrato').value);
    const costo = Number($('costoEntradaSustrato').value);
    const observacion = $('observacionEntradaSustrato').value.trim();

    if (!id || isNaN(cantidad) || cantidad <= 0 || isNaN(costo) || costo < 0) {
      alert('Completa los datos de la entrada correctamente.');
      return;
    }

    try {
      const prodRef = db.collection('sustratos').doc(id);
      const entradaRef = db.collection('entradasSustratos').doc();
      const movRef = db.collection('movimientosSustratos').doc();

      await db.runTransaction(async transaction => {
        const doc = await transaction.get(prodRef);
        if (!doc.exists) throw new Error('El producto ya no existe.');

        const data = doc.data();
        const nuevoStock = Number(data.stock || 0) + cantidad;

        transaction.update(prodRef, { stock: nuevoStock, costo });
        transaction.set(entradaRef, {
          sustratoId: id,
          producto: data.nombre,
          cantidad,
          unidad: data.unidad,
          costoUnitario: costo,
          total: cantidad * costo,
          observacion,
          fecha: fechaServidor()
        });
        transaction.set(movRef, {
          sustratoId: id,
          producto: data.nombre,
          tipo: 'Entrada',
          cantidad,
          unidad: data.unidad,
          detalle: observacion || 'Compra / Reposición',
          fecha: fechaServidor()
        });
      });

      $('selectEntradaSustrato').value = '';
      $('cantidadEntradaSustrato').value = '';
      $('costoEntradaSustrato').value = '';
      $('observacionEntradaSustrato').value = '';

      alert('Entrada registrada exitosamente.');
    } catch (err) {
      mostrarError(err);
    }
  });

  // Historial de entradas
  db.collection('entradasSustratos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
    entradasSustratos = [];
    snapshot.forEach(doc => entradasSustratos.push({ id: doc.id, ...doc.data() }));

    const tabla = $('historialEntradasSustratos');
    if (!tabla) return;
    tabla.innerHTML = '';

    if (entradasSustratos.length === 0) {
      tabla.innerHTML = '<tr><td colspan="6">No hay entradas registradas.</td></tr>';
      return;
    }

    entradasSustratos.forEach(e => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${mostrarFecha(e.fecha)}</td>
        <td>${escapar(e.producto)}</td>
        <td>${e.cantidad}</td>
        <td>${escapar(e.unidad)}</td>
        <td>S/. ${dinero(e.costoUnitario)}</td>
        <td>S/. ${dinero(e.total)}</td>
      `;
      tabla.appendChild(tr);
    });
  }, mostrarError);

  // Renderizar productos en la página de ventas de sustratos
  function mostrarProductosVentaSustratos() {
    const tabla = $('detalleVentaSustratos');
    if (!tabla) return;

    const cantidades = {};
    tabla.querySelectorAll('.cantidad-sustrato-venta').forEach(inp => {
      cantidades[inp.dataset.id] = inp.value;
    });

    tabla.innerHTML = '';

    if (inventarioSustratos.length === 0) {
      tabla.innerHTML = '<tr><td colspan="6">No hay sustratos disponibles.</td></tr>';
      return;
    }

    inventarioSustratos.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapar(item.nombre)}</td>
        <td>${escapar(item.unidad)}</td>
        <td>${item.stock}</td>
        <td>
          <input type="number" class="cantidad-sustrato-venta" data-id="${item.id}" value="${cantidades[item.id] || 0}" min="0" max="${item.stock}" step="0.01" style="width:90px;">
        </td>
        <td>S/. ${dinero(item.precioVenta)}</td>
        <td><strong class="subtotal-sustrato-venta" data-id="${item.id}">S/. 0.00</strong></td>
      `;
      tabla.appendChild(tr);
    });
    actualizarTotalVentaSustratos();
  }

  $('detalleVentaSustratos')?.addEventListener('input', e => {
    if (e.target.classList.contains('cantidad-sustrato-venta')) {
      actualizarTotalVentaSustratos();
    }
  });

  function obtenerSeleccionSustratos() {
    const inputs = document.querySelectorAll('#detalleVentaSustratos .cantidad-sustrato-venta');
    const seleccionados = [];

    inputs.forEach(inp => {
      const cant = Number(inp.value);
      if (cant <= 0) return;

      const id = inp.dataset.id;
      const prod = inventarioSustratos.find(s => s.id === id);
      if (!prod) return;

      seleccionados.push({
        sustratoId: id,
        producto: prod.nombre,
        unidad: prod.unidad,
        cantidad: cant,
        precioUnit: prod.precioVenta,
        subtotal: cant * prod.precioVenta
      });
    });

    return seleccionados;
  }

  function actualizarTotalVentaSustratos() {
    let total = 0;
    const seleccionados = obtenerSeleccionSustratos();

    document.querySelectorAll('#detalleVentaSustratos .subtotal-sustrato-venta').forEach(celda => {
      const item = seleccionados.find(s => s.sustratoId === celda.dataset.id);
      const sub = item ? item.subtotal : 0;
      celda.textContent = `S/. ${dinero(sub)}`;
      total += sub;
    });

    if ($('totalVentaSustratos')) {
      $('totalVentaSustratos').textContent = `S/ ${dinero(total)}`;
    }
  }

  // Registrar venta completa de sustratos
  $('btnRegistrarVentaSustrato')?.addEventListener('click', async () => {
    const items = obtenerSeleccionSustratos();
    if (items.length === 0) {
      alert('Selecciona al menos un producto e indica su cantidad.');
      return;
    }

    const cliente = $('clienteVentaSustrato').value.trim() || 'Cliente Anónimo';
    const metodoPago = $('metodoPagoSustrato').value;
    const total = items.reduce((acc, curr) => acc + curr.subtotal, 0);

    if (!confirm(`¿Confirmar venta de sustratos por S/. ${dinero(total)}?`)) return;

    try {
      const ventaRef = db.collection('ventasSustratos').doc();
      const refs = items.map(item => ({
        item,
        prodRef: db.collection('sustratos').doc(item.sustratoId),
        movRef: db.collection('movimientosSustratos').doc()
      }));

      await db.runTransaction(async t => {
        const docs = await Promise.all(refs.map(r => t.get(r.prodRef)));

        docs.forEach((doc, idx) => {
          if (!doc.exists) throw new Error('Un producto ya no existe.');
          const stockActual = Number(doc.data().stock || 0);
          if (stockActual < refs[idx].item.cantidad) {
            throw new Error(`Stock insuficiente para ${refs[idx].item.producto}.`);
          }
        });

        refs.forEach((r, idx) => {
          const prodData = docs[idx].data();
          t.update(r.prodRef, { stock: Number(prodData.stock || 0) - r.item.cantidad });
          t.set(r.movRef, {
            sustratoId: r.item.sustratoId,
            producto: prodData.nombre,
            tipo: 'Venta',
            cantidad: r.item.cantidad,
            unidad: prodData.unidad,
            detalle: `Venta a ${cliente}`,
            ventaId: ventaRef.id,
            fecha: fechaServidor()
          });
        });

        t.set(ventaRef, {
          items,
          total,
          cliente,
          metodoPago,
          estado: 'Registrada',
          fecha: fechaServidor()
        });
      });

      $('clienteVentaSustrato').value = '';
      mostrarProductosVentaSustratos();
      alert('¡Venta de sustratos registrada con éxito!');
    } catch (err) {
      mostrarError(err);
    }
  });

  // Historial de ventas de sustratos
  db.collection('ventasSustratos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
    ventasSustratos = [];
    snapshot.forEach(doc => ventasSustratos.push({ id: doc.id, ...doc.data() }));

    const tabla = $('historialVentasSustratos');
    if (!tabla) return;
    tabla.innerHTML = '';

    if (ventasSustratos.length === 0) {
      tabla.innerHTML = '<tr><td colspan="7">No hay ventas registradas.</td></tr>';
      actualizarResumenSustratos();
      return;
    }

    ventasSustratos.forEach(v => {
      const listaProds = (v.items || []).map(i => `${escapar(i.producto)} (${i.cantidad} ${i.unidad})`).join('<br>');
      const anulada = v.estado === 'Anulada';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${mostrarFecha(v.fecha)}</td>
        <td>${listaProds}</td>
        <td>${escapar(v.cliente)}</td>
        <td>${escapar(v.metodoPago)}</td>
        <td>S/. ${dinero(v.total)}</td>
        <td>${anulada ? 'Anulada' : 'Registrada'}</td>
        <td>
          ${anulada ? '-' : `<button type="button" class="btn-red anular-venta-sustrato" data-id="${v.id}">Anular</button>`}
        </td>
      `;
      tabla.appendChild(tr);
    });

    actualizarResumenSustratos();
  }, mostrarError);

  // Anular venta de sustratos y devolver stock
  $('historialVentasSustratos')?.addEventListener('click', async e => {
    const btn = e.target.closest('.anular-venta-sustrato');
    if (!btn) return;
    if (!confirm('¿Anular esta venta y devolver el stock al inventario?')) return;

    const id = btn.dataset.id;
    try {
      const vRef = db.collection('ventasSustratos').doc(id);

      await db.runTransaction(async t => {
        const vDoc = await t.get(vRef);
        if (!vDoc.exists) throw new Error('La venta no existe.');
        const venta = vDoc.data();
        if (venta.estado === 'Anulada') throw new Error('La venta ya fue anulada.');

        const refs = venta.items.map(item => ({
          item,
          prodRef: db.collection('sustratos').doc(item.sustratoId),
          movRef: db.collection('movimientosSustratos').doc()
        }));

        const docs = await Promise.all(refs.map(r => t.get(r.prodRef)));

        refs.forEach((r, idx) => {
          const prodData = docs[idx].data();
          t.update(r.prodRef, { stock: Number(prodData.stock || 0) + r.item.cantidad });
          t.set(r.movRef, {
            sustratoId: r.item.sustratoId,
            producto: prodData.nombre,
            tipo: 'Devolución',
            cantidad: r.item.cantidad,
            unidad: prodData.unidad,
            detalle: 'Anulación de venta',
            ventaId: id,
            fecha: fechaServidor()
          });
        });

        t.update(vRef, { estado: 'Anulada' });
      });

      alert('Venta anulada correctamente.');
    } catch (err) {
      mostrarError(err);
    }
  });

  // Movimientos de sustratos
  db.collection('movimientosSustratos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
    movimientosSustratos = [];
    snapshot.forEach(doc => movimientosSustratos.push({ id: doc.id, ...doc.data() }));
    mostrarMovimientosSustratos();
  }, mostrarError);

  function mostrarMovimientosSustratos() {
    const tabla = $('movimientosInventarioSustratos');
    const filtro = $('filtroMovimientoSustratos')?.value || 'todos';
    if (!tabla) return;

    tabla.innerHTML = '';

    const filtrados = movimientosSustratos.filter(m => {
      if (filtro === 'todos') return true;
      return m.tipo.toLowerCase().includes(filtro);
    });

    if (filtrados.length === 0) {
      tabla.innerHTML = '<tr><td colspan="6">No hay movimientos registrados.</td></tr>';
      return;
    }

    filtrados.forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${mostrarFecha(m.fecha)}</td>
        <td>${escapar(m.producto)}</td>
        <td>${escapar(m.tipo)}</td>
        <td>${m.cantidad}</td>
        <td>${escapar(m.unidad || '')}</td>
        <td>${escapar(m.detalle || '-')}</td>
      `;
      tabla.appendChild(tr);
    });
  }

  $('filtroMovimientoSustratos')?.addEventListener('change', mostrarMovimientosSustratos);

  // Actualizar resumen del panel de inicio de sustratos
  function actualizarResumenSustratos() {
    let totalProd = inventarioSustratos.length;
    let kg = 0, litros = 0, unds = 0;
    let ventasMes = 0;

    const ahora = new Date();
    const mes = ahora.getMonth();
    const anio = ahora.getFullYear();

    inventarioSustratos.forEach(item => {
      const s = Number(item.stock || 0);
      if (item.unidad === 'kg') kg += s;
      else if (item.unidad === 'L') litros += s;
      else unds += s;
    });

    ventasSustratos.forEach(v => {
      if (v.estado === 'Anulada') return;
      const f = convertirFecha(v.fecha);
      if (f && f.getMonth() === mes && f.getFullYear() === anio) {
        ventasMes += Number(v.total || 0);
      }
    });

    if ($('totalProductosSustratos')) $('totalProductosSustratos').textContent = totalProd;
    if ($('stockKgSustratos')) $('stockKgSustratos').textContent = `${dinero(kg)} kg`;
    if ($('stockLitrosSustratos')) $('stockLitrosSustratos').textContent = `${dinero(litros)} L`;
    if ($('stockUnidadesSustratos')) $('stockUnidsSustratos') ? $('stockUnidsSustratos').textContent = unds : ($('stockUnidadesSustratos').textContent = unds);
    if ($('ventasMesSustratos')) $('ventasMesSustratos').textContent = `S/ ${dinero(ventasMes)}`;

    // Alertas de stock bajo en sustratos (stock <= 5)
    const alertBody = $('alertasInventarioSustratos');
    if (alertBody) {
      const criticos = inventarioSustratos.filter(i => Number(i.stock || 0) <= 5);
      if (criticos.length === 0) {
        alertBody.innerHTML = '<tr><td colspan="4">No hay alertas de stock.</td></tr>';
      } else {
        alertBody.innerHTML = criticos.map(i => `
          <tr>
            <td>${escapar(i.nombre)}</td>
            <td><strong>${i.stock}</strong></td>
            <td>${escapar(i.unidad)}</td>
            <td><span class="stock-low">Stock bajo</span></td>
          </tr>
        `).join('');
      }
    }
  }

})();
