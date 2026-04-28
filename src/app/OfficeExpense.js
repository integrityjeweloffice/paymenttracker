import React, { useState, useEffect, useRef } from 'react';

export default function OfficeExpense({ moduleSwitcher, supabase, toast }) {
  const [funds, setFunds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'detail'
  const [currentFund, setCurrentFund] = useState(null);

  // Modals
  const [showFundModal, setShowFundModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImg, setLightboxImg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: null });

  // Forms
  const [fundForm, setFundForm] = useState({ id: null, source_name: '', initial_amount: '', date: new Date().toISOString().split('T')[0] });
  const [expenseForm, setExpenseForm] = useState({ id: null, description: '', category: '', amount: '', date: new Date().toISOString().split('T')[0], image: '' });
  const [fundErrors, setFundErrors] = useState({});
  const [expenseErrors, setExpenseErrors] = useState({});
  const [catForm, setCatForm] = useState('');
  const [mergeForm, setMergeForm] = useState({ name: '', selectedFunds: [] });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: fundsData } = await supabase.from('office_funds').select('*, office_expenses(*)').order('date', { ascending: false });
    const { data: catData } = await supabase.from('office_categories').select('*').order('name');
    
    setFunds(fundsData || []);
    setCategories(catData || []);
    if (expenseForm.category === '' && catData && catData.length > 0) {
      setExpenseForm(prev => ({ ...prev, category: catData[0].name }));
    }
    setLoading(false);
  };

  const getFundStats = (fund) => {
    const expenses = fund.office_expenses || [];
    const spent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const balance = Number(fund.initial_amount) - spent;
    const percentSpent = Math.min((spent / Number(fund.initial_amount)) * 100, 100);
    return { spent, balance, percentSpent };
  };

  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Fund Actions
  const handleFundSubmit = async () => {
    const errors = {};
    if (!fundForm.source_name) errors.source_name = 'Source / Person Name is required.';
    if (!fundForm.initial_amount) errors.initial_amount = 'Amount is required.';
    
    if (Object.keys(errors).length > 0) {
      setFundErrors(errors);
      return;
    }
    setFundErrors({});
    const payload = { source_name: fundForm.source_name, initial_amount: Number(fundForm.initial_amount), date: fundForm.date };
    
    if (fundForm.id) {
      const { error } = await supabase.from('office_funds').update(payload).eq('id', fundForm.id);
      if (error) return toast('Error updating fund', 'danger');
      toast('Fund updated successfully');
    } else {
      const { error } = await supabase.from('office_funds').insert([payload]);
      if (error) return toast('Error adding fund', 'danger');
      toast('Fund added successfully');
    }
    setShowFundModal(false);
    fetchData();
    if (currentFund) {
        const { data } = await supabase.from('office_funds').select('*, office_expenses(*)').eq('id', currentFund.id).single();
        setCurrentFund(data);
    }
  };

  const requestDeleteFund = (id) => {
    setDeleteConfirm({ show: true, type: 'fund', id });
  };

  // Image Compression
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          if (width > height && width > maxSize) {
            height *= maxSize / width; width = maxSize;
          } else if (height > maxSize) {
            width *= maxSize / height; height = maxSize;
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality JPEG
        };
      };
    });
  };

  const handleImageChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0]);
      setExpenseForm(prev => ({ ...prev, image: compressed }));
    }
  };

  // Expense Actions
  const handleExpenseSubmit = async () => {
    const errors = {};
    if (!expenseForm.description) errors.description = 'Description is required.';
    if (!expenseForm.amount) errors.amount = 'Amount is required.';
    
    if (Object.keys(errors).length > 0) {
      setExpenseErrors(errors);
      return;
    }
    setExpenseErrors({});
    
    const amount = Number(expenseForm.amount);
    const stats = getFundStats(currentFund);
    let available = stats.balance;
    
    if (expenseForm.id) {
        const oldExp = currentFund.office_expenses.find(e => e.id === expenseForm.id);
        available += Number(oldExp.amount);
    }
    
    if (amount > available) return toast('Expense amount exceeds current remaining balance!', 'danger');

    const payload = { 
        fund_id: currentFund.id, 
        description: expenseForm.description, 
        category: expenseForm.category, 
        amount, 
        date: expenseForm.date, 
        image: expenseForm.image 
    };

    if (expenseForm.id) {
      const { error } = await supabase.from('office_expenses').update(payload).eq('id', expenseForm.id);
      if (error) return toast('Error updating expense', 'danger');
      toast('Expense updated');
    } else {
      const { error } = await supabase.from('office_expenses').insert([payload]);
      if (error) return toast('Error adding expense', 'danger');
      toast('Expense added');
    }
    
    setShowExpenseModal(false);
    
    // Refresh current fund and global data
    const { data } = await supabase.from('office_funds').select('*, office_expenses(*)').eq('id', currentFund.id).single();
    setCurrentFund(data);
    fetchData();
  };

  const requestDeleteExpense = (id) => {
      setDeleteConfirm({ show: true, type: 'expense', id });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.type === 'fund') {
        await supabase.from('office_funds').delete().eq('id', deleteConfirm.id);
        toast('Fund deleted');
        if (view === 'detail') setView('dashboard');
        fetchData();
    } else if (deleteConfirm.type === 'expense') {
        await supabase.from('office_expenses').delete().eq('id', deleteConfirm.id);
        toast('Expense deleted');
        if (currentFund) {
            const { data } = await supabase.from('office_funds').select('*, office_expenses(*)').eq('id', currentFund.id).single();
            setCurrentFund(data);
        }
        fetchData();
    }
    setDeleteConfirm({ show: false, type: '', id: null });
  };

  // Merge Actions
  const handleMergeSubmit = async () => {
      if(mergeForm.selectedFunds.length < 2) return toast('Select at least 2 funds to merge', 'warning');
      const name = mergeForm.name || 'Merged Fund';
      
      let totalAmount = 0;
      let expensesToInsert = [];
      let fundsToUpdate = [];

      for (const fId of mergeForm.selectedFunds) {
          const fund = funds.find(f => f.id === fId);
          const balance = getFundStats(fund).balance;
          totalAmount += balance;
          
          fundsToUpdate.push(fId);
          expensesToInsert.push({
              fund_id: fId,
              description: `Transferred to: ${name}`,
              category: 'Transfer/Merge',
              amount: balance,
              date: new Date().toISOString().split('T')[0]
          });
      }

      // 1. Create new fund
      const { data: newFundData, error: newFundErr } = await supabase.from('office_funds').insert([{
          source_name: name,
          initial_amount: totalAmount,
          date: new Date().toISOString().split('T')[0]
      }]).select().single();

      if(newFundErr) return toast('Error creating merged fund', 'danger');

      // 2. Add transfer expenses to old funds
      await supabase.from('office_expenses').insert(expensesToInsert);

      // 3. Close old funds
      for (const fId of fundsToUpdate) {
          await supabase.from('office_funds').update({ status: 'merged' }).eq('id', fId);
      }

      toast('Funds merged successfully!');
      setShowMergeModal(false);
      fetchData();
  };

  // Category Actions
  const addCategory = async () => {
      if(!catForm) return;
      const { error } = await supabase.from('office_categories').insert([{ name: catForm }]);
      if(error) return toast('Category exists or error', 'danger');
      setCatForm('');
      fetchData();
      toast('Category added');
  };
  
  const deleteCategory = async (id) => {
      await supabase.from('office_categories').delete().eq('id', id);
      fetchData();
  };

  // Dashboard calculations
  let totalInitial = 0, totalSpent = 0, totalBalance = 0;
  funds.forEach(f => {
      const stats = getFundStats(f);
      totalInitial += Number(f.initial_amount);
      totalSpent += stats.spent;
      if (f.status === 'active') totalBalance += stats.balance;
  });

  return (
    <div style={{ background: '#fefdfd', minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="d-flex justify-content-between align-items-center p-4 border-bottom bg-white sticky-top shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-light rounded-circle p-2" onClick={moduleSwitcher} title="Back to Selection">
             <i className="fas fa-arrow-left"></i>
          </button>
          <h2 className="m-0" style={{ background: 'linear-gradient(to right, #4f46e5, #9333ea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>Office Expense</h2>
        </div>
      </header>

      <div className="container mt-4">
        {view === 'dashboard' ? (
          <>
            <div className="row g-4 mb-4">
              <div className="col-md-4">
                <div className="card h-100 border-0 shadow-sm" style={{ background: 'rgba(255,255,255,0.9)' }}>
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase fw-bold">Total Available Balance</h6>
                    <h2 className="text-success fw-bold">{formatCurrency(totalBalance)}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card h-100 border-0 shadow-sm" style={{ background: 'rgba(255,255,255,0.9)' }}>
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase fw-bold">Total Funds Received</h6>
                    <h2 className="fw-bold">{formatCurrency(totalInitial)}</h2>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card h-100 border-0 shadow-sm" style={{ background: 'rgba(255,255,255,0.9)' }}>
                  <div className="card-body">
                    <h6 className="text-muted text-uppercase fw-bold">Total Spent</h6>
                    <h2 className="text-danger fw-bold">{formatCurrency(totalSpent)}</h2>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4 bg-light p-3 rounded-4 border">
              <div className="d-flex align-items-center gap-2 overflow-auto" style={{ whiteSpace: 'nowrap' }}>
                <span className="fw-bold text-muted me-2">Categories:</span>
                {categories.map(c => <span key={c.id} className="badge bg-white text-dark border px-3 py-2 rounded-pill shadow-sm">{c.name}</span>)}
              </div>
              <button className="btn btn-outline-secondary btn-sm ms-3" onClick={() => setShowCategoryModal(true)}>Manage 📂</button>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="fw-bold m-0">Active Sources / Wallets</h4>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-primary" onClick={() => { setMergeForm({ name: '', selectedFunds: [] }); setShowMergeModal(true); }}>Merge Funds</button>
                <button className="btn btn-primary" onClick={() => { setFundForm({ id: null, source_name: '', initial_amount: '', date: new Date().toISOString().split('T')[0] }); setFundErrors({}); setShowFundModal(true); }}>+ Add New Fund</button>
              </div>
            </div>

            <div className="row g-4">
              {funds.map(fund => {
                const stats = getFundStats(fund);
                return (
                  <div key={fund.id} className="col-md-4">
                    <div className={`card h-100 border-0 shadow-sm ${fund.status !== 'active' ? 'bg-light opacity-75' : ''}`} style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => { setCurrentFund(fund); setView('detail'); }}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h5 className="fw-bold mb-1">{fund.source_name}</h5>
                            <small className="text-muted">{formatDate(fund.date)}</small>
                          </div>
                          <div>
                            {fund.status === 'active' ? <span className="badge bg-primary bg-opacity-10 text-primary">Active</span> : <span className="badge bg-secondary bg-opacity-10 text-secondary">Merged</span>}
                            <button className="btn btn-link text-danger p-0 ms-2" title="Delete" onClick={(e) => { e.stopPropagation(); requestDeleteFund(fund.id); }}><i className="fas fa-trash"></i></button>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <small className="text-muted">Initial: {formatCurrency(fund.initial_amount)}</small>
                          <small className="text-success fw-bold">Rem: {formatCurrency(stats.balance)}</small>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div className="progress-bar bg-success" style={{ width: `${stats.percentSpent}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {funds.length === 0 && !loading && <div className="text-center text-muted mt-5">No funds tracked yet. Add one to get started.</div>}
            </div>
          </>
        ) : (
          <>
            {currentFund && (() => {
               const stats = getFundStats(currentFund);
               return (
                 <>
                    <div className="d-flex align-items-center gap-3 mb-4">
                      <button className="btn btn-light rounded-circle" onClick={() => setView('dashboard')}><i className="fas fa-arrow-left"></i></button>
                      <div>
                        <h2 className="fw-bold m-0">{currentFund.source_name} {currentFund.status !== 'active' && '(Merged)'}</h2>
                        <span className="text-muted">Received on {formatDate(currentFund.date)}</span>
                      </div>
                      <div className="ms-auto d-flex gap-2">
                        {currentFund.status === 'active' && (
                          <>
                            <button className="btn btn-outline-danger" onClick={() => requestDeleteFund(currentFund.id)}>Delete Fund</button>
                            <button className="btn btn-outline-secondary" onClick={() => { setFundForm(currentFund); setFundErrors({}); setShowFundModal(true); }}>Edit Fund</button>
                            <button className="btn btn-success" onClick={() => { setExpenseForm({ id: null, description: '', category: categories[0]?.name || '', amount: '', date: new Date().toISOString().split('T')[0], image: '' }); setExpenseErrors({}); setShowExpenseModal(true); }}>+ Add Expense</button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="row g-4 mb-4">
                      <div className="col-md-4">
                        <div className="card shadow-sm border-0"><div className="card-body"><h6 className="text-muted text-uppercase fw-bold">Initial Amount</h6><h2 className="fw-bold">{formatCurrency(currentFund.initial_amount)}</h2></div></div>
                      </div>
                      <div className="col-md-4">
                        <div className="card shadow-sm border-0"><div className="card-body"><h6 className="text-muted text-uppercase fw-bold">Total Spent</h6><h2 className="text-danger fw-bold">{formatCurrency(stats.spent)}</h2></div></div>
                      </div>
                      <div className="col-md-4">
                        <div className="card shadow-sm border-0"><div className="card-body"><h6 className="text-muted text-uppercase fw-bold">Current Balance</h6><h2 className="text-success fw-bold">{formatCurrency(stats.balance)}</h2></div></div>
                      </div>
                    </div>

                    <div className="card shadow-sm border-0">
                      <div className="card-body">
                        <h5 className="fw-bold mb-3">Expense History</h5>
                        <div className="table-responsive">
                          <table className="table table-hover align-middle">
                            <thead className="table-light text-uppercase text-muted" style={{ fontSize: '0.85rem' }}>
                              <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Receipt</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                              {(currentFund.office_expenses || []).sort((a,b) => new Date(b.date) - new Date(a.date)).map(exp => (
                                <tr key={exp.id}>
                                  <td>{formatDate(exp.date)}</td>
                                  <td>{exp.description}</td>
                                  <td><span className={`badge ${exp.category === 'Transfer/Merge' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-light text-dark border'} rounded-pill px-3 py-2`}>{exp.category}</span></td>
                                  <td className="fw-bold">{formatCurrency(exp.amount)}</td>
                                  <td>
                                    {exp.image ? <img src={exp.image} alt="Receipt" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '8px', cursor: 'zoom-in', border: '1px solid #ddd' }} onClick={() => { setLightboxImg(exp.image); setShowLightbox(true); }} /> : <span className="text-muted">-</span>}
                                  </td>
                                  <td>
                                    {currentFund.status === 'active' ? (
                                      <>
                                        <button className="btn btn-sm btn-link text-primary p-0 me-3" title="Edit" onClick={() => { setExpenseForm(exp); setExpenseErrors({}); setShowExpenseModal(true); }}><i className="fas fa-edit"></i></button>
                                        <button className="btn btn-sm btn-link text-danger p-0" title="Delete" onClick={() => requestDeleteExpense(exp.id)}><i className="fas fa-trash"></i></button>
                                      </>
                                    ) : <span className="text-muted small">View Only</span>}
                                  </td>
                                </tr>
                              ))}
                              {(!currentFund.office_expenses || currentFund.office_expenses.length === 0) && <tr><td colSpan="6" className="text-center text-muted py-4">No expenses recorded yet.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                 </>
               )
            })()}
          </>
        )}
      </div>

      {/* Modals */}
      {showFundModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0"><h4 className="fw-bold">{fundForm.id ? 'Edit Fund' : 'Add New Fund'}</h4><button type="button" className="btn-close" onClick={() => setShowFundModal(false)}></button></div>
              <div className="modal-body p-4">
                <div className="mb-3"><label className="form-label text-muted fw-bold">Source / Person Name</label><input type="text" className={`form-control ${fundErrors.source_name ? 'is-invalid' : ''}`} value={fundForm.source_name} onChange={e => { setFundForm({...fundForm, source_name: e.target.value}); setFundErrors({...fundErrors, source_name: null}) }} />{fundErrors.source_name && <div className="invalid-feedback">{fundErrors.source_name}</div>}</div>
                <div className="mb-3"><label className="form-label text-muted fw-bold">Amount Received (₹)</label><input type="number" className={`form-control ${fundErrors.initial_amount ? 'is-invalid' : ''}`} value={fundForm.initial_amount} onChange={e => { setFundForm({...fundForm, initial_amount: e.target.value}); setFundErrors({...fundErrors, initial_amount: null}) }} />{fundErrors.initial_amount && <div className="invalid-feedback">{fundErrors.initial_amount}</div>}</div>
                <div className="mb-4"><label className="form-label text-muted fw-bold">Date</label><input type="date" className="form-control" value={fundForm.date} onChange={e => setFundForm({...fundForm, date: e.target.value})} /></div>
                <button className="btn btn-primary w-100 py-2 fw-bold" onClick={handleFundSubmit}>Save Fund</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0"><h4 className="fw-bold">{expenseForm.id ? 'Edit Expense' : 'Add Expense'}</h4><button type="button" className="btn-close" onClick={() => setShowExpenseModal(false)}></button></div>
              <div className="modal-body p-4">
                <div className="mb-3"><label className="form-label text-muted fw-bold">Description</label><input type="text" className={`form-control ${expenseErrors.description ? 'is-invalid' : ''}`} value={expenseForm.description} onChange={e => { setExpenseForm({...expenseForm, description: e.target.value}); setExpenseErrors({...expenseErrors, description: null}) }} />{expenseErrors.description && <div className="invalid-feedback">{expenseErrors.description}</div>}</div>
                <div className="mb-3"><label className="form-label text-muted fw-bold">Category</label><select className="form-select" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                <div className="mb-3"><label className="form-label text-muted fw-bold">Amount Spent (₹)</label><input type="number" className={`form-control ${expenseErrors.amount ? 'is-invalid' : ''}`} value={expenseForm.amount} onChange={e => { setExpenseForm({...expenseForm, amount: e.target.value}); setExpenseErrors({...expenseErrors, amount: null}) }} />{expenseErrors.amount && <div className="invalid-feedback">{expenseErrors.amount}</div>}</div>
                <div className="mb-3"><label className="form-label text-muted fw-bold">Date</label><input type="date" className="form-control" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} /></div>
                <div className="mb-4">
                  <label className="form-label text-muted fw-bold">Receipt Image (Optional)</label>
                  <input type="file" className="form-control" accept="image/*" ref={fileInputRef} onChange={handleImageChange} />
                  {expenseForm.image && <div className="mt-2 position-relative d-inline-block"><img src={expenseForm.image} alt="preview" style={{ height: '80px', borderRadius: '8px' }} /><span className="position-absolute top-0 end-0 badge bg-dark opacity-75">Preview</span></div>}
                </div>
                <button className="btn btn-primary w-100 py-2 fw-bold" onClick={handleExpenseSubmit}>Save Expense</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMergeModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0"><h4 className="fw-bold">Merge Remaining Funds</h4><button type="button" className="btn-close" onClick={() => setShowMergeModal(false)}></button></div>
              <div className="modal-body p-4">
                <p className="text-muted small">Select active funds with a balance to combine them into a single new fund.</p>
                <div className="list-group mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {funds.filter(f => f.status === 'active' && getFundStats(f).balance > 0).map(fund => {
                    const bal = getFundStats(fund).balance;
                    const isSelected = mergeForm.selectedFunds.includes(fund.id);
                    return (
                      <label key={fund.id} className="list-group-item d-flex justify-content-between align-items-center" style={{ cursor: 'pointer', background: isSelected ? '#f8f9fa' : 'white' }}>
                        <div className="d-flex align-items-center gap-3">
                          <input type="checkbox" className="form-check-input mt-0" checked={isSelected} onChange={(e) => {
                             const newSel = e.target.checked ? [...mergeForm.selectedFunds, fund.id] : mergeForm.selectedFunds.filter(id => id !== fund.id);
                             setMergeForm({...mergeForm, selectedFunds: newSel});
                          }} />
                          <div><div className="fw-bold">{fund.source_name}</div><small className="text-muted">{formatDate(fund.date)}</small></div>
                        </div>
                        <span className="fw-bold text-success">{formatCurrency(bal)}</span>
                      </label>
                    )
                  })}
                </div>
                <div className="mb-4"><label className="form-label text-muted fw-bold">New Merged Fund Name</label><input type="text" className="form-control" placeholder="e.g. Combined Remaining" value={mergeForm.name} onChange={e => setMergeForm({...mergeForm, name: e.target.value})} /></div>
                <button className="btn btn-primary w-100 py-2 fw-bold" onClick={handleMergeSubmit}>Confirm Merge</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-header border-0 pb-0"><h4 className="fw-bold">Manage Categories</h4><button type="button" className="btn-close" onClick={() => setShowCategoryModal(false)}></button></div>
              <div className="modal-body p-4">
                <div className="d-flex flex-wrap gap-2 mb-4" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {categories.map(c => (
                    <div key={c.id} className="badge bg-light text-dark border d-flex align-items-center gap-2 p-2 px-3 rounded-pill">
                      <span>{c.name}</span>
                      <button className="btn-close" style={{ fontSize: '0.5rem' }} onClick={() => deleteCategory(c.id)}></button>
                    </div>
                  ))}
                </div>
                <div className="d-flex gap-2">
                  <input type="text" className="form-control" placeholder="New Category Name" value={catForm} onChange={e => setCatForm(e.target.value)} />
                  <button className="btn btn-primary px-4 fw-bold" onClick={addCategory}>Add</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLightbox && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1060 }} onClick={() => setShowLightbox(false)}>
          <div className="d-flex justify-content-center align-items-center h-100 p-4">
             <img src={lightboxImg} alt="Receipt Full" style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain', borderRadius: '12px' }} onClick={e => e.stopPropagation()} />
             <button className="btn btn-light position-absolute top-0 end-0 m-4 rounded-circle" onClick={() => setShowLightbox(false)}><i className="fas fa-times"></i></button>
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content rounded-4 border-0 shadow">
              <div className="modal-body p-4 text-center">
                <div className="text-danger mb-3"><i className="fas fa-exclamation-circle fa-3x"></i></div>
                <h5 className="fw-bold mb-3">Confirm Deletion</h5>
                <p className="text-muted mb-4">Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.</p>
                <div className="d-flex gap-2 justify-content-center">
                  <button className="btn btn-light px-4 fw-bold" onClick={() => setDeleteConfirm({ show: false, type: '', id: null })}>Cancel</button>
                  <button className="btn btn-danger px-4 fw-bold" onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
