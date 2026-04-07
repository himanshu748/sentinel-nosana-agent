import { createNosanaClient } from '@nosana/kit';

const client = createNosanaClient('mainnet', {
  api: {
    apiKey: process.env.NOSANA_API_KEY,
  },
});

async function deploy() {
  try {
    console.log('Creating deployment...');
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
                OPENAI_API_URL: 'http://localhost:8000/v1',
                MODEL_NAME: 'Qwen/Qwen2.5-7B-Instruct-AWQ',
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
      console.log('\nAvailable methods:', Object.keys(client.api.deployments));
      console.log('Trying to start via update...');
      try {
        const started = await client.api.deployments.update(deployment.id, { status: 'RUNNING' });
        console.log('Started:', JSON.stringify(started, null, 2));
      } catch (e) {
        console.log('Update failed, trying manage...');
        try {
          const res = await client.api.deployments.manage(deployment.id, 'start');
          console.log('Manage result:', JSON.stringify(res, null, 2));
        } catch (e2) {
          console.log('Also failed:', e2.message);
          console.log('Trying raw HTTP...');
          const resp = await fetch(`https://dashboard.k8s.prd.nosana.com/api/deployments/${deployment.id}/start`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.NOSANA_API_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('HTTP start status:', resp.status, await resp.text());
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message || err);
    if (err.response) {
      const body = await err.response.text?.() || err.response.data;
      console.error('Response:', body);
    }
  }
}

deploy();
