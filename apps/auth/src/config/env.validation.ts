import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3001),

  MONGO_URI: Joi.string().required(),

  RABBITMQ_URL: Joi.string().required(),
  AUTH_QUEUE: Joi.string().required(),

  KEYCLOAK_BASE_URL: Joi.string().required(),
  KEYCLOAK_REALM: Joi.string().required(),
  KEYCLOAK_CLIENT_ID: Joi.string().required(),
  KEYCLOAK_CLIENT_SECRET: Joi.string().required(),
  KEYCLOAK_PROVISIONING_ENABLED: Joi.boolean().default(false),

  LDAP_URL: Joi.string().required(),
  LDAP_BASE_DN: Joi.string().required(),
  LDAP_USERS_OU: Joi.string().required(),
  LDAP_ADMIN_DN: Joi.string().required(),
  LDAP_ADMIN_PASSWORD: Joi.string().required(),
});