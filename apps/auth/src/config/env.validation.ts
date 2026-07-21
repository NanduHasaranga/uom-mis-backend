import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(3001),

  MONGO_URI: Joi.string().required(),

  RABBITMQ_URL: Joi.string().required(),

  LDAP_URL: Joi.string().required(),
  LDAP_BASE_DN: Joi.string().required(),
  LDAP_USERS_OU: Joi.string().required(),
  LDAP_ADMIN_DN: Joi.string().required(),
  LDAP_ADMIN_PASSWORD: Joi.string().required(),
});