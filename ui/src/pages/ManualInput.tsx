import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  Divider,
  Rating
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Event as EventIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { AppState, ManualInputData } from '../types'

interface ManualInputProps {
  appState: AppState
}

const moraleLabels = {
  1: 'Very Low',
  2: 'Low', 
  3: 'Average',
  4: 'High',
  5: 'Very High'
}

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'success' },
  { value: 'medium', label: 'Medium', color: 'warning' },
  { value: 'high', label: 'High', color: 'error' },
  { value: 'critical', label: 'Critical', color: 'error' }
]

export default function ManualInput({ appState }: ManualInputProps) {
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const { control, handleSubmit, watch, setValue, reset } = useForm<ManualInputData>({
    defaultValues: {
      teamMorale: {
        score: 3,
        explanation: ''
      },
      celebrations: [],
      milestones: [],
      blockers: [],
      forwardPriorities: []
    }
  })

  const {
    fields: milestoneFields,
    append: appendMilestone,
    remove: removeMilestone,
    update: updateMilestone
  } = useFieldArray({
    control,
    name: 'milestones'
  })

  const {
    fields: blockerFields,
    append: appendBlocker,
    remove: removeBlocker
  } = useFieldArray({
    control,
    name: 'blockers'
  })

  const {
    fields: priorityFields,
    append: appendPriority,
    remove: removePriority
  } = useFieldArray({
    control,
    name: 'forwardPriorities'
  })

  const watchedMoraleScore = watch('teamMorale.score')

  useEffect(() => {
    loadManualInput()
  }, [])

  const loadManualInput = async () => {
    try {
      const response = await fetch('/api/manual-input')
      if (response.ok) {
        const data = await response.json()
        reset(data)
      }
    } catch (error) {
      console.error('Failed to load manual input:', error)
    }
  }

  const onSubmit = async (data: ManualInputData) => {
    setLoading(true)
    setSaveStatus('saving')

    try {
      const response = await fetch('/api/manual-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Save failed:', error)
      setSaveStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCelebration = () => {
    const current = watch('celebrations')
    setValue('celebrations', [...current, ''])
  }

  const handleRemoveCelebration = (index: number) => {
    const current = watch('celebrations')
    setValue('celebrations', current.filter((_, i) => i !== index))
  }

  const handleCelebrationChange = (index: number, value: string) => {
    const current = watch('celebrations')
    const updated = [...current]
    updated[index] = value
    setValue('celebrations', updated)
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Manual Input
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          Add qualitative data to enhance your reports
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Team Morale */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Team Morale Assessment
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" gutterBottom>
                      Overall team morale level
                    </Typography>
                    <Controller
                      name="teamMorale.score"
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ px: 2 }}>
                          <Rating
                            {...field}
                            max={5}
                            size="large"
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {moraleLabels[watchedMoraleScore as keyof typeof moraleLabels]}
                          </Typography>
                        </Box>
                      )}
                    />
                  </Box>

                  <Controller
                    name="teamMorale.explanation"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Explanation (optional)"
                        multiline
                        rows={3}
                        fullWidth
                        placeholder="What factors are influencing team morale?"
                      />
                    )}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Celebrations */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Celebrations & Achievements
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={handleAddCelebration}
                      size="small"
                    >
                      Add
                    </Button>
                  </Box>

                  {watch('celebrations').map((celebration, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <TextField
                        value={celebration}
                        onChange={(e) => handleCelebrationChange(index, e.target.value)}
                        placeholder="Describe an achievement or success..."
                        fullWidth
                        multiline
                        rows={2}
                        InputProps={{
                          endAdornment: (
                            <IconButton
                              onClick={() => handleRemoveCelebration(index)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )
                        }}
                      />
                    </Box>
                  ))}

                  {watch('celebrations').length === 0 && (
                    <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No celebrations added yet. Click "Add" to include team achievements.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Milestones */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Milestones & Releases
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => appendMilestone({
                        name: '',
                        date: new Date().toISOString(),
                        status: 'upcoming',
                        description: ''
                      })}
                      size="small"
                    >
                      Add
                    </Button>
                  </Box>

                  <List>
                    {milestoneFields.map((milestone, index) => (
                      <ListItem key={milestone.id} divider>
                        <ListItemText
                          primary={milestone.name || 'Unnamed milestone'}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {milestone.description}
                              </Typography>
                              <Chip
                                label={milestone.status}
                                size="small"
                                color={milestone.status === 'completed' ? 'success' : 'warning'}
                                sx={{ mt: 1 }}
                              />
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton onClick={() => removeMilestone(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Blockers */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Blockers & Issues
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => appendBlocker({
                        title: '',
                        priority: 'medium',
                        description: '',
                        jiraIssue: ''
                      })}
                      size="small"
                    >
                      Add Blocker
                    </Button>
                  </Box>

                  <Grid container spacing={2}>
                    {blockerFields.map((blocker, index) => (
                      <Grid item xs={12} md={6} key={blocker.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Typography variant="subtitle2">
                                {blocker.title || 'New Blocker'}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => removeBlocker(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                            
                            <Chip
                              label={blocker.priority}
                              size="small"
                              color={priorityOptions.find(p => p.value === blocker.priority)?.color as any}
                              sx={{ mb: 1 }}
                            />
                            
                            <Typography variant="body2" color="text.secondary">
                              {blocker.description}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Forward Priorities */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Forward-Looking Priorities
                    </Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => appendPriority({
                        title: '',
                        order: priorityFields.length + 1,
                        jiraIssue: ''
                      })}
                      size="small"
                    >
                      Add Priority
                    </Button>
                  </Box>

                  <List>
                    {priorityFields.map((priority, index) => (
                      <ListItem key={priority.id} divider>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="primary">
                                #{priority.order}
                              </Typography>
                              <Typography variant="body1">
                                {priority.title || 'Unnamed priority'}
                              </Typography>
                            </Box>
                          }
                          secondary={priority.jiraIssue && `Jira Issue: ${priority.jiraIssue}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton onClick={() => removePriority(index)}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Save Section */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Save Manual Input
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This data will be included in your executive reports when enabled.
                  </Typography>
                </Box>
                
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                  size="large"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>

              {saveStatus === 'saved' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Manual input data saved successfully!
                </Alert>
              )}

              {saveStatus === 'error' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Failed to save manual input data. Please try again.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </LocalizationProvider>
  )
}