import { useState, useEffect } from 'react'
import type { ModalPhase } from '../components/ManagementModal'

interface UninstallState {
  modal: ModalPhase | null
  removeConfig: boolean
  progress: string
  error: string
}

interface BackupRestoreState {
  backupModal: ModalPhase | null
  backupMsg: string
  restoreModal: ModalPhase | null
  restoreMsg: string
}

interface ManagementActions {
  uninstall: UninstallState & {
    open: () => void
    close: () => void
    setRemoveConfig: (v: boolean) => void
    execute: () => Promise<void>
  }
  backup: BackupRestoreState & {
    execute: () => Promise<void>
    closeBackup: () => void
    openRestore: () => void
    closeRestore: () => void
    executeRestore: () => Promise<void>
  }
}

export const useManagement = (
  onStatusChange: (status: 'starting' | 'running' | 'stopped') => void
): ManagementActions => {
  const [uninstall, setUninstall] = useState<UninstallState>({
    modal: null,
    removeConfig: false,
    progress: '',
    error: ''
  })

  const [br, setBr] = useState<BackupRestoreState>({
    backupModal: null,
    backupMsg: '',
    restoreModal: null,
    restoreMsg: ''
  })

  useEffect(() => {
    const unsub = window.electronAPI.uninstall.onProgress((msg) => {
      setUninstall((prev) => ({ ...prev, progress: msg }))
    })
    return unsub
  }, [])

  const executeUninstall = async (): Promise<void> => {
    setUninstall((prev) => ({ ...prev, modal: 'progress', progress: '삭제 준비 중...' }))
    const r = await window.electronAPI.uninstall.openclaw({ removeConfig: uninstall.removeConfig })
    if (r.success) {
      setUninstall((prev) => ({ ...prev, modal: 'done', progress: '삭제가 완료되었습니다.' }))
    } else {
      setUninstall((prev) => ({
        ...prev,
        modal: 'error',
        error: r.error || '삭제 중 오류 발생'
      }))
    }
  }

  const executeBackup = async (): Promise<void> => {
    setBr((prev) => ({ ...prev, backupModal: 'progress', backupMsg: '백업 파일 생성 중...' }))
    const r = await window.electronAPI.backup.export()
    if (r.success) {
      setBr((prev) => ({ ...prev, backupModal: 'done', backupMsg: '백업이 완료되었습니다.' }))
    } else if (r.error === '취소됨') {
      setBr((prev) => ({ ...prev, backupModal: null }))
    } else {
      setBr((prev) => ({
        ...prev,
        backupModal: 'error',
        backupMsg: r.error || '백업 중 오류 발생'
      }))
    }
  }

  const executeRestore = async (): Promise<void> => {
    setBr((prev) => ({ ...prev, restoreModal: 'progress', restoreMsg: '복원 중...' }))
    const r = await window.electronAPI.backup.import()
    if (r.success) {
      setBr((prev) => ({
        ...prev,
        restoreModal: 'done',
        restoreMsg: '복원이 완료되었습니다. Gateway가 재시작됩니다.'
      }))
      onStatusChange('starting')
      const gs = await window.electronAPI.gateway.status()
      onStatusChange(gs === 'running' ? 'running' : 'stopped')
    } else if (r.error === '취소됨') {
      setBr((prev) => ({ ...prev, restoreModal: null }))
    } else {
      setBr((prev) => ({
        ...prev,
        restoreModal: 'error',
        restoreMsg: r.error || '복원 중 오류 발생'
      }))
    }
  }

  return {
    uninstall: {
      ...uninstall,
      open: () => setUninstall((prev) => ({ ...prev, modal: 'confirm', removeConfig: false })),
      close: () => setUninstall((prev) => ({ ...prev, modal: null })),
      setRemoveConfig: (v) => setUninstall((prev) => ({ ...prev, removeConfig: v })),
      execute: executeUninstall
    },
    backup: {
      ...br,
      execute: executeBackup,
      closeBackup: () => setBr((prev) => ({ ...prev, backupModal: null })),
      openRestore: () => setBr((prev) => ({ ...prev, restoreModal: 'confirm' })),
      closeRestore: () => setBr((prev) => ({ ...prev, restoreModal: null })),
      executeRestore
    }
  }
}
