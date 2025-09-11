import React, { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material'
import {
  Assessment as ReportIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  Speed as SpeedIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { AppState, GeneratedReport } from '../types'
import { format } from 'date-fns'

interface DashboardProps {
  appState: AppState
}

export default function Dashboard({ appState }: DashboardProps) {
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRecentReports()
  }, [])

  const fetchRecentReports = async () => {
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
        const reports = await response.json()
        setRecentReports(reports.slice(0, 5)) // Show latest 5 reports
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
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
      default: return 'default'
    }
  }

  const quickActions = [
    {
      title: 'Generate New Report',
      description: 'Create a new executive report',
      icon: <ReportIcon />,
      action: () => navigate('/report-generation'),
      color: 'primary' as const
    },
    {
      title: 'Select Project',
      description: 'Choose project and boards',
      icon: <FolderIcon />,
      action: () => navigate('/project-selection'),
      color: 'secondary' as const
    },
    {
      title: 'Manual Input',
      description: 'Add qualitative data',
      icon: <AddIcon />,
      action: () => navigate('/manual-input'),
      color: 'success' as const
    }
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Welcome to your Jira Status Builder dashboard
      </Typography>

      {/* Status Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <ReportIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {recentReports.length}
                  </Typography>
                  <Typography color="text.secondary">
                    Total Reports
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <FolderIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {appState.selectedProject ? '1' : '0'}
                  </Typography>
                  <Typography color="text.secondary">
                    Active Project
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <SpeedIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {appState.selectedProject?.boardIds?.length || 0}
                  </Typography>
                  <Typography color="text.secondary">
                    Selected Boards
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <ScheduleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4">
                    {recentReports.length > 0 ? format(new Date(recentReports[0].createdAt), 'MMM d') : 'N/A'}
                  </Typography>
                  <Typography color="text.secondary">
                    Last Report
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} key={index}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          boxShadow: 2,
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={action.action}
                    >
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: `${action.color}.main`, mr: 2 }}>
                            {action.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1">
                              {action.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {action.description}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Reports */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Recent Reports
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/reports')}
                >
                  View All
                </Button>
              </Box>
              
              {recentReports.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    No reports generated yet
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/report-generation')}
                    sx={{ mt: 2 }}
                  >
                    Generate First Report
                  </Button>
                </Box>
              ) : (
                <List>
                  {recentReports.map((report, index) => (
                    <ListItem
                      key={report.id}
                      divider={index < recentReports.length - 1}
                      secondaryAction={
                        <Box>
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={() => window.open(report.url, '_blank')}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        <ReportIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">
                              {report.name}
                            </Typography>
                            <Chip
                              label={report.format}
                              size="small"
                              color={getFormatColor(report.format)}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption">
                              {format(new Date(report.createdAt), 'MMM d, yyyy HH:mm')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(report.size)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Current Project Info */}
      {appState.selectedProject && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Current Project Selection
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={appState.selectedProject.projectKey}
                color="primary"
              />
              <Typography variant="body1">
                {appState.selectedProject.projectName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • {appState.selectedProject.boardIds.length} board(s) selected
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Updated {format(new Date(appState.selectedProject.timestamp), 'MMM d, yyyy')}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}