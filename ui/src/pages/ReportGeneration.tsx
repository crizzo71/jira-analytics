import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material'
import {
  DateRange as DateIcon,
  Assessment as ReportIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { useForm, Controller } from 'react-hook-form'
import { AppState, ReportGenerationForm, ReportFormat, ReportStatus } from '../types'
import { format, subWeeks } from 'date-fns'
import io from 'socket.io-client'

interface ReportGenerationProps {
  appState: AppState
  onStateUpdate: (updates: Partial<AppState>) => void
}

const steps = ['Configure Report', 'Generate', 'Download']

const formatOptions: { value: ReportFormat; label: string; description: string }[] = [
  { value: 'markdown', label: 'Markdown', description: 'For development teams and GitHub' },
  { value: 'html', label: 'HTML', description: 'For Google Docs and presentations' },
  { value: 'text', label: 'Plain Text', description: 'For email and basic sharing' },
  { value: 'json', label: 'JSON', description: 'For programmatic access' },
  { value: 'csv', label: 'CSV', description: 'For spreadsheet analysis' }
]

export default function ReportGeneration({ appState, onStateUpdate }: ReportGenerationProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [reportStatus, setReportStatus] = useState<ReportStatus | null>(null)
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([])
  const [socket, setSocket] = useState<any>(null)
  
  const { control, handleSubmit, watch, formState: { errors } } = useForm<ReportGenerationForm>({
    defaultValues: {
      dateRange: {
        start: subWeeks(new Date(), 4),
        end: new Date()
      },
      velocityPeriods: 6,
      formats: ['markdown'],
      includeManualInput: false
    }
  })

  const watchedFormats = watch('formats')

  useEffect(() => {
    // Initialize WebSocket connection
    const socketConnection = io('http://localhost:3001')
    setSocket(socketConnection)

    socketConnection.on('report:progress', (data) => {
      setReportStatus(prev => ({
        ...prev!,
        progress: data.percentage,
        currentOperation: data.message
      }))
    })

    socketConnection.on('report:complete', (data) => {
      setReportStatus(prev => ({
        ...prev!,
        status: 'completed',
        progress: 100
      }))
      setGeneratedFiles(data.files)
      setActiveStep(2)
    })

    socketConnection.on('report:error', (data) => {
      setReportStatus(prev => ({
        ...prev!,
        status: 'failed',
        error: data.error
      }))
    })

    return () => {
      socketConnection.disconnect()
    }
  }, [])

  const onSubmit = async (data: ReportGenerationForm) => {
    if (!appState.selectedProject) {
      alert('Please select a project first')
      return
    }

    try {
      onStateUpdate({ currentOperation: 'generating' })
      
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appState.config?.token}`
        },
        body: JSON.stringify({
          projectKey: appState.selectedProject.projectKey,
          boardIds: appState.selectedProject.boardIds,
          dateRange: {
            start: format(data.dateRange.start, 'yyyy-MM-dd'),
            end: format(data.dateRange.end, 'yyyy-MM-dd')
          },
          velocityPeriods: data.velocityPeriods,
          formats: data.formats,
          includeManualInput: data.includeManualInput
        })
      })

      if (response.ok) {
        const result = await response.json()
        setReportStatus({
          id: result.reportId,
          status: 'processing',
          progress: 0
        })
        setActiveStep(1)
      } else {
        throw new Error('Failed to start report generation')
      }
    } catch (error) {
      console.error('Report generation failed:', error)
      onStateUpdate({ currentOperation: 'error' })
    }
  }

  const handleNext = () => {
    setActiveStep(prev => prev + 1)
  }

  const handleBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Typography variant="h6" gutterBottom>
                Configure Report Parameters
              </Typography>

              {/* Project Info */}
              {appState.selectedProject ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Project:</strong> {appState.selectedProject.projectName} ({appState.selectedProject.projectKey})
                    <br />
                    <strong>Boards:</strong> {appState.selectedProject.boardIds.length} selected
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  No project selected. Please select a project first.
                </Alert>
              )}

              {/* Date Range */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Date Range
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Controller
                    name="dateRange.start"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="Start Date"
                        value={field.value}
                        onChange={field.onChange}
                        renderInput={(params) => <TextField {...params} />}
                      />
                    )}
                  />
                  <Controller
                    name="dateRange.end"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="End Date"
                        value={field.value}
                        onChange={field.onChange}
                        renderInput={(params) => <TextField {...params} />}
                      />
                    )}
                  />
                </Box>
              </Box>

              {/* Velocity Periods */}
              <Box sx={{ mb: 3 }}>
                <Controller
                  name="velocityPeriods"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Velocity Calculation Periods"
                      type="number"
                      inputProps={{ min: 1, max: 12 }}
                      helperText="Number of periods to calculate average velocity (default: 6)"
                      sx={{ width: 200 }}
                    />
                  )}
                />
              </Box>

              {/* Output Formats */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Output Formats
                </Typography>
                <Controller
                  name="formats"
                  control={control}
                  render={({ field }) => (
                    <FormControl component="fieldset">
                      <FormGroup>
                        {formatOptions.map((option) => (
                          <FormControlLabel
                            key={option.value}
                            control={
                              <Checkbox
                                checked={field.value.includes(option.value)}
                                onChange={(e) => {
                                  const newValue = e.target.checked
                                    ? [...field.value, option.value]
                                    : field.value.filter(f => f !== option.value)
                                  field.onChange(newValue)
                                }}
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2">{option.label}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {option.description}
                                </Typography>
                              </Box>
                            }
                          />
                        ))}
                      </FormGroup>
                    </FormControl>
                  )}
                />
              </Box>

              {/* Manual Input */}
              <Box sx={{ mb: 3 }}>
                <Controller
                  name="includeManualInput"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox {...field} />}
                      label="Include manual input data (team morale, celebrations, etc.)"
                    />
                  )}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<ReportIcon />}
                  disabled={!appState.selectedProject || watchedFormats.length === 0}
                >
                  Generate Report
                </Button>
              </Box>
            </Box>
          </LocalizationProvider>
        )

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Generating Report
            </Typography>
            
            {reportStatus && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {reportStatus.currentOperation || 'Processing...'}
                  </Typography>
                  <Typography variant="body2">
                    {reportStatus.progress}%
                  </Typography>
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={reportStatus.progress} 
                  sx={{ mb: 2 }}
                />

                {reportStatus.status === 'failed' && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    Report generation failed: {reportStatus.error}
                    <Button
                      onClick={() => setActiveStep(0)}
                      sx={{ ml: 2 }}
                    >
                      Try Again
                    </Button>
                  </Alert>
                )}

                {reportStatus.estimatedTimeRemaining && (
                  <Typography variant="body2" color="text.secondary">
                    Estimated time remaining: {reportStatus.estimatedTimeRemaining}s
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Report Generated Successfully!
            </Typography>
            
            <Alert severity="success" sx={{ mb: 3 }}>
              Your report has been generated in {generatedFiles.length} format(s).
            </Alert>

            <List>
              {generatedFiles.map((file, index) => (
                <ListItem key={index} divider>
                  <ListItemIcon>
                    <CheckIcon color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {file.fileName}
                        </Typography>
                        <Chip
                          label={file.format}
                          size="small"
                          color="primary"
                        />
                      </Box>
                    }
                    secondary={`Ready for download`}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    Download
                  </Button>
                </ListItem>
              ))}
            </List>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                onClick={() => {
                  setActiveStep(0)
                  setReportStatus(null)
                  setGeneratedFiles([])
                }}
              >
                Generate Another
              </Button>
              <Button
                variant="contained"
                onClick={() => window.location.href = '/reports'}
              >
                View All Reports
              </Button>
            </Box>
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Generate Report
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Create executive reports from your Jira data
      </Typography>

      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent(activeStep)}
        </CardContent>
      </Card>
    </Box>
  )
}