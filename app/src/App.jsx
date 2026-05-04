import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Phone, Mail, ChevronLeft, ChevronRight, BarChart3, Users, Building, Activity, X } from 'lucide-react';
import clsx from 'clsx';

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

// Colors for badges
const getStatusColor = (status) => {
  const s = String(status).toLowerCase();
  if (s.includes('pendiente')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s.includes('proceso')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s.includes('finalizado') || s.includes('atendido')) return 'bg-green-100 text-green-800 border-green-200';
  if (s.includes('no contactado')) return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const Dashboard = ({ data }) => {
  // Calculate stats
  const totalClients = data.length;
  
  const statusCounts = useMemo(() => {
    const counts = {};
    data.forEach(client => {
      const status = client['Estado de Atención'] || 'Sin Estado';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [data]);

  const cityCounts = useMemo(() => {
    const counts = {};
    data.forEach(client => {
      const city = client['MUNICIPIO'] || 'Sin Municipio';
      counts[city] = (counts[city] || 0) + 1;
    });
    // sort cities by count desc
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5); // top 5
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
  
  // Filtering and Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approachFilter, setApproachFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedClient, setSelectedClient] = useState(null);

  // Fetch data
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/clients`);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('No se pudo conectar a la base de datos local. Asegúrate de ejecutar el servidor node (node server.js).');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get unique values for filters
  const uniqueStatuses = [...new Set(data.map(item => item['Estado de Atención']).filter(Boolean))];
  const uniqueApproaches = [...new Set(data.map(item => item['Tipo de abordaje']).filter(Boolean))];

  // Filtering Logic (Fuzzy-ish Search)
  const filteredData = useMemo(() => {
    return data.filter(client => {
      let matchesSearch = true;
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        matchesSearch = Object.values(client).some(val => 
          String(val).toLowerCase().includes(lowerSearch)
        );
      }
      
      const matchesStatus = statusFilter ? client['Estado de Atención'] === statusFilter : true;
      const matchesApproach = approachFilter ? client['Tipo de abordaje'] === approachFilter : true;

      return matchesSearch && matchesStatus && matchesApproach;
    });
  }, [data, searchTerm, statusFilter, approachFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, approachFilter]);

  const updateClientStatus = async (clientToUpdate, newStatus) => {
    try {
      const response = await fetch(`/api/clients/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: clientToUpdate.id,
          contrato: clientToUpdate['Contrato ARL DESC'],
          nombre: clientToUpdate['Empresa Nombre Comercial'],
          estado: newStatus 
        })
      });
      if (response.ok) {
        // Update local state immediately
        setData(prev => prev.map(c => c.id === clientToUpdate.id ? { ...c, 'Estado de Atención': newStatus } : c));
        if (selectedClient && selectedClient.id === clientToUpdate.id) {
          setSelectedClient({ ...selectedClient, 'Estado de Atención': newStatus });
        }
      } else {
        alert('Error al actualizar el estado. Por favor verifica que el archivo de Excel esté cerrado.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar.');
    }
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
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Buscar por Nombre, Contrato, Municipio..."
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

          {/* Table */}
          <div className="overflow-x-auto relative" style={{ maxHeight: '600px' }}>
            {loading ? (
              <div className="p-10 text-center text-slate-500">Cargando datos...</div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato ARL</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Municipio</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado de Atención</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Abordaje</th>
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
                          {client['Contrato ARL DESC'] || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-800 font-semibold max-w-xs truncate">
                          {client['Empresa Nombre Comercial'] || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {client['MUNICIPIO'] || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={clsx("px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border", getStatusColor(client['Estado de Atención']))}>
                            {client['Estado de Atención'] || 'Sin Estado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {client['Tipo de abordaje'] || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Mostrando <span className="font-medium">{filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de <span className="font-medium">{filteredData.length}</span> resultados
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
                  <h3 className="text-xl font-bold text-slate-900">{selectedClient['Empresa Nombre Comercial'] || 'Sin Nombre'}</h3>
                  <p className="text-sm text-slate-500 mt-1">Contrato: {selectedClient['Contrato ARL DESC'] || '-'}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Estado de Atención</label>
                    <select
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm border font-medium"
                      value={selectedClient['Estado de Atención'] || ''}
                      onChange={(e) => updateClientStatus(selectedClient, e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Finalizado/Atendido">Finalizado/Atendido</option>
                      <option value="No contactado">No contactado</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b pb-2">Información de Contacto</h4>
                  
                  {/* WhatsApp Botón 1 */}
                  {selectedClient['Telefono 1 ID'] && (
                    <div className="flex flex-col space-y-2">
                      <span className="text-xs text-slate-500">Teléfono 1: {selectedClient['Telefono 1 ID']}</span>
                      {isValidWhatsAppNumber(selectedClient['Telefono 1 ID']) ? (
                        <a 
                          href={`https://wa.me/${formatPhoneForWhatsApp(selectedClient['Telefono 1 ID'])}?text=${encodeURIComponent(`Hola, me pongo en contacto de la ARL para la empresa ${selectedClient['Empresa Nombre Comercial']}...`)}`}
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
                  {selectedClient['Telefono 2 ID'] && (
                    <div className="flex flex-col space-y-2 mt-4">
                      <span className="text-xs text-slate-500">Teléfono 2: {selectedClient['Telefono 2 ID']}</span>
                      {isValidWhatsAppNumber(selectedClient['Telefono 2 ID']) ? (
                        <a 
                          href={`https://wa.me/${formatPhoneForWhatsApp(selectedClient['Telefono 2 ID'])}?text=${encodeURIComponent(`Hola, me pongo en contacto de la ARL para la empresa ${selectedClient['Empresa Nombre Comercial']}...`)}`}
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
                  {selectedClient['Email ID'] && (
                    <div className="flex flex-col space-y-2 mt-4">
                      <span className="text-xs text-slate-500">Correo: {selectedClient['Email ID']}</span>
                      <a 
                        href={`mailto:${selectedClient['Email ID']}?subject=${encodeURIComponent(`Seguimiento ARL - ${selectedClient['Empresa Nombre Comercial']}`)}`}
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
                      <dd className="mt-1 text-sm text-slate-900">{selectedClient['MUNICIPIO'] || '-'}</dd>
                    </div>
                    <div className="sm:col-span-1">
                      <dt className="text-xs font-medium text-slate-500">Tipo de Abordaje</dt>
                      <dd className="mt-1 text-sm text-slate-900">{selectedClient['Tipo de abordaje'] || '-'}</dd>
                    </div>
                    {/* Add more fields here as needed by checking object keys, let's just dump the rest except known keys */}
                    {Object.entries(selectedClient).map(([key, value]) => {
                      const hiddenKeys = ['id', 'Empresa Nombre Comercial', 'Contrato ARL DESC', 'Estado de Atención', 'Telefono 1 ID', 'Telefono 2 ID', 'Email ID', 'MUNICIPIO', 'Tipo de abordaje'];
                      if (hiddenKeys.includes(key)) return null;
                      return (
                        <div key={key} className="sm:col-span-2">
                          <dt className="text-xs font-medium text-slate-500 truncate" title={key}>{key}</dt>
                          <dd className="mt-1 text-sm text-slate-900">{String(value || '-')}</dd>
                        </div>
                      )
                    })}
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
