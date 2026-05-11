import React, { useState, useEffect } from 'react';

export default function DailyPolishReport({ moduleSwitcher, supabase, toast, location }) {
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // Search state
  const [searchKapan, setSearchKapan] = useState('');
  const [searchShape, setSearchShape] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Entry Form States
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([
    { kapan: '', carats: '', shape: '' }
  ]);

  // Edit Form States
  const [editForm, setEditForm] = useState({ id: null, date: '', kapan: '', carats: '', shape: '' });
  
  const [catForm, setCatForm] = useState('');

  // Confirm Modal State
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: prodData, error: prodErr } = await supabase
      .from('daily_polish_production')
      .select('*')
      .eq('location', location)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    
    const { data: catData, error: catErr } = await supabase
      .from('shape_categories')
      .select('*')
      .order('name');
    
    if (prodErr) console.error('Error fetching production:', prodErr);
    if (catErr) console.error('Error fetching categories:', catErr);

    setRecords(prodData || []);
    setCategories(catData || []);
    setLoading(false);
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Entry Handlers
  const addEntryRow = () => {
    setEntries([...entries, { kapan: '', carats: '', shape: categories[0]?.name || '' }]);
  };

  const removeEntryRow = (index) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntryField = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const handleEntrySubmit = async () => {
    if (isSaving) return;
    if (!entryDate) return toast('Please select a date', 'danger');
    const validEntries = entries.filter(e => e.kapan.trim() && e.carats && e.shape);
    if (validEntries.length === 0) return toast('Please fill at least one complete entry', 'danger');

    setIsSaving(true);
    const payload = validEntries.map(e => ({
      date: entryDate,
      kapan: e.kapan.trim(),
      carats: parseFloat(e.carats),
      shape: e.shape,
      location: location
    }));

    const { error } = await supabase.from('daily_polish_production').insert(payload);
    if (error) {
      toast('Error saving production data', 'danger');
    } else {
      toast('Production data saved successfully');
      setShowEntryModal(false);
      setEntries([{ kapan: '', carats: '', shape: categories[0]?.name || '' }]);
      fetchData();
    }
    setIsSaving(false);
  };

  const handleEditSubmit = async () => {
    if (isSaving) return;
    if (!editForm.date || !editForm.kapan.trim() || !editForm.carats || !editForm.shape) {
        return toast('Please fill all fields', 'danger');
    }

    setIsSaving(true);
    const { error } = await supabase
        .from('daily_polish_production')
        .update({
            date: editForm.date,
            kapan: editForm.kapan.trim(),
            carats: parseFloat(editForm.carats),
            shape: editForm.shape
        })
        .eq('id', editForm.id);

    if (error) {
        toast('Error updating record', 'danger');
    } else {
        toast('Record updated successfully');
        setShowEditModal(false);
        fetchData();
    }
    setIsSaving(false);
  };

  const openEdit = (record) => {
      setEditForm(record);
      setShowEditModal(true);
  };

  // Category Actions
  const addCategory = async () => {
    if (!catForm.trim() || isAddingCategory) return;
    setIsAddingCategory(true);
    const { error } = await supabase.from('shape_categories').insert([{ name: catForm.trim() }]);
    if (error) {
      setIsAddingCategory(false);
      return toast('Category exists or error occurred', 'danger');
    }
    setCatForm('');
    fetchData();
    toast('Shape category added');
    setIsAddingCategory(false);
  };
  
  const deleteCategory = async (id) => {
    const { error } = await supabase.from('shape_categories').delete().eq('id', id);
    if (error) return toast('Error deleting category', 'danger');
    fetchData();
    toast('Category deleted');
  };

  const deleteRecord = async (id) => {
    const { error } = await supabase.from('daily_polish_production').delete().eq('id', id);
    if (error) return toast('Error deleting record', 'danger');
    fetchData();
    toast('Record deleted');
  };

  // Filtering Logic
  const filteredRecords = records.filter(r => {
    const matchesKapan = r.kapan.toLowerCase().includes(searchKapan.toLowerCase());
    const matchesShape = r.shape.toLowerCase().includes(searchShape.toLowerCase());
    const matchesFromDate = fromDate ? r.date >= fromDate : true;
    const matchesToDate = toDate ? r.date <= toDate : true;
    return matchesKapan && matchesShape && matchesFromDate && matchesToDate;
  });

  // Group filtered records by date
  const groupedRecords = filteredRecords.reduce((acc, curr) => {
    if (!acc[curr.date]) acc[curr.date] = [];
    acc[curr.date].push(curr);
    return acc;
  }, {});

  // Calculate Kapan-wise stats for Mumbai
  const kapanStats = React.useMemo(() => {
    if (location !== 'Mumbai') return {};
    return filteredRecords.reduce((acc, curr) => {
      const kapan = curr.kapan.toUpperCase();
      acc[kapan] = (acc[kapan] || 0) + Number(curr.carats);
      return acc;
    }, {});
  }, [filteredRecords, location]);

  const confirmDelete = (id) => {
    setConfirmId(id);
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (confirmId) {
      await deleteRecord(confirmId);
    }
    setShowConfirm(false);
    setConfirmId(null);
  };

  return (
    <div style={{ background: '#fefdfd', minHeight: '100vh', paddingBottom: '60px' }}>
      <header className="d-flex justify-content-between align-items-center p-4 border-bottom bg-white sticky-top shadow-sm" style={{ zIndex: 1000 }}>
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-light rounded-circle p-2" onClick={moduleSwitcher} title="Back to Selection">
             <i className="fas fa-arrow-left"></i>
          </button>
          <h2 className="m-0" style={{ background: 'linear-gradient(to right, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>Daily Polish - {location}</h2>
        </div>
        <div className="d-flex gap-3 align-items-center flex-wrap">
            <div className="d-none d-lg-flex gap-2 align-items-center">
                <div className="position-relative">
                    <i className="fas fa-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                    <input 
                        type="text" 
                        className="form-control ps-5 rounded-pill" 
                        placeholder="Search Kapan..." 
                        style={{ width: '180px', background: '#f1f5f9', border: 'none' }}
                        value={searchKapan}
                        onChange={(e) => setSearchKapan(e.target.value)}
                    />
                </div>
                <div className="position-relative">
                    <i className="fas fa-gem position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                    <input 
                        type="text" 
                        className="form-control ps-5 rounded-pill" 
                        placeholder="Search Shape..." 
                        style={{ width: '180px', background: '#f1f5f9', border: 'none' }}
                        value={searchShape}
                        onChange={(e) => setSearchShape(e.target.value)}
                    />
                </div>
                <div className="d-flex align-items-center gap-2 ms-2">
                    <input type="date" className="form-control rounded-pill border-0 px-3" style={{ background: '#f1f5f9', fontSize: '0.85rem' }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    <span className="text-muted small fw-bold">TO</span>
                    <input type="date" className="form-control rounded-pill border-0 px-3" style={{ background: '#f1f5f9', fontSize: '0.85rem' }} value={toDate} onChange={e => setToDate(e.target.value)} />
                </div>
                {(searchKapan || searchShape || fromDate || toDate) && (
                    <button className="btn btn-light btn-sm rounded-circle" onClick={() => { setSearchKapan(''); setSearchShape(''); setFromDate(''); setToDate(''); }} title="Clear Filters">
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>
            <button className="btn btn-primary rounded-pill px-4 shadow-sm fw-bold" onClick={() => { setShowEntryModal(true); setEntries([{ kapan: '', carats: '', shape: categories[0]?.name || '' }]); }}>
                <i className="fas fa-plus me-2"></i> New Entry
            </button>
        </div>
      </header>

      <div className="container mt-4">
        {/* Mobile Filters */}
        <div className="d-lg-none mb-4">
             <div className="row g-2">
                <div className="col-6">
                    <div className="position-relative">
                        <i className="fas fa-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                        <input 
                            type="text" 
                            className="form-control ps-5 rounded-pill shadow-sm" 
                            placeholder="Kapan..." 
                            value={searchKapan}
                            onChange={(e) => setSearchKapan(e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-6">
                    <div className="position-relative">
                        <i className="fas fa-gem position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                        <input 
                            type="text" 
                            className="form-control ps-5 rounded-pill shadow-sm" 
                            placeholder="Shape..." 
                            value={searchShape}
                            onChange={(e) => setSearchShape(e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-12 mt-2">
                    <div className="d-flex align-items-center gap-2 bg-white p-2 rounded-pill shadow-sm">
                        <input type="date" className="form-control border-0 bg-transparent" style={{ fontSize: '0.85rem' }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
                        <span className="text-muted small fw-bold">TO</span>
                        <input type="date" className="form-control border-0 bg-transparent" style={{ fontSize: '0.85rem' }} value={toDate} onChange={e => setToDate(e.target.value)} />
                    </div>
                </div>
                {(searchKapan || searchShape || fromDate || toDate) && (
                    <div className="col-12 text-center mt-2">
                        <button className="btn btn-link btn-sm text-muted" onClick={() => { setSearchKapan(''); setSearchShape(''); setFromDate(''); setToDate(''); }}>
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Categories Bar */}
        <div className="d-flex justify-content-between align-items-center mb-5 bg-white p-3 rounded-4 shadow-sm border">
          <div className="d-flex align-items-center gap-2 overflow-auto scroll-hide" style={{ whiteSpace: 'nowrap' }}>
            <span className="fw-bold text-muted me-2 small text-uppercase">Shapes:</span>
            {categories.map(c => <span key={c.id} className="badge bg-light text-dark border px-3 py-2 rounded-pill fw-medium">{c.name}</span>)}
            {categories.length === 0 && <span className="text-muted small">No shapes added.</span>}
          </div>
          <button className="btn btn-link btn-sm text-decoration-none text-primary fw-bold" onClick={() => setShowCategoryModal(true)}>
            <i className="fas fa-cog me-1"></i> SETTINGS
          </button>
        </div>

        {/* Mumbai Statistics */}
        {location === 'Mumbai' && Object.keys(kapanStats).length > 0 && (
          <div className="mb-5 bg-white p-4 rounded-4 shadow-sm border mx-auto" style={{ maxWidth: '900px' }}>
            <h5 className="fw-bold mb-4 text-muted border-bottom pb-2"><i className="fas fa-chart-pie me-2 text-primary"></i>Kapan-wise Total Carats (Filtered)</h5>
            <div className="d-flex flex-wrap gap-3">
              {Object.entries(kapanStats).map(([kapan, total]) => (
                <div key={kapan} className="kapan-stat-card border rounded-3 p-3 text-center flex-grow-1" style={{ minWidth: '150px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                  <div className="fw-bold text-dark mb-1">{kapan}</div>
                  <div className="text-primary fw-bolder fs-4">{total.toFixed(2)} <span className="fs-6 text-muted">cts</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grouped Vertical Logs */}
        <div className="mx-auto" style={{ maxWidth: '900px' }}>
            {Object.keys(groupedRecords).length > 0 ? (
                Object.keys(groupedRecords).map(date => {
                    const dateEntries = groupedRecords[date];
                    const totalCarats = dateEntries.reduce((sum, r) => sum + Number(r.carats), 0);
                    
                    return (
                        <div key={date} className="mb-5">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <div className="date-badge-pill">
                                    <i className="far fa-calendar-check me-2"></i>
                                    {formatDate(date)}
                                </div>
                                <div className="flex-grow-1 border-bottom opacity-10"></div>
                            </div>
                            
                            <div className="date-group-card shadow-sm">
                                {dateEntries.map((record, idx) => (
                                    <div key={record.id} className={`entry-row ${idx < dateEntries.length - 1 ? 'border-bottom' : ''}`}>
                                        <div className="row align-items-center g-3 py-3 px-4">
                                            <div className="col-md-2">
                                                <span className="shape-tag">{record.shape}</span>
                                            </div>
                                            <div className="col-md-4">
                                                <h5 className="kapan-text mb-0">{record.kapan}</h5>
                                                <small className="text-muted small-time">
                                                    <i className="far fa-clock me-1"></i>
                                                    {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </small>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="carats-box">
                                                    <span className="carats-val">{Number(record.carats).toFixed(2)}</span>
                                                    <span className="carats-unit">cts</span>
                                                </div>
                                            </div>
                                            <div className="col-md-2 text-end">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button className="circle-btn edit" onClick={() => openEdit(record)} title="Edit">
                                                        <i className="fas fa-pencil-alt"></i>
                                                    </button>
                                                    <button className="circle-btn delete" onClick={() => confirmDelete(record.id)} title="Delete">
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {/* Footer with Total */}
                                <div className="date-group-footer bg-light px-4 py-3 border-top d-flex justify-content-between align-items-center">
                                    <span className="fw-bold text-muted small text-uppercase">Total Daily Production</span>
                                    <div className="total-carats-box">
                                        <span className="total-label me-2">TOTAL:</span>
                                        <span className="total-val">{totalCarats.toFixed(2)}</span>
                                        <span className="total-unit ms-1">cts</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })
            ) : (
                <div className="text-center py-5">
                    <i className="fas fa-box-open fa-3x text-muted opacity-25 mb-3"></i>
                    <h5 className="text-muted">No records found matching your search.</h5>
                </div>
            )}
        </div>
      </div>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-0 bg-primary p-4">
                <h4 className="fw-bold text-white m-0">New Production Entry</h4>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEntryModal(false)}></button>
              </div>
              <div className="modal-body p-4 bg-white">
                <div className="row mb-4 justify-content-center">
                  <div className="col-md-6 text-center">
                    <label className="form-label text-muted fw-bold small text-uppercase mb-2">Production Date</label>
                    <input type="date" className="form-control form-control-lg text-center rounded-3 border-primary border-opacity-25" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
                  </div>
                </div>

                <div className="batch-entry-container p-3 rounded-4 bg-light border mb-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {entries.map((entry, idx) => (
                    <div key={idx} className="row g-2 mb-3 align-items-center bg-white p-3 rounded-3 shadow-sm mx-0">
                      <div className="col-md-4">
                        <label className="small fw-bold text-muted mb-1">Kapan Name</label>
                        <input type="text" className="form-control border-0 bg-light" placeholder="Enter Kapan" value={entry.kapan} onChange={e => updateEntryField(idx, 'kapan', e.target.value)} />
                      </div>
                      <div className="col-md-4">
                        <label className="small fw-bold text-muted mb-1">Shape</label>
                        <select className="form-select border-0 bg-light" value={entry.shape} onChange={e => updateEntryField(idx, 'shape', e.target.value)}>
                          <option value="">Select Shape</option>
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="small fw-bold text-muted mb-1">Carats</label>
                        <div className="input-group">
                            <input type="number" className="form-control border-0 bg-light" placeholder="0.00" step="0.01" value={entry.carats} onChange={e => updateEntryField(idx, 'carats', e.target.value)} />
                            <span className="input-group-text border-0 bg-light text-muted small">cts</span>
                        </div>
                      </div>
                      <div className="col-md-1 text-center mt-3 mt-md-0">
                        <button className="btn btn-outline-danger btn-sm border-0 rounded-circle" onClick={() => removeEntryRow(idx)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-light w-100 py-3 rounded-3 border-dashed fw-bold text-primary" onClick={addEntryRow}>
                    <i className="fas fa-plus-circle me-2"></i> Add Another Kapan
                  </button>
                </div>

                <div className="d-flex gap-3">
                  <button className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3" onClick={() => setShowEntryModal(false)}>CANCEL</button>
                  <button className="btn btn-primary flex-grow-2 py-3 fw-bold rounded-3 shadow-sm" onClick={handleEntrySubmit} disabled={isSaving}>
                    {isSaving ? 'SAVING DATA...' : 'SAVE PRODUCTION'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-0 bg-info p-4">
                <h4 className="fw-bold text-white m-0">Edit Production Entry</h4>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">DATE</label>
                    <input type="date" className="form-control" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">KAPAN NAME</label>
                    <input type="text" className="form-control" value={editForm.kapan} onChange={e => setEditForm({...editForm, kapan: e.target.value})} />
                </div>
                <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">SHAPE</label>
                    <select className="form-select" value={editForm.shape} onChange={e => setEditForm({...editForm, shape: e.target.value})}>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
                <div className="mb-4">
                    <label className="form-label fw-bold small text-muted">CARATS</label>
                    <div className="input-group">
                        <input type="number" className="form-control" value={editForm.carats} onChange={e => setEditForm({...editForm, carats: e.target.value})} />
                        <span className="input-group-text">cts</span>
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-light w-100 py-3 fw-bold" onClick={() => setShowEditModal(false)}>CANCEL</button>
                    <button className="btn btn-info text-white w-100 py-3 fw-bold shadow-sm" onClick={handleEditSubmit} disabled={isSaving}>
                        {isSaving ? 'UPDATING...' : 'UPDATE ENTRY'}
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-0 p-4 pb-0">
                <h4 className="fw-bold m-0">Shape Master Settings</h4>
                <button type="button" className="btn-close" onClick={() => setShowCategoryModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex flex-wrap gap-2 mb-4 p-3 bg-light rounded-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {categories.map(c => (
                    <div key={c.id} className="badge bg-white text-dark border d-flex align-items-center gap-2 p-2 px-3 rounded-pill shadow-sm">
                      <span className="fw-medium">{c.name}</span>
                      <button className="btn-close" style={{ fontSize: '0.5rem' }} onClick={() => deleteCategory(c.id)}></button>
                    </div>
                  ))}
                  {categories.length === 0 && <div className="text-muted w-100 text-center py-3">No shapes configured.</div>}
                </div>
                <div className="input-group">
                  <input type="text" className="form-control border-end-0" placeholder="New Shape Name" value={catForm} onChange={e => setCatForm(e.target.value)} />
                  <button className="btn btn-primary px-4 fw-bold" onClick={addCategory} disabled={isAddingCategory}>
                    {isAddingCategory ? '...' : 'ADD SHAPE'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirm && (
        <div className="modal show d-block" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-4 border-0 shadow-lg text-center p-4">
              <div className="mb-3 text-danger">
                <i className="fas fa-exclamation-circle fa-3x"></i>
              </div>
              <h5 className="fw-bold mb-2">Delete Record?</h5>
              <p className="text-muted small mb-4">Are you sure you want to delete this record? This action cannot be undone.</p>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-light fw-bold px-4 rounded-pill" onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="btn btn-danger fw-bold px-4 rounded-pill shadow-sm" onClick={handleConfirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .scroll-hide::-webkit-scrollbar { display: none; }
        .scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .date-badge-pill {
            display: inline-flex;
            align-items: center;
            background: #fff;
            padding: 10px 24px;
            border-radius: 50px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
            font-weight: 800;
            color: #4f46e5;
            font-size: 1.1rem;
            letter-spacing: 0.5px;
        }

        .date-group-card {
            background: white;
            border-radius: 24px;
            border: 1px solid rgba(226, 232, 240, 0.8);
            overflow: hidden;
            transition: all 0.3s ease;
        }
        .date-group-card:hover {
            box-shadow: 0 15px 30px rgba(0,0,0,0.06) !important;
        }
        
        .entry-row {
            transition: background-color 0.2s ease;
        }
        .entry-row:hover {
            background-color: #fafbfc;
        }
        
        .shape-tag {
            font-size: 0.9rem;
            font-weight: 800;
            text-transform: uppercase;
            color: #4f46e5;
            background: rgba(0, 0, 0, 0.05);
            padding: 8px 16px;
            border-radius: 10px;
            display: inline-block;
            border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .kapan-text {
            font-weight: 800;
            color: #1e293b;
            font-size: 1.3rem;
        }
        
        .small-time {
            font-size: 0.85rem;
            font-weight: 600;
            opacity: 0.7;
        }

        .carats-box {
            display: flex;
            align-items: baseline;
            gap: 6px;
        }
        .carats-val {
            font-weight: 800;
            font-size: 1.8rem;
            color: #059669;
        }
        .carats-unit {
            font-size: 0.95rem;
            font-weight: 700;
            color: #64748b;
        }

        .circle-btn {
            background: #f8fafc;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            color: #64748b;
        }
        .circle-btn.edit:hover { background: #eef2ff; color: #4f46e5; }
        .circle-btn.delete:hover { background: #fef2f2; color: #ef4444; }

        .date-group-footer {
            background-color: #f8fafc !important;
        }
        .total-carats-box {
            display: flex;
            align-items: center;
            background: white;
            padding: 8px 20px;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.03);
        }
        .total-label { font-weight: 700; font-size: 0.8rem; color: #64748b; }
        .total-val { font-weight: 900; font-size: 1.4rem; color: #059669; }
        .total-unit { font-weight: 700; font-size: 0.8rem; color: #64748b; }

        .border-dashed {
            border: 2px dashed #e2e8f0;
            background: transparent;
        }
        .border-dashed:hover {
            border-color: #6366f1;
            background: rgba(99, 102, 241, 0.02);
        }
        .flex-grow-2 { flex-grow: 2; }
      `}</style>
    </div>
  );
}
