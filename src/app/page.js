'use client'

import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '@/lib/supabase'

export default function Home() {
  // Data States
  const [records, setRecords] = useState([])
  const [companies, setCompanies] = useState([])
  const [departments, setDepartments] = useState([])

  // Department Master
  const [dName, setDName] = useState('')

  // Company Master
  const [mCompany, setMCompany] = useState('')
  const [mPerson, setMPerson] = useState('')
  const [mDept, setMDept] = useState('')
  const [mStatus, setMStatus] = useState('active')
  const [mContacts, setMContacts] = useState([''])
  const [mAddress, setMAddress] = useState('')

  // Add New Payment Form
  const [companySelect, setCompanySelect] = useState('')
  const [person, setPerson] = useState('')
  const [dept, setDept] = useState('')
  const [month, setMonth] = useState('')
  const [amount, setAmount] = useState('')
  const [onBill, setOnBill] = useState('')
  const [due, setDue] = useState('')
  const [payMode, setPayMode] = useState('Cash')
  const [billCA, setBillCA] = useState('No')
  const [recordRemark, setRecordRemark] = useState('')

  // Advanced Filters
  const [currentFilters, setCurrentFilters] = useState({
    month: '', company: '', dept: '', mode: '', billCA: '',
    dueFrom: '', dueTo: '', search: '', minAmt: 0, maxAmt: Infinity
  })

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentEditingIndex, setCurrentEditingIndex] = useState(-1)
  const [currentEditingId, setCurrentEditingId] = useState(null)
  const [eAmount, setEAmount] = useState('')
  const [eOnBill, setEOnBill] = useState('')
  const [eDue, setEDue] = useState('')
  const [eMode, setEMode] = useState('Cash')
  const [eBill, setEBill] = useState('No')
  const [eRecordRemark, setERecordRemark] = useState('')
  const [editPayments, setEditPayments] = useState([])

  // New Payment Entry in Edit Modal
  const [newPayAmount, setNewPayAmount] = useState('')
  const [newPayDate, setNewPayDate] = useState('')
  const [newPayMode, setNewPayMode] = useState('Cash')
  const [newPayRemark, setNewPayRemark] = useState('')

  // Company Edit Modal
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [compIndex, setCompIndex] = useState(-1)
  const [compId, setCompId] = useState(null)
  const [cName, setCName] = useState('')
  const [cPerson, setCPerson] = useState('')
  const [cDept, setCDept] = useState('')
  const [cStatus, setCStatus] = useState('active')
  const [cContacts, setCContacts] = useState([''])
  const [cAddress, setCAddress] = useState('')

  // Custom Confirm Modal
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmCallback, setConfirmCallback] = useState(null)

  // Toast
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
  }

  const showConfirmDialog = (message, callback) => {
    setConfirmMessage(message)
    setConfirmCallback(() => callback)
    setShowConfirm(true)
  }

  const handleConfirmYes = () => {
    if (confirmCallback) confirmCallback()
    setShowConfirm(false)
  }

  const formatAmount = (val) => {
    const num = parseFloat(String(val).replace(/,/g, ''))
    return isNaN(num) ? '' : num.toLocaleString('en-IN')
  }

  const getNumeric = (val) => parseFloat(String(val).replace(/,/g, '')) || 0

  // Contact number handlers
  const addContactField = () => {
    setMContacts([...mContacts, ''])
  }

  const removeContactField = (index) => {
    if (mContacts.length > 1) {
      setMContacts(mContacts.filter((_, i) => i !== index))
    }
  }

  const updateContactField = (index, value) => {
    const updated = [...mContacts]
    updated[index] = value
    setMContacts(updated)
  }

  // Edit modal contact handlers
  const addEditContactField = () => {
    setCContacts([...cContacts, ''])
  }

  const removeEditContactField = (index) => {
    if (cContacts.length > 1) {
      setCContacts(cContacts.filter((_, i) => i !== index))
    }
  }

  const updateEditContactField = (index, value) => {
    const updated = [...cContacts]
    updated[index] = value
    setCContacts(updated)
  }

  // Load Data from Database
  const loadDepartments = async () => {
    const { data, error } = await supabase.from('departments').select('*').order('name')
    if (error) console.error('Error loading departments:', error)
    else setDepartments(data || [])
  }

  const loadCompanies = async () => {
    const { data, error } = await supabase.from('companies').select('*').order('name')
    if (error) console.error('Error loading companies:', error)
    else setCompanies(data || [])
  }

  const loadRecords = async () => {
    const { data: recordsData, error: recordsError } = await supabase
      .from('payment_records')
      .select('*')
      .order('created_at', { ascending: false })

    if (recordsError) {
      console.error('Error loading records:', recordsError)
      return
    }

    // Load payment entries for each record
    const recordsWithPayments = await Promise.all(
      (recordsData || []).map(async (record) => {
        const { data: paymentsData } = await supabase
          .from('payment_entries')
          .select('*')
          .eq('record_id', record.id)
          .order('created_at')

        return {
          ...record,
          payments: paymentsData || []
        }
      })
    )

    setRecords(recordsWithPayments)
  }

  useEffect(() => {
    loadDepartments()
    loadCompanies()
    loadRecords()
  }, [])

  // Department Functions
  const addDepartment = async () => {
    if (!dName.trim()) return showToast("Please enter department name", "danger")
    
    const { error } = await supabase.from('departments').insert([{ name: dName.trim() }])
    
    if (error) {
      if (error.code === '23505') showToast("Department already exists", "danger")
      else showToast("Error adding department", "danger")
    } else {
      setDName('')
      loadDepartments()
      showToast("Department added successfully")
    }
  }

  const deleteDept = (i) => {
    const dept = departments[i]
    showConfirmDialog(`Delete department <strong>"${dept.name}"</strong> and all related records?`, async () => {
      const { error } = await supabase.from('departments').delete().eq('id', dept.id)
      
      if (error) showToast("Error deleting department", "danger")
      else {
        loadDepartments()
        loadRecords()
        showToast("Department deleted")
      }
    })
  }

  // Company Functions
  const addCompany = async () => {
    if (!mCompany.trim()) return showToast("Company name is required", "danger")
    
    const filteredContacts = mContacts.filter(c => c.trim() !== '')
    
    const { error } = await supabase.from('companies').insert([{
      name: mCompany.trim(),
      person: mPerson,
      dept: mDept,
      status: mStatus,
      contacts: JSON.stringify(filteredContacts),
      address: mAddress.trim()
    }])
    
    if (error) showToast("Error adding company", "danger")
    else {
      setMCompany('')
      setMPerson('')
      setMDept('')
      setMContacts([''])
      setMAddress('')
      loadCompanies()
      showToast("Company added successfully")
    }
  }

  const openCompanyModal = (i) => {
    const c = companies[i]
    setCompIndex(i)
    setCompId(c.id)
    setCName(c.name)
    setCPerson(c.person || '')
    setCDept(c.dept || '')
    setCStatus(c.status)
    
    // Parse contacts from JSON
    let parsedContacts = ['']
    try {
      if (c.contacts) {
        parsedContacts = JSON.parse(c.contacts)
        if (parsedContacts.length === 0) parsedContacts = ['']
      }
    } catch (e) {
      parsedContacts = ['']
    }
    setCContacts(parsedContacts)
    setCAddress(c.address || '')
    
    setShowCompanyModal(true)
  }

  const saveCompanyEdit = async () => {
    const filteredContacts = cContacts.filter(c => c.trim() !== '')
    
    const { error } = await supabase
      .from('companies')
      .update({ 
        name: cName, 
        person: cPerson, 
        dept: cDept, 
        status: cStatus,
        contacts: JSON.stringify(filteredContacts),
        address: cAddress.trim()
      })
      .eq('id', compId)
    
    if (error) showToast("Error updating company", "danger")
    else {
      setShowCompanyModal(false)
      loadCompanies()
      showToast("Company updated successfully")
    }
  }

  const deleteCompany = (i) => {
    const comp = companies[i]
    showConfirmDialog(`Delete company <strong>"${comp.name}"</strong> and all related records?`, async () => {
      const { error } = await supabase.from('companies').delete().eq('id', comp.id)
      
      if (error) showToast("Error deleting company", "danger")
      else {
        loadCompanies()
        loadRecords()
        showToast("Company deleted")
      }
    })
  }

  // Add Payment Record
