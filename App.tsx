
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, ContentProject, ContentStatus, ContentType } from './types';
import { MOCK_USERS, STATUS_COLORS, GLOSSARY } from './constants';
import { generateInitialContextQuestions, generateFinalContent } from './geminiService';

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
    <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full text-center">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
      </div>
      <div>
        <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tighter">Procesando...</h3>
        <p className="text-slate-500 font-bold text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(MOCK_USERS[4]); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'my-tasks' | 'repository' | 'glossary'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  const [newType, setNewType] = useState<ContentType>(ContentType.IMAGEN);
  const [newPrompt, setNewPrompt] = useState('');
  const [aiQuestions, setAiQuestions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [contextData, setContextData] = useState({
    objective: '',
    audience: '',
    toneAndStyle: '',
    restrictions: ''
  });

  // Al cambiar de usuario, reseteamos el tipo de contenido permitido por defecto
  useEffect(() => {
    if (currentUser.role === UserRole.EDITOR) {
      setNewType(ContentType.TEXTO);
    } else {
      setNewType(ContentType.IMAGEN);
    }
  }, [currentUser]);

  const handleUserChange = (userId: string) => {
    const user = MOCK_USERS.find(u => u.id === userId);
    setCurrentUser(user);
    // CRÍTICO: Siempre pedir PIN al cambiar de perfil
    setIsAuthenticated(false);
    setPinInput('');
    setPinError(false);
    setShowProfileMenu(false);
    resetForm();
    setIsCreating(false);
  };

  const verifyPin = () => {
    if (pinInput === currentUser.pin) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const handleStartCreation = async () => {
    if (!newPrompt.trim()) return;
    
    if (currentUser.role === UserRole.MARKETING_LEAD) {
      setLoading(true);
      setLoadingMessage('Asignando pedido al equipo creativo...');
      setTimeout(() => {
        const assignedTo = newType === ContentType.IMAGEN ? MOCK_USERS[0].id : MOCK_USERS[2].id;
        const newOrder: ContentProject = {
          id: Math.random().toString(36).substr(2, 9),
          title: `Pedido de: ${newType}`,
          type: newType,
          status: ContentStatus.INICIADO,
          creatorId: assignedTo,
          prompt: newPrompt,
          updatedAt: Date.now()
        };
        setProjects([newOrder, ...projects]);
        setIsCreating(false);
        resetForm();
        setLoading(false);
      }, 800);
      return;
    }

    setLoading(true);
    setLoadingMessage('Consultando a la IA para estructurar el proyecto...');
    try {
      let qs = await generateInitialContextQuestions(newPrompt, newType);
      setAiQuestions(qs || 'Complete los campos de contexto para continuar.');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeCreation = async () => {
    setLoading(true);
    setLoadingMessage('La IA está diseñando tu propuesta creativa. Por favor espera...');
    try {
      const simplifiedContext = {
        objective: contextData.objective,
        audience: contextData.audience,
        tone: contextData.toneAndStyle,
        style: contextData.toneAndStyle,
        restrictions: contextData.restrictions
      };
      const result = await generateFinalContent(newPrompt, newType, simplifiedContext);
      const newProject: ContentProject = {
        id: Math.random().toString(36).substr(2, 9),
        title: `Tipo de contenido: ${newType}`,
        type: newType,
        status: ContentStatus.EN_EDICION,
        creatorId: currentUser.id,
        prompt: newPrompt,
        iterations: 3,
        context: simplifiedContext,
        output: result || '',
        updatedAt: Date.now()
      };
      setProjects([newProject, ...projects]);
      setIsCreating(false);
      resetForm();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleIterateImage = async (projectId: string, editPrompt: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || (project.iterations || 0) <= 0) return;
    setLoading(true);
    setLoadingMessage('Aplicando modificaciones solicitadas a la pieza...');
    try {
      const result = await generateFinalContent(`${project.prompt}. Modificación solicitada: ${editPrompt}`, project.type, project.context);
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return { ...p, output: result || p.output, iterations: (p.iterations || 0) - 1, updatedAt: Date.now() };
        }
        return p;
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewPrompt('');
    setAiQuestions(null);
    setContextData({ objective: '', audience: '', toneAndStyle: '', restrictions: '' });
  };

  const updateStatus = (id: string, newStatus: ContentStatus, comments?: string) => {
    setLoading(true);
    setLoadingMessage('Actualizando estado y notificando al equipo...');
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, status: newStatus, reviewerComments: comments, updatedAt: Date.now() };
        }
        return p;
      }));
      setLoading(false);
    }, 1000);
  };

  const delegateTask = (id: string) => {
    setLoading(true);
    setLoadingMessage('Derivando la tarea a otro integrante del equipo...');
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === id) {
          let nextUser = '';
          if (currentUser.id === 'u1') nextUser = 'u2';
          else if (currentUser.id === 'u3') nextUser = 'u4';
          if (!nextUser) return p;
          return { ...p, creatorId: nextUser, updatedAt: Date.now() };
        }
        return p;
      }));
      setLoading(false);
    }, 800);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-md text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-xl shadow-indigo-900/20">📢</div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter">Acceso al Espacio</h2>
          <div className="space-y-6 text-left mt-8">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Usuario Seleccionado</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none transition-all" value={currentUser.id} onChange={(e) => handleUserChange(e.target.value)}>
                {MOCK_USERS.map(u => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PIN de Seguridad</label>
              <input type="password" maxLength={4} className={`w-full text-center text-3xl tracking-[0.5em] p-4 border-2 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-mono transition-all ${pinError ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-white'}`} placeholder="****" value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))} onKeyUp={(e) => e.key === 'Enter' && verifyPin()} autoFocus />
              {pinError && <p className="text-red-500 text-[10px] font-black uppercase text-center mt-3 tracking-widest">Error de PIN</p>}
            </div>
            <button onClick={verifyPin} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest">Confirmar e Ingresar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {loading && <LoadingOverlay message={loadingMessage} />}
      
      {zoomedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-12 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Zoomed" />
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl">📢</div>
          <h1 className="text-xl font-black text-slate-800 tracking-tighter">Espacio Co-Creativo | <span className="text-indigo-600 font-bold">Dpto. de Marketing</span></h1>
        </div>
        
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 text-right hover:bg-slate-50 p-2 rounded-2xl transition-all">
            <div className="hidden sm:block">
              <p className="text-sm font-black text-slate-800 leading-none">{currentUser.name}</p>
              <p className="text-[10px] uppercase tracking-widest font-black text-indigo-400 mt-1">{currentUser.role}</p>
            </div>
            <span className="text-2xl">🚪</span>
          </button>
          
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl p-4 z-40 animate-in fade-in slide-in-from-top-2 duration-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-3">Cambiar Perfil</p>
              <div className="space-y-1">
                {MOCK_USERS.map(u => (
                  <button key={u.id} onClick={() => handleUserChange(u.id)} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${u.id === currentUser.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {u.name} <span className="text-[9px] opacity-60 font-medium block">{u.role}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50">
                <button onClick={() => setIsAuthenticated(false)} className="w-full py-3 bg-red-50 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all">Cerrar Sesión</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-white border-r p-4 flex flex-col gap-2">
          <button onClick={() => { setActiveTab('all'); setIsCreating(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Proyectos</button>
          <button onClick={() => { setActiveTab('my-tasks'); setIsCreating(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'my-tasks' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Mis Tareas</button>
          <button onClick={() => { setActiveTab('repository'); setIsCreating(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'repository' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Archivo</button>
          <button onClick={() => { setActiveTab('glossary'); setIsCreating(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'glossary' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Glosario</button>
          
          <div className="mt-auto pt-6 border-t">
            <button onClick={() => setIsCreating(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all text-xs uppercase tracking-widest">
              {currentUser.role === UserRole.MARKETING_LEAD ? '+ Crear Pedido' : '+ Crear Pieza'}
            </button>
          </div>
        </aside>

        <section className="flex-1 p-4 md:p-8 overflow-y-auto">
          {activeTab === 'glossary' ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-2xl font-black text-slate-800 mb-8 tracking-tighter">Glosario de Estados</h2>
              {GLOSSARY.map((g, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 flex items-start gap-4 shadow-sm">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 shrink-0 ${g.color || STATUS_COLORS[g.status as any] || 'bg-slate-100 text-slate-500'}`}>{g.status}</span>
                  <p className="text-sm font-bold text-slate-600 leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>
          ) : isCreating ? (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-black">×</button>
                <h2 className="text-2xl font-black tracking-tighter">
                  {currentUser.role === UserRole.MARKETING_LEAD ? 'Nuevo Pedido de Marketing' : 'Nueva Iniciativa'}
                </h2>
              </div>

              {!aiQuestions || currentUser.role === UserRole.MARKETING_LEAD ? (
                <div className="space-y-8">
                   <div className="flex gap-4">
                      <button 
                        disabled={currentUser.role === UserRole.EDITOR}
                        onClick={() => setNewType(ContentType.IMAGEN)} 
                        className={`flex-1 py-6 border-2 rounded-3xl transition-all flex flex-col items-center gap-3 ${newType === ContentType.IMAGEN ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-50 bg-slate-50/50 hover:bg-white'} ${currentUser.role === UserRole.EDITOR ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                      >
                        <span className="text-4xl">🖼️</span>
                        <span className="font-black text-xs uppercase tracking-widest">Imagen</span>
                      </button>
                      <button 
                        disabled={currentUser.role === UserRole.DISENADOR}
                        onClick={() => setNewType(ContentType.TEXTO)} 
                        className={`flex-1 py-6 border-2 rounded-3xl transition-all flex flex-col items-center gap-3 ${newType === ContentType.TEXTO ? 'border-indigo-600 bg-indigo-50 shadow-inner' : 'border-slate-50 bg-slate-50/50 hover:bg-white'} ${currentUser.role === UserRole.DISENADOR ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                      >
                        <span className="text-4xl">✍️</span>
                        <span className="font-black text-xs uppercase tracking-widest">Texto</span>
                      </button>
                    </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">
                      {currentUser.role === UserRole.MARKETING_LEAD ? 'Instrucciones para el equipo' : 'Prompt Inicial'}
                    </label>
                    <textarea className="w-full p-6 border-2 border-slate-100 bg-white rounded-3xl focus:border-indigo-500 outline-none h-40 transition-all font-medium text-slate-700" placeholder="Describe lo que necesitas..." value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
                  </div>
                  <button disabled={loading || !newPrompt} onClick={handleStartCreation} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 disabled:bg-slate-200 transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest">
                    {currentUser.role === UserRole.MARKETING_LEAD ? 'Disparar Pedido 🚀' : 'Consultar IA'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                  <div className="bg-indigo-600 p-6 rounded-[32px] text-white shadow-lg">
                    <h3 className="font-black mb-4 flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">🤖 El Asistente IA requiere:</h3>
                    <div className="font-bold text-sm leading-relaxed space-y-3">
                      {aiQuestions.split('\n').map((line, i) => <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>)}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-bold" placeholder="Objetivo..." value={contextData.objective} onChange={(e) => setContextData({...contextData, objective: e.target.value})} />
                      <input className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-bold" placeholder="Público..." value={contextData.audience} onChange={(e) => setContextData({...contextData, audience: e.target.value})} />
                    </div>
                    <input className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm font-bold" placeholder="Tono y Estilo..." value={contextData.toneAndStyle} onChange={(e) => setContextData({...contextData, toneAndStyle: e.target.value})} />
                    <textarea className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none h-24 text-sm font-bold" placeholder="Restricciones..." value={contextData.restrictions} onChange={(e) => setContextData({...contextData, restrictions: e.target.value})} />
                  </div>
                  <button disabled={loading} onClick={handleFinalizeCreation} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all uppercase shadow-xl shadow-indigo-100 tracking-widest">Generar con IA</button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {projects.filter(p => {
                const isLead = currentUser.role === UserRole.MARKETING_LEAD;
                if (activeTab === 'repository') return p.status === ContentStatus.APROBADO;
                if (activeTab === 'my-tasks') {
                   if (isLead) return p.status === ContentStatus.EN_REVISION;
                   return p.creatorId === currentUser.id && (p.status === ContentStatus.INICIADO || p.status === ContentStatus.EN_EDICION || p.status === ContentStatus.DEVUELTO);
                }
                if (isLead) return p.status !== ContentStatus.APROBADO && p.status !== ContentStatus.EN_REVISION;
                return p.creatorId === currentUser.id && p.status !== ContentStatus.APROBADO;
              }).map(project => (
                <ProjectCard key={project.id} project={project} user={currentUser} onUpdateStatus={updateStatus} onZoom={(img) => setZoomedImage(img)} onIterate={handleIterateImage} onDelegate={delegateTask} loading={loading} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const ProjectCard: React.FC<{ project: ContentProject, user: User, onUpdateStatus: (id: string, s: ContentStatus, c?: string) => void, onZoom: (img: string) => void, onIterate: (id: string, prompt: string) => void, onDelegate: (id: string) => void, loading: boolean }> = ({ project, user, onUpdateStatus, onZoom, onIterate, onDelegate, loading }) => {
  const [comment, setComment] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const isReviewer = user.role === UserRole.MARKETING_LEAD;
  const isCreator = user.id === project.creatorId;
  const lastModifier = MOCK_USERS.find(u => u.id === project.creatorId);

  const canDelegate = (user.id === 'u1' || user.id === 'u3') && project.status === ContentStatus.INICIADO;

  return (
    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col h-full overflow-hidden relative">
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border-2 mb-3 inline-block tracking-widest ${STATUS_COLORS[project.status]}`}>{project.status}</span>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Responsable: <span className="text-slate-800">{lastModifier?.name}</span></p>
          <h3 className="text-lg font-black text-slate-800 leading-tight tracking-tighter">Tipo: {project.type}</h3>
        </div>
      </div>

      {project.status === ContentStatus.INICIADO ? (
        <div className="bg-indigo-50 p-6 rounded-[28px] mb-6 border-2 border-indigo-100/50">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">📥 Pedido de Matías:</p>
          <p className="text-sm font-bold text-slate-700 italic leading-relaxed">"{project.prompt}"</p>
        </div>
      ) : (
        <div className="relative bg-slate-50 rounded-[28px] mb-6 aspect-square max-h-[400px] border-4 border-slate-50 flex items-center justify-center overflow-hidden group">
          {project.type === ContentType.IMAGEN ? (
            <>
              <img src={project.output} className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-110" alt="Output" onClick={() => onZoom(project.output!)} />
              <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                 <button onClick={() => onZoom(project.output!)} className="bg-white text-indigo-600 p-4 rounded-2xl hover:bg-indigo-50 transition-all font-black">🔍 AMPLIAR</button>
                 <button onClick={() => { const l = document.createElement('a'); l.href = project.output!; l.download = 'output.png'; l.click(); }} className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all font-black">📥 PC</button>
              </div>
            </>
          ) : (
            <div className="p-8 text-sm text-slate-600 font-bold italic leading-relaxed text-center">{project.output}</div>
          )}
        </div>
      )}

      {project.type === ContentType.IMAGEN && isCreator && project.status === ContentStatus.EN_EDICION && (
        <div className="bg-slate-50 p-4 rounded-2xl mb-6 border-2 border-slate-100">
           <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajustar con IA ({project.iterations} restantes)</p>
           </div>
           {project.iterations! > 0 ? (
             <div className="flex gap-2">
               <input className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400" placeholder="Ej: Cambia el fondo..." value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
               <button disabled={loading || !editPrompt} onClick={() => { onIterate(project.id, editPrompt); setEditPrompt(''); }} className="bg-indigo-600 text-white px-4 rounded-xl text-[10px] font-black hover:bg-indigo-700 disabled:bg-slate-300 transition-all uppercase tracking-widest">Generar con IA</button>
             </div>
           ) : <p className="text-[10px] text-red-400 font-black uppercase text-center py-2">Límite alcanzado</p>}
        </div>
      )}

      <div className="mt-auto space-y-4 pt-6 border-t border-slate-50">
        {project.reviewerComments && (
          <div className="bg-amber-50 p-4 rounded-2xl border-l-4 border-amber-400">
            <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">Feedback de Matías:</p>
            <p className="text-xs text-amber-900 font-bold">"{project.reviewerComments}"</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {isCreator && project.status === ContentStatus.INICIADO && (
             <div className="flex gap-2">
                <button onClick={() => onUpdateStatus(project.id, ContentStatus.EN_EDICION)} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Atender Pedido ✍️</button>
                {canDelegate && (
                  <button onClick={() => onDelegate(project.id)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[9px] font-black uppercase tracking-tighter hover:bg-slate-200 transition-all">Derivar</button>
                )}
             </div>
          )}

          {isCreator && (project.status === ContentStatus.EN_EDICION || project.status === ContentStatus.DEVUELTO) && (
            <div className="flex gap-2">
              <button onClick={() => onUpdateStatus(project.id, ContentStatus.EN_REVISION)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Enviar a revisión 🚀</button>
              <button onClick={() => onUpdateStatus(project.id, ContentStatus.CANCELADO)} className="px-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:bg-red-50 hover:text-red-400">DESCARTAR</button>
            </div>
          )}

          {isReviewer && project.status === ContentStatus.EN_REVISION && (
            <div className="space-y-4">
              <textarea className="w-full p-4 text-xs border-2 border-slate-100 rounded-2xl bg-slate-50 focus:bg-white outline-none font-bold" placeholder="Escribe tu veredicto..." value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => onUpdateStatus(project.id, ContentStatus.APROBADO, comment)} className="bg-emerald-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-tighter hover:bg-emerald-700 transition-all">Aprobar</button>
                <button onClick={() => onUpdateStatus(project.id, ContentStatus.DEVUELTO, comment)} className="bg-amber-500 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-tighter hover:bg-amber-600 transition-all">Devolver</button>
                <button onClick={() => onUpdateStatus(project.id, ContentStatus.RECHAZADO, comment)} className="bg-red-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-tighter hover:bg-red-700 transition-all">Rechazar</button>
              </div>
            </div>
          )}

          {project.status === ContentStatus.APROBADO && (
            <div className="bg-emerald-50 py-3 rounded-2xl text-emerald-700 text-[10px] font-black uppercase text-center border border-emerald-100 tracking-widest">🌟 ARCHIVADO EN REPOSITORIO</div>
          )}
          {project.status === ContentStatus.CANCELADO && (
            <div className="bg-red-50 py-3 rounded-2xl text-red-400 text-[10px] font-black uppercase text-center border border-red-100 tracking-widest">BORRADOR RECHAZADO</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
