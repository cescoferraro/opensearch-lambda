const {SimpleSpanProcessor, ConsoleSpanExporter} = require("@opentelemetry/sdk-trace-base");
const {NodeTracerProvider} = require('@opentelemetry/sdk-trace-node');
const {AwsLambdaInstrumentation} = require('@opentelemetry/instrumentation-aws-lambda');
const {registerInstrumentations} = require('@opentelemetry/instrumentation');
const {getNodeAutoInstrumentations} = require("@opentelemetry/auto-instrumentations-node");
const {OTLPTraceExporter} = require('@opentelemetry/exporter-trace-otlp-http');
const {Sequelize} = require("sequelize-typescript");
const pg = require("pg");
const {Umzug, SequelizeStorage} = require("umzug");
const {PokemonModel} = require("./handler");


const {DATABASE_URL = ''} = process.env;

const sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg,
    define: {
        timestamps: true,
        freezeTableName: true,
    },
});

sequelize.addModels([PokemonModel]);
const umzug = new Umzug({
    migrations: {glob: 'migrations/*.js'},
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({sequelize}),
    logger: console,
});

void umzug.up()

const url = process.env.COLLECTOR_ENDPOINT;
console.log("===========================");
console.log(url);

const provider = new NodeTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))

const exporter = new OTLPTraceExporter({url: url,});
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