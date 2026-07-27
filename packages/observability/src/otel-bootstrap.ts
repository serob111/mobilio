import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { AppEnv } from '@ag2/config';

/**
 * Must be imported (and called) before any other module in an app's
 * entrypoint so OpenTelemetry's auto-instrumentation can monkey-patch
 * http/pg/ioredis before those modules are first required elsewhere in the
 * process. `serviceName` overrides `env.OTEL_SERVICE_NAME` so each process
 * (api, build-worker, ...) reports distinct traces even when they share one
 * `.env` file.
 */
export function startTracing(env: AppEnv, serviceName = env.OTEL_SERVICE_NAME): NodeSDK {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: process.env['npm_package_version'] ?? '0.0.0',
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    void sdk.shutdown();
  });

  return sdk;
}
