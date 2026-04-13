#!/usr/bin/env node
/**
 * Patches @elizaos/plugin-openai and @ai-sdk/openai for Nosana/vLLM compatibility:
 * 1. Uses chat completions API instead of Responses API
 * 2. Disables Qwen3.5 thinking mode
 * 3. Fixes "Unexpected message role" by treating Qwen as non-reasoning model
 */
const fs = require('fs');
const path = require('path');

function patchFile(filePath, patches) {
  if (!fs.existsSync(filePath)) {
    console.log(`[patch] ${filePath} not found, skipping`);
    return false;
  }
  let code = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const { name, test, find, replace } of patches) {
    if (test && code.includes(test)) { continue; }
    if (code.includes(find)) {
      code = find instanceof RegExp
        ? code.replace(find, replace)
        : code.replace(find, replace);
      changed = true;
      console.log(`[patch] ${name}`);
    }
  }
  if (changed) fs.writeFileSync(filePath, code, 'utf8');
  return changed;
}

const nm = path.join(__dirname, '..', 'node_modules');

// Patch plugin-openai
patchFile(path.join(nm, '@elizaos/plugin-openai/dist/node/index.node.js'), [
  {
    name: 'Use chat completions API',
    test: 'openai.chat(modelName)',
    find: /openai\.languageModel\(modelName\)/g,
    replace: 'openai.chat(modelName)'
  },
  {
    name: 'Disable thinking mode',
    test: 'chat_template_kwargs',
    find: 'experimental_telemetry: { isEnabled: getExperimentalTelemetry(runtime) }\n  };',
    replace: `experimental_telemetry: { isEnabled: getExperimentalTelemetry(runtime) },\n    providerOptions: { openai: { chat_template_kwargs: { enable_thinking: false } } }\n  };`
  },
  {
    name: 'Cap maxOutputTokens to 4096 for 30k context model',
    test: 'Math.min(params.maxTokens',
    find: 'maxOutputTokens: params.maxTokens ?? 8192,',
    replace: 'maxOutputTokens: Math.min(params.maxTokens ?? 4096, 4096),'
  }
]);

// Patch @ai-sdk/openai to treat Qwen as non-reasoning (uses "system" role, not "developer")
const aiSdkNeedle = '|| modelId.startsWith("gpt-5-chat"))';
const aiSdkReplace = '|| modelId.startsWith("gpt-5-chat") || modelId.startsWith("Qwen"))';
for (const ext of ['mjs', 'js']) {
  const fp = path.join(nm, `@ai-sdk/openai/dist/index.${ext}`);
  patchFile(fp, [{
    name: `Qwen non-reasoning fix (${ext})`,
    test: 'modelId.startsWith("Qwen")',
    find: aiSdkNeedle,
    replace: aiSdkReplace
  }]);
}

console.log('[patch] Done');
