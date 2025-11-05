'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import './modern-styles.css'

interface Campaign {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  startDate: string | null
  endDate: string | null
  budget: number | null
  targetAudience: string | null
  reach: number | null
  created_at: string
  school: {
    id: string
    name: string
  }
}

interface CampaignsResponse {
  campaigns: Campaign[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: {
    byStatus: Array<{ status: string; _count: { status: number } }>
    byType: Array<{ type: string; _count: { type: number } }>
  }
}

interface ImportResponse {
  success: boolean
  message: string
  details?: {
    successCount: number
    errorCount: number
    errors: string[]
  }
}

interface SchoolOption {
  id: string
  name: string
}

export default function CampaignsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get schoolId from URL params (for superadmin access)
  const schoolIdParam = searchParams.get('schoolId')
  const isSuperadminAccess = searchParams.get('superadmin') === 'true'
  
  // States
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortField, setSortField] = useState('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [, setHoveredRow] = useState<number | null>(null)
  const [editingCell, setEditingCell] = useState<{campaignId: string, field: string} | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isCellSaving, setIsCellSaving] = useState(false)
  const [isBulkOperating, setIsBulkOperating] = useState(false)
  const [pagination, setPagination] = useState<CampaignsResponse['pagination'] | null>(null)
  const [, setStats] = useState<CampaignsResponse['stats'] | null>(null)
  
  // Column resize functionality
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    checkbox: 50,
    number: 60,
    title: 180,
    description: 200,
    type: 120,
    status: 120,
    startDate: 120,
    endDate: 120,
    budget: 130,
    reach: 100,
    targetAudience: 200
  })
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState(0)
  const [resizeStartWidth, setResizeStartWidth] = useState(0)
  
  // Add Campaign Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    type: 'EMAIL',
    status: 'DRAFT',
    startDate: '',
    endDate: '',
    budget: '',
    targetAudience: '',
    reach: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Campaign Type options with ability to add new ones
  const [campaignTypeOptions, setCampaignTypeOptions] = useState([
    'EMAIL',
    'SOCIAL_MEDIA', 
    'PRINT',
    'DIGITAL',
    'EVENT'
  ])
  
  // Campaign Status options with ability to add new ones
  const [campaignStatusOptions, setCampaignStatusOptions] = useState([
    { value: 'DRAFT', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'ACTIVE', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'PAUSED', label: 'Paused', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'COMPLETED', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ])
  
  // Modal states for adding new options
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [newOptionValue, setNewOptionValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImportingCsv, setIsImportingCsv] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [importResult, setImportResult] = useState<ImportResponse | null>(null)
  const [importDetailsOpen, setImportDetailsOpen] = useState(false)
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([])
  const [isLoadingSchools, setIsLoadingSchools] = useState(false)
  const [importSchoolId, setImportSchoolId] = useState(() => schoolIdParam || '')
  
  // Header customization
  const [headerTitle, setHeaderTitle] = useState('Campaign Management')
  const [headerSubtitle, setHeaderSubtitle] = useState('')
  const [isEditingHeader, setIsEditingHeader] = useState(false)
  
  // Derived state for total campaigns
  const totalCampaigns = pagination?.total || 0

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

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' && session.user.schoolId) {
      setImportSchoolId(session.user.schoolId)
    }
  }, [session])

  useEffect(() => {
    if (isSuperadminAccess) {
      setImportSchoolId(schoolIdParam || '')
    }
  }, [isSuperadminAccess, schoolIdParam])

  useEffect(() => {
    if (session?.user?.role !== 'SUPERADMIN') {
      return
    }

    const fetchSchools = async () => {
      try {
        setIsLoadingSchools(true)
        const response = await fetch('/api/schools')
        if (!response.ok) {
          throw new Error(`Failed to fetch schools (${response.status})`)
        }
        const payload = await response.json()
        if (Array.isArray(payload?.schools)) {
          setSchoolOptions(payload.schools)
        } else {
          setSchoolOptions([])
        }
      } catch (fetchError) {
        console.error('Error fetching schools for campaign import:', fetchError)
        setSchoolOptions([])
      } finally {
        setIsLoadingSchools(false)
      }
    }

    fetchSchools()
  }, [session])

  // Update header title when school changes
  useEffect(() => {
    if (schoolIdParam && schoolOptions.length > 0) {
      const school = schoolOptions.find(s => s.id === schoolIdParam)
      if (school) {
        setHeaderTitle('Campaign Management')
        setHeaderSubtitle(`Managing campaigns for ${school.name}`)
      }
    } else {
      setHeaderTitle('Campaign Management')
      setHeaderSubtitle('')
    }
  }, [schoolIdParam, schoolOptions])

  // Fetch campaigns function
  const fetchCampaigns = useCallback(async (isRefresh = false) => {
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
        type: typeFilter,
        sortField: sortField || 'created_at',
        sortDirection: sortDirection
      })

      // Add schoolId parameter if accessing as superadmin
      if (isSuperadminAccess && schoolIdParam) {
        params.set('schoolId', schoolIdParam)
      }

      console.log('Fetching campaigns with params:', Object.fromEntries(params))

      const response = await fetch(`/api/crm/campaigns?${params}`)
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON')
      }

      const data: CampaignsResponse = await response.json()

      setCampaigns(data.campaigns)
      setPagination(data.pagination)
      setStats(data.stats)
      
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      if (error instanceof Error) {
        setError(`Error: ${error.message}`)
      } else {
        setError('Network error: Unable to fetch campaigns')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page, search, statusFilter, typeFilter, sortField, sortDirection, isSuperadminAccess, schoolIdParam])

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

    fetchCampaigns()
  }, [session, status, router, fetchCampaigns])

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
    
    const newDirection = sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'asc'
    
    if (sortField === field) {
      setSortDirection(newDirection)
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    
    // Apply sorting to current data immediately for better UX
    applySortToCurrentData(field, newDirection)
    
    // Fetch from server with new sort params
    setTimeout(() => {
      fetchCampaigns(true)
    }, 100)
  }

  // Apply sorting to current loaded data
  const applySortToCurrentData = (field: string, direction: 'asc' | 'desc') => {
    const sortedCampaigns = [...campaigns].sort((a, b) => {
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
    
    setCampaigns(sortedCampaigns)
  }

  // Get field value from campaign object
  const getFieldValue = (campaign: Campaign, field: string): string | null => {
    switch (field) {
      case 'id': return campaign.id
      case 'title': return campaign.title
      case 'description': return campaign.description
      case 'type': return campaign.type
      case 'status': return campaign.status
      case 'startDate': return campaign.startDate
      case 'endDate': return campaign.endDate
      case 'budget': return campaign.budget ? campaign.budget.toString() : null
      case 'targetAudience': return campaign.targetAudience
      case 'reach': return campaign.reach ? campaign.reach.toString() : null
      case 'created_at': return campaign.created_at
      default: return ''
    }
  }

  const handleRowSelect = (campaignId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedRows)
    if (isSelected) {
      newSelected.add(campaignId)
    } else {
      newSelected.delete(campaignId)
    }
    setSelectedRows(newSelected)
  }

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedRows(new Set(campaigns.map(campaign => campaign.id)))
    } else {
      setSelectedRows(new Set())
    }
  }

  const getStatusDisplay = (status: string) => {
    const statusOption = campaignStatusOptions.find(option => option.value === status);
    if (statusOption) {
      return { label: statusOption.label, class: statusOption.color.replace('bg-', 'status-').replace('text-', '') };
    }
    // Fallback for unknown statuses
    return { label: status, class: 'status-draft' };
  }

  const getTypeDisplay = (type: string) => {
    return { label: type.replace('_', ' '), class: `type-${type.toLowerCase().replace('_', '-')}` };
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('id-ID')
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  const formatNumber = (num: number | null) => {
    if (!num) return '-'
    return num.toLocaleString('id-ID')
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
      localStorage.setItem('campaignsTableColumnWidths', JSON.stringify(columnWidths))
    }
  }, [isResizing, columnWidths])

  // Load saved column widths
  useEffect(() => {
    const savedWidths = localStorage.getItem('campaignsTableColumnWidths')
    if (savedWidths) {
      try {
        setColumnWidths(JSON.parse(savedWidths))
      } catch {
        console.error('Failed to parse saved column widths')
      }
    }

    // Load saved header customization
    const savedTitle = localStorage.getItem('campaignsHeaderTitle')
    const savedSubtitle = localStorage.getItem('campaignsHeaderSubtitle')
    if (savedTitle) setHeaderTitle(savedTitle)
    if (savedSubtitle) setHeaderSubtitle(savedSubtitle)
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
  const handleCellClick = (campaignId: string, field: string, currentValue: string | null) => {
    setEditingCell({ campaignId, field })
    setEditValue(currentValue || '')
  }

  const handleCellSave = async () => {
    if (!editingCell || isCellSaving) return

    setIsCellSaving(true)
    
    console.log('Saving cell data:', {
      campaignId: editingCell.campaignId,
      field: editingCell.field,
      value: editValue,
      type: typeof editValue,
      valueLength: editValue ? editValue.length : 0,
      isEmpty: !editValue || editValue.trim() === ''
    })
    
    try {
      const requestBody = { [editingCell.field]: editValue }
      console.log('Request body:', requestBody)
      console.log('Request body JSON:', JSON.stringify(requestBody))
      
      const response = await fetch(`/api/crm/campaigns/${editingCell.campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const updatedCampaign = await response.json()
        console.log('Updated campaign received:', updatedCampaign)
        
        // Update the campaign locally without triggering full reload
        setCampaigns(prevCampaigns => 
          prevCampaigns.map(campaign => 
            campaign.id === editingCell.campaignId 
              ? { ...campaign, [editingCell.field]: editValue }
              : campaign
          )
        )
        setEditingCell(null)
        setEditValue('')
        
        // Clear any previous errors and show success
        setError('')
        
        // Optional: Show a brief success indicator
        console.log('Cell updated successfully!')
      } else {
        let errorMessage = 'Failed to update campaign'
        try {
          const data = await response.json()
          console.error('Update failed with response:', data)
          errorMessage = data.error || data.details || 'Failed to update campaign'
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          console.error('Raw response:', await response.text().catch(() => 'Could not read response text'))
        }
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Error updating campaign:', error)
      setError('Error updating campaign: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsCellSaving(false)
    }
  }

  // Version of handleCellSave that accepts a specific value
  const handleCellSaveWithValue = async (valueToSave: string) => {
    if (!editingCell || isCellSaving) return

    setIsCellSaving(true)
    
    console.log('Saving cell data with specific value:', {
      campaignId: editingCell.campaignId,
      field: editingCell.field,
      value: valueToSave,
      type: typeof valueToSave,
      valueLength: valueToSave ? valueToSave.length : 0,
      isEmpty: !valueToSave || valueToSave.trim() === ''
    })
    
    try {
      const requestBody = { [editingCell.field]: valueToSave }
      console.log('Request body:', requestBody)
      console.log('Request body JSON:', JSON.stringify(requestBody))
      
      const response = await fetch(`/api/crm/campaigns/${editingCell.campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.ok) {
        const updatedCampaign = await response.json()
        console.log('Updated campaign received:', updatedCampaign)
        
        // Update the campaign locally using the specific value
        setCampaigns(prevCampaigns => 
          prevCampaigns.map(campaign => 
            campaign.id === editingCell.campaignId 
              ? { ...campaign, [editingCell.field]: valueToSave }
              : campaign
          )
        )
        setEditingCell(null)
        setEditValue('')
        
        // Clear any previous errors and show success
        setError('')
        
        // Optional: Show a brief success indicator
        console.log('Cell updated successfully with value:', valueToSave)
      } else {
        let errorMessage = 'Failed to update campaign'
        try {
          const data = await response.json()
          console.error('Update failed with response:', data)
          errorMessage = data.error || data.details || 'Failed to update campaign'
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          console.error('Raw response:', await response.text().catch(() => 'Could not read response text'))
        }
        setError(errorMessage)
      }
    } catch (error) {
      console.error('Error updating campaign:', error)
      setError('Error updating campaign: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
      e.preventDefault()
      handleCellSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCellCancel()
    }
  }

  const renderEditableCell = (campaign: Campaign, field: string, value: string | null, type: 'text' | 'select' | 'date' | 'textarea' | 'number' = 'text') => {
    const isEditing = editingCell?.campaignId === campaign.id && editingCell?.field === field
    const isCurrentCellSaving = isCellSaving && isEditing

    let editElement = null
    if (isEditing) {
      if (type === 'select') {
        let options: Record<string, string>[] | string[] = []
        let placeholder = "Select option..."

        if (field === 'status') {
          options = campaignStatusOptions
          placeholder = "Select status..."
        } else if (field === 'type') {
          options = campaignTypeOptions
          placeholder = "Select type..."
        }

        editElement = (
          <div className="editing-container flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
            <select
              value={editValue}
              onChange={(e) => {
                if (e.target.value === '__ADD_NEW__') {
                  openAddOptionModal(field)
                  return
                }
                const newValue = e.target.value
                setEditValue(newValue)
                // Auto-save with the new value directly to avoid state race condition
                if (newValue) {
                  setTimeout(() => handleCellSaveWithValue(newValue), 100)
                }
              }}
              onBlur={() => {
                // Add a small delay to allow button click to register first
                setTimeout(() => {
                  // Only save if we're still editing this cell and have a value
                  if (editingCell?.campaignId === campaign.id && editingCell?.field === field && editValue) {
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
              <option value="__ADD_NEW__" style={{fontStyle: 'italic', color: '#666'}}>
                + Add new {field}...
              </option>
            </select>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openAddOptionModal(field)
              }}
              className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors flex items-center justify-center min-w-[24px]"
              title="Add new option"
              disabled={isCurrentCellSaving}
            >
              {isCurrentCellSaving ? (
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
            </button>
          </div>
        )
      } else if (type === 'textarea') {
        editElement = (
          <div className="editing-container flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                // Add a small delay to allow button click to register first
                setTimeout(() => {
                  // Only save if we're still editing this cell
                  if (editingCell?.campaignId === campaign.id && editingCell?.field === field) {
                    handleCellSave()
                  }
                }, 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  handleCellCancel()
                }
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault()
                  handleCellSave()
                }
              }}
              className="editing-textarea flex-1"
              rows={3}
              autoFocus
              placeholder="Press Ctrl+Enter to save, Esc to cancel"
            />
          </div>
        )
      } else if (type === 'date') {
        editElement = (
          <div className="editing-container flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
            <input
              type="date"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                // Add a small delay to allow button click to register first
                setTimeout(() => {
                  // Only save if we're still editing this cell
                  if (editingCell?.campaignId === campaign.id && editingCell?.field === field) {
                    handleCellSave()
                  }
                }, 150)
              }}
              onKeyDown={handleKeyPress}
              className="editing-input flex-1"
              autoFocus
              placeholder="YYYY-MM-DD"
            />
          </div>
        )
      } else if (type === 'number') {
        editElement = (
          <div className="editing-container flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                // Add a small delay to allow button click to register first
                setTimeout(() => {
                  // Only save if we're still editing this cell
                  if (editingCell?.campaignId === campaign.id && editingCell?.field === field) {
                    handleCellSave()
                  }
                }, 150)
              }}
              onKeyDown={handleKeyPress}
              className="editing-input flex-1"
              autoFocus
              placeholder="Enter number"
              step={field === 'budget' ? '1000' : '1'}
            />
          </div>
        )
      } else {
        editElement = (
          <div className="editing-container flex gap-1" onMouseDown={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => {
                // Add a small delay to allow button click to register first
                setTimeout(() => {
                  // Only save if we're still editing this cell
                  if (editingCell?.campaignId === campaign.id && editingCell?.field === field) {
                    handleCellSave()
                  }
                }, 150)
              }}
              onKeyDown={handleKeyPress}
              className="editing-input flex-1"
              autoFocus
              placeholder="Press Enter to save, Esc to cancel"
            />
          </div>
        )
      }
    }

    // Display full value without truncation with search highlighting
    const displayValue = value || '-'

    return (
      <div
        onClick={() => !isEditing && handleCellClick(campaign.id, field, value)}
        className={`editable-cell ${isEditing ? 'cell-editing' : ''}`}
        title={!isEditing ? `${displayValue} (Click to edit)` : ''}
      >
        {isEditing ? editElement : (
          field === 'status' ? (
            <span className={`status-badge ${getStatusDisplay(value || '').class}`}>
              {search ? highlightText(getStatusDisplay(value || '').label, search) : getStatusDisplay(value || '').label}
            </span>
          ) : field === 'type' ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeDisplay(value || '').class}`}>
              {search ? highlightText(getTypeDisplay(value || '').label, search) : getTypeDisplay(value || '').label}
            </span>
          ) : field === 'startDate' || field === 'endDate' ? (
            <span>{value ? formatDate(value) : '-'}</span>
          ) : field === 'budget' ? (
            <span>{formatCurrency(value ? parseFloat(value) : null)}</span>
          ) : field === 'reach' ? (
            <span>{formatNumber(value ? parseInt(value) : null)}</span>
          ) : field === 'description' ? (
            <div className="w-full">
              <span className="block leading-relaxed">
                {search ? highlightText(displayValue, search) : displayValue}
              </span>
            </div>
          ) : (
            <span>{search ? highlightText(displayValue, search) : displayValue}</span>
          )
        )}
      </div>
    )
  }

  // Modal functions for adding new options
  const openAddOptionModal = (optionType: string) => {
    setActiveModal(optionType)
    setNewOptionValue('')
  }

  const handleDeleteOption = (optionType: string, optionValue: string) => {
    if (!confirm(`Are you sure you want to delete this ${optionType}? This action cannot be undone.`)) {
      return
    }

    if (optionType === 'type') {
      const updatedTypes = campaignTypeOptions.filter(type => type !== optionValue)
      setCampaignTypeOptions(updatedTypes)
      localStorage.setItem('customCampaignTypes', JSON.stringify(updatedTypes))
      // Clear the current edit value if it was the deleted option
      if (editValue === optionValue) {
        setEditValue('')
      }
    } else if (optionType === 'status') {
      const updatedStatuses = campaignStatusOptions.filter(status => status.value !== optionValue)
      setCampaignStatusOptions(updatedStatuses)
      localStorage.setItem('customCampaignStatuses', JSON.stringify(updatedStatuses))
      // Clear the current edit value if it was the deleted option
      if (editValue === optionValue) {
        setEditValue('')
      }
    }
  }

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

  // Handle adding new option universally
  const handleAddOption = () => {
    if (!newOptionValue.trim() || !activeModal) return

    console.log('Adding new option:', newOptionValue, 'for field:', activeModal)
    const newOption = newOptionValue.trim()

    if (activeModal === 'type') {
      const newValue = newOption.toUpperCase().replace(/[^A-Z0-9]/g, '_')
      if (!campaignTypeOptions.includes(newValue)) {
        const updatedTypes = [...campaignTypeOptions, newValue]
        setCampaignTypeOptions(updatedTypes)
        localStorage.setItem('customCampaignTypes', JSON.stringify(updatedTypes))
        // Set the new value as current edit value and save it
        setEditValue(newValue)
        closeModal()
        // Auto-save the new value
        setTimeout(() => handleCellSaveWithValue(newValue), 100)
      } else {
        alert('This type already exists!')
      }
    } else if (activeModal === 'status') {
      const newValue = newOption.toUpperCase().replace(/[^A-Z0-9]/g, '_')
      const exists = campaignStatusOptions.some(status => status.value === newValue)
      if (!exists) {
        const newStatusOption = { value: newValue, label: newOption, color: 'bg-gray-100 text-gray-800' }
        const updatedStatuses = [...campaignStatusOptions, newStatusOption]
        setCampaignStatusOptions(updatedStatuses)
        localStorage.setItem('customCampaignStatuses', JSON.stringify(updatedStatuses))
        // Set the new value as current edit value and save it
        setEditValue(newValue)
        closeModal()
        // Auto-save the new value
        setTimeout(() => handleCellSaveWithValue(newValue), 100)
      } else {
        alert('This status already exists!')
      }
    }
  }

  // Load custom options from localStorage
  useEffect(() => {
    const savedTypes = localStorage.getItem('customCampaignTypes')
    if (savedTypes) {
      try {
        setCampaignTypeOptions(JSON.parse(savedTypes))
      } catch {
        console.error('Failed to parse saved campaign types')
      }
    }

    const savedStatuses = localStorage.getItem('customCampaignStatuses')
    if (savedStatuses) {
      try {
        setCampaignStatusOptions(JSON.parse(savedStatuses))
      } catch {
        console.error('Failed to parse saved campaign statuses')
      }
    }
  }, [])

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedRows.size} campaigns?`)) return

    setIsBulkOperating(true)
    try {
      const promises = Array.from(selectedRows).map(id =>
        fetch(`/api/crm/campaigns/${id}`, { method: 'DELETE' })
      )
      
      await Promise.all(promises)
      setSelectedRows(new Set())
      fetchCampaigns(true) // Refresh data
    } catch {
      setError('Failed to delete campaigns')
    } finally {
      setIsBulkOperating(false)
    }
  }

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedRows.size === 0) return

    setIsBulkOperating(true)
    try {
      const promises = Array.from(selectedRows).map(id =>
        fetch(`/api/crm/campaigns/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      )
      
      await Promise.all(promises)
      setSelectedRows(new Set())
      fetchCampaigns(true) // Refresh data
    } catch {
      setError('Failed to update campaigns')
    } finally {
      setIsBulkOperating(false)
    }
  }

  // Add new campaign
  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/crm/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      })

      if (response.ok) {
        setShowAddModal(false)
        resetNewCampaign()
        fetchCampaigns(true)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create campaign')
      }
    } catch {
      setError('Error creating campaign')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetNewCampaign = () => {
    setNewCampaign({
      title: '',
      description: '',
      type: 'EMAIL',
      status: 'DRAFT',
      startDate: '',
      endDate: '',
      budget: '',
      targetAudience: '',
      reach: ''
    })
  }

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    setImportFile(selectedFile)
    setImportResult(null)
    setImportDetailsOpen(false)
  }

  const handleSelectImportFile = () => {
    fileInputRef.current?.click()
  }

  const handleImportCampaigns = async () => {
    if (!importFile) {
      setImportResult({
        success: false,
        message: 'Please choose a CSV file before importing.'
      })
      return
    }

    if (session?.user.role === 'SUPERADMIN' && !isSuperadminAccess && !importSchoolId) {
      setImportResult({
        success: false,
        message: 'Please select a school before importing campaigns.'
      })
      return
    }

    try {
      setIsImportingCsv(true)
      setImportResult(null)
      setImportDetailsOpen(false)

      const formData = new FormData()
      formData.append('file', importFile)
      
      // Gunakan schoolId dari session untuk admin atau dari importSchoolId untuk superadmin
      const schoolIdToUse = session?.user.role === 'ADMIN' && session.user.schoolId 
        ? session.user.schoolId 
        : importSchoolId
      
      if (schoolIdToUse) {
        formData.append('schoolId', schoolIdToUse)
      }

      const response = await fetch('/api/crm/campaigns/import', {
        method: 'POST',
        body: formData
      })

      const payload = await response.json()

      if (response.ok) {
        setImportResult(payload as ImportResponse)
        setImportFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        await fetchCampaigns(true)
      } else {
        setImportResult({
          success: false,
          message: payload?.error || 'Failed to import campaigns.'
        })
      }
    } catch (err) {
      console.error('Error importing campaigns:', err)
      setImportResult({
        success: false,
        message: 'Unexpected error while importing campaigns.'
      })
    } finally {
      setIsImportingCsv(false)
    }
  }

  const handleExport = async () => {
    if (isExportingCsv) return

    try {
      setIsExportingCsv(true)

      const params = new URLSearchParams({
        search: search.trim(),
        type: typeFilter,
        status: statusFilter,
        sortField: sortField || 'created_at',
        sortDirection
      })

      if (isSuperadminAccess && schoolIdParam) {
        params.set('schoolId', schoolIdParam)
      }

      const response = await fetch(`/api/crm/campaigns/export?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `campaigns-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting campaigns:', error)
      setError('Failed to export campaigns. Please try again.')
    } finally {
      setIsExportingCsv(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 space-y-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 text-white shadow-xl">
        <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-14 bottom-0 h-56 w-56 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex flex-col gap-6 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-wider">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              Campaign Command Center
            </div>
            {isEditingHeader ? (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  className="w-full text-3xl font-bold leading-tight md:text-4xl bg-white/20 border-2 border-white/40 rounded-lg px-3 py-2 text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                  placeholder="Enter title..."
                />
                <input
                  type="text"
                  value={headerSubtitle}
                  onChange={(e) => setHeaderSubtitle(e.target.value)}
                  className="w-full text-sm md:text-base bg-white/20 border-2 border-white/40 rounded-lg px-3 py-2 text-slate-100 placeholder-white/60 focus:outline-none focus:border-white/60"
                  placeholder="Enter subtitle..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditingHeader(false)
                      localStorage.setItem('campaignsHeaderTitle', headerTitle)
                      localStorage.setItem('campaignsHeaderSubtitle', headerSubtitle)
                    }}
                    className="px-4 py-2 bg-white text-indigo-600 rounded-lg text-sm font-semibold hover:bg-white/90 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingHeader(false)
                      const savedTitle = localStorage.getItem('campaignsHeaderTitle')
                      const savedSubtitle = localStorage.getItem('campaignsHeaderSubtitle')
                      if (savedTitle) setHeaderTitle(savedTitle)
                      if (savedSubtitle) setHeaderSubtitle(savedSubtitle)
                    }}
                    className="px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-semibold hover:bg-white/30 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
                  {headerTitle}
                  {schoolIdParam && schoolOptions.length > 0 && (
                    <span className="ml-3 text-2xl font-normal text-white/80">
                      - {schoolOptions.find(s => s.id === schoolIdParam)?.name || 'Loading...'}
                    </span>
                  )}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-100/90 md:text-base">
                  {headerSubtitle || (isSuperadminAccess
                    ? 'Review and orchestrate campaign performance across schools with consistent visibility.'
                    : 'Plan, launch, and optimise marketing campaigns with clear insight into progress and impact.')}
                </p>
                <button
                  onClick={() => setIsEditingHeader(true)}
                  className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg text-xs font-medium text-white transition"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Header
                </button>
              </>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {isSuperadminAccess && (
              <Link
                href="/admin/crm/campaigns"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to All
              </Link>
            )}
            <button
              onClick={handleExport}
              disabled={isExportingCsv || !campaigns.length}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 11l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {isExportingCsv ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={session?.user.role === 'ADMIN' && !session?.user.schoolId}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-indigo-600 shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
              </svg>
              Add Campaign
            </button>
          </div>
        </div>
      </section>
      {/* CSV Import */}
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16M4 8h16M4 12h10" />
                </svg>
              </span>
              CSV Import Pipeline
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Import Campaigns from CSV</h2>
              <p className="mt-1 text-sm text-slate-500">
                Required columns: Title, Description, Type, Status, Start Date, End Date, Budget, Target Audience, Reach.
            </p>
          </div>
        </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {session?.user.role === 'SUPERADMIN' && !isSuperadminAccess && (
              <select
                className="min-w-[200px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                value={importSchoolId}
                onChange={event => setImportSchoolId(event.target.value)}
                disabled={isLoadingSchools}
              >
                <option value="">
                  {isLoadingSchools ? 'Loading schools...' : 'Select school'}
                </option>
                {schoolOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFileChange}
            />
            <button
              onClick={handleSelectImportFile}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
            >
              {importFile ? 'Change CSV' : 'Choose CSV'}
            </button>
            <button
              onClick={handleImportCampaigns}
              disabled={
                isImportingCsv ||
                !importFile ||
                (session?.user.role === 'SUPERADMIN' && !isSuperadminAccess && !importSchoolId)
              }
              className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 ${
                isImportingCsv ||
                !importFile ||
                (session?.user.role === 'SUPERADMIN' && !isSuperadminAccess && !importSchoolId)
                  ? 'cursor-not-allowed opacity-60 hover:bg-indigo-600'
                  : ''
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v4H4zm0 6h10v10H4z" />
              </svg>
              {isImportingCsv ? 'Importing...' : 'Import CSV'}
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          {session?.user.role === 'SUPERADMIN' && !isSuperadminAccess && (
            <p>
              <span className="font-semibold text-indigo-600">Tip:</span> Campaigns are saved directly to the selected school workspace.
            </p>
          )}
          {session?.user.role === 'ADMIN' && session?.user.schoolId && (
            <p>
              <span className="font-semibold text-indigo-600">Tip:</span> Campaigns will be imported directly to your school workspace.
            </p>
          )}
          {importFile && (
            <p>
              Selected file:{' '}
              <span className="font-semibold text-slate-900">
                {importFile.name} ({Math.round(importFile.size / 1024)} KB)
              </span>
            </p>
          )}
        </div>
        {importResult && (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
              importResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-xs">
                  {importResult.success ? 'OK' : '!'}
                </span>
                {importResult.message}
              </div>
              {importResult.details && (
                <button
                  onClick={() => setImportDetailsOpen(prev => !prev)}
                  className="text-xs font-semibold underline-offset-4 hover:underline"
                >
                  {importDetailsOpen ? 'Hide details' : 'View details'}
                </button>
              )}
            </div>
            {importResult.details && importDetailsOpen && (
              <div className="mt-3 space-y-2 text-xs">
                <p>
                  Imported successfully:{' '}
                  <span className="font-semibold">{importResult.details.successCount}</span>
                </p>
                <p>
                  Failed rows:{' '}
                  <span className="font-semibold">{importResult.details.errorCount}</span>
                </p>
                {importResult.details.errors.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-dashed border-current/40 bg-white/70 p-3 text-[11px] leading-relaxed">
                    {importResult.details.errors.map((errMsg, idx) => (
                      <p key={`${errMsg}-${idx}`}>{errMsg}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Admin School Assignment Warning */}
      {session?.user.role === 'ADMIN' && !session?.user.schoolId && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Campaign Management Access Limited
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Admin must be assigned to a school before managing campaigns.</p>
                <p className="mt-1">Please contact Super Admin for school assignment.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All Types</option>
            {campaignTypeOptions.map(type => (
              <option key={type} value={type}>{type.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">All Status</option>
            {campaignStatusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setTypeFilter('')
              setStatusFilter('')
              setPage(1)
            }}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-800">
                {selectedRows.size} campaign(s) selected
              </span>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkStatusUpdate(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="text-sm border rounded px-2 py-1 bg-white"
                  disabled={isBulkOperating}
                >
                  <option value="">Change Status...</option>
                  {campaignStatusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkOperating}
                  className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                >
                  {isBulkOperating ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedRows(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-indigo-50" />
          <div className="relative space-y-1">
            <p className="text-sm font-medium text-slate-500">Total Campaigns</p>
            <p className="text-3xl font-bold text-slate-900">{totalCampaigns}</p>
            <p className="text-xs text-slate-400">Active portfolio</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-emerald-50" />
          <div className="relative space-y-1">
            <p className="text-sm font-medium text-slate-500">Active</p>
            <p className="text-3xl font-bold text-emerald-600">
              {campaigns.filter(c => c.status === 'ACTIVE').length}
            </p>
            <p className="text-xs text-slate-400">Currently running</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-sky-50" />
          <div className="relative space-y-1">
            <p className="text-sm font-medium text-slate-500">Completed</p>
            <p className="text-3xl font-bold text-sky-600">
              {campaigns.filter(c => c.status === 'COMPLETED').length}
            </p>
            <p className="text-xs text-slate-400">Closed with report</p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-slate-100" />
          <div className="relative space-y-1">
            <p className="text-sm font-medium text-slate-500">Draft</p>
            <p className="text-3xl font-bold text-slate-900">
              {campaigns.filter(c => c.status === 'DRAFT').length}
            </p>
            <p className="text-xs text-slate-400">Planned or pending</p>
          </div>
        </div>
      </div>

      {/* Modern Advanced Table */}
      <div className="modern-table-container relative">
        {refreshing && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: columnWidths.checkbox }}>
                  <input
                    type="checkbox"
                    className="modern-checkbox"
                    checked={selectedRows.size === campaigns.length && campaigns.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('checkbox', e)}
                  />
                </th>
                <th style={{ width: columnWidths.number }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('id')}
                  >
                    #
                    <span className={`sort-indicator ${sortField === 'id' ? 'active' : ''}`}>
                      {sortField === 'id' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('number', e)}
                  />
                </th>
                <th style={{ width: columnWidths.title }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('title')}
                  >
                    Title
                    <span className={`sort-indicator ${sortField === 'title' ? 'active' : ''}`}>
                      {sortField === 'title' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('title', e)}
                  />
                </th>
                <th style={{ width: columnWidths.description }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('description')}
                  >
                    Description
                    <span className={`sort-indicator ${sortField === 'description' ? 'active' : ''}`}>
                      {sortField === 'description' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('description', e)}
                  />
                </th>
                <th style={{ width: columnWidths.type }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('type')}
                  >
                    Type
                    <span className={`sort-indicator ${sortField === 'type' ? 'active' : ''}`}>
                      {sortField === 'type' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('type', e)}
                  />
                </th>
                <th style={{ width: columnWidths.status }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    <span className={`sort-indicator ${sortField === 'status' ? 'active' : ''}`}>
                      {sortField === 'status' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('status', e)}
                  />
                </th>
                <th style={{ width: columnWidths.startDate }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('startDate')}
                  >
                    Start Date
                    <span className={`sort-indicator ${sortField === 'startDate' ? 'active' : ''}`}>
                      {sortField === 'startDate' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('startDate', e)}
                  />
                </th>
                <th style={{ width: columnWidths.endDate }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('endDate')}
                  >
                    End Date
                    <span className={`sort-indicator ${sortField === 'endDate' ? 'active' : ''}`}>
                      {sortField === 'endDate' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('endDate', e)}
                  />
                </th>
                <th style={{ width: columnWidths.budget }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('budget')}
                  >
                    Budget
                    <span className={`sort-indicator ${sortField === 'budget' ? 'active' : ''}`}>
                      {sortField === 'budget' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('budget', e)}
                  />
                </th>
                <th style={{ width: columnWidths.reach }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('reach')}
                  >
                    Reach
                    <span className={`sort-indicator ${sortField === 'reach' ? 'active' : ''}`}>
                      {sortField === 'reach' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('reach', e)}
                  />
                </th>
                <th style={{ width: columnWidths.targetAudience }}>
                  <div
                    className="sortable-header"
                    onClick={() => handleSort('targetAudience')}
                  >
                    Target Audience
                    <span className={`sort-indicator ${sortField === 'targetAudience' ? 'active' : ''}`}>
                      {sortField === 'targetAudience' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </div>
                  <div
                    className="resize-handle"
                    onMouseDown={(e) => handleResizeStart('targetAudience', e)}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign, index) => (
                <tr
                  key={campaign.id}
                  className={selectedRows.has(campaign.id) ? 'selected' : ''}
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td style={{ width: columnWidths.checkbox }}>
                    <input
                      type="checkbox"
                      className="modern-checkbox"
                      checked={selectedRows.has(campaign.id)}
                      onChange={(e) => handleRowSelect(campaign.id, e.target.checked)}
                    />
                  </td>
                  <td style={{ width: columnWidths.number }}>
                    {(page - 1) * 10 + index + 1}
                  </td>
                  <td style={{ width: columnWidths.title }}>
                    {renderEditableCell(campaign, 'title', campaign.title, 'text')}
                  </td>
                  <td style={{ width: columnWidths.description }}>
                    {renderEditableCell(campaign, 'description', campaign.description, 'textarea')}
                  </td>
                  <td style={{ width: columnWidths.type }}>
                    {renderEditableCell(campaign, 'type', campaign.type, 'select')}
                  </td>
                  <td style={{ width: columnWidths.status }}>
                    {renderEditableCell(campaign, 'status', campaign.status, 'select')}
                  </td>
                  <td style={{ width: columnWidths.startDate }}>
                    {renderEditableCell(campaign, 'startDate', campaign.startDate, 'date')}
                  </td>
                  <td style={{ width: columnWidths.endDate }}>
                    {renderEditableCell(campaign, 'endDate', campaign.endDate, 'date')}
                  </td>
                  <td style={{ width: columnWidths.budget }}>
                    {renderEditableCell(campaign, 'budget', campaign.budget?.toString() || null, 'number')}
                  </td>
                  <td style={{ width: columnWidths.reach }}>
                    {renderEditableCell(campaign, 'reach', campaign.reach?.toString() || null, 'number')}
                  </td>
                  <td style={{ width: columnWidths.targetAudience }}>
                    {renderEditableCell(campaign, 'targetAudience', campaign.targetAudience, 'textarea')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 bg-gray-50">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{((page - 1) * 10) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * 10, pagination.total)}</span> of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = page <= 3 ? i + 1 : 
                                  page >= pagination.pages - 2 ? pagination.pages - 4 + i :
                                  page - 2 + i
                    return pageNum > 0 && pageNum <= pagination.pages ? (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === page
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ) : null
                  })}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Campaign</h3>
              <form onSubmit={handleAddCampaign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title *</label>
                  <input
                    type="text"
                    required
                    value={newCampaign.title}
                    onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type *</label>
                    <select
                      required
                      value={newCampaign.type}
                      onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {campaignTypeOptions.map(type => (
                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={newCampaign.status}
                      onChange={(e) => setNewCampaign({ ...newCampaign, status: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {campaignStatusOptions.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Budget (IDR)</label>
                    <input
                      type="number"
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reach (Target Size)</label>
                    <input
                      type="number"
                      value={newCampaign.reach}
                      onChange={(e) => setNewCampaign({ ...newCampaign, reach: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 1000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                  <input
                    type="text"
                    value={newCampaign.targetAudience}
                    onChange={(e) => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Parents with children age 5-17"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      resetNewCampaign()
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Universal Add New Option Modal */}
      {activeModal && ['type', 'status'].includes(activeModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Manage {
                    activeModal === 'type' ? 'Campaign Type' : 'Campaign Status'
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
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add New {activeModal === 'type' ? 'Campaign Type' : 'Campaign Status'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={`Enter ${activeModal === 'type' ? 'campaign type' : 'campaign status'} name...`}
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
                    className="px-4 py-2 bg-gray-60 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Current Options List with Delete */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Current Options ({
                    (activeModal === 'type' ? campaignTypeOptions : campaignStatusOptions).length
                  } items)
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50">
                  {(activeModal === 'type' ? campaignTypeOptions : campaignStatusOptions).length > 0 ? (
                    <div className="p-2 space-y-1">
                      {(activeModal === 'type' ? campaignTypeOptions : campaignStatusOptions).map((option, index) => {
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
