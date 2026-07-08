// Specifica OpenAPI 3 minima servita via Swagger UI su /docs.
export const openapiSpec = {
  openapi: '3.0.3',
  info: { title: 'TicketFlow · service-auth', version: '1.0.0' },
  paths: {
    '/health': { get: { summary: 'Healthcheck', responses: { 200: { description: 'OK' } } } },
    '/register': {
      post: {
        summary: 'Registrazione utente',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'full_name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  full_name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Creato' }, 409: { description: 'Email già usata' } },
      },
    },
    '/login': {
      post: {
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Token JWT' }, 401: { description: 'Credenziali errate' } },
      },
    },
    '/me': {
      get: {
        summary: 'Profilo corrente',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Dati utente' }, 401: { description: 'Non autenticato' } },
      },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
};
