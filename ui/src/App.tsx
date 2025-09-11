import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { AppState } from './types'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Configuration from './pages/Configuration'
import ProjectSelection from './pages/ProjectSelection'
import ReportGeneration from './pages/ReportGeneration'
import ReportManagement from './pages/ReportManagement'
import ManualInput from './pages/ManualInput'
import FileManager from './pages/FileManager'
import { authService } from './services/auth'

function App() {
  const [appState, setAppState] = useState<AppState>({
    isAuthenticated: false,
    config: null,
    selectedProject: null,
    reports: [],
    currentOperation: 'idle'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const config = await authService.getStoredConfig()
        if (config && config.isValid) {
          setAppState(prev => ({
            ...prev,
            isAuthenticated: true,
            config
          }))
        }
      } catch (error) {
        console.error('Failed to initialize app:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeApp()
  }, [])

  const updateAppState = (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }))
  }

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!appState.isAuthenticated) {
    return <Configuration onConfigured={(config) => updateAppState({ isAuthenticated: true, config })} />
  }

  return (
    <Layout appState={appState} onStateUpdate={updateAppState}>
      <Routes>
        <Route path="/" element={<Dashboard appState={appState} />} />
        <Route 
          path="/file-manager" 
          element={<FileManager appState={appState} onStateUpdate={updateAppState} />} 
        />
        <Route 
          path="/configuration" 
          element={<Configuration onConfigured={(config) => updateAppState({ config })} />} 
        />
        <Route 
          path="/project-selection" 
          element={<ProjectSelection appState={appState} onProjectSelected={(project) => updateAppState({ selectedProject: project })} />} 
        />
        <Route 
          path="/report-generation" 
          element={<ReportGeneration appState={appState} onStateUpdate={updateAppState} />} 
        />
        <Route 
          path="/reports" 
          element={<ReportManagement appState={appState} onStateUpdate={updateAppState} />} 
        />
        <Route 
          path="/manual-input" 
          element={<ManualInput appState={appState} />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App