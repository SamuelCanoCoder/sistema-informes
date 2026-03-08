import { useState, useEffect } from 'react';
import { postInforme, getData } from './api'; // <-- IMPORTAMOS getData TAMBIÉN

const Dashboard = ({ grupoId, publicadores, informes, onLogout }) => {
  // 1. Convertimos los informes en un Estado Local para poder actualizarlos "en vivo"
  const [listaInformes, setListaInformes] = useState(informes);
  
  const [borradores, setBorradores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: 'success' });

  const fechaMesAnterior = new Date();
  fechaMesAnterior.setMonth(fechaMesAnterior.getMonth() - 1);
  const mesInformeStr = fechaMesAnterior.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const mostrarToast = (mensaje, tipo = 'success') => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4500); 
  };

  const integrantes = publicadores.filter(p => p[1] == grupoId);

  // 2. SINCRONIZACIÓN SILENCIOSA (El efecto "Tiempo Real")
  useEffect(() => {
    const intervalo = setInterval(async () => {
      try {
        const datosFrescos = await getData();
        if (datosFrescos && datosFrescos.informes) {
          // Si hay datos nuevos, actualizamos la pantalla sin que el usuario se dé cuenta
          setListaInformes(datosFrescos.informes);
        }
      } catch (error) {
        // Ignoramos errores de red silenciosos para no molestar al usuario
      }
    }, 15000); // Revisa cada 3 segundos

    return () => clearInterval(intervalo); // Limpia el intervalo si cerramos sesión
  }, []);

  // Usamos listaInformes (el estado en vivo) en lugar del 'informes' estático
  const reportados = listaInformes
    .filter(i => i[7] === mesInformeStr) 
    .map(i => i[2]);

  const actualizarBorrador = (nombre, campo, valor) => {
    setBorradores(prev => ({
      ...prev,
      [nombre]: {
        ...(prev[nombre] || { activo: null, horas: '', estudios: '', revisitas: '' }),
        [campo]: valor
      }
    }));
  };

  const limpiarBorrador = (nombre) => {
    setBorradores(prev => {
      const nuevosBorradores = { ...prev };
      delete nuevosBorradores[nombre];
      return nuevosBorradores;
    });
  };

  // 3. ENVÍO CON VALIDACIÓN ANTI-DUPLICADOS
  const enviarTodo = async () => { 
    const nombresBorrador = Object.keys(borradores);
    if (nombresBorrador.length === 0) return;

    setEnviando(true); 

    try {
      // a) Empaquetamos lo que el usuario quiere enviar
      const paqueteInformes = nombresBorrador.map(nombre => {
        const datos = borradores[nombre];
        return {
          idGrupo: grupoId,
          nombre: nombre,
          activo: datos.activo,
          horas: datos.horas || 0,
          estudios: datos.estudios || 0,
          revisitas: datos.revisitas || 0,
          mesInforme: mesInformeStr
        };
      }).filter(informe => informe.activo === 'SI' || informe.activo === 'NO'); 

      // b) VALIDACIÓN JUST-IN-TIME: Descargamos la base de datos en este milisegundo
      const datosUltimoSegundo = await getData();
      const reportadosOficiales = datosUltimoSegundo.informes
        .filter(i => i[7] === mesInformeStr)
        .map(i => i[2]);

      // c) Filtramos: Solo enviamos a los que NO están en la base de datos oficial
      const paqueteSeguro = paqueteInformes.filter(inf => !reportadosOficiales.includes(inf.nombre));
      
      const duplicadosEvitados = paqueteInformes.length - paqueteSeguro.length;

      // d) Enviamos solo el paquete seguro
      if (paqueteSeguro.length > 0) {
        postInforme({ informes: paqueteSeguro }); 
        
        // Actualizamos la pantalla local de forma segura e inmutable
        const nuevosRegistros = paqueteSeguro.map(inf => [
          new Date(), inf.idGrupo, inf.nombre, inf.activo, 
          inf.horas, inf.estudios, inf.revisitas, inf.mesInforme
        ]);
        setListaInformes(prev => [...prev, ...nuevosRegistros]);
      }

      // e) Notificamos al usuario según lo que pasó
      setTimeout(() => {
        if (duplicadosEvitados > 0 && paqueteSeguro.length > 0) {
          mostrarToast(`Se enviaron ${paqueteSeguro.length}. Se ignoraron ${duplicadosEvitados} que otro encargado ya había reportado. ⚠️`, 'success');
        } else if (duplicadosEvitados > 0 && paqueteSeguro.length === 0) {
          mostrarToast(`Alguien más ya había enviado estos ${duplicadosEvitados} informes. No se guardaron duplicados. 👍`, 'success');
        } else {
          mostrarToast(`¡${paqueteSeguro.length} informes guardados exitosamente! ✅`, 'success');
        }
        
        setBorradores({});
        setEnviando(false);
      }, 1500);

    } catch (error) {
      console.error(error);
      mostrarToast("❌ Hubo un error procesando los datos.", 'error');
      setEnviando(false);
    }
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
          <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">Verificando y Guardando...</h3>
          <p className="text-blue-400 font-medium">Por favor, no cierres esta ventana.</p>
        </div>
      )}

      <div className={`min-h-screen bg-slate-950 p-4 sm:p-6 font-sans text-slate-200 pb-48 ${enviando ? 'pointer-events-none blur-[1px]' : ''}`}>
        <div className="max-w-2xl mx-auto relative">

          <div className="flex justify-between items-center mb-8 bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-800">
            <div>
              <h2 className="text-2xl font-bold text-blue-400">Grupo {grupoId}</h2>
              <p className="text-sm text-slate-400 font-medium">Informes de {mesInformeStr}</p>
              <p className="text-sm text-slate-400">Panel de informes</p>
            </div>
            <button onClick={onLogout} disabled={enviando} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg text-sm font-medium transition-colors border border-slate-700 shadow-sm disabled:opacity-50">
              Cerrar Sesión
            </button>
          </div>

          <div className="space-y-4">
            {integrantes.map((persona, index) => {
              const nombre = persona[2];
              const yaReporto = reportados.includes(nombre);
              const miBorrador = borradores[nombre] || {};
              const activoSeleccionado = miBorrador.activo;

              return (
                <div key={index} className={`p-5 rounded-2xl border shadow-md transition-all duration-300 ${yaReporto ? 'bg-slate-900/50 border-green-900/30 opacity-70' : activoSeleccionado ? 'bg-slate-800/80 border-blue-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">{nombre}</span>
                    {yaReporto ? (
                      <span className="bg-green-900/40 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-800/50">✅ Reportado</span>
                    ) : activoSeleccionado ? (
                      <span className="bg-blue-900/40 text-blue-400 text-xs font-bold px-3 py-1 rounded-full border border-blue-800/50">📝 Listo</span>
                    ) : (
                      <span className="bg-orange-900/40 text-orange-400 text-xs font-bold px-3 py-1 rounded-full border border-orange-800/50">Pendiente</span>
                    )}
                  </div>

                  {!yaReporto && (
                    <div className="mt-5 pt-5 border-t border-slate-800/50">
                      <p className="text-sm text-slate-300 mb-3 font-medium">
                        ¿Estuvo activo en el ministerio en {mesInformeStr.toLowerCase()}?
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
                        <p className="text-xs text-blue-400/80 mb-3 italic">* Nota: Estos detalles son opcionales.</p>
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
            <button onClick={enviarTodo} disabled={enviando} className="w-full md:w-auto md:px-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] disabled:opacity-0 disabled:cursor-not-allowed flex justify-center items-center gap-2">
              <span>Enviar {listosParaEnviar} informe{listosParaEnviar !== 1 ? 's' : ''} 🚀</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Dashboard;