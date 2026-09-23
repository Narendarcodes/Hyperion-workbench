import { UniversalModelRouter } from '../src/router';

async function main() {
  const router = new UniversalModelRouter();
  console.log("Starting routing benchmark...");
  
  const tasks = [
    { name: "Simple QA", prompt: "What is the capital of France?" },
    { name: "Summarization", prompt: "Summarize this 10 page document: [long text omitted]" },
    { name: "Coding", prompt: "Write a python script that implements a red-black tree with insertion and deletion." },
    { name: "Debugging", prompt: "Why is my React component re-rendering infinitely? useEffect(() => setX(x + 1), [x])" },
    { name: "Mathematics", prompt: "Prove that the sum of the first n odd numbers is n squared." },
    { name: "Creative Writing", prompt: "Draft a polite but firm email to a vendor about late delivery." },
    { name: "Tool-oriented", prompt: "Search the web for the latest Laya release notes and summarize them." }
  ];

  let passed = 0;
  for (const t of tasks) {
    try {
      const start = Date.now();
      const decision = await router.route(t.prompt);
      const elapsed = Date.now() - start;
      
      console.log(`\nTask: ${t.name}`);
      console.log(`Prompt: ${t.prompt}`);
      console.log(`Selected Model: ${decision.selectedModel.id} (Provider: ${decision.selectedModel.provider})`);
      console.log(`Requirements: Type=${decision.taskRequirements?.type}, Complexity=${decision.taskRequirements?.complexity}`);
      console.log(`Latency: ${elapsed}ms`);
      passed++;
    } catch (e) {
      console.error(`\nTask: ${t.name} - FAILED`);
      console.error(e);
    }
  }

  console.log(`\nBenchmark completed. ${passed}/${tasks.length} successful.`);
  router.shutdown();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
