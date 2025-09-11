import axios from 'axios'
import { JiraConfig } from '../types'

const STORAGE_KEY = 'jira_config'

class AuthService {
  private encrypt(data: string): string {
    // Simple base64 encoding for browser storage
    // In production, use proper encryption
    return btoa(data)
  }

  private decrypt(data: string): string {
    try {
      return atob(data)
    } catch {
      return ''
    }
  }

  async validateToken(token: string, baseUrl: string = 'https://issues.redhat.com'): Promise<boolean> {
    try {
      const response = await axios.post('/api/auth/validate', {
        token,
        baseUrl
      })
      return response.data.valid
    } catch (error) {
      console.error('Token validation failed:', error)
      return false
    }
  }

  async saveConfig(config: JiraConfig): Promise<void> {
    const encryptedConfig = {
      ...config,
      token: this.encrypt(config.token)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(encryptedConfig))
  }

  async getStoredConfig(): Promise<JiraConfig | null> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const config = JSON.parse(stored)
      return {
        ...config,
        token: this.decrypt(config.token)
      }
    } catch (error) {
      console.error('Failed to retrieve stored config:', error)
      return null
    }
  }

  async clearConfig(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY)
  }

  async setupConfig(token: string, baseUrl: string = 'https://issues.redhat.com'): Promise<JiraConfig> {
    const isValid = await this.validateToken(token, baseUrl)
    const config: JiraConfig = {
      token,
      baseUrl,
      isValid
    }

    if (isValid) {
      await this.saveConfig(config)
    }

    return config
  }
}

export const authService = new AuthService()