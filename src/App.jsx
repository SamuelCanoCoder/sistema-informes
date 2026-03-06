import { useState, useEffect } from 'react';
import { getData } from './api';
import LoginForm from './LoginForm';
import Dashboard from './Dashboard';

function App() {
  // Magia de Optimización: Intentamos cargar desde la memoria primero
  const [data, setData] = useState(() => {
    const datosGuardados = localStorage.getItem('informes_cache');
    return datosGuardados ? JSON.parse(datosGuardados) : null;
  });
  const [auth, setAuth] = useState(null); 

  const today = new Date();
  const diaActual = today.getDate();
  const sistemaAbierto = diaActual >= 1 && diaActual <= 10;

  useEffect(() => { 
    if (sistemaAbierto) {
      getData()
        .then(res => {
          setData(res); // Actualiza la pantalla con datos frescos
          localStorage.setItem('informes_cache', JSON.stringify(res)); // Guarda la nueva copia
        })
        .catch(err => console.error("Error cargando datos:", err)); 
    }
  }, [sistemaAbierto]);

  // 1. PANTALLA DE SISTEMA CERRADO (Si no estamos entre el 1 y el 10)
  if (!sistemaAbierto) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-center">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 max-w-md w-full">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold text-red-400 mb-3">Sistema Cerrado</h2>
          <p className="text-slate-300 mb-6">
            El periodo para enviar los informes de predicación ha finalizado.
          </p>
          <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800 text-sm text-slate-400">
            Recuerda que el sistema se habilita automáticamente del <br /><strong className="text-blue-400">1 al 10 de cada mes</strong>. <br/><br/>
            Si tuviste un inconveniente y necesitas reportar fuera de plazo, por favor comunícate directamente con el secretario.
          </div>
        </div>
      </div>
    );
  }

  // 2. Mostrar el Login mientras carga o si no está autenticado
  if (!auth) {
    return <LoginForm grupos={data ? data.grupos : null} onLogin={setAuth} />;
  }

  // 3. Pantalla de carga mientras trae los datos de Google
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans">
        <h2 className="text-blue-400 text-xl font-semibold animate-pulse">
          Preparando tu panel... ⏳
        </h2>
      </div>
    );
  }

  // 4. Mostrar el Dashboard si todo está correcto
  return (
    <Dashboard 
      grupoId={auth.idGrupo} 
      publicadores={data.publicadores} 
      informes={data.informes} 
      onLogout={() => setAuth(null)}
    />
  );
}

export default App;