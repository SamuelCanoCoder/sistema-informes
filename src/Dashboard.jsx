import { useState, useEffect } from 'react';
import { postInforme, getData } from './api';
import * as XLSX from 'xlsx';

const Dashboard = ({ grupoId, publicadores, informes, onLogout }) => {
  const isAdmin = String(grupoId) === '9';

  const [listaInformes, setListaInformes] = useState(informes);
  const [borradores, setBorradores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: 'success' });
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos"); 

  const fechaMesAnterior = new Date();
  fechaMesAnterior.setMonth(fechaMesAnterior.getMonth() - 1);
  const mesPorDefecto = fechaMesAnterior.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();

  const [mesSeleccionado, setMesSeleccionado] = useState(mesPorDefecto);

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4500); 
  };

  const todosLosPublicadores = publicadores.slice(1);
  
  const integrantesBase = isAdmin 
    ? todosLosPublicadores 
    : todosLosPublicadores.filter(p => p[1] == grupoId);

  // Ignoramos el encabezado "MES_INFORME" al buscar los meses disponibles
  const mesesDisponibles = Array.from(new Set([
    mesPorDefecto,
    ...listaInformes
      .map(i => String(i[7] || "").toUpperCase())
      .filter(m => m !== "" && m !== "MES_INFORME")
  ]));

  const informesDelMes = listaInformes.filter(i => String(i[7] || "").toUpperCase() === mesSeleccionado);
  const reportados = informesDelMes.map(i => i[2]);

  const kpis = isAdmin ? {
    total: integrantesBase.length,
    reportados: integrantesBase.filter(p => reportados.includes(p[2])).length,
    horas: informesDelMes.reduce((acc, curr) => acc + (Number(curr[4]) || 0), 0),
    estudios: informesDelMes.reduce((acc, curr) => acc + (Number(curr[5]) || 0), 0)
  } : null;

  const integrantesFiltrados = integrantesBase.filter(p => {
    const nombre = String(p[2] || "").toLowerCase();
    const grupo = String(p[1] || "").toLowerCase();
    const yaReporto = reportados.includes(p[2]);

    if (filtro === 'pendientes' && yaReporto) return false;
    if (filtro === 'reportados' && !yaReporto) return false;

    const termino = busqueda.toLowerCase().trim();
    return nombre.includes(termino) || grupo === termino; 
  });

  const isBuscandoGrupo = busqueda.trim() !== "" && !isNaN(busqueda.trim());
  let infoGrupoBusqueda = null;
  if (isAdmin && isBuscandoGrupo) {
    const integrantesDelGrupo = integrantesBase.filter(p => String(p[1]) === busqueda.trim());
    if (integrantesDelGrupo.length > 0) {
      const reportadosDelGrupo = integrantesDelGrupo.filter(p => reportados.includes(p[2])).length;
      infoGrupoBusqueda = {
        grupo: busqueda.trim(),
        total: integrantesDelGrupo.length,
        reportados: reportadosDelGrupo,
        faltan: integrantesDelGrupo.length - reportadosDelGrupo
      };
    }
  }

  useEffect(() => {
    const intervalo = setInterval(async () => {
      try {
        const datosFrescos = await getData();
        if (datosFrescos && datosFrescos.informes) {
          setListaInformes(datosFrescos.informes);
        }
      } catch (error) {}
    }, 15000); 
    return () => clearInterval(intervalo);
  }, []);

  const actualizarBorrador = (nombre, campo, valor) => {
    setBorradores(prev => ({
      ...prev,
      [nombre]: { ...(prev[nombre] || { activo: null, horas: '', estudios: '', revisitas: '' }), [campo]: valor }
    }));
  };

  const limpiarBorrador = (nombre) => {
    setBorradores(prev => {
      const nuevosBorradores = { ...prev };
      delete nuevosBorradores[nombre];
      return nuevosBorradores;
    });
  };

  const enviarTodo = () => { 
    const nombresBorrador = Object.keys(borradores);
    if (nombresBorrador.length === 0) return;
    setEnviando(true); 

    try {
      const paqueteInformes = nombresBorrador.map(nombre => {
        const grupoDeEstaPersona = integrantesBase.find(p => p[2] === nombre)[1];
        const datos = borradores[nombre];
        return {
          idGrupo: grupoDeEstaPersona,
          nombre: nombre,
          activo: datos.activo,
          horas: datos.horas || 0,
          estudios: datos.estudios || 0,
          revisitas: datos.revisitas || 0,
          mesInforme: mesSeleccionado.toLowerCase() // <-- Guardamos en minúsculas en Sheets
        };
      }).filter(informe => informe.activo === 'SI' || informe.activo === 'NO'); 

      const paqueteSeguro = paqueteInformes.filter(inf => !reportados.includes(inf.nombre));
      const duplicadosEvitados = paqueteInformes.length - paqueteSeguro.length;

      if (paqueteSeguro.length > 0) {
        postInforme({ informes: paqueteSeguro }); 
        const nuevosRegistros = paqueteSeguro.map(inf => [
          new Date(), inf.idGrupo, inf.nombre, inf.activo, inf.horas, inf.estudios, inf.revisitas, inf.mesInforme
        ]);
        setListaInformes(prev => [...prev, ...nuevosRegistros]);
      }

      setTimeout(() => {
        if (duplicadosEvitados > 0 && paqueteSeguro.length > 0) {
          mostrarToast(`Se enviaron ${paqueteSeguro.length}. Se ignoraron ${duplicadosEvitados} ya reportados en este mes. ⚠️`, 'success');
        } else if (duplicadosEvitados > 0 && paqueteSeguro.length === 0) {
          mostrarToast(`Alguien más ya había enviado estos ${duplicadosEvitados} informes en este mes. 👍`, 'success');
        } else {
          mostrarToast(`¡${paqueteSeguro.length} informes guardados exitosamente! ✅`, 'success');
        }
        setBorradores({});
        setEnviando(false);
      }, 1500);

    } catch (error) {
      console.error(error);
      mostrarToast("❌ Hubo un error.", 'error');
      setEnviando(false);
    }
  };

  const descargarResumen = () => {
    if (informesDelMes.length === 0) {
      mostrarToast(`No hay informes registrados en ${mesSeleccionado} todavía.`, "error");
      return;
    }

    const datosParaExcel = informesDelMes
      .sort((a, b) => a[1] - b[1] || String(a[2]).localeCompare(String(b[2])))
      .map(inf => ({
        "Grupo": inf[1],
        "Nombre": inf[2],
        "Activo": inf[3],
        "Horas": Number(inf[4]) || 0,
        "Estudios": Number(inf[5]) || 0,
        "Revisitas": Number(inf[6]) || 0
      }));

    const hoja = XLSX.utils.json_to_sheet(datosParaExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Resumen del Mes");
    XLSX.writeFile(libro, `Resumen_Predicacion_${mesSeleccionado}.xlsx`);
  };

  const listosParaEnviar = Object.keys(borradores).length;

  return (
    <>
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[200] transition-all duration-300 ${toast.visible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 py-3 rounded-full shadow-xl text-sm font-semibold flex items-center gap-2 border ${toast.tipo === 'success' ? 'bg-green-900/90 text-green-200 border-green-700 backdrop-blur-md' : 'bg-orange-900/90 text-orange-200 border-orange-700 backdrop-blur-md'}`}>
          {toast.mensaje}
        </div>
      </div>

      {enviando && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center transition-all">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
          <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">Guardando...</h3>
        </div>
      )}

      <div className={`min-h-screen bg-slate-950 p-4 sm:p-6 font-sans text-slate-200 pb-48 ${enviando ? 'pointer-events-none blur-[1px]' : ''}`}>
        <div className="max-w-3xl mx-auto relative">

          <div className="flex justify-between items-center mb-6 bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-blue-400">
                {isAdmin ? "Panel de Administración" : `Grupo ${grupoId}`}
              </h2>
              <p className="text-sm text-slate-400 font-medium">Informes de {mesSeleccionado}</p>
            </div>
            <button onClick={onLogout} disabled={enviando} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-sm disabled:opacity-50">
              Cerrar Sesión
            </button>
          </div>

          {isAdmin && (
            <div className="space-y-6 mb-8">
              <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                    <span>📅</span> Periodo de Consulta
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Selecciona el mes que deseas analizar o exportar.</p>
                </div>
                <select 
                  className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 font-semibold cursor-pointer shadow-sm"
                  value={mesSeleccionado}
                  onChange={(e) => {
                    setMesSeleccionado(e.target.value);
                    setBorradores({});
                  }}
                >
                  {mesesDisponibles.map((mes, idx) => (
                    <option key={idx} value={mes}>{mes}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center shadow-md">
                  <span className="text-xs text-slate-400 uppercase tracking-wider mb-1 text-center">Progreso</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-bold text-blue-400">{kpis.reportados}</span>
                    <span className="text-sm text-slate-500">/ {kpis.total}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(kpis.reportados / kpis.total) * 100}%` }}></div>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center shadow-md">
                  <span className="text-xs text-slate-400 uppercase tracking-wider mb-1 text-center">Horas</span>
                  <span className="text-2xl sm:text-3xl font-bold text-emerald-400">{kpis.horas}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col items-center justify-center shadow-md">
                  <span className="text-xs text-slate-400 uppercase tracking-wider mb-1 text-center">Estudios</span>
                  <span className="text-2xl sm:text-3xl font-bold text-purple-400">{kpis.estudios}</span>
                </div>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl shadow-md border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">🔍</span>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o número de grupo..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder-slate-500 transition-colors shadow-sm"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                  <button onClick={descargarResumen} className="bg-green-700 hover:bg-green-600 text-green-100 font-semibold py-3 px-6 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap">
                    <span>📥</span> Exportar Excel
                  </button>
                </div>

                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto text-sm">
                  <button onClick={() => setFiltro('todos')} className={`flex-1 py-2 px-3 rounded-md transition-colors whitespace-nowrap ${filtro === 'todos' ? 'bg-slate-800 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'}`}>
                    Todos ({integrantesBase.length})
                  </button>
                  <button onClick={() => setFiltro('pendientes')} className={`flex-1 py-2 px-3 rounded-md transition-colors whitespace-nowrap ${filtro === 'pendientes' ? 'bg-orange-900/50 text-orange-400 border border-orange-800/50 font-medium shadow-sm' : 'text-slate-400 hover:text-orange-300 hover:bg-slate-900/50'}`}>
                    Faltan ⚠️ ({kpis.total - kpis.reportados})
                  </button>
                  <button onClick={() => setFiltro('reportados')} className={`flex-1 py-2 px-3 rounded-md transition-colors whitespace-nowrap ${filtro === 'reportados' ? 'bg-green-900/50 text-green-400 border border-green-800/50 font-medium shadow-sm' : 'text-slate-400 hover:text-green-300 hover:bg-slate-900/50'}`}>
                    Reportados ✅ ({kpis.reportados})
                  </button>
                </div>
              </div>

              {infoGrupoBusqueda && (
                <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <h3 className="font-bold text-blue-300">Resumen Grupo {infoGrupoBusqueda.grupo}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Han reportado <span className="font-semibold text-white">{infoGrupoBusqueda.reportados}</span> de {infoGrupoBusqueda.total} publicadores.
                    </p>
                  </div>
                  {infoGrupoBusqueda.faltan === 0 ? (
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">¡Completado!</span>
                  ) : (
                    <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Faltan {infoGrupoBusqueda.faltan}</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            {integrantesFiltrados.length === 0 && (
              <div className="text-center py-10 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                <span className="text-3xl block mb-2">🕵️‍♂️</span>
                No se encontraron publicadores...
              </div>
            )}

            {integrantesFiltrados.map((persona, index) => {
              const grupoDelPublicador = persona[1];
              const nombre = persona[2];
              const yaReporto = reportados.includes(nombre);
              const miBorrador = borradores[nombre] || {};
              const activoSeleccionado = miBorrador.activo;

              let alertaInactivo = false;
              if (yaReporto && isAdmin) {
                const informeOficial = informesDelMes.find(i => i[2] === nombre);
                if (informeOficial && String(informeOficial[3]).toUpperCase() === 'NO') {
                  alertaInactivo = true;
                }
              }

              return (
                <div key={index} className={`p-5 rounded-2xl border shadow-md transition-all duration-300 ${yaReporto ? 'bg-slate-900/50 border-green-900/30 opacity-70' : activoSeleccionado ? 'bg-slate-800/80 border-blue-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}>
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-semibold text-lg">{nombre}</span>
                      {isAdmin && (
                        <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-medium">
                          Grupo {grupoDelPublicador}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {alertaInactivo && (
                        <span className="bg-red-900/40 text-red-400 text-xs font-bold px-2 py-1 rounded border border-red-800/50 flex items-center gap-1" title="Marcado como inactivo este mes">
                          ⚠️ Inactivo
                        </span>
                      )}

                      {yaReporto ? (
                        <span className="bg-green-900/40 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-800/50">✅ Reportado</span>
                      ) : activoSeleccionado ? (
                        <span className="bg-blue-900/40 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-800/50">📝 Listo</span>
                      ) : (
                        <span className="bg-orange-900/40 text-orange-400 text-xs font-bold px-3 py-1 rounded-full border border-orange-800/50">Pendiente</span>
                      )}
                    </div>
                  </div>

                  {/* FORMULARIO ESTILIZADO DE NUEVO */}
                  {!yaReporto && (
                    <div className="mt-5 pt-5 border-t border-slate-800/50">
                      <p className="text-sm text-slate-300 mb-3 font-medium">
                        ¿Estuvo activo en el ministerio en {mesSeleccionado.toLowerCase()}?
                      </p>
                      <div className="flex gap-3 mb-2">
                        <button onClick={() => actualizarBorrador(nombre, 'activo', 'SI')} disabled={enviando} className={`flex-1 py-2.5 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activoSeleccionado === 'SI' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}>
                          Sí
                        </button>
                        <button onClick={() => actualizarBorrador(nombre, 'activo', 'NO')} disabled={enviando} className={`flex-1 py-2.5 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${activoSeleccionado === 'NO' ? 'bg-red-600/90 text-white shadow-lg shadow-red-600/30 border border-red-500' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}>
                          No
                        </button>
                      </div>

                      <div className={`flex justify-end transition-all duration-300 overflow-hidden ${activoSeleccionado ? 'max-h-10 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                        <button onClick={() => limpiarBorrador(nombre)} disabled={enviando} className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1 bg-transparent px-2 py-1 rounded disabled:opacity-50">
                          <span>✕</span> Deshacer selección
                        </button>
                      </div>

                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${activoSeleccionado === 'SI' ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                        <p className="text-xs text-blue-400/80 mb-3 italic mt-3">
                          * Nota: Estos detalles son opcionales.
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1 ml-1">Horas</label>
                            <input type="number" min="0" placeholder="0" disabled={enviando} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 disabled:opacity-50 disabled:bg-slate-900" value={miBorrador.horas || ''} onChange={e => actualizarBorrador(nombre, 'horas', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1 ml-1">Estudios</label>
                            <input type="number" min="0" placeholder="0" disabled={enviando} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 disabled:opacity-50 disabled:bg-slate-900" value={miBorrador.estudios || ''} onChange={e => actualizarBorrador(nombre, 'estudios', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1 ml-1">Revisitas</label>
                            <input type="number" min="0" placeholder="0" disabled={enviando} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 disabled:opacity-50 disabled:bg-slate-900" value={miBorrador.revisitas || ''} onChange={e => actualizarBorrador(nombre, 'revisitas', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {listosParaEnviar > 0 && <div className="h-32 w-full opacity-0 pointer-events-none"></div>}
          </div>
        </div>
      </div>

      {listosParaEnviar > 0 && (
        <div className="fixed bottom-0 left-0 w-full p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 z-[90] transition-all">
          <div className="max-w-2xl mx-auto flex justify-center">
            <button onClick={enviarTodo} disabled={enviando} className="w-full md:w-auto md:px-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <span>Enviar {listosParaEnviar} informe{listosParaEnviar !== 1 ? 's' : ''} 🚀</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;