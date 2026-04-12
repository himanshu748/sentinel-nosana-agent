import { createNosanaClient } from '@nosana/kit';

const apiKey = process.env.NOSANA_API_KEY;
if (!apiKey) {
  console.error('Error: NOSANA_API_KEY environment variable is required');
  process.exit(1);
}

const client = createNosanaClient('mainnet', {
  api: { apiKey },
});

async function deploy() {
  try {
    console.log('Creating Sentinel deployment on Nosana...');
    const deployment = await client.api.deployments.create({
      name: 'sentinel-agent',
      market: '97G9NnvBDQ2WpKu6BGBEsFRF5MnujBBi9cSVPMnMFcEX',
      timeout: 120,
      replicas: 1,
      strategy: 'SIMPLE',
      job_definition: {
        version: '0.1',
        type: 'container',
        meta: { trigger: 'api' },
        ops: [
          {
            id: 'sentinel-agent',
            type: 'container/run',
            args: {
              image: 'ghcr.io/himanshu748/sentinel-nosana-agent:latest',
              expose: 3000,
              env: {
                OPENAI_API_KEY: 'nosana',
                OPENAI_API_URL: 'https://6vq2bcqphcansrs9b88ztxfs88oqy7etah2ugudytv2x.node.k8s.prd.nos.ci/v1',
                MODEL_NAME: 'Qwen3.5-27B-AWQ-4bit',
                OPENAI_EMBEDDING_URL: 'https://4yiccatpyxx773jtewo5ccwhw1s2hezq5pehndb6fcfq.node.k8s.prd.nos.ci/v1',
                OPENAI_EMBEDDING_API_KEY: 'nosana',
                OPENAI_EMBEDDING_MODEL: 'Qwen3-Embedding-0.6B',
                OPENAI_EMBEDDING_DIMENSIONS: '1024',
                SERVER_PORT: '3000',
                NODE_ENV: 'production',
                ELIZAOS_TELEMETRY_DISABLED: 'true',
              },
            },
          },
        ],
      },
    });

    console.log('Deployment created:', JSON.stringify(deployment, null, 2));

    if (deployment?.id) {
      console.log('\nStarting deployment...');
      const started = await client.api.deployments.start(deployment.id);
      console.log('Started:', JSON.stringify(started, null, 2));
      console.log('\nCheck status at: https://deploy.nosana.com');
    }
  } catch (err) {
    console.error('Deployment error:', err.message || err);
    if (err.response) {
      const body = await err.response.text?.() || err.response.data;
      console.error('Response:', body);
    }
    process.exit(1);
  }
}

deploy();