// Add Payment Record with Toast-based Validation Only
const addPaymentRecord = async (e) => {
  e.preventDefault();

  // Validation 1: Company
  if (!companySelect.trim()) {
    return showToast("Please select a company", "danger");
  }

  // Validation 2: Due Date is required
  if (!due) {
    return showToast("Due Date is required", "danger");
  }



  // Validation 4: Total Amount
  const numericAmount = getNumeric(amount);
  if (numericAmount <= 0) {
    return showToast("Please enter a valid Total Amount greater than zero", "danger");
  }

  // If all validations pass → Insert record
  const { error } = await supabase.from('payment_records').insert([{
    company: companySelect,
    person,
    dept,
    month,
    amount: numericAmount,
    on_bill: getNumeric(onBill),
    due,
    mode: payMode,
    bill: payMode === 'Bank' ? billCA : '',
    remark: recordRemark.trim()
  }]);

  if (error) {
    showToast("Error adding payment record", "danger");
  } else {
    // Reset form after successful submission
    setCompanySelect('');
    setPerson('');
    setDept('');
    setMonth('');
    setAmount('');
    setOnBill('');
    setDue('');
    setPayMode('Cash');
    setBillCA('No');
    setRecordRemark('');

    loadRecords();
    showToast("Payment record added successfully", "success");
  }
};

  const fillDetails = (val) => {
    setCompanySelect(val)
    const found = companies.find(c => c.name === val)
    if (found) {
      setPerson(found.person || '')
      setDept(found.dept || '')
    }
  }

  // Edit Modal Functions
  const openEdit = (index) => {
    const r = records[index]
    setCurrentEditingIndex(index)
    setCurrentEditingId(r.id)
    setEAmount(formatAmount(r.amount))
    setEOnBill(formatAmount(r.on_bill || 0))
    setEDue(r.due || '')
    setEMode(r.mode || 'Cash')
    setEBill(r.bill || 'No')
    setERecordRemark(r.remark || '')
    setEditPayments([...(r.payments || [])])
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (currentEditingId === null) return
    
    // Update main record
    const { error: recordError } = await supabase
      .from('payment_records')
      .update({
        amount: getNumeric(eAmount),
        on_bill: getNumeric(eOnBill),
        due: eDue,
        mode: eMode,
        bill: eMode === 'Bank' ? eBill : '',
        remark: eRecordRemark.trim()
      })
      .eq('id', currentEditingId)
    
    if (recordError) {
      showToast("Error updating record", "danger")
      return
    }

    // Delete all existing payment entries
    await supabase.from('payment_entries').delete().eq('record_id', currentEditingId)
    
    // Insert new payment entries
    if (editPayments.length > 0) {
      const paymentsToInsert = editPayments.map(p => ({
        record_id: currentEditingId,
        amount: p.amount,
        date: p.date,
        mode: p.mode,
        remark: p.remark
      }))
      
      await supabase.from('payment_entries').insert(paymentsToInsert)
    }
    
    setShowEditModal(false)
    loadRecords()
    showToast("Record updated successfully", "info")
  }

  const addPaymentRow = () => {
    const amt = getNumeric(newPayAmount)
    if (!amt) return showToast("Please enter a valid amount", "danger")

    const total = editPayments.reduce((s, p) => s + (p.amount || 0), 0)
    const maxAllowed = Math.max(getNumeric(eAmount), getNumeric(eOnBill))

    if (total + amt > maxAllowed) {
      return showToast(`Total payments cannot exceed ₹${formatAmount(maxAllowed)}`, "danger")
    }

    setEditPayments([
      ...editPayments,
      {
        amount: amt,
        date: newPayDate,
        mode: newPayMode,
        remark: newPayRemark.trim()
      }
    ])

    setNewPayAmount('')
    setNewPayDate('')
    setNewPayRemark('')
    showToast("New payment entry added", "success")
  }

  const deletePaymentRow = (i) => {
    const p = editPayments[i]
    showConfirmDialog(`Delete this payment entry of <strong>₹${p.amount.toLocaleString('en-IN')}</strong>?`, () => {
      setEditPayments(editPayments.filter((_, idx) => idx !== i))
    })
  }

  const deleteRecord = (index) => {
    const r = records[index]
    showConfirmDialog(`Delete payment record for <strong>${r.company}</strong> (${r.month})?`, async () => {
      const { error } = await supabase.from('payment_records').delete().eq('id', r.id)
      
      if (error) showToast("Error deleting record", "danger")
      else {
        loadRecords()
        showToast("Record deleted")
      }
    })
  }

  // Filtered Records
  const filteredRecords = records.filter(r => {
    const paid = (r.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
    r.paid = paid
    r.pending = r.amount - paid

    if (currentFilters.month && r.month !== currentFilters.month) return false
    if (currentFilters.company && r.company !== currentFilters.company) return false
    if (currentFilters.dept && r.dept !== currentFilters.dept) return false
    if (currentFilters.mode && r.mode !== currentFilters.mode) return false
    if (currentFilters.billCA && r.bill !== currentFilters.billCA) return false
    if (currentFilters.dueFrom && r.due < currentFilters.dueFrom) return false
    if (currentFilters.dueTo && r.due > currentFilters.dueTo) return false
    if (r.amount < currentFilters.minAmt || r.amount > currentFilters.maxAmt) return false
    if (currentFilters.search) {
      const txt = `${r.company} ${r.person} ${r.dept || ''} ${r.remark || ''} ${(r.payments || []).map(p => p.remark || '').join(' ')}`.toLowerCase()
      if (!txt.includes(currentFilters.search.toLowerCase())) return false
    }
    return true
  })

  const totalPay = filteredRecords.reduce((s, r) => s + r.amount, 0)
  const totalPaid = filteredRecords.reduce((s, r) => s + (r.paid || 0), 0)
  const totalPending = filteredRecords.reduce((s, r) => s + (r.pending || 0), 0)

  const grouped = {}
  filteredRecords.forEach(r => (grouped[r.month] ||= []).push(r))

  // Filter Handlers
  const applyFilters = () => showToast("Filters applied successfully", "success")
  const resetFilters = () => {
    setCurrentFilters({
      month: '', company: '', dept: '', mode: '', billCA: '',
      dueFrom: '', dueTo: '', search: '', minAmt: 0, maxAmt: Infinity
    })
    showToast("Filters reset")
  }

  // Export Functions
  const exportToExcel = () => {
    if (filteredRecords.length === 0) return showToast("No records to export", "danger")
    const wb = XLSX.utils.book_new()
    const today = new Date().toISOString().slice(0, 10)
    Object.keys(grouped).forEach(month => {
      const monthRecords = grouped[month]
      let data = monthRecords.map((r, idx) => [
        idx + 1, r.company, r.person, r.dept, r.due || '',
        r.amount, r.on_bill || 0, r.paid || 0, r.pending || 0,
        r.mode || '', r.bill || '', r.remark || ''
      ])
      data.unshift(["#", "Company", "Person", "Department", "Due Date", "Payable", "On-Bill", "Paid", "Pending", "Mode", "Bill to CA", "Record Remark"])
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, month)
    })
    XLSX.writeFile(wb, `Payment_Tracker_${today}.xlsx`)
    showToast("Excel exported successfully")
  }

