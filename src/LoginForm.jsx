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
              
              {/* Quitamos el encabezado con slice(1) */}
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
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-400 focus:outline-none transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {/* ICONOS SVG PROFESIONALES */}
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
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