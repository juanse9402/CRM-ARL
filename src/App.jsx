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

// Colors for badges - updated for new states
const getStatusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('pendiente')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s.includes('proceso')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s.includes('atendido')) return 'bg-green-100 text-green-800 border-green-200';
  if (s.includes('no contactado')) return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const Dashboard = ({ data }) => {
  const totalClients = data.length;
  
  const statusCounts = useMemo(() => {
    const counts = {};
    data.forEach(client => {
      const status = getVal(client, 'estado_de_atencion') || 'Sin Estado';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [data]);

  const cityCounts = useMemo(() => {
    const counts = {};
    data.forEach(client => {
      const city = getVal(client, 'municipio') || 'Sin Municipio';
      counts[city] = (counts[city] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center space-x-4">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Total Clientes</p>
          <h3 className="text-2xl font-bold text-slate-800">{totalClients}</h3>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Estado de Atención</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex justify-between items-center">
              <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium border", getStatusColor(status))}>
                {status}
              </span>
              <span className="text-sm font-medium text-slate-600">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Building className="w-5 h-5 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Top Municipios</h3>
        </div>
        <div className="space-y-3">
          {cityCounts.map(([city, count]) => (
            <div key={city} className="flex justify-between items-center">
              <span className="text-sm text-slate-600 truncate mr-2" title={city}>{city}</span>
              <span className="text-sm font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{count}</span>
            </div>
          ))}
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

      const matchesStatus = statusFilter ? statusValue === statusFilter : true;
      const matchesApproach = approachFilter ? approachValue === approachFilter : true;

      return matchesSearch && matchesStatus && matchesApproach;
    });
  }, [data, searchTerm, statusFilter, approachFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, approachFilter]);

  const updateClientStatus = async (clientToUpdate, newStatus) => {
    try {
      // Usar Supabase .update() con el id de la fila
      // Asumimos que la columna en Supabase se llama estado_de_atencion o Estado de Atención
      // Primero encontramos el nombre exacto de la columna estado en el objeto
      let estadoKey = 'estado_de_atencion';
      if (clientToUpdate['Estado de Atención'] !== undefined) estadoKey = 'Estado de Atención';

      const updatePayload = { [estadoKey]: newStatus };
      
      const { error } = await supabase
        .from('clientes')
        .update(updatePayload)
        .eq('id', clientToUpdate.id);

      if (error) throw error;

      setData(prev => prev.map(c => c.id === clientToUpdate.id ? { ...c, [estadoKey]: newStatus } : c));
      if (selectedClient && selectedClient.id === clientToUpdate.id) {
        setSelectedClient({ ...selectedClient, [estadoKey]: newStatus });
      }
    } catch (err) {
      console.error(err);
      alert('Error al actualizar el estado en Supabase.');
    }
  };

  const getWhatsAppLink = (phone, empresaName) => {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    const text = `Hola *${empresaName}* le escribimos de la ARL para realizar seguimiento...`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
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

        {!loading && !error && <Dashboard data={data} />}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Buscar por Empresa o Contrato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white"
                value={approachFilter}
                onChange={(e) => setApproachFilter(e.target.value)}
              >
                <option value="">Todos los Abordajes</option>
                {uniqueApproaches.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
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
                          <span className={clsx("px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border", getStatusColor(getVal(client, 'estado_de_atencion')))}>
                            {getVal(client, 'estado_de_atencion') || 'Sin Estado'}
                          </span>
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
                  <span className="hidden sm:inline">Mostrando </span><span className="font-medium">{filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> - <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-medium">{filteredData.length}</span>
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
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Atendido">Atendido</option>
                      <option value="No Contactado">No Contactado</option>
                    </select>
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
                          href={getWhatsAppLink(getVal(selectedClient, 'telefono_1_id'), getVal(selectedClient, 'empresa_nombre_comercial') || '')}
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
                          href={getWhatsAppLink(getVal(selectedClient, 'telefono_2_id'), getVal(selectedClient, 'empresa_nombre_comercial') || '')}
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