const exportToPDF = () => {
  if (filteredRecords.length === 0) return showToast("No records to export", "danger")
  const doc = new jsPDF('landscape', 'pt', 'a4')
  const today = new Date().toLocaleDateString('en-IN')
  
  Object.keys(grouped).forEach((month, idx) => {
    if (idx > 0) doc.addPage()
    doc.setFontSize(16)
    doc.text(`Payment Tracker - ${month}`, 400, 40, { align: "center" })
    
    const tableData = grouped[month].map((r, i) => [
      i + 1, 
      r.company, 
      r.person, 
      r.dept, 
      r.due || '-', 
      r.amount, 
      r.on_bill || 0, 
      r.paid || 0, 
      r.pending || 0, 
      r.mode || '-'
    ])
    
    autoTable(doc, {
      startY: 70,
      head: [["#", "Company", "Person", "Dept", "Due Date", "Payable", "On-Bill", "Paid", "Pending", "Mode"]],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [33, 37, 41] },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index >= 5 && data.column.index <= 8) {
          data.cell.text = [Number(data.cell.raw).toLocaleString('en-IN')]
        }
      }
    })
  })
  
  doc.save(`Payment_Tracker_${today}.pdf`)
  showToast("PDF exported successfully")
}

  return (
    <>
      {/* Global Styles - Matching Original Design */}
      <style jsx global>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

          :root {
            --primary-gradient: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            --success-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
            --danger-gradient: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
            --warning-gradient: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            --card-bg: rgba(255, 255, 255, 0.7);
            --bg-color: #f0f4f8;
          }

          body, .container-fluid {
            background: var(--bg-color);
            background-image:
              radial-gradient(at 40% 20%, hsla(253,16%,7%,0.05) 0px, transparent 50%),
              radial-gradient(at 80% 0%, hsla(225,39%,30%,0.05) 0px, transparent 50%),
              radial-gradient(at 0% 50%, hsla(339,49%,30%,0.05) 0px, transparent 50%);
            background-attachment: fixed;
            font-family: 'Outfit', sans-serif;
            color: #1e293b;
          }

          h3 {
            font-weight: 800 !important;
            letter-spacing: -1px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.05);
          }

          h3.text-primary {
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .card {
            border-radius: 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05);
            border: 1px solid rgba(255,255,255,0.8);
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }

          .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0,0,0,0.06);
          }

          h5 {
            font-weight: 700;
            color: #334155;
            letter-spacing: -0.5px;
          }

          label {
            font-weight: 600;
            margin-bottom: 8px;
            color: #64748b;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .form-control, .form-select {
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            padding: 12px 16px;
            transition: all 0.3s ease;
            background-color: rgba(255, 255, 255, 0.9);
            font-size: 0.95rem;
            color: #334155;
          }

          .form-control:focus, .form-select:focus {
            border-color: #818cf8;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
            background-color: #fff;
          }

          .btn {
            border-radius: 14px;
            padding: 12px 24px;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }

          .btn-sm {
            padding: 8px 16px;
            border-radius: 10px;
          }

          .btn-primary {
            background: var(--primary-gradient);
            color: white;
            box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
          }

          .btn-primary:hover {
            background: var(--primary-gradient);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
            color: white;
          }

          .btn-success {
            background: var(--success-gradient);
            color: white;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
          }

          .btn-success:hover {
            background: var(--success-gradient);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
            color: white;
          }

          .btn-danger {
            background: var(--danger-gradient);
            color: white;
            box-shadow: 0 4px 15px rgba(225, 29, 72, 0.3);
          }

          .btn-danger:hover {
            background: var(--danger-gradient);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(225, 29, 72, 0.4);
            color: white;
          }

          .btn-warning {
            background: var(--warning-gradient);
            color: white;
            box-shadow: 0 4px 15px rgba(217, 119, 6, 0.3);
          }

          .btn-warning:hover {
            background: var(--warning-gradient);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(217, 119, 6, 0.4);
            color: white;
          }

          .btn-outline-primary, .btn-outline-secondary {
            border: 2px solid #e2e8f0;
            background: transparent;
            color: #475569;
            box-shadow: none;
          }

          .btn-outline-primary:hover {
            border-color: #6366f1;
            background: rgba(99, 102, 241, 0.05);
            color: #4f46e5;
            transform: translateY(-2px);
          }

          .btn-outline-secondary:hover {
            border-color: #94a3b8;
            background: rgba(148, 163, 184, 0.05);
            color: #0f172a;
            transform: translateY(-2px);
          }

          textarea.form-control { resize: none; overflow: hidden; min-height: 44px; }

          /* Master Tables with Visible Scrollbar */
          .master-table-wrapper {
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }

          .master-table-scroll {
            max-height: 400px;
            overflow-y: auto;
            overflow-x: auto;
          }

          .master-table-scroll::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }

          .master-table-scroll::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }

          .master-table-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }

          .master-table-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }

          /* Payment Records Table - Horizontal Scroll Only */
          .table-responsive {
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            background: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            overflow-x: auto;
            overflow-y: visible;
          }

          .table-responsive::-webkit-scrollbar {
            height: 10px;
          }

          .table-responsive::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }

          .table-responsive::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }

          .table-responsive::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }

          .table thead th {
            background-color: #1e293b !important;
            color: #ffffff !important;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.05em;
            padding: 16px 12px;
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .table td {
            padding: 14px 12px;
            vertical-align: middle;
            font-weight: 500;
          }

          .table tbody tr:hover {
            background-color: #f8fafc;
          }

          .table-light thead th {
            background-color: rgba(241, 245, 249, 0.8);
            color: #475569;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            padding: 16px;
            border-bottom: 2px solid #e2e8f0;
          }

          .table tfoot td {
            font-weight: 800;
            background-color: rgba(248, 250, 252, 0.9);
            color: #0f172a;
            font-size: 1.05rem;
            border-top: 2px solid #e2e8f0;
          }

          .payment-entry-row:hover { background-color: #f8fafc; }

          .dashboard-card {
            border-radius: 24px;
            position: relative;
            overflow: hidden;
            background: white;
            border: 1px solid #f1f5f9;
            padding: 30px !important;
          }

          .dashboard-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 6px;
            background: var(--primary-gradient);
            opacity: 0.8;
          }

          .dashboard-card.text-success::before { background: var(--success-gradient); }
          .dashboard-card.text-danger::before { background: var(--danger-gradient); }

          .remark-cell {
            min-width: 240px;
            max-width: 280px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            cursor: help;
            color: #64748b;
          }

          .remark-cell:hover {
            white-space: normal;
            overflow: visible;
            z-index: 10;
            background-color: #fff;
            box-shadow: 0 15px 30px rgba(0,0,0,0.1);
            padding: 16px;
            border-radius: 16px;
            position: relative;
            color: #0f172a;
            border: 1px solid #e2e8f0;
          }

          .address-cell {
            max-width: 200px;
            word-wrap: break-word;
            white-space: normal;
            line-height: 1.4;
          }

          .contacts-cell {
            min-width: 140px;
          }

          .contact-item {
            display: block;
            margin-bottom: 4px;
            font-size: 0.9rem;
          }

          .contact-item:last-child {
            margin-bottom: 0;
          }

          .toast {
            z-index: 2000;
            border-radius: 14px;
          }

          .modal-content {
            border-radius: 24px;
            border: none;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
          }

          .modal-header, .modal-footer {
            border-color: #f1f5f9;
          }

          .badge {
            padding: 8px 16px;
            border-radius: 30px;
            font-weight: 600;
            letter-spacing: 0.5px;
            font-size: 0.85rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }

          .table {
            min-width: 1200px;
          }

          @media (max-width: 992px) {
            .table { min-width: 1400px; }
          }

          @media (max-width: 768px) {
            .card { margin-bottom: 24px; }
          }

          .contact-field-group {
            position: relative;
          }

          .remove-contact-btn {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            padding: 4px 8px;
            font-size: 0.75rem;
          }
            @media (max-width: 768px) {
  .modal-xl {
    max-width: 95% !important;
    margin: 10px auto;
  }
  
  .table-responsive {
    font-size: 0.9rem;
  }
  
  .remark-cell {
    max-width: 180px;
  }
}
        `}
      </style>

      <div className="container-fluid py-4">
        <h3 className="text-center mb-4 fw-bold text-primary">Payment Tracker Pro++</h3>

        {/* Toast Notification */}
        {toast.show && (
          <div className={`toast position-fixed top-0 end-0 m-3 show text-bg-${toast.type}`}>
            <div className="toast-body">{toast.msg}</div>
          </div>
        )}

        {/* Department Master */}
        <div className="card p-4 mb-4">
          <h5 className="mb-3">Department Master</h5>
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label>Department Name</label>
              <input value={dName} onChange={(e) => setDName(e.target.value)} className="form-control" />
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={addDepartment}>
                <i className="fas fa-plus"></i> Add
              </button>
            </div>
          </div>
          <div className="master-table-wrapper mt-4">
            <div className="master-table-scroll">
              <table className="table table-bordered mb-0">
                <thead className="table-dark">
                  <tr><th>#</th><th>Department Name</th><th className="text-center" style={{ width: '120px' }}>Action</th></tr>
                </thead>
                <tbody>
                  {departments.map((d, i) => (
                    <tr key={d.id}>
                      <td>{i + 1}</td>
                      <td>{d.name}</td>
                      <td className="text-center">
                        <button className="btn btn-danger btn-sm" onClick={() => deleteDept(i)}>
                          <i className="fas fa-trash"></i> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Company Master */}
        <div className="card p-4 mb-4">
          <h5 className="mb-3">Company Master</h5>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label>Company Name</label>
              <input value={mCompany} onChange={e => setMCompany(e.target.value)} className="form-control" />
            </div>
            <div className="col-md-2">
              <label>Contact Person</label>
              <input value={mPerson} onChange={e => setMPerson(e.target.value)} className="form-control" />
            </div>
            <div className="col-md-2">
              <label>Department</label>
              <select value={mDept} onChange={e => setMDept(e.target.value)} className="form-select">
                <option value="">Select Department</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label>Status</label>
              <select value={mStatus} onChange={e => setMStatus(e.target.value)} className="form-select">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Contact Numbers */}
          <div className="row g-3 mt-2">
            <div className="col-12">
              <label>Contact Numbers</label>
              {mContacts.map((contact, index) => (
                <div key={index} className="contact-field-group mb-2">
                  <div className="d-flex gap-2">
                    <input
                      type="tel"
                      value={contact}
                      onChange={(e) => updateContactField(index, e.target.value)}
                      className="form-control"
                      placeholder={`Contact Number ${index + 1}`}
                    />
                    {mContacts.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeContactField(index)}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-outline-primary btn-sm mt-2"
                onClick={addContactField}
              >
                <i className="fas fa-plus"></i> Add Contact Number
              </button>
            </div>
          </div>

          {/* Address */}
          <div className="row g-3 mt-2">
            <div className="col-md-8">
              <label>Address</label>
              <textarea
                value={mAddress}
                onChange={(e) => setMAddress(e.target.value)}
                className="form-control"
                rows="2"
                placeholder="Enter company address"
              ></textarea>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button className="btn btn-primary w-100" onClick={addCompany}>
                <i className="fas fa-plus"></i> Add Company
              </button>
            </div>
          </div>

          <div className="master-table-wrapper mt-4">
            <div className="master-table-scroll">
              <table className="table table-bordered mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Department</th>
                    <th>Contact Numbers</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th className="text-center" style={{ width: '140px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c, i) => {
                    let contacts = []
                    try {
                      contacts = c.contacts ? JSON.parse(c.contacts) : []
                    } catch (e) {
                      contacts = []
                    }
                    
                    return (
                      <tr key={c.id}>
                        <td>{i + 1}</td>
                        <td>{c.name}</td>
                        <td>{c.person || '-'}</td>
                        <td>{c.dept || '-'}</td>
                        <td className="contacts-cell">
                          {contacts.length > 0 ? (
                            contacts.map((num, idx) => (
                              <span key={idx} className="contact-item">{num}</span>
                            ))
                          ) : '-'}
                        </td>
                        <td className="address-cell">{c.address || '-'}</td>
                        <td>
                          <span className={`badge ${c.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="text-center">
                          <button className="btn btn-warning btn-sm me-1" onClick={() => openCompanyModal(i)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteCompany(i)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

{/* Add New Payment - With Toast-based Due Date Validation */}
<div className="card p-4 mb-4">
  <h5 className="mb-3">Add New Payment</h5>
  <form onSubmit={addPaymentRecord} className="row g-3">
    <div className="col-md-3">
      <label>Company <span className="text-danger">*</span></label>
      <select 
        value={companySelect} 
        onChange={(e) => fillDetails(e.target.value)} 
        className="form-select" 
      >
        <option value="">Select Company</option>
        {companies.filter(c => c.status === 'active').map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
    </div>

    <div className="col-md-2">
      <label>Person</label>
      <input value={person} readOnly className="form-control" />
    </div>

    <div className="col-md-2">
      <label>Department</label>
      <input value={dept} readOnly className="form-control" />
    </div>

    <div className="col-md-2">
      <label>Month</label>
      <select value={month} onChange={e => setMonth(e.target.value)} className="form-select">
        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>

    <div className="col-md-2">
      <label>Total Amount (₹) <span className="text-danger">*</span></label>
      <input 
        value={amount} 
        onChange={e => setAmount(formatAmount(e.target.value))} 
        className="form-control amount-input" 
      />
    </div>

    <div className="col-md-2">
      <label>On-Bill Amount (₹)</label>
      <input 
        value={onBill} 
        onChange={e => setOnBill(formatAmount(e.target.value))} 
        className="form-control amount-input" 
      />
    </div>

    <div className="col-md-2">
      <label>Due Date <span className="text-danger">*</span></label>
      <input 
        type="date" 
        value={due} 
        onChange={e => setDue(e.target.value)} 
        className="form-control" 
      />
    </div>

    <div className="col-md-2">
      <label>Payment Mode</label>
      <select 
        value={payMode} 
        onChange={e => { 
          setPayMode(e.target.value); 
          if (e.target.value !== 'Bank') setBillCA('No'); 
        }} 
        className="form-select"
      >
        <option>Cash</option>
        <option>Bank</option>
      </select>
    </div>

    {payMode === 'Bank' && (
      <div className="col-md-2">
        <label>Bill to CA</label>
        <select value={billCA} onChange={e => setBillCA(e.target.value)} className="form-select">
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </select>
      </div>
    )}

    <div className="col-12 col-lg-4">
      <label>Remark (for the entire record)</label>
      <textarea 
        value={recordRemark} 
        onChange={e => setRecordRemark(e.target.value)} 
        className="form-control" 
        rows="1" 
        placeholder="Optional remark for this payment record"
      ></textarea>
    </div>

    <div className="col-12 col-lg-2 d-flex align-items-end">
      <button type="submit" className="btn btn-success w-100">
        <i className="fas fa-plus"></i> Add Payment
      </button>
    </div>
  </form>
</div>

        {/* Advanced Filters */}
        <div className="card p-4 mb-4 filter-card">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h5 className="mb-0 filter-title"><i className="fas fa-filter me-2"></i>Advanced Filters</h5>
            <div>
              <button className="btn btn-outline-primary btn-sm me-2" onClick={applyFilters}>
                <i className="fas fa-search"></i> Apply
              </button>
              <button className="btn btn-outline-secondary btn-sm me-2" onClick={resetFilters}>
                <i className="fas fa-undo"></i> Reset
              </button>
              <button className="btn btn-success btn-sm me-2" onClick={exportToExcel}>
                <i className="fas fa-file-excel"></i> Export to Excel
              </button>
              <button className="btn btn-danger btn-sm" onClick={exportToPDF}>
                <i className="fas fa-file-pdf"></i> Export to PDF
              </button>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-6 col-md-2"><label>Month</label>
              <select value={currentFilters.month} onChange={e => setCurrentFilters({ ...currentFilters, month: e.target.value })} className="form-select">
                <option value="">All Months</option>
                {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2"><label>Company</label>
              <select value={currentFilters.company} onChange={e => setCurrentFilters({ ...currentFilters, company: e.target.value })} className="form-select">
                <option value="">All Companies</option>
                {[...new Set(records.map(r => r.company))].sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2"><label>Department</label>
              <select value={currentFilters.dept} onChange={e => setCurrentFilters({ ...currentFilters, dept: e.target.value })} className="form-select">
                <option value="">All Departments</option>
                {[...new Set(records.map(r => r.dept))].sort().map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2"><label>Payment Mode</label>
              <select value={currentFilters.mode} onChange={e => setCurrentFilters({ ...currentFilters, mode: e.target.value })} className="form-select">
                <option value="">All Modes</option><option value="Cash">Cash</option><option value="Bank">Bank</option>
              </select>
            </div>
            <div className="col-6 col-md-2"><label>Bill to CA</label>
              <select value={currentFilters.billCA} onChange={e => setCurrentFilters({ ...currentFilters, billCA: e.target.value })} className="form-select">
                <option value="">All</option><option value="Yes">Yes</option><option value="No">No</option>
              </select>
            </div>
            <div className="col-6 col-md-2"><label>Due From</label>
              <input type="date" value={currentFilters.dueFrom} onChange={e => setCurrentFilters({ ...currentFilters, dueFrom: e.target.value })} className="form-control" />
            </div>
            <div className="col-6 col-md-2"><label>Due To</label>
              <input type="date" value={currentFilters.dueTo} onChange={e => setCurrentFilters({ ...currentFilters, dueTo: e.target.value })} className="form-control" />
            </div>
            <div className="col-6 col-md-2"><label>Search</label>
              <input type="text" value={currentFilters.search} onChange={e => setCurrentFilters({ ...currentFilters, search: e.target.value })} className="form-control" placeholder="Company/Person/Remark" />
            </div>
            <div className="col-6 col-md-2"><label>Min Amount ₹</label>
<input
  type="number"
  value={currentFilters.minAmt ?? ""}
  onChange={(e) => {
    const value = e.target.value;
    setCurrentFilters({
      ...currentFilters,
      minAmt: value === "" ? "" : parseFloat(value)
    });
  }}
  className="form-control"
/>            </div>
            <div className="col-6 col-md-2"><label>Max Amount ₹</label>
              <input type="number" value={currentFilters.maxAmt === Infinity ? '' : currentFilters.maxAmt} onChange={e => setCurrentFilters({ ...currentFilters, maxAmt: parseFloat(e.target.value) || Infinity })} className="form-control" />
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <div className="row mb-4 g-3">
          <div className="col-md-4">
            <div className="dashboard-card p-4 text-center">
              <h6 className="text-muted mb-1">Total Payable</h6>
              <h3 className="text-primary fw-bold">₹{totalPay.toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="dashboard-card p-4 text-center text-success">
              <h6 className="text-muted mb-1">Total Paid</h6>
              <h3 className="fw-bold">₹{totalPaid.toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="dashboard-card p-4 text-center text-danger">
              <h6 className="text-muted mb-1">Total Pending</h6>
              <h3 className="fw-bold">₹{totalPending.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>

        {/* Records Table */}
        {Object.keys(grouped).length === 0 ? (
          <div className="card p-5 text-center text-muted">
            <h5>No records match the selected filters.</h5>
            <p>Try adjusting the filter criteria.</p>
          </div>
        ) : (
          Object.keys(grouped).map(m => {
            const monthRecords = grouped[m]
            let mPay = 0, mOnBill = 0, mPaid = 0, mPend = 0
            monthRecords.forEach(r => {
              mPay += r.amount
              mOnBill += r.on_bill || 0
              mPaid += r.paid || 0
              mPend += r.pending || 0
            })
            return (
              <div className="card mb-4" key={m}>
                <div className="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
                  <strong>{m}</strong>
                  <span className="badge bg-light text-dark">{monthRecords.length} record(s)</span>
                </div>
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th><th>Company</th><th>Person</th><th>Dept</th><th>Due Date</th>
                        <th>Payable</th><th>On-Bill</th><th>Paid</th><th>Pending</th><th>Mode</th><th>Bill to CA</th><th>Record Remark</th><th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRecords.map((r, idx) => (
                        <tr key={r.id} className="payment-entry-row">
                          <td>{idx + 1}</td>
                          <td>{r.company}</td>
                          <td>{r.person}</td>
                          <td>{r.dept}</td>
                          <td>{r.due || '-'}</td>
                          <td>₹{r.amount.toLocaleString('en-IN')}</td>
                          <td className="text-primary">₹{(r.on_bill || 0).toLocaleString('en-IN')}</td>
                          <td className="text-success">₹{(r.paid || 0).toLocaleString('en-IN')}</td>
                          <td className="text-danger">₹{(r.pending || 0).toLocaleString('en-IN')}</td>
                          <td>{r.mode || '-'}</td>
                          <td>{r.bill || '-'}</td>
                          <td className="remark-cell" title={r.remark || ''}>
                            {r.remark ? (r.remark.length > 38 ? r.remark.substring(0, 38) + '...' : r.remark) : '—'}
                          </td>
                          <td className="text-center">
                            <button className="btn btn-warning btn-sm me-1" onClick={() => openEdit(records.indexOf(r))}>
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteRecord(records.indexOf(r))}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="5" className="text-end">Total for {m}</td>
                        <td>₹{mPay.toLocaleString('en-IN')}</td>
                        <td className="text-primary">₹{mOnBill.toLocaleString('en-IN')}</td>
                        <td className="text-success">₹{mPaid.toLocaleString('en-IN')}</td>
                        <td className="text-danger">₹{mPend.toLocaleString('en-IN')}</td>
                        <td colSpan="4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          })
        )}

        {/* Confirm Modal */}
        {showConfirm && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9999 }}>
            <div className="modal-dialog modal-sm">
              <div className="modal-content">
                <div className="modal-body text-center py-4">
                  <i className="fas fa-exclamation-triangle text-warning fa-2x mb-3"></i>
                  <h5 className="mb-4" dangerouslySetInnerHTML={{ __html: confirmMessage }}></h5>
                  <div>
                    <button className="btn btn-danger px-4 me-2" onClick={handleConfirmYes}>Yes, Delete</button>
                    <button className="btn btn-secondary px-4" onClick={() => setShowConfirm(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
  {/* Edit Modal - Improved Responsive Version */}
{showEditModal && (
  <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
    <div className="modal-dialog modal-xl">
      <div className="modal-content">
        <div className="modal-header border-0">
          <h5 className="modal-title">Edit Payment Record</h5>
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setShowEditModal(false)}
          ></button>
        </div>
        
        <div className="modal-body p-4">
          {/* Main Record Details - Responsive Grid */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-3">
              <label>Total Amount (₹)</label>
              <input 
                value={eAmount} 
                onChange={e => setEAmount(formatAmount(e.target.value))} 
                className="form-control amount-input" 
              />
            </div>
            <div className="col-12 col-md-3">
              <label>On-Bill Amount (₹)</label>
              <input 
                value={eOnBill} 
                onChange={e => setEOnBill(formatAmount(e.target.value))} 
                className="form-control amount-input" 
              />
            </div>
            <div className="col-12 col-md-3">
              <label>Due Date</label>
              <input 
                type="date" 
                value={eDue} 
                onChange={e => setEDue(e.target.value)} 
                className="form-control" 
              />
            </div>
            <div className="col-12 col-md-3">
              <label>Payment Mode</label>
              <select 
                value={eMode} 
                onChange={e => setEMode(e.target.value)} 
                className="form-select"
              >
                <option>Cash</option>
                <option>Bank</option>
              </select>
            </div>
          </div>

          {eMode === 'Bank' && (
            <div className="mb-4">
              <label>Bill to CA</label>
              <select 
                value={eBill} 
                onChange={e => setEBill(e.target.value)} 
                className="form-select w-100 w-md-50"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          )}

          <div className="mb-4">
            <label>Record Remark <small className="text-muted">(full view)</small></label>
            <textarea 
              value={eRecordRemark} 
              onChange={e => setERecordRemark(e.target.value)} 
              className="form-control" 
              rows="3"
            ></textarea>
          </div>

          {/* Payment Entries Section - Made Responsive */}
          <h5 className="mb-3">Payment Entries</h5>
          
          <div className="table-responsive mb-4" style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <table className="table table-bordered table-hover">
              <thead className="table-light sticky-top">
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th style={{ minWidth: '120px' }}>Amount (₹)</th>
                  <th style={{ minWidth: '110px' }}>Date</th>
                  <th style={{ minWidth: '100px' }}>Mode</th>
                  <th style={{ minWidth: '200px' }}>Remark</th>
                  <th style={{ width: '80px' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {editPayments.map((p, i) => (
                  <tr key={i} className="payment-entry-row">
                    <td>{i + 1}</td>
                    <td>₹{p.amount.toLocaleString('en-IN')}</td>
                    <td>{p.date || '—'}</td>
                    <td>{p.mode || '—'}</td>
                    <td className="remark-cell" title={p.remark || ''}>
                      {p.remark || '—'}
                    </td>
                    <td className="text-center">
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => deletePaymentRow(i)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {editPayments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No payment entries added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add New Payment Entry Form - Responsive */}
          <div className="card">
            <div className="card-body">
              <h6 className="mb-3">Add New Payment Entry</h6>
              <div className="row g-3">
                <div className="col-12 col-md-3">
                  <label>Amount (₹)</label>
                  <input 
                    value={newPayAmount} 
                    onChange={e => setNewPayAmount(formatAmount(e.target.value))} 
                    className="form-control amount-input" 
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label>Date</label>
                  <input 
                    type="date" 
                    value={newPayDate} 
                    onChange={e => setNewPayDate(e.target.value)} 
                    className="form-control" 
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label>Mode</label>
                  <select 
                    value={newPayMode} 
                    onChange={e => setNewPayMode(e.target.value)} 
                    className="form-select"
                  >
                    <option>Cash</option>
                    <option>Bank</option>
                  </select>
                </div>
                <div className="col-12 col-md-3">
                  <label>Remark</label>
                  <textarea 
                    value={newPayRemark} 
                    onChange={e => setNewPayRemark(e.target.value)} 
                    className="form-control" 
                    rows="1" 
                    placeholder="Optional remark"
                  ></textarea>
                </div>
                <div className="col-12 text-end">
                  <button 
                    className="btn btn-success" 
                    onClick={addPaymentRow}
                  >
                    <i className="fas fa-plus"></i> Add Entry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer border-0">
          <button 
            className="btn btn-primary px-4" 
            onClick={saveEdit}
          >
            <i className="fas fa-save"></i> Save All Changes
          </button>
          <button 
            className="btn btn-secondary px-4" 
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}

        {/* Company Edit Modal */}
        {showCompanyModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content p-4">
                <h5 className="mb-3">Edit Company</h5>
                
                <label>Name</label>
                <input value={cName} onChange={e => setCName(e.target.value)} className="form-control mb-3" />
                
                <label>Person</label>
                <input value={cPerson} onChange={e => setCPerson(e.target.value)} className="form-control mb-3" />
                
                <label>Department</label>
                <select value={cDept} onChange={e => setCDept(e.target.value)} className="form-select mb-3">
                  <option value="">Select Department</option>
                  {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>

                <label>Contact Numbers</label>
                {cContacts.map((contact, index) => (
                  <div key={index} className="mb-2">
                    <div className="d-flex gap-2">
                      <input
                        type="tel"
                        value={contact}
                        onChange={(e) => updateEditContactField(index, e.target.value)}
                        className="form-control"
                        placeholder={`Contact Number ${index + 1}`}
                      />
                      {cContacts.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeEditContactField(index)}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm mb-3"
                  onClick={addEditContactField}
                >
                  <i className="fas fa-plus"></i> Add Contact Number
                </button>

                <label>Address</label>
                <textarea
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  className="form-control mb-3"
                  rows="3"
                  placeholder="Enter company address"
                ></textarea>
                
                <label>Status</label>
                <select value={cStatus} onChange={e => setCStatus(e.target.value)} className="form-select mb-3">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                
                <div className="text-end">
                  <button className="btn btn-secondary me-2" onClick={() => setShowCompanyModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveCompanyEdit}>Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}