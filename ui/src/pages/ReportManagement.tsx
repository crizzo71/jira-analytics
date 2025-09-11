import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import { AppState, GeneratedReport } from '../types'
import { format } from 'date-fns'

interface ReportManagementProps {
  appState: AppState
  onStateUpdate: (updates: Partial<AppState>) => void
}

export default function ReportManagement({ appState, onStateUpdate }: ReportManagementProps) {
  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const token = appState.config?.token
      if (!token) return

      const response = await fetch('/api/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const reportData = await response.json()
        setReports(reportData)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, report: GeneratedReport) => {
    setAnchorEl(event.currentTarget)
    setSelectedReport(report)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedReport(null)
  }

  const handleDownload = (report: GeneratedReport) => {
    window.open(report.url, '_blank')
    handleMenuClose()
  }

  const handleShare = (report: GeneratedReport) => {
    if (navigator.share) {
      navigator.share({
        title: `Jira Report: ${report.name}`,
        url: report.url
      })
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.origin + report.url)
      alert('Report URL copied to clipboard!')
    }
    handleMenuClose()
  }

  const handleDelete = () => {
    setDeleteDialogOpen(true)
    handleMenuClose()
  }

  const confirmDelete = async () => {
    if (!selectedReport) return

    try {
      // Note: In a real implementation, you'd call a delete API endpoint
      setReports(reports.filter(r => r.id !== selectedReport.id))
      setDeleteDialogOpen(false)
      setSelectedReport(null)
    } catch (error) {
      console.error('Failed to delete report:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'markdown': return 'primary'
      case 'html': return 'secondary'
      case 'text': return 'default'
      case 'json': return 'info'
      case 'csv': return 'success'
      default: return 'default'
    }
  }

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.format.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const paginatedReports = filteredReports.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  const renderGridView = () => (
    <Grid container spacing={3}>
      {paginatedReports.map((report) => (
        <Grid item xs={12} sm={6} md={4} key={report.id}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" component="div" sx={{ flex: 1, mr: 1 }}>
                  {report.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuClick(e, report)}
                >
                  <MoreIcon />
                </IconButton>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={report.format}
                  color={getFormatColor(report.format)}
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {formatFileSize(report.size)}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Created: {format(new Date(report.createdAt), 'MMM d, yyyy HH:mm')}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(report)}
                >
                  Download
                </Button>
                <Button
                  size="small"
                  startIcon={<ShareIcon />}
                  onClick={() => handleShare(report)}
                >
                  Share
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )

  const renderListView = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Format</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedReports.map((report) => (
            <TableRow key={report.id} hover>
              <TableCell>
                <Typography variant="body2">{report.name}</Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={report.format}
                  color={getFormatColor(report.format)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">{formatFileSize(report.size)}</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {format(new Date(report.createdAt), 'MMM d, yyyy HH:mm')}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => handleDownload(report)}
                >
                  <DownloadIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleShare(report)}
                >
                  <ShareIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuClick(e, report)}
                >
                  <MoreIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Report Management
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        View, download, and manage your generated reports
      </Typography>

      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <TextField
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="grid">
              <GridIcon />
            </ToggleButton>
            <ToggleButton value="list">
              <ListIcon />
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            onClick={() => window.location.href = '/report-generation'}
          >
            Generate New Report
          </Button>
        </Box>
      </Box>

      {/* Reports Display */}
      {loading ? (
        <Typography>Loading reports...</Typography>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" gutterBottom>
              No reports found
            </Typography>
            <Typography color="text.secondary" paragraph>
              {searchTerm ? 'Try adjusting your search terms.' : 'Generate your first report to get started.'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.location.href = '/report-generation'}
            >
              Generate First Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? renderGridView() : renderListView()}
          
          <TablePagination
            component="div"
            count={filteredReports.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
            sx={{ mt: 2 }}
          />
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedReport && handleDownload(selectedReport)}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download
        </MenuItem>
        <MenuItem onClick={() => selectedReport && handleShare(selectedReport)}>
          <ShareIcon sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Report</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedReport?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}