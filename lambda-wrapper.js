const {SimpleSpanProcessor, ConsoleSpanExporter} = require("@opentelemetry/sdk-trace-base");
const {NodeTracerProvider} = require('@opentelemetry/sdk-trace-node');
const {AwsLambdaInstrumentation} = require('@opentelemetry/instrumentation-aws-lambda');
const {registerInstrumentations} = require('@opentelemetry/instrumentation');
const {getNodeAutoInstrumentations} = require("@opentelemetry/auto-instrumentations-node");
const {OTLPTraceExporter} = require('@opentelemetry/exporter-trace-otlp-grpc');


const url = process.env.COLLECTOR_ENDPOINT;
console.log("===========================");
console.log(url);

const collectorOptions = {
    url: url,
};


const provider = new NodeTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))

const exporter = new OTLPTraceExporter(collectorOptions);
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

provider.register();
registerInstrumentations({
    instrumentations: [
        getNodeAutoInstrumentations(),
        new AwsLambdaInstrumentation({
            disableAwsContextPropagation: true
        })
    ],
});

['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => provider.shutdown().catch(console.error));
});