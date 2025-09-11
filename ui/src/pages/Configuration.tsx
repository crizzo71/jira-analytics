import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Link,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material'
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  OpenInNew as ExternalLinkIcon
} from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { JiraConfig, AuthForm } from '../types'
import { authService } from '../services/auth'

interface ConfigurationProps {
  onConfigured: (config: JiraConfig) => void
}

const schema = yup.object({
  token: yup.string().required('PAT token is required'),
  baseUrl: yup.string().url('Must be a valid URL').required('Base URL is required')
})

const steps = [
  'Generate PAT Token',
  'Configure Connection', 
  'Verify Access'
]

export default function Configuration({ onConfigured }: ConfigurationProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  
  const { control, handleSubmit, watch, formState: { errors } } = useForm<AuthForm>({
    resolver: yupResolver(schema),
    defaultValues: {
      token: '',
      baseUrl: 'https://issues.redhat.com'
    }
  })

  const watchedToken = watch('token')
  const watchedBaseUrl = watch('baseUrl')

  useEffect(() => {
    // Load existing config if available
    const loadExistingConfig = async () => {
      const config = await authService.getStoredConfig()
      if (config) {
        // Pre-fill form with existing values
        setActiveStep(2) // Skip to verification step
      }
    }
    
    loadExistingConfig()
  }, [])

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleTokenGeneration = () => {
    // Open Red Hat Jira PAT generation page
    window.open('https://issues.redhat.com/secure/ViewProfile.jspa?selectedTab=com.atlassian.pats.pats-plugin:jira-user-personal-access-tokens', '_blank')
    handleNext()
  }

  const onSubmit = async (data: AuthForm) => {
    setLoading(true)
    setValidationResult(null)

    try {
      const config = await authService.setupConfig(data.token, data.baseUrl)
      
      if (config.isValid) {
        setValidationResult({
          success: true,
          message: 'Configuration saved successfully! You can now use the Jira Status Builder.'
        })
        handleNext()
        setTimeout(() => onConfigured(config), 1500)
      } else {
        setValidationResult({
          success: false,
          message: 'Token validation failed. Please check your token and try again.'
        })
      }
    } catch (error) {
      setValidationResult({
        success: false,
        message: `Configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Generate Personal Access Token
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You need a Personal Access Token (PAT) to access Red Hat Jira. This token allows the application to authenticate and fetch your project data securely.
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              Your token will be stored securely in your browser and encrypted.
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Steps to generate your token:
              </Typography>
              <ol>
                <li>Click the button below to open Red Hat Jira</li>
                <li>Log in with your Red Hat credentials</li>
                <li>Click "Create token"</li>
                <li>Give it a name like "Jira Status Builder"</li>
                <li>Copy the generated token</li>
              </ol>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={<ExternalLinkIcon />}
              onClick={handleTokenGeneration}
              fullWidth
            >
              Open Red Hat Jira PAT Generator
            </Button>
          </Box>
        )

      case 1:
        return (
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Typography variant="h6" gutterBottom>
              Configure Connection
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Enter your Personal Access Token and Jira base URL to configure the connection.
            </Typography>

            <Controller
              name="baseUrl"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Jira Instance</InputLabel>
                  <Select
                    {...field}
                    label="Jira Instance"
                    error={!!errors.baseUrl}
                  >
                    <MenuItem value="https://issues.redhat.com">
                      Red Hat Jira (https://issues.redhat.com)
                    </MenuItem>
                    <MenuItem value="https://jira.corp.redhat.com">
                      Red Hat Corporate Jira (https://jira.corp.redhat.com)
                    </MenuItem>
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="token"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Personal Access Token"
                  type="password"
                  fullWidth
                  multiline
                  rows={3}
                  error={!!errors.token}
                  helperText={errors.token?.message || 'Paste your PAT token here'}
                  sx={{ mb: 2 }}
                />
              )}
            />

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Keep your token secure! It provides access to your Jira data.
              </Typography>
            </Alert>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={handleBack}>
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !watchedToken}
                startIcon={loading && <CircularProgress size={20} />}
                sx={{ flex: 1 }}
              >
                {loading ? 'Validating...' : 'Validate & Save'}
              </Button>
            </Box>
          </Box>
        )

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Verification Results
            </Typography>
            
            {validationResult && (
              <Alert 
                severity={validationResult.success ? "success" : "error"}
                icon={validationResult.success ? <CheckIcon /> : <ErrorIcon />}
                sx={{ mb: 2 }}
              >
                {validationResult.message}
              </Alert>
            )}

            {validationResult?.success && (
              <Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Your configuration has been saved successfully. You can now:
                </Typography>
                <Box sx={{ ml: 2 }}>
                  <Chip label="✓ Select projects and boards" color="success" variant="outlined" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="✓ Generate executive reports" color="success" variant="outlined" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="✓ Access velocity metrics" color="success" variant="outlined" sx={{ mr: 1, mb: 1 }} />
                  <Chip label="✓ Export data in multiple formats" color="success" variant="outlined" sx={{ mr: 1, mb: 1 }} />
                </Box>
              </Box>
            )}

            {validationResult && !validationResult.success && (
              <Button onClick={() => setActiveStep(1)} variant="outlined">
                Try Again
              </Button>
            )}
          </Box>
        )

      default:
        return null
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            Jira Status Builder
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" align="center" paragraph>
            Configure your connection to Red Hat Jira
          </Typography>

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