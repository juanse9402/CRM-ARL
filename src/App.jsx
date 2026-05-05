import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Phone, Mail, ChevronLeft, ChevronRight, BarChart3, Users, Building, Activity, X } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from './supabase';

// Helper to get values robustly in case column names have slight variations
const getVal = (obj, key) => {
  if (obj === null || obj === undefined) return null;
  if (obj[key] !== undefined) return obj[key];
  const normalizedKey = key.toLowerCase().replace(/[\s\/]/g, '_');
  for (let k of Object.keys(obj)) {
    if (k.toLowerCase().replace(/[\s\/]/g, '_') === normalizedKey) {
      return obj[k];
    }
  }
  return null;
};

// Format phone number according to requirements
const formatPhoneForWhatsApp = (phoneStr) => {
  if (!phoneStr) return null;
  let cleanNumber = String(phoneStr).replace(/[\s\-\(\)]/g, '');
  if (cleanNumber.length === 10) {
    cleanNumber = '57' + cleanNumber;
  }
  return cleanNumber;
};

const isValidWhatsAppNumber = (phoneStr) => {
  if (!phoneStr) return false;
  let cleanNumber = String(phoneStr).replace(/[\s\-\(\)]/g, '');
  return cleanNumber.length === 10 && cleanNumber.startsWith('3');
};

const getStatusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (!s || s === 'sin estado' || s === 'sin gestión' || s.includes('definir estado')) return 'bg-red-50 text-red-600 border-red-200 font-bold';
  if (s.includes('planificado')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s === 'seguimiento inicial') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s === 'seguimiento avanzado') return 'bg-green-100 text-green-800 border-green-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const getDaysPassed = (dateStr) => {
  if (!dateStr) return 0;
  const pastDate = new Date(dateStr);
  const now = new Date();
  const diffTime = now - pastDate;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const Dashboard = ({ data }) => {
  const totalClients = data.length;
  
  const sinGestionCount = data.filter(c => {
    const s = String(getVal(c, 'estado_de_atencion') || '').toLowerCase();
    return !s || s === 'sin estado' || s === 'sin gestión' || s.includes('definir estado');
  }).length;
  
  const alertaCount = data.filter(c => {
    const status = String(getVal(c, 'estado_de_atencion') || '').toLowerCase();
    const days = getDaysPassed(getVal(c, 'fecha_cambio_estado'));
    return (status === 'planificado' || status === 'seguimiento inicial') && days > 90;
  }).length;
  
  const gestionActivaCount = data.filter(c => {
    const s = String(getVal(c, 'estado_de_atencion') || '').toLowerCase();
    return s.includes('planificado') || s.includes('seguimiento');
  }).length;

  const statusCounts = useMemo(() => {
    const counts = {
      'Sin gestión': 0,
      'Planificado': 0,
      'Seguimiento inicial': 0,
      'Seguimiento avanzado': 0
    };
    data.forEach(client => {
      const s = String(getVal(client, 'estado_de_atencion') || '').toLowerCase();
      if (s.includes('avanzado')) counts['Seguimiento avanzado']++;
      else if (s.includes('inicial')) counts['Seguimiento inicial']++;
      else if (s.includes('planificado')) counts['Planificado']++;
      else counts['Sin gestión']++;
    });
    return counts;
  }, [data]);

  return (
    <div className="space-y-6 mb-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Empresas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Building className="w-16 h-16 text-[#0033A0]" />
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1 z-10 uppercase tracking-wider">Total Empresas</p>
          <h3 className="text-4xl font-black text-[#0033A0] z-10">{totalClients}</h3>
          <p className="text-xs text-slate-400 mt-2 z-10 font-medium">Conteo general</p>
        </div>

        {/* Alertas Críticas */}
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-5 flex flex-col relative overflow-hidden ring-1 ring-red-500/20 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="text-7xl">⚠️</span>
          </div>
          <p className="text-xs font-bold text-red-600 mb-1 z-10 uppercase tracking-wider flex items-center">
            ⚠️ Alertas Críticas
          </p>
          <h3 className="text-4xl font-black text-red-700 z-10">{alertaCount}</h3>
          <p className="text-xs text-red-500 mt-2 z-10 font-bold">+90 días en un mismo estado</p>
        </div>

        {/* En Gestión */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Activity className="w-16 h-16 text-green-500" />
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1 z-10 uppercase tracking-wider">📈 En Gestión</p>
          <h3 className="text-4xl font-black text-green-600 z-10">{gestionActivaCount}</h3>
          <p className="text-xs text-slate-400 mt-2 z-10 font-medium">'Planificado' o 'Seguimientos'</p>
        </div>
        
        {/* Sin Gestión */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Users className="w-16 h-16 text-slate-500" />
          </div>
          <p className="text-xs font-bold text-slate-500 mb-1 z-10 uppercase tracking-wider">✅ Sin Gestión</p>
          <h3 className="text-4xl font-black text-slate-700 z-10">{sinGestionCount}</h3>
          <p className="text-xs text-slate-400 mt-2 z-10 font-medium">Pendientes de inicio</p>
        </div>
      </div>

      {/* Planning Visual */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-bold text-[#0033A0] uppercase tracking-wider mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" /> Planning Visual - Distribución de Estados
        </h3>
        <div className="w-full h-8 flex rounded-full overflow-hidden mb-4 bg-slate-100">
          <div style={{ width: `${(statusCounts['Sin gestión'] / (totalClients || 1)) * 100}%` }} className="bg-slate-300 transition-all duration-500" title={`Sin gestión: ${statusCounts['Sin gestión']}`}></div>
          <div style={{ width: `${(statusCounts['Planificado'] / (totalClients || 1)) * 100}%` }} className="bg-[#00AEC7] transition-all duration-500" title={`Planificado: ${statusCounts['Planificado']}`}></div>
          <div style={{ width: `${(statusCounts['Seguimiento inicial'] / (totalClients || 1)) * 100}%` }} className="bg-[#0033A0] transition-all duration-500" title={`Seguimiento inicial: ${statusCounts['Seguimiento inicial']}`}></div>
          <div style={{ width: `${(statusCounts['Seguimiento avanzado'] / (totalClients || 1)) * 100}%` }} className="bg-green-500 transition-all duration-500" title={`Seguimiento avanzado: ${statusCounts['Seguimiento avanzado']}`}></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium text-slate-600">
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-slate-300 mr-2"></div>Sin Gestión: {((statusCounts['Sin gestión'] / (totalClients || 1)) * 100 || 0).toFixed(1)}%</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#00AEC7] mr-2"></div>Planificado: {((statusCounts['Planificado'] / (totalClients || 1)) * 100 || 0).toFixed(1)}%</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#0033A0] mr-2"></div>Seg. Inicial: {((statusCounts['Seguimiento inicial'] / (totalClients || 1)) * 100 || 0).toFixed(1)}%</div>
          <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>Seg. Avanzado: {((statusCounts['Seguimiento avanzado'] / (totalClients || 1)) * 100 || 0).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approachFilter, setApproachFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [showOnlyUrgent, setShowOnlyUrgent] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedClient, setSelectedClient] = useState(null);

  const fetchData = async () => {
    try {
      const { data: clients, error } = await supabase.from('clientes').select('*');
      if (error) throw error;
      setData(clients || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Error al conectar con Supabase. Verifica tu conexión.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueStatuses = [...new Set(data.map(item => getVal(item, 'estado_de_atencion')).filter(Boolean))];
  const uniqueApproaches = [...new Set(data.map(item => getVal(item, 'tipo_de_abordaje')).filter(Boolean))];
  const uniqueCities = [...new Set(data.map(item => getVal(item, 'municipio')).filter(Boolean))].sort();

  const filteredData = useMemo(() => {
    return data.filter(client => {
      let matchesSearch = true;
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        // Specifically check empresa_nombre_comercial and contrato_arl_desc as requested
        const empresa = String(getVal(client, 'empresa_nombre_comercial') || '').toLowerCase();
        const contrato = String(getVal(client, 'contrato_arl_desc') || '').toLowerCase();
        matchesSearch = empresa.includes(lowerSearch) || contrato.includes(lowerSearch);
      }
      
      const statusValue = getVal(client, 'estado_de_atencion');
      const approachValue = getVal(client, 'tipo_de_abordaje');
      const cityValue = getVal(client, 'municipio');

      const matchesStatus = statusFilter 
        ? (statusFilter === 'Sin gestión' 
            ? (!statusValue || String(statusValue).trim() === '' || statusValue === 'Sin gestión') 
            : statusValue === statusFilter)
        : true;
      const matchesApproach = approachFilter ? approachValue === approachFilter : true;
      const matchesCity = cityFilter ? cityValue === cityFilter : true;

      let matchesUrgent = true;
      if (showOnlyUrgent) {
        const statusValLower = String(statusValue || '').toLowerCase();
        if (statusValLower === 'sin gestión' || statusValLower === 'sin estado' || !statusValLower) {
          matchesUrgent = false;
        } else {
          const days = getDaysPassed(getVal(client, 'fecha_cambio_estado'));
          if (days < 61) matchesUrgent = false;
        }
      }

      return matchesSearch && matchesStatus && matchesApproach && matchesCity && matchesUrgent;
    });
  }, [data, searchTerm, statusFilter, approachFilter, cityFilter, showOnlyUrgent]);

  const urgentData = useMemo(() => {
    return filteredData.filter(c => {
      const status = String(getVal(c, 'estado_de_atencion') || '').toLowerCase();
      const days = getDaysPassed(getVal(c, 'fecha_cambio_estado'));
      return (status === 'planificado' || status === 'seguimiento inicial') && days > 90;
    }).sort((a, b) => getDaysPassed(getVal(b, 'fecha_cambio_estado')) - getDaysPassed(getVal(a, 'fecha_cambio_estado')));
  }, [filteredData]);

  const currentViewData = activeTab === 'general' ? filteredData : urgentData;
  const totalPages = Math.ceil(currentViewData.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentViewData.slice(start, start + itemsPerPage);
  }, [currentViewData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, approachFilter, cityFilter, activeTab, showOnlyUrgent]);

  const updateClientStatus = async (clientToUpdate, newStatus) => {
    try {
      // Usar Supabase .update() con el id de la fila
      // Asumimos que la columna en Supabase se llama estado_de_atencion o Estado de Atención
      // Primero encontramos el nombre exacto de la columna estado en el objeto
      let estadoKey = 'estado_de_atencion';
      if (clientToUpdate['Estado de Atención'] !== undefined) estadoKey = 'Estado de Atención';

      const updatePayload = { 
        [estadoKey]: newStatus,
        fecha_cambio_estado: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('clientes')
        .update(updatePayload)
        .eq('id', clientToUpdate.id);

      if (error) throw error;

      setData(prev => prev.map(c => c.id === clientToUpdate.id ? { ...c, [estadoKey]: newStatus, fecha_cambio_estado: updatePayload.fecha_cambio_estado } : c));
      if (selectedClient && selectedClient.id === clientToUpdate.id) {
        setSelectedClient({ ...selectedClient, [estadoKey]: newStatus, fecha_cambio_estado: updatePayload.fecha_cambio_estado });
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado en Supabase.');
    }
  };

  const getWhatsAppLink = (phone, empresaName, status) => {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    const s = String(status || '').toLowerCase();
    let text = `Hola, ${empresaName}. Le escribimos de la ARL para realizar seguimiento...`;

    if (s === 'planificado') {
      text = `Hola, ${empresaName}. Habla Carolina Lozada, prevencionista de ARL SURA. Me contacto para coordinar una reunión para revisar necesidades en seguridad y salud en el trabajo y definir el plan de trabajo con su empresa. Quedo atenta para programarla según su disponibilidad.`;
    } else if (s === 'seguimiento inicial' || s === 'seguimiento avanzado') {
      text = `Hola, ${empresaName}. Me encuentro realizando seguimiento al plan de trabajo acordado con ARL SURA y validando su avance. Si tienen actividades pendientes o requieren apoyo, quedo atenta para gestionarlo.`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#0033A0] text-white p-2 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">CRM de Seguimiento ARL</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && <Dashboard data={filteredData} />}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-[#0033A0] sm:text-sm"
                placeholder="Buscar por Empresa o Contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowOnlyUrgent(!showOnlyUrgent)}
                className={clsx(
                  "px-4 py-2 text-sm font-bold rounded-lg border transition-all flex items-center justify-center whitespace-nowrap",
                  showOnlyUrgent 
                    ? "bg-orange-100 text-orange-700 border-orange-300 ring-2 ring-orange-500/20 shadow-inner" 
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm"
                )}
              >
                <span className="mr-2">{showOnlyUrgent ? '🔥' : '⚡'}</span>
                Ver Solo Urgentes
              </button>

              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-[#0033A0] sm:text-sm rounded-lg bg-white"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                <option value="">Todos los Municipios</option>
                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-[#0033A0] sm:text-sm rounded-lg bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                <option value="Sin gestión">Sin gestión</option>
                <option value="Planificado">Planificado</option>
                <option value="Seguimiento inicial">Seguimiento inicial</option>
                <option value="Seguimiento avanzado">Seguimiento avanzado</option>
              </select>

              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-[#0033A0] sm:text-sm rounded-lg bg-white"
                value={approachFilter}
                onChange={(e) => setApproachFilter(e.target.value)}
              >
                <option value="">Todos los Abordajes</option>
                {uniqueApproaches.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="flex border-b border-slate-200 px-4 pt-4 bg-white">
            <button
              onClick={() => setActiveTab('general')}
              className={clsx(
                "px-4 py-2 font-semibold text-sm border-b-2 outline-none transition-colors",
                activeTab === 'general' ? "border-[#0033A0] text-[#0033A0]" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              Tabla General
            </button>
            <button
              onClick={() => setActiveTab('urgentes')}
              className={clsx(
                "px-4 py-2 font-semibold text-sm border-b-2 outline-none transition-colors flex items-center",
                activeTab === 'urgentes' ? "border-red-600 text-red-600" : "border-transparent text-slate-500 hover:text-red-500 hover:border-red-200"
              )}
            >
              <span className="mr-2">🔔</span> Próximos a Vencer ({urgentData.length})
            </button>
          </div>

          <div className="overflow-x-auto relative" style={{ maxHeight: '600px' }}>
            {loading ? (
              <div className="p-10 text-center text-slate-500">Cargando datos de Supabase...</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato ARL</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Municipio</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado de Atención</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Abordaje</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                        No se encontraron resultados
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((client) => (
                      <tr 
                        key={client.id} 
                        onClick={() => setSelectedClient(client)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                          {getVal(client, 'contrato_arl_desc') || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-800 font-semibold max-w-[200px] sm:max-w-xs truncate">
                          {getVal(client, 'empresa_nombre_comercial') || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 hidden sm:table-cell">
                          {getVal(client, 'municipio') || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2">
                            <div>
                              <span className={clsx("px-2.5 py-1 inline-flex text-xs leading-5 rounded-full border font-bold shadow-sm", getStatusColor(getVal(client, 'estado_de_atencion')))}>
                                {getVal(client, 'estado_de_atencion') || '⚠️ Sin gestión'}
                              </span>
                            </div>
                            {(() => {
                              const status = String(getVal(client, 'estado_de_atencion') || '').toLowerCase();
                              if (!getVal(client, 'fecha_cambio_estado') || status === 'sin gestión' || status === 'sin estado' || !status) return null;
                              
                              const days = getDaysPassed(getVal(client, 'fecha_cambio_estado'));
                              
                              let barColor = 'bg-slate-300';
                              let text = `Lleva ${days} días`;
                              
                              if (days <= 30) {
                                barColor = 'bg-green-500';
                                text = `Lleva ${days} días`;
                              } else if (days <= 60) {
                                barColor = 'bg-yellow-400';
                                text = `Lleva ${days} días`;
                              } else if (days <= 89) {
                                barColor = 'bg-orange-500';
                                text = `Faltan ${90 - days} días para alerta`;
                              } else {
                                barColor = 'bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]';
                                text = `¡Alerta Crítica! Lleva ${days} días`;
                              }
                              
                              const progress = Math.min((days / 90) * 100, 100);

                              return (
                                <div className="w-full max-w-[200px] mt-1">
                                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-1 ring-1 ring-slate-300/50 inset-shadow-sm">
                                    <div 
                                      className={clsx("h-full transition-all duration-1000 ease-out", barColor)} 
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                  <span className={clsx("text-[10px] font-bold uppercase tracking-wider", days >= 90 ? "text-red-600" : "text-slate-500")}>
                                    {text}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 hidden md:table-cell">
                          {getVal(client, 'tipo_de_abordaje') || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  <span className="hidden sm:inline">Mostrando </span><span className="font-medium">{currentViewData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, currentViewData.length)}</span> de <span className="font-medium">{currentViewData.length}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Side Panel Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setSelectedClient(null)}></div>
          
          <div className="fixed inset-y-0 right-0 max-w-md w-full flex">
            <div className="w-full h-full bg-white shadow-2xl transform transition-transform flex flex-col">
              
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                <h2 className="text-lg font-bold text-slate-800" id="slide-over-title">Ficha de Cliente</h2>
                <button
                  type="button"
                  className="rounded-full p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-500 transition-colors"
                  onClick={() => setSelectedClient(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{getVal(selectedClient, 'empresa_nombre_comercial') || 'Sin Nombre'}</h3>
                  <p className="text-sm text-slate-500 mt-1">Contrato: {getVal(selectedClient, 'contrato_arl_desc') || '-'}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estado de Atención</label>
                    <select
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm border font-medium"
                      value={getVal(selectedClient, 'estado_de_atencion') || ''}
                      onChange={(e) => updateClientStatus(selectedClient, e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Sin gestión">Sin gestión</option>
                      <option value="Planificado">Planificado</option>
                      <option value="Seguimiento inicial">Seguimiento inicial</option>
                      <option value="Seguimiento avanzado">Seguimiento avanzado</option>
                    </select>
                    {getVal(selectedClient, 'fecha_cambio_estado') && (
                      <p className="text-xs text-slate-500 mt-2 font-medium">
                        ⏱️ Días en este estado: <span className="text-slate-800 font-bold">{getDaysPassed(getVal(selectedClient, 'fecha_cambio_estado'))}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">Información de Contacto</h4>
                  
                  {/* WhatsApp Botón 1 */}
                  {getVal(selectedClient, 'telefono_1_id') && (
                    <div className="flex flex-col space-y-2">
                      <span className="text-xs text-slate-500">Teléfono 1: {getVal(selectedClient, 'telefono_1_id')}</span>
                      {isValidWhatsAppNumber(getVal(selectedClient, 'telefono_1_id')) ? (
                        <a 
                          href={getWhatsAppLink(getVal(selectedClient, 'telefono_1_id'), getVal(selectedClient, 'empresa_nombre_comercial') || '', getVal(selectedClient, 'estado_de_atencion'))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#25D366] hover:bg-[#128C7E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366] transition-colors"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Contactar WhatsApp 1
                        </a>
                      ) : (
                        <button disabled className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-slate-400 bg-slate-100 cursor-not-allowed">
                          <Phone className="w-4 h-4 mr-2 opacity-50" />
                          Número no válido para WhatsApp
                        </button>
                      )}
                    </div>
                  )}

                  {/* WhatsApp Botón 2 */}
                  {getVal(selectedClient, 'telefono_2_id') && (
                    <div className="flex flex-col space-y-2 mt-4">
                      <span className="text-xs text-slate-500">Teléfono 2: {getVal(selectedClient, 'telefono_2_id')}</span>
                      {isValidWhatsAppNumber(getVal(selectedClient, 'telefono_2_id')) ? (
                        <a 
                          href={getWhatsAppLink(getVal(selectedClient, 'telefono_2_id'), getVal(selectedClient, 'empresa_nombre_comercial') || '', getVal(selectedClient, 'estado_de_atencion'))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#25D366] hover:bg-[#128C7E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366] transition-colors"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Contactar WhatsApp 2
                        </a>
                      ) : (
                        <button disabled className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-slate-400 bg-slate-100 cursor-not-allowed">
                          <Phone className="w-4 h-4 mr-2 opacity-50" />
                          Número no válido para WhatsApp
                        </button>
                      )}
                    </div>
                  )}

                  {/* Email Botón */}
                  {getVal(selectedClient, 'email_id') && (
                    <div className="flex flex-col space-y-2 mt-4">
                      <span className="text-xs text-slate-500">Correo: {getVal(selectedClient, 'email_id')}</span>
                      <a 
                        href={`mailto:${getVal(selectedClient, 'email_id')}?subject=${encodeURIComponent(`Seguimiento ARL - ${getVal(selectedClient, 'empresa_nombre_comercial')}`)}`}
                        className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        <Mail className="w-4 h-4 mr-2 text-slate-400" />
                        Enviar Correo
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">Detalles Adicionales</h4>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <dt className="text-xs font-medium text-slate-500">Municipio</dt>
                      <dd className="mt-1 text-sm text-slate-900">{getVal(selectedClient, 'municipio') || '-'}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-xs font-medium text-slate-500">Tipo de Abordaje</dt>
                      <dd className="mt-1 text-sm text-slate-900">{getVal(selectedClient, 'tipo_de_abordaje') || '-'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
