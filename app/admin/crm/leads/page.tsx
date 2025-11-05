'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import './modern-styles.css'

interface Lead {
  id: string
  parentName: string
  parentPhone: string | null
  parentEmail: string | null
  studentName: string | null
  schoolOrigin: string | null
  gradeTarget: string | null
  enrollmentYear: string | null
  infoSource: string | null
  dateContact: string | null
  leadMonth: string | null
  status: string
  customerJourney: string | null
  notes: string | null
  nextFollowUp: string | null
  domicile: string | null
  created_at: string
  school: {
    id: string
    name: string
  }
}

interface LeadsResponse {
  leads: Lead[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: {
    byStatus: Array<{ status: string; _count: { status: number } }>
    bySource: Array<{ infoSource: string | null; _count: { infoSource: number } }>
  }
}

export default function LeadsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get schoolId from URL params (for superadmin access)
  const schoolIdParam = searchParams.get('schoolId')
  const isSuperadminAccess = searchParams.get('superadmin') === 'true'
  
  // States
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [gradeFilter] = useState('')
  const [sortField, setSortField] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [, setHoveredRow] = useState<number | null>(null)
  const [editingCell, setEditingCell] = useState<{leadId: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isCellSaving, setIsCellSaving] = useState(false)
  const [isBulkOperating, setIsBulkOperating] = useState(false)
  const [pagination, setPagination] = useState<LeadsResponse['pagination'] | null>(null)
  const [, setStats] = useState<LeadsResponse['stats'] | null>(null)
  
