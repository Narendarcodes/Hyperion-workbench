import { UniversalModelRouter } from '../src/router.ts'

async function main() {
  const router = new UniversalModelRouter()
  console.log('Starting HYPERION Industrial Routing Benchmark...')

  const tasks = [
    {
      name: 'Conversational Greeting',
      prompt: 'hi, are you ready to assist?',
      expectedRole: 'Free / Local Conversational Tier',
    },
    {
      name: 'Blueprint & OCR Extraction',
      prompt: 'Perform OCR on this scanned mechanical blueprint and extract the dimensional tolerance table.',
      expectedRole: 'GLM-OCR Specialist',
    },
    {
      name: 'Local Script Automation',
      prompt: 'Write a python script to read Modbus RTU temperature sensor registers over serial port and log to CSV.',
      expectedRole: 'Qwen 3.5 4B (Local Automation)',
    },
    {
      name: 'Industrial Failure Diagnosis',
      prompt: 'Diagnose the cause of harmonic vibration in the centrifugal pump based on these FFT spectrum peaks.',
      expectedRole: 'Gemma 4 / Gemini Medium (Engineering Reasoning)',
    },
    {
      name: 'Mission-Critical Engineering Calculation',
      prompt: 'Perform multi-axial fatigue stress tensor analysis and calculate safety factor for a gas turbine rotor under cyclic thermal load.',
      expectedRole: 'Gemini 3.7 Flash High (Deep Reasoning)',
    },
    {
      name: 'Engineering Deliverable Report',
      prompt: 'Draft a formal Standard Operating Procedure (SOP) deliverable for cryogenic valve pressure testing.',
      expectedRole: 'Gemma 4 / Gemini Medium (Technical Report)',
    },
  ]

  let passed = 0
  for (const t of tasks) {
    try {
      const start = Date.now()
      const decision = await router.route(t.prompt)
      const elapsed = Date.now() - start

      console.log('\n========================================')
      console.log(`Task: [${t.name}]`)
      console.log(`Prompt: '${t.prompt}'`)
      console.log(`Selected Model: ${decision.selectedModel.id} (${decision.selectedModel.name})`)
      console.log(`Provider: ${decision.selectedModel.provider} | Cost Tier: ${decision.selectedModel.costTier}`)
      console.log(`Task Requirements: Type=${decision.taskRequirements?.task_type}, Complexity=${decision.taskRequirements?.complexity}`)
      console.log(`Expected Role: ${t.expectedRole}`)
      console.log(`Latency: ${elapsed}ms`)
      passed++
    } catch (e) {
      console.error(`\nTask: ${t.name} - FAILED`)
      console.error(e)
    }
  }

  console.log('\n========================================')
  console.log(`Benchmark completed. ${passed}/${tasks.length} successful.`)
  router.shutdown()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
