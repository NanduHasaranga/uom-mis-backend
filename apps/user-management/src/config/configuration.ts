export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/user-management',
  rabbitmq: {
    uri: process.env.RABBITMQ_URI ?? 'amqp://localhost:5672',
  },
  keycloak: {
    jwksUri: process.env.KEYCLOAK_JWKS_URI ?? '',
  },
  tokenVerifierMode: process.env.TOKEN_VERIFIER_MODE ?? 'jwks',
});
