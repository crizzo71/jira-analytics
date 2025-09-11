import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Toolbar,
  ButtonGroup,
  Chip,
  Alert,
  Snackbar
} from '@mui/material'
import {
  CreateNewFolder as NewFolderIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  CloudDownload as SyncIcon
} from '@mui/icons-material'
import FileBrowser from '../components/FileBrowser'
import { AppState } from '../types'

interface FileManagerProps {
  appState: AppState
  onStateUpdate: (updates: Partial<AppState>) => void
}

interface FileItem {
  id: string
  name: string
  type: 'folder' | 'file'
  size?: number
  format?: string
  createdAt: string
  path: string
  parentPath?: string
}

export default function FileManager({ appState }: FileManagerProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const handleFileSelect = (file: FileItem) => {
    if (file.type === 'file') {
      setSelectedFile(file)
      setPreviewOpen(true)
    }
  }

  const handleFileAction = async (action: string, file: FileItem) => {
    switch (action) {
      case 'preview':
        setSelectedFile(file)
        setPreviewOpen(true)
        break
      
      case 'download':
        // Simulate download
        const link = document.createElement('a')
        link.href = `http://localhost:3001${file.path}`
        link.download = file.name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setSnackbarMessage(`Downloaded: ${file.name}`)
        setSnackbarOpen(true)
        break
      
      case 'share':
        // Copy share URL to clipboard
        const shareUrl = `${window.location.origin}/files${file.path}`
        navigator.clipboard.writeText(shareUrl)
        setSnackbarMessage('Share URL copied to clipboard!')
        setSnackbarOpen(true)
        break
      
      case 'delete':
        // In a real app, you'd call an API to delete the file
        setSnackbarMessage(`Deleted: ${file.name}`)
        setSnackbarOpen(true)
        break
      
      case 'open':
        // For folders, the FileBrowser handles navigation
        break
      
      default:
        console.log('Unknown action:', action)
    }
  }

  const handleClosePreview = () => {
    setPreviewOpen(false)
    setSelectedFile(null)
  }

  const getFilePreviewContent = (file: FileItem) => {
    if (!file) return 'No file selected'

    switch (file.format) {
      case 'markdown':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Markdown Report Preview</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This is a preview of the Jira executive report in Markdown format.
              The report contains team velocity metrics, Epic progress, and strategic context.
            </Typography>
            <Box component="pre" sx={{ 
              bgcolor: 'grey.50', 
              p: 2, 
              borderRadius: 1, 
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: 'monospace'
            }}>
{`# Weekly Team Report: Aug 6 - Aug 13, 2025

**Prepared For:** Executive Leadership  
**Team:** OCM - Open Cluster Management (3 teams)  

## 1.0 Epic Progress Overview

### 1.1 Team Velocity
**Average Velocity:** 97.7 items  
**Velocity Trend:** Stable  

**Recent Performance:**
- **2025-08-13**: 86 items
- **2025-08-06**: 100 items
- **2025-07-30**: 100 items

## 1.2 Key Activities
- Epic progress tracking
- Strategic initiative alignment
- Team performance metrics
...`}
            </Box>
          </Box>
        )
      
      case 'html':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>HTML Report Preview</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This HTML report is optimized for Google Docs sharing and executive presentations.
            </Typography>
            <Alert severity="info">
              HTML reports include professional styling, charts, and are ready for executive distribution.
            </Alert>
          </Box>
        )
      
      case 'json':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>JSON Data Export</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Raw Jira data export containing issue details, velocity calculations, and metadata.
            </Typography>
            <Box component="pre" sx={{ 
              bgcolor: 'grey.50', 
              p: 2, 
              borderRadius: 1, 
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: 'monospace'
            }}>
{`{
  "exportDate": "2025-08-13T16:30:00Z",
  "project": "OCM",
  "boards": [21475, 20600, 20782],
  "issues": [
    {
      "key": "OCM-17469",
      "summary": "Feature toggle maintenance",
      "status": "Done",
      "assignee": "john.doe@redhat.com",
      "epic": "OCM-17467"
    }
    ...
  ],
  "velocity": {
    "average": 97.7,
    "periods": [86, 100, 100, 100, 100, 100]
  }
}`}
            </Box>
          </Box>
        )
      
      case 'csv':
        return (
          <Box>
            <Typography variant="h6" gutterBottom>CSV Data Export</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Tabular data export suitable for spreadsheet analysis and reporting.
            </Typography>
            <Alert severity="success">
              Perfect for importing into Excel, Google Sheets, or other data analysis tools.
            </Alert>
          </Box>
        )
      
      default:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>File Information</Typography>
            <Typography><strong>Name:</strong> {file.name}</Typography>
            <Typography><strong>Type:</strong> {file.format}</Typography>
            <Typography><strong>Size:</strong> {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown'}</Typography>
            <Typography><strong>Created:</strong> {new Date(file.createdAt).toLocaleString()}</Typography>
            <Typography><strong>Path:</strong> {file.path}</Typography>
          </Box>
        )
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          File Manager
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Browse, manage, and organize your Jira reports and data exports
        </Typography>
      </Box>

      {/* Toolbar */}
      <Toolbar disableGutters sx={{ mb: 3, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ButtonGroup variant="outlined" size="small">
            <Button startIcon={<RefreshIcon />}>
              Refresh
            </Button>
            <Button startIcon={<SyncIcon />}>
              Sync Files
            </Button>
          </ButtonGroup>
          
          <Chip 
            icon={<GridIcon />}
            label="Grid View" 
            variant={viewMode === 'grid' ? 'filled' : 'outlined'}
            onClick={() => setViewMode('grid')}
            clickable
          />
        </Box>

        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => window.location.href = '/report-generation'}
        >
          Generate New Report
        </Button>
      </Toolbar>

      {/* File Browser */}
      <FileBrowser
        onFileSelect={handleFileSelect}
        onFileAction={handleFileAction}
      />

      {/* File Preview Dialog */}
      <Dialog 
        open={previewOpen} 
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedFile?.name}
          {selectedFile?.format && (
            <Chip 
              label={selectedFile.format.toUpperCase()} 
              size="small" 
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent sx={{ minHeight: 400 }}>
          {selectedFile && getFilePreviewContent(selectedFile)}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
          {selectedFile && (
            <Button 
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => handleFileAction('download', selectedFile)}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  )
}