  // Column resize functionality
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    checkbox: 50,
    number: 60,
    infoSource: 120,
    dateContact: 120,
    leadMonth: 100,
    parentName: 150,
    parentPhone: 130,
    parentEmail: 180,
    studentName: 140,
    schoolOrigin: 130,
    gradeTarget: 80,
    enrollmentYear: 100,
    domicile: 130,
    status: 120,
    notes: 200
  })
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)
  
  // Add Lead Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLead, setNewLead] = useState({
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    studentName: '',
    schoolOrigin: '',
    gradeTarget: '',
    enrollmentYear: '',
    domicile: '',
    infoSource: '',
    dateContact: '',
    leadMonth: '',
    status: 'NEW',
    customerJourney: '',
    notes: '',
    nextFollowUp: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Info Source options with ability to add new ones
  const [infoSourceOptions, setInfoSourceOptions] = useState([
    'Website Form',
    'Facebook Ads',
    'Instagram Ads',
    'Google Ads',
    'TikTok Ads',
    'Event/Expo',
    'Walk-in (Kunjung Langsung)',
    'Open House',
    'Referral (Parent/Teman/Relasi)',
    'Alumni dari SD',
    'Alumni dari SMP',
    'Anak Alumni',
    'Alumni dari Sister School',
    'Alumni dari TK'
  ])
  
  // Lead Status options with ability to add new ones - synchronized with dashboard
  const [leadStatusOptions, setLeadStatusOptions] = useState([
    { value: 'NEW', label: 'New', color: 'bg-gray-100 text-gray-800' },
    { value: 'KONTAK_VIA_WA', label: 'Kontak via WA', color: 'bg-blue-100 text-blue-800' },
    { value: 'BAYAR_FORM_PRE', label: 'Bayar Form (Pre)', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'BAYAR_UP_OFFICIAL', label: 'Bayar UP (Official)', color: 'bg-green-100 text-green-800' },
    { value: 'POTENSI_WARM', label: 'Potensi (Warm)', color: 'bg-orange-100 text-orange-800' },
    { value: 'TIDAK_RESPON', label: 'Tidak Respon', color: 'bg-red-100 text-red-800' },
    { value: 'TIDAK_POTENSI_COLD', label: 'Tidak Potensi (Cold)', color: 'bg-gray-100 text-gray-800' },
    { value: 'SURVEY_SEKOLAH', label: 'Survey Sekolah', color: 'bg-purple-100 text-purple-800' },
    { value: 'CONVERTED', label: 'Converted', color: 'bg-green-100 text-green-800' },
    { value: 'LOST', label: 'Lost', color: 'bg-red-100 text-red-800' }
  ])
  
  // Dynamic options for all relevant fields
  const [gradeOptions, setGradeOptions] = useState([
    'G1 (Grade 1)', 'G2 (Grade 2)', 'G3 (Grade 3)', 'G4 (Grade 4)', 
    'G5 (Grade 5)', 'G6 (Grade 6)', 'G7 (Grade 7)', 'G8 (Grade 8)',
    'G9 (Grade 9)', 'G10 (Grade 10)', 'G11 (Grade 11)', 'G12 (Grade 12)'
  ])
  const [leadMonthOptions, setLeadMonthOptions] = useState([
    '1.Jan', '2.Feb', '3.Mar', '4.Apr', '5.May', '6.Jun',
    '7.Jul', '8.Aug', '9.Sep', '10.Oct', '11.Nov', '12.Dec'
  ])
  
  // Modal states for adding new options
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [newOptionValue, setNewOptionValue] = useState('')
  
  // Derived state for total leads
  const totalLeads = pagination?.total || 0

  // Debounced search functionality with validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Trim and validate search input
      const cleanedSearch = searchInput.trim()
      if (cleanedSearch.length > 100) {
        setError('Search term too long. Please use shorter keywords.')
        return
      }
      setSearch(cleanedSearch)
    }, 500) // 500ms delay

    return () => clearTimeout(timeoutId)
  }, [searchInput])

  // Fetch leads function
  const fetchLeads = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError('')
      
      const params = new URLSearchParams({
        page: page.toString(),
        search: search.trim(),
        status: statusFilter,
        infoSource: sourceFilter,
        gradeTarget: gradeFilter,
        sortField: sortField || 'created_at',
        sortDirection: sortDirection
      })

      // Add schoolId parameter if accessing as superadmin
      if (isSuperadminAccess && schoolIdParam) {
        params.set('schoolId', schoolIdParam)
      }

      console.log('Fetching leads with params:', Object.fromEntries(params))

      const response = await fetch(`/api/crm/leads?${params}`)
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON')
      }

      const data: LeadsResponse = await response.json()

      setLeads(data.leads)
      setPagination(data.pagination)
      setStats(data.stats)
      
    } catch (error) {
      console.error('Error fetching leads:', error)
      if (error instanceof Error) {
        setError(`Error: ${error.message}`)
      } else {
        setError('Network error: Unable to fetch leads')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, search, statusFilter, sourceFilter, gradeFilter, sortField, sortDirection, isSuperadminAccess, schoolIdParam])

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user.role !== 'SUPERADMIN' && session.user.role !== 'ADMIN') {
      router.push('/admin')
      return
    }

    // Check if admin has assigned school
    if (session.user.role === 'ADMIN' && !session.user.schoolId) {
      setError('Anda belum ditugaskan ke sekolah manapun. Hubungi Super Admin untuk penugasan sekolah.')
      setLoading(false)
      return
    }

    fetchLeads()
  }, [session, status, router, fetchLeads])

  // Highlight search terms in text
  const highlightText = (text: string | null, searchTerm: string) => {
    if (!text || !searchTerm) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    )
  }

  const handleSort = (field: string) => {
    console.log('Sorting by field:', field, 'current direction:', sortDirection)
    
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    // Apply sorting to current data immediately for better UX
    applySortToCurrentData(field, sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc')
  }

  // Apply sorting to current loaded data
  const applySortToCurrentData = (field: string, direction: 'asc' | 'desc') => {
    const sortedLeads = [...leads].sort((a, b) => {
      let aValue = getFieldValue(a, field)
      let bValue = getFieldValue(b, field)
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return direction === 'asc' ? 1 : -1
      if (bValue == null) return direction === 'asc' ? -1 : 1
      
      // Convert to string for alphabetical sorting
      aValue = String(aValue).toLowerCase()
      bValue = String(bValue).toLowerCase()
      
      if (direction === 'asc') {
        return aValue.localeCompare(bValue, 'id', { numeric: true, sensitivity: 'base' })
      } else {
        return bValue.localeCompare(aValue, 'id', { numeric: true, sensitivity: 'base' })
      }
    })
    
    setLeads(sortedLeads)
  }

  // Get field value from lead object
  const getFieldValue = (lead: Lead, field: string): string | null => {
    switch (field) {
      case 'id': return lead.id
      case 'parentName': return lead.parentName
      case 'parentPhone': return lead.parentPhone
      case 'parentEmail': return lead.parentEmail
      case 'studentName': return lead.studentName
      case 'schoolOrigin': return lead.schoolOrigin
      case 'gradeTarget': return lead.gradeTarget
      case 'enrollmentYear': return lead.enrollmentYear
      case 'infoSource': return lead.infoSource
      case 'dateContact': return lead.dateContact
      case 'leadMonth': return lead.leadMonth
      case 'status': return lead.status
      case 'notes': return lead.notes
      case 'created_at': return lead.created_at
      default: return ''
    }
  }

  const handleRowSelect = (leadId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedRows)
    if (isSelected) {
      newSelected.add(leadId)
    } else {
      newSelected.delete(leadId)
    }
    setSelectedRows(newSelected)
  }

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedRows(new Set(leads.map(lead => lead.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const getStatusDisplay = (status: string) => {
    const statusOption = leadStatusOptions.find(option => option.value === status);
    if (statusOption) {
      return { label: statusOption.label, class: statusOption.color.replace('bg-', 'status-').replace('text-', '') };
    }
    // Fallback for unknown statuses
    return { label: status, class: 'status-inquiry' };
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID')
  }

  // Column resize functions
  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(columnKey)
    setResizeStartX(e.clientX)
    setResizeStartWidth(columnWidths[columnKey])
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    
    const deltaX = e.clientX - resizeStartX
    const newWidth = Math.max(50, resizeStartWidth + deltaX) // Minimum 50px
    
    setColumnWidths(prev => ({
      ...prev,
      [isResizing]: newWidth
    }))
  }, [isResizing, resizeStartX, resizeStartWidth])

  const handleResizeEnd = useCallback(() => {
    if (isResizing) {
      setIsResizing(null)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      
      // Save to localStorage
      localStorage.setItem('leadsTableColumnWidths', JSON.stringify(columnWidths))
    }
  }, [isResizing, columnWidths])

  // Load saved column widths
  useEffect(() => {
    const savedWidths = localStorage.getItem('leadsTableColumnWidths')
    if (savedWidths) {
      try {
        setColumnWidths(JSON.parse(savedWidths))
      } catch {
        console.error('Failed to parse saved column widths')
      }
    }
  }, [])

  // Handle mouse events for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // Inline editing functions
  const handleCellClick = (leadId: string, field: string, currentValue: string | null) => {
    setEditingCell({ leadId, field })
    setEditValue(currentValue || '')
  }

  const handleCellSave = async () => {
    if (!editingCell || isCellSaving) return

    setIsCellSaving(true)
    
    console.log('Saving cell data:', {
      leadId: editingCell.leadId,
      field: editingCell.field,
      value: editValue,
      type: typeof editValue,
      valueLength: editValue ? editValue.length : 0,
      isEmpty: !editValue || editValue.trim() === ''
    })
    
    // Additional validation for empty values
    if (!editValue || editValue.trim() === '') {
      console.warn('Attempting to save empty value, cancelling update')
      setError('Cannot save empty value')
      setIsCellSaving(false)
      return
    }
    
    // Status can now accept any string value - no validation needed
    
    try {
      const requestBody = { [editingCell.field]: editValue }
      console.log('Request body:', requestBody)
      console.log('Request body JSON:', JSON.stringify(requestBody))
      
      const response = await fetch(`/api/crm/leads/${editingCell.leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const updatedLead = await response.json()
        console.log('Updated lead received:', updatedLead)
        
        // Update the lead locally without triggering full reload
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === editingCell.leadId 
              ? { ...lead, [editingCell.field]: editValue }
              : lead
          )
        )
        setEditingCell(null)
        setEditValue('')
        
        // Clear any previous errors and show success
        setError('')
        
        // Optional: Show a brief success indicator
        console.log('Cell updated successfully!')
      } else {
        let errorMessage = 'Failed to update lead'
        try {
          const data = await response.json()
          console.error('Update failed with response:', data)
          errorMessage = data.error || data.details || 'Failed to update lead'
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          console.error('Raw response:', await response.text().catch(() => 'Could not read response text'))
        }
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Error updating lead:', error)
      setError('Error updating lead: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsCellSaving(false)
    }
  }

  const handleCellCancel = () => {
    if (isCellSaving) return // Prevent cancel during save
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave()
    } else if (e.key === 'Escape') {
      handleCellCancel()
    }
  }

  const renderEditableCell = (lead: Lead, field: string, value: string | null, type: 'text' | 'select' | 'date' | 'textarea' = 'text') => {
    const isEditing = editingCell?.leadId === lead.id && editingCell?.field === field
    const isCurrentCellSaving = isCellSaving && isEditing

    if (isEditing) {
      if (type === 'select') {
        // Get options and placeholder based on field
        let options: Record<string, string>[] | string[] = []
        let placeholder = "Select option..."
        let buttonTitle = "Add new option"

        if (field === 'status') {
          options = leadStatusOptions
          placeholder = "Select status..."
          buttonTitle = "Add new status"
        } else if (field === 'infoSource') {
          options = infoSourceOptions
          placeholder = "Select source..."
          buttonTitle = "Add new source"
        } else if (field === 'gradeTarget') {
          options = gradeOptions
          placeholder = "Select grade..."
          buttonTitle = "Add new grade"
        } else if (field === 'leadMonth') {
          options = leadMonthOptions
          placeholder = "Select month..."
          buttonTitle = "Add new month"
        }

        return (
          <div className="flex gap-1 relative">
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                // Add a small delay to allow button click to register first
                setTimeout(() => {
                  // Only save if not clicking on the add button and modal is not open
                  if (!activeModal) {
                    handleCellSave()
                  }
                }, 150)
              }}
              onKeyDown={handleKeyPress}
              className={`editing-select flex-1 ${isCurrentCellSaving ? 'opacity-75' : ''}`}
              autoFocus
              disabled={isCurrentCellSaving}
            >
              <option value="">{placeholder}</option>
              {field === 'status' 
                ? (options as Array<{value: string, label: string}>).map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))
                : (options as string[]).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))
              }
            </select>
            {isCurrentCellSaving ? (
              <div className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs flex items-center justify-center min-w-[24px]">
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault() // Prevent blur on select
                  e.stopPropagation()
                  console.log('Add button clicked for field:', field)
                  openAddOptionModal(field)
                }}
                className="add-option-btn px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors flex items-center justify-center min-w-[24px]"
                title={buttonTitle}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}
          </div>
        )
      } else if (type === 'textarea') {
        return (
          <div className="relative">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleCellCancel()
                // Allow Enter for new lines in textarea, use Ctrl+Enter to save
                if (e.key === 'Enter' && e.ctrlKey) handleCellSave()
              }}
              className={`editing-input ${isCurrentCellSaving ? 'opacity-75' : ''}`}
              rows={3}
              autoFocus
              disabled={isCurrentCellSaving}
              placeholder="Press Ctrl+Enter to save, Escape to cancel"
            />
            {isCurrentCellSaving && (
              <div className="absolute top-2 right-2 bg-blue-100 text-blue-600 rounded-full p-1">
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )
      } else {
        return (
          <div className="relative">
            <input
              type={type === 'date' ? 'date' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCellSave}
              onKeyDown={handleKeyPress}
              className={`editing-input ${isCurrentCellSaving ? 'opacity-75' : ''}`}
              autoFocus
              disabled={isCurrentCellSaving}
            />
            {isCurrentCellSaving && (
              <div className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-blue-100 text-blue-600 rounded-full p-1">
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        )
      }
    }

    // Display full value without truncation with search highlighting
    const displayValue = value || '-'

    return (
      <div
        onClick={() => handleCellClick(lead.id, field, value)}
        className="editable-cell"
        title={`${displayValue} (Click to edit)`}
      >
        {field === 'status' ? (
          <span className={`status-badge ${getStatusDisplay(value || '').class}`}>
            {search ? highlightText(getStatusDisplay(value || '').label, search) : getStatusDisplay(value || '').label}
          </span>
        ) : field === 'dateContact' || field === 'nextFollowUp' ? (
          <span>{value ? formatDate(value) : '-'}</span>
        ) : field === 'notes' ? (
          <div className="w-full">
            <span className="block leading-relaxed">
              {search ? highlightText(displayValue, search) : displayValue}
            </span>
          </div>
        ) : (
          <span>{search ? highlightText(displayValue, search) : displayValue}</span>
      )}
    </div>
  )
}

const exportToCSV = () => {
    const headers = [
      'No', 'Info Source', 'Date Contact', 'Lead/Month', 'Parent Name', 'Parent Phone', 
      'Parent Email', 'Student Name', 'School Origin', 'For Grade', 'Enrollment Year', 
      'Status Customer Journey', 'Notes/Kendala/Cancel/dll.', 'Next Follow-up'
    ]
    
    const csvContent = [
      headers.join(','),
      ...leads.map((lead, index) => [
        index + 1,
        lead.infoSource || '',
        formatDate(lead.dateContact),
        lead.leadMonth || '',
        lead.parentName,
        lead.parentPhone || '',
        lead.parentEmail || '',
        lead.studentName || '',
        lead.schoolOrigin || '',
        lead.gradeTarget || '',
        lead.enrollmentYear || '',
        getStatusDisplay(lead.status).label,
        lead.notes || '',
        formatDate(lead.nextFollowUp)
      ].map(field => `"${field}"`).join(','))
    ].join('\\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Add Lead functions
  const handleAddLead = async () => {
    if (!newLead.parentName.trim()) {
      alert('Parent Name is required!')
      return
    }

    // Check if admin has assigned school
    if (session?.user.role === 'ADMIN' && !session.user.schoolId) {
      alert('Anda belum ditugaskan ke sekolah manapun. Hubungi Super Admin untuk penugasan sekolah.')
      return
    }

    setIsSubmitting(true)
    try {
      // Prepare lead data with schoolId if in superadmin mode
      const leadData = {
        ...newLead,
        ...(isSuperadminAccess && schoolIdParam && { schoolId: schoolIdParam })
      }

      const response = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData)
      })

      if (response.ok) {
        const newLeadData = await response.json()
        
        // Add the new lead to the current list optimistically; API returns the lead object directly
        setLeads(prevLeads => [newLeadData, ...prevLeads])
        
        // Update pagination count
        setPagination(prev => prev ? {
          ...prev,
          total: prev.total + 1
        } : null)
        
        // Reset form
        setNewLead({
          parentName: '',
          parentPhone: '',
          parentEmail: '',
          studentName: '',
          schoolOrigin: '',
          gradeTarget: '',
          enrollmentYear: '',
          domicile: '',
          infoSource: '',
          dateContact: '',
          leadMonth: '',
          status: 'NEW',
          customerJourney: '',
          notes: '',
          nextFollowUp: ''
        })
        setShowAddModal(false)
        
        alert('Lead added successfully!')
      } else {
        const data = await response.json()
        alert(data.message || 'Failed to add lead')
      }
    } catch (error) {
      console.error('Error adding lead:', error)
      alert('Error adding lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setNewLead(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Close modal
  const closeModal = () => {
    setActiveModal(null)
    setNewOptionValue('')
    
    // Refocus on the select element after modal closes
    setTimeout(() => {
      const selectElement = document.querySelector('.editing-select') as HTMLSelectElement
      if (selectElement) {
        selectElement.focus()
      }
    }, 100)
  }

  // Open modal for adding new option
  const openAddOptionModal = (fieldType: string) => {
    console.log('Opening add option modal for:', fieldType)
    setActiveModal(fieldType)
    setNewOptionValue('')
  }

  // Handle adding new option universally
  const handleAddOption = () => {
    if (!newOptionValue.trim() || !activeModal) return;

    console.log('Adding new option:', newOptionValue, 'for field:', activeModal)
    const newOption = newOptionValue.trim();
    
    switch (activeModal) {
      case 'infoSource':
        if (!infoSourceOptions.includes(newOption)) {
          const updatedOptions = [...infoSourceOptions, newOption].sort();
          setInfoSourceOptions(updatedOptions);
          localStorage.setItem('infoSourceOptions', JSON.stringify(updatedOptions));
          setEditValue(newOption); // Set the new option as selected value
          console.log('Added infoSource option:', newOption)
        }
        break;
      case 'status':
        // Status can now be any string - check if it already exists
        const statusExists = leadStatusOptions.some(status => status.value === newOption);
        if (!statusExists) {
          const newStatusOption = {
            value: newOption,
            label: newOption,
            color: 'bg-purple-100 text-purple-800'
          };
          const updatedOptions = [...leadStatusOptions, newStatusOption];
          setLeadStatusOptions(updatedOptions);
          localStorage.setItem('leadStatusOptions', JSON.stringify(updatedOptions));
          setEditValue(newOption);
          console.log('Added status option:', newOption)
        } else {
          // If status exists, just select it
          setEditValue(newOption);
          console.log('Status already exists, selected:', newOption);
        }
        break;
      case 'gradeTarget':
        if (!gradeOptions.includes(newOption)) {
          const updatedOptions = [...gradeOptions, newOption].sort();
          setGradeOptions(updatedOptions);
          localStorage.setItem('gradeOptions', JSON.stringify(updatedOptions));
          setEditValue(newOption); // Set the new option as selected value
          console.log('Added gradeTarget option:', newOption)
        }
        break;
      case 'leadMonth':
        if (!leadMonthOptions.includes(newOption)) {
          const updatedOptions = [...leadMonthOptions, newOption].sort();
          setLeadMonthOptions(updatedOptions);
          localStorage.setItem('leadMonthOptions', JSON.stringify(updatedOptions));
          setEditValue(newOption); // Set the new option as selected value
          console.log('Added leadMonth option:', newOption)
        }
        break;
    }
    
    // Show success feedback
    console.log(`Successfully added new ${activeModal} option: ${newOption}`)
    
    closeModal();
  };

  // Handle deleting an option directly
  const handleDeleteOption = (fieldType: string, optionToDelete: string) => {
    switch (fieldType) {
      case 'infoSource':
        const updatedInfoSource = infoSourceOptions.filter(option => option !== optionToDelete);
        setInfoSourceOptions(updatedInfoSource);
        localStorage.setItem('infoSourceOptions', JSON.stringify(updatedInfoSource));
        break;
      case 'status':
        const updatedStatus = leadStatusOptions.filter(status => status.value !== optionToDelete && status.label !== optionToDelete);
        setLeadStatusOptions(updatedStatus);
        localStorage.setItem('leadStatusOptions', JSON.stringify(updatedStatus));
        break;
      case 'gradeTarget':
        const updatedGrades = gradeOptions.filter(option => option !== optionToDelete);
        setGradeOptions(updatedGrades);
        localStorage.setItem('gradeOptions', JSON.stringify(updatedGrades));
        break;
      case 'leadMonth':
        const updatedMonths = leadMonthOptions.filter(option => option !== optionToDelete);
        setLeadMonthOptions(updatedMonths);
        localStorage.setItem('leadMonthOptions', JSON.stringify(updatedMonths));
        break;
    }
  };

  // Load saved options from localStorage
  useEffect(() => {
    const loadOptions = (key: string, setter: (options: string[]) => void) => {
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          setter(JSON.parse(saved))
        } catch {
          console.error(`Failed to parse saved ${key}`)
        }
      }
    }

    const loadStatusOptions = (key: string, setter: (options: Array<{value: string, label: string, color: string}>) => void) => {
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          setter(JSON.parse(saved))
        } catch {
          console.error(`Failed to parse saved ${key}`)
        }
      }
    }

    loadOptions('infoSourceOptions', setInfoSourceOptions)
    loadStatusOptions('leadStatusOptions', setLeadStatusOptions)
    loadOptions('gradeOptions', setGradeOptions)
    loadOptions('leadMonthOptions', setLeadMonthOptions)
  }, [])

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedRows.size === 0 || isBulkOperating) return
    
    if (!confirm(`Are you sure you want to delete ${selectedRows.size} selected leads?`)) return

    setIsBulkOperating(true)
    try {
      const promises = Array.from(selectedRows).map(leadId => 
        fetch(`/api/crm/leads/${leadId}`, { method: 'DELETE' })
      )
      
      await Promise.all(promises)
      
      // Update leads locally by removing deleted items
      setLeads(prevLeads => prevLeads.filter(lead => !selectedRows.has(lead.id)))
      
      // Update pagination count
      setPagination(prev => prev ? {
        ...prev,
        total: prev.total - selectedRows.size
      } : null)
      
      setSelectedRows(new Set())
    } catch (error) {
      console.error('Error deleting leads:', error)
      setError('Error deleting selected leads')
    } finally {
      setIsBulkOperating(false)
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedRows.size === 0 || isBulkOperating) return

    setIsBulkOperating(true)
    try {
      const promises = Array.from(selectedRows).map(leadId => 
        fetch(`/api/crm/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      )
      
      await Promise.all(promises)
      
      // Update leads locally with new status
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          selectedRows.has(lead.id) 
            ? { ...lead, status: newStatus }
            : lead
        )
      )
      
      setSelectedRows(new Set())
    } catch (error) {
      console.error('Error updating leads:', error)
      setError('Error updating selected leads')
    } finally {
      setIsBulkOperating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-slate-600">Loading leads data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 text-white shadow-xl">
        <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-14 bottom-0 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-6 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-wider">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              Lead Operations Hub
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">CRM Leads Management</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-100/90 md:text-base">
              {isSuperadminAccess && schoolIdParam
                ? 'Monitoring leads for the selected school with full visibility.'
                : 'Track, nurture, and convert prospective families through every stage of the funnel.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/crm"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to CRM
            </Link>
            <Link
              href="/admin/crm/import"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v4h4M4 4l6 6m6-6h4v4m-4-4l-6 6M4 14v6h6m10-6v6h-6" />
              </svg>
              Import CSV
            </Link>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 11l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-indigo-600 shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
              </svg>
              Add Lead
            </button>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-indigo-50" />
          <div className="relative space-y-1">
            <p className="text-sm font-medium text-slate-500">Total Leads</p>
            <p className="text-3xl font-bold text-slate-900">{totalLeads}</p>
            <p className="text-xs text-slate-400">Across all schools</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-emerald-50" />
          <div className="relative space-y-1">
            <p className="text-sm font-medium text-slate-500">New Leads</p>
            <p className="text-3xl font-bold text-emerald-600">{leads.filter(lead => lead.status === 'NEW').length}</p>
            <p className="text-xs text-slate-400">Awaiting follow-up</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-amber-50" />
          <div className="relative space-y-1">
            <p className="text-sm font-medium text-slate-500">Engaged</p>
            <p className="text-3xl font-bold text-amber-500">{leads.filter(lead => lead.status === 'KONTAK_VIA_WA').length}</p>
            <p className="text-xs text-slate-400">In active conversation</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-sky-50" />
          <div className="relative space-y-1">
            <p className="text-sm font-medium text-slate-500">Converted</p>
            <p className="text-3xl font-bold text-sky-600">{leads.filter(lead => lead.status === 'BAYAR_UP_OFFICIAL').length}</p>
            <p className="text-xs text-slate-400">Official enrolments</p>
          </div>
        </div>
      </div>



      {/* Search & Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search leads by name, contact, school, or status"
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setSearchInput('')
                    setSearch('')
                    event.currentTarget.blur()
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 px-4 py-2 pl-10 text-sm font-medium text-slate-700 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 110-14 7 7 0 010 14z" />
              </svg>
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('')
                    setSearch('')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Clear search"
                  type="button"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All Status</option>
            {leadStatusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={sourceFilter}
            onChange={event => setSourceFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All Sources</option>
            <option value="Website">Website</option>
            <option value="Social Media">Social Media</option>
            <option value="Referral">Referral</option>
            <option value="Advertisement">Advertisement</option>
          </select>
          <button
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setStatusFilter('')
              setSourceFilter('')
              setSortField('')
              setSortDirection('asc')
              setPage(1)
            }}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* School Assignment Warning for Admin */}
      {session?.user.role === 'ADMIN' && !session.user.schoolId && !error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M4.58 19h14.84c1.54 0 2.5-1.67 1.73-3L13.73 5c-.77-1.33-2.69-1.33-3.46 0L2.85 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
            <div>
              <h3 className="font-semibold text-amber-800">Penugasan sekolah diperlukan</h3>
              <p className="mt-1">
                Anda belum ditugaskan ke sekolah manapun. Untuk mengelola leads CRM, harap hubungi Super Admin untuk penugasan sekolah terlebih dahulu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modern Fresh Table Container - Full Horizontal */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-6">
        {/* Modern Toolbar */}
        <div className="modern-toolbar mb-6">
          <div className="toolbar-section">
            <div className="selection-info">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 714.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 713.138-3.138z" />
              </svg>
              <span>{selectedRows.size} Selected</span>
            </div>
            
            {/* Search Results Info */}
            {search && (
              <div className="selection-info">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>{leads.length} results for &quot;{search}&quot;</span>
                {search !== searchInput && (
                  <div className="inline-flex items-center ml-2">
                    <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            )}
            
            {/* Bulk Actions Panel */}
            {selectedRows.size > 0 && (
              <div className="bulk-actions-panel">
                <select
                  onChange={(e) => e.target.value && handleBulkStatusUpdate(e.target.value)}
                  className={`modern-select ${isBulkOperating ? 'opacity-50' : ''}`}
                  defaultValue=""
                  disabled={isBulkOperating}
                >
                  <option value="">Update Status...</option>
                  {leadStatusOptions.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={handleBulkDelete}
                  className={`btn-danger ${isBulkOperating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Delete Selected"
                  disabled={isBulkOperating}
                >
                  {isBulkOperating ? (
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  {isBulkOperating ? 'Processing...' : 'Delete'}
                </button>

                {isBulkOperating && (
                  <div className="selection-info text-blue-600">
                    <div className="w-4 h-4 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing {selectedRows.size} items...</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="toolbar-section">
            <button
              onClick={() => setShowAddModal(true)}
              disabled={session?.user.role === 'ADMIN' && !session.user.schoolId}
              className={`btn-primary ${session?.user.role === 'ADMIN' && !session.user.schoolId ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={session?.user.role === 'ADMIN' && !session.user.schoolId ? 'Anda belum ditugaskan ke sekolah manapun' : 'Add new lead'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Lead
            </button>
            
            <button
              onClick={exportToCSV}
              className="btn-success"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Data
            </button>

            <button
              onClick={() => fetchLeads(true)}
              className={`btn-secondary ${refreshing ? 'opacity-75' : ''}`}
              disabled={refreshing}
              title="Refresh data"
            >
              {refreshing ? (
                <div className="w-5 h-5 border border-current border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded-lg border">
              <span className="font-medium">{pagination?.total || 0}</span> Total Leads
              <span className="mx-2">•</span>
              Page <span className="font-medium">{page}</span> of <span className="font-medium">{pagination?.pages || 1}</span>
              {search && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-blue-600 font-medium">
                    {pagination?.total || 0} results for &quot;{search}&quot;
                  </span>
                </>
              )}
              {refreshing && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-blue-600 font-medium flex items-center gap-1">
                    <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Updating...
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modern Table Container */}
        <div className="modern-table-container">
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRows.size === leads.length && leads.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="modern-checkbox"
                    />
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('checkbox', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.number}px`, minWidth: `${columnWidths.number}px` }}
                  >
                    <button
                      onClick={() => handleSort('id')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      #
                      {sortField === 'id' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('number', e)}
                    />
                  </th>
                  <th 
                    className={`resizable-header ${sortField === 'infoSource' ? 'sorting-active' : ''}`}
                    style={{ width: `${columnWidths.infoSource}px`, minWidth: `${columnWidths.infoSource}px` }}
                  >
                    <button
                      onClick={() => handleSort('infoSource')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                      title="Click to sort alphabetically"
                    >
                      Info Source
                      {sortField === 'infoSource' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('infoSource', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.dateContact}px`, minWidth: `${columnWidths.dateContact}px` }}
                  >
                    <button
                      onClick={() => handleSort('dateContact')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Date Contact
                      {sortField === 'dateContact' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('dateContact', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.leadMonth}px`, minWidth: `${columnWidths.leadMonth}px` }}
                  >
                    <button
                      onClick={() => handleSort('leadMonth')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Lead/Month
                      {sortField === 'leadMonth' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('leadMonth', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.parentName}px`, minWidth: `${columnWidths.parentName}px` }}
                  >
                    <button
                      onClick={() => handleSort('parentName')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Parent Name
                      {sortField === 'parentName' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('parentName', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.parentPhone}px`, minWidth: `${columnWidths.parentPhone}px` }}
                  >
                    <button
                      onClick={() => handleSort('parentPhone')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Parent Phone
                      {sortField === 'parentPhone' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('parentPhone', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.parentEmail}px`, minWidth: `${columnWidths.parentEmail}px` }}
                  >
                    <button
                      onClick={() => handleSort('parentEmail')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Parent Email
                      {sortField === 'parentEmail' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('parentEmail', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.studentName}px`, minWidth: `${columnWidths.studentName}px` }}
                  >
                    <button
                      onClick={() => handleSort('studentName')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Student Name
                      {sortField === 'studentName' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('studentName', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.schoolOrigin}px`, minWidth: `${columnWidths.schoolOrigin}px` }}
                  >
                    <button
                      onClick={() => handleSort('schoolOrigin')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      School Origin
                      {sortField === 'schoolOrigin' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('schoolOrigin', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.gradeTarget}px`, minWidth: `${columnWidths.gradeTarget}px` }}
                  >
                    <button
                      onClick={() => handleSort('gradeTarget')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      For Grade
                      {sortField === 'gradeTarget' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('gradeTarget', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.enrollmentYear}px`, minWidth: `${columnWidths.enrollmentYear}px` }}
                  >
                    <button
                      onClick={() => handleSort('enrollmentYear')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Enrollment Year
                      {sortField === 'enrollmentYear' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('enrollmentYear', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.domicile}px`, minWidth: `${columnWidths.domicile}px` }}
                  >
                    <button
                      onClick={() => handleSort('domicile')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Domicile
                      {sortField === 'domicile' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('domicile', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }}
                  >
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Status
                      {sortField === 'status' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('status', e)}
                    />
                  </th>
                  <th 
                    className="resizable-header"
                    style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}
                  >
                    <button
                      onClick={() => handleSort('notes')}
                      className="flex items-center gap-2 font-semibold hover:text-blue-600"
                    >
                      Notes
                      {sortField === 'notes' && (
                        <span className="text-blue-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('notes', e)}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, index) => (
                  <tr
                    key={lead.id}
                    className={selectedRows.has(lead.id) ? 'selected' : ''}
                    onMouseEnter={() => setHoveredRow(index)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(lead.id)}
                        onChange={(e) => handleRowSelect(lead.id, e.target.checked)}
                        className="modern-checkbox"
                      />
                    </td>
                    <td style={{ width: `${columnWidths.number}px`, minWidth: `${columnWidths.number}px` }} className="font-medium text-gray-900">
                      {(page - 1) * 10 + index + 1}
                    </td>
                    <td style={{ width: `${columnWidths.infoSource}px`, minWidth: `${columnWidths.infoSource}px` }}>
                      {renderEditableCell(lead, 'infoSource', lead.infoSource, 'select')}
                    </td>
                    <td style={{ width: `${columnWidths.dateContact}px`, minWidth: `${columnWidths.dateContact}px` }}>
                      {renderEditableCell(lead, 'dateContact', lead.dateContact ? lead.dateContact.split('T')[0] : '', 'date')}
                    </td>
                    <td style={{ width: `${columnWidths.leadMonth}px`, minWidth: `${columnWidths.leadMonth}px` }}>
                      {renderEditableCell(lead, 'leadMonth', lead.leadMonth, 'select')}
                    </td>
                    <td style={{ width: `${columnWidths.parentName}px`, minWidth: `${columnWidths.parentName}px` }}>
                      {renderEditableCell(lead, 'parentName', lead.parentName)}
                    </td>
                    <td style={{ width: `${columnWidths.parentPhone}px`, minWidth: `${columnWidths.parentPhone}px` }}>
                      {renderEditableCell(lead, 'parentPhone', lead.parentPhone)}
                    </td>
                    <td style={{ width: `${columnWidths.parentEmail}px`, minWidth: `${columnWidths.parentEmail}px` }}>
                      {renderEditableCell(lead, 'parentEmail', lead.parentEmail)}
                    </td>
                    <td style={{ width: `${columnWidths.studentName}px`, minWidth: `${columnWidths.studentName}px` }}>
                      {renderEditableCell(lead, 'studentName', lead.studentName)}
                    </td>
                    <td style={{ width: `${columnWidths.schoolOrigin}px`, minWidth: `${columnWidths.schoolOrigin}px` }}>
                      {renderEditableCell(lead, 'schoolOrigin', lead.schoolOrigin, 'text')}
                    </td>
                    <td style={{ width: `${columnWidths.gradeTarget}px`, minWidth: `${columnWidths.gradeTarget}px` }}>
                      {renderEditableCell(lead, 'gradeTarget', lead.gradeTarget, 'select')}
                    </td>
                    <td style={{ width: `${columnWidths.enrollmentYear}px`, minWidth: `${columnWidths.enrollmentYear}px` }}>
                      {renderEditableCell(lead, 'enrollmentYear', lead.enrollmentYear)}
                    </td>
                    <td style={{ width: `${columnWidths.domicile}px`, minWidth: `${columnWidths.domicile}px` }}>
                      {renderEditableCell(lead, 'domicile', lead.domicile)}
                    </td>
                    <td style={{ width: `${columnWidths.status}px`, minWidth: `${columnWidths.status}px` }}>
                      {renderEditableCell(lead, 'status', lead.status, 'select')}
                    </td>
                    <td style={{ width: `${columnWidths.notes}px`, minWidth: `${columnWidths.notes}px` }}>
                      {renderEditableCell(lead, 'notes', lead.notes, 'textarea')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between bg-white px-4 py-3 border rounded-lg">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(page * 10, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Add New Lead</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Parent Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Parent Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parent Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLead.parentName}
                      onChange={(e) => handleInputChange('parentName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter parent name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parent Phone</label>
                    <input
                      type="tel"
                      value={newLead.parentPhone}
                      onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Parent Email</label>
                    <input
                      type="email"
                      value={newLead.parentEmail}
                      onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                {/* Student Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Student Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
                    <input
                      type="text"
                      value={newLead.studentName}
                      onChange={(e) => handleInputChange('studentName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter student name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">School Origin</label>
                    <input
                      type="text"
                      value={newLead.schoolOrigin}
                      onChange={(e) => handleInputChange('schoolOrigin', e.target.value)}
                      placeholder="Enter school origin..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Grade</label>
                    <div className="flex gap-2">
                      <select
                        value={newLead.gradeTarget}
                        onChange={(e) => handleInputChange('gradeTarget', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select grade...</option>
                        {gradeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openAddOptionModal('gradeTarget')}
                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors flex items-center gap-2"
                        title="Add new grade option"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Enrollment Year</label>
                    <input
                      type="text"
                      value={newLead.enrollmentYear}
                      onChange={(e) => handleInputChange('enrollmentYear', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Domicile</label>
                    <input
                      type="text"
                      value={newLead.domicile}
                      onChange={(e) => handleInputChange('domicile', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter domicile/location"
                    />
                  </div>
                </div>

                {/* Lead Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Lead Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Info Source</label>
                    <div className="flex gap-2">
                      <select
                        value={newLead.infoSource}
                        onChange={(e) => handleInputChange('infoSource', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select source...</option>
                        {infoSourceOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openAddOptionModal('infoSource')}
                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors flex items-center gap-2"
                        title="Add new info source option"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Contact</label>
                    <input
                      type="date"
                      value={newLead.dateContact}
                      onChange={(e) => handleInputChange('dateContact', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lead Month</label>
                    <div className="flex gap-2">
                      <select
                        value={newLead.leadMonth}
                        onChange={(e) => handleInputChange('leadMonth', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select lead month...</option>
                        {leadMonthOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openAddOptionModal('leadMonth')}
                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors flex items-center gap-2"
                        title="Add new lead month option"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <div className="flex gap-2">
                      <select
                        value={newLead.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {leadStatusOptions.map(status => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openAddOptionModal('status')}
                        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors flex items-center gap-2"
                        title="Add new status option"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Notes</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={newLead.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter any additional notes..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLead}
                  disabled={isSubmitting || !newLead.parentName.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Lead
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Add New Option Modal */}
      {activeModal && ['infoSource', 'status', 'gradeTarget', 'schoolOrigin', 'leadMonth'].includes(activeModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Manage {
                    activeModal === 'infoSource' ? 'Info Source' :
                    activeModal === 'status' ? 'Status' :
                    activeModal === 'gradeTarget' ? 'Target Grade' :
                    activeModal === 'schoolOrigin' ? 'School Origin' :
                    activeModal === 'leadMonth' ? 'Lead Month' : 'Option'
                  } Options
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              
              {/* Add New Option Section */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add New {
                    activeModal === 'infoSource' ? 'Info Source' :
                    activeModal === 'status' ? 'Status' :
                    activeModal === 'gradeTarget' ? 'Grade' :
                    activeModal === 'schoolOrigin' ? 'School' :
                    activeModal === 'leadMonth' ? 'Month' : 'Option'
                  }
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={
                      activeModal === 'infoSource' ? 'Enter info source name...' :
                      activeModal === 'status' ? 'Enter status name...' :
                      activeModal === 'gradeTarget' ? 'Enter grade name...' :
                      activeModal === 'schoolOrigin' ? 'Enter school name...' :
                      activeModal === 'leadMonth' ? 'Enter month format...' : 'Enter option name...'
                    }
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newOptionValue.trim()) {
                        handleAddOption()
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleAddOption}
                    disabled={!newOptionValue.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Current Options List with Delete */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Current Options ({
                    (activeModal === 'infoSource' ? infoSourceOptions :
                    activeModal === 'status' ? leadStatusOptions :
                    activeModal === 'gradeTarget' ? gradeOptions :
                    activeModal === 'leadMonth' ? leadMonthOptions : []
                    ).length
                  } items)
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                  {(
                    activeModal === 'infoSource' ? infoSourceOptions :
                    activeModal === 'status' ? leadStatusOptions :
                    activeModal === 'gradeTarget' ? gradeOptions :
                    activeModal === 'leadMonth' ? leadMonthOptions : []
                  ).length > 0 ? (
                    <div className="p-2 space-y-1">
                      {(
                        activeModal === 'infoSource' ? infoSourceOptions :
                        activeModal === 'status' ? leadStatusOptions :
                        activeModal === 'gradeTarget' ? gradeOptions :
                        activeModal === 'leadMonth' ? leadMonthOptions : []
                      ).map((option, index) => {
                        // Handle different option structures
                        const displayValue = activeModal === 'status' ? (option as {value: string, label: string}).label : option as string;
                        const deleteValue = activeModal === 'status' ? (option as {value: string, label: string}).value : option as string;
                        
                        return (
                          <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border group hover:bg-gray-50 transition-colors">
                            <span className="text-sm text-gray-700 flex-1">
                              {displayValue}
                              {activeModal === 'status' && (
                                <span className="text-xs text-gray-500 ml-2">({(option as {value: string, label: string}).value})</span>
                              )}
                            </span>
                            <button
                              onClick={() => handleDeleteOption(activeModal!, deleteValue)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 rounded transition-colors ml-2"
                              title={`Delete "${displayValue}"`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <p className="text-gray-500 text-sm">No options available yet</p>
                      <p className="text-gray-400 text-xs mt-1">Add your first option above</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
