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
  Autocomplete,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material'
import {
  Folder as FolderIcon,
  Dashboard as BoardIcon,
  Save as SaveIcon
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { AppState, Project, Board, ProjectSelection as ProjectSelectionType, ProjectSelectForm } from '../types'

interface ProjectSelectionProps {
  appState: AppState
  onProjectSelected: (selection: ProjectSelectionType) => void
}

const steps = ['Select Project', 'Choose Boards', 'Confirm Selection']

export default function ProjectSelection({ appState, onProjectSelected }: ProjectSelectionProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [projects, setProjects] = useState<Project[]>([])
  const [boards, setBoards] = useState<Board[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProjectSelectForm>({
    defaultValues: {
      projectKey: '',
      boardSelectionMode: 'single',
      selectedBoardIds: [],
      manualBoardIds: ''
    }
  })

  const watchedProjectKey = watch('projectKey')
  const watchedMode = watch('boardSelectionMode')
  const watchedBoardIds = watch('selectedBoardIds')

  useEffect(() => {
    fetchProjects()
    loadSavedSelection()
  }, [])

  useEffect(() => {
    if (watchedProjectKey) {
      fetchBoards(watchedProjectKey)
    }
  }, [watchedProjectKey])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const token = appState.config?.token
      if (!token) return

      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const projectData = await response.json()
        setProjects(projectData)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBoards = async (projectKey: string) => {
    setLoading(true)
    try {
      const token = appState.config?.token
      if (!token) return

      const response = await fetch(`/api/projects/${projectKey}/boards`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const boardData = await response.json()
        setBoards(boardData)
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedSelection = async () => {
    try {
      const response = await fetch('/api/selection')
      if (response.ok) {
        const savedSelection = await response.json()
        if (savedSelection) {
          setValue('projectKey', savedSelection.projectKey)
          setValue('selectedBoardIds', savedSelection.boardIds)
          // Auto-select project
          const project = projects.find(p => p.key === savedSelection.projectKey)
          if (project) {
            setSelectedProject(project)
          }
        }
      }
    } catch (error) {
      // No saved selection, continue
    }
  }

  const handleNext = () => {
    setActiveStep(prev => prev + 1)
  }

  const handleBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const onSubmit = async (data: ProjectSelectForm) => {
    try {
      const selection: ProjectSelectionType = {
        projectKey: data.projectKey,
        projectName: selectedProject?.name || '',
        boardIds: data.boardSelectionMode === 'manual' 
          ? data.manualBoardIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
          : data.selectedBoardIds,
        timestamp: new Date().toISOString()
      }

      // Save selection
      await fetch('/api/selection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selection)
      })

      onProjectSelected(selection)
    } catch (error) {
      console.error('Failed to save selection:', error)
    }
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Project
            </Typography>
            <Controller
              name="projectKey"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  {...field}
                  options={projects}
                  getOptionLabel={(option) => typeof option === 'string' ? option : `${option.key} - ${option.name}`}
                  loading={loading}
                  onChange={(_, value) => {
                    const projectKey = typeof value === 'string' ? value : value?.key || ''
                    field.onChange(projectKey)
                    setSelectedProject(typeof value === 'string' ? null : value || null)
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search projects..."
                      error={!!errors.projectKey}
                      helperText={errors.projectKey?.message}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              )}
            />
            
            {/* Quick Selection Buttons */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Selection:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['OCM', 'ROSA', 'HYPERSHIFT'].map((key) => (
                  <Button
                    key={key}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setValue('projectKey', key)
                      const project = projects.find(p => p.key === key)
                      if (project) setSelectedProject(project)
                    }}
                  >
                    {key}
                  </Button>
                ))}
              </Box>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!watchedProjectKey}
              >
                Next
              </Button>
            </Box>
          </Box>
        )

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Boards
            </Typography>
            
            <Controller
              name="boardSelectionMode"
              control={control}
              render={({ field }) => (
                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <FormLabel component="legend">Selection Mode</FormLabel>
                  <RadioGroup {...field} row>
                    <FormControlLabel value="single" control={<Radio />} label="Single Board" />
                    <FormControlLabel value="multiple" control={<Radio />} label="Multiple Boards" />
                    <FormControlLabel value="manual" control={<Radio />} label="Manual IDs" />
                    <FormControlLabel value="all" control={<Radio />} label="All Boards" />
                  </RadioGroup>
                </FormControl>
              )}
            />

            {watchedMode === 'manual' ? (
              <Controller
                name="manualBoardIds"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Board IDs (comma-separated)"
                    placeholder="1,2,3 or 1-5,7,9-12"
                    fullWidth
                    helperText="Enter board IDs separated by commas. Ranges are supported (e.g., 1-5)"
                  />
                )}
              />
            ) : watchedMode === 'all' ? (
              <Alert severity="info">
                All boards in this project will be selected.
              </Alert>
            ) : (
              <Box>
                {loading ? (
                  <CircularProgress />
                ) : (
                  <List>
                    {boards.map((board) => (
                      <ListItem key={board.id} dense>
                        <ListItemIcon>
                          <Controller
                            name="selectedBoardIds"
                            control={control}
                            render={({ field }) => (
                              <Checkbox
                                checked={field.value.includes(board.id)}
                                onChange={(e) => {
                                  if (watchedMode === 'single') {
                                    field.onChange(e.target.checked ? [board.id] : [])
                                  } else {
                                    const newValue = e.target.checked
                                      ? [...field.value, board.id]
                                      : field.value.filter(id => id !== board.id)
                                    field.onChange(newValue)
                                  }
                                }}
                              />
                            )}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={board.name}
                          secondary={`ID: ${board.id} • Type: ${board.type}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={watchedMode !== 'all' && watchedMode !== 'manual' && watchedBoardIds.length === 0}
              >
                Next
              </Button>
            </Box>
          </Box>
        )

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirm Selection
            </Typography>
            
            {selectedProject && (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Project: {selectedProject.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Key: {selectedProject.key}
                  </Typography>
                  {selectedProject.description && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedProject.description}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Board Selection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mode: {watchedMode}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Boards: {watchedMode === 'all' ? 'All boards' : watchedBoardIds.length}
                </Typography>
              </CardContent>
            </Card>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>
                Back
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSubmit(onSubmit)}
              >
                Save Selection
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
        Project Selection
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Choose your project and boards for report generation
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Divider sx={{ mb: 3 }} />

          {renderStepContent(activeStep)}
        </CardContent>
      </Card>
    </Box>
  )
}