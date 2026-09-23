import { describe, expect, it } from 'vitest'
import {
  bubbleText,
  classifyTool,
  extractBasename,
  stationRoleKey,
} from '../src/client/mission-vocabulary.ts'

describe('mission-vocabulary', () => {
  describe('classifyTool', () => {
    it('classifies explicit Tier 0 tools correctly', () => {
      expect(classifyTool('read')).toEqual({ family: 'documents', station: 'documents', tag: 'Read File' })
      expect(classifyTool('read_pdf')).toEqual({ family: 'documents', station: 'documents', tag: 'Read PDF' })
      expect(classifyTool('read_image')).toEqual({ family: 'documents', station: 'documents', tag: 'Read Image' })
      expect(classifyTool('write')).toEqual({ family: 'code', station: 'code', tag: 'Write File' })
      expect(classifyTool('edit')).toEqual({ family: 'code', station: 'code', tag: 'Edit File' })
      expect(classifyTool('str_replace_editor')).toEqual({ family: 'code', station: 'code', tag: 'Editor' })
      expect(classifyTool('bash')).toEqual({ family: 'code', station: 'code', tag: 'Bash' })
      expect(classifyTool('pwsh')).toEqual({ family: 'code', station: 'code', tag: 'PowerShell' })
      expect(classifyTool('glob')).toEqual({ family: 'knowledge', station: 'knowledge', tag: 'Glob Search' })
      expect(classifyTool('grep')).toEqual({ family: 'knowledge', station: 'knowledge', tag: 'Grep Search' })
      expect(classifyTool('web_fetch')).toEqual({ family: 'knowledge', station: 'knowledge', tag: 'Web Fetch' })
      expect(classifyTool('web_search')).toEqual({ family: 'knowledge', station: 'knowledge', tag: 'Web Search' })
      expect(classifyTool('subagent')).toEqual({ family: 'dispatch', station: 'code', tag: 'Subagent' })
      expect(classifyTool('subagent_fork')).toEqual({ family: 'dispatch', station: 'code', tag: 'Subagent Fork' })
      expect(classifyTool('workflow')).toEqual({ family: 'dispatch', station: 'code', tag: 'Workflow' })
      expect(classifyTool('todo_write')).toEqual({ family: 'documents', station: 'documents', tag: 'Todo Plan' })
      expect(classifyTool('skill')).toEqual({ family: 'knowledge', station: 'knowledge', tag: 'Skill Lookup' })
      expect(classifyTool('ask_user_question')).toEqual({ family: 'verification', station: 'verification', tag: 'User Question' })
      expect(classifyTool('lsp')).toEqual({ family: 'analysis', station: 'analysis', tag: 'LSP Analysis' })
      expect(classifyTool('job_output')).toEqual({ family: 'documents', station: 'documents', tag: 'Job Output' })
      expect(classifyTool('send_message')).toEqual({ family: 'dispatch', station: 'report', tag: 'Send Message' })
    })

    it('classifies Tier 1 verb prefixes', () => {
      expect(classifyTool('read_custom_doc').family).toBe('documents')
      expect(classifyTool('search_repo').family).toBe('knowledge')
      expect(classifyTool('analyze_ast').family).toBe('analysis')
      expect(classifyTool('run_script').family).toBe('code')
      expect(classifyTool('verify_hash').family).toBe('verification')
      expect(classifyTool('report_summary').family).toBe('report')
      expect(classifyTool('delegate_subtask').family).toBe('dispatch')
    })

    it('handles unknown and invalid tool names gracefully without throwing', () => {
      expect(classifyTool('')).toEqual({ family: 'unknown', station: 'code', tag: 'Unknown' })
      expect(classifyTool('   ')).toEqual({ family: 'unknown', station: 'code', tag: 'Unknown' })
      expect(classifyTool(null as unknown as string)).toEqual({ family: 'unknown', station: 'code', tag: 'Unknown' })
      expect(classifyTool('very_long_custom_tool_name_that_exceeds_limits')).toEqual({
        family: 'unknown',
        station: 'code',
        tag: 'very_long_custo…',
      })
    })
  })

  describe('extractBasename', () => {
    it('extracts filename from POSIX and Windows paths', () => {
      expect(extractBasename('src/client/App.tsx')).toBe('App.tsx')
      expect(extractBasename('C:\\Users\\dev\\project\\README.md')).toBe('README.md')
      expect(extractBasename('file.txt')).toBe('file.txt')
      expect(extractBasename('')).toBe('file')
    })
  })

  describe('bubbleText', () => {
    it('generates state bubbles matching contracts', () => {
      expect(bubbleText('idle')).toBe('Ready')
      expect(bubbleText('listening')).toBe('Listening to instructions…')
      expect(bubbleText('thinking')).toBe('Analyzing context…')
      expect(bubbleText('planning')).toBe('Structuring mission plan…')
      expect(bubbleText('delegating')).toBe('Planning next steps…')
      expect(bubbleText('searching')).toBe('Retrieving local evidence…')
      expect(bubbleText('working', 'read', 'src/index.ts')).toBe('Reading index.ts…')
      expect(bubbleText('working', 'grep')).toBe('Retrieving local evidence…')
      expect(bubbleText('working', 'bash')).toBe('Running Bash…')
      expect(bubbleText('working')).toBe('Executing…')
      expect(bubbleText('waiting')).toBe('Waiting on workers…')
      expect(bubbleText('verifying')).toBe('Waiting for verification…')
      expect(bubbleText('blocked', undefined, 'Permission denied')).toBe('Blocked — Permission denied')
      expect(bubbleText('blocked')).toBe('Blocked — cause unavailable')
      expect(bubbleText('completed', 'Build')).toBe('Build ready')
      expect(bubbleText('completed')).toBe('Task ready')
      expect(bubbleText('failed', 'Tests')).toBe('Tests failed')
      expect(bubbleText('failed')).toBe('Execution failed')
    })

    it('caps output length to 64 characters and handles long inputs', () => {
      const longPath = 'a'.repeat(300)
      const text = bubbleText('blocked', undefined, longPath)
      expect(text.length).toBeLessThanOrEqual(64)
      expect(text.endsWith('…')).toBe(true)
    })
  })

  describe('stationRoleKey', () => {
    it('returns specialist role keys for all stations', () => {
      expect(stationRoleKey('documents')).toBe('station.documents')
      expect(stationRoleKey('knowledge')).toBe('station.knowledge')
      expect(stationRoleKey('analysis')).toBe('station.analysis')
      expect(stationRoleKey('code')).toBe('station.code')
      expect(stationRoleKey('verification')).toBe('station.verification')
      expect(stationRoleKey('report')).toBe('station.report')
    })
  })
})
