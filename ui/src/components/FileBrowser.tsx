import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Grid,
  Breadcrumbs,
  Link,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  Avatar,
  ListItemIcon,
  ListItemText,
  Button,
  Alert
} from '@mui/material'
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  Article as MarkdownIcon,
  Code as HtmlIcon,
  Description as TextIcon,
  DataObject as JsonIcon,
  TableChart as CsvIcon,
  Assessment as ReportIcon
} from '@mui/icons-material'
import { format } from 'date-fns'

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

interface FileBrowserProps {
  onFileSelect?: (file: FileItem) => void
  onFileAction?: (action: string, file: FileItem) => void
}

export default function FileBrowser({ onFileSelect, onFileAction }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState('/')
  const [items, setItems] = useState<FileItem[]>([])
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadDirectory(currentPath)
  }, [currentPath])

  const loadDirectory = async (path: string) => {
    setLoading(true)
    try {
      // Simulate file system structure
      const mockData: FileItem[] = [
        // Folders
        {
          id: 'reports',
          name: 'Reports',
          type: 'folder',
          createdAt: '2025-08-13T10:00:00Z',
          path: '/reports'
        },
        {
          id: 'data',
          name: 'Data Exports',
          type: 'folder', 
          createdAt: '2025-08-13T09:00:00Z',
          path: '/data'
        },
        {
          id: 'templates',
          name: 'Templates',
          type: 'folder',
          createdAt: '2025-08-10T15:30:00Z',
          path: '/templates'
        },
        // Files based on current path
        ...(path === '/reports' ? [
          {
            id: 'report1',
            name: 'Executive Report - OCM Multi-Board - Aug 13',
            type: 'file' as const,
            format: 'markdown',
            size: 45680,
            createdAt: '2025-08-13T16:33:00Z',
            path: '/reports/executive-report-OCM-multi-3boards-2025-08-13.md'
          },
          {
            id: 'report2',
            name: 'Executive Report - OCM Multi-Board - Aug 13',
            type: 'file' as const,
            format: 'html',
            size: 67890,
            createdAt: '2025-08-13T16:33:00Z',
            path: '/reports/executive-report-OCM-multi-3boards-2025-08-13.html'
          },
          {
            id: 'report3',
            name: 'Executive Report - OCM Deployment - Aug 06',
            type: 'file' as const,
            format: 'markdown',
            size: 81336,
            createdAt: '2025-08-06T14:50:00Z',
            path: '/reports/executive-report-OCM-20600-2025-08-06.md'
          }
        ] : []),
        ...(path === '/data' ? [
          {
            id: 'data1',
            name: 'Jira Export - OCM Multi-Board - Aug 13',
            type: 'file' as const,
            format: 'json',
            size: 245680,
            createdAt: '2025-08-13T16:30:00Z',
            path: '/data/jira-export-OCM-multi-3boards-2025-08-13.json'
          },
          {
            id: 'data2',
            name: 'Issues Export - OCM Multi-Board - Aug 13',
            type: 'file' as const,
            format: 'csv',
            size: 156784,
            createdAt: '2025-08-13T16:30:00Z',
            path: '/data/jira-issues-OCM-multi-3boards-2025-08-13.csv'
          }
        ] : []),
        ...(path === '/templates' ? [
          {
            id: 'template1',
            name: 'Weekly Summary Template',
            type: 'file' as const,
            format: 'handlebars',
            size: 12340,
            createdAt: '2025-08-10T15:30:00Z',
            path: '/templates/weekly-summary.hbs'
          },
          {
            id: 'template2',
            name: 'Epic Focused Template',
            type: 'file' as const,
            format: 'handlebars',
            size: 9876,
            createdAt: '2025-08-10T15:25:00Z',
            path: '/templates/epic-focused.hbs'
          }
        ] : [])
      ]

      if (path === '/') {
        setItems(mockData.filter(item => item.type === 'folder'))
      } else {
        setItems(mockData.filter(item => item.path.startsWith(path) && item.type === 'file'))
      }
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: FileItem) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setSelectedItem(item)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedItem(null)
  }

  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path)
    } else {
      onFileSelect?.(item)
    }
  }

  const handleAction = (action: string) => {
    if (selectedItem) {
      onFileAction?.(action, selectedItem)
    }
    handleMenuClose()
  }

  const getBreadcrumbs = () => {
    const pathSegments = currentPath.split('/').filter(Boolean)
    const breadcrumbs = [
      { label: 'Home', path: '/' }
    ]

    let currentBreadcrumbPath = ''
    pathSegments.forEach(segment => {
      currentBreadcrumbPath += '/' + segment
      breadcrumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        path: currentBreadcrumbPath
      })
    })

    return breadcrumbs
  }

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') {
      return <FolderIcon sx={{ fontSize: 48, color: '#4285f4' }} />
    }

    switch (item.format) {
      case 'markdown':
        return <MarkdownIcon sx={{ fontSize: 48, color: '#0969da' }} />
      case 'html':
        return <HtmlIcon sx={{ fontSize: 48, color: '#e34c26' }} />
      case 'text':
        return <TextIcon sx={{ fontSize: 48, color: '#666' }} />
      case 'json':
        return <JsonIcon sx={{ fontSize: 48, color: '#ff6f00' }} />
      case 'csv':
        return <CsvIcon sx={{ fontSize: 48, color: '#34a853' }} />
      case 'handlebars':
        return <ReportIcon sx={{ fontSize: 48, color: '#ff5722' }} />
      default:
        return <FileIcon sx={{ fontSize: 48, color: '#757575' }} />
    }
  }

  const formatFileSize = (bytes: number = 0) => {
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
      case 'json': return 'warning'
      case 'csv': return 'success'
      case 'handlebars': return 'error'
      default: return 'default'
    }
  }

  return (
    <Box>
      {/* Breadcrumb Navigation */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
        >
          {getBreadcrumbs().map((crumb, index) => (
            index === getBreadcrumbs().length - 1 ? (
              <Typography key={crumb.path} color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                {index === 0 && <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />}
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.path}
                underline="hover"
                color="inherit"
                onClick={() => setCurrentPath(crumb.path)}
                sx={{ 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {index === 0 && <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />}
                {crumb.label}
              </Link>
            )
          ))}
        </Breadcrumbs>
      </Box>

      {/* File Grid */}
      {loading ? (
        <Typography>Loading...</Typography>
      ) : items.length === 0 ? (
        <Alert severity="info">
          This folder is empty. Generate some reports to see files here!
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={item.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  },
                  height: '100%'
                }}
                onClick={() => handleItemClick(item)}
              >
                <CardContent sx={{ textAlign: 'center', position: 'relative', p: 2 }}>
                  {/* File/Folder Icon */}
                  <Box sx={{ mb: 1 }}>
                    {getFileIcon(item)}
                  </Box>

                  {/* Item Name */}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      wordBreak: 'break-word',
                      lineHeight: 1.2,
                      minHeight: '2.4em',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {item.name}
                  </Typography>

                  {/* File Details */}
                  {item.type === 'file' && (
                    <Box sx={{ mt: 1 }}>
                      {item.format && (
                        <Chip
                          label={item.format.toUpperCase()}
                          size="small"
                          color={getFormatColor(item.format)}
                          sx={{ mb: 0.5, fontSize: '0.7rem', height: 20 }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatFileSize(item.size)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {format(new Date(item.createdAt), 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                  )}

                  {/* More Actions Button */}
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuClick(e, item)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': {
                        bgcolor: 'grey.100'
                      }
                    }}
                  >
                    <MoreIcon fontSize="small" />
                  </IconButton>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedItem?.type === 'file' && (
          [
            <MenuItem key="preview" onClick={() => handleAction('preview')}>
              <ListItemIcon>
                <PreviewIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Preview</ListItemText>
            </MenuItem>,
            <MenuItem key="download" onClick={() => handleAction('download')}>
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Download</ListItemText>
            </MenuItem>,
            <MenuItem key="share" onClick={() => handleAction('share')}>
              <ListItemIcon>
                <ShareIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Share</ListItemText>
            </MenuItem>,
            <MenuItem key="delete" onClick={() => handleAction('delete')}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          ]
        )}
        {selectedItem?.type === 'folder' && (
          <MenuItem onClick={() => handleAction('open')}>
            <ListItemIcon>
              <FolderIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Open</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  )
}