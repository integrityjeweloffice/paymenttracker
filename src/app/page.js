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
  const [loading, setLoading] = useState(true)

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
    dueFrom: '', dueTo: '', search: '', minAmt: '', maxAmt: ''
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
    setLoading(true)
    const { data: recordsData, error: recordsError } = await supabase
      .from('payment_records')
      .select('*')
      .order('created_at', { ascending: false })

    if (recordsError) {
      console.error('Error loading records:', recordsError)
      setLoading(false)
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
    setLoading(false)
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
    if (!cName.trim()) return showToast("Company name is required", "danger")
    
    const filteredContacts = cContacts.filter(c => c.trim() !== '')
    
    const { error } = await supabase
      .from('companies')
      .update({ 
        name: cName.trim(), 
        person: cPerson.trim(), 
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
      loadRecords() // Refresh records if company details changed
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
  const addPaymentRecord = async (e) => {
    e.preventDefault()

    // Validation
    if (!companySelect.trim()) {
      return showToast("Please select a company", "danger")
    }

    if (!due) {
      return showToast("Due Date is required", "danger")
    }

    const numericAmount = getNumeric(amount)
    if (numericAmount <= 0) {
      return showToast("Please enter a valid Total Amount greater than zero", "danger")
    }

    const numericOnBill = getNumeric(onBill)

    // Insert record
    const { error } = await supabase.from('payment_records').insert([{
      company: companySelect,
      person,
      dept,
      month,
      amount: numericAmount,
      on_bill: numericOnBill,
      due,
      mode: payMode,
      bill: payMode === 'Bank' ? billCA : '',
      remark: recordRemark.trim()
    }])
    
    if (error) {
      showToast("Error adding payment record", "danger")
    } else {
      // Reset form
      setCompanySelect('')
      setPerson('')
      setDept('')
      setMonth('')
      setAmount('')
      setOnBill('')
      setDue('')
      setPayMode('Cash')
      setBillCA('No')
      setRecordRemark('')

      loadRecords()
      showToast("Payment record added successfully", "success")
    }
  }

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
    
    // Reset new payment entry fields
    setNewPayAmount('')
    setNewPayDate('')
    setNewPayMode('Cash')
    setNewPayRemark('')
    
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (currentEditingId === null) return

    const numericAmount = getNumeric(eAmount)
    const numericOnBill = getNumeric(eOnBill)

    if (numericAmount <= 0) {
      return showToast("Total amount must be greater than zero", "danger")
    }


    
    // Update main record
    const { error: recordError } = await supabase
      .from('payment_records')
      .update({
        amount: numericAmount,
        on_bill: numericOnBill,
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
    if (!amt || amt <= 0) return showToast("Please enter a valid amount greater than zero", "danger")

    if (!newPayDate) return showToast("Please select a payment date", "danger")

    const total = editPayments.reduce((s, p) => s + (p.amount || 0), 0)
    const eAmtVal = getNumeric(eAmount)
    const eOnBillVal = getNumeric(eOnBill)

    const maxAllowed = Math.max(eAmtVal, eOnBillVal)

    if (total + amt > maxAllowed) {
      const limitName = maxAllowed === eOnBillVal && eOnBillVal > eAmtVal ? 'On-Bill Amount' : 'Total Payable'
      return showToast(`Total payments cannot exceed ${limitName} (₹${formatAmount(maxAllowed)})`, "danger")
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
    setNewPayMode('Cash')
    setNewPayRemark('')
    showToast("Payment entry added", "success")
  }

  const deletePaymentRow = (i) => {
    const p = editPayments[i]
    showConfirmDialog(`Delete this payment entry of <strong>₹${p.amount.toLocaleString('en-IN')}</strong>?`, () => {
      setEditPayments(editPayments.filter((_, idx) => idx !== i))
      showToast("Payment entry removed")
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
    
    const minAmt = currentFilters.minAmt === '' ? 0 : parseFloat(currentFilters.minAmt)
    const maxAmt = currentFilters.maxAmt === '' ? Infinity : parseFloat(currentFilters.maxAmt)
    if (r.amount < minAmt || r.amount > maxAmt) return false
    
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
      dueFrom: '', dueTo: '', search: '', minAmt: '', maxAmt: ''
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
      {/* Global Styles */}
      <style jsx global>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

          :root {
            --primary-gradient: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
            --success-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
            --danger-gradient: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
            --warning-gradient: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            --info-gradient: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
            --card-bg: rgba(255, 255, 255, 0.75);
            --bg-color: #f0f4f8;
          }

          * {
            box-sizing: border-box;
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
            min-height: 100vh;
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
            background-clip: text;
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
            background-color: rgba(255, 255, 255, 0.95);
            font-size: 0.95rem;
            color: #334155;
          }

          .form-control:focus, .form-select:focus {
            border-color: #818cf8;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
            background-color: #fff;
            outline: none;
          }

          .form-control:disabled, .form-control[readonly] {
            background-color: #f1f5f9;
            cursor: not-allowed;
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
            cursor: pointer;
          }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .btn-sm {
            padding: 8px 16px;
            border-radius: 10px;
            font-size: 0.9rem;
          }

          .btn-primary {
            background: var(--primary-gradient);
            color: white;
            box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
          }

          .btn-primary:hover:not(:disabled) {
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

          .btn-success:hover:not(:disabled) {
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

          .btn-danger:hover:not(:disabled) {
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

          .btn-warning:hover:not(:disabled) {
            background: var(--warning-gradient);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(217, 119, 6, 0.4);
            color: white;
          }

          .btn-info {
            background: var(--info-gradient);
            color: white;
            box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
          }

          .btn-info:hover:not(:disabled) {
            background: var(--info-gradient);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(6, 182, 212, 0.4);
            color: white;
          }

          .btn-outline-primary, .btn-outline-secondary {
            border: 2px solid #e2e8f0;
            background: transparent;
            color: #475569;
            box-shadow: none;
          }

          .btn-outline-primary:hover:not(:disabled) {
            border-color: #6366f1;
            background: rgba(99, 102, 241, 0.05);
            color: #4f46e5;
            transform: translateY(-2px);
          }

          .btn-outline-secondary:hover:not(:disabled) {
            border-color: #94a3b8;
            background: rgba(148, 163, 184, 0.05);
            color: #0f172a;
            transform: translateY(-2px);
          }

          .btn-secondary {
            background: #94a3b8;
            color: white;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #64748b;
            transform: translateY(-2px);
          }

          textarea.form-control { 
            resize: vertical; 
            min-height: 44px; 
          }

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

          /* Payment Records Table - Horizontal Scroll */
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

          .table {
            min-width: 1200px;
            margin-bottom: 0;
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
            border: none;
          }

          .table td {
            padding: 14px 12px;
            vertical-align: middle;
            font-weight: 500;
            border-bottom: 1px solid #f1f5f9;
          }

          .table tbody tr {
            transition: background-color 0.2s ease;
          }

          .table tbody tr:hover {
            background-color: #f8fafc;
          }

          .table-light thead th {
            background-color: rgba(241, 245, 249, 0.9) !important;
            color: #475569 !important;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            padding: 16px;
            border-bottom: 2px solid #e2e8f0;
          }

          .table tfoot td {
            font-weight: 800;
            background-color: rgba(248, 250, 252, 0.95);
            color: #0f172a;
            font-size: 1.05rem;
            border-top: 2px solid #e2e8f0;
            padding: 16px 12px;
          }

          .table-bordered {
            border: 1px solid #e2e8f0;
          }

          .table-bordered td,
          .table-bordered th {
            border: 1px solid #e2e8f0;
          }

          .table-dark {
            background-color: #1e293b;
          }

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
            top: 0; 
            left: 0; 
            right: 0; 
            height: 6px;
            background: var(--primary-gradient);
            opacity: 0.8;
          }

          .dashboard-card.text-success::before { 
            background: var(--success-gradient); 
          }

          .dashboard-card.text-danger::before { 
            background: var(--danger-gradient); 
          }

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
            line-height: 1.5;
          }

          .contacts-cell {
            min-width: 140px;
          }

          .contact-item {
            display: block;
            margin-bottom: 4px;
            font-size: 0.9rem;
            color: #334155;
          }

          .contact-item:last-child {
            margin-bottom: 0;
          }

          .toast {
            z-index: 9999;
            border-radius: 14px;
            min-width: 300px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          }

          .toast-body {
            padding: 16px;
            font-weight: 600;
          }

          .modal {
            z-index: 9998;
          }

          .modal-content {
            border-radius: 24px;
            border: none;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
          }

          .modal-header {
            border-bottom: 1px solid #f1f5f9;
            padding: 20px 24px;
          }

          .modal-body {
            padding: 24px;
          }

          .modal-footer {
            border-top: 1px solid #f1f5f9;
            padding: 20px 24px;
          }

          .modal-title {
            font-weight: 700;
            color: #1e293b;
          }

          .btn-close {
            opacity: 0.5;
          }

          .btn-close:hover {
            opacity: 1;
          }

          .badge {
            padding: 8px 16px;
            border-radius: 30px;
            font-weight: 600;
            letter-spacing: 0.5px;
            font-size: 0.85rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }

          .bg-success {
            background-color: #10b981 !important;
          }

          .bg-secondary {
            background-color: #6b7280 !important;
          }

          .bg-light {
            background-color: #f8fafc !important;
          }

          .text-dark {
            color: #1e293b !important;
          }

          .text-danger {
            color: #ef4444 !important;
          }

          .text-success {
            color: #10b981 !important;
          }

          .text-primary {
            color: #6366f1 !important;
          }

          .text-muted {
            color: #94a3b8 !important;
          }

          .text-bg-success {
            background-color: #10b981 !important;
            color: white !important;
          }

          .text-bg-danger {
            background-color: #ef4444 !important;
            color: white !important;
          }

          .text-bg-info {
            background-color: #06b6d4 !important;
            color: white !important;
          }

          /* Loading Spinner */
          .spinner-border {
            width: 3rem;
            height: 3rem;
            border: 0.25em solid currentColor;
            border-right-color: transparent;
            border-radius: 50%;
            animation: spinner-border 0.75s linear infinite;
          }

          @keyframes spinner-border {
            to { transform: rotate(360deg); }
          }

          /* Responsive */
          @media (max-width: 992px) {
            .table { min-width: 1400px; }
          }

          @media (max-width: 768px) {
            .card { 
              margin-bottom: 24px; 
              border-radius: 16px;
            }
            
            .modal-xl {
              max-width: 95% !important;
              margin: 10px auto;
            }
            
            h3 {
              font-size: 1.75rem !important;
            }

            .dashboard-card {
              padding: 20px !important;
            }

            .btn {
              padding: 10px 18px;
              font-size: 0.9rem;
            }

            .btn-sm {
              padding: 6px 12px;
              font-size: 0.85rem;
            }
          }

          @media (max-width: 576px) {
            .container-fluid {
              padding-left: 12px;
              padding-right: 12px;
            }

            .card {
              padding: 16px !important;
            }

            h3 {
              font-size: 1.5rem !important;
            }
          }

          /* Sticky Header Fix */
          .sticky-top {
            position: sticky;
            top: 0;
            z-index: 20;
          }

          /* Number Input - Remove Arrows */
          input[type=number]::-webkit-inner-spin-button,
          input[type=number]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }

          input[type=number] {
            -moz-appearance: textfield;
          }

          /* Smooth Transitions */
          * {
            transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
          }

          button, a, .btn {
            transition: all 0.3s ease;
          }
        `}
      </style>

      <div className="container-fluid py-4">
        <h3 className="text-center mb-4 fw-bold text-primary">
          <i className="fas fa-file-invoice-dollar me-2"></i>
          Office Payments 
        </h3>

        {/* Loading Overlay */}
        {loading && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div className="spinner-border text-primary"></div>
          </div>
        )}

        {/* Toast Notification */}
        {toast.show && (
          <div className={`toast position-fixed top-0 end-0 m-3 show text-bg-${toast.type}`}>
            <div className="toast-body">
              <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2`}></i>
              {toast.msg}
            </div>
          </div>
        )}

        {/* Department Master */}
        <div className="card p-4 mb-4">
          <h5 className="mb-3">
            <i className="fas fa-building me-2"></i>
            Department Master
          </h5>
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label>Department Name</label>
              <input 
                value={dName} 
                onChange={(e) => setDName(e.target.value)} 
                className="form-control" 
                placeholder="Enter department name"
                onKeyDown={(e) => e.key === 'Enter' && addDepartment()}
              />
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
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Department Name</th>
                    <th className="text-center" style={{ width: '120px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center text-muted py-4">
                        No departments added yet
                      </td>
                    </tr>
                  ) : (
                    departments.map((d, i) => (
                      <tr key={d.id}>
                        <td>{i + 1}</td>
                        <td>{d.name}</td>
                        <td className="text-center">
                          <button className="btn btn-danger btn-sm" onClick={() => deleteDept(i)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Company Master */}
        <div className="card p-4 mb-4">
          <h5 className="mb-3">
            <i className="fas fa-briefcase me-2"></i>
            Company Master
          </h5>
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label>Company Name <span className="text-danger">*</span></label>
              <input 
                value={mCompany} 
                onChange={e => setMCompany(e.target.value)} 
                className="form-control"
                placeholder="Enter company name"
              />
            </div>
            <div className="col-md-2">
              <label>Contact Person</label>
              <input 
                value={mPerson} 
                onChange={e => setMPerson(e.target.value)} 
                className="form-control"
                placeholder="Person name"
              />
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
                <div key={index} className="mb-2">
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
                        style={{ minWidth: '40px' }}
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
                    <th style={{ width: '50px' }}>#</th>
                    <th style={{ minWidth: '150px' }}>Company Name</th>
                    <th style={{ minWidth: '130px' }}>Contact Person</th>
                    <th style={{ minWidth: '120px' }}>Department</th>
                    <th style={{ minWidth: '150px' }}>Contact Numbers</th>
                    <th style={{ minWidth: '200px' }}>Address</th>
                    <th style={{ width: '100px' }}>Status</th>
                    <th className="text-center" style={{ width: '120px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">
                        No companies added yet
                      </td>
                    </tr>
                  ) : (
                    companies.map((c, i) => {
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
                          <td>{c.person || '—'}</td>
                          <td>{c.dept || '—'}</td>
                          <td className="contacts-cell">
                            {contacts.length > 0 ? (
                              contacts.map((num, idx) => (
                                <span key={idx} className="contact-item">
                                  <i className="fas fa-phone fa-sm me-1"></i>
                                  {num}
                                </span>
                              ))
                            ) : '—'}
                          </td>
                          <td className="address-cell">{c.address || '—'}</td>
                          <td>
                            <span className={`badge ${c.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="text-center">
                            <button 
                              className="btn btn-warning btn-sm me-1" 
                              onClick={() => openCompanyModal(i)}
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={() => deleteCompany(i)}
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add New Payment */}
        <div className="card p-4 mb-4">
          <h5 className="mb-3">
            <i className="fas fa-plus-circle me-2"></i>
            Add New Payment Record
          </h5>
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
              <input value={person} readOnly className="form-control" placeholder="Auto-filled" />
            </div>

            <div className="col-md-2">
              <label>Department</label>
              <input value={dept} readOnly className="form-control" placeholder="Auto-filled" />
            </div>

            <div className="col-md-2">
              <label>Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)} className="form-select">
                <option value="">Select Month</option>
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
                className="form-control" 
                placeholder="0"
              />
            </div>

            <div className="col-md-2">
              <label>On-Bill Amount (₹)</label>
              <input 
                value={onBill} 
                onChange={e => setOnBill(formatAmount(e.target.value))} 
                className="form-control" 
                placeholder="0"
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
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
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

            <div className="col-md-4">
              <label>Remark</label>
              <textarea 
                value={recordRemark} 
                onChange={e => setRecordRemark(e.target.value)} 
                className="form-control" 
                rows="1" 
                placeholder="Optional remark for this payment record"
              ></textarea>
            </div>

            <div className="col-md-2 d-flex align-items-end">
              <button type="submit" className="btn btn-success w-100">
                <i className="fas fa-check"></i> Add Payment
              </button>
            </div>
          </form>
        </div>

        {/* Advanced Filters */}
        <div className="card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h5 className="mb-0">
              <i className="fas fa-filter me-2"></i>
              Advanced Filters
            </h5>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-outline-primary btn-sm" onClick={applyFilters}>
                <i className="fas fa-search"></i> Apply
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={resetFilters}>
                <i className="fas fa-undo"></i> Reset
              </button>
              <button className="btn btn-success btn-sm" onClick={exportToExcel}>
                <i className="fas fa-file-excel"></i> Excel
              </button>
              <button className="btn btn-danger btn-sm" onClick={exportToPDF}>
                <i className="fas fa-file-pdf"></i> PDF
              </button>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-6 col-md-2">
              <label>Month</label>
              <select value={currentFilters.month} onChange={e => setCurrentFilters({ ...currentFilters, month: e.target.value })} className="form-select">
                <option value="">All Months</option>
                {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label>Company</label>
              <select value={currentFilters.company} onChange={e => setCurrentFilters({ ...currentFilters, company: e.target.value })} className="form-select">
                <option value="">All Companies</option>
                {[...new Set(records.map(r => r.company))].sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label>Department</label>
              <select value={currentFilters.dept} onChange={e => setCurrentFilters({ ...currentFilters, dept: e.target.value })} className="form-select">
                <option value="">All Departments</option>
                {[...new Set(records.map(r => r.dept))].filter(Boolean).sort().map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label>Payment Mode</label>
              <select value={currentFilters.mode} onChange={e => setCurrentFilters({ ...currentFilters, mode: e.target.value })} className="form-select">
                <option value="">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label>Bill to CA</label>
              <select value={currentFilters.billCA} onChange={e => setCurrentFilters({ ...currentFilters, billCA: e.target.value })} className="form-select">
                <option value="">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label>Due From</label>
              <input type="date" value={currentFilters.dueFrom} onChange={e => setCurrentFilters({ ...currentFilters, dueFrom: e.target.value })} className="form-control" />
            </div>
            <div className="col-6 col-md-2">
              <label>Due To</label>
              <input type="date" value={currentFilters.dueTo} onChange={e => setCurrentFilters({ ...currentFilters, dueTo: e.target.value })} className="form-control" />
            </div>
            <div className="col-6 col-md-2">
              <label>Search</label>
              <input 
                type="text" 
                value={currentFilters.search} 
                onChange={e => setCurrentFilters({ ...currentFilters, search: e.target.value })} 
                className="form-control" 
                placeholder="Company/Person/Remark" 
              />
            </div>
            <div className="col-6 col-md-2">
              <label>Min Amount ₹</label>
              <input
                type="number"
                value={currentFilters.minAmt}
                onChange={(e) => setCurrentFilters({ ...currentFilters, minAmt: e.target.value })}
                className="form-control"
                placeholder="0"
              />
            </div>
            <div className="col-6 col-md-2">
              <label>Max Amount ₹</label>
              <input 
                type="number" 
                value={currentFilters.maxAmt} 
                onChange={e => setCurrentFilters({ ...currentFilters, maxAmt: e.target.value })} 
                className="form-control"
                placeholder="∞"
              />
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <div className="row mb-4 g-3">
          <div className="col-md-4">
            <div className="dashboard-card p-4 text-center">
              <h6 className="text-muted mb-2">
                <i className="fas fa-file-invoice-dollar me-2"></i>
                Total Payable
              </h6>
              <h3 className="text-primary fw-bold mb-0">₹{totalPay.toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="dashboard-card p-4 text-center text-success">
              <h6 className="text-muted mb-2">
                <i className="fas fa-check-circle me-2"></i>
                Total Paid
              </h6>
              <h3 className="fw-bold mb-0">₹{totalPaid.toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <div className="col-md-4">
            <div className="dashboard-card p-4 text-center text-danger">
              <h6 className="text-muted mb-2">
                <i className="fas fa-hourglass-half me-2"></i>
                Total Pending
              </h6>
              <h3 className="fw-bold mb-0">₹{totalPending.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        </div>

        {/* Records Table */}
        {Object.keys(grouped).length === 0 ? (
          <div className="card p-5 text-center text-muted">
            <i className="fas fa-inbox fa-3x mb-3 opacity-50"></i>
            <h5>No records match the selected filters</h5>
            <p className="mb-0">Try adjusting the filter criteria or add a new payment record</p>
          </div>
        ) : (
          Object.keys(grouped).sort().map(m => {
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
                  <strong>
                    <i className="fas fa-calendar-alt me-2"></i>
                    {m}
                  </strong>
                  <span className="badge bg-light text-dark">{monthRecords.length} record(s)</span>
                </div>
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th style={{ minWidth: '150px' }}>Company</th>
                        <th style={{ minWidth: '130px' }}>Person</th>
                        <th style={{ minWidth: '120px' }}>Dept</th>
                        <th style={{ minWidth: '110px' }}>Due Date</th>
                        <th style={{ minWidth: '120px' }}>Payable</th>
                        <th style={{ minWidth: '120px' }}>On-Bill</th>
                        <th style={{ minWidth: '120px' }}>Paid</th>
                        <th style={{ minWidth: '120px' }}>Pending</th>
                        <th style={{ minWidth: '90px' }}>Mode</th>
                        <th style={{ minWidth: '90px' }}>Bill CA</th>
                        <th style={{ minWidth: '250px' }}>Remark</th>
                        <th className="text-center" style={{ width: '120px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRecords.map((r, idx) => (
                        <tr key={r.id}>
                          <td>{idx + 1}</td>
                          <td><strong>{r.company}</strong></td>
                          <td>{r.person}</td>
                          <td>{r.dept}</td>
                          <td>{r.due || '—'}</td>
                          <td className="fw-bold">₹{r.amount.toLocaleString('en-IN')}</td>
                          <td className="text-primary">₹{(r.on_bill || 0).toLocaleString('en-IN')}</td>
                          <td className="text-success">₹{(r.paid || 0).toLocaleString('en-IN')}</td>
                          <td className="text-danger">₹{(r.pending || 0).toLocaleString('en-IN')}</td>
                          <td>
                            <span className={`badge ${r.mode === 'Bank' ? 'bg-info' : 'bg-secondary'}`}>
                              {r.mode || '—'}
                            </span>
                          </td>
                          <td>{r.bill || '—'}</td>
                          <td className="remark-cell" title={r.remark || ''}>
                            {r.remark ? (r.remark.length > 38 ? r.remark.substring(0, 38) + '...' : r.remark) : '—'}
                          </td>
                          <td className="text-center">
                            <button 
                              className="btn btn-warning btn-sm me-1" 
                              onClick={() => openEdit(records.indexOf(r))}
                              title="Edit"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={() => deleteRecord(records.indexOf(r))}
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="5" className="text-end"><strong>Total for {m}</strong></td>
                        <td className="fw-bold">₹{mPay.toLocaleString('en-IN')}</td>
                        <td className="text-primary fw-bold">₹{mOnBill.toLocaleString('en-IN')}</td>
                        <td className="text-success fw-bold">₹{mPaid.toLocaleString('en-IN')}</td>
                        <td className="text-danger fw-bold">₹{mPend.toLocaleString('en-IN')}</td>
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
            <div className="modal-dialog modal-sm modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-body text-center py-4">
                  <i className="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                  <h5 className="mb-4" dangerouslySetInnerHTML={{ __html: confirmMessage }}></h5>
                  <div>
                    <button className="btn btn-danger px-4 me-2" onClick={handleConfirmYes}>
                      <i className="fas fa-check me-1"></i> Yes, Delete
                    </button>
                    <button className="btn btn-secondary px-4" onClick={() => setShowConfirm(false)}>
                      <i className="fas fa-times me-1"></i> Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-edit me-2"></i>
                    Edit Payment Record
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowEditModal(false)}
                  ></button>
                </div>
                
                <div className="modal-body">
                  {/* Main Record Details */}
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-3">
                      <label>Total Amount (₹) <span className="text-danger">*</span></label>
                      <input 
                        value={eAmount} 
                        onChange={e => setEAmount(formatAmount(e.target.value))} 
                        className="form-control" 
                      />
                    </div>
                    <div className="col-12 col-md-3">
                      <label>On-Bill Amount (₹)</label>
                      <input 
                        value={eOnBill} 
                        onChange={e => setEOnBill(formatAmount(e.target.value))} 
                        className="form-control" 
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
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                      </select>
                    </div>
                  </div>

                  {eMode === 'Bank' && (
                    <div className="mb-4">
                      <label>Bill to CA</label>
                      <select 
                        value={eBill} 
                        onChange={e => setEBill(e.target.value)} 
                        className="form-select"
                        style={{ maxWidth: '200px' }}
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                    </div>
                  )}

                  <div className="mb-4">
                    <label>Record Remark</label>
                    <textarea 
                      value={eRecordRemark} 
                      onChange={e => setERecordRemark(e.target.value)} 
                      className="form-control" 
                      rows="3"
                      placeholder="Enter remark for this payment record"
                    ></textarea>
                  </div>

                  <hr />

                  {/* Payment Entries Section */}
                  <h5 className="mb-3">
                    <i className="fas fa-money-bill-wave me-2"></i>
                    Payment Entries
                  </h5>
                  
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
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td className="fw-bold">₹{p.amount.toLocaleString('en-IN')}</td>
                            <td>{p.date || '—'}</td>
                            <td>
                              <span className={`badge ${p.mode === 'Bank' ? 'bg-info' : 'bg-secondary'}`}>
                                {p.mode || '—'}
                              </span>
                            </td>
                            <td>{p.remark || '—'}</td>
                            <td className="text-center">
                              <button 
                                className="btn btn-danger btn-sm" 
                                onClick={() => deletePaymentRow(i)}
                                title="Delete"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {editPayments.length === 0 && (
                          <tr>
                            <td colSpan="6" className="text-center text-muted py-4">
                              <i className="fas fa-info-circle me-2"></i>
                              No payment entries added yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {editPayments.length > 0 && (
                        <tfoot>
                          <tr>
                            <td colSpan="1" className="text-end fw-bold">Total:</td>
                            <td className="fw-bold text-success">
                              ₹{editPayments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString('en-IN')}
                            </td>
                            <td colSpan="4"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Add New Payment Entry Form */}
                  <div className="card">
                    <div className="card-body">
                      <h6 className="mb-3">
                        <i className="fas fa-plus-circle me-2"></i>
                        Add New Payment Entry
                      </h6>
                      <div className="row g-3">
                        <div className="col-12 col-md-3">
                          <label>Amount (₹) <span className="text-danger">*</span></label>
                          <input 
                            value={newPayAmount} 
                            onChange={e => setNewPayAmount(formatAmount(e.target.value))} 
                            className="form-control" 
                            placeholder="0"
                          />
                        </div>
                        <div className="col-12 col-md-3">
                          <label>Date <span className="text-danger">*</span></label>
                          <input 
                            type="date" 
                            value={newPayDate} 
                            onChange={e => setNewPayDate(e.target.value)} 
                            className="form-control" 
                          />
                        </div>
                        <div className="col-12 col-md-2">
                          <label>Mode</label>
                          <select 
                            value={newPayMode} 
                            onChange={e => setNewPayMode(e.target.value)} 
                            className="form-select"
                          >
                            <option value="Cash">Cash</option>
                            <option value="Bank">Bank</option>
                          </select>
                        </div>
                        <div className="col-12 col-md-4">
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
                            type="button"
                          >
                            <i className="fas fa-plus"></i> Add Entry
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button 
                    className="btn btn-primary px-4" 
                    onClick={saveEdit}
                  >
                    <i className="fas fa-save me-2"></i>
                    Save All Changes
                  </button>
                  <button 
                    className="btn btn-secondary px-4" 
                    onClick={() => setShowEditModal(false)}
                  >
                    <i className="fas fa-times me-2"></i>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Company Edit Modal */}
        {showCompanyModal && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-edit me-2"></i>
                    Edit Company
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowCompanyModal(false)}
                  ></button>
                </div>
                
                <div className="modal-body">
                  <div className="mb-3">
                    <label>Company Name <span className="text-danger">*</span></label>
                    <input 
                      value={cName} 
                      onChange={e => setCName(e.target.value)} 
                      className="form-control"
                      placeholder="Enter company name"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label>Contact Person</label>
                    <input 
                      value={cPerson} 
                      onChange={e => setCPerson(e.target.value)} 
                      className="form-control"
                      placeholder="Enter contact person name"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label>Department</label>
                    <select value={cDept} onChange={e => setCDept(e.target.value)} className="form-select">
                      <option value="">Select Department</option>
                      {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>

                  <div className="mb-3">
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
                              style={{ minWidth: '40px' }}
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
                      onClick={addEditContactField}
                    >
                      <i className="fas fa-plus"></i> Add Contact Number
                    </button>
                  </div>

                  <div className="mb-3">
                    <label>Address</label>
                    <textarea
                      value={cAddress}
                      onChange={(e) => setCAddress(e.target.value)}
                      className="form-control"
                      rows="3"
                      placeholder="Enter company address"
                    ></textarea>
                  </div>
                  
                  <div className="mb-3">
                    <label>Status</label>
                    <select value={cStatus} onChange={e => setCStatus(e.target.value)} className="form-select">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button className="btn btn-primary px-4" onClick={saveCompanyEdit}>
                    <i className="fas fa-save me-2"></i>
                    Save Changes
                  </button>
                  <button className="btn btn-secondary px-4" onClick={() => setShowCompanyModal(false)}>
                    <i className="fas fa-times me-2"></i>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </>
  )
}