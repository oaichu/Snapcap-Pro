module.exports = {
  async beforeScenario(args) {
    const { context, events } = args;

    // Generate mock auth token for testing
    context.vars.authToken = 'mock-auth-token';
    context.vars.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${context.vars.authToken}`,
    };
  },

  async beforeRequest(args) {
    const { requestParams, context } = args;

    // Add auth header to all requests
    if (!requestParams.headers) {
      requestParams.headers = {};
    }
    requestParams.headers['Authorization'] = `Bearer ${context.vars.authToken}`;
  },

  async afterResponse(args) {
    const { response, context } = args;

    // Log slow responses
    if (response.timings.response > 1000) {
      console.warn(`Slow response: ${response.url} took ${response.timings.response}ms`);
    }
  },
};
