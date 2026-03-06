import { useState } from 'react';

const LoginForm = ({ grupos, onLogin }) => {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!grupos) {
      setErrorMsg("⏳ Espera un momento, conectando con la base de datos...");
      return;
    }
    if (!selectedGroup) {
      setErrorMsg("⚠️ Por favor, selecciona tu grupo de predicación.");
      return;
    }

    const group = grupos.find(g => g[0] == selectedGroup);
    
    if (group && group[2] === password) {
      onLogin({ idGrupo: group[0], nombre: group[1] });
    } else {
      setErrorMsg("❌ Contraseña incorrecta. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-200">
      <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md">
        
        <h2 className="text-3xl font-bold mb-8 text-center text-blue-400">
          Informes de Predicación
        </h2>
        
        {/* Alerta de Error Integrada */}
        {errorMsg && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Selector de Grupo */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Grupo
            </label>
           <select 
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 appearance-none text-slate-200"
              value={selectedGroup} 
              onChange={(e) => setSelectedGroup(e.target.value)}
              disabled={!grupos}
            >
              <option value="" className="text-slate-500">
                {!grupos ? "Cargando grupos..." : "Selecciona tu grupo"}
              </option>
              
              {/* 👇 AQUÍ ESTÁ EL CAMBIO: Agregamos .slice(1) 👇 */}
              {grupos && grupos.slice(1).map((g, i) => (
                <option key={i} value={g[0]}>{g[0]} - {g[1]}</option>
              ))}
            </select>
          </div>

          {/* Input de Contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Ingresa la contraseña" 
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12 disabled:opacity-50 text-slate-200 placeholder-slate-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!grupos}
              />
              <button 
                type="button" 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-400 focus:outline-none text-xl transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Botón Principal */}
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            disabled={!grupos}
          >
            {!grupos ? "Conectando..." : "Ingresar"}
          </button>
        </form>

      </div>
    </div>
  );
};

export default LoginForm;